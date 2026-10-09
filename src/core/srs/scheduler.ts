/**
 * 간격 반복(Leitner 상자). 맞히면 다음 상자로 가서 복습 간격이 늘고, 틀리면 첫 상자로 돌아간다.
 * 오프닝 드릴과 (Phase 8) 실수 복습이 함께 쓴다.
 */
export interface SrsState {
  /** 0부터. 클수록 잘 아는 것 */
  box: number;
  /** 다음 복습 시각 (ms) */
  due: number;
  reps: number;
  lapses: number;
}

const DAY = 24 * 60 * 60 * 1000;
/** 상자별 복습 간격(일). 틀린 것(상자 0)은 다음 날 다시 본다. */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16, 32] as const;

export function initialSrs(now: number): SrsState {
  return { box: 0, due: now, reps: 0, lapses: 0 };
}

export function reviewSrs(state: SrsState, correct: boolean, now: number): SrsState {
  const box = correct ? Math.min(state.box + 1, BOX_INTERVAL_DAYS.length - 1) : 0;
  const days = BOX_INTERVAL_DAYS[box] ?? 1;
  return {
    box,
    due: now + days * DAY,
    reps: state.reps + 1,
    lapses: state.lapses + (correct ? 0 : 1),
  };
}

export function isDue(state: SrsState, now: number): boolean {
  return state.due <= now;
}
