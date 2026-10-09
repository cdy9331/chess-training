import { lineFromUcis, START_FEN } from '../chess';
import { EngineClient, type EngineTransport } from '../engine';
import { cacheKey, reviewGame, type EvalCache, type PositionEval, type ReviewProgress } from '.';

/** 'go'를 받으면 바로 점수 0과 첫 번째 합법 수(e2e4/e7e5)를 돌려주는 가짜 엔진 */
class AutoEngine implements EngineTransport {
  searches = 0;
  private listener: (line: string) => void = () => {};
  private lastFen = '';
  send(command: string) {
    const reply = (line: string) => queueMicrotask(() => this.listener(line));
    if (command === 'uci') reply('uciok');
    else if (command === 'isready') reply('readyok');
    else if (command.startsWith('position fen ')) this.lastFen = command.slice(13);
    else if (command.startsWith('go')) {
      this.searches += 1;
      const move = this.lastFen.includes(' w ') ? 'e2e4' : 'e7e5';
      reply(`info depth 14 score cp 20 pv ${move}`);
      reply(`bestmove ${move}`);
    }
  }
  onLine(listener: (line: string) => void) {
    this.listener = listener;
  }
  onError() {}
  terminate() {}
}

function memoryCache(): EvalCache & { store: Map<string, PositionEval> } {
  const store = new Map<string, PositionEval>();
  return {
    store,
    get: async (key) => store.get(key),
    set: async (key, value) => void store.set(key, value),
  };
}

// 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
const LINE = lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6', 'h5f7']);

describe('reviewGame', () => {
  it('모든 국면을 분석하고 진행률을 알린다. 메이트된 마지막 국면은 엔진에 묻지 않는다', async () => {
    const engine = new AutoEngine();
    const progress: ReviewProgress[] = [];
    const review = await reviewGame(new EngineClient(() => engine), LINE, {
      onProgress: (p) => progress.push(p),
    });
    expect(review.evals).toHaveLength(8);
    expect(review.evals[7]).toEqual({ kind: 'mated', winner: 'w' });
    expect(engine.searches).toBe(7);
    expect(progress.at(-1)).toEqual({ done: 8, total: 8 });
    expect(review.moves).toHaveLength(7);
    expect(review.moves[0]?.classification).toBe('best'); // e4 = 엔진 추천 수
  });

  it('캐시에 있는 국면은 다시 분석하지 않는다', async () => {
    const cache = memoryCache();
    await reviewGame(new EngineClient(() => new AutoEngine()), LINE, { cache });
    expect(cache.store.has(cacheKey(START_FEN, 14))).toBe(true);

    const engine = new AutoEngine();
    await reviewGame(new EngineClient(() => engine), LINE, { cache });
    expect(engine.searches).toBe(0);
  });

  it('취소하면 중단된다', async () => {
    const controller = new AbortController();
    const promise = reviewGame(new EngineClient(() => new AutoEngine()), LINE, {
      signal: controller.signal,
      onProgress: ({ done }) => {
        if (done === 2) controller.abort();
      },
    });
    await expect(promise).rejects.toBeDefined();
  });
});
