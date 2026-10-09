import { lineFromUcis, START_FEN, uciLineToSan } from '../chess';
import { initialSrs, isDue, reviewSrs } from '../srs/scheduler';
import {
  bookDepth,
  formatOpeningName,
  identifyOpening,
  koreanOpeningName,
  nextBookMoves,
  parseOpeningData,
  type OpeningBook,
} from '.';
import { fenToEpd, fenAt } from '../chess';

/** 1.e4 e5 2.Nf3 Nc6 3.Bc4 수순의 국면만 담은 작은 책 */
function tinyBook(): OpeningBook {
  const line = lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4']);
  const positions: Record<string, unknown> = {};
  for (let ply = 1; ply <= 5; ply++) positions[fenToEpd(fenAt(line, ply))] = 0;
  positions[fenToEpd(fenAt(line, 1))] = ['B00', "King's Pawn Game"];
  positions[fenToEpd(fenAt(line, 5))] = ['C50', 'Italian Game'];
  const book = parseOpeningData({ version: 1, positions });
  if (!book) throw new Error('book');
  return book;
}

describe('오프닝 데이터', () => {
  it('형식이 다르면 null', () => {
    expect(parseOpeningData({ version: 99, positions: {} })).toBeNull();
    expect(parseOpeningData(null)).toBeNull();
  });

  it('마지막으로 이름이 확인된 오프닝을 찾는다 (전치 포함)', () => {
    const book = tinyBook();
    const italian = lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5']);
    expect(identifyOpening(book, italian)).toEqual({ eco: 'C50', name: 'Italian Game', ply: 5 });
    expect(identifyOpening(book, italian, 3)?.name).toBe("King's Pawn Game");

    const transposed = lineFromUcis(START_FEN, ['g1f3', 'b8c6', 'e2e4', 'e7e5', 'f1c4']);
    expect(identifyOpening(book, transposed)?.name).toBe('Italian Game');
    expect(identifyOpening(book, lineFromUcis(START_FEN, ['a2a3']))).toBeNull();
  });

  it('처음부터 정석 수순 안에 있는 수의 개수', () => {
    const book = tinyBook();
    expect(bookDepth(book, lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'a7a6', 'f1c4']))).toBe(
      3,
    );
  });

  it('정석 수순 안으로 이어지는 다음 수 후보', () => {
    const book = tinyBook();
    const afterE5 = fenAt(lineFromUcis(START_FEN, ['e2e4', 'e7e5']), 2);
    expect(nextBookMoves(book, afterE5).map((m) => m.san)).toEqual(['Nf3']);
    const afterNc6 = fenAt(lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6']), 4);
    expect(nextBookMoves(book, afterNc6)).toEqual([
      {
        uci: 'f1c4',
        san: 'Bc4',
        opening: { eco: 'C50', name: 'Italian Game' },
        inBook: true,
        games: 0,
        share: null,
      },
    ]);
    expect(
      uciLineToSan(
        START_FEN,
        nextBookMoves(book, START_FEN).map((m) => m.uci),
      ),
    ).toEqual(['e4']);
  });

  it('대국 통계가 있으면 선택률 높은 순서로, 이름 목록에 없는 인기 수도 포함한다', () => {
    const epdAfter = (ucis: string[]) =>
      fenToEpd(fenAt(lineFromUcis(START_FEN, ucis), ucis.length));
    const book = parseOpeningData(
      { version: 1, positions: { [epdAfter(['e2e4'])]: ['B00', "King's Pawn Game"] } },
      {
        version: 1,
        games: 1000,
        minRating: 1400,
        minCount: 10,
        counts: {
          [epdAfter(['e2e4'])]: 500,
          [epdAfter(['d2d4'])]: 400, // 이름 목록에는 없지만 자주 둔 수
          [epdAfter(['g1f3'])]: 100,
        },
      },
    );
    if (!book) throw new Error('book');
    const moves = nextBookMoves(book, START_FEN);
    expect(moves.map((m) => [m.san, m.games, m.inBook])).toEqual([
      ['e4', 500, true],
      ['d4', 400, false],
      ['Nf3', 100, false],
    ]);
    expect(moves[0]?.share).toBeCloseTo(0.5);
    expect(book.stats).toEqual({ games: 1000, minRating: 1400, minCount: 10 });
  });

  it('통계 형식이 다르면 이름만으로 동작한다', () => {
    const book = parseOpeningData({ version: 1, positions: {} }, { version: 99 });
    expect(book?.stats).toBeNull();
    expect(book?.count('x')).toBe(0);
  });

  it('오프닝 이름을 한국어로', () => {
    expect(koreanOpeningName('Italian Game: Two Knights Defense')).toEqual({
      family: '이탈리안 게임',
      detail: 'Two Knights Defense',
    });
    expect(formatOpeningName('Caro-Kann Defense')).toBe('카로칸 디펜스');
    expect(formatOpeningName('Unknown Opening: X')).toBe('Unknown Opening · X');
  });
});

describe('간격 반복', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('맞히면 간격이 늘고, 틀리면 다음 날 다시 본다', () => {
    const now = 1_000_000;
    let s = initialSrs(now);
    expect(isDue(s, now)).toBe(true);
    s = reviewSrs(s, true, now);
    expect(s).toMatchObject({ box: 1, due: now + 2 * DAY, reps: 1 });
    s = reviewSrs(s, true, now);
    expect(s.due).toBe(now + 4 * DAY);
    s = reviewSrs(s, false, now);
    expect(s).toMatchObject({ box: 0, due: now + DAY, lapses: 1 });
    expect(isDue(s, now + DAY - 1)).toBe(false);
    expect(isDue(s, now + DAY)).toBe(true);
  });
});
