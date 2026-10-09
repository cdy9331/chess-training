import { CATEGORY_ORDER, type Lesson } from '../../core/lessons/types';
import { BASICS_LESSONS } from './basics';
import { CHECKMATE_LESSONS } from './checkmates';
import { ENDGAME_LESSONS } from './endgame';
import { MIDDLEGAME_LESSONS } from './middlegame';
import { TACTICS_LESSONS } from './tactics';

/** 분야 순서(기초 → 체크메이트 → 전술 → 전략 → 엔드게임), 분야 안에서는 쉬운 레벨부터 */
export const LESSONS: readonly Lesson[] = [
  ...BASICS_LESSONS,
  ...CHECKMATE_LESSONS,
  ...TACTICS_LESSONS,
  ...MIDDLEGAME_LESSONS,
  ...ENDGAME_LESSONS,
].sort(
  (a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.level - b.level,
);

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
