import Dexie, { type EntityTable } from 'dexie';
import type { GameEndReason, GameResult } from '../core/chess';
import type { GameReview, PositionEval } from '../core/review';

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

export interface ReviewRecord {
  gameId: number;
  createdAt: number;
  review: GameReview;
}

export interface EngineCacheRecord {
  /** `EPD|depth` */
  key: string;
  createdAt: number;
  value: PositionEval;
}

export type ChessTrainingDb = Dexie & {
  games: EntityTable<GameRecord, 'id'>;
  reviews: EntityTable<ReviewRecord, 'gameId'>;
  engineCache: EntityTable<EngineCacheRecord, 'key'>;
};

export function createDb(name = 'chess-training'): ChessTrainingDb {
  const db = new Dexie(name) as ChessTrainingDb;
  // 스키마를 바꿀 때는 이전 버전을 지우지 말고 새 version()을 추가한다.
  db.version(1).stores({
    games: '++id, status, createdAt',
  });
  // v2: 게임 리뷰 결과와 엔진 분석 캐시 (새 테이블만 추가하므로 데이터 변환 없음)
  db.version(2).stores({
    reviews: 'gameId',
    engineCache: 'key, createdAt',
  });
  return db;
}

export const db = createDb();
