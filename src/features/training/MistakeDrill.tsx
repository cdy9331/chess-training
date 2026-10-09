import { useEffect, useRef, useState } from 'react';
import { fenAfterMove, parseUci, sideToMove, uciToSan } from '../../core/chess';
import { isAbortError } from '../../core/engine/EngineClient';
import { analyzePosition, classifyMove, type MoveClass } from '../../core/review';
import { WEAKNESS_INFO } from '../../core/training/recommend';
import { mistakesRepo } from '../../db/repos/mistakes';
import type { MistakeRecord } from '../../db/schema';
import { formatDueIn } from '../../shared/format';
import { MOVE_CLASS_STYLE } from '../../shared/moveClassStyle';
import { Board, type BoardArrow } from '../board/Board';
import { useLazyEngineClient } from '../board/engine/useLazyEngineClient';
import styles from './Training.module.css';

/** 내 답을 판정할 때의 분석 깊이 (리뷰의 "다시 두어보기"와 같은 수준) */
const JUDGE_DEPTH = 12;
const BEST_ARROW = 'rgba(40, 150, 60, 0.85)';
const WRONG_ARROW = 'rgba(210, 60, 60, 0.85)';
const PLAYED_ARROW = 'rgba(230, 130, 46, 0.7)';

type Attempt =
  | { kind: 'waiting' }
  | { kind: 'checking'; uci: string; san: string }
  | { kind: 'correct'; uci: string; san: string; isBest: boolean }
  | { kind: 'wrong'; uci: string; san: string; classification: MoveClass }
  | { kind: 'revealed' };

interface Result {
  correct: boolean;
  /** 다음 복습일 ("내일", "2일 뒤"…) */
  dueLabel: string;
}

interface MistakeDrillProps {
  queue: MistakeRecord[];
  onExit: () => void;
}

