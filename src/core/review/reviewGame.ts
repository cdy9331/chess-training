import type { Color } from 'chess.js';
import { fenAt, fenToEpd, sideToMove, uciLineToSan, uciToSan, type GameLine } from '../chess';
import type { EngineClient } from '../engine/EngineClient';
import { gameAccuracy, moveAccuracy } from './accuracy';
import { classifyMove, type MoveClass } from './classify';
import { analyzePosition, type EvalCache, type PositionEval } from './positionEval';

/** 리뷰 결과 형식이 바뀌면 올린다. 저장된 옛 리뷰는 다시 분석한다. */
export const REVIEW_FORMAT_VERSION = 1;
export const DEFAULT_REVIEW_DEPTH = 14;

/** 최선 수순은 이만큼만 저장한다. */
const BEST_LINE_PLIES = 8;

export interface ReviewedMove {
  /** 1부터 시작. 이 수를 둔 뒤의 ply */
  ply: number;
  color: Color;
  uci: string;
  san: string;
  classification: MoveClass;
  /** 둔 쪽 관점 승률 손실(%p) */
  loss: number;
  accuracy: number;
  missedMate: boolean;
  allowedMate: boolean;
  /** 수를 두기 전 국면에서 엔진이 추천한 수 */
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  bestLineSan: string[];
}

export interface GameReview {
  version: number;
  depth: number;
  /** evals[i] = ply i 국면의 평가 (0 = 시작 국면) */
  evals: PositionEval[];
  moves: ReviewedMove[];
  accuracy: Record<Color, number | null>;
  counts: Record<Color, Record<MoveClass, number>>;
}

export interface ReviewProgress {
  done: number;
  total: number;
}

export interface ReviewOptions {
  depth?: number;
  cache?: EvalCache;
  signal?: AbortSignal;
  onProgress?: (progress: ReviewProgress) => void;
}

function emptyCounts(): Record<MoveClass, number> {
  return { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

export function cacheKey(fen: string, depth: number): string {
  return `${fenToEpd(fen)}|${depth}`;
}

/** 모든 국면을 분석해 수마다 등급을 매긴다. signal로 취소할 수 있다. */
export async function reviewGame(
  client: EngineClient,
  line: GameLine,
  { depth = DEFAULT_REVIEW_DEPTH, cache, signal, onProgress }: ReviewOptions = {},
): Promise<GameReview> {
  const total = line.moves.length + 1;
  const evals: PositionEval[] = [];

  for (let ply = 0; ply < total; ply++) {
    signal?.throwIfAborted();
    const fen = fenAt(line, ply);
    const key = cacheKey(fen, depth);
    let evaluation = await cache?.get(key);
    if (!evaluation) {
      evaluation = await analyzePosition(client, fen, depth, signal);
      await cache?.set(key, evaluation);
    }
    evals.push(evaluation);
    onProgress?.({ done: ply + 1, total });
  }

  return buildReview(line, evals, depth);
}

/** 국면 평가 목록으로 리뷰를 만든다 (엔진 없이 테스트할 수 있게 분리). */
export function buildReview(
  line: GameLine,
  evals: readonly PositionEval[],
  depth: number,
): GameReview {
  const moves: ReviewedMove[] = [];
  const losses: Record<Color, number[]> = { w: [], b: [] };
  const counts: Record<Color, Record<MoveClass, number>> = { w: emptyCounts(), b: emptyCounts() };

  line.moves.forEach((move, index) => {
    const before = evals[index];
    const after = evals[index + 1];
    if (!before || !after) return;
    const fenBefore = fenAt(line, index);
    const color = sideToMove(fenBefore);
    const result = classifyMove(before, after, color, move.uci);
    const bestMoveUci = before.kind === 'score' ? before.bestMoveUci : null;

    moves.push({
      ply: index + 1,
      color,
      uci: move.uci,
      san: move.san,
      classification: result.classification,
      loss: result.loss,
      accuracy: moveAccuracy(result.loss),
      missedMate: result.missedMate,
      allowedMate: result.allowedMate,
      bestMoveUci,
      bestMoveSan: bestMoveUci ? uciToSan(fenBefore, bestMoveUci) : null,
      bestLineSan:
        before.kind === 'score' ? uciLineToSan(fenBefore, before.pv.slice(0, BEST_LINE_PLIES)) : [],
    });
    losses[color].push(result.loss);
    counts[color][result.classification] += 1;
  });

  return {
    version: REVIEW_FORMAT_VERSION,
    depth,
    evals: [...evals],
    moves,
    accuracy: { w: gameAccuracy(losses.w), b: gameAccuracy(losses.b) },
    counts,
  };
}

/** 리뷰에서 다시 볼 만한 수(실수·블런더) — ply 순서 */
export function keyMoments(review: GameReview, color?: Color): ReviewedMove[] {
  return review.moves.filter(
    (m) =>
      (m.classification === 'mistake' || m.classification === 'blunder') &&
      (color === undefined || m.color === color),
  );
}
