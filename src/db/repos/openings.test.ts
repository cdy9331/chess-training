import 'fake-indexeddb/auto';
import { createDb } from '../schema';
import { createOpeningsRepo } from './openings';

const DAY = 24 * 60 * 60 * 1000;

describe('openingsRepo', () => {
  it('드릴 결과로 복습일을 정하고, 틀리면 다음 날 다시 나온다', async () => {
    const repo = createOpeningsRepo(createDb('openings-test-1'));
    const now = 10 * DAY;
    expect((await repo.progressMap()).size).toBe(0);

    await repo.recordDrill('italian', true, now);
    expect((await repo.progressMap()).get('italian')).toMatchObject({ box: 1, due: now + 2 * DAY });

    await repo.recordDrill('italian', false, now + 3 * DAY);
    expect((await repo.progressMap()).get('italian')).toMatchObject({
      box: 0,
      due: now + 4 * DAY,
      lapses: 1,
    });
  });
});
