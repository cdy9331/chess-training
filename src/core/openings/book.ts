import { Chess } from 'chess.js';
import { fenAt, fenToEpd, type GameLine } from '../chess';
import { moveToUci } from '../chess/notation';

export const OPENING_DATA_VERSION = 1;

export interface OpeningInfo {
  eco: string;
  /** Lichess 영어 이름 (예: "Italian Game: Two Knights Defense") */
  name: string;
}

/** 국면(EPD) → 오프닝. 이름이 없는 국면도 "정석 수순 안"으로 들어 있다. */
export interface OpeningBook {
  /** 정석 수순 안의 국면인가 */
  has(epd: string): boolean;
  /** 이름이 붙은 국면이면 그 오프닝 */
  get(epd: string): OpeningInfo | null;
}

/** public/data/openings/openings.json을 검증해서 OpeningBook으로 만든다. */
export function parseOpeningData(value: unknown): OpeningBook | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== OPENING_DATA_VERSION) return null;
  if (typeof v.positions !== 'object' || v.positions === null) return null;
  const positions = v.positions as Record<string, unknown>;
  return {
    has: (epd) => Object.hasOwn(positions, epd),
    get: (epd) => {
      const entry = positions[epd];
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || typeof entry[1] !== 'string') {
        return null;
      }
      return { eco: entry[0], name: entry[1] };
    },
  };
}

export interface IdentifiedOpening extends OpeningInfo {
  /** 이 이름이 붙은 국면까지의 수 */
  ply: number;
}

/** 수순에서 마지막으로 이름이 확인된 오프닝 (ply 이전까지만 본다) */
export function identifyOpening(
  book: OpeningBook,
  line: GameLine,
  uptoPly: number = line.moves.length,
): IdentifiedOpening | null {
  for (let ply = Math.min(uptoPly, line.moves.length); ply >= 1; ply--) {
    const info = book.get(fenToEpd(fenAt(line, ply)));
    if (info) return { ...info, ply };
  }
  return null;
}

/** 처음부터 몇 수까지 정석 수순(이론) 안에 있는가. 이 수까지의 수는 "이론수"다. */
export function bookDepth(book: OpeningBook, line: GameLine): number {
  let depth = 0;
  for (let ply = 1; ply <= line.moves.length; ply++) {
    if (!book.has(fenToEpd(fenAt(line, ply)))) break;
    depth = ply;
  }
  return depth;
}

export interface BookMove {
  uci: string;
  san: string;
  /** 이 수를 두면 이름이 붙은 오프닝이 되는 경우 */
  opening: OpeningInfo | null;
}

/** 이 국면에서 정석 수순 안으로 이어지는 수들 (이름 있는 것 먼저) */
export function nextBookMoves(book: OpeningBook, fen: string): BookMove[] {
  const chess = new Chess(fen);
  const result: BookMove[] = [];
  for (const move of chess.moves({ verbose: true })) {
    const epd = fenToEpd(move.after);
    if (!book.has(epd)) continue;
    result.push({ uci: moveToUci(move), san: move.san, opening: book.get(epd) });
  }
  return result.sort((a, b) => {
    if (!!a.opening !== !!b.opening) return a.opening ? -1 : 1;
    return a.san.localeCompare(b.san);
  });
}
