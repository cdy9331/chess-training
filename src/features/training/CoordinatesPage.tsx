import { useEffect, useRef, useState } from 'react';
import { START_FEN } from '../../core/chess';
import { COORDINATE_ROUND_MS, nextSquare } from '../../core/training/coordinates';
import { recordsRepo, type PersonalBest } from '../../db/repos/records';
import { Board } from '../board/Board';
import styles from './Training.module.css';

type Side = 'white' | 'black';

type Phase =
  | { kind: 'idle' }
  | {
      kind: 'running';
      target: string;
      score: number;
      misses: number;
      endsAt: number;
      /** 방금 틀린 칸 (잠깐 보여준다) */
      wrong: string | null;
    }
  | { kind: 'done'; score: number; misses: number; isNewBest: boolean };

const random = () => Math.random();

export function CoordinatesPage() {
  const [side, setSide] = useState<Side>('white');
  const [showNotation, setShowNotation] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [now, setNow] = useState(0);
  const [bests, setBests] = useState<Record<Side, PersonalBest | null>>({
    white: null,
    black: null,
  });
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([recordsRepo.getBest('coord:white'), recordsRepo.getBest('coord:black')])
      .then(([white, black]) => !cancelled && setBests({ white, black }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const running = phase.kind === 'running';
  const endsAt = running ? phase.endsAt : 0;

  // 남은 시간 표시와 끝내기
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (phase.kind !== 'running' || now < phase.endsAt || finishedRef.current) return;
    finishedRef.current = true;
    const { score, misses } = phase;
    const key = side === 'white' ? 'coord:white' : 'coord:black';
    recordsRepo
      .submit(key, score)
      .then(({ best, isNewBest }) => {
        setBests((b) => ({ ...b, [side]: best }));
        setPhase({ kind: 'done', score, misses, isNewBest });
      })
      .catch(() => setPhase({ kind: 'done', score, misses, isNewBest: false }));
  }, [now, phase, side]);

  function start() {
    finishedRef.current = false;
    const t = Date.now();
    setNow(t);
    setPhase({
      kind: 'running',
      target: nextSquare(random, null),
      score: 0,
      misses: 0,
      endsAt: t + COORDINATE_ROUND_MS,
      wrong: null,
    });
  }

  function handleClick(square: string) {
    setPhase((p) => {
      if (p.kind !== 'running' || Date.now() >= p.endsAt) return p;
      if (square === p.target) {
        return { ...p, target: nextSquare(random, p.target), score: p.score + 1, wrong: null };
      }
      return { ...p, misses: p.misses + 1, wrong: square };
    });
  }

  const remainingMs = running ? Math.max(0, phase.endsAt - now) : COORDINATE_ROUND_MS;
  const best = bests[side];

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>좌표 훈련</h1>
      <p className={styles.muted}>
        화면에 나온 칸(예: e4)을 30초 안에 최대한 많이 눌러 보세요. 칸 이름을 빨리 알면 기보를 읽고
        수를 계산하기가 훨씬 쉬워져요.
      </p>

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <div className={styles.coordBoard}>
            <Board
              fen={START_FEN}
              orientation={side}
              interactive={false}
              onSquareClick={running ? handleClick : undefined}
              showNotation={showNotation || !running}
              highlightSquares={running && phase.wrong ? [phase.wrong] : undefined}
            />
            {running && (
              <div className={styles.coordTarget} aria-live="polite">
                {phase.target}
              </div>
            )}
          </div>
        </div>

        <aside className={styles.panel}>
          {running ? (
            <>
              <div className={styles.progressRow}>
                <progress value={remainingMs} max={COORDINATE_ROUND_MS} />
                <span className={styles.small}>{Math.ceil(remainingMs / 1000)}초</span>
              </div>
              <p className={styles.bigScore}>{phase.score}점</p>
              <p className={styles.small}>
                찾을 칸: <strong>{phase.target}</strong>
                {phase.wrong && ` · ✗ 방금 누른 칸은 ${phase.wrong}`}
                {phase.misses > 0 && ` · 틀림 ${phase.misses}번`}
              </p>
            </>
          ) : (
            <>
              {phase.kind === 'done' && (
                <div className={styles.resultCard}>
                  <p className={styles.resultTitle}>
                    {phase.isNewBest ? '🏆 신기록! ' : ''}
                    {phase.score}점
                  </p>
                  <p className={styles.small}>틀린 횟수 {phase.misses}번</p>
                </div>
              )}
              <fieldset className={styles.options}>
                <legend>시점</legend>
                <label>
                  <input
                    type="radio"
                    name="coord-side"
                    checked={side === 'white'}
                    onChange={() => setSide('white')}
                  />
                  백 쪽에서 보기
                </label>
                <label>
                  <input
                    type="radio"
                    name="coord-side"
                    checked={side === 'black'}
                    onChange={() => setSide('black')}
                  />
                  흑 쪽에서 보기
                </label>
              </fieldset>
              <label>
                <input
                  type="checkbox"
                  checked={showNotation}
                  onChange={(e) => setShowNotation(e.target.checked)}
                />{' '}
                훈련 중에도 가장자리 좌표 보이기 (쉬움)
              </label>
              <p className={styles.small}>
                최고 기록({side === 'white' ? '백' : '흑'} 시점):{' '}
                {best ? `${best.score}점` : '없음'}
              </p>
              <button type="button" className={styles.primary} onClick={start}>
                {phase.kind === 'done' ? '다시 하기' : '시작'}
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
