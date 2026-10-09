import {
  RUSH_DURATION_MS,
  recordRushPuzzle,
  rushEnded,
  rushRemainingMs,
  rushTargetRating,
  startRush,
} from './rush';

describe('퍼즐 러시', () => {
  it('풀수록 목표 레이팅이 오르고 상한이 있다', () => {
    expect(rushTargetRating(0)).toBe(500);
    expect(rushTargetRating(10)).toBeGreaterThan(rushTargetRating(5));
    expect(rushTargetRating(1000)).toBe(2400);
  });

  it('3번 틀리면 끝', () => {
    let s = startRush(3, 0);
    s = recordRushPuzzle(s, 'a', true);
    s = recordRushPuzzle(s, 'b', false);
    s = recordRushPuzzle(s, 'c', false);
    expect(rushEnded(s, 1000)).toBeNull();
    s = recordRushPuzzle(s, 'd', false);
    expect(s).toMatchObject({ solved: 1, misses: 3, seenIds: ['a', 'b', 'c', 'd'] });
    expect(rushEnded(s, 1000)).toBe('misses');
  });

  it('시간이 다 되면 끝', () => {
    const s = startRush(5, 100);
    expect(rushRemainingMs(s, 100)).toBe(RUSH_DURATION_MS[5]);
    expect(rushEnded(s, 100 + RUSH_DURATION_MS[5] - 1)).toBeNull();
    expect(rushEnded(s, 100 + RUSH_DURATION_MS[5])).toBe('time');
  });
});
