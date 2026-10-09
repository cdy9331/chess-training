import { useCallback, useRef } from 'react';
import {
  applyLevel,
  chooseAiMove,
  type EngineClient,
  type LevelConfig,
  type Score,
} from '../../../core/engine';
import { useLazyEngineClient } from './useLazyEngineClient';

/** AI 상대 엔진. 레벨 설정은 엔진을 처음 쓸 때 한 번 적용된다. */
export function useAiOpponent(config: LevelConfig) {
  const { getClient, discard } = useLazyEngineClient();
  // 엔진이 새로 만들어지면(StrictMode 재마운트, 오류 후 재생성) 레벨을 다시 적용해야 한다.
  const appliedRef = useRef(new WeakMap<EngineClient, Promise<void>>());

  const readyClient = useCallback(async () => {
    const client = getClient();
    let applied = appliedRef.current.get(client);
    if (!applied) {
      applied = applyLevel(client, config);
      appliedRef.current.set(client, applied);
    }
    await applied;
    return client;
  }, [getClient, config]);

  const chooseMove = useCallback(
    async (fen: string, signal: AbortSignal): Promise<string | null> => {
      const client = await readyClient();
      try {
        return await chooseAiMove(client, fen, config, Math.random, signal);
      } catch (error) {
        if (!signal.aborted) discard(client);
        throw error;
      }
    },
    [readyClient, config, discard],
  );

  /** 무승부 제안 판단용 평가 (백 관점) */
  const evaluate = useCallback(
    async (fen: string): Promise<Score | null> => {
      const client = await readyClient();
      const result = await client.analyze(fen, { depth: 12, multipv: 1 });
      return result.lines[0]?.score ?? null;
    },
    [readyClient],
  );

  return { chooseMove, evaluate };
}
