import { useState } from 'react';
import { Link } from 'react-router';
import { LEVELS } from '../../core/engine';
import type { ColorChoice } from '../../core/play/rules';
import type { GameRecord } from '../../db/schema';
import styles from './Play.module.css';

export interface SetupChoice {
  level: number;
  practice: boolean;
}

interface GameSetupProps {
  playing: GameRecord | undefined;
  loadError: string | null;
  onStart: (choice: SetupChoice & { color: ColorChoice }) => Promise<void>;
  onResume: (record: GameRecord) => void;
}

const COLOR_OPTIONS: { value: ColorChoice; label: string }[] = [
  { value: 'w', label: '♔ 백 (먼저 둠)' },
  { value: 'b', label: '♚ 흑' },
  { value: 'random', label: '무작위' },
];

const STORAGE_KEY = 'chess-training:play-setup';

interface StoredSetup {
  level: number;
  color: ColorChoice;
  practice: boolean;
}

const DEFAULT_SETUP: StoredSetup = { level: 1, color: 'w', practice: true };

/** 지난번에 고른 설정을 기억해 둔다 (편의 기능이라 실패해도 기본값 사용). */
function loadSetup(): StoredSetup {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETUP;
    const v = parsed as Partial<StoredSetup>;
    return {
      level: LEVELS.some((l) => l.level === v.level) ? (v.level as number) : DEFAULT_SETUP.level,
      color: v.color === 'w' || v.color === 'b' || v.color === 'random' ? v.color : 'w',
      practice: typeof v.practice === 'boolean' ? v.practice : true,
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

function saveSetup(setup: StoredSetup) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  } catch {
    // 무시
  }
}

export function GameSetup({ playing, loadError, onStart, onResume }: GameSetupProps) {
  const [setup, setSetup] = useState<StoredSetup>(loadSetup);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    saveSetup(setup);
    setStarting(true);
    setError(null);
    try {
      await onStart(setup);
    } catch {
      setError('대국을 시작하지 못했어요. 다시 시도해 주세요.');
      setStarting(false);
    }
  }

  return (
    <section className={styles.setup}>
      <h1 className={styles.title}>AI 대국</h1>
      <p className={styles.muted}>
        레벨을 골라 컴퓨터와 대국해요. 끝난 대국은 자동으로 저장되고, 게임 리뷰에서 다시 볼 수
        있어요.
      </p>

      {loadError && <p className={styles.error}>{loadError}</p>}

      {playing && (
        <div className={styles.resumeCard}>
          <div>
            <strong>진행 중인 대국이 있어요</strong>
            <p className={styles.muted}>
              레벨 {playing.aiLevel} · {playing.playerColor === 'w' ? '백' : '흑'} ·{' '}
              {Math.ceil(playing.movesUci.length / 2)}수째
            </p>
          </div>
          <button type="button" className={styles.primary} onClick={() => onResume(playing)}>
            이어서 두기
          </button>
        </div>
      )}

      <fieldset className={styles.fieldset}>
        <legend>상대 레벨</legend>
        <div className={styles.levelGrid}>
          {LEVELS.map((l) => (
            <label
              key={l.level}
              className={`${styles.levelCard} ${setup.level === l.level ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="level"
                value={l.level}
                checked={setup.level === l.level}
                onChange={() => setSetup((s) => ({ ...s, level: l.level }))}
                className="visually-hidden"
              />
              <span className={styles.levelNumber}>{l.level}</span>
              <span className={styles.levelLabel}>{l.label}</span>
              <span className={styles.levelDesc}>{l.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>내 색</legend>
        <div className={styles.segmented}>
          {COLOR_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`${styles.segment} ${setup.color === o.value ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="color"
                value={o.value}
                checked={setup.color === o.value}
                onChange={() => setSetup((s) => ({ ...s, color: o.value }))}
                className="visually-hidden"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.practiceToggle}>
        <input
          type="checkbox"
          checked={setup.practice}
          onChange={(e) => setSetup((s) => ({ ...s, practice: e.target.checked }))}
        />
        <span>
          <strong>연습 모드</strong>
          <span className={styles.muted}>
            {' '}
            — 무르기와 힌트를 쓸 수 있어요. 처음엔 켜 두는 걸 추천해요.
          </span>
        </span>
      </label>

      {playing && (
        <p className={styles.muted}>새 대국을 시작하면 진행 중인 대국은 기권으로 기록돼요.</p>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.setupActions}>
        <button type="button" className={styles.primary} onClick={start} disabled={starting}>
          {starting ? '준비 중…' : '대국 시작'}
        </button>
        <Link to="/review">지난 대국 보기</Link>
      </div>
    </section>
  );
}
