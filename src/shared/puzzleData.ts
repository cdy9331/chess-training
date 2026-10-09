import { createPuzzleLoader } from '../core/puzzles';

/** public/data/puzzles/ 의 파일을 필요할 때 받아온다 (scripts/build-puzzles.ts가 만든 파일). */
export const puzzleLoader = createPuzzleLoader(async (path) => {
  const response = await fetch(`${import.meta.env.BASE_URL}data/puzzles/${path}`);
  if (!response.ok) throw new Error(`퍼즐 파일을 받지 못했어요 (${response.status})`);
  return response.json() as Promise<unknown>;
});
