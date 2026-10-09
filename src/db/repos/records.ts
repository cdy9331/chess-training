import { db as defaultDb, type ChessTrainingDb } from '../schema';

/** 개인 최고 기록 종류 */
export type RecordKey = 'coord:white' | 'coord:black' | 'rush:3' | 'rush:5';

export interface PersonalBest {
  score: number;
  at: number;
}

function isPersonalBest(value: unknown): value is PersonalBest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.score === 'number' && typeof v.at === 'number';
}

const kvKey = (key: RecordKey) => `best:${key}`;

export function createRecordsRepo(db: ChessTrainingDb = defaultDb) {
  return {
    async getBest(key: RecordKey): Promise<PersonalBest | null> {
      const value = (await db.kv.get(kvKey(key)))?.value;
      return isPersonalBest(value) ? value : null;
    },

    /** 기록을 내고, 최고 기록이면 저장한다. */
    async submit(
      key: RecordKey,
      score: number,
      now = Date.now(),
    ): Promise<{ best: PersonalBest; isNewBest: boolean }> {
      return db.transaction('rw', db.kv, async () => {
        const previous = await this.getBest(key);
        if (previous && previous.score >= score) return { best: previous, isNewBest: false };
        const best = { score, at: now };
        await db.kv.put({ key: kvKey(key), value: best });
        // 처음 기록이 0점이면 "신기록"이라 하지 않는다
        return { best, isNewBest: score > 0 };
      });
    },
  };
}

export const recordsRepo = createRecordsRepo();
