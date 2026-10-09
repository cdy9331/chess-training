import { START_FEN } from '../chess';
import {
  EngineClient,
  formatScore,
  isAbortError,
  normalizeScore,
  parseUciLine,
  whiteWinPercent,
  type EngineTransport,
} from '.';

describe('parseUciLine', () => {
  it('info 줄을 해석한다', () => {
    const msg = parseUciLine(
      'info depth 12 seldepth 18 multipv 2 score cp -34 nodes 12345 nps 500000 time 25 pv e7e5 g1f3 b8c6',
    );
    expect(msg).toEqual({
      type: 'info',
      info: {
        depth: 12,
        multipv: 2,
        score: { kind: 'cp', value: -34 },
        nodes: 12345,
        nps: 500000,
        timeMs: 25,
        pv: ['e7e5', 'g1f3', 'b8c6'],
      },
    });
  });

  it('메이트 점수와 경계값 표시를 해석한다', () => {
    const msg = parseUciLine('info depth 20 score mate -3 lowerbound pv h2h3');
    expect(msg).toMatchObject({
      type: 'info',
      info: { score: { kind: 'mate', value: -3 }, bound: true },
    });
  });

  it('bestmove를 해석한다', () => {
    expect(parseUciLine('bestmove e2e4 ponder e7e5')).toEqual({
      type: 'bestmove',
      bestmove: 'e2e4',
      ponder: 'e7e5',
    });
    expect(parseUciLine('bestmove (none)')).toEqual({ type: 'bestmove', bestmove: null });
  });

  it('그 밖의 줄', () => {
    expect(parseUciLine('uciok')).toEqual({ type: 'uciok' });
    expect(parseUciLine('readyok')).toEqual({ type: 'readyok' });
    expect(parseUciLine('info string NNUE evaluation enabled')).toEqual({ type: 'info', info: {} });
    expect(parseUciLine('Stockfish 19 by the Stockfish developers').type).toBe('other');
  });
});

describe('score', () => {
  it('흑 차례의 점수는 부호를 뒤집어 백 관점으로 바꾼다', () => {
    expect(normalizeScore({ kind: 'cp', value: 50 }, 'w')).toEqual({ kind: 'cp', value: 50 });
    expect(normalizeScore({ kind: 'cp', value: 50 }, 'b')).toEqual({ kind: 'cp', value: -50 });
    expect(normalizeScore({ kind: 'mate', value: 2 }, 'b')).toEqual({ kind: 'mate', value: -2 });
    expect(Object.is(normalizeScore({ kind: 'cp', value: 0 }, 'b').value, -0)).toBe(false);
  });

  it('승률로 변환한다', () => {
    expect(whiteWinPercent({ kind: 'cp', value: 0 })).toBe(50);
    expect(whiteWinPercent({ kind: 'cp', value: 300 })).toBeGreaterThan(70);
    expect(whiteWinPercent({ kind: 'cp', value: -300 })).toBeLessThan(30);
    expect(whiteWinPercent({ kind: 'mate', value: 3 })).toBe(100);
    expect(whiteWinPercent({ kind: 'mate', value: -1 })).toBe(0);
  });

  it('화면 표시 문자열', () => {
    expect(formatScore({ kind: 'cp', value: 34 })).toBe('+0.34');
    expect(formatScore({ kind: 'cp', value: -120 })).toBe('-1.20');
    expect(formatScore({ kind: 'cp', value: 0 })).toBe('0.00');
    expect(formatScore({ kind: 'mate', value: 3 })).toBe('M3');
    expect(formatScore({ kind: 'mate', value: -2 })).toBe('-M2');
  });
});

/** 보낸 명령을 기록하고, 테스트가 엔진 응답을 흉내 낼 수 있는 가짜 통로 */
class FakeEngine implements EngineTransport {
  sent: string[] = [];
  terminated = false;
  private listener: (line: string) => void = () => {};
  private errorListener: (error: unknown) => void = () => {};

