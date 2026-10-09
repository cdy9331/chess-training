import 'fake-indexeddb/auto';
import { lineFromUcis, START_FEN } from '../../core/chess';
import { buildReview, type PositionEval } from '../../core/review';
import { createDb } from '../schema';
import { createEngineCache, createReviewsRepo } from './reviews';

let counter = 0;
const newDb = () => createDb(`reviews-test-${++counter}`);

const evalOf = (value: number): PositionEval => ({
  kind: 'score',
  score: { kind: 'cp', value },
  bestMoveUci: 'e2e4',
  pv: ['e2e4'],
  depth: 14,
});

describe('reviewsRepo', () => {
  it('리뷰를 저장하고 불러온다', async () => {
    const repo = createReviewsRepo(newDb());
    const line = lineFromUcis(START_FEN, ['e2e4']);
    const review = buildReview(line, [evalOf(20), evalOf(25)], 14);
    await repo.save(7, review);
    expect(await repo.get(7)).toEqual(review);
    expect(await repo.get(8)).toBeUndefined();
  });

  it('옛 형식의 리뷰는 없는 것으로 본다', async () => {
    const db = newDb();
    await db.reviews.put({ gameId: 1, createdAt: 0, review: { version: 0 } as never });
    expect(await createReviewsRepo(db).get(1)).toBeUndefined();
  });
});

describe('engineCache', () => {
  it('저장하고 불러온다', async () => {
    const cache = createEngineCache(newDb());
    await cache.set('k', evalOf(10));
    expect(await cache.get('k')).toEqual(evalOf(10));
    expect(await cache.get('없음')).toBeUndefined();
  });

  // 기록 2만 개를 넣는 테스트라 전체 테스트를 함께 돌리면 기본 제한(5초)을 넘길 수 있다
  it('한도를 넘으면 오래된 것부터 지운다', { timeout: 30_000 }, async () => {
    const db = newDb();
    const cache = createEngineCache(db);
    const records = Array.from({ length: 20_010 }, (_, i) => ({
      key: `k${i}`,
      createdAt: i,
      value: evalOf(i),
    }));
    await db.engineCache.bulkPut(records);
    await cache.prune();
    expect(await db.engineCache.count()).toBe(20_000);
    expect(await cache.get('k0')).toBeUndefined();
    expect(await cache.get('k20009')).toBeDefined();
  });
});
