import type { MistakeTag } from '../review';
import { recommendLesson } from './recommend';
import { dayKey } from './streak';

/** 하루 목표(학습 활동 횟수) 선택지와 기본값 */
export const DAILY_GOAL_OPTIONS = [5, 10, 20] as const;
export const DEFAULT_DAILY_GOAL = 10;

export interface TodayCounts {
  puzzles: number;
  games: number;
  lessons: number;
  openings: number;
  mistakes: number;
}

export function totalToday(counts: TodayCounts): number {
  return counts.puzzles + counts.games + counts.lessons + counts.openings + counts.mistakes;
}

/** 오늘(지역 시간) 일어난 활동 수 */
export function countToday(times: readonly number[], now: number): number {
  const today = dayKey(now);
  return times.filter((t) => dayKey(t) === today).length;
}

/** 오늘의 학습 카드: 지금 가장 하면 좋은 한 가지 */
export type TodayCard =
  | { kind: 'mistakes'; count: number }
  | { kind: 'openings'; count: number }
  | { kind: 'weakness'; tag: MistakeTag; lessonId: string }
  | { kind: 'lesson'; lessonId: string; resume: boolean }
  | { kind: 'puzzles' };

export interface TodayCardInput {
  mistakesDue: number;
  openingLinesDue: number;
  /** 가장 많이 나온 약점 (없으면 null) */
  topWeakness: MistakeTag | null;
  completedLessonIds: ReadonlySet<string>;
  lessonInProgress: string | null;
  /** 커리큘럼 순서상 아직 안 끝낸 첫 레슨 */
  nextLessonId: string | null;
}

/**
 * 우선순위: 복습 기한이 된 것(잊기 전에) → 약점 레슨 → 보던 레슨 → 다음 레슨 → 퍼즐.
 */
export function pickTodayCard(input: TodayCardInput): TodayCard {
  if (input.mistakesDue > 0) return { kind: 'mistakes', count: input.mistakesDue };
  if (input.openingLinesDue > 0) return { kind: 'openings', count: input.openingLinesDue };
  if (input.topWeakness) {
    const lessonId = recommendLesson(input.topWeakness, input.completedLessonIds);
    if (lessonId && !input.completedLessonIds.has(lessonId)) {
      return { kind: 'weakness', tag: input.topWeakness, lessonId };
    }
  }
  if (input.lessonInProgress)
    return { kind: 'lesson', lessonId: input.lessonInProgress, resume: true };
  if (input.nextLessonId) return { kind: 'lesson', lessonId: input.nextLessonId, resume: false };
  return { kind: 'puzzles' };
}
