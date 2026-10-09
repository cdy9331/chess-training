import { fenAt, lineFromUcis } from '../../core/chess';
import { explainMistake, type GameReview } from '../../core/review';
import { initialSrs, reviewSrs } from '../../core/srs/scheduler';
import {
  db as defaultDb,
  type ChessTrainingDb,
  type GameRecord,
  type MistakeRecord,
} from '../schema';

function isMistake(value: unknown): value is MistakeRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.fen === 'string' &&
    typeof v.bestUci === 'string' &&
    typeof v.due === 'number' &&
    typeof v.box === 'number' &&
    Array.isArray(v.tags) &&
    typeof v.evalBefore === 'object'
  );
}

/** 리뷰 결과에서 "내" 실수·블런더만 복습 문제로 만든다. */
export function mistakesFromReview(
  game: GameRecord,
  review: GameReview,
  now: number,
): MistakeRecord[] {
  const line = lineFromUcis(game.startFen, game.movesUci);
  const result: MistakeRecord[] = [];
  for (const move of review.moves) {
    if (move.color !== game.playerColor) continue;
    if (move.classification !== 'mistake' && move.classification !== 'blunder') continue;
    const before = review.evals[move.ply - 1];
    const after = review.evals[move.ply];
    if (!before || !after || !move.bestMoveUci || !move.bestMoveSan) continue;
    const fen = fenAt(line, move.ply - 1);
    const explanation = explainMistake({
      fenBefore: fen,
      playedUci: move.uci,
      mover: move.color,
      before,
      after,
      plyIndex: move.ply - 1,
    });
    result.push({
      id: `${game.id}:${move.ply}`,
      gameId: game.id,
      ply: move.ply,
      fen,
      playedUci: move.uci,
      playedSan: move.san,
      bestUci: move.bestMoveUci,
      bestSan: move.bestMoveSan,
      classification: move.classification,
      evalBefore: before,
      reasons: explanation.reasons,
      tags: explanation.tags,
      createdAt: now,
      ...initialSrs(now),
    });
  }
  return result;
}

export function createMistakesRepo(db: ChessTrainingDb = defaultDb) {
  return {
    /** 리뷰에서 나온 실수를 저장한다. 이미 있는 실수(복습 기록)는 그대로 둔다. */
    async saveFromReview(game: GameRecord, review: GameReview, now = Date.now()): Promise<number> {
      const candidates = mistakesFromReview(game, review, now);
      const existing = new Set(
        (await db.mistakes.where('gameId').equals(game.id).primaryKeys()).map(String),
      );
      const fresh = candidates.filter((m) => !existing.has(m.id));
      if (fresh.length > 0) await db.mistakes.bulkAdd(fresh);
      return fresh.length;
    },

    async list(): Promise<MistakeRecord[]> {
      const records: unknown[] = await db.mistakes.orderBy('createdAt').reverse().toArray();
      return records.filter(isMistake);
    },

    /** 지금 복습할 차례인 실수 (오래 기다린 것부터) */
    async due(now = Date.now()): Promise<MistakeRecord[]> {
      const records: unknown[] = await db.mistakes.where('due').belowOrEqual(now).sortBy('due');
      return records.filter(isMistake);
    },

    async recordReview(
      id: string,
      correct: boolean,
      now = Date.now(),
    ): Promise<MistakeRecord | undefined> {
      const record: unknown = await db.mistakes.get(id);
      if (!isMistake(record)) return undefined;
      const next = { ...record, ...reviewSrs(record, correct, now), lastReviewedAt: now };
      await db.mistakes.put(next);
      return next;
    },

    async remove(id: string): Promise<void> {
      await db.mistakes.delete(id);
    },
  };
}

export const mistakesRepo = createMistakesRepo();
