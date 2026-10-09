import { Chess } from 'chess.js';
import { START_FEN } from './fen';
import { getGameStatus, type GameStatus } from './gameStatus';
import { moveToUci, playUci } from './notation';

export interface PlayedMove {
  uci: string;
  san: string;
  /** 이 수를 둔 뒤의 FEN */
  fen: string;
}

/** 시작 국면과 둔 수들. 불변 객체로 다루며 모든 변경 함수는 새 객체를 반환한다. */
export interface GameLine {
  startFen: string;
  moves: readonly PlayedMove[];
}

export function createLine(startFen: string = START_FEN): GameLine {
  return { startFen, moves: [] };
}

/** ply 0 = 시작 국면, ply n = n번째 수를 둔 뒤 */
export function fenAt(line: GameLine, ply: number): string {
  if (ply <= 0) return line.startFen;
  return line.moves[Math.min(ply, line.moves.length) - 1]?.fen ?? line.startFen;
}

/** ply까지의 수순을 재생한 Chess 인스턴스 (반복 판정·PGN 생성에 필요). */
export function chessAt(line: GameLine, ply: number = line.moves.length): Chess {
  const chess = new Chess(line.startFen);
  for (const move of line.moves.slice(0, Math.max(0, ply))) playUci(chess, move.uci);
  return chess;
}

/**
 * ply 시점에 수를 둔다. ply 이후의 수가 있었다면 버리고 새 수로 이어간다.
 * 불법 수면 null.
 */
export function playMove(line: GameLine, ply: number, uci: string): GameLine | null {
  const chess = chessAt(line, ply);
  if (chess.isGameOver()) return null;
  const move = playUci(chess, uci);
  if (!move) return null;
  const played: PlayedMove = { uci: moveToUci(move), san: move.san, fen: move.after };
  return { ...line, moves: [...line.moves.slice(0, ply), played] };
}

/** 저장된 UCI 수순으로 GameLine을 다시 만든다. 불법 수를 만나면 그 직전까지만. */
export function lineFromUcis(startFen: string, ucis: readonly string[]): GameLine {
  let line = createLine(startFen);
  for (const uci of ucis) {
    const next = playMove(line, line.moves.length, uci);
    if (!next) break;
    line = next;
  }
  return line;
}

export function truncate(line: GameLine, ply: number): GameLine {
  return { ...line, moves: line.moves.slice(0, Math.max(0, ply)) };
}

export function statusAt(line: GameLine, ply: number = line.moves.length): GameStatus {
  return getGameStatus(chessAt(line, ply));
}
