import { useEffect, useRef, useState } from 'react';
import { EngineClient, isAbortError, type AnalysisLine } from '../../../core/engine';
import { createStockfishTransport } from './stockfishTransport';

export type EngineStatus = 'off' | 'analyzing' | 'done' | 'error';

export interface EngineAnalysis {
  status: EngineStatus;
  /** 현재 fen에 대한 후보 수순 (multipv 순) */
  lines: AnalysisLine[];
  depth: number;
  error: string | null;
}

interface Options {
  enabled: boolean;
  multipv?: number;
  depth?: number;
}

interface ResultState {
  fen: string;
  lines: AnalysisLine[];
  done: boolean;
  error: string | null;
}

/** 화면 갱신이 너무 잦지 않도록 중간 결과는 이 간격으로만 반영한다. */
const UPDATE_INTERVAL_MS = 120;

/**
 * fen이 바뀔 때마다 Stockfish로 분석한다. 이전 국면의 분석은 즉시 취소되고,
 * 컴포넌트가 사라지면 엔진 Worker도 종료된다.
 */
export function useEngineAnalysis(
  fen: string,
  { enabled, multipv = 3, depth = 18 }: Options,
): EngineAnalysis {
  const clientRef = useRef<EngineClient | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    return () => {
      clientRef.current?.terminate();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const client = (clientRef.current ??= new EngineClient(createStockfishTransport));
    const controller = new AbortController();
    let lastUpdate = 0;

    client
      .analyze(fen, {
        depth,
        multipv,
        signal: controller.signal,
        onUpdate: (lines) => {
          const now = performance.now();
          if (now - lastUpdate < UPDATE_INTERVAL_MS) return;
          lastUpdate = now;
          setResult({ fen, lines, done: false, error: null });
        },
      })
      .then((final) => setResult({ fen, lines: final.lines, done: true, error: null }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        // 고장 난 엔진은 정리하고, 다음 시도 때 새로 만든다.
        client.terminate();
        if (clientRef.current === client) clientRef.current = null;
        setResult({
          fen,
          lines: [],
          done: true,
          error: error instanceof Error ? error.message : '엔진 오류가 발생했어요.',
        });
      });

    return () => controller.abort();
  }, [fen, enabled, multipv, depth]);

  if (!enabled) return { status: 'off', lines: [], depth: 0, error: null };
  // 아직 이 국면의 결과가 없으면 분석 중으로 보여준다 (이전 국면의 결과는 쓰지 않는다).
  const current = result?.fen === fen ? result : null;
  const lines = current?.lines ?? [];
  return {
    status: current?.error ? 'error' : current?.done ? 'done' : 'analyzing',
    lines,
    depth: lines[0]?.depth ?? 0,
    error: current?.error ?? null,
  };
}
