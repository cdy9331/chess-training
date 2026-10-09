import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { fenAfterMove, parseUci } from '../../core/chess';
import {
  advance,
  checkMove,
  expectedMove,
  puzzleColor,
  selectPuzzle,
  startPuzzle,
  themeName,
  updatePuzzleRating,
  type Glicko,
  type Puzzle,
  type PuzzleProgress,
} from '../../core/puzzles';
import { puzzlesRepo } from '../../db/repos/puzzles';
import { useTimers } from '../../shared/useTimers';
import { Board, type BoardArrow } from '../board/Board';
import { puzzleLoader } from './puzzleData';
import { criteriaFor, type PuzzleMode } from './puzzleMode';
import styles from './Puzzles.module.css';

/** 상대 수를 보여주기 전/후 잠깐 멈추는 시간 */
const OPPONENT_DELAY_MS = 600;
const WRONG_FLASH_MS = 800;
const WRONG_ARROW_COLOR = 'rgba(210, 60, 60, 0.85)';

type Status =
  | 'loading'
  | 'intro' // 상대 첫 수를 보여주기 직전
  | 'myTurn'
  | 'correct' // 정답 → 상대 응수 대기
  | 'wrong' // 오답 표시 중 (잠시 후 되돌림)
  | 'solution' // 해답을 자동으로 보여주는 중
  | 'done'
  | 'empty'
  | 'error';

interface Display {
  fen: string;
  lastMove?: string;
}

interface Outcome {
  solved: boolean;
  ratingBefore: number;
  ratingAfter: number;
}

interface PuzzleSolverProps {
  mode: PuzzleMode;
  rating: Glicko;
  onRated: (rating: Glicko) => void;
  onBackToMenu: () => void;
}

