import { useState } from 'react';
import { fenToEpd } from '../../core/chess';
import {
  formatOpeningName,
  identifyOpening,
  nextBookMoves,
  type RepertoireLine,
} from '../../core/openings';
import { customLineToRepertoire, openingsRepo } from '../../db/repos/openings';
import { OpeningLabel } from '../../shared/OpeningLabel';
import { useOpeningBook } from '../../shared/useOpeningBook';
import { Board, type Orientation } from '../board/Board';
import { MoveList } from '../board/MoveList';
import { useChessGame } from '../board/useChessGame';
import { useMoveNavigationKeys } from '../board/useMoveNavigationKeys';
import styles from './Openings.module.css';

interface OpeningExplorerProps {
  /** 지금 수순을 내 라인으로 저장한 뒤 바로 연습한다 */
  onPractice: (line: RepertoireLine) => void;
}

function formatShare(share: number | null): string {
  if (share === null) return '';
  const pct = share * 100;
  return pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}

/** 수를 두면 지금 오프닝 이름과 이어지는 수(선택률 높은 순)를 보여준다. */
export function OpeningExplorer({ onPractice }: OpeningExplorerProps) {
  const book = useOpeningBook();
  const game = useChessGame();
  const [orientation, setOrientation] = useState<Orientation>('white');
  const [saveError, setSaveError] = useState(false);
  useMoveNavigationKeys({
    first: game.goFirst,
    prev: game.goPrev,
    next: game.goNext,
    last: game.goLast,
  });

  const candidates = book ? nextBookMoves(book, game.fen) : [];
  const epd = fenToEpd(game.fen);
  const known = !book || game.ply === 0 || book.has(epd) || book.count(epd) > 0;
  const stats = book?.stats;
  // 지금 보고 있는 국면까지의 수순
  const movesSan = game.line.moves.slice(0, game.ply).map((m) => m.san);

  async function practice(side: 'w' | 'b') {
    if (!book) return;
    setSaveError(false);
    const opening = identifyOpening(book, game.line, game.ply);
    const name = `${opening ? formatOpeningName(opening.name) : '내 수순'} (${movesSan.join(' ')})`;
    try {
      const record = await openingsRepo.saveCustomLine({ name, side, movesSan });
      onPractice(customLineToRepertoire(record));
    } catch {
      setSaveError(true);
    }
  }

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
        {!known && (
          <p className={styles.notice}>
            오프닝 데이터와 대국 통계에 없는 수순이에요. ◀로 돌아가 다른 수를 둬 보세요.
          </p>
        )}

        {!book && <p className={styles.muted}>오프닝 데이터를 불러오는 중…</p>}
        {candidates.length > 0 && (
          <section aria-label="다음 수 후보">
            <p className={styles.sectionTitle}>다음 수 후보 (많이 두는 순)</p>
            <ul className={styles.candidates}>
              {candidates.map((c) => (
                <li key={c.uci}>
                  <button type="button" onClick={() => game.makeMove(c.uci)}>
                    <strong className={styles.candidateSan}>{c.san}</strong>
                    <span className={styles.candidateBar} aria-hidden>
                      <span style={{ width: `${(c.share ?? 0) * 100}%` }} />
                    </span>
                    <span className={styles.candidateShare}>{formatShare(c.share)}</span>
                    <span className={styles.candidateName}>
                      {c.opening
                        ? formatOpeningName(c.opening.name)
                        : c.inBook
                          ? ''
                          : '이름 없는 수순'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {stats && (
              <p className={styles.small}>
                선택률: Lichess 대국 {stats.games.toLocaleString()}판(두 사람 모두 레이팅{' '}
                {stats.minRating} 이상) 중 이 국면에서 각 수가 둬진 비율이에요.
              </p>
            )}
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

        <section className={styles.practiceBox} aria-label="이 수순 연습하기">
          <p className={styles.sectionTitle}>📌 이 수순 연습하기</p>
          <p className={styles.small}>
            지금까지의 수순({game.ply}수)을 내 라인으로 저장하고 바로 연습해요. 저장한 라인은
            레퍼토리 연습 탭에도 나와요.
          </p>
          <div className={styles.lineActions}>
            <button type="button" onClick={() => void practice('w')} disabled={game.ply < 2}>
              ♔ 백으로 연습
            </button>
            <button type="button" onClick={() => void practice('b')} disabled={game.ply < 2}>
              ♚ 흑으로 연습
            </button>
          </div>
          {saveError && <p className={styles.notice}>저장하지 못했어요. 다시 시도해 주세요.</p>}
        </section>
      </aside>
    </div>
  );
}
