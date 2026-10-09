import { defaultPieces } from 'react-chessboard';
import type { Color } from 'chess.js';
import type { PromotionPiece } from '../../core/chess';
import styles from './Board.module.css';

const CHOICES: { piece: PromotionPiece; label: string }[] = [
  { piece: 'q', label: '퀸' },
  { piece: 'r', label: '룩' },
  { piece: 'b', label: '비숍' },
  { piece: 'n', label: '나이트' },
];

interface PromotionDialogProps {
  color: Color;
  /** null이면 취소 */
  onChoose: (piece: PromotionPiece | null) => void;
}

export function PromotionDialog({ color, onChoose }: PromotionDialogProps) {
  return (
    <div className={styles.promotionOverlay} onClick={() => onChoose(null)}>
      <div
        className={styles.promotionDialog}
        role="dialog"
        aria-label="프로모션할 기물 선택"
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.promotionTitle}>폰을 어떤 기물로 바꿀까요?</p>
        <div className={styles.promotionChoices}>
          {CHOICES.map(({ piece, label }) => {
            const render = defaultPieces[`${color}${piece.toUpperCase()}`];
            return (
              <button
                key={piece}
                type="button"
                className={styles.promotionButton}
                onClick={() => onChoose(piece)}
                aria-label={label}
                title={label}
              >
                {render?.()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
