import type { Color } from 'chess.js';
import { whiteWinPercent, type Score } from '../engine/score';

/**
 * 연습 모드 무르기: 내 마지막 수까지 되돌린 뒤의 수 개수.
 * - 내 차례라면 (AI가 방금 둠) AI 수와 내 수 2개를 지운다.
 * - AI 차례라면 (AI가 생각 중) 내 수 1개만 지운다.
 */
export function undoTargetPly(moveCount: number, turn: Color, player: Color): number {
  const back = turn === player ? 2 : 1;
  return Math.max(0, moveCount - back);
}

/** 무승부 제안 수락 기준 (AI 입장 승률, %) */
const DRAW_ACCEPT = {
  /** AI가 이만큼 불리하면 받아들인다 */
  losingBelow: 40,
  /** 비슷한 국면이면 이 수(ply) 이후에만 받아들인다 — 초반 무승부 남발 방지 */
  equalMargin: 5,
  equalAfterPly: 60,
} as const;

export function aiAcceptsDraw(scoreWhite: Score, ai: Color, plyCount: number): boolean {
  const white = whiteWinPercent(scoreWhite);
  const aiPercent = ai === 'w' ? white : 100 - white;
  if (aiPercent < DRAW_ACCEPT.losingBelow) return true;
  return (
    Math.abs(aiPercent - 50) <= DRAW_ACCEPT.equalMargin && plyCount >= DRAW_ACCEPT.equalAfterPly
  );
}

export type ColorChoice = 'w' | 'b' | 'random';

export function resolveColor(choice: ColorChoice, random: () => number = Math.random): Color {
  if (choice !== 'random') return choice;
  return random() < 0.5 ? 'w' : 'b';
}
