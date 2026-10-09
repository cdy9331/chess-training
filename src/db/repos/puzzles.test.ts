import 'fake-indexeddb/auto';
import { INITIAL_PUZZLE_RATING } from '../../core/puzzles';
import { createDb } from '../schema';
import { createPuzzlesRepo, type NewPuzzleAttempt } from './puzzles';

let counter = 0;
const repo = () => createPuzzlesRepo(createDb(`puzzles-test-${++counter}`));

const attempt = (puzzleId: string, at: number): NewPuzzleAttempt => ({
  puzzleId,
  at,
  solved: true,
  puzzleRating: 900,
  themes: ['fork'],
  ratingBefore: 1000,
  ratingAfter: 1050,
  durationMs: 12_000,
  usedHelp: false,
});

describe('puzzlesRepo', () => {
  it('처음엔 기본 레이팅', async () => {
    expect(await repo().getRating()).toEqual(INITIAL_PUZZLE_RATING);
  });

  it('풀이 기록과 레이팅을 함께 저장한다', async () => {
    const r = repo();
    const next = { rating: 1050, rd: 250, volatility: 0.06 };
    await r.recordAttempt(attempt('a', 1), next);
    expect(await r.getRating()).toEqual(next);
    expect((await r.listAttempts()).map((a) => a.puzzleId)).toEqual(['a']);
  });

  it('최근 퍼즐 ID는 최신순으로 개수 제한', async () => {
    const r = repo();
    const rating = { rating: 1000, rd: 200, volatility: 0.06 };
    for (const [id, at] of [
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ] as const) {
      await r.recordAttempt(attempt(id, at), rating);
    }
    expect([...(await r.recentPuzzleIds(2))]).toEqual(['c', 'b']);
  });
});
