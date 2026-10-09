import { useState } from 'react';
import { parsePositionInput, type GameLine } from '../../core/chess';
import styles from './AnalysisPage.module.css';

interface PositionLoaderProps {
  currentFen: string;
  onLoad: (line: GameLine) => void;
}

export function PositionLoader({ currentFen, onLoad }: PositionLoaderProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    const result = parsePositionInput(text);
    if (result.kind === 'error') {
      setError(result.message);
      return;
    }
    setError(null);
    setText('');
    onLoad(result.line);
  }

  return (
    <details className={styles.loader}>
      <summary>국면 불러오기 (FEN / PGN)</summary>
      <div className={styles.loaderBody}>
        <label className={styles.fieldLabel}>
          현재 국면 FEN
          <input
            readOnly
            value={currentFen}
            className={styles.fenInput}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
        <label className={styles.fieldLabel}>
          불러올 FEN 또는 PGN
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={'예) 1. e4 e5 2. Nf3 Nc6 3. Bb5\n또는 FEN 한 줄'}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="button" onClick={load} disabled={!text.trim()}>
          불러오기
        </button>
      </div>
    </details>
  );
}
