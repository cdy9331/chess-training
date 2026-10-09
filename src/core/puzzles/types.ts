export interface Puzzle {
  id: string;
  /** 상대가 첫 수를 두기 "전" 국면 (Lichess 형식) */
  fen: string;
  /** UCI 수순. moves[0]은 상대의 수이고, 사용자는 moves[1], moves[3], …을 둔다. */
  moves: string[];
  rating: number;
  themes: string[];
}

export interface PuzzleBandInfo {
  /** 구간 시작 레이팅 (예: 800이면 800~899) */
  band: number;
  file: string;
  count: number;
}

export interface PuzzleIndex {
  version: number;
  bandSize: number;
  bands: PuzzleBandInfo[];
  /** 테마별 전체 퍼즐 수 */
  themes: Record<string, number>;
}

/**
 * 샤드 파일 안의 퍼즐 한 개: [id, fen, moves(공백 구분), rating, themes(공백 구분)]
 * 객체 대신 배열로 저장해 파일 크기를 줄인다.
 */
export type PuzzleTuple = [string, string, string, number, string];

export const PUZZLE_DATA_VERSION = 1;
