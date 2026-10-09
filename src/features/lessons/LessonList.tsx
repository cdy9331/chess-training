import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CATEGORY_INFO, CATEGORY_ORDER, LEVEL_NAME, type LessonLevel } from '../../core/lessons';
import { LESSONS } from '../../content/lessons';
import { lessonsRepo } from '../../db/repos/lessons';
import type { LessonProgressRecord } from '../../db/schema';
import styles from './Lessons.module.css';

const LEVEL_FILTERS: readonly (LessonLevel | 'all')[] = ['all', 1, 2, 3];
const FILTER_KEY = 'chess-training:lesson-level';

function loadFilter(): LessonLevel | 'all' {
  try {
    const v = Number(localStorage.getItem(FILTER_KEY));
    return v === 1 || v === 2 || v === 3 ? v : 'all';
  } catch {
    return 'all';
  }
}

export function LessonList() {
  const [progress, setProgress] = useState<Map<string, LessonProgressRecord> | null>(null);
  const [level, setLevel] = useState<LessonLevel | 'all'>(loadFilter);

  useEffect(() => {
    let cancelled = false;
    lessonsRepo
      .progressMap()
      .then((p) => !cancelled && setProgress(p))
      .catch(() => !cancelled && setProgress(new Map()));
    return () => {
      cancelled = true;
    };
  }, []);

  function chooseLevel(next: LessonLevel | 'all') {
    setLevel(next);
    try {
      localStorage.setItem(FILTER_KEY, String(next));
    } catch {
      // 무시
    }
  }

  const done = LESSONS.filter((l) => progress?.get(l.id)?.completedAt).length;
  const visible = LESSONS.filter((l) => level === 'all' || l.level === level);

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>레슨</h1>
      <p className={styles.muted}>
        설명을 읽고, 직접 수를 찾아보고, 엔진과 실전 퍼즐로 연습해요. 완료한 레슨 {done} /{' '}
        {LESSONS.length}
      </p>

      <div className={styles.levelFilter} role="group" aria-label="레벨">
        {LEVEL_FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={level === f} onClick={() => chooseLevel(f)}>
            {f === 'all' ? '전체' : LEVEL_NAME[f]}
            <span className={styles.small}>
              {' '}
              ({LESSONS.filter((l) => f === 'all' || l.level === f).length})
            </span>
          </button>
        ))}
      </div>

      {CATEGORY_ORDER.map((category) => {
        const lessons = visible.filter((l) => l.category === category);
        if (lessons.length === 0) return null;
        return (
          <section key={category} className={styles.group}>
            <h2 className={styles.groupTitle}>{CATEGORY_INFO[category].name}</h2>
            <p className={styles.small}>{CATEGORY_INFO[category].description}</p>
            <ul className={styles.lessonGrid}>
              {lessons.map((lesson) => {
                const p = progress?.get(lesson.id);
                const status = p?.completedAt
                  ? '✅ 완료'
                  : p && p.stepIndex > 0
                    ? `▶ 이어서 (${p.stepIndex + 1}/${lesson.steps.length})`
                    : `${lesson.steps.length}단계`;
                return (
                  <li key={lesson.id}>
                    <Link
                      to={`/lessons/${lesson.id}`}
                      className={`${styles.lessonCard} ${p?.completedAt ? styles.completed : ''}`}
                    >
                      <strong>{lesson.title}</strong>
                      <span className={styles.small}>{lesson.summary}</span>
                      <span className={styles.cardMeta}>
                        <span className={styles.levelBadge}>{LEVEL_NAME[lesson.level]}</span>
                        <span>{status}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className={styles.small}>
        커리큘럼 구성은 chess.com 학습 경로와 Lichess 연습 주제를 참고했고, 설명과 예제 국면은 이
        앱에서 직접 만들었어요. 연습 퍼즐은 Lichess 퍼즐 데이터베이스(CC0)에서 가져와요.
      </p>
    </section>
  );
}
