import { useEffect, useState } from 'react';
import { BEGINNER_THEMES, type Glicko, type PuzzleIndex } from '../../core/puzzles';
import { puzzlesRepo } from '../../db/repos/puzzles';
import { puzzleLoader } from '../../shared/puzzleData';
import type { PuzzleMode } from './puzzleMode';
import styles from './Puzzles.module.css';

interface PuzzleMenuProps {
  rating: Glicko;
  mode: PuzzleMode;
  onChangeMode: (mode: PuzzleMode) => void;
  onStart: () => void;
}

interface Stats {
  total: number;
  solved: number;
}

export function PuzzleMenu({ rating, mode, onChangeMode, onStart }: PuzzleMenuProps) {
  const [index, setIndex] = useState<PuzzleIndex | null>(null);
  const [indexError, setIndexError] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    puzzleLoader
      .loadIndex()
      .then((i) => !cancelled && setIndex(i))
      .catch(() => !cancelled && setIndexError(true));
    puzzlesRepo
      .listAttempts()
      .then(
        (attempts) =>
          !cancelled &&
          setStats({ total: attempts.length, solved: attempts.filter((a) => a.solved).length }),
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const provisional = rating.rd > 150;

  return (
    <section className={styles.menu}>
      <h1 className={styles.title}>퍼즐</h1>
      <p className={styles.muted}>
        실제 대국에서 나온 국면이에요. 상대가 방금 둔 수 다음, 가장 좋은 수를 찾아보세요.
      </p>

      <div className={styles.ratingCard}>
        <div>
          <span className={styles.muted}>내 퍼즐 레이팅</span>
          <strong className={styles.ratingValue}>
            {Math.round(rating.rating)}
            {provisional && <span className={styles.provisional}>?</span>}
          </strong>
          {provisional && (
            <span className={styles.small}>아직 측정 중이에요 (몇 문제 더 풀면 정확해져요)</span>
          )}
        </div>
        {stats && stats.total > 0 && (
          <div className={styles.statBox}>
            <span className={styles.muted}>푼 퍼즐</span>
            <strong>
              {stats.solved} / {stats.total}
            </strong>
            <span className={styles.small}>
              성공률 {Math.round((stats.solved / stats.total) * 100)}%
            </span>
          </div>
        )}
      </div>

      {indexError && (
        <p className={styles.error}>
          퍼즐 데이터를 찾을 수 없어요. <code>npm run data:puzzles</code>로 데이터를 만들어야 해요.
        </p>
      )}

      <fieldset className={styles.fieldset}>
        <legend>어떤 퍼즐을 풀까요?</legend>
        <label className={`${styles.option} ${mode.kind === 'auto' ? styles.selected : ''}`}>
          <input
            type="radio"
            name="mode"
            className="visually-hidden"
            checked={mode.kind === 'auto'}
            onChange={() => onChangeMode({ kind: 'auto' })}
          />
          <strong>🎯 내 레벨에 맞게</strong>
          <span className={styles.small}>내 레이팅 근처의 여러 주제 퍼즐 (추천)</span>
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>주제별로 연습하기</legend>
        <div className={styles.themeGrid}>
          {BEGINNER_THEMES.map((theme) => {
            const selected = mode.kind === 'theme' && mode.theme === theme.key;
            return (
              <label
                key={theme.key}
                className={`${styles.option} ${selected ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="mode"
                  className="visually-hidden"
                  checked={selected}
                  onChange={() => onChangeMode({ kind: 'theme', theme: theme.key })}
                />
                <strong>{theme.name}</strong>
                <span className={styles.small}>{theme.description}</span>
                {index && (
                  <span className={styles.count}>
                    {(index.themes[theme.key] ?? 0).toLocaleString()}개
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>난이도 직접 고르기</legend>
        <select
          value={mode.kind === 'level' ? mode.rating : ''}
          onChange={(e) =>
            e.target.value === ''
              ? onChangeMode({ kind: 'auto' })
              : onChangeMode({ kind: 'level', rating: Number(e.target.value) })
          }
        >
          <option value="">— 선택 안 함 —</option>
          {(index?.bands ?? []).map((b) => (
            <option key={b.band} value={b.band}>
              {b.band}~{b.band + 99} ({b.count.toLocaleString()}개)
            </option>
          ))}
        </select>
      </fieldset>

      <div>
        <button type="button" className={styles.primary} onClick={onStart} disabled={!index}>
          퍼즐 시작
        </button>
      </div>
    </section>
  );
}
