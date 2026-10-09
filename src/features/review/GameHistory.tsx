import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { describeEndReason, resultFor } from '../../core/chess';
import { getLevel } from '../../core/engine';
import { gamesRepo } from '../../db/repos/games';
import type { GameRecord } from '../../db/schema';
import { formatDateTime } from '../../shared/format';
import styles from './Review.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error' } | { kind: 'loaded'; games: GameRecord[] };

const RESULT_LABEL = { win: '승', loss: '패', draw: '무', ongoing: '진행 중' } as const;

export function GameHistory() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    gamesRepo
      .list()
      .then((games) => !cancelled && setState({ kind: 'loaded', games }))
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function remove(game: GameRecord) {
    if (!window.confirm('이 대국 기록을 삭제할까요? 되돌릴 수 없어요.')) return;
    await gamesRepo.remove(game.id);
    setReloadToken((t) => t + 1);
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>게임 리뷰</h1>
      <p className={styles.muted}>
        지난 대국을 골라 다시 볼 수 있어요. 수마다 평가해 주는 리뷰 기능은 다음 단계(Phase 4)에서
        추가돼요.
      </p>

      {state.kind === 'loading' && <p className={styles.muted}>불러오는 중…</p>}
      {state.kind === 'error' && <p className={styles.error}>대국 기록을 불러오지 못했어요.</p>}
      {state.kind === 'loaded' && state.games.length === 0 && (
        <div className={styles.empty}>
          <p>아직 둔 대국이 없어요.</p>
          <Link to="/play">AI와 첫 대국 두러 가기 →</Link>
        </div>
      )}

      {state.kind === 'loaded' && state.games.length > 0 && (
        <ul className={styles.gameList}>
          {state.games.map((game) => {
            const mine = resultFor(game.result, game.playerColor);
            const href = game.status === 'playing' ? '/play' : `/review/${game.id}`;
            return (
              <li key={game.id} className={styles.gameItem}>
                <Link to={href} className={styles.gameLink}>
                  <span className={`${styles.resultBadge} ${styles[mine]}`}>
                    {RESULT_LABEL[mine]}
                  </span>
                  <span className={styles.gameMain}>
                    <strong>
                      vs 레벨 {game.aiLevel} ({getLevel(game.aiLevel).label})
                    </strong>
                    <span className={styles.muted}>
                      {game.playerColor === 'w' ? '백' : '흑'} ·{' '}
                      {Math.ceil(game.movesUci.length / 2)}수
                      {game.endReason && ` · ${describeEndReason(game.endReason)}`}
                      {game.practice && ' · 연습'}
                    </span>
                  </span>
                  <span className={styles.gameDate}>{formatDateTime(game.createdAt)}</span>
                </Link>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => remove(game)}
                  aria-label="대국 기록 삭제"
                  title="삭제"
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
