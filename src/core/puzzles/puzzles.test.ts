import {
  advance,
  bandsInRange,
  checkMove,
  createPuzzleLoader,
  expectedMove,
  glicko2,
  INITIAL_PUZZLE_RATING,
  parsePuzzleShard,
  puzzleColor,
  selectPuzzle,
  startPuzzle,
  themeName,
  updatePuzzleRating,
  type Puzzle,
  type PuzzleIndex,
} from '.';
import { seededRandom } from '../engine/strength';

// 흑이 a6을 둔 뒤 백 차례: 1. Rd8+ Rxd8 2. Rxd8# (2수 메이트)
const MATE_IN_2: Puzzle = {
  id: 'test1',
  fen: '1r4k1/p4ppp/8/8/8/8/3R1PPP/3R2K1 b - - 0 1',
  moves: ['a7a6', 'd2d8', 'b8d8', 'd1d8'],
  rating: 900,
  themes: ['mateIn2', 'backRankMate'],
};

// 흑이 a6을 둔 뒤 백 차례: Rd8# 또는 Re8# 둘 다 메이트
const MATE_IN_1: Puzzle = {
  id: 'test2',
  fen: '6k1/p4ppp/8/8/8/8/5PPP/3RR1K1 b - - 0 1',
  moves: ['a7a6', 'd1d8'],
  rating: 600,
  themes: ['mateIn1'],
};

describe('퍼즐 진행', () => {
  it('상대 첫 수를 두고 시작한다', () => {
    const progress = startPuzzle(MATE_IN_2);
    expect(progress.ply).toBe(1);
    expect(progress.fen).toContain(' w ');
    expect(puzzleColor(MATE_IN_2)).toBe('w');
    expect(expectedMove(progress)).toBe('d2d8');
  });

  it('정답이면 상대 응수까지 진행하고, 마지막 수로 풀린다', () => {
    let progress = startPuzzle(MATE_IN_2);
    const first = checkMove(progress, 'd2d8');
    expect(first.kind).toBe('continue');
    if (first.kind !== 'continue') return;
    expect(first.reply).toBe('b8d8');
    progress = advance(progress, first.fenAfterReply);
    expect(checkMove(progress, 'd1d8').kind).toBe('solved');
  });

  it('틀린 수와 불법 수', () => {
    const progress = startPuzzle(MATE_IN_2);
    expect(checkMove(progress, 'd2d7')).toMatchObject({ kind: 'wrong' });
    expect(checkMove(progress, 'd2d9')).toEqual({ kind: 'wrong', fenAfterMove: null });
  });

  it('다른 수라도 체크메이트면 정답', () => {
    const progress = startPuzzle(MATE_IN_1);
    expect(checkMove(progress, 'e1e8').kind).toBe('solved');
    expect(checkMove(progress, 'd1d8').kind).toBe('solved');
    expect(checkMove(progress, 'd1d7').kind).toBe('wrong');
  });
});

describe('Glicko-2', () => {
  it('Glickman 논문의 예제와 같은 결과', () => {
    const result = glicko2({ rating: 1500, rd: 200, volatility: 0.06 }, [
      { opponentRating: 1400, opponentRd: 30, score: 1 },
      { opponentRating: 1550, opponentRd: 100, score: 0 },
      { opponentRating: 1700, opponentRd: 300, score: 0 },
    ]);
    expect(result.rating).toBeCloseTo(1464.06, 1);
    expect(result.rd).toBeCloseTo(151.52, 1);
    expect(result.volatility).toBeCloseTo(0.05999, 4);
  });

  it('풀면 오르고 못 풀면 내린다. 어려운 퍼즐을 풀수록 더 오른다', () => {
    const start = INITIAL_PUZZLE_RATING;
    const easyWin = updatePuzzleRating(start, 700, true);
    const hardWin = updatePuzzleRating(start, 1300, true);
    const loss = updatePuzzleRating(start, 1000, false);
    expect(easyWin.rating).toBeGreaterThan(start.rating);
    expect(hardWin.rating).toBeGreaterThan(easyWin.rating);
    expect(loss.rating).toBeLessThan(start.rating);
    expect(loss.rd).toBeLessThan(start.rd);
  });

  it('많이 풀수록 변화폭이 줄어든다', () => {
    let player = INITIAL_PUZZLE_RATING;
    const first = updatePuzzleRating(player, 1000, true).rating - player.rating;
    for (let i = 0; i < 30; i++) player = updatePuzzleRating(player, 1000, i % 2 === 0);
    const later = updatePuzzleRating(player, 1000, true).rating - player.rating;
    expect(later).toBeLessThan(first);
  });
});

