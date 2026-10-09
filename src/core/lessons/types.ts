export type LessonCategory = 'basics' | 'checkmates' | 'tactics' | 'middlegame' | 'endgame';

export interface LessonArrow {
  from: string;
  to: string;
  /** 'good'(초록) | 'bad'(빨강) | 'info'(파랑). 기본 info */
  tone?: 'good' | 'bad' | 'info';
}

/** 설명: 체스판(선택)과 글 */
export interface ExplainStep {
  kind: 'explain';
  title: string;
  /** 문단 단위 */
  text: string[];
  fen?: string;
  arrows?: LessonArrow[];
  highlights?: string[];
}

/**
 * 수 찾기: 사용자가 정답 수순을 둔다.
 * solutions의 각 줄은 SAN 수순이고, 짝수 번째(0, 2, …)가 사용자 수, 홀수 번째가 상대의 정해진 응수다.
 * 첫 수가 여러 개 정답일 수 있다(여러 줄). 메이트가 되는 수는 적혀 있지 않아도 정답으로 인정한다.
 */
export interface FindMoveStep {
  kind: 'findMove';
  title: string;
  fen: string;
  prompt: string;
  solutions: string[][];
  hint?: string;
  /** 다 풀었을 때 보여줄 설명 */
  explanation: string;
}

/**
 * 실습: 지정 국면에서 엔진을 상대로 둬서 목표를 이룬다.
 * - mate: 체크메이트하면 성공
 * - promote: 폰을 승격하면 성공
 * maxMoves 안에 못 이루거나 무승부가 되면 실패 (다시 시도할 수 있다).
 */
export interface PlayOutStep {
  kind: 'playOut';
  title: string;
  fen: string;
  prompt: string;
  goal: 'mate' | 'promote';
  /** 사용자가 둘 수 있는 최대 수 */
  maxMoves: number;
  tips?: string[];
}

/**
 * 실전 퍼즐 연습: Lichess 퍼즐 데이터(CC0)에서 주제가 맞는 퍼즐을 골라 차례로 푼다.
 * 퍼즐 레이팅에는 반영하지 않는다(레슨 연습).
 */
export interface PuzzlesStep {
  kind: 'puzzles';
  title: string;
  prompt: string;
  /** 이 중 하나라도 있는 퍼즐 (Lichess 퍼즐 테마 이름) */
  themes: string[];
  count: number;
  /** 이 레이팅 이하 퍼즐만 (쉬운 것부터 연습하도록) */
  maxRating?: number;
}

export type LessonStep = ExplainStep | FindMoveStep | PlayOutStep | PuzzlesStep;

/** chess.com 학습 경로처럼 초심자 → 중급 → 숙달 */
export type LessonLevel = 1 | 2 | 3;

export interface Lesson {
  id: string;
  category: LessonCategory;
  title: string;
  level: LessonLevel;
  summary: string;
  steps: LessonStep[];
}

export const LEVEL_NAME: Record<LessonLevel, string> = { 1: '초심자', 2: '중급', 3: '숙달' };

export const CATEGORY_ORDER: readonly LessonCategory[] = [
  'basics',
  'checkmates',
  'tactics',
  'middlegame',
  'endgame',
];

export const CATEGORY_INFO: Record<LessonCategory, { name: string; description: string }> = {
  basics: { name: '체스 기초', description: '기물이 움직이는 방법과 특별한 규칙' },
  checkmates: { name: '체크메이트', description: '기본 메이트 방법과 자주 나오는 메이트 모양' },
  tactics: { name: '전술', description: '기물을 얻거나 메이트하는 짧은 수법들' },
  middlegame: { name: '전략', description: '좋은 자리를 잡고 계획을 세우는 원칙' },
  endgame: { name: '엔드게임', description: '기물이 적게 남았을 때 이기거나 비기는 방법' },
};
