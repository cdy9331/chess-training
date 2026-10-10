import 'fake-indexeddb/auto';
import { START_FEN } from '../../core/chess';
import { createDb } from '../schema';
import { createBackupRepo, isBackupFile } from './backup';
import { createGamesRepo } from './games';
import { createLessonsRepo } from './lessons';
import { createSettingsRepo } from './settings';

let counter = 0;
const newDb = () => createDb(`backup-test-${++counter}`);

describe('backupRepo', () => {
  it('내보낸 기록을 다른 DB에 가져오면 같은 상태가 된다 (엔진 캐시는 제외)', async () => {
    const source = newDb();
    const gameId = await createGamesRepo(source).create({
      source: 'ai',
      startFen: START_FEN,
      playerColor: 'w',
      aiLevel: 2,
      practice: false,
    });
    await createLessonsRepo(source).complete('rook-mate', 100);
    await source.engineCache.put({
      key: 'x',
      createdAt: 0,
      value: { kind: 'draw' } as never,
    });

    const file = await createBackupRepo(source).exportAll(new Date(0));
    expect(file.schemaVersion).toBe(7);
    expect(file.tables).not.toHaveProperty('engineCache');
    // JSON으로 저장했다가 다시 읽는 과정을 흉내 낸다
    const parsed: unknown = JSON.parse(JSON.stringify(file));
    expect(isBackupFile(parsed)).toBe(true);
    if (!isBackupFile(parsed)) return;

    const target = newDb();
    await createLessonsRepo(target).complete('other', 1);
    const counts = await createBackupRepo(target).importAll(parsed);
    expect(counts.games).toBe(1);
    expect(await createGamesRepo(target).get(gameId)).toMatchObject({ aiLevel: 2 });
    expect([...(await createLessonsRepo(target).progressMap()).keys()]).toEqual(['rook-mate']);
  });

  it('잘못된 파일과 더 새 버전 백업은 거부한다', async () => {
    expect(isBackupFile({ app: 'other' })).toBe(false);
    expect(isBackupFile({ app: 'chess-training', schemaVersion: 7, tables: { games: 1 } })).toBe(
      false,
    );
    const repo = createBackupRepo(newDb());
    await expect(
      repo.importAll({
        app: 'chess-training',
        schemaVersion: 99,
        exportedAt: '',
        tables: {} as never,
      }),
    ).rejects.toThrow();
  });

  it('전체 초기화', async () => {
    const db = newDb();
    await createLessonsRepo(db).complete('rook-mate', 1);
    await createBackupRepo(db).resetAll();
    expect((await createLessonsRepo(db).progressMap()).size).toBe(0);
  });
});

describe('settingsRepo', () => {
  it('리뷰 깊이는 범위 안으로 저장되고 기본값이 있다', async () => {
    const repo = createSettingsRepo(newDb());
    expect(await repo.getReviewDepth()).toBe(14);
    await repo.setReviewDepth(50);
    expect(await repo.getReviewDepth()).toBe(20);
    expect(await repo.getDailyGoal()).toBe(10);
    await repo.setDailyGoal(20);
    await repo.setDailyGoal(7);
    expect(await repo.getDailyGoal()).toBe(20);
    expect(await repo.getMoveSound()).toBe(true);
    await repo.setMoveSound(false);
    expect(await repo.getMoveSound()).toBe(false);
  });
});
