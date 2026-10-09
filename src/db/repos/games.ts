import type { GameOutcome } from '../../core/chess';
import { db as defaultDb, type ChessTrainingDb, type GameRecord } from '../schema';

export type NewGameInput = Pick<
  GameRecord,
  'source' | 'startFen' | 'playerColor' | 'aiLevel' | 'practice'
>;

const RESULTS = new Set(['1-0', '0-1', '1/2-1/2', '*']);

/** IndexedDB에서 읽은 값이 예상한 모양인지 확인한다 (이전 버전 데이터, 손상 대비). */
export function isGameRecord(value: unknown): value is GameRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    (v.status === 'playing' || v.status === 'finished') &&
    typeof v.startFen === 'string' &&
    Array.isArray(v.movesUci) &&
    v.movesUci.every((m) => typeof m === 'string') &&
    (v.playerColor === 'w' || v.playerColor === 'b') &&
    typeof v.aiLevel === 'number' &&
    typeof v.createdAt === 'number' &&
    typeof v.result === 'string' &&
    RESULTS.has(v.result)
  );
}

export function createGamesRepo(db: ChessTrainingDb = defaultDb) {
  return {
    async create(input: NewGameInput): Promise<number> {
      const now = Date.now();
      return db.games.add({
        ...input,
        status: 'playing',
        createdAt: now,
        updatedAt: now,
        movesUci: [],
        result: '*',
      });
    },

    async updateMoves(id: number, movesUci: readonly string[]): Promise<void> {
      await db.games.update(id, { movesUci: [...movesUci], updatedAt: Date.now() });
    },

    async finish(
      id: number,
      outcome: GameOutcome,
      movesUci: readonly string[],
      pgn: string,
    ): Promise<void> {
      await db.games.update(id, {
        status: 'finished',
        result: outcome.result,
        endReason: outcome.reason,
        movesUci: [...movesUci],
        pgn,
        updatedAt: Date.now(),
      });
    },

    async get(id: number): Promise<GameRecord | undefined> {
      const record: unknown = await db.games.get(id);
      return isGameRecord(record) ? record : undefined;
    },

    /** 최신 게임부터 */
    async list(filter: { status?: GameRecord['status'] } = {}): Promise<GameRecord[]> {
      const records: unknown[] = filter.status
        ? await db.games.where('status').equals(filter.status).toArray()
        : await db.games.toArray();
      return records.filter(isGameRecord).sort((a, b) => b.createdAt - a.createdAt);
    },

    /** 이어서 둘 수 있는 가장 최근의 진행 중 게임 */
    async findPlaying(): Promise<GameRecord | undefined> {
      return (await this.list({ status: 'playing' }))[0];
    },

    /** 대국과 그 리뷰를 함께 지운다. */
    async remove(id: number): Promise<void> {
      await db.transaction('rw', db.games, db.reviews, async () => {
        await db.games.delete(id);
        await db.reviews.delete(id);
      });
    },
  };
}

export type GamesRepo = ReturnType<typeof createGamesRepo>;

export const gamesRepo = createGamesRepo();
