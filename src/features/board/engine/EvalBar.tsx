import { formatScore, whiteWinPercent, type Score } from '../../../core/engine';
import type { Orientation } from '../Board';
import styles from './EvalBar.module.css';

interface EvalBarProps {
  score: Score | null;
  orientation: Orientation;
  /** 게임이 끝났을 때 점수 대신 보여줄 결과 (예: "1-0") */
  result?: '1-0' | '0-1' | '1/2-1/2';
}

function barPercent(score: Score | null, result: EvalBarProps['result']): number {
  if (result === '1-0') return 100;
  if (result === '0-1') return 0;
  if (result) return 50;
  return score ? whiteWinPercent(score) : 50;
}

export function EvalBar({ score, orientation, result }: EvalBarProps) {
  const whitePercent = barPercent(score, result);
  const whiteAhead = whitePercent >= 50;
  const label = result ?? (score ? formatScore(score) : '');
  // 라벨은 우세한 쪽 끝에 표시한다.
  const labelAtBottom = whiteAhead === (orientation === 'white');

  return (
    <div
      className={`${styles.bar} ${orientation === 'black' ? styles.flipped : ''}`}
      role="meter"
      aria-label="평가 막대 (백 승리 확률)"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(whitePercent)}
      aria-valuetext={label || '평가 없음'}
    >
      <div className={styles.white} style={{ height: `${whitePercent}%` }} />
      {label && (
        <span
          className={`${styles.label} ${labelAtBottom ? styles.bottom : styles.top} ${
            whiteAhead ? styles.onWhite : styles.onBlack
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