  send(command: string) {
    this.sent.push(command);
    if (command === 'uci') queueMicrotask(() => this.emit('id name Fake\nuciok'));
    if (command === 'isready') queueMicrotask(() => this.emit('readyok'));
  }
  onLine(listener: (line: string) => void) {
    this.listener = listener;
  }
  onError(listener: (error: unknown) => void) {
    this.errorListener = listener;
  }
  terminate() {
    this.terminated = true;
  }
  emit(line: string) {
    this.listener(line);
  }
  crash(error: unknown) {
    this.errorListener(error);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function setup() {
  const fake = new FakeEngine();
  const client = new EngineClient(() => fake);
  return { fake, client };
}

describe('EngineClient', () => {
  it('초기화 후 국면을 분석하고 점수를 백 관점으로 돌려준다', async () => {
    const { fake, client } = setup();
    const updates: number[] = [];
    const promise = client.analyze(BLACK_TO_MOVE, {
      depth: 10,
      multipv: 2,
      onUpdate: (lines) => updates.push(lines.length),
    });
    await flush();
    expect(fake.sent).toEqual([
      'uci',
      'isready',
      'setoption name MultiPV value 2',
      `position fen ${BLACK_TO_MOVE}`,
      'go depth 10',
    ]);

    fake.emit('info depth 10 multipv 1 score cp 30 pv e7e5 g1f3');
    fake.emit('info depth 10 multipv 2 score cp 10 upperbound pv c7c5'); // 경계값은 무시
    fake.emit('info depth 10 multipv 2 score cp 5 pv c7c5 g1f3');
    fake.emit('bestmove e7e5 ponder g1f3');

    const result = await promise;
    expect(result.bestMoveUci).toBe('e7e5');
    expect(result.lines.map((l) => [l.multipv, l.score])).toEqual([
      [1, { kind: 'cp', value: -30 }],
      [2, { kind: 'cp', value: -5 }],
    ]);
    expect(updates).toEqual([1, 2]);
  });

  it('취소된 탐색의 결과는 다음 탐색에 섞이지 않는다', async () => {
    const { fake, client } = setup();
    const controller = new AbortController();
    const first = client.analyze(START_FEN, { depth: 20, signal: controller.signal });
    const secondUpdates: string[][] = [];
    const second = client.analyze(BLACK_TO_MOVE, {
      depth: 20,
      onUpdate: (lines) => secondUpdates.push(lines[0]?.pv ?? []),
    });
    await flush();
    fake.emit('info depth 5 score cp 20 pv e2e4');

    controller.abort();
    expect(fake.sent.at(-1)).toBe('stop');
    fake.emit('info depth 6 score cp 25 pv d2d4'); // 멈추는 동안 늦게 온 출력
    fake.emit('bestmove d2d4');
    await expect(first).rejects.toSatisfy(isAbortError);

    await flush();
    expect(fake.sent.at(-1)).toBe('go depth 20');
    fake.emit('info depth 1 score cp 10 pv e7e5');
    fake.emit('bestmove e7e5');
    await expect(second).resolves.toMatchObject({ fen: BLACK_TO_MOVE, bestMoveUci: 'e7e5' });
    expect(secondUpdates).toEqual([['e7e5']]);
  });

  it('시작 전에 취소된 요청은 엔진에 보내지 않는다', async () => {
    const { fake, client } = setup();
    const controller = new AbortController();
    const first = client.analyze(START_FEN, { depth: 5 });
    const second = client.analyze(BLACK_TO_MOVE, { depth: 5, signal: controller.signal });
    controller.abort();
    await flush();
    fake.emit('bestmove e2e4');
    await first;
    await expect(second).rejects.toSatisfy(isAbortError);
    expect(fake.sent.filter((c) => c.startsWith('position'))).toHaveLength(1);
  });

  it('메이트 국면은 bestmove null을 돌려준다', async () => {
    const { fake, client } = setup();
    const promise = client.analyze(START_FEN);
    await flush();
    expect(fake.sent.at(-1)).toBe('go depth 18');
    fake.emit('info depth 0 score mate 0');
    fake.emit('bestmove (none)');
    await expect(promise).resolves.toMatchObject({ bestMoveUci: null, lines: [] });
  });

  it('엔진 오류나 종료 시 진행 중인 탐색을 실패 처리한다', async () => {
    const { fake, client } = setup();
    const promise = client.analyze(START_FEN);
    await flush();
    fake.crash(new Error('wasm 로딩 실패'));
    await expect(promise).rejects.toThrow('wasm 로딩 실패');
    await expect(client.analyze(START_FEN)).rejects.toThrow('wasm 로딩 실패');

    const other = setup();
    const pending = other.client.analyze(START_FEN);
    await flush();
    other.client.terminate();
    await expect(pending).rejects.toSatisfy(isAbortError);
    expect(other.fake.terminated).toBe(true);
  });
});
