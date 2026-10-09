import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { resultFor } from '../../core/chess';
import { computeStreak, type StreakInfo } from '../../core/training/streak';
import { WEAKNESS_INFO, recommendLesson, topWeaknesses } from '../../core/training/recommend';
import { findLesson, LESSONS } from '../../content/lessons';
import { dashboardRepo, type DashboardData } from '../../db/repos/dashboard';
import { settingsRepo } from '../../db/repos/settings';
import styles from './Dashboard.module.css';
import { RatingChart } from './RatingChart';
import { TodayPanel } from './TodayPanel';

interface Loaded {
  data: DashboardData;
  streak: StreakInfo;
  goal: number;
}

const RESULT_LABEL = { win: '승', loss: '패', draw: '무', ongoing: '-' } as const;

export function DashboardPage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    Promise.all([dashboardRepo.load(now), settingsRepo.getDailyGoal()])
      .then(([data, goal]) => {
        if (!cancelled) setLoaded({ data, goal, streak: computeStreak(data.activityTimes, now) });
      })
      .catch(() => !cancelled && setError('학습 기록을 불러오지 못했어요.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p>{error}</p>;
  if (!loaded) return null;
  const { data, streak, goal } = loaded;

  function changeGoal(next: number) {
    setLoaded((l) => (l ? { ...l, goal: next } : l));
    void settingsRepo.setDailyGoal(next);
  }

  const lessonInProgress = data.lessonInProgress ? findLesson(data.lessonInProgress) : undefined;
  const nextLesson = LESSONS.find((l) => !data.completedLessonIds.has(l.id));
  const weaknesses = topWeaknesses(data.mistakeTags);
  const reviewed = data.recentGames.filter((g) => g.accuracy !== null);
  const avgAccuracy =
    reviewed.length > 0
      ? reviewed.reduce((sum, g) => sum + (g.accuracy ?? 0), 0) / reviewed.length
      : null;
  const isNewUser = streak.totalDays === 0 && data.mistakesTotal === 0;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>체스 트레이닝</h1>
          <p className={styles.muted}>
            {isNewUser
              ? '대국하고, 복기하고, 약점을 훈련하며 실력을 키워봐요.'
              : streak.activeToday
                ? '오늘도 공부했어요. 멋져요!'
                : '오늘의 훈련을 시작해 볼까요?'}
          </p>
        </div>
        <div className={styles.streak} aria-label="연속 학습일">
          <span className={styles.streakNumber}>🔥 {streak.current}일</span>
          <span className={styles.small}>
            연속 학습 · 최고 {streak.longest}일 · 총 {streak.totalDays}일
          </span>
        </div>
      </header>

      <TodayPanel data={data} goal={goal} onChangeGoal={changeGoal} />

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>할 수 있는 것</h2>
        <ul className={styles.todo}>
          {data.mistakesDue > 0 && (
            <li>
              <Link to="/mistakes" className={styles.todoLink}>
                <span>🔁 복습할 실수 {data.mistakesDue}개</span>
                <span className={styles.small}>게임에서 실수한 국면을 다시 풀어요</span>
              </Link>
            </li>
          )}
          {data.openingLinesDue > 0 && (
            <li>
              <Link to="/openings" className={styles.todoLink}>
                <span>📖 복습할 오프닝 {data.openingLinesDue}개</span>
                <span className={styles.small}>외워서 두기로 기억을 다져요</span>
              </Link>
            </li>
          )}
          {(lessonInProgress ?? nextLesson) && (
            <li>
              <Link
                to={`/lessons/${(lessonInProgress ?? nextLesson)?.id}`}
                className={styles.todoLink}
              >
                <span>
                  🎓 {lessonInProgress ? '이어서 보기' : '다음 레슨'}:{' '}
                  {(lessonInProgress ?? nextLesson)?.title}
                </span>
                <span className={styles.small}>
                  레슨 {data.completedLessonIds.size} / {LESSONS.length} 완료
                </span>
              </Link>
            </li>
          )}
          <li>
            <Link to="/puzzles" className={styles.todoLink}>
              <span>🧩 퍼즐 풀기</span>
              <span className={styles.small}>내 레이팅({data.puzzleRating})에 맞는 문제</span>
            </Link>
          </li>
          <li>
            <Link to="/play" className={styles.todoLink}>
              <span>♟ AI와 한 판 두고 리뷰하기</span>
              <span className={styles.small}>리뷰에서 나온 실수가 복습 문제가 돼요</span>
            </Link>
          </li>
        </ul>
        {data.mistakesDue === 0 && data.mistakesTotal > 0 && (
          <p className={styles.small}>
            ✓ 오늘 복습할 실수는 모두 끝냈어요. (
            <Link to="/mistakes">실수 {data.mistakesTotal}개 보기</Link>)
          </p>
        )}
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>퍼즐 레이팅</h2>
          <p className={styles.bigNumber}>{data.puzzleRating}</p>
          <RatingChart ratings={data.puzzleRatings} />
          {data.puzzlesTried > 0 && (
            <p className={styles.small}>
              {data.puzzlesTried}문제 중 {data.puzzlesSolved}문제 성공 (
              {Math.round((data.puzzlesSolved / data.puzzlesTried) * 100)}%)
            </p>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>최근 대국 정확도</h2>
          {data.recentGames.length === 0 ? (
            <p className={styles.small}>
              아직 끝낸 대국이 없어요. <Link to="/play">AI와 대국</Link>해 보세요.
            </p>
          ) : (
            <>
              {avgAccuracy !== null && (
                <p className={styles.bigNumber}>
                  {avgAccuracy.toFixed(1)}
                  <span className={styles.unit}>% 평균</span>
                </p>
              )}
              <ul className={styles.games}>
                {data.recentGames.map((g) => {
                  const result = resultFor(g.result, g.playerColor);
                  return (
                    <li key={g.gameId}>
                      <Link to={`/review/${g.gameId}`} className={styles.gameRow}>
                        <span className={styles[result]}>{RESULT_LABEL[result]}</span>
                        <span className={styles.accuracyBar}>
                          <span style={{ width: `${g.accuracy ?? 0}%` }} />
                        </span>
                        <span className={styles.small}>
                          {g.accuracy === null ? '리뷰 전' : `${g.accuracy.toFixed(1)}%`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>진도</h2>
          <div className={styles.progressRow}>
            <span>레슨</span>
            <progress value={data.completedLessonIds.size} max={LESSONS.length} />
            <span className={styles.small}>
              {data.completedLessonIds.size} / {LESSONS.length}
            </span>
          </div>
          <p className={styles.small}>
            연습한 오프닝 라인 {data.openingLinesPracticed}개 · 모은 실수 {data.mistakesTotal}개
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>내 약점과 추천 훈련</h2>
        {weaknesses.length === 0 ? (
          <p className={styles.small}>
            게임을 리뷰하면 자주 하는 실수의 종류를 분석해서 맞는 레슨과 퍼즐을 추천해 드려요.
          </p>
        ) : (
          <ul className={styles.weakList}>
            {weaknesses.map(({ tag, count }) => {
              const info = WEAKNESS_INFO[tag];
              const lessonId = recommendLesson(tag, data.completedLessonIds);
              const lesson = lessonId ? findLesson(lessonId) : undefined;
              return (
                <li key={tag} className={styles.weakItem}>
                  <strong>
                    {info.name} <span className={styles.small}>· 실수 {count}번</span>
                  </strong>
                  <span className={styles.small}>{info.advice}</span>
                  <span className={styles.links}>
                    {lesson && <Link to={`/lessons/${lesson.id}`}>🎓 {lesson.title}</Link>}
                    {info.puzzleTheme && (
                      <Link to={`/puzzles?theme=${info.puzzleTheme}`}>🧩 관련 퍼즐 풀기</Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
