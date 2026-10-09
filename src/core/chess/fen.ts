import { Chess, DEFAULT_POSITION, validateFen, type Color, type Square } from 'chess.js';

export const START_FEN = DEFAULT_POSITION;

export function isValidFen(fen: string): boolean {
  return validateFen(fen).ok;
}

/** 반수 카운터·수 번호를 뺀 국면 식별자. 같은 국면 비교와 캐시 키에 사용한다. */
export function fenToEpd(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ');
}

export function sideToMove(fen: string): Color {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
}

/** 둘 차례인 쪽이 체크 상태라면 그 킹의 칸, 아니면 null. */
export function checkedKingSquare(fen: string): Square | null {
  const chess = new Chess(fen);
  if (!chess.inCheck()) return null;
  return chess.findPiece({ type: 'k', color: chess.turn() })[0] ?? null;
}

export interface LegalTarget {
  to: Square;
  isCapture: boolean;
}

/** 해당 칸의 기물이 갈 수 있는 칸 목록 (둘 차례의 기물만). 프로모션 4종은 한 칸으로 합친다. */
export function legalTargetsDetailed(fen: string, from: Square): LegalTarget[] {
  const byTarget = new Map<Square, LegalTarget>();
  for (const m of new Chess(fen).moves({ square: from, verbose: true })) {
    byTarget.set(m.to, { to: m.to, isCapture: m.isCapture() || m.isEnPassant() });
  }
  return [...byTarget.values()];
}

export function legalTargets(fen: string, from: Square): Square[] {
  return legalTargetsDetailed(fen, from).map((t) => t.to);
}

/** from→to 이동이 프로모션인지 (합법 수 중 프로모션이 있는지로 판정). */
export function isPromotionMove(fen: string, from: Square, to: Square): boolean {
  const chess = new Chess(fen);
  return chess.moves({ square: from, verbose: true }).some((m) => m.to === to && m.isPromotion());
}
