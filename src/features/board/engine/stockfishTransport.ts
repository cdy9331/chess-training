import type { EngineTransport } from '../../../core/engine';

// scripts/copy-engine.ts가 public/engine/에 복사한 파일. 같은 이름의 .wasm을 엔진이 스스로 찾는다.
const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;

export function createStockfishTransport(): EngineTransport {
  const worker = new Worker(ENGINE_URL);
  return {
    send: (command) => worker.postMessage(command),
    onLine: (listener) => {
      worker.onmessage = (event: MessageEvent<unknown>) => listener(String(event.data));
    },
    onError: (listener) => {
      worker.onerror = (event) => {
        event.preventDefault();
        listener(new Error(event.message || '엔진 파일을 불러오지 못했어요.'));
      };
    },
    terminate: () => worker.terminate(),
  };
}
