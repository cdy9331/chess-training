import { Chess } from 'chess.js';
import { createLine, type GameLine } from './gameLine';
import { isValidFen } from './fen';
import { parsePgn } from './pgn';

export type PositionInputResult =
  | { kind: 'fen'; line: GameLine }
  | { kind: 'pgn'; line: GameLine }
  | { kind: 'error'; message: string };

/**
 * 엔진에 넘겨도 안전한 국면인지 확인한다.
 * Stockfish는 규칙상 불가능한 국면을 받으면 멈추거나 비정상 종료할 수 있다.
 */
export function impossiblePositionReason(fen: string): string | null {
  const chess = new Chess(fen);
  const waiting = chess.turn() === 'w' ? 'b' : 'w';
  const waitingKing = chess.findPiece({ type: 'k', color: waiting })[0];
  if (waitingKing && chess.isAttacked(waitingKing, chess.turn())) {
    return '둘 차례가 아닌 쪽의 킹이 체크당하고 있어요. 차례(w/b)가 맞는지 확인해 주세요.';
  }
  return null;
}

/** 사용자가 붙여넣은 문자열을 FEN 또는 PGN으로 해석한다. */
export function parsePositionInput(input: string): PositionInputResult {
  const text = input.trim();
  if (!text) return { kind: 'error', message: 'FEN 또는 PGN을 입력해 주세요.' };

  // FEN은 한 줄이고 '/'로 구분된 8개의 행을 가진다.
  if (!text.includes('\n') && text.split('/').length === 8) {
    if (!isValidFen(text)) {
      return {
        kind: 'error',
        message: 'FEN 형식이 올바르지 않아요. 복사한 내용을 확인해 주세요.',
      };
    }
    const reason = impossiblePositionReason(text);
    if (reason) return { kind: 'error', message: reason };
    return { kind: 'fen', line: createLine(text) };
  }

  const parsed = parsePgn(text);
  if (!parsed) {
    return {
      kind: 'error',
      message: 'PGN을 읽지 못했어요. 수 표기(예: 1. e4 e5 2. Nf3)가 올바른지 확인해 주세요.',
    };
  }
  return { kind: 'pgn', line: parsed.line };
}