describe('퍼즐 데이터', () => {
  it('샤드를 읽고 잘못된 항목은 건너뛴다', () => {
    const parsed = parsePuzzleShard([
      ['a1', MATE_IN_1.fen, 'a7a6 d1d8', 600, 'mateIn1 short'],
      ['bad', 1, 2, 3, 4],
      ['short', MATE_IN_1.fen, 'a7a6', 600, ''],
    ]);
    expect(parsed).toEqual([
      {
        id: 'a1',
        fen: MATE_IN_1.fen,
        moves: ['a7a6', 'd1d8'],
        rating: 600,
        themes: ['mateIn1', 'short'],
      },
    ]);
    expect(parsePuzzleShard('nope')).toEqual([]);
  });

  it('테마 이름은 한국어로', () => {
    expect(themeName('fork')).toBe('포크');
    expect(themeName('unknownTheme')).toBe('unknownTheme');
  });
});

describe('퍼즐 고르기', () => {
  const index: PuzzleIndex = {
    version: 1,
    bandSize: 100,
    bands: [
      { band: 600, file: 'r0600.json', count: 2 },
      { band: 900, file: 'r0900.json', count: 1 },
      { band: 1500, file: 'r1500.json', count: 1 },
    ],
    themes: {},
  };
  const shards: Record<string, unknown> = {
    'index.json': index,
    'r0600.json': [
      ['p600', MATE_IN_1.fen, 'a7a6 d1d8', 620, 'mateIn1'],
      ['p650', MATE_IN_1.fen, 'a7a6 d1d8', 680, 'fork'],
    ],
    'r0900.json': [['p900', MATE_IN_2.fen, MATE_IN_2.moves.join(' '), 950, 'mateIn2']],
    'r1500.json': [['p1500', MATE_IN_2.fen, MATE_IN_2.moves.join(' '), 1550, 'pin']],
  };

  function loader() {
    const requested: string[] = [];
    const l = createPuzzleLoader(async (path) => {
      requested.push(path);
      return shards[path];
    });
    return { loader: l, requested };
  }

  it('목표 레이팅 근처 구간만 불러온다', async () => {
    const { loader: l, requested } = loader();
    const puzzle = await selectPuzzle(l, { targetRating: 900 }, seededRandom(1));
    expect(puzzle?.id).toBe('p900');
    expect(requested).toEqual(['index.json', 'r0900.json']);
    expect(bandsInRange(index, 900, 150)).toEqual([900]);
  });

  it('테마로 거르고, 없으면 범위를 넓힌다', async () => {
    const { loader: l } = loader();
    const puzzle = await selectPuzzle(l, { targetRating: 900, theme: 'pin' }, seededRandom(1));
    expect(puzzle?.id).toBe('p1500');
  });

  it('제외 목록의 퍼즐은 고르지 않고, 모두 제외되면 다시 고른다', async () => {
    const { loader: l } = loader();
    const exclude = new Set(['p600']);
    const picked = await selectPuzzle(l, { targetRating: 650, exclude }, seededRandom(3));
    expect(picked?.id).toBe('p650');
    const all = new Set(['p600', 'p650', 'p900', 'p1500']);
    expect(
      await selectPuzzle(l, { targetRating: 650, exclude: all }, seededRandom(3)),
    ).not.toBeNull();
  });
});
