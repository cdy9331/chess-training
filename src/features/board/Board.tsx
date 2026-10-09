import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Chessboard, type ChessboardOptions } from 'react-chessboard';
import type { Square } from 'chess.js';
import {
  checkedKingSquare,
  isPromotionMove,
  legalTargets,
  legalTargetsDetailed,
  parseUci,
  sideToMove,
  toUci,
  type PromotionPiece,
} from '../../core/chess';
import styles from './Board.module.css';
import { PromotionDialog } from './PromotionDialog';

export type Orientation = 'white' | 'black';

export interface BoardProps {
  fen: string;
  orientation?: Orientation;
  /** 사용자가 합법 수를 두면 UCI로 전달된다. */
  onMove?: (uci: string) => void;
  /** false면 기물을 움직일 수 없다 (다른 수를 보고 있을 때, 상대 차례일 때 등). */
  interactive?: boolean;
  lastMoveUci?: string;
  /** 보드 위에 그릴 화살표 (예: 엔진 최선 수) */
  arrows?: BoardArrow[];
}

export interface BoardArrow {
  from: string;
  to: string;
  /** SVG에 그대로 쓰이므로 CSS 변수는 쓸 수 없다. */
  color: string;
}

interface PendingPromotion {
  fen: string;
  from: Square;
  to: Square;
}

const SQUARE_STYLES = {
  lastMove: { backgroundColor: 'var(--board-last-move)' },
  selected: { backgroundColor: 'var(--board-selected)' },
  // background 단축 속성을 쓰면 backgroundColor와 충돌 경고가 나므로 backgroundImage만 쓴다.
  target: {
    backgroundImage: 'radial-gradient(circle, var(--board-target) 22%, transparent 24%)',
  },
  captureTarget: {
    backgroundImage: 'radial-gradient(circle, transparent 58%, var(--board-target) 60%)',
  },
  check: {
    backgroundImage: 'radial-gradient(circle, var(--board-check) 0%, transparent 75%)',
  },
} satisfies Record<string, CSSProperties>;

export function Board({
  fen,
  orientation = 'white',
  onMove,
  interactive = true,
  lastMoveUci,
  arrows,
}: BoardProps) {
  // 선택 상태는 어떤 국면에서 만든 것인지 함께 저장해, 국면이 바뀌면 자동으로 무효가 되게 한다.
  const [selection, setSelection] = useState<{ fen: string; square: Square } | null>(null);
  const [pending, setPending] = useState<PendingPromotion | null>(null);

  const canMove = interactive && onMove !== undefined;
  const turn = sideToMove(fen);
  const selected = canMove && selection?.fen === fen ? selection.square : null;
  const pendingPromotion = canMove && pending?.fen === fen ? pending : null;

  const targets = useMemo(
    () => (selected ? legalTargetsDetailed(fen, selected) : []),
    [fen, selected],
  );

  function tryMove(from: Square, to: Square): boolean {
    if (!legalTargets(fen, from).includes(to)) return false;
    setSelection(null);
    if (isPromotionMove(fen, from, to)) {
      setPending({ fen, from, to });
      return false;
    }
    onMove?.(toUci(from, to));
    return true;
  }

  function choosePromotion(piece: PromotionPiece | null) {
    if (pendingPromotion && piece)
      onMove?.(toUci(pendingPromotion.from, pendingPromotion.to, piece));
    setPending(null);
  }

  const ownsPiece = (pieceType: string | undefined) => pieceType?.[0] === turn;

  const squareStyles = useMemo(() => {
    const result: Record<string, CSSProperties> = {};
    const last = lastMoveUci ? parseUci(lastMoveUci) : null;
    if (last) {
      result[last.from] = SQUARE_STYLES.lastMove;
      result[last.to] = SQUARE_STYLES.lastMove;
    }
    const checked = checkedKingSquare(fen);
    if (checked) result[checked] = { ...result[checked], ...SQUARE_STYLES.check };
    if (selected) {
      result[selected] = SQUARE_STYLES.selected;
      for (const t of targets) {
        result[t.to] = {
          ...result[t.to],
          ...(t.isCapture ? SQUARE_STYLES.captureTarget : SQUARE_STYLES.target),
        };
      }
    }
    return result;
  }, [fen, lastMoveUci, selected, targets]);

  const options: ChessboardOptions = {
    position: fen,
    boardOrientation: orientation,
    squareStyles,
    lightSquareStyle: { backgroundColor: 'var(--board-light)' },
    darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
    allowDragging: canMove,
    allowDrawingArrows: true,
    arrows: arrows?.map((a) => ({ startSquare: a.from, endSquare: a.to, color: a.color })) ?? [],
    animationDurationInMs: 200,
    canDragPiece: ({ piece }) => canMove && ownsPiece(piece.pieceType),
    onPieceDrag: () => setSelection(null),
    onPieceDrop: ({ sourceSquare, targetSquare }) => {
      if (!canMove || !targetSquare || sourceSquare === targetSquare) return false;
      return tryMove(sourceSquare as Square, targetSquare as Square);
    },
    onSquareClick: ({ piece, square }) => {
      if (!canMove || pendingPromotion) return;
      const sq = square as Square;
      if (selected && targets.some((t) => t.to === sq)) {
        tryMove(selected, sq);
      } else if (ownsPiece(piece?.pieceType) && sq !== selected) {
        setSelection({ fen, square: sq });
      } else {
        setSelection(null);
      }
    },
  };

  return (
    <div className={styles.wrapper}>
      <Chessboard options={options} />
      {pendingPromotion && <PromotionDialog color={turn} onChoose={choosePromotion} />}
    </div>
  );
}
