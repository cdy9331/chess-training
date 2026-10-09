import type { Color } from 'chess.js';
import type { GameReview } from '../../core/review';
import { MOVE_CLASS_ORDER, MOVE_CLASS_STYLE } from './moveClassStyle';
import styles from './Review.module.css';

interface ReviewSummaryProps {
  review: GameReview;
  player: Color;
}

function formatAccuracy(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

export function ReviewSummary({ review, player }: ReviewSummaryProps) {
  const opponent: Color = player === 'w' ? 'b' : 'w';
  return (
    <section className={styles.summary} aria-label="리뷰 요약">
      <div className={styles.accuracyRow}>
        <div className={styles.accuracyBox}>
          <span className={styles.accuracyLabel}>내 정확도</span>
          <span className={styles.accuracyValue}>{formatAccuracy(review.accuracy[player])}</span>
        </div>
        <div className={styles.accuracyBox}>
          <span className={styles.accuracyLabel}>상대 정확도</span>
          <span className={styles.accuracyValue}>{formatAccuracy(review.accuracy[opponent])}</span>
        </div>
      </div>
      <table className={styles.countTable}>
        <thead>
          <tr>
            <th scope="col">등급</th>
            <th scope="col">나</th>
            <th scope="col">상대</th>
          </tr>
        </thead>
        <tbody>
          {MOVE_CLASS_ORDER.map((c) => (
            <tr key={c}>
              <th scope="row">
                <span
                  className={styles.classBadge}
                  style={{ backgroundColor: MOVE_CLASS_STYLE[c].color }}
                >
                  {MOVE_CLASS_STYLE[c].symbol}
                </span>
                {MOVE_CLASS_STYLE[c].label}
              </th>
              <td>{review.counts[player][c]}</td>
              <td>{review.counts[opponent][c]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.small}>
        정확도는 엔진의 최선 수와 얼마나 가까웠는지를 0~100으로 나타내요.
      </p>
    </section>
  );
}
