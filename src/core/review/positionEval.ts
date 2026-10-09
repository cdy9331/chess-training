import { Chess, type Color } from 'chess.js';
import type { EngineClient } from '../engine/EngineClient';
import { formatScore, whiteWinPercent, type Score } from '../engine/score';

/**
 * 한 국면의 평가. 게임이 끝난 국면은 엔진에 묻지 않고 규칙으로 정한다
 * (엔진은 메이트당한 국면에 'mate 0'을 주는데, 이것만으로는 누가 이겼는지 알 수 없다).
 */
export type PositionEval =
  | { kind: 'score'; score: Score; bestMoveUci: string | null; pv: string[]; depth: number }
  | { kind: 'mated'; winner: Color }
  | { kind: 'draw' };

export function evalWhitePercent(e: PositionEval): number {
  switch (e.kind) {
    case 'score':
      return whiteWinPercent(e.score);
    case 'mated':
      return e.winner === 'w' ? 100 : 0;
    case 'draw':
      return 50;
  }
}

/** 둘 차례와 상관없이, 특정 색 관점의 승률(%) */
export function evalPercentFor(e: PositionEval, color: Color): number {
  const white = evalWhitePercent(e);
  return color === 'w' ? white : 100 - white;
}

export function formatEval(e: PositionEval): string {
  switch (e.kind) {
    case 'score':
      return formatScore(e.score);
    case 'mated':
      return e.winner === 'w' ? '1-0' : '0-1';
    case 'draw':
      return '½-½';
  }
}

/** 해당 색이 강제 메이트를 가지고 있는가 */
export function hasMateFor(e: PositionEval, color: Color): boolean {
  if (e.kind === 'mated') return e.winner === color;
  if (e.kind !== 'score' || e.score.kind !== 'mate') return false;
  return color === 'w' ? e.score.value > 0 : e.score.value < 0;
}

/** 규칙상 끝난 국면이면 그 평가, 아니면 null */
export function terminalEval(fen: string): PositionEval | null {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) return { kind: 'mated', winner: chess.turn() === 'w' ? 'b' : 'w' };
  // 3회 반복은 수순이 있어야 알 수 있으므로 여기서는 국면만으로 판단 가능한 것만 본다.
  if (chess.isStalemate() || chess.isInsufficientMaterial() || chess.isDrawByFiftyMoves()) {
    return { kind: 'draw' };
  }
  return null;
}

/** 캐시 저장소. core는 IndexedDB를 모르므로 바깥에서 넣어준다. */
export interface EvalCache {
  get(key: string): Promise<PositionEval | undefined>;
  set(key: string, value: PositionEval): Promise<void>;
}

export async function analyzePosition(
  client: EngineClient,
  fen: string,
  depth: number,
  signal?: AbortSignal,
): Promise<PositionEval> {
  const terminal = terminalEval(fen);
  if (terminal) return terminal;
  const result = await client.analyze(fen, { depth, multipv: 1, signal });
  const line = result.lines[0];
  if (!line) return { kind: 'draw' }; // 둘 수 있는 수가 없는 경우 (위에서 걸러지므로 사실상 없음)
  return {
    kind: 'score',
    score: line.score,
    bestMoveUci: result.bestMoveUci,
    pv: line.pv,
    depth: line.depth,
  };
}
