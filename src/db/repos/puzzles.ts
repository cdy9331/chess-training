import { INITIAL_PUZZLE_RATING, isGlicko, type Glicko } from '../../core/puzzles';
import { db as defaultDb, type ChessTrainingDb, type PuzzleAttemptRecord } from '../schema';

const RATING_KEY = 'puzzleRating';
/** 최근에 푼 퍼즐은 이 개수만큼 다시 나오지 않게 한다 */
const RECENT_LIMIT = 300;

export type NewPuzzleAttempt = Omit<PuzzleAttemptRecord, 'id'>;

export function createPuzzlesRepo(db: ChessTrainingDb = defaultDb) {
  return {
    async getRating(): Promise<Glicko> {
      const record = await db.kv.get(RATING_KEY);
      return isGlicko(record?.value) ? record.value : INITIAL_PUZZLE_RATING;
    },

    /** 풀이 기록과 새 레이팅을 함께 저장한다 (둘 중 하나만 저장되는 일이 없게). */
    async recordAttempt(attempt: NewPuzzleAttempt, newRating: Glicko): Promise<void> {
      await db.transaction('rw', db.puzzleAttempts, db.kv, async () => {
        await db.puzzleAttempts.add(attempt);
        await db.kv.put({ key: RATING_KEY, value: newRating });
      });
    },

    async recentPuzzleIds(limit = RECENT_LIMIT): Promise<Set<string>> {
      const recent = await db.puzzleAttempts.orderBy('at').reverse().limit(limit).toArray();
      return new Set(recent.map((a) => a.puzzleId));
    },

    /** 오래된 것부터 */
    async listAttempts(): Promise<PuzzleAttemptRecord[]> {
      return db.puzzleAttempts.orderBy('at').toArray();
    },
  };
}

export type PuzzlesRepo = ReturnType<typeof createPuzzlesRepo>;
export const puzzlesRepo = createPuzzlesRepo();
