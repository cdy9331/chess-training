import { db as defaultDb, type ChessTrainingDb } from '../schema';

/**
 * 학습 기록 백업. 엔진 분석 캐시(engineCache)는 다시 만들 수 있고 커서 제외한다.
 * 새 테이블을 추가하면 여기에도 넣어야 백업된다.
 */
export const BACKUP_TABLES = [
  'games',
  'reviews',
  'puzzleAttempts',
  'kv',
  'openingProgress',
  'customLines',
  'lessonProgress',
  'mistakes',
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupFile {
  app: 'chess-training';
  /** 백업을 만든 DB 스키마 버전 */
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTable, unknown[]>;
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.app !== 'chess-training' || typeof v.schemaVersion !== 'number') return false;
  if (typeof v.tables !== 'object' || v.tables === null) return false;
  const tables = v.tables as Record<string, unknown>;
  // 예전 백업에는 나중에 생긴 테이블이 없을 수 있다 → 있는 것만 배열이면 된다
  return BACKUP_TABLES.every((t) => tables[t] === undefined || Array.isArray(tables[t]));
}

export function createBackupRepo(db: ChessTrainingDb = defaultDb) {
  return {
    async exportAll(now = new Date()): Promise<BackupFile> {
      const entries = await Promise.all(
        BACKUP_TABLES.map(async (t) => [t, await db.table(t).toArray()] as const),
      );
      return {
        app: 'chess-training',
        schemaVersion: db.verno,
        exportedAt: now.toISOString(),
        tables: Object.fromEntries(entries) as Record<BackupTable, unknown[]>,
      };
    },

    /** 지금 기록을 모두 지우고 백업 내용으로 바꾼다. */
    async importAll(file: BackupFile): Promise<Record<BackupTable, number>> {
      if (file.schemaVersion > db.verno) {
        throw new Error('더 새 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 가져오세요.');
      }
      const counts = {} as Record<BackupTable, number>;
      await db.transaction('rw', [...BACKUP_TABLES, 'engineCache'], async () => {
        for (const t of BACKUP_TABLES) {
          const rows = file.tables[t] ?? [];
          await db.table(t).clear();
          if (rows.length > 0) await db.table(t).bulkPut(rows);
          counts[t] = rows.length;
        }
      });
      return counts;
    },

    /** 모든 학습 기록 삭제 (엔진 캐시 포함) */
    async resetAll(): Promise<void> {
      await db.transaction('rw', [...BACKUP_TABLES, 'engineCache'], async () => {
        for (const t of [...BACKUP_TABLES, 'engineCache']) await db.table(t).clear();
      });
    },
  };
}

export const backupRepo = createBackupRepo();
