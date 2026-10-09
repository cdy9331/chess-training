import { Chess } from 'chess.js';
import { fenAt, fenToEpd, type GameLine } from '../chess';
import { moveToUci } from '../chess/notation';

export const OPENING_DATA_VERSION = 1;
export const OPENING_STATS_VERSION = 1;

export interface OpeningInfo {
  eco: string;
  /** Lichess 영어 이름 (예: "Italian Game: Two Knights Defense") */
  name: string;
}

/** 실제 대국 통계 (scripts/build-opening-stats.ts) */
export interface OpeningStatsInfo {
  /** 통계를 낸 대국 수 */
  games: number;
  /** 두 사람 모두 이 레이팅 이상인 대국만 셌다 */
  minRating: number;
  /** 이 판 수 이상 나온 국면만 들어 있다 */
  minCount: number;
}

/**
 * 국면(EPD) → 오프닝 이름 + 대국 통계.
 * - has/get: Lichess 오프닝 이름 목록(정석). 이름 없는 중간 국면도 "정석 안"으로 들어 있다.
 * - count: 1400+ 대국에서 이 국면이 나온 판 수 (통계가 없거나 드문 국면은 0)
 */
export interface OpeningBook {
  has(epd: string): boolean;
  get(epd: string): OpeningInfo | null;
  count(epd: string): number;
  stats: OpeningStatsInfo | null;
}

function parseStats(
  value: unknown,
): { info: OpeningStatsInfo; counts: Record<string, unknown> } | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== OPENING_STATS_VERSION) return null;
  if (typeof v.counts !== 'object' || v.counts === null) return null;
  if (typeof v.games !== 'number' || typeof v.minRating !== 'number') return null;
  return {
    info: {
      games: v.games,
      minRating: v.minRating,
      minCount: typeof v.minCount === 'number' ? v.minCount : 0,
    },
    counts: v.counts as Record<string, unknown>,
  };
}

/**
 * public/data/openings/openings.json(필수)과 stats.json(선택)을 검증해서 OpeningBook으로 만든다.
 * 통계가 없거나 형식이 다르면 이름만으로 동작한다.
 */
export function parseOpeningData(value: unknown, statsValue?: unknown): OpeningBook | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== OPENING_DATA_VERSION) return null;
  if (typeof v.positions !== 'object' || v.positions === null) return null;
  const positions = v.positions as Record<string, unknown>;
  const stats = parseStats(statsValue);
  return {
    has: (epd) => Object.hasOwn(positions, epd),
    get: (epd) => {
      const entry = positions[epd];
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || typeof entry[1] !== 'string') {
        return null;
      }
      return { eco: entry[0], name: entry[1] };
    },
    count: (epd) => {
      const n = stats?.counts[epd];
      return typeof n === 'number' ? n : 0;
    },
    stats: stats?.info ?? null,
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
  /** 정석(이름 목록) 안의 수인가 */
  inBook: boolean;
  /** 이 수를 둔 뒤 국면이 나온 판 수 (통계 없으면 0) */
  games: number;
  /** 보여주는 후보들 중 이 수의 비율 0~1 (통계가 있을 때만) */
  share: number | null;
}

/**
 * 이 국면에서 이어지는 수 후보: 정석(이름 목록) 안의 수 + 실제 대국에서 자주 둔 수.
 * 선택률(판 수)이 높은 순서로 정렬한다. 통계가 없는 수는 뒤로 (이름 있는 것 먼저).
 */
export function nextBookMoves(book: OpeningBook, fen: string): BookMove[] {
  const chess = new Chess(fen);
  const result: BookMove[] = [];
  for (const move of chess.moves({ verbose: true })) {
    const epd = fenToEpd(move.after);
    const inBook = book.has(epd);
    const games = book.count(epd);
    if (!inBook && games === 0) continue;
    result.push({
      uci: moveToUci(move),
      san: move.san,
      opening: book.get(epd),
      inBook,
      games,
      share: null,
    });
  }
  const total = result.reduce((sum, m) => sum + m.games, 0);
  for (const m of result) m.share = total > 0 && m.games > 0 ? m.games / total : null;
  return result.sort((a, b) => {
    if (a.games !== b.games) return b.games - a.games;
    if (!!a.opening !== !!b.opening) return a.opening ? -1 : 1;
    return a.san.localeCompare(b.san);
  });
}
