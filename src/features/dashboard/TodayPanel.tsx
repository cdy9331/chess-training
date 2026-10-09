import { Link } from 'react-router';
import {
  DAILY_GOAL_OPTIONS,
  pickTodayCard,
  totalToday,
  type TodayCard,
} from '../../core/training/daily';
import { WEAKNESS_INFO, topWeaknesses } from '../../core/training/recommend';
import { findLesson, LESSONS } from '../../content/lessons';
import type { DashboardData } from '../../db/repos/dashboard';
import styles from './Dashboard.module.css';

interface CardView {
  to: string;
  icon: string;
  title: string;
  detail: string;
  action: string;
}

function describeCard(card: TodayCard): CardView {
  switch (card.kind) {
    case 'mistakes':
      return {
        to: '/mistakes',
        icon: '🔁',
        title: `내 실수 ${card.count}개 복습하기`,
        detail: '게임에서 틀렸던 국면을 잊기 전에 다시 풀어요.',
        action: '복습 시작',
      };
    case 'openings':
      return {
        to: '/openings',
        icon: '📖',
        title: `오프닝 ${card.count}개 복습하기`,
        detail: '외워 둔 수순을 힌트 없이 다시 둬 봐요.',
        action: '오프닝으로',
      };
    case 'weakness': {
      const lesson = findLesson(card.lessonId);
      return {
        to: `/lessons/${card.lessonId}`,
        icon: '🎯',
        title: `약점 훈련: ${lesson?.title ?? '레슨'}`,
        detail: `최근 게임에서 "${WEAKNESS_INFO[card.tag].name}" 실수가 가장 많았어요.`,
        action: '레슨 보기',
      };
    }
    case 'lesson': {
      const lesson = findLesson(card.lessonId);
      return {
        to: `/lessons/${card.lessonId}`,
        icon: '🎓',
        title: `${card.resume ? '이어서' : '다음 레슨'}: ${lesson?.title ?? '레슨'}`,
        detail: lesson?.summary ?? '',
        action: card.resume ? '이어서 보기' : '시작하기',
      };
    }
    case 'puzzles':
      return {
        to: '/puzzles',
        icon: '🧩',
        title: '퍼즐 풀기',
        detail: '내 레이팅에 맞는 전술 문제로 감각을 길러요.',
        action: '퍼즐로',
      };
  }
}

interface TodayPanelProps {
  data: DashboardData;
  goal: number;
  onChangeGoal: (goal: number) => void;
}

/** 오늘의 학습 카드(지금 할 한 가지)와 일일 목표 진행도 */
export function TodayPanel({ data, goal, onChangeGoal }: TodayPanelProps) {
  const card = describeCard(
    pickTodayCard({
      mistakesDue: data.mistakesDue,
      openingLinesDue: data.openingLinesDue,
      topWeakness: topWeaknesses(data.mistakeTags, 1)[0]?.tag ?? null,
      completedLessonIds: data.completedLessonIds,
      lessonInProgress: data.lessonInProgress,
      nextLessonId: LESSONS.find((l) => !data.completedLessonIds.has(l.id))?.id ?? null,
    }),
  );
  const done = totalToday(data.todayCounts);
  const c = data.todayCounts;
  const parts = [
    c.puzzles > 0 && `퍼즐 ${c.puzzles}`,
    c.games > 0 && `대국 ${c.games}`,
    c.lessons > 0 && `레슨 ${c.lessons}`,
    c.openings > 0 && `오프닝 ${c.openings}`,
    c.mistakes > 0 && `실수 복습 ${c.mistakes}`,
  ].filter(Boolean);

  return (
    <div className={styles.todayGrid}>
      <Link to={card.to} className={styles.todayCard}>
        <span className={styles.small}>오늘의 학습</span>
        <span className={styles.todayTitle}>
          {card.icon} {card.title}
        </span>
        <span className={styles.small}>{card.detail}</span>
        <span className={styles.todayAction}>{card.action} →</span>
      </Link>

      <div className={styles.card}>
        <div className={styles.goalHeader}>
          <h2 className={styles.cardTitle}>오늘의 목표</h2>
          <select
            aria-label="하루 목표"
            value={goal}
            onChange={(e) => onChangeGoal(Number(e.target.value))}
          >
            {DAILY_GOAL_OPTIONS.map((o) => (
              <option key={o} value={o}>
                하루 {o}개
              </option>
            ))}
          </select>
        </div>
        <p className={styles.bigNumber}>
          {Math.min(done, goal)}
          <span className={styles.unit}>/ {goal}</span>
          {done >= goal && <span className={styles.goalDone}> 🎉 달성!</span>}
        </p>
        <progress className={styles.goalBar} value={Math.min(done, goal)} max={goal} />
        <p className={styles.small}>
          {parts.length > 0
            ? `오늘 한 것: ${parts.join(' · ')}`
            : '퍼즐 1개, 대국 1판, 레슨 완료, 오프닝·실수 복습 1개가 각각 1로 세어져요.'}
        </p>
      </div>
    </div>
  );
}
