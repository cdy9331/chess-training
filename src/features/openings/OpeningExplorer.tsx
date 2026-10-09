import { useState } from 'react';
import { fenToEpd } from '../../core/chess';
import { formatOpeningName, nextBookMoves } from '../../core/openings';
import { OpeningLabel } from '../../shared/OpeningLabel';
import { useOpeningBook } from '../../shared/useOpeningBook';
import { Board, type Orientation } from '../board/Board';
import { MoveList } from '../board/MoveList';
import { useChessGame } from '../board/useChessGame';
import { useMoveNavigationKeys } from '../board/useMoveNavigationKeys';
import styles from './Openings.module.css';

/** 수를 두면 지금 오프닝 이름과 정석 수순 안에서 이어지는 다음 수들을 보여준다. */
export function OpeningExplorer() {
  const book = useOpeningBook();
  const game = useChessGame();
  const [orientation, setOrientation] = useState<Orientation>('white');
  useMoveNavigationKeys({
    first: game.goFirst,
    prev: game.goPrev,
    next: game.goNext,
    last: game.goLast,
  });

  const candidates = book ? nextBookMoves(book, game.fen) : [];
  const inBook = !book || game.ply === 0 || book.has(fenToEpd(game.fen));

  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <Board
          fen={game.fen}
          orientation={orientation}
          onMove={game.makeMove}
          lastMoveUci={game.lastMoveUci}
        />
      </div>
      <aside className={styles.panel}>
        <OpeningLabel line={game.line} uptoPly={game.ply} />
        {game.ply === 0 && <p className={styles.muted}>첫 수를 골라 보세요.</p>}
        {!inBook && (
          <p className={styles.notice}>
            오프닝 데이터에 없는 수순이에요. 정석에서 벗어났어요. ◀로 돌아가 다른 수를 둬 보세요.
          </p>
        )}

        {!book && <p className={styles.muted}>오프닝 데이터를 불러오는 중…</p>}
        {candidates.length > 0 && (
          <section aria-label="정석 다음 수">
            <p className={styles.sectionTitle}>정석 수순에서 이어지는 수 ({candidates.length})</p>
            <ul className={styles.candidates}>
              {candidates.map((c) => (
                <li key={c.uci}>
                  <button type="button" onClick={() => game.makeMove(c.uci)}>
                    <strong>{c.san}</strong>
                    {c.opening && (
                      <span className={styles.candidateName}>
                        {formatOpeningName(c.opening.name)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <MoveList
          startFen={game.line.startFen}
          moves={game.line.moves}
          currentPly={game.ply}
          onSelectPly={game.goTo}
        />
        <div className={styles.actions}>
          <button type="button" onClick={game.goPrev} disabled={game.ply === 0}>
            ◀ 한 수 뒤로
          </button>
          <button
            type="button"
            onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
          >
            판 뒤집기
          </button>
          <button type="button" onClick={() => game.reset()}>
            처음부터
          </button>
        </div>
      </aside>
    </div>
  );
}
