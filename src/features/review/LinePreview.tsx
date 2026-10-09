import type { GameLine } from '../../core/chess';
import styles from './Review.module.css';

interface LinePreviewProps {
  title: string;
  line: GameLine;
  /** 지금 보여주는 수 개수 (0 = 시작 국면) */
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
}

/** 엔진 수순을 한 수씩 체스판에서 따라가 보는 패널 */
export function LinePreview({ title, line, step, onStep, onClose }: LinePreviewProps) {
  const total = line.moves.length;
  return (
    <div className={styles.preview} role="region" aria-label={title}>
      <p className={styles.feedbackTitle}>▶ {title}</p>
      <ol className={styles.previewMoves}>
        {line.moves.map((m, i) => (
          <li key={i}>
            <button
              type="button"
              className={i + 1 === step ? styles.previewActive : undefined}
              aria-current={i + 1 === step ? 'step' : undefined}
              onClick={() => onStep(i + 1)}
            >
              {m.san}
            </button>
          </li>
        ))}
      </ol>
      <div className={styles.feedbackActions}>
        <button type="button" onClick={() => onStep(0)} disabled={step === 0}>
          ⏮
        </button>
        <button type="button" onClick={() => onStep(step - 1)} disabled={step === 0}>
          ◀ 이전
        </button>
        <button type="button" onClick={() => onStep(step + 1)} disabled={step >= total}>
          다음 ▶
        </button>
        <button type="button" onClick={onClose}>
          닫기
        </button>
      </div>
      <p className={styles.small}>← → 키로도 움직일 수 있어요. 체스판에 이 수순이 보여요.</p>
    </div>
  );
}
