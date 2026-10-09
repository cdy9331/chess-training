import { PUZZLE_DATA_VERSION, type Puzzle, type PuzzleIndex } from './types';

/** fetch로 받은 JSON을 그대로 믿지 않고 모양을 확인한다. */
export function parsePuzzleIndex(value: unknown): PuzzleIndex | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== PUZZLE_DATA_VERSION || typeof v.bandSize !== 'number') return null;
  if (!Array.isArray(v.bands) || typeof v.themes !== 'object' || v.themes === null) return null;
  const bands = v.bands.filter(
    (b): b is PuzzleIndex['bands'][number] =>
      typeof b === 'object' &&
      b !== null &&
      typeof (b as Record<string, unknown>).band === 'number' &&
      typeof (b as Record<string, unknown>).file === 'string' &&
      typeof (b as Record<string, unknown>).count === 'number',
  );
  return {
    version: v.version,
    bandSize: v.bandSize,
    bands,
    themes: v.themes as Record<string, number>,
  };
}

export function parsePuzzleShard(value: unknown): Puzzle[] {
  if (!Array.isArray(value)) return [];
  const puzzles: Puzzle[] = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 5) continue;
    const [id, fen, moves, rating, themes] = item as unknown[];
    if (
      typeof id !== 'string' ||
      typeof fen !== 'string' ||
      typeof moves !== 'string' ||
      typeof rating !== 'number' ||
      typeof themes !== 'string'
    ) {
      continue;
    }
    const moveList = moves.split(' ').filter(Boolean);
    if (moveList.length < 2) continue;
    puzzles.push({ id, fen, moves: moveList, rating, themes: themes.split(' ').filter(Boolean) });
  }
  return puzzles;
}

/** JSON을 가져오는 함수. 브라우저에서는 fetch, 테스트에서는 가짜를 넣는다. */
export type JsonFetcher = (path: string) => Promise<unknown>;

/** 인덱스와 샤드를 필요할 때 한 번만 불러와 기억해 둔다. */
export function createPuzzleLoader(fetchJson: JsonFetcher) {
  let indexPromise: Promise<PuzzleIndex> | null = null;
  const shards = new Map<number, Promise<Puzzle[]>>();

  function loadIndex(): Promise<PuzzleIndex> {
    indexPromise ??= fetchJson('index.json').then((raw) => {
      const index = parsePuzzleIndex(raw);
      if (!index) throw new Error('퍼즐 목록 파일 형식이 올바르지 않아요.');
      return index;
    });
    // 실패하면 다음에 다시 시도할 수 있게 비운다.
    indexPromise.catch(() => (indexPromise = null));
    return indexPromise;
  }

  async function loadBand(band: number): Promise<Puzzle[]> {
    const index = await loadIndex();
    const info = index.bands.find((b) => b.band === band);
    if (!info) return [];
    let shard = shards.get(band);
    if (!shard) {
      shard = fetchJson(info.file).then(parsePuzzleShard);
      shard.catch(() => shards.delete(band));
      shards.set(band, shard);
    }
    return shard;
  }

  return { loadIndex, loadBand };
}

export type PuzzleLoader = ReturnType<typeof createPuzzleLoader>;
