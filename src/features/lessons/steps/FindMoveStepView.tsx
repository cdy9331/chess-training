import { useMemo, useState } from 'react';
import { fenAfterMove, parseUci, sideToMove, uciToSan } from '../../../core/chess';
import {
  checkLessonMove,
  nextSolutionMove,
  resolveSolutions,
  type FindMoveStep,
} from '../../../core/lessons';
import { useTimers } from '../../../shared/useTimers';
import { Board, type BoardArrow } from '../../board/Board';
import styles from '../Lessons.module.css';
import { ARROW_COLOR } from './lessonArrows';

const REPLY_DELAY_MS = 600;

type Status = 'myTurn' | 'reply' | 'solved' | 'revealed';

interface FindMoveStepViewProps {
  step: FindMoveStep;
  onSolved: () => void;
}

export function FindMoveStepView({ step, onSolved }: FindMoveStepViewProps) {
  const solutions = useMemo(() => resolveSolutions(step), [step]);
  const { schedule } = useTimers();
  const [fen, setFen] = useState(step.fen);
  const [played, setPlayed] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>('myTurn');
  const [wrong, setWrong] = useState<{ fen: string; uci: string } | null>(null);
  const [hint, setHint] = useState(false);

  const color = sideToMove(step.fen);
  const expected = nextSolutionMove(solutions, played);

  function handleMove(uci: string) {
    if (status !== 'myTurn') return;
    const verdict = checkLessonMove(solutions, played, fen, uci);
    if (verdict.kind === 'wrong') {
      setWrong({ fen, uci });
      return;
    }
    setWrong(null);
    setHint(false);
    setFen(verdict.fenAfterMove);
    setLastMove(uci);
    if (verdict.kind === 'solved') {
      setStatus('solved');
      onSolved();
      return;
    }
    setStatus('reply');
    schedule(() => {
      setFen(verdict.fenAfterReply);
      setLastMove(verdict.reply);
      setPlayed((p) => [...p, uci, verdict.reply]);
      setStatus('myTurn');
    }, REPLY_DELAY_MS);
  }

  /** 남은 정답 수순을 차례로 보여준다 */
  function reveal() {
    setStatus('revealed');
    setWrong(null);
    setHint(false);
    const line = solutions.find((l) => played.every((m, i) => l[i] === m)) ?? solutions[0] ?? [];
    let current = fen;
    line.slice(played.length).forEach((uci, i) => {
      schedule(
        () => {
          const next = fenAfterMove(current, uci);
          if (!next) return;
          current = next;
          setFen(next);
          setLastMove(uci);
        },
        REPLY_DELAY_MS * (i + 1),
      );
    });
    onSolved();
  }

  const arrows: BoardArrow[] = [];
  const wrongParts = wrong && wrong.fen === fen ? parseUci(wrong.uci) : null;
  if (wrongParts) arrows.push({ from: wrongParts.from, to: wrongParts.to, color: ARROW_COLOR.bad });
  const hintSquare = hint && expected ? parseUci(expected)?.from : undefined;

  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <Board
          fen={fen}
          orientation={color === 'w' ? 'white' : 'black'}
          onMove={handleMove}
          interactive={status === 'myTurn'}
          lastMoveUci={lastMove}
          arrows={arrows}
          highlightSquares={hintSquare ? [hintSquare] : undefined}
        />
      </div>
      <aside className={styles.panel}>
        <div className={styles.textBox}>
          <h2 className={styles.stepTitle}>🎯 {step.title}</h2>
          <p>{step.prompt}</p>
          <p className={styles.small}>{color === 'w' ? '백' : '흑'}으로 둬요.</p>
        </div>

        {status === 'reply' && <p className={styles.good}>✓ 좋아요! 상대의 응수를 보세요…</p>}
        {wrongParts && status === 'myTurn' && (
          <p className={styles.bad}>
            ✗ {uciToSan(wrong?.fen ?? fen, wrong?.uci ?? '') ?? '그 수'}는 정답이 아니에요. 다시 해
            보세요.
          </p>
        )}
        {hint && step.hint && <p className={styles.hintText}>💡 {step.hint}</p>}

        {(status === 'solved' || status === 'revealed') && (
          <div className={status === 'solved' ? styles.successBox : styles.revealBox}>
            <strong>{status === 'solved' ? '🎉 정답!' : '정답 수순이에요'}</strong>
            <p>{step.explanation}</p>
          </div>
        )}

        {status === 'myTurn' && (
          <div className={styles.actions}>
            <button type="button" onClick={() => setHint(true)} disabled={hint}>
              💡 힌트
            </button>
            <button type="button" onClick={reveal}>
              정답 보기
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