export function PuzzleSolver({ mode, rating, onRated, onBackToMenu }: PuzzleSolverProps) {
  const { schedule, clear } = useTimers();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [display, setDisplay] = useState<Display | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(false);
  const [wrongMove, setWrongMove] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [saveError, setSaveError] = useState(false);

  // 기록은 퍼즐마다 한 번만 (실패 후 끝까지 풀어도 다시 기록하지 않는다)
  const recordedFor = useRef<string | null>(null);
  const startedAt = useRef(0);
  const ratingRef = useRef(rating);
  useEffect(() => {
    ratingRef.current = rating;
  }, [rating]);

  const loadNext = useCallback(async () => {
    clear();
    setStatus('loading');
    setFailed(false);
    setHint(false);
    setWrongMove(null);
    setOutcome(null);
    setSaveError(false);
    try {
      const exclude = await puzzlesRepo.recentPuzzleIds();
      const next = await selectPuzzle(puzzleLoader, {
        ...criteriaFor(mode, ratingRef.current.rating),
        exclude,
      });
      if (!next) {
        setStatus('empty');
        return;
      }
      const started = startPuzzle(next);
      setPuzzle(next);
      setProgress(started);
      setDisplay({ fen: next.fen });
      setStatus('intro');
      schedule(() => {
        setDisplay({ fen: started.fen, lastMove: next.moves[0] });
        setStatus('myTurn');
        startedAt.current = Date.now();
      }, OPPONENT_DELAY_MS);
    } catch {
      setStatus('error');
    }
  }, [clear, mode, schedule]);

  useEffect(() => {
    // 처음 들어왔을 때 첫 퍼즐을 불러온다 (상태 변경은 비동기 함수 안에서 일어난다).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNext();
  }, [loadNext]);

  async function record(solved: boolean, usedHelp: boolean) {
    if (!puzzle || recordedFor.current === puzzle.id) return;
    recordedFor.current = puzzle.id;
    const before = ratingRef.current;
    const after = updatePuzzleRating(before, puzzle.rating, solved);
    setOutcome({ solved, ratingBefore: before.rating, ratingAfter: after.rating });
    onRated(after);
    try {
      await puzzlesRepo.recordAttempt(
        {
          puzzleId: puzzle.id,
          at: Date.now(),
          solved,
          puzzleRating: puzzle.rating,
          themes: puzzle.themes,
          ratingBefore: before.rating,
          ratingAfter: after.rating,
          durationMs: Date.now() - startedAt.current,
          usedHelp,
        },
        after,
      );
    } catch {
      setSaveError(true);
    }
  }

  function fail(usedHelp: boolean) {
    if (!failed) void record(false, usedHelp);
    setFailed(true);
  }

  function handleMove(uci: string) {
    if (status !== 'myTurn' || !progress) return;
    setHint(false);
    const verdict = checkMove(progress, uci);

    if (verdict.kind === 'wrong') {
      fail(false);
      setWrongMove(uci);
      setStatus('wrong');
      if (verdict.fenAfterMove) setDisplay({ fen: verdict.fenAfterMove, lastMove: uci });
      const lastMove = display?.lastMove;
      schedule(() => {
        setDisplay({ fen: progress.fen, lastMove });
        setStatus('myTurn');
      }, WRONG_FLASH_MS);
      return;
    }

    setWrongMove(null);
    setDisplay({ fen: verdict.fenAfterMove, lastMove: uci });
    if (verdict.kind === 'solved') {
      setStatus('done');
      if (!failed) void record(true, false);
      return;
    }
    setStatus('correct');
    schedule(() => {
      setProgress(advance(progress, verdict.fenAfterReply));
      setDisplay({ fen: verdict.fenAfterReply, lastMove: verdict.reply });
      setStatus('myTurn');
    }, OPPONENT_DELAY_MS);
  }

  function showHint() {
    fail(true);
    setHint(true);
  }

  function showSolution() {
    if (!progress || !puzzle) return;
    fail(true);
    setHint(false);
    setStatus('solution');
    let fen = progress.fen;
    const rest = puzzle.moves.slice(progress.ply);
    rest.forEach((uci, i) => {
      schedule(
        () => {
          const next = fenAfterMove(fen, uci);
          if (!next) return;
          fen = next;
          setDisplay({ fen: next, lastMove: uci });
          if (i === rest.length - 1) setStatus('done');
        },
        OPPONENT_DELAY_MS * (i + 1),
      );
    });
  }

  if (status === 'empty' || status === 'error') {
    return (
      <section className={styles.page}>
        <p className={styles.error}>
          {status === 'empty'
            ? '조건에 맞는 퍼즐을 찾지 못했어요. 다른 주제를 골라 보세요.'
            : '퍼즐을 불러오지 못했어요. 퍼즐 데이터가 있는지 확인해 주세요.'}
        </p>
        <button type="button" onClick={onBackToMenu}>
          메뉴로
        </button>
      </section>
    );
  }

  const color = puzzle ? puzzleColor(puzzle) : 'w';
  const colorName = color === 'w' ? '백' : '흑';
  const expected = progress ? expectedMove(progress) : null;
  const hintSquare = hint && expected ? parseUci(expected)?.from : undefined;
  const arrows: BoardArrow[] = [];
  const wrong = status === 'wrong' && wrongMove ? parseUci(wrongMove) : null;
  if (wrong) arrows.push({ from: wrong.from, to: wrong.to, color: WRONG_ARROW_COLOR });

  return (
    <section className={styles.page}>
      <header className={styles.solverHeader}>
        <button type="button" className={styles.linkButton} onClick={onBackToMenu}>
          ← 퍼즐 메뉴
        </button>
        <span className={styles.muted}>
          내 레이팅 <strong>{Math.round(rating.rating)}</strong>
        </span>
      </header>

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          {display && (
            <Board
              fen={display.fen}
              orientation={color === 'w' ? 'white' : 'black'}
              lastMoveUci={display.lastMove}
              onMove={handleMove}
              interactive={status === 'myTurn'}
              arrows={arrows}
              highlightSquares={hintSquare ? [hintSquare] : undefined}
            />
          )}
        </div>

        <aside className={styles.panel}>
          {status !== 'done' && (
            <div className={`${styles.prompt} ${styles[`prompt_${status}`] ?? ''}`} role="status">
              {status === 'loading' && '퍼즐을 고르는 중…'}
              {status === 'intro' && '상대가 수를 두는 중…'}
              {status === 'myTurn' && (
                <>
                  <span className={styles.turnPiece}>{color === 'w' ? '♔' : '♚'}</span>
                  {colorName}으로 가장 좋은 수를 찾으세요
                </>
              )}
              {status === 'correct' && '✓ 좋아요! 상대의 응수를 보세요'}
              {status === 'wrong' && '✗ 그 수가 아니에요. 다시 해 보세요'}
              {status === 'solution' && '해답을 보여드리고 있어요…'}
            </div>
          )}

          {failed && status !== 'done' && (
            <p className={styles.small}>
              이번 퍼즐은 실패로 기록됐어요. 그래도 끝까지 풀어 보면 도움이 돼요.
            </p>
          )}
          {hintSquare && <p className={styles.small}>파란 테두리 칸의 기물을 움직여 보세요.</p>}

          {status === 'done' && puzzle && (
            <ResultCard
              puzzle={puzzle}
              outcome={outcome}
              failed={failed}
              saveError={saveError}
              analysisFen={fenAfterMove(puzzle.fen, puzzle.moves[0] ?? '') ?? puzzle.fen}
              onNext={() => void loadNext()}
            />
          )}

          {(status === 'myTurn' || status === 'wrong' || status === 'correct') && (
            <div className={styles.actions}>
              <button type="button" onClick={showHint} disabled={hint || status !== 'myTurn'}>
                💡 힌트
              </button>
              <button type="button" onClick={showSolution} disabled={status !== 'myTurn'}>
                해답 보기
              </button>
            </div>
          )}

          {puzzle && status !== 'done' && (
            <p className={styles.small}>퍼즐 난이도는 다 풀면 알려드려요.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

function ResultCard({
  puzzle,
  outcome,
  failed,
  saveError,
  analysisFen,
  onNext,
}: {
  puzzle: Puzzle;
  outcome: Outcome | null;
  failed: boolean;
  saveError: boolean;
  analysisFen: string;
  onNext: () => void;
}) {
  const success = !failed;
  const change = outcome ? Math.round(outcome.ratingAfter - outcome.ratingBefore) : 0;
  return (
    <div className={`${styles.resultCard} ${success ? styles.success : styles.failure}`}>
      <p className={styles.resultTitle}>{success ? '🎉 성공!' : '완료 (실패로 기록)'}</p>
      {outcome && (
        <p>
          레이팅 {Math.round(outcome.ratingAfter)}{' '}
          <span className={change >= 0 ? styles.plus : styles.minus}>
            ({change >= 0 ? '+' : ''}
            {change})
          </span>
        </p>
      )}
      <p className={styles.muted}>퍼즐 난이도 {puzzle.rating}</p>
      <div className={styles.themeTags}>
        {puzzle.themes.map((t) => (
          <span key={t} className={styles.tag}>
            {themeName(t)}
          </span>
        ))}
      </div>
      {saveError && <p className={styles.error}>기록을 저장하지 못했어요.</p>}
      <div className={styles.resultActions}>
        <button type="button" className={styles.primary} onClick={onNext}>
          다음 퍼즐 ▶
        </button>
        <Link to={`/analysis?fen=${encodeURIComponent(analysisFen)}`}>분석 보드에서 살펴보기</Link>
        <a href={`https://lichess.org/training/${puzzle.id}`} target="_blank" rel="noreferrer">
          Lichess에서 보기 ↗
        </a>
      </div>
    </div>
  );
}
