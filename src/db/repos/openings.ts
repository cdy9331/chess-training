import { initialSrs, reviewSrs, type SrsState } from '../../core/srs/scheduler';
import { db as defaultDb, type ChessTrainingDb, type OpeningProgressRecord } from '../schema';

function isProgress(value: unknown): value is OpeningProgressRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lineId === 'string' &&
    typeof v.box === 'number' &&
    typeof v.due === 'number' &&
    typeof v.reps === 'number'
  );
}

export function createOpeningsRepo(db: ChessTrainingDb = defaultDb) {
  return {
    /** 연습해 본 라인들의 복습 상태 (lineId → 상태) */
    async progressMap(): Promise<Map<string, OpeningProgressRecord>> {
      const records: unknown[] = await db.openingProgress.toArray();
      return new Map(records.filter(isProgress).map((r) => [r.lineId, r]));
    },

    /** 드릴 결과를 기록하고 다음 복습일을 정한다. */
    async recordDrill(lineId: string, correct: boolean, now = Date.now()): Promise<SrsState> {
      const existing = await db.openingProgress.get(lineId);
      const prev = isProgress(existing) ? existing : initialSrs(now);
      const next = reviewSrs(prev, correct, now);
      await db.openingProgress.put({ lineId, ...next, lastReviewedAt: now });
      return next;
    },
  };
}

export const openingsRepo = createOpeningsRepo();
