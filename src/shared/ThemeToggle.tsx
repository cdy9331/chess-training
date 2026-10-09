import { useEffect, useState } from 'react';
import { applyThemeChoice, loadThemeChoice, type ThemeChoice } from './theme';

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: '시스템 테마' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(loadThemeChoice);

  useEffect(() => {
    applyThemeChoice(choice);
  }, [choice]);

  return (
    <label>
      <span className="visually-hidden">테마</span>
      <select value={choice} onChange={(e) => setChoice(e.target.value as ThemeChoice)}>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
