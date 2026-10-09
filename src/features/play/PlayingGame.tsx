import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  describeEndReason,
  describeStatus,
  fenAt,
  lineFromUcis,
  outcomeFromStatus,
  parseUci,
  resignOutcome,
  resultFor,
  sideToMove,
  PIECE_NAME,
  statusAt,
  threatsAgainst,
  type GameOutcome,
} from '../../core/chess';
import { getLevel, isAbortError } from '../../core/engine';
import { aiAcceptsDraw, undoTargetPly } from '../../core/play/rules';
import { gamesRepo } from '../../db/repos/games';
import type { GameRecord } from '../../db/schema';
import { Board, type BoardArrow } from '../board/Board';
import { useLazyEngineClient } from '../board/engine/useLazyEngineClient';
import { MoveList } from '../board/MoveList';
import { useChessGame } from '../board/useChessGame';
import { useMoveNavigationKeys } from '../board/useMoveNavigationKeys';
import { OpeningLabel } from '../../shared/OpeningLabel';
import { buildGamePgn } from './gamePgn';
import styles from './Play.module.css';
import { useAiOpponent } from '../board/engine/useAiOpponent';

/** AI가 너무 빨리 두면 수를 알아보기 어려우므로 최소한 이만큼은 기다린다. */
const MIN_AI_THINK_MS = 600;
const HINT_ARROW_COLOR = 'rgba(40, 160, 70, 0.85)';
const CHECK_ARROW_COLOR = 'rgba(150, 70, 200, 0.75)';
const CAPTURE_ARROW_COLOR = 'rgba(220, 50, 50, 0.7)';

interface PlayingGameProps {
  record: GameRecord;
  onNewGame: () => void;
  onRematch: () => void;
}

type Notice = { kind: 'info' | 'error'; text: string } | null;

