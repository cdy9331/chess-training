import type { RepertoireLine } from '../../core/openings';
import { initialSrs, reviewSrs, type SrsState } from '../../core/srs/scheduler';
import {
  db as defaultDb,
  type ChessTrainingDb,
  type CustomLineRecord,
  type OpeningProgressRecord,
} from '../schema';

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

function isCustomLine(value: unknown): value is CustomLineRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.side === 'w' || v.side === 'b') &&
    Array.isArray(v.movesSan) &&
    v.movesSan.every((m) => typeof m === 'string') &&
    typeof v.createdAt === 'number'
  );
}

export function customLineToRepertoire(record: CustomLineRecord): RepertoireLine {
  return {
    id: record.id,
    side: record.side,
    name: record.name,
    summary: '오프닝 탐색기에서 직접 저장한 수순이에요.',
    moves: record.movesSan.map((san) => ({ san })),
  };
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

    /** 내가 저장한 라인 (오래된 것부터) */
    async listCustomLines(): Promise<CustomLineRecord[]> {
      const records: unknown[] = await db.customLines.orderBy('createdAt').toArray();
      return records.filter(isCustomLine);
    },

    /** 같은 색·같은 수순이면 같은 ID라서 다시 저장해도 하나만 남는다. */
    async saveCustomLine(
      line: Omit<CustomLineRecord, 'id' | 'createdAt'>,
      now = Date.now(),
    ): Promise<CustomLineRecord> {
      const id = `custom:${line.side}:${line.movesSan.join(' ')}`;
      const existing = await db.customLines.get(id);
      const record: CustomLineRecord = { ...line, id, createdAt: existing?.createdAt ?? now };
      await db.customLines.put(record);
      return record;
    },

    /** 라인과 그 복습 기록을 함께 지운다. */
    async removeCustomLine(id: string): Promise<void> {
      await db.transaction('rw', db.customLines, db.openingProgress, async () => {
        await db.customLines.delete(id);
        await db.openingProgress.delete(id);
      });
    },
  };
}

export const openingsRepo = createOpeningsRepo();
