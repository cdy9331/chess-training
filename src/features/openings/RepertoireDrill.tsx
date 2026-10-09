import { useEffect, useMemo, useRef, useState } from 'react';
import { START_FEN, parseUci, uciToSan } from '../../core/chess';
import { isCorrectDrillMove, resolveLine, type RepertoireLine } from '../../core/openings';
import { openingsRepo } from '../../db/repos/openings';
import { useTimers } from '../../shared/useTimers';
import { Board, type BoardArrow } from '../board/Board';
import styles from './Openings.module.css';

export type DrillMode = 'learn' | 'test';

const OPPONENT_DELAY_MS = 550;
const HINT_ARROW = 'rgba(30, 110, 200, 0.8)';
const WRONG_ARROW = 'rgba(210, 60, 60, 0.85)';
const DAY = 24 * 60 * 60 * 1000;

type Feedback =
  | { kind: 'none' }
  | { kind: 'correct'; san: string; comment?: string }
  | { kind: 'wrong'; triedSan: string; triedUci: string }
  | { kind: 'opponent'; san: string; comment?: string };

interface RepertoireDrillProps {
  line: RepertoireLine;
  mode: DrillMode;
  onExit: () => void;
  onRestart: (mode: DrillMode) => void;
}

export function RepertoireDrill({ line, mode, onExit, onRestart }: RepertoireDrillProps) {
  const moves = useMemo(() => resolveLine(line), [line]);
  const { schedule } = useTimers();
  /** 다음에 둘 수의 번호 (moves 기준) */
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const [mistakes, setMistakes] = useState(0);
  const [showHint, setShowHint] = useState(mode === 'learn');
  const [nextDueDays, setNextDueDays] = useState<number | null>(null);
  // 결과는 한 번만 기록한다 (개발 모드의 StrictMode는 effect를 두 번 실행한다)
  const recorded = useRef(false);

  const current = moves[index];
  const finished = index >= moves.length;
  const fen = index === 0 ? START_FEN : (moves[index - 1]?.fenAfter ?? START_FEN);
  const myTurn = !!current?.mine;

  // 상대 차례면 잠시 뒤 자동으로 둔다
  useEffect(() => {
    if (!current || current.mine) return;
    schedule(() => {
      setFeedback({ kind: 'opponent', san: current.san, comment: current.comment });
      setIndex((i) => i + 1);
      setShowHint(mode === 'learn');
    }, OPPONENT_DELAY_MS);
  }, [current, mode, schedule]);

  // 끝나면 '외워서 두기' 결과를 복습 일정에 기록한다 (한 번 틀려도 오늘은 실패로 본다)
  useEffect(() => {
    if (!finished || mode !== 'test' || recorded.current) return;
    recorded.current = true;
    const now = Date.now();
    openingsRepo
      .recordDrill(line.id, mistakes === 0, now)
      .then((s) => setNextDueDays(Math.round((s.due - now) / DAY)))
      .catch(() => undefined);
  }, [finished, mode, line.id, mistakes]);

  function handleMove(uci: string) {
    if (!current || !current.mine) return;
    if (isCorrectDrillMove(current, uci)) {
      setFeedback({ kind: 'correct', san: current.san, comment: current.comment });
      setIndex((i) => i + 1);
      setShowHint(false);
      return;
    }
    setMistakes((m) => m + 1);
    setShowHint(true);
    setFeedback({ kind: 'wrong', triedSan: uciToSan(fen, uci) ?? uci, triedUci: uci });
  }

  const arrows: BoardArrow[] = [];
  const pushArrow = (uci: string, color: string) => {
    const p = parseUci(uci);
    if (p) arrows.push({ from: p.from, to: p.to, color });
  };
  if (myTurn && showHint && current) pushArrow(current.uci, HINT_ARROW);
  if (feedback.kind === 'wrong') pushArrow(feedback.triedUci, WRONG_ARROW);

  const myMovesTotal = moves.filter((m) => m.mine).length;
  const myMovesDone = moves.slice(0, index).filter((m) => m.mine).length;

  return (
    <section className={styles.page}>
      <button type="button" className={styles.linkButton} onClick={onExit}>
        ← 레퍼토리 목록
      </button>
      <h1 className={styles.title}>{line.name}</h1>
      <p className={styles.muted}>
        {mode === 'learn'
          ? '📘 배우기 — 파란 화살표를 따라 두세요'
          : '🧠 외워서 두기 — 힌트 없이 두세요'}{' '}
        · {line.side === 'w' ? '백' : '흑'}으로 둬요
      </p>

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <Board
            fen={fen}
            orientation={line.side === 'w' ? 'white' : 'black'}
            onMove={handleMove}
            interactive={myTurn && !finished}
            lastMoveUci={index > 0 ? moves[index - 1]?.uci : undefined}
            arrows={arrows}
          />
        </div>

        <aside className={styles.panel}>
          <div className={styles.progressRow}>
            <progress value={myMovesDone} max={myMovesTotal} />
            <span className={styles.small}>
              {myMovesDone} / {myMovesTotal}수
            </span>
          </div>

          {!finished && (
            <p className={styles.prompt} role="status">
              {myTurn ? '✋ 당신 차례예요' : '상대가 두는 중…'}
            </p>
          )}

          {feedback.kind === 'correct' && (
            <div className={styles.feedbackGood}>
              <strong>✓ {feedback.san}</strong> {feedback.comment}
            </div>
          )}
          {feedback.kind === 'opponent' && (
            <div className={styles.feedbackInfo}>
              상대: <strong>{feedback.san}</strong> {feedback.comment}
            </div>
          )}
          {feedback.kind === 'wrong' && current && (
            <div className={styles.feedbackBad}>
              <strong>✗ {feedback.triedSan}</strong>는 이 레퍼토리의 수가 아니에요. 파란 화살표의{' '}
              <strong>{current.san}</strong>를 둬 보세요.
              {current.comment && <p className={styles.small}>{current.comment}</p>}
            </div>
          )}

          {myTurn && !showHint && !finished && (
            <button
              type="button"
              onClick={() => {
                setShowHint(true);
                if (mode === 'test') setMistakes((m) => m + 1);
              }}
            >
              💡 힌트 보기{mode === 'test' ? ' (실수로 기록돼요)' : ''}
            </button>
          )}

          {finished && (
            <div className={styles.resultCard}>
              <p className={styles.resultTitle}>
                {mistakes === 0 ? '🎉 완벽해요!' : `완료! 실수 ${mistakes}번`}
              </p>
              {mode === 'test' && nextDueDays !== null && (
                <p className={styles.muted}>
                  다음 복습: {nextDueDays}일 뒤{mistakes > 0 && ' (틀린 라인은 내일 다시 나와요)'}
                </p>
              )}
              {mode === 'learn' && (
                <p className={styles.muted}>이제 힌트 없이 "외워서 두기"로 확인해 보세요.</p>
              )}
              <div className={styles.lineActions}>
                <button type="button" className={styles.primary} onClick={() => onRestart('test')}>
                  🧠 외워서 두기
                </button>
                <button type="button" onClick={() => onRestart('learn')}>
                  📘 다시 배우기
                </button>
                <button type="button" onClick={onExit}>
                  목록으로
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