export function PlayingGame({ record, onNewGame, onRematch }: PlayingGameProps) {
  const config = useMemo(() => getLevel(record.aiLevel), [record.aiLevel]);
  const player = record.playerColor;
  const ai = player === 'w' ? 'b' : 'w';

  const game = useChessGame(
    useMemo(() => lineFromUcis(record.startFen, record.movesUci), [record]),
  );
  const { chooseMove, evaluate } = useAiOpponent(config);
  const hintEngine = useLazyEngineClient();

  const [manualOutcome, setManualOutcome] = useState<GameOutcome | null>(null);
  const [saved, setSaved] = useState(record.status === 'finished');
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [drawPending, setDrawPending] = useState(false);
  const [hint, setHint] = useState<{ fen: string; uci: string } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  /** 연습 모드 위협 코칭: 위험한 내 기물과 상대가 둘 수 있는 체크·잡기를 표시 */
  const [showThreats, setShowThreats] = useState(record.practice);

  useMoveNavigationKeys({
    first: game.goFirst,
    prev: game.goPrev,
    next: game.goNext,
    last: game.goLast,
  });

  // 게임 진행은 항상 "마지막 국면" 기준이다 (사용자가 이전 수를 보고 있어도).
  const moveCount = game.line.moves.length;
  const endFen = fenAt(game.line, moveCount);
  const endStatus = useMemo(() => statusAt(game.line), [game.line]);
  const outcome = manualOutcome ?? outcomeFromStatus(endStatus);
  const turn = sideToMove(endFen);
  const aiToMove = !outcome && turn === ai;
  const myTurn = !outcome && turn === player;

  // --- AI 응수 ---
  const playAiMove = useEffectEvent((uci: string) => {
    if (!game.appendMove(uci)) setNotice({ kind: 'error', text: 'AI가 잘못된 수를 골랐어요.' });
  });
  const reportAiError = useEffectEvent(() =>
    setNotice({
      kind: 'error',
      text: 'AI 엔진이 응답하지 않아요. "다시 시도"를 누르거나 페이지를 새로고침해 주세요.',
    }),
  );
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!aiToMove) return;
    const controller = new AbortController();
    const minDelay = new Promise((r) => setTimeout(r, MIN_AI_THINK_MS));
    Promise.all([chooseMove(endFen, controller.signal), minDelay])
      .then(([uci]) => {
        if (controller.signal.aborted || !uci) return;
        playAiMove(uci);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && !controller.signal.aborted) reportAiError();
      });
    return () => controller.abort();
  }, [aiToMove, endFen, chooseMove, retryToken]);

  // --- 저장: 매 수마다 진행 상황, 끝나면 결과 ---
  useEffect(() => {
    if (saved) return;
    gamesRepo
      .updateMoves(
        record.id,
        game.line.moves.map((m) => m.uci),
      )
      .catch(() => {
        setNotice({ kind: 'error', text: '진행 상황을 저장하지 못했어요.' });
      });
  }, [game.line, record.id, saved]);

  useEffect(() => {
    if (!outcome || saved) return;
    const ucis = game.line.moves.map((m) => m.uci);
    gamesRepo
      .finish(record.id, outcome, ucis, buildGamePgn(record, game.line, outcome))
      .then(() => setSaved(true))
      .catch(() => setNotice({ kind: 'error', text: '대국 결과를 저장하지 못했어요.' }));
  }, [outcome, saved, game.line, record]);

  // --- 사용자 행동 ---
  function handleMove(uci: string) {
    setNotice(null);
    setHint(null);
    return game.makeMove(uci);
  }

  function undo() {
    setNotice(null);
    setHint(null);
    game.truncateTo(undoTargetPly(moveCount, turn, player));
  }

  function resign() {
    setConfirmResign(false);
    setManualOutcome(resignOutcome(player));
  }

  async function offerDraw() {
    setDrawPending(true);
    setNotice(null);
    try {
      const score = await evaluate(endFen);
      if (score && aiAcceptsDraw(score, ai, moveCount)) {
        setManualOutcome({ result: '1/2-1/2', reason: 'drawAgreed' });
      } else {
        setNotice({ kind: 'info', text: 'AI가 무승부 제안을 거절했어요. 계속 두어 보세요!' });
      }
    } catch {
      setNotice({ kind: 'error', text: '무승부 제안을 처리하지 못했어요.' });
    } finally {
      setDrawPending(false);
    }
  }

  async function requestHint() {
    setHintLoading(true);
    const fenAtRequest = endFen;
    const client = hintEngine.getClient();
    try {
      const result = await client.analyze(fenAtRequest, { depth: 14, multipv: 1 });
      if (result.bestMoveUci) setHint({ fen: fenAtRequest, uci: result.bestMoveUci });
    } catch (error) {
      if (!isAbortError(error)) {
        hintEngine.discard(client);
        setNotice({ kind: 'error', text: '힌트를 가져오지 못했어요.' });
      }
    } finally {
      setHintLoading(false);
    }
  }

  const hintMove = hint && hint.fen === game.fen ? parseUci(hint.uci) : null;
  const arrows: BoardArrow[] = hintMove
    ? [{ from: hintMove.from, to: hintMove.to, color: HINT_ARROW_COLOR }]
    : [];

  const coaching = record.practice && showThreats && myTurn && game.isAtEnd;
  const threats = coaching ? threatsAgainst(endFen, player) : null;
  if (threats) {
    const hangingSquares = new Set<string>(threats.hanging.map((h) => h.square));
    for (const m of threats.checks) arrows.push({ ...m, color: CHECK_ARROW_COLOR });
    // 모든 잡기를 그리면 복잡하므로 위험한 기물을 노리는 잡기만 그린다
    for (const m of threats.captures) {
      if (hangingSquares.has(m.to)) arrows.push({ ...m, color: CAPTURE_ARROW_COLOR });
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.gameHeader}>
        <h1 className={styles.title}>AI 대국</h1>
        <p className={styles.muted}>
          상대: 레벨 {config.level} · {config.label} · 나: {player === 'w' ? '백' : '흑'}
          {record.practice && <span className={styles.badge}>연습 모드</span>}
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <Board
            fen={game.fen}
            orientation={player === 'w' ? 'white' : 'black'}
            onMove={handleMove}
            interactive={myTurn && game.isAtEnd}
            lastMoveUci={game.lastMoveUci}
            arrows={arrows}
            dangerSquares={threats?.hanging.map((h) => h.square)}
          />
        </div>

        <aside className={styles.panel}>
          {outcome ? (
            <ResultCard
              outcome={outcome}
              player={player}
              gameId={record.id}
              saved={saved}
              onRematch={onRematch}
              onNewGame={onNewGame}
            />
          ) : (
            <p className={styles.status} role="status" aria-live="polite">
              {aiToMove ? '🤔 AI가 생각 중…' : `✋ 당신 차례예요`}
              <span className={styles.statusDetail}>{describeStatus(endStatus)}</span>
            </p>
          )}

          {!game.isAtEnd && !outcome && (
            <p className={styles.hint}>
              이전 국면을 보고 있어요.{' '}
              <button type="button" className={styles.linkButton} onClick={game.goLast}>
                현재 국면으로
              </button>
            </p>
          )}

          {notice && (
            <p className={notice.kind === 'error' ? styles.error : styles.info} role="alert">
              {notice.text}
              {notice.kind === 'error' && aiToMove && (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => {
                    setNotice(null);
                    setRetryToken((t) => t + 1);
                  }}
                >
                  다시 시도
                </button>
              )}
            </p>
          )}

          <OpeningLabel line={game.line} />

          <MoveList
            startFen={game.line.startFen}
            moves={game.line.moves}
            currentPly={game.ply}
            onSelectPly={game.goTo}
          />

          <div className={styles.navButtons}>
            <button type="button" onClick={game.goFirst} disabled={game.ply === 0} title="처음">
              ⏮
            </button>
            <button type="button" onClick={game.goPrev} disabled={game.ply === 0} title="이전 (←)">
              ◀
            </button>
            <button type="button" onClick={game.goNext} disabled={game.isAtEnd} title="다음 (→)">
              ▶
            </button>
            <button type="button" onClick={game.goLast} disabled={game.isAtEnd} title="마지막">
              ⏭
            </button>
          </div>

          {!outcome && (
            <div className={styles.actions}>
              {record.practice && (
                <>
                  <button
                    type="button"
                    onClick={requestHint}
                    disabled={!myTurn || hintLoading || !game.isAtEnd}
                  >
                    {hintLoading ? '생각 중…' : '💡 힌트'}
                  </button>
                  <button
                    type="button"
                    onClick={undo}
                    disabled={undoTargetPly(moveCount, turn, player) === moveCount}
                  >
                    ↩ 무르기
                  </button>
                </>
              )}
              <button type="button" onClick={offerDraw} disabled={!myTurn || drawPending}>
                {drawPending ? 'AI가 고민 중…' : '½ 무승부 제안'}
              </button>
              {confirmResign ? (
                <span className={styles.confirm}>
                  정말 기권할까요?
                  <button type="button" className={styles.danger} onClick={resign}>
                    기권
                  </button>
                  <button type="button" onClick={() => setConfirmResign(false)}>
                    취소
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmResign(true)}>
                  🏳 기권
                </button>
              )}
            </div>
          )}

          {hintMove && <p className={styles.info}>초록 화살표가 엔진이 추천하는 수예요.</p>}

          {record.practice && !outcome && (
            <div className={styles.coach}>
              <label>
                <input
                  type="checkbox"
                  checked={showThreats}
                  onChange={(e) => setShowThreats(e.target.checked)}
                />{' '}
                ⚠ 위협 보기
              </label>
              {threats && (
                <ul>
                  {threats.hanging.length > 0 ? (
                    <li>
                      <span className={styles.dangerText}>빨간 테두리</span>: 위험한 내 기물 —{' '}
                      {threats.hanging.map((h) => `${PIECE_NAME[h.type]}(${h.square})`).join(', ')}
                    </li>
                  ) : (
                    <li>공짜로 잡힐 내 기물은 없어요.</li>
                  )}
                  {threats.checks.length > 0 && (
                    <li>
                      <span className={styles.checkText}>보라 화살표</span>: 상대가 둘 수 있는 체크{' '}
                      {threats.checks.length}개
                    </li>
                  )}
                  {threats.captures.some((c) => threats.hanging.some((h) => h.square === c.to)) && (
                    <li>
                      <span className={styles.dangerText}>빨간 화살표</span>: 상대가 노리는 잡기
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function ResultCard({
  outcome,
  player,
  gameId,
  saved,
  onRematch,
  onNewGame,
}: {
  outcome: GameOutcome;
  player: 'w' | 'b';
  gameId: number;
  saved: boolean;
  onRematch: () => void;
  onNewGame: () => void;
}) {
  const mine = resultFor(outcome.result, player);
  const title = mine === 'win' ? '🎉 승리!' : mine === 'loss' ? '패배' : '무승부';
  return (
    <div className={`${styles.resultCard} ${styles[mine]}`} role="status">
      <p className={styles.resultTitle}>{title}</p>
      <p className={styles.muted}>
        {describeEndReason(outcome.reason)} · {outcome.result}
      </p>
      <div className={styles.resultActions}>
        <Link
          to={`/review/${gameId}`}
          className={styles.primaryLink}
          aria-disabled={!saved}
          onClick={(e) => {
            if (!saved) e.preventDefault();
          }}
        >
          🔍 이 게임 리뷰하기
        </Link>
        <button type="button" onClick={onRematch}>
          같은 설정으로 다시
        </button>
        <button type="button" onClick={onNewGame}>
          설정 바꿔서 새 대국
        </button>
      </div>
    </div>
  );
}
