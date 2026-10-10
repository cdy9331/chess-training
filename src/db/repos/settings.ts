import { DEFAULT_REVIEW_DEPTH } from '../../core/review';
import { DAILY_GOAL_OPTIONS, DEFAULT_DAILY_GOAL } from '../../core/training/daily';
import { db as defaultDb, type ChessTrainingDb } from '../schema';

const REVIEW_DEPTH_KEY = 'reviewDepth';
const DAILY_GOAL_KEY = 'dailyGoal';
const MOVE_SOUND_KEY = 'moveSound';
/** 리뷰 분석 깊이 범위: 낮으면 빠르지만 덜 정확하다 */
export const REVIEW_DEPTH_MIN = 10;
export const REVIEW_DEPTH_MAX = 20;

export function createSettingsRepo(db: ChessTrainingDb = defaultDb) {
  return {
    async getReviewDepth(): Promise<number> {
      const value = (await db.kv.get(REVIEW_DEPTH_KEY))?.value;
      return typeof value === 'number' && value >= REVIEW_DEPTH_MIN && value <= REVIEW_DEPTH_MAX
        ? value
        : DEFAULT_REVIEW_DEPTH;
    },
    async setReviewDepth(depth: number): Promise<void> {
      const clamped = Math.round(Math.max(REVIEW_DEPTH_MIN, Math.min(REVIEW_DEPTH_MAX, depth)));
      await db.kv.put({ key: REVIEW_DEPTH_KEY, value: clamped });
    },
    /** 하루 목표 학습 활동 수 */
    async getDailyGoal(): Promise<number> {
      const value = (await db.kv.get(DAILY_GOAL_KEY))?.value;
      return DAILY_GOAL_OPTIONS.find((o) => o === value) ?? DEFAULT_DAILY_GOAL;
    },
    async setDailyGoal(goal: number): Promise<void> {
      if (!DAILY_GOAL_OPTIONS.some((o) => o === goal)) return;
      await db.kv.put({ key: DAILY_GOAL_KEY, value: goal });
    },
    /** 착수 효과음 (기본 켬) */
    async getMoveSound(): Promise<boolean> {
      const value = (await db.kv.get(MOVE_SOUND_KEY))?.value;
      return typeof value === 'boolean' ? value : true;
    },
    async setMoveSound(on: boolean): Promise<void> {
      await db.kv.put({ key: MOVE_SOUND_KEY, value: on });
    },
  };
}

export const settingsRepo = createSettingsRepo();
