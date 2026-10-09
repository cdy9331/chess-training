import { useCallback, useEffect, useRef, useState } from 'react';
import { parseUci } from '../../core/chess';
import {
  RUSH_MAX_MISSES,
  advance,
  checkMove,
  puzzleColor,
  recordRushPuzzle,
  rushEnded,
  rushRemainingMs,
  rushTargetRating,
  selectPuzzle,
  startPuzzle,
  startRush,
  type Puzzle,
  type PuzzleProgress,
  type RushEnd,
  type RushLength,
  type RushState,
} from '../../core/puzzles';
import { recordsRepo, type PersonalBest } from '../../db/repos/records';
import { puzzleLoader } from '../../shared/puzzleData';
import { useTimers } from '../../shared/useTimers';
import { Board, type BoardArrow } from '../board/Board';
import styles from './Puzzles.module.css';

/** 러시는 빠르게 진행되므로 일반 퍼즐보다 짧게 멈춘다 */
const OPPONENT_DELAY_MS = 350;
const WRONG_FLASH_MS = 700;
const WRONG_ARROW_COLOR = 'rgba(210, 60, 60, 0.85)';

type Phase =
  { kind: 'menu' } | { kind: 'running' } | { kind: 'over'; reason: RushEnd; isNewBest: boolean };

interface Display {
  fen: string;
  lastMove?: string;
}

type Turn = 'loading' | 'intro' | 'myTurn' | 'waiting';

const RECORD_KEY = { 3: 'rush:3', 5: 'rush:5' } as const;

interface PuzzleRushProps {
  onExit: () => void;
}

