import styles from './Dashboard.module.css';

const WIDTH = 320;
const HEIGHT = 110;
const PAD = 6;
/** 너무 많으면 선이 빽빽해지므로 최근 기록만 그린다 */
const MAX_POINTS = 60;

interface RatingChartProps {
  ratings: readonly { at: number; rating: number }[];
}

/** 퍼즐 레이팅 추이 (시작 레이팅 → 최근 풀이들) */
export function RatingChart({ ratings }: RatingChartProps) {
  const values = ratings.slice(-MAX_POINTS).map((r) => r.rating);
  if (values.length < 2) {
    return <p className={styles.small}>퍼즐을 2개 이상 풀면 레이팅 그래프가 나타나요.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 50);
  const mid = (min + max) / 2;
  const x = (i: number) => PAD + (i / (values.length - 1)) * (WIDTH - PAD * 2);
  const y = (v: number) => HEIGHT / 2 - ((v - mid) / span) * (HEIGHT - PAD * 2);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1] ?? 0;

  return (
    <figure className={styles.chart}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`최근 퍼즐 ${values.length}개의 레이팅 변화: ${Math.round(values[0] ?? 0)}에서 ${Math.round(last)}`}
      >
        <polyline points={points} className={styles.chartLine} />
        <circle cx={x(values.length - 1)} cy={y(last)} r={3.5} className={styles.chartDot} />
      </svg>
      <figcaption className={styles.small}>
        최근 {values.length}문제 · 최저 {Math.round(min)} · 최고 {Math.round(max)}
      </figcaption>
    </figure>
  );
}
