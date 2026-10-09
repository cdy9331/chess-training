import { BEGINNER_THEMES } from '../puzzles/themes';
import { LESSONS } from '../../content/lessons';
import { WEAKNESS_INFO, recommendLesson, topWeaknesses } from './recommend';
import { computeStreak, dayKey } from './streak';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('연속 학습일', () => {
  it('오늘까지 이어진 날 수', () => {
    const times = [at(2026, 10, 8), at(2026, 10, 9, 9), at(2026, 10, 9, 22), at(2026, 10, 10)];
    expect(computeStreak(times, at(2026, 10, 10, 20))).toEqual({
      current: 3,
      longest: 3,
      activeToday: true,
      totalDays: 3,
    });
  });

  it('오늘 아직 안 했어도 어제까지 이어졌으면 유지, 이틀 비면 끊김', () => {
    const times = [at(2026, 10, 8), at(2026, 10, 9)];
    expect(computeStreak(times, at(2026, 10, 10)).current).toBe(2);
    expect(computeStreak(times, at(2026, 10, 11)).current).toBe(0);
  });

  it('가장 긴 기록과 월 경계', () => {
    const times = [
      at(2026, 9, 29),
      at(2026, 9, 30),
      at(2026, 10, 1),
      at(2026, 10, 2),
      at(2026, 10, 9),
    ];
    const s = computeStreak(times, at(2026, 10, 9));
    expect(s.longest).toBe(4);
    expect(s.current).toBe(1);
    expect(dayKey(at(2026, 1, 5))).toBe('2026-01-05');
  });
});

describe('약점 추천', () => {
  it('많이 나온 약점부터, 한 실수의 같은 태그는 한 번만 센다', () => {
    const weak = topWeaknesses([
      ['hangingPiece', 'materialLoss'],
      ['hangingPiece', 'hangingPiece'],
      ['allowedFork'],
      ['materialLoss'],
    ]);
    expect(weak).toEqual([
      { tag: 'hangingPiece', count: 2 },
      { tag: 'materialLoss', count: 2 },
      { tag: 'allowedFork', count: 1 },
    ]);
  });

  it('완료하지 않은 레슨을 추천하고, 추천 레슨은 모두 실제로 있다', () => {
    expect(recommendLesson('hangingPiece', new Set())).toBe('tactics-hanging-piece');
    expect(recommendLesson('hangingPiece', new Set(['tactics-hanging-piece']))).toBe(
      'middlegame-piece-values',
    );
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const info of Object.values(WEAKNESS_INFO)) {
      for (const id of info.lessonIds) expect(ids.has(id), id).toBe(true);
    }
  });
});

describe('추천 퍼즐 테마', () => {
  it('퍼즐 메뉴에서 고를 수 있는 테마만 쓴다', () => {
    const keys = new Set(BEGINNER_THEMES.map((t) => t.key));
    for (const info of Object.values(WEAKNESS_INFO)) {
      if (info.puzzleTheme) expect(keys.has(info.puzzleTheme), info.puzzleTheme).toBe(true);
    }
  });
});
