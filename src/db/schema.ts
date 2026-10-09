import Dexie, { type EntityTable } from 'dexie';
import type { GameEndReason, GameResult } from '../core/chess';

export interface GameRecord {
  id: number;
  source: 'ai' | 'import';
  status: 'playing' | 'finished';
  createdAt: number;
  updatedAt: number;
  startFen: string;
  /** 둔 수 (UCI). 진행 중에도 매 수마다 저장해 새로고침 후 이어 둘 수 있다. */
  movesUci: string[];
  playerColor: 'w' | 'b';
  aiLevel: number;
  /** 연습 모드(무르기·힌트 허용) 여부 */
  practice: boolean;
  /** 진행 중이면 '*' */
  result: GameResult;
  endReason?: GameEndReason;
  /** 끝난 게임만 채워진다 */
  pgn?: string;
}

export type ChessTrainingDb = Dexie & {
  games: EntityTable<GameRecord, 'id'>;
};

export function createDb(name = 'chess-training'): ChessTrainingDb {
  const db = new Dexie(name) as ChessTrainingDb;
  // 스키마를 바꿀 때는 아래 버전을 지우지 말고 version(2)를 추가하고 마이그레이션을 작성한다.
  db.version(1).stores({
    games: '++id, status, createdAt',
  });
  return db;
}

export const db = createDb();
