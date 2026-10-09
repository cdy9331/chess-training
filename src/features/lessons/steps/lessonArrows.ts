import type { LessonArrow } from '../../../core/lessons';
import type { BoardArrow } from '../../board/Board';

/** 체스판 화살표는 SVG라 CSS 변수를 쓸 수 없어 실제 색을 쓴다. */
const TONE_COLOR = {
  good: 'rgba(40, 160, 70, 0.85)',
  bad: 'rgba(210, 60, 60, 0.85)',
  info: 'rgba(30, 110, 200, 0.8)',
} as const;

export function toBoardArrows(arrows: readonly LessonArrow[] | undefined): BoardArrow[] {
  return (arrows ?? []).map((a) => ({
    from: a.from,
    to: a.to,
    color: TONE_COLOR[a.tone ?? 'info'],
  }));
}

export const ARROW_COLOR = TONE_COLOR;
