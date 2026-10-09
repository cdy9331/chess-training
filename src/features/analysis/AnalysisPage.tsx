import { useState } from 'react';
import { describeStatus, lineToPgn } from '../../core/chess';
import { Board, type Orientation } from '../board/Board';
import { MoveList } from '../board/MoveList';
import { useChessGame } from '../board/useChessGame';
import { useMoveNavigationKeys } from '../board/useMoveNavigationKeys';
import styles from './AnalysisPage.module.css';

export function AnalysisPage() {
  const game = useChessGame();
  const [orientation, setOrientation] = useState<Orientation>('white');
  const [copied, setCopied] = useState(false);
  /** 클립보드 권한이 막혀 자동 복사에 실패했을 때 직접 복사하도록 보여줄 PGN */
  const [manualPgn, setManualPgn] = useState<string | null>(null);

  useMoveNavigationKeys({
    first: game.goFirst,
    prev: game.goPrev,
    next: game.goNext,
    last: game.goLast,
  });

  const isOver = game.status.kind !== 'ongoing';

  async function copyPgn() {
    const pgn = lineToPgn(game.line);
    try {
      await navigator.clipboard.writeText(pgn);
      setManualPgn(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setManualPgn(pgn);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>분석 보드</h1>
        <p className={styles.description}>
          백과 흑을 번갈아 직접 두어 보세요. 엔진 평가는 다음 단계(Phase 2)에서 추가돼요.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <Board
            fen={game.fen}
            orientation={orientation}
            onMove={game.makeMove}
            interactive={!isOver}
            lastMoveUci={game.lastMoveUci}
          />
        </div>

        <aside className={styles.panel}>
          <p
            className={`${styles.status} ${isOver ? styles.statusOver : ''}`}
            role="status"
            aria-live="polite"
          >
            {describeStatus(game.status)}
          </p>
          {!game.isAtEnd && (
            <p className={styles.hint}>
              이전 국면을 보고 있어요. 여기서 수를 두면 이후 수는 지워져요.
            </p>
          )}

          <MoveList
            startFen={game.line.startFen}
            moves={game.line.moves}
            currentPly={game.ply}
            onSelectPly={game.goTo}
          />

          <div className={styles.navButtons}>
            <button
              type="button"
              onClick={game.goFirst}
              disabled={game.ply === 0}
              title="처음 (Home)"
            >
              ⏮
            </button>
            <button type="button" onClick={game.goPrev} disabled={game.ply === 0} title="이전 (←)">
              ◀
            </button>
            <button type="button" onClick={game.goNext} disabled={game.isAtEnd} title="다음 (→)">
              ▶
            </button>
            <button
              type="button"
              onClick={game.goLast}
              disabled={game.isAtEnd}
              title="마지막 (End)"
            >
              ⏭
            </button>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
            >
              판 뒤집기
            </button>
            <button type="button" onClick={game.undo} disabled={game.line.moves.length === 0}>
              무르기
            </button>
            <button type="button" onClick={() => game.reset()}>
              새 게임
            </button>
            <button type="button" onClick={copyPgn} disabled={game.line.moves.length === 0}>
              {copied ? '복사했어요 ✓' : 'PGN 복사'}
            </button>
          </div>

          {manualPgn !== null && (
            <div className={styles.manualCopy}>
              <p className={styles.hint}>
                브라우저가 자동 복사를 막았어요. 아래 내용을 선택해서 직접 복사하세요 (Ctrl+C).
              </p>
              <textarea
                readOnly
                value={manualPgn}
                rows={6}
                aria-label="PGN"
                onFocus={(e) => e.currentTarget.select()}
                autoFocus
              />
              <button type="button" onClick={() => setManualPgn(null)}>
                닫기
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
