import 'fake-indexeddb/auto';
import { START_FEN } from '../../core/chess';
import { createDb } from '../schema';
import { createDashboardRepo } from './dashboard';
import { createGamesRepo } from './games';
import { createLessonsRepo } from './lessons';
import { createPuzzlesRepo } from './puzzles';

describe('dashboardRepo', () => {
  it('빈 기록에서도 동작하고, 여러 기록을 모은다', async () => {
    const db = createDb('dashboard-test-1');
    const repo = createDashboardRepo(db);
    const empty = await repo.load(1000);
    expect(empty).toMatchObject({ puzzleRating: 1000, puzzlesTried: 0, mistakesDue: 0 });
    expect(empty.activityTimes).toEqual([]);

    await createPuzzlesRepo(db).recordAttempt(
      {
        puzzleId: 'p1',
        at: 500,
        solved: true,
        puzzleRating: 900,
        themes: [],
        ratingBefore: 1000,
        ratingAfter: 1080,
        durationMs: 1,
        usedHelp: false,
      },
      { rating: 1080, rd: 250, volatility: 0.06 },
    );
    await createLessonsRepo(db).saveStep('rook-mate', 1, 600);
    const games = createGamesRepo(db);
    const id = await games.create({
      source: 'ai',
      startFen: START_FEN,
      playerColor: 'w',
      aiLevel: 1,
      practice: false,
    });
    await games.finish(id, { result: '1-0', reason: 'checkmate' }, ['e2e4'], '');

    const data = await repo.load(1000);
    expect(data.puzzleRating).toBe(1080);
    expect(data.puzzleRatings).toEqual([{ at: 500, rating: 1080 }]);
    expect(data.lessonInProgress).toBe('rook-mate');
    expect(data.recentGames).toMatchObject([{ gameId: id, accuracy: null, result: '1-0' }]);
    expect(data.activityTimes).toHaveLength(3);
    expect(data.todayCounts).toEqual({
      puzzles: 1,
      games: 0,
      lessons: 0,
      openings: 0,
      mistakes: 0,
    });
  });
});
