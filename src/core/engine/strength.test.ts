import type { AnalysisLine } from './EngineClient';
import { getLevel, LEVELS, pickMove, seededRandom, type MovePick } from './strength';

function line(multipv: number, uci: string, cp: number): AnalysisLine {
  return { multipv, depth: 8, score: { kind: 'cp', value: cp }, pv: [uci] };
}

// 백 차례: 1순위 동점 수 2개, 조금 나쁜 수, 퀸을 내주는 수
const LINES = [
  line(1, 'e2e4', 30),
  line(2, 'd2d4', 25),
  line(3, 'a2a3', -20),
  line(4, 'd1h5', -900),
];

function sample(pick: MovePick, mover: 'w' | 'b' = 'w', lines = LINES, n = 2000) {
  const random = seededRandom(42);
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const uci = pickMove(lines, mover, pick, random) ?? 'none';
    counts[uci] = (counts[uci] ?? 0) + 1;
  }
  return counts;
}

describe('난이도 표', () => {
  it('레벨 1~10이 순서대로 있다', () => {
    expect(LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(() => getLevel(11)).toThrow();
  });

  it('레벨이 오를수록 온도는 낮아지고 탐색은 깊어진다', () => {
    const weighted = LEVELS.filter((l) => l.pick.kind === 'weighted');
    const temps = weighted.map((l) => (l.pick.kind === 'weighted' ? l.pick.temperature : 0));
    const depths = weighted.map((l) => l.search.depth ?? 0);
    expect(temps).toEqual([...temps].sort((a, b) => b - a));
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
  });

  it('레벨 10만 제한 없는 최선의 수를 둔다', () => {
    expect(LEVELS.filter((l) => l.pick.kind === 'best').map((l) => l.level)).toEqual([10]);
  });
});

describe('pickMove', () => {
  it('best는 항상 1순위 수', () => {
    expect(sample({ kind: 'best' })).toEqual({ e2e4: 2000 });
  });

  it('후보가 없으면 null', () => {
    expect(pickMove([], 'w', { kind: 'best' }, Math.random)).toBeNull();
  });

  it('온도가 낮으면 거의 최선의 수만 둔다', () => {
    const counts = sample({ kind: 'weighted', temperature: 0.5, maxLoss: 100 });
    expect((counts.e2e4 ?? 0) + (counts.d2d4 ?? 0)).toBeGreaterThan(1990);
    expect(counts.d1h5).toBeUndefined();
  });

  it('온도가 높으면 나쁜 수도 가끔 둔다 (입문 레벨)', () => {
    const counts = sample(getLevel(1).pick);
    expect(counts.d1h5).toBeGreaterThan(50);
    expect(counts.d1h5).toBeLessThan(counts.e2e4 ?? 0);
  });

  it('maxLoss를 넘는 수는 절대 고르지 않는다', () => {
    // a2a3(-0.20)은 최선(+0.30)보다 승률이 약 4.6%p 낮다.
    const counts = sample({ kind: 'weighted', temperature: 1000, maxLoss: 3 });
    expect(counts.d1h5).toBeUndefined();
    expect(counts.a2a3).toBeUndefined();
    expect(counts.d2d4).toBeGreaterThan(0);
  });

  it('흑 차례면 흑에게 좋은 수(백 관점 점수가 낮은 수)를 선호한다', () => {
    const black = [line(1, 'e7e5', -40), line(2, 'f7f6', 400)];
    const counts = sample({ kind: 'weighted', temperature: 2, maxLoss: 100 }, 'b', black);
    expect(counts.e7e5).toBeGreaterThan(1990);
  });

  it('크게 이기고 있을 때도 메이트를 더 자주 고른다 (승률이 모두 ~100%여도)', () => {
    const winning: AnalysisLine[] = [
      { multipv: 1, depth: 8, score: { kind: 'mate', value: 1 }, pv: ['d1d8'] },
      line(2, 'h2h3', 1200),
      line(3, 'a2a3', 1150),
      line(4, 'b2b3', 1100),
    ];
    const counts = sample({ kind: 'weighted', temperature: 10, maxLoss: 100 }, 'w', winning);
    expect(counts.d1d8).toBeGreaterThan(1800);
  });

  it('1수 메이트를 +15점보다 높게 평가한다 (점수 상한 버그 회귀 방지)', () => {
    const lines: AnalysisLine[] = [
      line(1, 'h2h3', 1500),
      { multipv: 2, depth: 8, score: { kind: 'mate', value: 1 }, pv: ['d1d8'] },
    ];
    const counts = sample({ kind: 'weighted', temperature: 2, maxLoss: 100 }, 'w', lines);
    expect(counts.d1d8).toBeGreaterThan(1990);
  });

  it('시드가 같으면 같은 결과', () => {
    const pick = getLevel(2).pick;
    const run = () => {
      const random = seededRandom(7);
      return Array.from({ length: 20 }, () => pickMove(LINES, 'w', pick, random));
    };
    expect(run()).toEqual(run());
  });
});
