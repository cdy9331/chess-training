/** 퍼즐을 고르는 방식 */
export type PuzzleMode =
  { kind: 'auto' } | { kind: 'theme'; theme: string } | { kind: 'level'; rating: number };

const STORAGE_KEY = 'chess-training:puzzle-mode';

/** 지난번에 고른 방식을 기억한다 (편의 기능이라 실패해도 기본값). */
export function loadPuzzleMode(): PuzzleMode {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof v !== 'object' || v === null) return { kind: 'auto' };
    const m = v as Record<string, unknown>;
    if (m.kind === 'theme' && typeof m.theme === 'string') return { kind: 'theme', theme: m.theme };
    if (m.kind === 'level' && typeof m.rating === 'number')
      return { kind: 'level', rating: m.rating };
  } catch {
    // 무시
  }
  return { kind: 'auto' };
}

export function savePuzzleMode(mode: PuzzleMode) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
  } catch {
    // 무시
  }
}

/** 이 방식과 현재 내 레이팅으로 고를 퍼즐의 조건 */
export function criteriaFor(mode: PuzzleMode, myRating: number) {
  switch (mode.kind) {
    case 'auto':
      return { targetRating: myRating };
    case 'theme':
      return { targetRating: myRating, theme: mode.theme };
    case 'level':
      return { targetRating: mode.rating + 50 };
  }
}
