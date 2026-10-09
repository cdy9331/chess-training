import { getLevel } from '../../core/engine';
import type { GameRecord } from '../../db/schema';

/** 대국 목록·리뷰 제목: AI 대국은 상대 레벨, 가져온 대국은 두 사람 이름 */
export function gameTitle(game: GameRecord): string {
  if (game.source === 'import') {
    const info = game.importInfo;
    return info ? `${info.white} vs ${info.black}` : '가져온 대국';
  }
  return `vs 레벨 ${game.aiLevel} (${getLevel(game.aiLevel).label})`;
}
