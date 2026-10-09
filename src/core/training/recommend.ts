import type { MistakeTag } from '../review/explain';

/** 약점(나쁜 수의 이유 종류)별로 도움이 되는 레슨과 퍼즐 테마 (퍼즐 메뉴에 있는 초보자 테마만) */
export const WEAKNESS_INFO: Record<
  MistakeTag,
  { name: string; advice: string; lessonIds: string[]; puzzleTheme: string | null }
> = {
  hangingPiece: {
    name: '기물을 공짜로 내줌',
    advice: '수를 두기 전에 "이 기물을 누가 지키나?"를 확인하는 습관을 들여요.',
    lessonIds: ['tactics-hanging-piece', 'middlegame-piece-values'],
    puzzleTheme: 'hangingPiece',
  },
  allowedFork: {
    name: '포크를 허용',
    advice: '상대 나이트가 뛸 수 있는 칸과, 내 킹·퀸·룩이 한 번에 공격받는 자리를 살펴봐요.',
    lessonIds: ['tactics-fork'],
    puzzleTheme: 'fork',
  },
  allowedMate: {
    name: '메이트를 허용',
    advice: '내 킹 주변이 막혀 있지 않은지(백랭크!) 확인하고, 상대의 체크를 먼저 살펴봐요.',
    lessonIds: ['tactics-back-rank', 'middlegame-king-safety'],
    puzzleTheme: 'backRankMate',
  },
  materialLoss: {
    name: '교환 계산 실수',
    advice:
      '잡고 잡히는 교환은 끝까지 세어 보고, 기물 점수(폰1·나이트3·비숍3·룩5·퀸9)를 더해 봐요.',
    lessonIds: ['middlegame-piece-values', 'tactics-pin', 'tactics-skewer'],
    puzzleTheme: 'pin',
  },
  missedMate: {
    name: '메이트 기회를 놓침',
    advice: '상대 킹 근처에서는 모든 체크를 먼저 확인해요.',
    lessonIds: ['mate-patterns-practice', 'tactics-back-rank', 'mate-smothered'],
    puzzleTheme: 'mateIn2',
  },
  missedWin: {
    name: '이득 기회를 놓침',
    advice: '"체크 → 잡기 → 위협" 순서로 내 공격 수를 먼저 찾아봐요.',
    lessonIds: ['tactics-fork', 'tactics-discovered-attack', 'tactics-double-check'],
    puzzleTheme: 'fork',
  },
  openingPrinciple: {
    name: '오프닝 원칙 위반',
    advice: '중앙 차지 → 기물 전개 → 캐슬링 순서를 지켜요. 퀸은 늦게!',
    lessonIds: ['middlegame-opening-principles', 'middlegame-king-safety'],
    puzzleTheme: null,
  },
  positional: {
    name: '형세 판단',
    advice: '좋은 자리(오픈 파일, 아웃포스트)와 약점(고립 폰)을 생각하며 계획을 세워요.',
    lessonIds: ['middlegame-open-file', 'middlegame-outpost', 'middlegame-weak-pawns'],
    puzzleTheme: null,
  },
};

export interface Weakness {
  tag: MistakeTag;
  count: number;
}

/** 실수들의 이유 태그를 세서 많은 순으로 (같으면 심각한 것 먼저) */
export function topWeaknesses(tagLists: readonly (readonly MistakeTag[])[], limit = 3): Weakness[] {
  const counts = new Map<MistakeTag, number>();
  for (const tags of tagLists) {
    for (const tag of new Set(tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const severity: MistakeTag[] = [
    'allowedMate',
    'hangingPiece',
    'allowedFork',
    'materialLoss',
    'missedMate',
    'missedWin',
    'openingPrinciple',
    'positional',
  ];
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || severity.indexOf(a.tag) - severity.indexOf(b.tag))
    .slice(0, limit);
}

/** 약점에 맞는 레슨 중 아직 완료하지 않은 첫 레슨 (모두 완료했으면 첫 레슨) */
export function recommendLesson(tag: MistakeTag, completed: ReadonlySet<string>): string | null {
  const ids = WEAKNESS_INFO[tag].lessonIds;
  return ids.find((id) => !completed.has(id)) ?? ids[0] ?? null;
}
