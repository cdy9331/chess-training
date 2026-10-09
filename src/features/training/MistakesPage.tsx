import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { WEAKNESS_INFO } from '../../core/training/recommend';
import { mistakesRepo } from '../../db/repos/mistakes';
import type { MistakeRecord } from '../../db/schema';
import { formatDueIn } from '../../shared/format';
import { MistakeDrill } from './MistakeDrill';
import styles from './Training.module.css';

interface Loaded {
  all: MistakeRecord[];
  now: number;
}

/** 한 번에 복습하는 최대 문제 수 (너무 길면 지치므로) */
const SESSION_SIZE = 10;

export function MistakesPage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<MistakeRecord[] | null>(null);
  /** 복습을 마치고 돌아오면 목록을 다시 불러온다 */
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    mistakesRepo
      .list()
      .then((all) => !cancelled && setLoaded({ all, now: Date.now() }))
      .catch(() => !cancelled && setError('실수 기록을 불러오지 못했어요.'));
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (queue) {
    return (
      <MistakeDrill
        queue={queue}
        onExit={() => {
          setQueue(null);
          setReloadToken((t) => t + 1);
        }}
      />
    );
  }

  if (error) return <p>{error}</p>;
  if (!loaded) return null;

  const { all, now } = loaded;
  const due = all.filter((m) => m.due <= now).sort((a, b) => a.due - b.due);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>내 실수 복습</h1>
      <p className={styles.muted}>
        게임 리뷰에서 나온 내 실수·블런더 국면을 다시 풀어요. 맞히면 복습 간격이
        늘어나고(1→2→4→8…일), 틀리면 다음 날 다시 나와요.
      </p>

      {all.length === 0 ? (
        <div className={styles.emptyBox}>
          <p>아직 모인 실수가 없어요.</p>
          <p className={styles.small}>
            AI와 대국한 뒤 <Link to="/review">게임 리뷰</Link>를 하면, 내가 둔 실수·블런더가 여기에
            자동으로 모여요.
          </p>
        </div>
      ) : (
        <div className={styles.dueBox}>
          <strong>
            {due.length > 0
              ? `오늘 복습할 실수 ${due.length}개`
              : '오늘 복습할 실수를 모두 끝냈어요 🎉'}
          </strong>
          <div className={styles.actions}>
            {due.length > 0 && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => setQueue(due.slice(0, SESSION_SIZE))}
              >
                복습 시작 ({Math.min(due.length, SESSION_SIZE)}문제)
              </button>
            )}
            {due.length === 0 && (
              <button type="button" onClick={() => setQueue(all.slice(0, SESSION_SIZE))}>
                최근 실수 미리 풀어보기
              </button>
            )}
          </div>
        </div>
      )}

      {all.length > 0 && (
        <ul className={styles.list}>
          {all.map((m) => (
            <li key={m.id} className={styles.card}>
              <div className={styles.cardMain}>
                <strong>
                  <span
                    className={m.classification === 'blunder' ? styles.blunder : styles.mistake}
                  >
                    {m.classification === 'blunder' ? '블런더' : '실수'}
                  </span>{' '}
                  {Math.ceil(m.ply / 2)}
                  {m.ply % 2 === 1 ? '.' : '...'} {m.playedSan}
                </strong>
                <span className={styles.small}>
                  {m.tags.map((t) => WEAKNESS_INFO[t].name).join(' · ')}
                </span>
              </div>
              <span className={styles.small}>
                {m.reps === 0 ? '아직 안 풀어봄' : `${m.reps}번 복습`} · 다음:{' '}
                {formatDueIn(m.due, now)}
              </span>
              <div className={styles.actions}>
                <button type="button" onClick={() => setQueue([m])}>
                  풀기
                </button>
                <Link to={`/review/${m.gameId}`}>게임 보기</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
