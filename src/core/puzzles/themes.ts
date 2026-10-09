/**
 * 초보자 메뉴에 보여줄 테마. key는 Lichess 퍼즐 테마 이름이다.
 * 빌드 스크립트(scripts/build-puzzles.ts)의 KEY_THEMES와 맞춰 둔다.
 */
export interface ThemeInfo {
  key: string;
  name: string;
  description: string;
}

export const BEGINNER_THEMES: readonly ThemeInfo[] = [
  { key: 'mateIn1', name: '1수 메이트', description: '한 수로 체크메이트를 찾아요.' },
  { key: 'mateIn2', name: '2수 메이트', description: '두 수 만에 메이트하는 수순을 찾아요.' },
  {
    key: 'backRankMate',
    name: '백랭크 메이트',
    description: '자기 폰에 갇힌 킹을 맨 뒷줄에서 메이트해요.',
  },
  { key: 'hangingPiece', name: '무방비 기물', description: '아무도 지키지 않는 기물을 잡아요.' },
  { key: 'fork', name: '포크', description: '한 기물로 두 개 이상을 동시에 공격해요.' },
  { key: 'pin', name: '핀', description: '뒤의 더 귀한 기물 때문에 움직일 수 없게 묶어요.' },
  {
    key: 'skewer',
    name: '스큐어',
    description: '귀한 기물을 공격해 비키게 한 뒤 뒤의 기물을 잡아요.',
  },
  {
    key: 'discoveredAttack',
    name: '디스커버드 어택',
    description: '앞의 기물이 비키면서 뒤의 기물이 공격하게 해요.',
  },
  { key: 'endgame', name: '엔드게임', description: '기물이 적게 남은 끝내기 국면이에요.' },
];

/** 그 밖의 테마도 결과 화면에 한국어로 보여주기 위한 이름 */
const OTHER_THEME_NAMES: Record<string, string> = {
  mate: '메이트',
  mateIn3: '3수 메이트',
  mateIn4: '4수 메이트',
  mateIn5: '5수 이상 메이트',
  smotheredMate: '스모더드 메이트',
  advantage: '우세 만들기',
  crushing: '결정적 우세',
  equality: '균형 되찾기',
  sacrifice: '희생',
  attraction: '끌어들이기',
  deflection: '빗나가게 하기',
  capturingDefender: '수비 기물 잡기',
  trappedPiece: '갇힌 기물',
  promotion: '프로모션',
  advancedPawn: '전진한 폰',
  kingsideAttack: '킹사이드 공격',
  queensideAttack: '퀸사이드 공격',
  exposedKing: '드러난 킹',
  defensiveMove: '수비',
  quietMove: '조용한 수',
  intermezzo: '중간 수',
  doubleCheck: '이중 체크',
  xRayAttack: 'X-레이 공격',
  zugzwang: '추크추방',
  opening: '오프닝',
  middlegame: '중반',
  short: '짧은 퍼즐',
  long: '긴 퍼즐',
  veryLong: '아주 긴 퍼즐',
  oneMove: '한 수 퍼즐',
  pawnEndgame: '폰 엔드게임',
  rookEndgame: '룩 엔드게임',
  queenEndgame: '퀸 엔드게임',
  knightEndgame: '나이트 엔드게임',
  bishopEndgame: '비숍 엔드게임',
  clearance: '길 비우기',
  interference: '차단',
  attackingF2F7: 'f2/f7 공격',
  enPassant: '앙파상',
  castling: '캐슬링',
  underPromotion: '언더 프로모션',
  master: '마스터 대국',
  masterVsMaster: '마스터끼리의 대국',
  superGM: '최정상급 대국',
  hookMate: '훅 메이트',
  arabianMate: '아라비안 메이트',
  anastasiaMate: '아나스타샤 메이트',
  bodenMate: '보든 메이트',
  doubleBishopMate: '쌍비숍 메이트',
  dovetailMate: '도브테일 메이트',
  killBoxMate: '킬박스 메이트',
  vukovicMate: '부코비치 메이트',
  queenRookEndgame: '퀸·룩 엔드게임',
};

export function themeName(key: string): string {
  return BEGINNER_THEMES.find((t) => t.key === key)?.name ?? OTHER_THEME_NAMES[key] ?? key;
}
