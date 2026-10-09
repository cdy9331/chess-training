import 'fake-indexeddb/auto';
import { START_FEN } from '../../core/chess';
import { createDb } from '../schema';
import { createGamesRepo, isGameRecord } from './games';

let dbCounter = 0;

function setup() {
  // 테스트마다 별도 DB를 써서 서로 영향을 주지 않게 한다.
  const db = createDb(`test-${++dbCounter}`);
  return { db, repo: createGamesRepo(db) };
}

const NEW_GAME = {
  source: 'ai',
  startFen: START_FEN,
  playerColor: 'w',
  aiLevel: 3,
  practice: true,
} as const;

describe('gamesRepo', () => {
  it('게임을 만들고, 수를 저장하고, 끝낸다', async () => {
    const { repo } = setup();
    const id = await repo.create(NEW_GAME);

    const created = await repo.get(id);
    expect(created).toMatchObject({ status: 'playing', result: '*', movesUci: [] });

    await repo.updateMoves(id, ['e2e4', 'e7e5']);
    expect((await repo.findPlaying())?.movesUci).toEqual(['e2e4', 'e7e5']);

    await repo.finish(id, { result: '0-1', reason: 'resign' }, ['e2e4', 'e7e5'], '1. e4 e5 0-1');
    const finished = await repo.get(id);
    expect(finished).toMatchObject({
      status: 'finished',
      result: '0-1',
      endReason: 'resign',
      pgn: '1. e4 e5 0-1',
    });
    expect(await repo.findPlaying()).toBeUndefined();
  });

  it('목록은 최신 게임부터, 상태로 거를 수 있다', async () => {
    const { repo } = setup();
    const first = await repo.create(NEW_GAME);
    await new Promise((r) => setTimeout(r, 5));
    const second = await repo.create({ ...NEW_GAME, aiLevel: 5 });
    await repo.finish(first, { result: '1-0', reason: 'checkmate' }, [], '');

    expect((await repo.list()).map((g) => g.id)).toEqual([second, first]);
    expect((await repo.list({ status: 'finished' })).map((g) => g.id)).toEqual([first]);
  });

  it('손상된 기록은 무시한다', async () => {
    const { db, repo } = setup();
    await db.games.add({ broken: true } as never);
    const id = await repo.create(NEW_GAME);
    expect((await repo.list()).map((g) => g.id)).toEqual([id]);
    expect(isGameRecord({ id: 1 })).toBe(false);
  });

  it('게임을 지운다', async () => {
    const { repo } = setup();
    const id = await repo.create(NEW_GAME);
    await repo.remove(id);
    expect(await repo.get(id)).toBeUndefined();
  });
});
