import { useEffect, useState } from 'react';
import { lineFromUcis } from '../../core/chess';
import { reviewGame, type GameReview, type ReviewProgress } from '../../core/review';
import { mistakesRepo } from '../../db/repos/mistakes';
import { engineCache, reviewsRepo } from '../../db/repos/reviews';
import { settingsRepo } from '../../db/repos/settings';
import type { GameRecord } from '../../db/schema';
import { useLazyEngineClient } from '../board/engine/useLazyEngineClient';

export type ReviewState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'analyzing'; progress: ReviewProgress }
  | { kind: 'cancelled' }
  | { kind: 'done'; review: GameReview }
  | { kind: 'error'; message: string };

/**
 * 저장된 리뷰가 있으면 바로 보여주고, 없으면 엔진으로 분석해서 저장한다.
 * 화면을 떠나면 분석이 취소되고 엔진도 종료된다 (이미 분석한 국면은 캐시에 남아 다음에 빨라진다).
 */
export function useGameReview(game: GameRecord) {
  const { getClient, discard } = useLazyEngineClient();
  const [state, setState] = useState<ReviewState>({ kind: 'loading' });
  /** 0: 저장된 리뷰 사용, 1 이상: 다시 분석 요청 */
  const [runToken, setRunToken] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  const isEmpty = game.movesUci.length === 0;

  useEffect(() => {
    if (isEmpty || cancelled) return;
    const controller = new AbortController();
    const line = lineFromUcis(game.startFen, game.movesUci);

    (async () => {
      const saved = runToken === 0 ? await reviewsRepo.get(game.id) : undefined;
      if (controller.signal.aborted) return;
      if (saved) {
        // 실수 복습이 생기기 전에 리뷰한 게임도 실수를 모아 둔다 (이미 있으면 건너뜀)
        await mistakesRepo.saveFromReview(game, saved).catch(() => 0);
        if (!controller.signal.aborted) setState({ kind: 'done', review: saved });
        return;
      }
      const depth = await settingsRepo.getReviewDepth();
      if (controller.signal.aborted) return;
      setState({ kind: 'analyzing', progress: { done: 0, total: game.movesUci.length + 1 } });
      const client = getClient();
      try {
        const review = await reviewGame(client, line, {
          depth,
          cache: engineCache,
          signal: controller.signal,
          onProgress: (progress) => {
            if (!controller.signal.aborted) setState({ kind: 'analyzing', progress });
          },
        });
        await reviewsRepo.save(game.id, review);
        await mistakesRepo.saveFromReview(game, review);
        if (!controller.signal.aborted) setState({ kind: 'done', review });
      } catch {
        if (controller.signal.aborted) return;
        discard(client);
        setState({ kind: 'error', message: '분석 중 문제가 생겼어요. 다시 시도해 주세요.' });
      }
    })().catch(() => {
      if (!controller.signal.aborted) {
        setState({ kind: 'error', message: '저장된 리뷰를 불러오지 못했어요.' });
      }
    });

    return () => controller.abort();
  }, [game, isEmpty, runToken, cancelled, getClient, discard]);

  const current: ReviewState = isEmpty
    ? { kind: 'empty' }
    : cancelled
      ? { kind: 'cancelled' }
      : state;

  return {
    state: current,
    /** 진행 중인 분석을 멈춘다 */
    cancel: () => setCancelled(true),
    /** 저장된 리뷰를 무시하고 처음부터 다시 분석한다 */
    restart: () => {
      setCancelled(false);
      setRunToken((t) => t + 1);
    },
  };
}
