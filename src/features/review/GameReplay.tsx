import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  describeEndReason,
  fenAfterMove,
  fenAt,
  lineFromUcis,
  parseUci,
  resultFor,
  uciToSan,
} from '../../core/chess';
import { getLevel, isAbortError } from '../../core/engine';
import {
  analyzePosition,
  classifyMove,
  explainBestMove,
  explainMistake,
  keyMoments,
  type GameReview,
  type MoveClass,
  type PositionEval,
} from '../../core/review';
import { gamesRepo } from '../../db/repos/games';
import type { GameRecord } from '../../db/schema';
import { formatDateTime } from '../../shared/format';
import { Board, type BoardArrow } from '../board/Board';
import { EvalBar } from '../board/engine/EvalBar';
import { useLazyEngineClient } from '../board/engine/useLazyEngineClient';
import { MoveList, type MoveAnnotation } from '../board/MoveList';
import { useChessGame } from '../board/useChessGame';
import { useMoveNavigationKeys } from '../board/useMoveNavigationKeys';
import { EvalGraph } from './EvalGraph';
import { LinePreview } from './LinePreview';
import { MoveFeedback, type PreviewKind, type RetryState } from './MoveFeedback';
import { BEST_ARROW_COLOR, MOVE_CLASS_STYLE } from './moveClassStyle';
import styles from './Review.module.css';
import { ReviewSummary } from './ReviewSummary';
import { useGameReview } from './useGameReview';

/** 다시 두어보기에서 사용자의 수를 판정할 때의 탐색 깊이 */
const RETRY_DEPTH = 12;
/** 수순 따라가 보기에서 보여줄 최대 수 */
const PREVIEW_PLIES = 10;
const BAD_CLASSES: ReadonlySet<MoveClass> = new Set(['inaccuracy', 'mistake', 'blunder']);

const RESULT_TEXT = { win: '승리', loss: '패배', draw: '무승부' } as const;

type LoadState = { kind: 'loading' } | { kind: 'missing' } | { kind: 'loaded'; game: GameRecord };

export function GameReplay({ gameId }: { gameId: number }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    gamesRepo
      .get(gameId)
      .then((game) => !cancelled && setState(game ? { kind: 'loaded', game } : { kind: 'missing' }))
      .catch(() => !cancelled && setState({ kind: 'missing' }));
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (state.kind === 'loading') return <p className={styles.muted}>불러오는 중…</p>;
  if (state.kind === 'missing') {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>대국을 찾을 수 없어요</h1>
        <Link to="/review">← 대국 목록으로</Link>
      </section>
    );
  }
  return <GameReviewView game={state.game} />;
}

function GameReviewView({ game }: { game: GameRecord }) {
  const line = useMemo(() => lineFromUcis(game.startFen, game.movesUci), [game]);
  const replay = useChessGame(line);
  const { state, cancel, restart } = useGameReview(game);
  const review = state.kind === 'done' ? state.review : null;
  const mine = resultFor(game.result, game.playerColor);

  return (
    <section className={styles.page}>
      <Link to="/review">← 대국 목록</Link>
      <header>
        <h1 className={styles.title}>
          게임 리뷰 · vs 레벨 {game.aiLevel} ({getLevel(game.aiLevel).label})
        </h1>
        <p className={styles.muted}>
          {formatDateTime(game.createdAt)} · {game.playerColor === 'w' ? '백' : '흑'} · 결과{' '}
          {game.result}
          {mine !== 'ongoing' && ` (${RESULT_TEXT[mine]})`}
          {game.endReason && ` · ${describeEndReason(game.endReason)}`}
        </p>
      </header>

      {state.kind === 'analyzing' && (
        <div className={styles.progressBox}>
          <p>
            엔진이 한 수씩 분석하고 있어요… ({state.progress.done} / {state.progress.total})
          </p>
          <progress value={state.progress.done} max={state.progress.total} />
          <button type="button" onClick={cancel}>
            분석 멈추기
          </button>
        </div>
      )}
      {state.kind === 'cancelled' && (
        <div className={styles.progressBox}>
          <p>분석을 멈췄어요. 이미 분석한 국면은 기억해 두었다가 다음에 빨리 끝나요.</p>
          <button type="button" onClick={restart}>
            분석 다시 시작
          </button>
        </div>
      )}
      {state.kind === 'error' && (
        <div className={styles.progressBox}>
          <p className={styles.error}>{state.message}</p>
          <button type="button" onClick={restart}>
            다시 시도
          </button>
        </div>
      )}
      {state.kind === 'empty' && (
        <p className={styles.notice}>둔 수가 없어서 리뷰할 내용이 없어요.</p>
      )}

      {review ? (
        <ReviewBody game={game} review={review} replay={replay} onReanalyze={restart} />
      ) : (
        <PlainReplay game={game} replay={replay} />
      )}

      {game.pgn && (
        <details>
          <summary>PGN 보기</summary>
          <textarea
            readOnly
            value={game.pgn}
            rows={8}
            className={styles.pgn}
            aria-label="PGN"
            onFocus={(e) => e.currentTarget.select()}
          />
        </details>
      )}
    </section>
  );
}

