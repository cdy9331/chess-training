import { Chess } from 'chess.js';
import { START_FEN } from './fen';
import { chessAt, type GameLine, playMove } from './gameLine';
import { getGameStatus, statusToResult } from './gameStatus';
import { moveToUci } from './notation';

export function lineToPgn(line: GameLine, headers: Record<string, string> = {}): string {
  const chess = chessAt(line);
  for (const [key, value] of Object.entries(headers)) chess.setHeader(key, value);
  if (!headers.Result) chess.setHeader('Result', statusToResult(getGameStatus(chess)));
  return chess.pgn();
}

export interface ParsedPgn {
  line: GameLine;
  headers: Record<string, string>;
}

/** PGN 문자열을 GameLine으로. 형식이 잘못되면 null. */
export function parsePgn(pgn: string): ParsedPgn | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }
  const headers = chess.getHeaders();
  const startFen = headers.FEN ?? START_FEN;
  let line: GameLine | null = { startFen, moves: [] };
  for (const move of chess.history({ verbose: true })) {
    line = playMove(line, line.moves.length, moveToUci(move));
    if (!line) return null;
  }
  return { line, headers };
}
