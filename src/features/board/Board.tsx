import type { CSSProperties, RefObject } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  /** 강조할 칸 (예: 퍼즐 힌트로 움직일 기물) */
  highlightSquares?: readonly string[];
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
  highlight: { boxShadow: 'inset 0 0 0 4px var(--board-highlight)' },
  mark: { backgroundColor: 'var(--board-mark)' },
} satisfies Record<string, CSSProperties>;

const NO_MARKS: readonly string[] = [];

/**
 * 체스판이 실제로 화면에 크기를 가지고 있는가.
 * react-chessboard는 기물 이동 애니메이션 때 칸 너비를 재는데, 너비가 0이면(숨겨진 탭/창,
 * 크기 0인 레이아웃) 'Square width not found' 예외를 던져 페이지 전체가 멈춘다.
 * 그래서 크기가 0인 동안에는 애니메이션을 끈다.
 */
function useHasSize(ref: RefObject<HTMLElement | null>): boolean {
  // 확인 전에는 "크기 없음"으로 본다 (숨겨진 창에서는 ResizeObserver 알림이 오지 않을 수 있다).
  // (ResizeObserver가 없는 테스트 환경에서는 그냥 크기가 있다고 본다)
  const [hasSize, setHasSize] = useState(() => typeof ResizeObserver === 'undefined');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setHasSize(el.getBoundingClientRect().width > 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    document.addEventListener('visibilitychange', measure);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', measure);
    };
  }, [ref]);
  return hasSize;
}

export function Board({
  fen,
  orientation = 'white',
  onMove,
  interactive = true,
  lastMoveUci,
  arrows,
  highlightSquares,
}: BoardProps) {
  // 선택 상태는 어떤 국면에서 만든 것인지 함께 저장해, 국면이 바뀌면 자동으로 무효가 되게 한다.
  const [selection, setSelection] = useState<{ fen: string; square: Square } | null>(null);
  const [pending, setPending] = useState<PendingPromotion | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasSize = useHasSize(wrapperRef);
  // 우클릭으로 표시한 칸 (생각을 정리하는 용도). 국면이 바뀌면 사라진다.
  const [marks, setMarks] = useState<{ fen: string; squares: readonly string[] }>({
    fen,
    squares: [],
  });
  const markedSquares = marks.fen === fen ? marks.squares : NO_MARKS;

  function toggleMark(square: string) {
    setMarks((m) => {
      const current = m.fen === fen ? m.squares : [];
      return {
        fen,
        squares: current.includes(square)
          ? current.filter((s) => s !== square)
          : [...current, square],
      };
    });
  }

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
    for (const square of markedSquares) {
      result[square] = { ...result[square], ...SQUARE_STYLES.mark };
    }
    for (const square of highlightSquares ?? []) {
      result[square] = { ...result[square], ...SQUARE_STYLES.highlight };
    }
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
  }, [fen, lastMoveUci, selected, targets, highlightSquares, markedSquares]);

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
    showAnimations: hasSize,
    canDragPiece: ({ piece }) => canMove && ownsPiece(piece.pieceType),
    onPieceDrag: () => setSelection(null),
    onPieceDrop: ({ sourceSquare, targetSquare }) => {
      if (!canMove || !targetSquare || sourceSquare === targetSquare) return false;
      return tryMove(sourceSquare as Square, targetSquare as Square);
    },
    // 우클릭: 칸 표시 켜기/끄기, 우클릭 드래그: 화살표(라이브러리 기능), 왼쪽 클릭: 표시 지우기
    onSquareRightClick: ({ square }) => toggleMark(square),
    onSquareClick: ({ piece, square }) => {
      if (markedSquares.length > 0) setMarks({ fen, squares: [] });
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
    <div className={styles.wrapper} ref={wrapperRef}>
      <Chessboard options={options} />
      {pendingPromotion && <PromotionDialog color={turn} onChoose={choosePromotion} />}
      <p className={styles.markHelp}>
        🖱 우클릭: 칸 표시 · 우클릭 후 끌기: 화살표 · 왼쪽 클릭: 지우기
      </p>
    </div>
  );
}
