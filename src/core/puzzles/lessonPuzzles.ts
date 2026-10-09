import type { Random } from '../engine/strength';
import type { PuzzleLoader } from './data';
import type { Puzzle } from './types';

export interface LessonPuzzleCriteria {
  themes: readonly string[];
  count: number;
  maxRating?: number;
}

/**
 * 레슨 연습용 퍼즐을 고른다: 주제가 맞는 퍼즐 중 쉬운 쪽(하위 POOL_FACTOR × count개)에서
 * 무작위로 count개를 뽑아 쉬운 순서로 낸다. 매번 조금씩 다른 퍼즐이 나와 반복 연습이 된다.
 */
const POOL_FACTOR = 4;

export async function pickLessonPuzzles(
  loader: PuzzleLoader,
  { themes, count, maxRating }: LessonPuzzleCriteria,
  random: Random = Math.random,
): Promise<Puzzle[]> {
  const index = await loader.loadIndex();
  const bands = index.bands.filter((b) => maxRating === undefined || b.band <= maxRating);
  const shards = await Promise.all(bands.map((b) => loader.loadBand(b.band)));
  const matching = shards
    .flat()
    .filter(
      (p) =>
        (maxRating === undefined || p.rating <= maxRating) &&
        p.themes.some((t) => themes.includes(t)),
    )
    .sort((a, b) => a.rating - b.rating);

  const pool = matching.slice(0, Math.max(count, count * POOL_FACTOR));
  const chosen: Puzzle[] = [];
  const remaining = [...pool];
  while (chosen.length < count && remaining.length > 0) {
    const [picked] = remaining.splice(Math.floor(random() * remaining.length), 1);
    if (picked) chosen.push(picked);
  }
  return chosen.sort((a, b) => a.rating - b.rating);
}
