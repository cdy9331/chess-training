import type { MouseEvent } from 'react';
import { evalWhitePercent, type GameReview } from '../../core/review';
import styles from './Review.module.css';

const WIDTH = 600;
const HEIGHT = 120;
/** 그래프 위아래가 꽉 차지 않게 승률을 이 범위 안으로 그린다 */
const PAD = 4;

/** SVG 안에서는 CSS 변수를 fill 속성에 쓸 수 없어 style로 지정한다. */
const DOT_STYLE = {
  inaccuracy: { fill: 'var(--color-inaccuracy)' },
  mistake: { fill: 'var(--color-mistake)' },
  blunder: { fill: 'var(--color-blunder)' },
} as const;

interface EvalGraphProps {
  review: GameReview;
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

/** 수순에 따른 백의 승률 그래프. 클릭하면 그 수로 이동한다. */
export function EvalGraph({ review, currentPly, onSelectPly }: EvalGraphProps) {
  const plies = review.evals.length - 1;
  const step = plies > 0 ? WIDTH / plies : WIDTH;
  const x = (ply: number) => ply * step;
  const y = (whitePercent: number) => PAD + ((100 - whitePercent) / 100) * (HEIGHT - PAD * 2);

  const points = review.evals.map((e, ply) => `${x(ply)},${y(evalWhitePercent(e))}`);
  const area = `0,${HEIGHT} ${points.join(' ')} ${x(plies)},${HEIGHT}`;

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    onSelectPly(Math.max(0, Math.min(plies, Math.round(ratio * plies))));
  }

  const marked = review.moves.filter((m) => m.classification in DOT_STYLE);

  return (
    <svg
      className={styles.graph}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      onClick={handleClick}
      role="img"
      aria-label="평가 그래프: 흰 영역이 넓을수록 백이 유리해요. 누르면 그 수로 이동해요."
    >
      <rect width={WIDTH} height={HEIGHT} className={styles.graphBlack} />
      <polygon points={area} className={styles.graphWhite} />
      <line x1={0} x2={WIDTH} y1={HEIGHT / 2} y2={HEIGHT / 2} className={styles.graphMid} />
      <line
        x1={x(currentPly)}
        x2={x(currentPly)}
        y1={0}
        y2={HEIGHT}
        className={styles.graphCursor}
      />
      {marked.map((m) => {
        const e = review.evals[m.ply];
        if (!e) return null;
        return (
          <circle
            key={m.ply}
            cx={x(m.ply)}
            cy={y(evalWhitePercent(e))}
            r={4}
            style={DOT_STYLE[m.classification as keyof typeof DOT_STYLE]}
            className={styles.graphDot}
          />
        );
      })}
    </svg>
  );
}
