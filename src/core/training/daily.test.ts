import { countToday, pickTodayCard, totalToday, type TodayCardInput } from './daily';

const at = (d: number, h = 12) => new Date(2026, 9, d, h).getTime();

const BASE: TodayCardInput = {
  mistakesDue: 0,
  openingLinesDue: 0,
  topWeakness: null,
  completedLessonIds: new Set(),
  lessonInProgress: null,
  nextLessonId: null,
};

describe('일일 목표', () => {
  it('오늘 활동만 센다', () => {
    expect(countToday([at(9, 23), at(10, 0), at(10, 22), at(11, 1)], at(10, 15))).toBe(2);
    expect(totalToday({ puzzles: 3, games: 1, lessons: 1, openings: 2, mistakes: 0 })).toBe(7);
  });
});

describe('오늘의 학습 카드', () => {
  it('복습 기한이 된 것이 가장 먼저', () => {
    expect(pickTodayCard({ ...BASE, mistakesDue: 2, openingLinesDue: 1 })).toEqual({
      kind: 'mistakes',
      count: 2,
    });
    expect(pickTodayCard({ ...BASE, openingLinesDue: 1 }).kind).toBe('openings');
  });

  it('약점 레슨 → 보던 레슨 → 다음 레슨 → 퍼즐', () => {
    const weak = { ...BASE, topWeakness: 'allowedFork' as const, lessonInProgress: 'x' };
    expect(pickTodayCard(weak)).toEqual({
      kind: 'weakness',
      tag: 'allowedFork',
      lessonId: 'tactics-fork',
    });
    // 약점 레슨을 이미 끝냈으면 보던 레슨
    expect(pickTodayCard({ ...weak, completedLessonIds: new Set(['tactics-fork']) })).toEqual({
      kind: 'lesson',
      lessonId: 'x',
      resume: true,
    });
    expect(pickTodayCard({ ...BASE, nextLessonId: 'y' })).toEqual({
      kind: 'lesson',
      lessonId: 'y',
      resume: false,
    });
    expect(pickTodayCard(BASE)).toEqual({ kind: 'puzzles' });
  });
});
