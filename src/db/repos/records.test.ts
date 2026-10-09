import 'fake-indexeddb/auto';
import { createDb } from '../schema';
import { createRecordsRepo } from './records';

describe('recordsRepo', () => {
  it('더 높은 점수만 최고 기록이 된다', async () => {
    const repo = createRecordsRepo(createDb('records-test-1'));
    expect(await repo.getBest('rush:3')).toBeNull();
    expect(await repo.submit('rush:3', 12, 1)).toEqual({
      best: { score: 12, at: 1 },
      isNewBest: true,
    });
    expect(await repo.submit('rush:3', 9, 2)).toEqual({
      best: { score: 12, at: 1 },
      isNewBest: false,
    });
    expect((await repo.submit('rush:3', 15, 3)).isNewBest).toBe(true);
    expect(await repo.getBest('rush:5')).toBeNull();
  });
});
