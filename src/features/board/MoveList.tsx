import { useEffect, useRef } from 'react';
import type { PlayedMove } from '../../core/chess';
import styles from './MoveList.module.css';

interface MoveListProps {
  startFen: string;
  moves: readonly PlayedMove[];
  /** 현재 보고 있는 ply (0 = 시작 국면) */
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

interface MoveRow {
  number: number;
  white?: { san: string; ply: number };
  black?: { san: string; ply: number };
}

function buildRows(startFen: string, moves: readonly PlayedMove[]): MoveRow[] {
  const [, side, , , , fullmove] = startFen.split(/\s+/);
  let number = Number(fullmove) || 1;
  let whiteToMove = side !== 'b';
  const rows: MoveRow[] = [];
  let row: MoveRow | null = null;

  moves.forEach((move, index) => {
    const entry = { san: move.san, ply: index + 1 };
    if (whiteToMove) {
      row = { number, white: entry };
      rows.push(row);
    } else {
      if (!row) {
        row = { number };
        rows.push(row);
      }
      row.black = entry;
      row = null;
      number += 1;
    }
    whiteToMove = !whiteToMove;
  });
  return rows;
}

export function MoveList({ startFen, moves, currentPly, onSelectPly }: MoveListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // scrollIntoView는 페이지 전체까지 스크롤하므로, 기보 상자 안에서만 스크롤한다.
  useEffect(() => {
    const list = listRef.current;
    const active = activeRef.current;
    if (!list) return;
    if (!active) {
      list.scrollTop = 0;
      return;
    }
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }, [currentPly, moves.length]);

  if (moves.length === 0) {
    return <p className={styles.empty}>아직 둔 수가 없어요. 체스판에서 기물을 움직여 보세요.</p>;
  }

  const renderMove = (entry: MoveRow['white']) => {
    if (!entry) return <span className={styles.cell}>…</span>;
    const active = entry.ply === currentPly;
    return (
      <button
        type="button"
        ref={active ? activeRef : undefined}
        className={`${styles.cell} ${styles.move} ${active ? styles.active : ''}`}
        aria-current={active ? 'step' : undefined}
        onClick={() => onSelectPly(entry.ply)}
      >
        {entry.san}
      </button>
    );
  };

  return (
    <ol ref={listRef} className={styles.list} aria-label="기보">
      {buildRows(startFen, moves).map((row) => (
        <li key={row.number} className={styles.row}>
          <span className={styles.number}>{row.number}.</span>
          {renderMove(row.white)}
          {row.black && renderMove(row.black)}
        </li>
      ))}
    </ol>
  );
}
