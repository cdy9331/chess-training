import { useCallback, useEffect, useRef } from 'react';
import { EngineClient } from '../../../core/engine';
import { createStockfishTransport } from './stockfishTransport';

/**
 * 처음 필요할 때 엔진을 만들고, 컴포넌트가 사라지면 종료하는 훅.
 * 같은 화면에서 용도가 다른 엔진(예: AI 상대 / 힌트)은 각각 이 훅을 써서 따로 만든다.
 * 엔진 옵션(강도 제한 등)이 서로 영향을 주지 않게 하기 위해서다.
 */
export function useLazyEngineClient(): {
  getClient: () => EngineClient;
  /** 고장 난 엔진을 버리고 다음 호출 때 새로 만든다. */
  discard: (client: EngineClient) => void;
} {
  const clientRef = useRef<EngineClient | null>(null);

  useEffect(() => {
    return () => {
      clientRef.current?.terminate();
      clientRef.current = null;
    };
  }, []);

  const getClient = useCallback(
    () => (clientRef.current ??= new EngineClient(createStockfishTransport)),
    [],
  );

  const discard = useCallback((client: EngineClient) => {
    client.terminate();
    if (clientRef.current === client) clientRef.current = null;
  }, []);

  return { getClient, discard };
}
