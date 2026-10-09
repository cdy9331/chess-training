export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/play', label: 'AI 대국', icon: '♟' },
  { path: '/review', label: '게임 리뷰', icon: '🔍' },
  { path: '/puzzles', label: '퍼즐', icon: '🧩' },
  { path: '/openings', label: '오프닝', icon: '📖' },
  { path: '/lessons', label: '레슨', icon: '🎓' },
  { path: '/analysis', label: '분석 보드', icon: '📊' },
];
