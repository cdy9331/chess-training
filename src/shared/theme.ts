export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'chess-training:theme';

export function loadThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // 저장소 접근이 막힌 환경(사생활 보호 모드 등)에서는 기본값 사용
  }
  return 'system';
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // 테마는 편의 기능이라 저장에 실패해도 동작에는 문제 없음
  }
}
