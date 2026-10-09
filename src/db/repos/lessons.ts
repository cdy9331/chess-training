import { db as defaultDb, type ChessTrainingDb, type LessonProgressRecord } from '../schema';

function isProgress(value: unknown): value is LessonProgressRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lessonId === 'string' &&
    typeof v.stepIndex === 'number' &&
    typeof v.updatedAt === 'number' &&
    (v.completedAt === undefined || typeof v.completedAt === 'number')
  );
}

export function createLessonsRepo(db: ChessTrainingDb = defaultDb) {
  return {
    async progressMap(): Promise<Map<string, LessonProgressRecord>> {
      const records: unknown[] = await db.lessonProgress.toArray();
      return new Map(records.filter(isProgress).map((r) => [r.lessonId, r]));
    },

    async get(lessonId: string): Promise<LessonProgressRecord | undefined> {
      const record: unknown = await db.lessonProgress.get(lessonId);
      return isProgress(record) ? record : undefined;
    },

    /** 지금 보고 있는 단계를 기억한다 (완료 기록은 유지). */
    async saveStep(lessonId: string, stepIndex: number, now = Date.now()): Promise<void> {
      const existing = await this.get(lessonId);
      await db.lessonProgress.put({
        lessonId,
        stepIndex,
        completedAt: existing?.completedAt,
        updatedAt: now,
      });
    },

    async complete(lessonId: string, now = Date.now()): Promise<void> {
      await db.lessonProgress.put({ lessonId, stepIndex: 0, completedAt: now, updatedAt: now });
    },
  };
}

export const lessonsRepo = createLessonsRepo();
