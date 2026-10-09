import { sideToMove } from '../chess/fen';
import { normalizeScore, type Score } from './score';
import { parseUciLine, type UciInfo } from './uci';

/**
 * 엔진 프로세스와 문자열을 주고받는 통로. 브라우저에서는 Web Worker를 감싸서 만들고,
 * 테스트에서는 가짜 구현을 넣는다 (core는 Worker에 직접 의존하지 않는다).
 */
export interface EngineTransport {
  send(command: string): void;
  onLine(listener: (line: string) => void): void;
  onError(listener: (error: unknown) => void): void;
  terminate(): void;
}

export interface SearchLimits {
  depth?: number;
  movetimeMs?: number;
  /** 몇 개의 후보 수를 함께 분석할지 (기본 1) */
  multipv?: number;
}

export interface AnalysisLine {
  multipv: number;
  depth: number;
  /** 백 관점 점수 */
  score: Score;
  /** UCI 수순 */
  pv: string[];
}

export interface AnalysisResult {
  fen: string;
  bestMoveUci: string | null;
  /** multipv 순서로 정렬된 최종 후보 수순 */
  lines: AnalysisLine[];
}

export interface AnalyzeOptions extends SearchLimits {
  signal?: AbortSignal;
  onUpdate?: (lines: AnalysisLine[]) => void;
}

interface ActiveSearch {
  fen: string;
  lines: Map<number, AnalysisLine>;
  options: AnalyzeOptions;
  resolve: (result: AnalysisResult) => void;
  reject: (error: unknown) => void;
  aborted: boolean;
}

export class EngineAbortedError extends Error {
  constructor() {
    super('엔진 분석이 취소되었습니다.');
    this.name = 'EngineAbortedError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof EngineAbortedError;
}

/**
 * UCI 엔진 래퍼.
 * - 탐색은 한 번에 하나씩 순서대로 실행한다 (큐).
 * - 진행 중인 탐색을 취소하면 'stop'을 보내고, 그 탐색의 bestmove가 올 때까지 기다린 뒤
 *   다음 탐색을 시작한다. 그래서 이전 탐색 결과가 다음 탐색에 섞이지 않는다.
 */
export class EngineClient {
  private readonly transport: EngineTransport;
  private readonly waiters: { type: 'uciok' | 'readyok'; resolve: () => void }[] = [];
  private initPromise: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private active: ActiveSearch | null = null;
  private currentMultipv = 1;
  private fatalError: unknown = null;
  private terminated = false;

  constructor(createTransport: () => EngineTransport) {
    this.transport = createTransport();
    this.transport.onLine((chunk) => {
      // 한 메시지에 여러 줄이 올 수 있다.
      for (const line of chunk.split('\n')) if (line.trim()) this.handleLine(line);
    });
    this.transport.onError((error) => this.fail(error));
  }

  init(): Promise<void> {
    this.initPromise ??= (async () => {
      await this.request('uci', 'uciok');
      await this.request('isready', 'readyok');
    })();
    return this.initPromise;
  }

  /** 다음 탐색 전에 적용된다. */
  async setOption(name: string, value: string | number | boolean): Promise<void> {
    await this.enqueue(async () => {
      this.transport.send(`setoption name ${name} value ${value}`);
      await this.request('isready', 'readyok');
    });
  }

  /** 새 게임을 시작함을 알린다 (이전 게임의 탐색 정보를 버린다). */
  async newGame(): Promise<void> {
    await this.enqueue(async () => {
      this.transport.send('ucinewgame');
      await this.request('isready', 'readyok');
    });
  }

  analyze(fen: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
    const { signal } = options;
    if (signal?.aborted) return Promise.reject(new EngineAbortedError());

    return this.enqueue(
      () =>
        new Promise<AnalysisResult>((resolve, reject) => {
          if (signal?.aborted) {
            reject(new EngineAbortedError());
            return;
          }
          const search: ActiveSearch = {
            fen,
            lines: new Map(),
            options,
            resolve,
            reject,
            aborted: false,
          };
          this.active = search;
          signal?.addEventListener('abort', () => this.abortSearch(search), { once: true });

          const multipv = Math.max(1, options.multipv ?? 1);
          if (multipv !== this.currentMultipv) {
            this.transport.send(`setoption name MultiPV value ${multipv}`);
            this.currentMultipv = multipv;
          }
          this.transport.send(`position fen ${fen}`);
          this.transport.send(buildGoCommand(options));
        }),
    );
  }

  /** 진행 중인 탐색을 멈춘다 (결과는 그때까지의 최선으로 정상 반환된다). */
  stop(): void {
    if (this.active) this.transport.send('stop');
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.fail(new EngineAbortedError());
    this.transport.terminate();
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      if (this.fatalError) throw this.fatalError;
      await this.init();
      return task();
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private request(command: string, expect: 'uciok' | 'readyok'): Promise<void> {
    if (this.fatalError) return Promise.reject(this.fatalError);
    return new Promise((resolve) => {
      this.waiters.push({ type: expect, resolve });
      this.transport.send(command);
    });
  }

  private abortSearch(search: ActiveSearch) {
    if (search.aborted || this.active !== search) return;
    search.aborted = true;
    this.transport.send('stop'); // bestmove가 오면 handleLine에서 reject 처리
  }

  private handleLine(line: string) {
    const message = parseUciLine(line);
    switch (message.type) {
      case 'uciok':
      case 'readyok': {
        const index = this.waiters.findIndex((w) => w.type === message.type);
        if (index >= 0) this.waiters.splice(index, 1)[0]?.resolve();
        return;
      }
      case 'info':
        this.handleInfo(message.info);
        return;
      case 'bestmove': {
        const search = this.active;
        if (!search) return;
        this.active = null;
        if (search.aborted) {
          search.reject(new EngineAbortedError());
          return;
        }
        search.resolve({
          fen: search.fen,
          bestMoveUci: message.bestmove,
          lines: sortedLines(search.lines),
        });
        return;
      }
      default:
        return;
    }
  }

  private handleInfo(info: UciInfo) {
    const search = this.active;
    if (!search || search.aborted) return;
    if (!info.score || !info.pv?.length || info.bound || info.depth === undefined) return;
    const multipv = info.multipv ?? 1;
    search.lines.set(multipv, {
      multipv,
      depth: info.depth,
      score: normalizeScore(info.score, sideToMove(search.fen)),
      pv: info.pv,
    });
    search.options.onUpdate?.(sortedLines(search.lines));
  }

  private fail(error: unknown) {
    this.fatalError ??= error;
    const search = this.active;
    this.active = null;
    search?.reject(error);
  }
}

function sortedLines(lines: Map<number, AnalysisLine>): AnalysisLine[] {
  return [...lines.values()].sort((a, b) => a.multipv - b.multipv);
}

function buildGoCommand({ depth, movetimeMs }: SearchLimits): string {
  const parts = ['go'];
  if (depth !== undefined) parts.push('depth', String(depth));
  if (movetimeMs !== undefined) parts.push('movetime', String(movetimeMs));
  if (parts.length === 1) parts.push('depth', '18');
  return parts.join(' ');
}
