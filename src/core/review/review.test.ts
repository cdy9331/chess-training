import { lineFromUcis, START_FEN } from '../chess';
import {
  buildReview,
  classifyByLoss,
  classifyMove,
  evalWhitePercent,
  gameAccuracy,
  keyMoments,
  moveAccuracy,
  terminalEval,
  type PositionEval,
} from '.';

const cp = (value: number, bestMoveUci: string | null = null): PositionEval => ({
  kind: 'score',
  score: { kind: 'cp', value },
  bestMoveUci,
  pv: bestMoveUci ? [bestMoveUci] : [],
  depth: 14,
});
const mate = (value: number, bestMoveUci: string | null = null): PositionEval => ({
  kind: 'score',
  score: { kind: 'mate', value },
  bestMoveUci,
  pv: bestMoveUci ? [bestMoveUci] : [],
  depth: 14,
});

describe('classifyByLoss', () => {
  it('경계값', () => {
    expect(classifyByLoss(0)).toBe('best');
    expect(classifyByLoss(0.99)).toBe('best');
    expect(classifyByLoss(1)).toBe('good');
    expect(classifyByLoss(4.99)).toBe('good');
    expect(classifyByLoss(5)).toBe('inaccuracy');
    expect(classifyByLoss(10)).toBe('mistake');
    expect(classifyByLoss(19.99)).toBe('mistake');
    expect(classifyByLoss(20)).toBe('blunder');
  });
});

describe('classifyMove', () => {
  it('엔진 1순위 수는 손실이 조금 있어도 최선', () => {
    const r = classifyMove(cp(50, 'e2e4'), cp(-20), 'w', 'e2e4');
    expect(r.classification).toBe('best');
  });

  it('퀸을 공짜로 주면 블런더', () => {
    const r = classifyMove(cp(30, 'g1f3'), cp(-900), 'w', 'd1h5');
    expect(r.classification).toBe('blunder');
    expect(r.loss).toBeGreaterThan(40);
  });

  it('흑의 수는 흑 관점으로 평가한다', () => {
    // 백 관점 -50 → +300 : 흑이 크게 손해
    const r = classifyMove(cp(-50, 'e7e5'), cp(300), 'b', 'f7f6');
    expect(r.classification).toBe('blunder');
    // 백 관점 -50 → -60 : 흑에게 오히려 이득 → 손실 0
    expect(classifyMove(cp(-50, 'e7e5'), cp(-60), 'b', 'd7d5').loss).toBe(0);
  });

  it('메이트를 허용하면 블런더', () => {
    const r = classifyMove(cp(0, 'g1f3'), mate(-2), 'w', 'f2f3');
    expect(r.allowedMate).toBe(true);
    expect(r.classification).toBe('blunder');
  });

  it('이미 크게 지고 있던 국면에서는 메이트 허용을 따로 블런더로 보지 않는다', () => {
    const r = classifyMove(cp(-1500, 'a2a3'), mate(-3), 'w', 'h2h3');
    expect(r.allowedMate).toBe(false);
    expect(r.classification).not.toBe('blunder');
  });

  it('메이트를 놓쳤지만 여전히 크게 이기면 부정확', () => {
    const r = classifyMove(mate(2, 'd1h5'), cp(900), 'w', 'a2a3');
    expect(r.missedMate).toBe(true);
    expect(r.classification).toBe('inaccuracy');
  });

  it('메이트를 놓치고 승률도 크게 잃으면 그만큼 나쁘게', () => {
    const r = classifyMove(mate(1, 'd1h5'), cp(0), 'w', 'a2a3');
    expect(r.classification).toBe('blunder');
  });

  it('메이트로 끝낸 수는 최선', () => {
    const r = classifyMove(mate(1, 'd1f7'), { kind: 'mated', winner: 'w' }, 'w', 'd1f7');
    expect(r.classification).toBe('best');
    expect(r.loss).toBe(0);
  });
});

describe('positionEval', () => {
  it('끝난 국면은 규칙으로 평가한다', () => {
    expect(terminalEval('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).toEqual({
      kind: 'mated',
      winner: 'b',
    });
    expect(terminalEval('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toEqual({ kind: 'draw' });
    expect(terminalEval(START_FEN)).toBeNull();
    expect(evalWhitePercent({ kind: 'mated', winner: 'b' })).toBe(0);
  });
});

describe('accuracy', () => {
  it('손실이 없으면 100, 클수록 낮아진다', () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 0);
    expect(moveAccuracy(10)).toBeLessThan(moveAccuracy(5));
    expect(moveAccuracy(100)).toBe(0);
    expect(gameAccuracy([])).toBeNull();
    expect(gameAccuracy([0, 0])).toBeCloseTo(100, 0);
  });
});

describe('buildReview', () => {
  // 1. f3 e5 2. g4?? Qh4#
  const line = lineFromUcis(START_FEN, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  const evals: PositionEval[] = [
    cp(30, 'e2e4'),
    cp(-10, 'e7e5'), // 승률 약 3.7%p 손실 → 좋음
    cp(0, 'e2e4'),
    mate(-1, 'd8h4'),
    { kind: 'mated', winner: 'b' },
  ];
  const review = buildReview(line, evals, 14);

  it('수마다 등급과 최선 수를 기록한다', () => {
    expect(review.moves.map((m) => [m.san, m.classification])).toEqual([
      ['f3', 'good'],
      ['e5', 'best'],
      ['g4', 'blunder'],
      ['Qh4#', 'best'],
    ]);
    expect(review.moves[2]).toMatchObject({ bestMoveSan: 'e4', allowedMate: true, color: 'w' });
  });

  it('색별 정확도와 등급 개수', () => {
    expect(review.counts.w).toMatchObject({ good: 1, blunder: 1 });
    expect(review.counts.b.best).toBe(2);
    expect(review.accuracy.b).toBeGreaterThan(review.accuracy.w ?? 100);
  });

  it('핵심 순간은 실수와 블런더', () => {
    expect(keyMoments(review).map((m) => m.san)).toEqual(['g4']);
    expect(keyMoments(review, 'b')).toEqual([]);
  });
});
