import {
  REVIEW_FORMAT_VERSION,
  type EvalCache,
  type GameReview,
  type PositionEval,
} from '../../core/review';
import { db as defaultDb, type ChessTrainingDb } from '../schema';

/** 저장된 리뷰가 지금 형식과 맞는지 확인한다. 옛 형식이면 다시 분석하도록 undefined 처리. */
export function isCurrentReview(value: unknown): value is GameReview {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === REVIEW_FORMAT_VERSION &&
    Array.isArray(v.moves) &&
    Array.isArray(v.evals) &&
    typeof v.depth === 'number' &&
    typeof v.counts === 'object' &&
    typeof v.accuracy === 'object'
  );
}

function isPositionEval(value: unknown): value is PositionEval {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === 'score' || kind === 'mated' || kind === 'draw';
}

export function createReviewsRepo(db: ChessTrainingDb = defaultDb) {
  return {
    async get(gameId: number): Promise<GameReview | undefined> {
      const record = await db.reviews.get(gameId);
      return isCurrentReview(record?.review) ? record.review : undefined;
    },

    async save(gameId: number, review: GameReview): Promise<void> {
      await db.reviews.put({ gameId, review, createdAt: Date.now() });
    },

    async remove(gameId: number): Promise<void> {
      await db.reviews.delete(gameId);
    },
  };
}

/** 캐시가 너무 커지지 않도록 이 개수를 넘으면 오래된 것부터 지운다. */
const ENGINE_CACHE_LIMIT = 20_000;
const PRUNE_EVERY = 500;

export function createEngineCache(db: ChessTrainingDb = defaultDb): EvalCache & {
  prune: () => Promise<void>;
} {
  let writes = 0;

  async function prune() {
    const count = await db.engineCache.count();
    if (count <= ENGINE_CACHE_LIMIT) return;
    const oldest = await db.engineCache
      .orderBy('createdAt')
      .limit(count - ENGINE_CACHE_LIMIT)
      .primaryKeys();
    await db.engineCache.bulkDelete(oldest);
  }

  return {
    async get(key) {
      const record = await db.engineCache.get(key);
      return isPositionEval(record?.value) ? record.value : undefined;
    },
    async set(key, value) {
      await db.engineCache.put({ key, value, createdAt: Date.now() });
      writes += 1;
      if (writes % PRUNE_EVERY === 0) await prune();
    },
    prune,
  };
}

export const reviewsRepo = createReviewsRepo();
export const engineCache = createEngineCache();
