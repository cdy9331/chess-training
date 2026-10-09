import { Chess } from 'chess.js';
import { playUci } from '../chess/notation';
import type { Puzzle } from './types';

/**
 * 퍼즐 진행 상태. ply는 지금까지 둔 수의 개수(moves 기준).
 * Lichess 퍼즐은 moves[0](상대 수)을 먼저 두고 시작한다.
 */
export interface PuzzleProgress {
  puzzle: Puzzle;
  ply: number;
  fen: string;
}

export type MoveVerdict =
  /** 맞았고 퍼즐이 계속된다. 상대 응수(reply)를 자동으로 둔다. */
  | { kind: 'continue'; fenAfterMove: string; reply: string; fenAfterReply: string }
  /** 맞았고 퍼즐을 다 풀었다. */
  | { kind: 'solved'; fenAfterMove: string }
  | { kind: 'wrong'; fenAfterMove: string | null };

/** 사용자 차례 국면(상대 첫 수를 둔 뒤)으로 시작한다. */
export function startPuzzle(puzzle: Puzzle): PuzzleProgress {
  const chess = new Chess(puzzle.fen);
  const first = puzzle.moves[0];
  if (!first || !playUci(chess, first)) throw new Error(`퍼즐 ${puzzle.id}의 첫 수가 잘못됐어요.`);
  return { puzzle, ply: 1, fen: chess.fen() };
}

/** 사용자가 맡는 색 (상대 첫 수 이후 둘 차례) */
export function puzzleColor(puzzle: Puzzle): 'w' | 'b' {
  return puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w';
}

/**
 * 사용자의 수를 판정한다. 기대한 수와 같거나, 다른 수라도 바로 체크메이트가 되면 정답이다
 * (Lichess와 같은 규칙: 메이트로 끝나는 퍼즐은 다른 메이트도 인정).
 */
export function checkMove(progress: PuzzleProgress, uci: string): MoveVerdict {
  const { puzzle, ply } = progress;
  const expected = puzzle.moves[ply];
  const chess = new Chess(progress.fen);
  const move = playUci(chess, uci);
  if (!move || !expected) return { kind: 'wrong', fenAfterMove: move ? chess.fen() : null };

  const isLastMove = ply === puzzle.moves.length - 1;
  if (uci !== expected && !chess.isCheckmate()) return { kind: 'wrong', fenAfterMove: chess.fen() };

  const fenAfterMove = chess.fen();
  if (isLastMove || chess.isCheckmate()) return { kind: 'solved', fenAfterMove };

  const reply = puzzle.moves[ply + 1];
  if (!reply || !playUci(chess, reply)) return { kind: 'solved', fenAfterMove };
  return { kind: 'continue', fenAfterMove, reply, fenAfterReply: chess.fen() };
}

/** 정답 수를 둔 뒤의 진행 상태 (continue 판정 다음에 호출) */
export function advance(progress: PuzzleProgress, fenAfterReply: string): PuzzleProgress {
  return { ...progress, ply: progress.ply + 2, fen: fenAfterReply };
}

/** 지금 둬야 할 정답 수 (힌트·해답 보기용) */
export function expectedMove(progress: PuzzleProgress): string | null {
  return progress.puzzle.moves[progress.ply] ?? null;
}