export function PuzzleRush({ onExit }: PuzzleRushProps) {
  const { schedule, clear } = useTimers();
  const [length, setLength] = useState<RushLength>(3);
  const [phase, setPhase] = useState<Phase>({ kind: 'menu' });
  const [rush, setRush] = useState<RushState | null>(null);
  /** 푼 순서대로 성공 여부 (결과 표시용) */
  const [marks, setMarks] = useState<boolean[]>([]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [display, setDisplay] = useState<Display | null>(null);
  const [turn, setTurn] = useState<Turn>('loading');
  const [wrongMove, setWrongMove] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [bests, setBests] = useState<Record<RushLength, PersonalBest | null>>({ 3: null, 5: null });
  const endedRef = useRef(false);
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([recordsRepo.getBest('rush:3'), recordsRepo.getBest('rush:5')])
      .then(([three, five]) => !cancelled && setBests({ 3: three, 5: five }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPuzzle = useCallback(
    async (state: RushState) => {
      const requestId = ++requestRef.current;
      setTurn('loading');
      setWrongMove(null);
      try {
        const next = await selectPuzzle(puzzleLoader, {
          targetRating: rushTargetRating(state.solved),
          exclude: new Set(state.seenIds),
        });
        if (requestId !== requestRef.current) return;
        if (!next) throw new Error('퍼즐 없음');
        const started = startPuzzle(next);
        setPuzzle(next);
        setProgress(started);
        setDisplay({ fen: next.fen });
        setTurn('intro');
        schedule(() => {
          setDisplay({ fen: started.fen, lastMove: next.moves[0] });
          setTurn('myTurn');
        }, OPPONENT_DELAY_MS);
      } catch {
        if (requestId === requestRef.current) setLoadError(true);
      }
    },
    [schedule],
  );

  function start() {
    clear();
    endedRef.current = false;
    const t = Date.now();
    const state = startRush(length, t);
    setNow(t);
    setRush(state);
    setMarks([]);
    setLoadError(false);
    setPhase({ kind: 'running' });
    void loadPuzzle(state);
  }

  const running = phase.kind === 'running';

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running]);

  // 시간이 다 되거나 3번 틀리면 끝내고 기록을 저장한다
  useEffect(() => {
    if (!running || !rush || endedRef.current) return;
    const reason = rushEnded(rush, now);
    if (!reason) return;
    endedRef.current = true;
    requestRef.current += 1;
    clear();
    recordsRepo
      .submit(RECORD_KEY[rush.length], rush.solved)
      .then(({ best, isNewBest }) => {
        setBests((b) => ({ ...b, [rush.length]: best }));
        setPhase({ kind: 'over', reason, isNewBest });
      })
      .catch(() => setPhase({ kind: 'over', reason, isNewBest: false }));
  }, [running, rush, now, clear]);

  function finishPuzzle(solved: boolean) {
    if (!rush || !puzzle) return;
    const next = recordRushPuzzle(rush, puzzle.id, solved);
    setRush(next);
    setMarks((m) => [...m, solved]);
    if (!rushEnded(next, Date.now())) void loadPuzzle(next);
  }

  function handleMove(uci: string) {
    if (turn !== 'myTurn' || !progress || !rush) return;
    const verdict = checkMove(progress, uci);
    if (verdict.kind === 'wrong') {
      setWrongMove(uci);
      if (verdict.fenAfterMove) setDisplay({ fen: verdict.fenAfterMove, lastMove: uci });
      setTurn('waiting');
      schedule(() => finishPuzzle(false), WRONG_FLASH_MS);
      return;
    }
    setDisplay({ fen: verdict.fenAfterMove, lastMove: uci });
    setTurn('waiting');
    if (verdict.kind === 'solved') {
      schedule(() => finishPuzzle(true), OPPONENT_DELAY_MS);
      return;
    }
    schedule(() => {
      setProgress(advance(progress, verdict.fenAfterReply));
      setDisplay({ fen: verdict.fenAfterReply, lastMove: verdict.reply });
      setTurn('myTurn');
    }, OPPONENT_DELAY_MS);
  }

  if (phase.kind === 'menu' || !rush) {
    return (
      <section className={styles.menu}>
        <button type="button" className={styles.linkButton} onClick={onExit}>
          ← 퍼즐 메뉴
        </button>
        <h1 className={styles.title}>⚡ 퍼즐 러시</h1>
        <p className={styles.muted}>
          제한 시간 안에 퍼즐을 최대한 많이 풀어요. 아주 쉬운 문제부터 시작해서 풀수록 어려워지고,
          {RUSH_MAX_MISSES}번 틀리면 끝나요. 러시 결과는 퍼즐 레이팅에 영향을 주지 않아요.
        </p>
        <fieldset className={styles.fieldset}>
          <legend>시간</legend>
          {([3, 5] as const).map((len) => (
            <label key={len} className={styles.rushOption}>
              <input
                type="radio"
                name="rush-length"
                checked={length === len}
                onChange={() => setLength(len)}
              />
              {len}분 <span className={styles.small}>최고 {bests[len]?.score ?? '-'}개</span>
            </label>
          ))}
        </fieldset>
        <div>
          <button type="button" className={styles.primary} onClick={start}>
            러시 시작
          </button>
        </div>
      </section>
    );
  }

  const remainingMs = running ? rushRemainingMs(rush, now) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const color = puzzle ? puzzleColor(puzzle) : 'w';
  const arrows: BoardArrow[] = [];
  const wrong = wrongMove ? parseUci(wrongMove) : null;
  if (wrong) arrows.push({ from: wrong.from, to: wrong.to, color: WRONG_ARROW_COLOR });

  return (
    <section className={styles.page}>
      <button type="button" className={styles.linkButton} onClick={onExit}>
        ← 퍼즐 메뉴
      </button>
      <h1 className={styles.title}>⚡ 퍼즐 러시 ({rush.length}분)</h1>

      <div className={styles.layout}>
        <div>
          {display && (
            <Board
              fen={display.fen}
              orientation={color === 'w' ? 'white' : 'black'}
              onMove={handleMove}
              interactive={running && turn === 'myTurn'}
              lastMoveUci={display.lastMove}
              arrows={arrows}
            />
          )}
        </div>

        <aside className={styles.panel}>
          {running ? (
            <>
              <p className={styles.rushClock} aria-label="남은 시간">
                ⏱ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
              </p>
              <p className={styles.rushScore}>{rush.solved}개</p>
              <p className={styles.small}>
                남은 기회 {'❤'.repeat(RUSH_MAX_MISSES - rush.misses)}
                {'·'.repeat(rush.misses)}
              </p>
              <p className={styles.small}>
                {turn === 'myTurn'
                  ? `${color === 'w' ? '백' : '흑'} 차례 — 가장 좋은 수를 찾으세요`
                  : turn === 'loading'
                    ? '다음 문제를 불러오는 중…'
                    : wrongMove
                      ? '✗ 틀렸어요! 다음 문제로'
                      : '…'}
              </p>
              {loadError && <p className={styles.error}>퍼즐을 불러오지 못했어요.</p>}
            </>
          ) : (
            phase.kind === 'over' && (
              <div className={styles.rushResult}>
                <p className={styles.small}>
                  {phase.reason === 'time' ? '⏱ 시간 종료' : `❌ ${RUSH_MAX_MISSES}번 틀려서 종료`}
                </p>
                <p className={styles.rushScore}>
                  {phase.isNewBest && '🏆 '}
                  {rush.solved}개
                </p>
                <p className={styles.small}>
                  {phase.isNewBest
                    ? '신기록이에요!'
                    : `최고 기록 ${bests[rush.length]?.score ?? 0}개`}
                </p>
                <div className={styles.buttons}>
                  <button type="button" className={styles.primary} onClick={start}>
                    다시 하기
                  </button>
                  <button type="button" onClick={() => setPhase({ kind: 'menu' })}>
                    시간 바꾸기
                  </button>
                </div>
              </div>
            )
          )}
          <ol className={styles.rushMarks} aria-label="푼 문제">
            {marks.map((ok, i) => (
              <li key={i} className={ok ? styles.rushOk : styles.rushMiss}>
                {ok ? '✓' : '✗'}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
