import { Chess, type Move, type Square } from 'chess.js';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface UciParts {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

const UCI_PATTERN = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

export function parseUci(uci: string): UciParts | null {
  const match = UCI_PATTERN.exec(uci);
  if (!match) return null;
  const [, from, to, promotion] = match;
  return {
    from: from as Square,
    to: to as Square,
    ...(promotion ? { promotion: promotion as PromotionPiece } : {}),
  };
}

export function toUci(from: string, to: string, promotion?: PromotionPiece): string {
  return `${from}${to}${promotion ?? ''}`;
}

export function moveToUci(move: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return toUci(move.from, move.to, move.promotion as PromotionPiece | undefined);
}

/** 해당 국면에서 UCI 수를 두었을 때의 chess.js Move. 불법 수면 null. */
export function playUci(chess: Chess, uci: string): Move | null {
  const parts = parseUci(uci);
  if (!parts) return null;
  try {
    return chess.move(parts);
  } catch {
    return null;
  }
}

export function uciToSan(fen: string, uci: string): string | null {
  return playUci(new Chess(fen), uci)?.san ?? null;
}

export function sanToUci(fen: string, san: string): string | null {
  try {
    return moveToUci(new Chess(fen).move(san));
  } catch {
    return null;
  }
}

/** 수 번호를 붙인 수순 문자열. 예: "12. Nf3 Nc6 13. Bb5", 흑 차례 시작이면 "12... Nc6 13. Bb5" */
export function formatSanLine(fen: string, sans: readonly string[]): string {
  const [, side, , , , fullmove] = fen.trim().split(/\s+/);
  let number = Number(fullmove) || 1;
  let white = side !== 'b';
  const parts: string[] = [];
  sans.forEach((san, i) => {
    if (white) parts.push(`${number}. ${san}`);
    else parts.push(i === 0 ? `${number}... ${san}` : san);
    if (!white) number += 1;
    white = !white;
  });
  return parts.join(' ');
}

/** UCI 수순을 SAN 수순으로 변환. 중간에 불법 수가 있으면 그 직전까지만 반환. */
export function uciLineToSan(fen: string, ucis: readonly string[]): string[] {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of ucis) {
    const move = playUci(chess, uci);
    if (!move) break;
    sans.push(move.san);
  }
  return sans;
}
