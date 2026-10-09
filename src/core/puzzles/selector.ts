import type { Random } from '../engine/strength';
import type { PuzzleLoader } from './data';
import type { Puzzle, PuzzleIndex } from './types';

export interface PuzzleCriteria {
  /** 이 레이팅 근처의 퍼즐을 고른다 */
  targetRating: number;
  /** 이 테마가 있는 퍼즐만 (없으면 전체) */
  theme?: string;
  /** 최근에 푼 퍼즐 등 제외할 ID */
  exclude?: ReadonlySet<string>;
}

/** 처음엔 목표 ±150에서 찾고, 없으면 범위를 넓힌다. */
const RANGES = [150, 300, 600, 3000] as const;

/** 목표 레이팅 ±range와 겹치는 구간들 */
export function bandsInRange(index: PuzzleIndex, target: number, range: number): number[] {
  return index.bands
    .filter((b) => b.band + index.bandSize > target - range && b.band <= target + range)
    .map((b) => b.band);
}

export function filterPuzzles(
  puzzles: readonly Puzzle[],
  { targetRating, theme, exclude }: PuzzleCriteria,
  range: number,
): Puzzle[] {
  return puzzles.filter(
    (p) =>
      Math.abs(p.rating - targetRating) <= range &&
      (!theme || p.themes.includes(theme)) &&
      !exclude?.has(p.id),
  );
}

/** 조건에 맞는 퍼즐 하나를 무작위로 고른다. 정말 하나도 없으면 null. */
export async function selectPuzzle(
  loader: PuzzleLoader,
  criteria: PuzzleCriteria,
  random: Random = Math.random,
): Promise<Puzzle | null> {
  const index = await loader.loadIndex();
  for (const range of RANGES) {
    const bands = bandsInRange(index, criteria.targetRating, range);
    const shards = await Promise.all(bands.map((band) => loader.loadBand(band)));
    const candidates = filterPuzzles(shards.flat(), criteria, range);
    if (candidates.length > 0) return candidates[Math.floor(random() * candidates.length)] ?? null;
  }
  // 제외 목록 때문에 하나도 없다면(모두 풀었다면) 제외 없이 한 번 더
  if (criteria.exclude?.size)
    return selectPuzzle(loader, { ...criteria, exclude: undefined }, random);
  return null;
}
