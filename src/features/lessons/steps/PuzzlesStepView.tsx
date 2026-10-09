import { useEffect, useState } from 'react';
import { fenAfterMove, parseUci } from '../../../core/chess';
import type { PuzzlesStep } from '../../../core/lessons';
import {
  advance,
  checkMove,
  expectedMove,
  pickLessonPuzzles,
  puzzleColor,
  startPuzzle,
  themeName,
  type Puzzle,
  type PuzzleProgress,
} from '../../../core/puzzles';
import { puzzleLoader } from '../../../shared/puzzleData';
import { useTimers } from '../../../shared/useTimers';
import { Board, type BoardArrow } from '../../board/Board';
import styles from '../Lessons.module.css';
import { ARROW_COLOR } from './lessonArrows';

const DELAY_MS = 600;

type Status = 'intro' | 'myTurn' | 'reply' | 'solved' | 'revealed';
type Outcome = 'clean' | 'withHelp';

interface PuzzlesStepViewProps {
  step: PuzzlesStep;
  onComplete: () => void;
}

export function PuzzlesStepView({ step, onComplete }: PuzzlesStepViewProps) {
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  useEffect(() => {
    let cancelled = false;
    pickLessonPuzzles(puzzleLoader, step)
      .then((p) => !cancelled && setPuzzles(p))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [step]);

  if (loadError) return <p className={styles.bad}>퍼즐 데이터를 불러오지 못했어요.</p>;
  if (!puzzles) return <p className={styles.small}>연습 퍼즐을 고르는 중…</p>;
  if (puzzles.length === 0) {
    return <p className={styles.small}>이 주제의 퍼즐이 없어요. "다음"으로 넘어가세요.</p>;
  }

  const allDone = outcomes.length >= puzzles.length;
  const puzzle = puzzles[Math.min(index, puzzles.length - 1)];
  if (!puzzle) return null;

  function finishPuzzle(outcome: Outcome) {
    setOutcomes((o) => [...o, outcome]);
    if (outcomes.length + 1 >= (puzzles?.length ?? 0)) onComplete();
  }

  const clean = outcomes.filter((o) => o === 'clean').length;

  return (
    <div className={styles.puzzleStep}>
      <div className={styles.textBox}>
        <h2 className={styles.stepTitle}>🧩 {step.title}</h2>
        <p>{step.prompt}</p>
        <p className={styles.small}>
          Lichess 실전 퍼즐 · {Math.min(index + 1, puzzles.length)} / {puzzles.length}번째 · 퍼즐
          레이팅에는 반영되지 않아요.
        </p>
      </div>
      {allDone ? (
        <div className={styles.successBox}>
          <strong>
            연습 끝! {puzzles.length}개 중 {clean}개를 도움 없이 풀었어요.
          </strong>
          <p>더 연습하고 싶으면 퍼즐 메뉴에서 같은 주제를 골라 보세요.</p>
        </div>
      ) : (
        <SinglePuzzle
          key={puzzle.id}
          puzzle={puzzle}
          isLast={index >= puzzles.length - 1}
          onFinished={finishPuzzle}
          onNext={() => setIndex((i) => i + 1)}
        />
      )}
    </div>
  );
}

function SinglePuzzle({
  puzzle,
  isLast,
  onFinished,
  onNext,
}: {
  puzzle: Puzzle;
  isLast: boolean;
  onFinished: (outcome: Outcome) => void;
  onNext: () => void;
}) {
  const { schedule } = useTimers();
  const [progress, setProgress] = useState<PuzzleProgress>(() => startPuzzle(puzzle));
  const [display, setDisplay] = useState<{ fen: string; lastMove?: string }>({ fen: puzzle.fen });
  const [status, setStatus] = useState<Status>('intro');
  const [usedHelp, setUsedHelp] = useState(false);
  const [hint, setHint] = useState(false);
  const [wrongUci, setWrongUci] = useState<string | null>(null);

  // 상대의 첫 수를 보여주고 시작
  useEffect(() => {
    schedule(() => {
      const started = startPuzzle(puzzle);
      setDisplay({ fen: started.fen, lastMove: puzzle.moves[0] });
      setStatus('myTurn');
    }, DELAY_MS);
  }, [puzzle, schedule]);

  function handleMove(uci: string) {
    if (status !== 'myTurn') return;
    const verdict = checkMove(progress, uci);
    if (verdict.kind === 'wrong') {
      setUsedHelp(true);
      setWrongUci(uci);
      return;
    }
    setWrongUci(null);
    setHint(false);
    setDisplay({ fen: verdict.fenAfterMove, lastMove: uci });
    if (verdict.kind === 'solved') {
      setStatus('solved');
      onFinished(usedHelp ? 'withHelp' : 'clean');
      return;
    }
    setStatus('reply');
    schedule(() => {
      setProgress(advance(progress, verdict.fenAfterReply));
      setDisplay({ fen: verdict.fenAfterReply, lastMove: verdict.reply });
      setStatus('myTurn');
    }, DELAY_MS);
  }

  function reveal() {
    setStatus('revealed');
    setWrongUci(null);
    let fen = progress.fen;
    const rest = puzzle.moves.slice(progress.ply);
    rest.forEach((uci, i) => {
      schedule(
        () => {
          const next = fenAfterMove(fen, uci);
          if (!next) return;
          fen = next;
          setDisplay({ fen: next, lastMove: uci });
        },
        DELAY_MS * (i + 1),
      );
    });
    onFinished('withHelp');
  }

  const color = puzzleColor(puzzle);
  const expected = expectedMove(progress);
  const hintSquare = hint && expected ? parseUci(expected)?.from : undefined;
  const arrows: BoardArrow[] = [];
  const wrong = wrongUci ? parseUci(wrongUci) : null;
  if (wrong) arrows.push({ from: wrong.from, to: wrong.to, color: ARROW_COLOR.bad });

  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <Board
          fen={display.fen}
          orientation={color === 'w' ? 'white' : 'black'}
          onMove={handleMove}
          interactive={status === 'myTurn'}
          lastMoveUci={display.lastMove}
          arrows={arrows}
          highlightSquares={hintSquare ? [hintSquare] : undefined}
        />
      </div>
      <aside className={styles.panel}>
        <p className={styles.counter}>
          {status === 'intro'
            ? '상대가 수를 두는 중…'
            : `${color === 'w' ? '백' : '흑'}으로 가장 좋은 수를 찾으세요`}
        </p>
        {status === 'reply' && <p className={styles.good}>✓ 좋아요! 계속하세요…</p>}
        {wrong && status === 'myTurn' && (
          <p className={styles.bad}>✗ 그 수가 아니에요. 다시 해 보세요.</p>
        )}
        {(status === 'solved' || status === 'revealed') && (
          <div className={status === 'solved' ? styles.successBox : styles.revealBox}>
            <strong>{status === 'solved' ? '🎉 정답!' : '정답 수순이에요'}</strong>
            <p className={styles.small}>
              퍼즐 난이도 {puzzle.rating} · {puzzle.themes.map(themeName).join(', ')}
            </p>
          </div>
        )}
        <div className={styles.actions}>
          {status === 'myTurn' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setHint(true);
                  setUsedHelp(true);
                }}
                disabled={hint}
              >
                💡 힌트
              </button>
              <button type="button" onClick={reveal}>
                정답 보기
              </button>
            </>
          )}
          {(status === 'solved' || status === 'revealed') && !isLast && (
            <button type="button" className={styles.primary} onClick={onNext}>
              다음 퍼즐 ▶
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
