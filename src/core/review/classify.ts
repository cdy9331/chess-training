import type { Color } from 'chess.js';
import { evalPercentFor, hasMateFor, type PositionEval } from './positionEval';

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/**
 * 수 등급 기준: 둔 쪽 관점 승률 손실(%p).
 * Lichess는 5/10/15를 쓰지만, 초보자에게 "블런더"를 너무 자주 보이지 않도록 20으로 잡았다 (PLAN 4.2).
 */
export const CLASS_THRESHOLDS = {
  best: 1,
  good: 5,
  inaccuracy: 10,
  mistake: 20,
} as const;

/** 이미 이만큼 지고 있던 국면에서 메이트를 허용한 것은 블런더로 따로 표시하지 않는다. */
const ALREADY_LOST_PERCENT = 10;

export interface MoveClassification {
  classification: MoveClass;
  /** 둔 쪽 관점 승률 손실 (0 이상) */
  loss: number;
  /** 강제 메이트가 있었는데 놓쳤다 */
  missedMate: boolean;
  /** 이 수 때문에 상대에게 강제 메이트가 생겼다 */
  allowedMate: boolean;
}

const ORDER: MoveClass[] = ['best', 'good', 'inaccuracy', 'mistake', 'blunder'];
const atLeast = (a: MoveClass, b: MoveClass) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

export function classifyByLoss(loss: number): MoveClass {
  if (loss < CLASS_THRESHOLDS.best) return 'best';
  if (loss < CLASS_THRESHOLDS.good) return 'good';
  if (loss < CLASS_THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (loss < CLASS_THRESHOLDS.mistake) return 'mistake';
  return 'blunder';
}

/**
 * @param before 수를 두기 전 국면의 평가 (최선 수 포함)
 * @param after 수를 둔 뒤 국면의 평가
 * @param mover 수를 둔 쪽
 * @param playedUci 실제로 둔 수
 */
export function classifyMove(
  before: PositionEval,
  after: PositionEval,
  mover: Color,
  playedUci: string,
): MoveClassification {
  const opponent: Color = mover === 'w' ? 'b' : 'w';
  const beforePercent = evalPercentFor(before, mover);
  // 서로 다른 탐색 결과를 비교하므로 최선 수가 약간 "이득"으로 나올 수 있다 → 0 아래는 자른다.
  const loss = Math.max(0, beforePercent - evalPercentFor(after, mover));

  const missedMate = hasMateFor(before, mover) && !hasMateFor(after, mover);
  const allowedMate =
    !hasMateFor(before, opponent) &&
    hasMateFor(after, opponent) &&
    beforePercent > ALREADY_LOST_PERCENT;

  const isEngineBest = before.kind === 'score' && before.bestMoveUci === playedUci;
  let classification: MoveClass = isEngineBest ? 'best' : classifyByLoss(loss);

  if (allowedMate) classification = 'blunder';
  // 메이트를 놓쳤어도 여전히 크게 이기고 있으면 '부정확' 정도로만 본다.
  else if (missedMate) classification = atLeast(classification, 'inaccuracy');

  return { classification, loss, missedMate, allowedMate };
}
