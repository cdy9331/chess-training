import { seededRandom } from '../engine/strength';
import { allSquares, isLightSquare, nextSquare } from './coordinates';

describe('좌표 훈련', () => {
  it('64칸, 연속 중복 없음, 모든 칸이 나올 수 있다', () => {
    expect(allSquares()).toHaveLength(64);
    const random = seededRandom(7);
    const seen = new Set<string>();
    let prev: string | null = null;
    for (let i = 0; i < 2000; i++) {
      const sq = nextSquare(random, prev);
      expect(sq).not.toBe(prev);
      seen.add(sq);
      prev = sq;
    }
    expect(seen.size).toBe(64);
  });

  it('칸 색', () => {
    expect(isLightSquare('a1')).toBe(false);
    expect(isLightSquare('h1')).toBe(true);
    expect(isLightSquare('e4')).toBe(true);
    expect(isLightSquare('d4')).toBe(false);
  });
});