export function MistakeDrill({ queue, onExit }: MistakeDrillProps) {
  const { getClient, discard } = useLazyEngineClient();
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState<Attempt>({ kind: 'waiting' });
  const [showPlayed, setShowPlayed] = useState(false);
  /** 문제 번호 → 결과. 첫 판정(또는 정답 보기)만 복습 일정에 반영한다. */
  const [results, setResults] = useState<Map<number, Result>>(new Map());
  const [recorded, setRecorded] = useState<ReadonlySet<number>>(new Set());
  const recordedRef = useRef(new Set<number>());
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const item = queue[index];
  if (!item) {
    const all = [...results.values()];
    const correct = all.filter((r) => r.correct).length;
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>복습 완료!</h1>
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>
            {correct} / {queue.length} 맞혔어요 {correct === queue.length ? '🎉' : ''}
          </p>
          <p className={styles.muted}>
            맞힌 실수는 복습 간격이 늘어나고, 틀린 실수는 내일 다시 나와요.
          </p>
          <button type="button" className={styles.primary} onClick={onExit}>
            목록으로
          </button>
        </div>
      </section>
    );
  }

  const color = sideToMove(item.fen);
  const finished = attempt.kind === 'correct' || attempt.kind === 'revealed';
  const result = results.get(index);
  const alreadyRecorded = recorded.has(index);

  function record(correct: boolean) {
    if (!item || recordedRef.current.has(index)) return;
    recordedRef.current.add(index);
    setRecorded(new Set(recordedRef.current));
    const at = index;
    const now = Date.now();
    mistakesRepo
      .recordReview(item.id, correct, now)
      .then((next) => {
        if (next) {
          const dueLabel = formatDueIn(next.due, now);
          setResults((r) => new Map(r).set(at, { correct, dueLabel }));
        }
      })
      .catch(() => undefined);
  }

  async function handleMove(uci: string) {
    if (!item || finished || attempt.kind === 'checking') return;
    const fenAfter = fenAfterMove(item.fen, uci);
    if (!fenAfter) return;
    const san = uciToSan(item.fen, uci) ?? uci;
    const requestId = ++requestRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAttempt({ kind: 'checking', uci, san });

    const client = getClient();
    try {
      const isBest = uci === item.bestUci;
      const classification: MoveClass = isBest
        ? 'best'
        : classifyMove(
            item.evalBefore,
            await analyzePosition(client, fenAfter, JUDGE_DEPTH, controller.signal),
            color,
            uci,
          ).classification;
      if (requestId !== requestRef.current) return;
      // '좋음' 이상만 정답으로 본다 (리뷰의 "다시 두어보기"와 같은 기준)
      const good = classification === 'best' || classification === 'good';
      record(good);
      setAttempt(
        good ? { kind: 'correct', uci, san, isBest } : { kind: 'wrong', uci, san, classification },
      );
    } catch (error) {
      if (requestId !== requestRef.current) return;
      if (!isAbortError(error)) discard(client);
      setAttempt({ kind: 'waiting' });
    }
  }

  function next() {
    setAttempt({ kind: 'waiting' });
    setShowPlayed(false);
    setIndex((i) => i + 1);
  }

  const arrows: BoardArrow[] = [];
  const pushArrow = (uci: string, arrowColor: string) => {
    const p = parseUci(uci);
    if (p) arrows.push({ from: p.from, to: p.to, color: arrowColor });
  };
  if (showPlayed) pushArrow(item.playedUci, PLAYED_ARROW);
  if (attempt.kind === 'wrong') pushArrow(attempt.uci, WRONG_ARROW);
  if (finished) pushArrow(item.bestUci, BEST_ARROW);

  return (
    <section className={styles.page}>
      <button type="button" className={styles.linkButton} onClick={onExit}>
        ← 실수 목록
      </button>
      <h1 className={styles.title}>내 실수 복습</h1>
      <div className={styles.progressRow}>
        <progress value={index} max={queue.length} />
        <span className={styles.small}>
          {index + 1} / {queue.length}
        </span>
      </div>

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <Board
            fen={item.fen}
            orientation={color === 'w' ? 'white' : 'black'}
            onMove={(uci) => void handleMove(uci)}
            interactive={!finished && attempt.kind !== 'checking'}
            arrows={arrows}
          />
        </div>

        <aside className={styles.panel}>
          <p className={styles.prompt}>
            {color === 'w' ? '백' : '흑'} 차례 — 게임에서 이 국면에 둔 수는{' '}
            <span className={item.classification === 'blunder' ? styles.blunder : styles.mistake}>
              {item.classification === 'blunder' ? '블런더' : '실수'}
            </span>
            였어요. 더 좋은 수를 찾아보세요!
          </p>

          {!showPlayed && !finished && (
            <button type="button" onClick={() => setShowPlayed(true)}>
              👀 그때 둔 수 보기
            </button>
          )}
          {showPlayed && (
            <p className={styles.small}>
              그때 둔 수: <strong>{item.playedSan}</strong> (주황 화살표)
            </p>
          )}

          {attempt.kind === 'checking' && (
            <p className={styles.feedbackInfo} role="status">
              {attempt.san} — 엔진이 확인하는 중…
            </p>
          )}
          {attempt.kind === 'wrong' && (
            <div className={styles.feedbackBad}>
              <strong>✗ {attempt.san}</strong>는{' '}
              <strong style={{ color: MOVE_CLASS_STYLE[attempt.classification].color }}>
                {MOVE_CLASS_STYLE[attempt.classification].label}
              </strong>
              {attempt.classification === 'inaccuracy'
                ? '이에요. 나쁘지 않지만 더 좋은 수가 있어요. 다시 찾아보세요.'
                : '예요. 다른 수를 찾아보세요.'}
            </div>
          )}
          {attempt.kind === 'correct' && (
            <div className={styles.feedbackGood}>
              <strong>✓ {attempt.san}</strong>{' '}
              {attempt.isBest
                ? '엔진이 고른 최선의 수예요!'
                : `좋은 수예요! (엔진 추천: ${item.bestSan})`}
              {result && !result.correct && (
                <p className={styles.small}>처음에 틀려서 이 실수는 내일 다시 나와요.</p>
              )}
            </div>
          )}
          {attempt.kind === 'revealed' && (
            <div className={styles.feedbackInfo}>
              정답은 <strong>{item.bestSan}</strong> (초록 화살표)였어요.
            </div>
          )}

          {(attempt.kind === 'wrong' || attempt.kind === 'waiting') && (
            <button
              type="button"
              onClick={() => {
                record(false);
                setAttempt({ kind: 'revealed' });
              }}
            >
              💡 정답 보기{alreadyRecorded ? '' : ' (틀린 것으로 기록돼요)'}
            </button>
          )}

          {finished && (
            <div className={styles.explain}>
              <p className={styles.sectionTitle}>그때 {item.playedSan}가 나빴던 이유</p>
              <ul>
                {item.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {item.tags.length > 0 && (
                <p className={styles.small}>
                  약점: {item.tags.map((t) => WEAKNESS_INFO[t].name).join(', ')}
                </p>
              )}
              {result && <p className={styles.small}>다음 복습: {result.dueLabel}</p>}
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={next}>
                  {index + 1 < queue.length ? '다음 문제 →' : '결과 보기'}
                </button>
                <a href={`#/review/${item.gameId}`}>이 게임 리뷰 보기</a>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
