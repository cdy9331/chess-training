import type { MoveClass } from '../../core/review';

export interface MoveClassStyle {
  label: string;
  symbol: string;
  /** HTML용 (CSS 변수) */
  color: string;
  /** 체스판 화살표(SVG)용 — CSS 변수를 쓸 수 없어 실제 색 */
  arrowColor: string;
  /** 초보자용 한 줄 설명 */
  explanation: string;
}

export const MOVE_CLASS_STYLE: Record<MoveClass, MoveClassStyle> = {
  best: {
    label: '최선',
    symbol: '★',
    color: 'var(--color-best)',
    arrowColor: 'rgba(91, 154, 60, 0.85)',
    explanation: '최선의 수예요! 엔진이 고른 수와 같거나 거의 같아요.',
  },
  good: {
    label: '좋음',
    symbol: '✓',
    color: 'var(--color-good)',
    arrowColor: 'rgba(139, 180, 106, 0.85)',
    explanation: '좋은 수예요. 최선의 수와 큰 차이가 없어요.',
  },
  inaccuracy: {
    label: '부정확',
    symbol: '?!',
    color: 'var(--color-inaccuracy)',
    arrowColor: 'rgba(229, 176, 46, 0.9)',
    explanation: '조금 아쉬운 수예요. 더 좋은 수가 있었어요.',
  },
  mistake: {
    label: '실수',
    symbol: '?',
    color: 'var(--color-mistake)',
    arrowColor: 'rgba(229, 130, 46, 0.9)',
    explanation: '실수예요. 유리함을 꽤 많이 잃었어요.',
  },
  blunder: {
    label: '블런더',
    symbol: '??',
    color: 'var(--color-blunder)',
    arrowColor: 'rgba(210, 60, 60, 0.9)',
    explanation: '큰 실수(블런더)예요. 이 수 때문에 승부가 크게 기울었어요.',
  },
};

export const MOVE_CLASS_ORDER: readonly MoveClass[] = [
  'best',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

/** 엔진 최선 수 화살표 색 */
export const BEST_ARROW_COLOR = 'rgba(30, 110, 200, 0.8)';
