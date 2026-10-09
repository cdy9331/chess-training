import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { describeEndReason, lineFromUcis, resultFor } from '../../core/chess';
import { getLevel } from '../../core/engine';
import { gamesRepo } from '../../db/repos/games';
import type { GameRecord } from '../../db/schema';
import { Board } from '../board/Board';
import { MoveList } from '../board/MoveList';
import { useChessGame } from '../board/useChessGame';
import { useMoveNavigationKeys } from '../board/useMoveNavigationKeys';
import { formatDateTime } from '../../shared/format';
import styles from './Review.module.css';

type LoadState = { kind: 'loading' } | { kind: 'missing' } | { kind: 'loaded'; game: GameRecord };

export function GameReplay({ gameId }: { gameId: number }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    gamesRepo
      .get(gameId)
      .then((game) => !cancelled && setState(game ? { kind: 'loaded', game } : { kind: 'missing' }))
      .catch(() => !cancelled && setState({ kind: 'missing' }));
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (state.kind === 'loading') return <p className={styles.muted}>불러오는 중…</p>;
  if (state.kind === 'missing') {
    return (
      <section className={styles.page}>
        <h1 className={styles.title}>대국을 찾을 수 없어요</h1>
        <Link to="/review">← 대국 목록으로</Link>
      </section>
    );
  }
  return <Replay game={state.game} />;
}

function Replay({ game }: { game: GameRecord }) {
  const line = useMemo(() => lineFromUcis(game.startFen, game.movesUci), [game]);
  const replay = useChessGame(line);
  useMoveNavigationKeys({
    first: replay.goFirst,
    prev: replay.goPrev,
    next: replay.goNext,
    last: replay.goLast,
  });
  const mine = resultFor(game.result, game.playerColor);

  return (
    <section className={styles.page}>
      <Link to="/review">← 대국 목록</Link>
      <h1 className={styles.title}>
        vs 레벨 {game.aiLevel} ({getLevel(game.aiLevel).label})
      </h1>
      <p className={styles.muted}>
        {formatDateTime(game.createdAt)} · {game.playerColor === 'w' ? '백' : '흑'} · 결과{' '}
        {game.result}
        {mine !== 'ongoing' &&
          ` (${mine === 'win' ? '승리' : mine === 'loss' ? '패배' : '무승부'})`}
        {game.endReason && ` · ${describeEndReason(game.endReason)}`}
      </p>
      <p className={styles.notice}>
        수마다 좋은 수·실수를 알려주는 리뷰는 다음 단계(Phase 4)에서 추가돼요. 지금은 수순을 다시 볼
        수 있어요.
      </p>

      <div className={styles.layout}>
        <div className={styles.boardColumn}>
          <Board
            fen={replay.fen}
            orientation={game.playerColor === 'w' ? 'white' : 'black'}
            lastMoveUci={replay.lastMoveUci}
            interactive={false}
          />
        </div>
        <aside className={styles.panel}>
          <MoveList
            startFen={line.startFen}
            moves={line.moves}
            currentPly={replay.ply}
            onSelectPly={replay.goTo}
          />
          <div className={styles.navButtons}>
            <button type="button" onClick={replay.goFirst} disabled={replay.ply === 0}>
              ⏮
            </button>
            <button type="button" onClick={replay.goPrev} disabled={replay.ply === 0}>
              ◀
            </button>
            <button type="button" onClick={replay.goNext} disabled={replay.isAtEnd}>
              ▶
            </button>
            <button type="button" onClick={replay.goLast} disabled={replay.isAtEnd}>
              ⏭
            </button>
          </div>
          {game.pgn && (
            <details>
              <summary>PGN 보기</summary>
              <textarea
                readOnly
                value={game.pgn}
                rows={8}
                className={styles.pgn}
                onFocus={(e) => e.currentTarget.select()}
              />
            </details>
          )}
        </aside>
      </div>
    </section>
  );
}
