/** 퍼즐 러시: 제한 시간 안에 최대한 많이 푼다. 3번 틀리면 끝. 풀수록 어려워진다. */

export type RushLength = 3 | 5;

export const RUSH_DURATION_MS: Record<RushLength, number> = { 3: 180_000, 5: 300_000 };
export const RUSH_MAX_MISSES = 3;

/** 첫 문제 레이팅과 한 문제 풀 때마다 올리는 양 (chess.com 러시처럼 아주 쉽게 시작해 점점 어렵게) */
const RUSH_START_RATING = 500;
const RUSH_STEP = 40;
const RUSH_MAX_RATING = 2400;

export function rushTargetRating(solved: number): number {
  return Math.min(RUSH_START_RATING + solved * RUSH_STEP, RUSH_MAX_RATING);
}

export interface RushState {
  length: RushLength;
  startedAt: number;
  solved: number;
  misses: number;
  /** 지금까지 낸 퍼즐 (다시 나오지 않게) */
  seenIds: string[];
}

export type RushEnd = 'time' | 'misses';

export function startRush(length: RushLength, now: number): RushState {
  return { length, startedAt: now, solved: 0, misses: 0, seenIds: [] };
}

export function rushRemainingMs(state: RushState, now: number): number {
  return Math.max(0, state.startedAt + RUSH_DURATION_MS[state.length] - now);
}

/** 끝났으면 이유, 아니면 null */
export function rushEnded(state: RushState, now: number): RushEnd | null {
  if (state.misses >= RUSH_MAX_MISSES) return 'misses';
  if (rushRemainingMs(state, now) === 0) return 'time';
  return null;
}

export function recordRushPuzzle(state: RushState, puzzleId: string, solved: boolean): RushState {
  return {
    ...state,
    solved: state.solved + (solved ? 1 : 0),
    misses: state.misses + (solved ? 0 : 1),
    seenIds: [...state.seenIds, puzzleId],
  };
}
