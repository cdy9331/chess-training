import 'fake-indexeddb/auto';
import { createDb } from '../schema';
import { createOpeningsRepo, customLineToRepertoire } from './openings';

const DAY = 24 * 60 * 60 * 1000;

describe('내가 만든 라인', () => {
  it('저장·목록·삭제, 같은 수순은 하나만 남고 삭제하면 복습 기록도 지운다', async () => {
    const repo = createOpeningsRepo(createDb('openings-test-2'));
    const line = { name: '이탈리안 게임', side: 'w' as const, movesSan: ['e4', 'e5', 'Nf3'] };
    const saved = await repo.saveCustomLine(line, 1);
    await repo.saveCustomLine(line, 2);
    expect((await repo.listCustomLines()).map((l) => l.id)).toEqual([saved.id]);
    expect(customLineToRepertoire(saved).moves).toEqual([
      { san: 'e4' },
      { san: 'e5' },
      { san: 'Nf3' },
    ]);

    await repo.recordDrill(saved.id, true, 10);
    await repo.removeCustomLine(saved.id);
    expect(await repo.listCustomLines()).toEqual([]);
    expect((await repo.progressMap()).has(saved.id)).toBe(false);
  });
});

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
