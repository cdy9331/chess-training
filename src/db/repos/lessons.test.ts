import 'fake-indexeddb/auto';
import { createDb } from '../schema';
import { createLessonsRepo } from './lessons';

describe('lessonsRepo', () => {
  it('보던 단계를 기억하고, 완료 후 다시 보아도 완료 기록은 남는다', async () => {
    const repo = createLessonsRepo(createDb('lessons-test-1'));
    expect(await repo.get('rook-mate')).toBeUndefined();

    await repo.saveStep('rook-mate', 2, 100);
    expect(await repo.get('rook-mate')).toMatchObject({ stepIndex: 2, completedAt: undefined });

    await repo.complete('rook-mate', 200);
    await repo.saveStep('rook-mate', 1, 300);
    expect(await repo.get('rook-mate')).toMatchObject({ stepIndex: 1, completedAt: 200 });
    expect((await repo.progressMap()).size).toBe(1);
  });
});
