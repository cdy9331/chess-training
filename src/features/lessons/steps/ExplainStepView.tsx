import type { ExplainStep } from '../../../core/lessons';
import { Board } from '../../board/Board';
import styles from '../Lessons.module.css';
import { toBoardArrows } from './lessonArrows';

export function ExplainStepView({ step }: { step: ExplainStep }) {
  const text = (
    <div className={styles.textBox}>
      <h2 className={styles.stepTitle}>{step.title}</h2>
      {step.text.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
  if (!step.fen) return text;
  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <Board
          fen={step.fen}
          orientation="white"
          interactive={false}
          arrows={toBoardArrows(step.arrows)}
          highlightSquares={step.highlights}
        />
      </div>
      <aside className={styles.panel}>{text}</aside>
    </div>
  );
}