type Replay = ReturnType<typeof useChessGame>;

/** 리뷰가 아직 없을 때: 수순만 다시 보기 */
function PlainReplay({ game, replay }: { game: GameRecord; replay: Replay }) {
  useMoveNavigationKeys({
    first: replay.goFirst,
    prev: replay.goPrev,
    next: replay.goNext,
    last: replay.goLast,
  });
  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <Board
          fen={replay.fen}
          orientation={game.playerColor === 'w' ? 'white' : 'black'}
          lastMoveUci={replay.lastMoveUci}
          interactive={false}
        />
      </div>
      <aside className={styles.panel}>
        <MoveList
          startFen={replay.line.startFen}
          moves={replay.line.moves}
          currentPly={replay.ply}
          onSelectPly={replay.goTo}
        />
        <NavButtons replay={replay} />
      </aside>
    </div>
  );
}

function evalBarResult(e: PositionEval | undefined): '1-0' | '0-1' | '1/2-1/2' | undefined {
  if (e?.kind === 'mated') return e.winner === 'w' ? '1-0' : '0-1';
  if (e?.kind === 'draw') return '1/2-1/2';
  return undefined;
}

interface RetrySession {
  ply: number;
  state: RetryState;
  attemptUci?: string;
}

function ReviewBody({
  game,
  review,
  replay,
  onReanalyze,
}: {
  game: GameRecord;
  review: GameReview;
  replay: Replay;
  onReanalyze: () => void;
}) {
  const player = game.playerColor;
  const orientation = player === 'w' ? 'white' : 'black';
  const move = replay.ply > 0 ? (review.moves[replay.ply - 1] ?? null) : null;
  const fenBefore = fenAt(replay.line, Math.max(0, replay.ply - 1));
  const currentEval = review.evals[replay.ply];

  // --- 다시 두어보기: 실수한 국면에서 더 좋은 수를 직접 찾아본다 ---
  const engine = useLazyEngineClient();
  const [retry, setRetry] = useState<RetrySession | null>(null);
  // 다른 수로 이동하면 다시 두어보기는 자동으로 끝난다.
  const activeRetry = retry && move && retry.ply === move.ply ? retry : null;

  // --- 왜? 설명 (엔진 수순을 따라가며 규칙으로 만든 문장) ---
  const before = move ? review.evals[move.ply - 1] : undefined;
  const after = move ? review.evals[move.ply] : undefined;
  const explanation = useMemo(() => {
    if (!move || !before || !after) return { whyBad: null, whyBest: null };
    const isBad = BAD_CLASSES.has(move.classification);
    return {
      whyBad: isBad
        ? explainMistake({
            fenBefore,
            playedUci: move.uci,
            mover: move.color,
            before,
            after,
            plyIndex: move.ply - 1,
          }).reasons
        : null,
      whyBest: explainBestMove({ fenBefore, mover: move.color, before, plyIndex: move.ply - 1 })
        .reasons,
    };
  }, [move, before, after, fenBefore]);

  // --- 수순 따라가 보기: 최선 수순 또는 상대의 최선 응수를 체스판에서 한 수씩 ---
  const [preview, setPreview] = useState<{ ply: number; kind: PreviewKind; step: number } | null>(
    null,
  );
  const activePreview = preview && move && preview.ply === move.ply ? preview : null;
  const previewLine = useMemo(() => {
    if (!activePreview || !before || !after) return null;
    const source = activePreview.kind === 'best' ? before : after;
    const startFen = activePreview.kind === 'best' ? fenBefore : replay.fen;
    const pv = source.kind === 'score' ? source.pv.slice(0, PREVIEW_PLIES) : [];
    return lineFromUcis(startFen, pv);
  }, [activePreview, before, after, fenBefore, replay.fen]);
  const previewStep = Math.min(activePreview?.step ?? 0, previewLine?.moves.length ?? 0);
  const setPreviewStep = (step: number) =>
    setPreview((p) =>
      p && previewLine ? { ...p, step: Math.max(0, Math.min(step, previewLine.moves.length)) } : p,
    );
  const startPreview = (kind: PreviewKind) => {
    if (!move) return;
    setRetry(null);
    setPreview({ ply: move.ply, kind, step: 1 });
  };

  useMoveNavigationKeys(
    previewLine
      ? {
          first: () => setPreviewStep(0),
          prev: () => setPreviewStep(previewStep - 1),
          next: () => setPreviewStep(previewStep + 1),
          last: () => setPreviewStep(previewLine.moves.length),
        }
      : { first: replay.goFirst, prev: replay.goPrev, next: replay.goNext, last: replay.goLast },
  );

  async function judgeAttempt(uci: string) {
    const before = move ? review.evals[move.ply - 1] : undefined;
    const fenAfter = fenAfterMove(fenBefore, uci);
    if (!move || !before || !fenAfter) return;
    const { ply } = move;
    const attemptSan = uciToSan(fenBefore, uci) ?? uci;
    setRetry({ ply, attemptUci: uci, state: { kind: 'checking', attemptSan } });

    const client = engine.getClient();
    try {
      const classification =
        uci === move.bestMoveUci
          ? 'best'
          : classifyMove(
              before,
              await analyzePosition(client, fenAfter, RETRY_DEPTH),
              move.color,
              uci,
            ).classification;
      setRetry({ ply, attemptUci: uci, state: { kind: 'judged', attemptSan, classification } });
    } catch (error) {
      if (!isAbortError(error)) engine.discard(client);
      setRetry({ ply, state: { kind: 'waiting' } });
    }
  }

  const moments = keyMoments(review, player);
  const prevMoment = moments.filter((m) => m.ply < replay.ply).at(-1);
  const nextMoment = moments.find((m) => m.ply > replay.ply);

  const annotations: Record<number, MoveAnnotation> = {};
  for (const m of review.moves) {
    // '좋음'까지 표시하면 기보가 복잡해져서 생략한다.
    if (m.classification === 'good') continue;
    const s = MOVE_CLASS_STYLE[m.classification];
    annotations[m.ply] = { symbol: s.symbol, color: s.color, label: s.label };
  }

  // 화살표: 다시 두어보기 중이면 시도한 수/정답, 아니면 엔진 최선 수
  const arrows: BoardArrow[] = [];
  const pushArrow = (uci: string | null | undefined, color: string) => {
    const parts = uci ? parseUci(uci) : null;
    if (parts) arrows.push({ from: parts.from, to: parts.to, color });
  };
  if (activeRetry && move) {
    if (activeRetry.state.kind === 'judged') {
      pushArrow(
        activeRetry.attemptUci,
        MOVE_CLASS_STYLE[activeRetry.state.classification].arrowColor,
      );
    }
    if (activeRetry.state.kind === 'revealed') pushArrow(move.bestMoveUci, BEST_ARROW_COLOR);
  } else if (move && move.bestMoveUci !== move.uci) {
    pushArrow(move.bestMoveUci, BEST_ARROW_COLOR);
  }

  const canTryMove = activeRetry?.state.kind === 'waiting' || activeRetry?.state.kind === 'judged';
  const startRetry = () => {
    if (!move) return;
    setPreview(null);
    setRetry({ ply: move.ply, state: { kind: 'waiting' } });
  };

  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <div className={styles.boardWithBar}>
          <EvalBar
            score={currentEval?.kind === 'score' && !activeRetry ? currentEval.score : null}
            orientation={orientation}
            result={activeRetry ? undefined : evalBarResult(currentEval)}
          />
          <div className={styles.board}>
            {previewLine ? (
              <Board
                fen={fenAt(previewLine, previewStep)}
                orientation={orientation}
                lastMoveUci={previewLine.moves[previewStep - 1]?.uci}
                interactive={false}
              />
            ) : activeRetry ? (
              <Board
                fen={fenBefore}
                orientation={orientation}
                onMove={(uci) => void judgeAttempt(uci)}
                interactive={canTryMove}
                arrows={arrows}
              />
            ) : (
              <Board
                fen={replay.fen}
                orientation={orientation}
                lastMoveUci={replay.lastMoveUci}
                interactive={false}
                arrows={arrows}
              />
            )}
          </div>
        </div>
        <EvalGraph review={review} currentPly={replay.ply} onSelectPly={replay.goTo} />
      </div>

      <aside className={styles.panel}>
        {previewLine && activePreview && (
          <LinePreview
            title={
              activePreview.kind === 'best'
                ? '최선 수순 따라가 보기'
                : '상대의 최선 응수 따라가 보기'
            }
            line={previewLine}
            step={previewStep}
            onStep={setPreviewStep}
            onClose={() => setPreview(null)}
          />
        )}
        <MoveFeedback
          key={move?.ply ?? 0}
          move={move}
          fenBefore={fenBefore}
          evalAfter={currentEval}
          isMine={move?.color === player}
          whyBad={explanation.whyBad}
          whyBest={explanation.whyBest}
          canPreview={{
            best: before?.kind === 'score' && before.pv.length > 0,
            refutation: after?.kind === 'score' && after.pv.length > 0,
          }}
          onPreview={startPreview}
          retry={activeRetry?.state ?? null}
          onStartRetry={startRetry}
          onRetryAgain={startRetry}
          onReveal={() => move && setRetry({ ply: move.ply, state: { kind: 'revealed' } })}
          onExitRetry={() => setRetry(null)}
        />

        <div className={styles.momentButtons}>
          <button
            type="button"
            disabled={!prevMoment}
            onClick={() => prevMoment && replay.goTo(prevMoment.ply)}
          >
            ◀ 이전 내 실수
          </button>
          <button
            type="button"
            disabled={!nextMoment}
            onClick={() => nextMoment && replay.goTo(nextMoment.ply)}
          >
            다음 내 실수 ▶
          </button>
        </div>

        <MoveList
          startFen={replay.line.startFen}
          moves={replay.line.moves}
          currentPly={replay.ply}
          onSelectPly={replay.goTo}
          annotations={annotations}
        />
        <NavButtons replay={replay} />
        <ReviewSummary review={review} player={player} />
        <p className={styles.small}>
          분석 깊이 {review.depth} ·{' '}
          <button type="button" className={styles.linkButton} onClick={onReanalyze}>
            다시 분석하기
          </button>
        </p>
      </aside>
    </div>
  );
}

function NavButtons({ replay }: { replay: Replay }) {
  return (
    <div className={styles.navButtons}>
      <button type="button" onClick={replay.goFirst} disabled={replay.ply === 0} title="처음">
        ⏮
      </button>
      <button type="button" onClick={replay.goPrev} disabled={replay.ply === 0} title="이전 (←)">
        ◀
      </button>
      <button type="button" onClick={replay.goNext} disabled={replay.isAtEnd} title="다음 (→)">
        ▶
      </button>
      <button type="button" onClick={replay.goLast} disabled={replay.isAtEnd} title="마지막">
        ⏭
      </button>
    </div>
  );
}
