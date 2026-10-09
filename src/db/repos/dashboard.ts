import type { Color } from 'chess.js';
import type { GameResult } from '../../core/chess';
import type { MistakeTag } from '../../core/review';
import { MAX_BOX } from '../../core/srs/scheduler';
import { countToday, type TodayCounts } from '../../core/training/daily';
import { db as defaultDb, type ChessTrainingDb } from '../schema';
import { createGamesRepo } from './games';
import { createLessonsRepo } from './lessons';
import { createMistakesRepo } from './mistakes';
import { createOpeningsRepo } from './openings';
import { createPuzzlesRepo } from './puzzles';
import { createReviewsRepo } from './reviews';

/** 홈 화면에 보여줄 최근 게임 수 */
const RECENT_GAMES = 8;

export interface RecentGameStat {
  gameId: number;
  at: number;
  playerColor: Color;
  result: GameResult;
  /** 리뷰하지 않았으면 null */
  accuracy: number | null;
}

export interface DashboardData {
  puzzleRating: number;
  /** 퍼즐을 푼 뒤의 레이팅 (오래된 것부터) */
  puzzleRatings: { at: number; rating: number }[];
  puzzlesSolved: number;
  puzzlesTried: number;
  recentGames: RecentGameStat[];
  completedLessonIds: Set<string>;
  /** 이어 보던 레슨 (완료 전, 가장 최근) */
  lessonInProgress: string | null;
  openingLinesPracticed: number;
  openingLinesDue: number;
  mistakesTotal: number;
  mistakesDue: number;
  /** 아직 다 익히지 않은 실수들의 이유 태그 */
  mistakeTags: MistakeTag[][];
  /** 연속 학습일 계산용 활동 시각 */
  activityTimes: number[];
  /** 오늘 한 학습 활동 수 (일일 목표용) */
  todayCounts: TodayCounts;
}

export function createDashboardRepo(db: ChessTrainingDb = defaultDb) {
  const games = createGamesRepo(db);
  const reviews = createReviewsRepo(db);
  const puzzles = createPuzzlesRepo(db);
  const lessons = createLessonsRepo(db);
  const openings = createOpeningsRepo(db);
  const mistakes = createMistakesRepo(db);

  return {
    async load(now = Date.now()): Promise<DashboardData> {
      const [rating, attempts, finished, lessonMap, openingMap, mistakeList] = await Promise.all([
        puzzles.getRating(),
        puzzles.listAttempts(),
        games.list({ status: 'finished' }),
        lessons.progressMap(),
        openings.progressMap(),
        mistakes.list(),
      ]);

      const recentGames = await Promise.all(
        finished.slice(0, RECENT_GAMES).map(async (g) => {
          const review = await reviews.get(g.id);
          return {
            gameId: g.id,
            at: g.updatedAt,
            playerColor: g.playerColor,
            result: g.result,
            accuracy: review?.accuracy[g.playerColor] ?? null,
          };
        }),
      );

      const lessonRecords = [...lessonMap.values()];
      const inProgress = lessonRecords
        .filter((l) => l.completedAt === undefined)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      const openingRecords = [...openingMap.values()];

      const activityTimes = [
        ...attempts.map((a) => a.at),
        ...finished.map((g) => g.updatedAt),
        ...lessonRecords.map((l) => l.updatedAt),
        ...openingRecords.map((o) => o.lastReviewedAt),
        ...mistakeList.flatMap((m) => (m.lastReviewedAt ? [m.lastReviewedAt] : [])),
      ];

      return {
        puzzleRating: Math.round(rating.rating),
        puzzleRatings: attempts.map((a) => ({ at: a.at, rating: a.ratingAfter })),
        puzzlesSolved: attempts.filter((a) => a.solved).length,
        puzzlesTried: attempts.length,
        recentGames,
        completedLessonIds: new Set(
          lessonRecords.filter((l) => l.completedAt !== undefined).map((l) => l.lessonId),
        ),
        lessonInProgress: inProgress?.lessonId ?? null,
        openingLinesPracticed: openingRecords.length,
        openingLinesDue: openingRecords.filter((o) => o.due <= now).length,
        mistakesTotal: mistakeList.length,
        mistakesDue: mistakeList.filter((m) => m.due <= now).length,
        // 마지막 상자까지 간 실수는 이미 익힌 것으로 보고 약점 계산에서 뺀다
        mistakeTags: mistakeList.filter((m) => m.box < MAX_BOX).map((m) => m.tags),
        activityTimes,
        todayCounts: {
          puzzles: countToday(
            attempts.map((a) => a.at),
            now,
          ),
          games: countToday(
            finished.map((g) => g.updatedAt),
            now,
          ),
          lessons: countToday(
            lessonRecords.flatMap((l) => (l.completedAt ? [l.completedAt] : [])),
            now,
          ),
          openings: countToday(
            openingRecords.map((o) => o.lastReviewedAt),
            now,
          ),
          mistakes: countToday(
            mistakeList.flatMap((m) => (m.lastReviewedAt ? [m.lastReviewedAt] : [])),
            now,
          ),
        },
      };
    },
  };
}

export const dashboardRepo = createDashboardRepo();
