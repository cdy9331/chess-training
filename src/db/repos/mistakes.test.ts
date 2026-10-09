import 'fake-indexeddb/auto';
import { lineFromUcis, START_FEN } from '../../core/chess';
import { buildReview, type PositionEval } from '../../core/review';
import { createDb, type GameRecord } from '../schema';
import { createMistakesRepo, mistakesFromReview } from './mistakes';

let counter = 0;
const newDb = () => createDb(`mistakes-test-${++counter}`);
const DAY = 24 * 60 * 60 * 1000;

const evalOf = (value: number, bestMoveUci: string): PositionEval => ({
  kind: 'score',
  score: { kind: 'cp', value },
  bestMoveUci,
  pv: [bestMoveUci],
  depth: 14,
});

// 1.e4 e5 2.Qh5 Nc6 3.Qxe5+?? — 백이 퀸을 내준다
const MOVES = ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'h5e5'];
const GAME: GameRecord = {
  id: 3,
  source: 'ai',
  status: 'finished',
  createdAt: 0,
  updatedAt: 0,
  startFen: START_FEN,
  movesUci: MOVES,
  playerColor: 'w',
  aiLevel: 3,
  practice: false,
  result: '0-1',
};
const REVIEW = buildReview(
  lineFromUcis(START_FEN, MOVES),
  [
    evalOf(20, 'e2e4'),
    evalOf(30, 'e7e5'),
    evalOf(30, 'g1f3'),
    evalOf(0, 'b8c6'),
    evalOf(20, 'f1c4'),
    evalOf(-900, 'c6e5'),
  ],
  14,
);

describe('mistakesFromReview', () => {
  it('내 실수·블런더만 직전 국면과 함께 만든다', () => {
    const list = mistakesFromReview(GAME, REVIEW, 1000);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: '3:5',
      ply: 5,
      playedSan: 'Qxe5+',
      bestUci: 'f1c4',
      bestSan: 'Bc4',
      classification: 'blunder',
      box: 0,
      due: 1000,
    });
    expect(list[0]?.tags).toContain('hangingPiece');
    expect(mistakesFromReview({ ...GAME, playerColor: 'b' }, REVIEW, 1000)).toHaveLength(0);
  });
});

describe('mistakesRepo', () => {
  it('저장은 한 번만 되고, 복습하면 다음 복습일로 넘어간다', async () => {
    const repo = createMistakesRepo(newDb());
    expect(await repo.saveFromReview(GAME, REVIEW, 1000)).toBe(1);
    expect(await repo.saveFromReview(GAME, REVIEW, 2000)).toBe(0);
    expect(await repo.due(1000)).toHaveLength(1);

    const after = await repo.recordReview('3:5', true, 5000);
    expect(after).toMatchObject({ box: 1, reps: 1, due: 5000 + 2 * DAY, lastReviewedAt: 5000 });
    expect(await repo.due(6000)).toHaveLength(0);

    // 다시 리뷰해도 복습 기록이 처음으로 돌아가지 않는다
    await repo.saveFromReview(GAME, REVIEW, 7000);
    expect((await repo.list())[0]?.box).toBe(1);

    await repo.recordReview('3:5', false, 8000);
    expect((await repo.list())[0]).toMatchObject({ box: 0, lapses: 1, due: 8000 + DAY });
  });
});
