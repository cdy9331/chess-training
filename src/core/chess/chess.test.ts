import {
  checkedKingSquare,
  createLine,
  fenAt,
  fenToEpd,
  isPromotionMove,
  isValidFen,
  legalTargets,
  lineToPgn,
  parsePgn,
  parseUci,
  playMove,
  sanToUci,
  START_FEN,
  statusAt,
  statusToResult,
  uciLineToSan,
  uciToSan,
  type GameLine,
} from '.';

function playAll(ucis: string[], startFen?: string): GameLine {
  let line = createLine(startFen);
  for (const uci of ucis) {
    const next = playMove(line, line.moves.length, uci);
    if (!next) throw new Error(`불법 수: ${uci}`);
    line = next;
  }
  return line;
}

describe('notation', () => {
  it('UCI를 분해한다', () => {
    expect(parseUci('e2e4')).toEqual({ from: 'e2', to: 'e4' });
    expect(parseUci('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' });
    expect(parseUci('e2e9')).toBeNull();
    expect(parseUci('e7e8k')).toBeNull();
  });

  it('UCI와 SAN을 상호 변환한다', () => {
    expect(uciToSan(START_FEN, 'g1f3')).toBe('Nf3');
    expect(sanToUci(START_FEN, 'Nf3')).toBe('g1f3');
    expect(uciToSan(START_FEN, 'e2e5')).toBeNull();
    expect(sanToUci(START_FEN, 'Ke2')).toBeNull();
  });

  it('캐슬링과 프로모션을 변환한다', () => {
    const castleFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(uciToSan(castleFen, 'e1g1')).toBe('O-O');
    expect(uciToSan(castleFen, 'e1c1')).toBe('O-O-O');
    const promoFen = '3r4/4P3/8/8/8/8/8/k6K w - - 0 1';
    expect(uciToSan(promoFen, 'e7d8n')).toBe('exd8=N');
    expect(sanToUci(promoFen, 'e8=Q+')).toBe('e7e8q');
  });

  it('수순을 SAN으로 바꾸고 불법 수에서 멈춘다', () => {
    expect(uciLineToSan(START_FEN, ['e2e4', 'e7e5', 'e1e3', 'g1f3'])).toEqual(['e4', 'e5']);
  });
});

describe('fen', () => {
  it('EPD는 반수·수 번호를 제외한다', () => {
    expect(fenToEpd(START_FEN)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
  });

  it('FEN 유효성을 검사한다', () => {
    expect(isValidFen(START_FEN)).toBe(true);
    expect(isValidFen('not a fen')).toBe(false);
  });

  it('합법 이동 칸과 프로모션 여부를 알려준다', () => {
    expect(legalTargets(START_FEN, 'g1').sort()).toEqual(['f3', 'h3']);
    expect(legalTargets(START_FEN, 'g8')).toEqual([]); // 흑 차례가 아님
    expect(isPromotionMove('8/4P3/8/8/8/8/8/k6K w - - 0 1', 'e7', 'e8')).toBe(true);
    expect(isPromotionMove(START_FEN, 'e2', 'e4')).toBe(false);
  });

  it('체크당한 킹의 칸을 찾는다', () => {
    const line = playAll(['e2e4', 'f7f6', 'd2d4', 'g7g5', 'd1h5']);
    expect(checkedKingSquare(fenAt(line, 5))).toBe('e8');
    expect(checkedKingSquare(START_FEN)).toBeNull();
  });
});

describe('gameLine', () => {
  it('수를 두고 국면을 되짚는다', () => {
    const line = playAll(['e2e4', 'e7e5', 'g1f3']);
    expect(line.moves.map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(fenAt(line, 0)).toBe(START_FEN);
    expect(fenAt(line, 3)).toBe(line.moves[2]?.fen);
  });

  it('불법 수는 거부한다', () => {
    expect(playMove(createLine(), 0, 'e2e5')).toBeNull();
  });

  it('과거 시점에서 두면 이후 수를 버린다', () => {
    const line = playAll(['e2e4', 'e7e5', 'g1f3']);
    const branched = playMove(line, 1, 'c7c5');
    expect(branched?.moves.map((m) => m.san)).toEqual(['e4', 'c5']);
    expect(line.moves).toHaveLength(3); // 원본은 그대로
  });

  it('앙파상을 처리한다', () => {
    const line = playAll(['e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6']);
    expect(line.moves[4]?.san).toBe('exd6');
  });

  it('종료 상태를 판정한다', () => {
    const mate = playAll(['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(statusAt(mate)).toEqual({ kind: 'checkmate', winner: 'b' });
    expect(statusToResult(statusAt(mate))).toBe('0-1');
    expect(playMove(mate, 4, 'a2a3')).toBeNull(); // 끝난 게임엔 둘 수 없음

    const stalemate = createLine('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(statusAt(stalemate).kind).toBe('stalemate');

    const bare = createLine('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
    expect(statusAt(bare).kind).toBe('insufficientMaterial');

    const repeat = playAll(['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
    expect(statusAt(repeat).kind).toBe('threefoldRepetition');

    const fifty = createLine('8/8/8/4k3/8/8/R7/4K3 w - - 100 80');
    expect(statusAt(fifty).kind).toBe('fiftyMoveRule');
  });
});

describe('pgn', () => {
  it('PGN을 만들고 다시 읽는다', () => {
    const line = playAll(['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7']);
    const pgn = lineToPgn(line, { White: '나', Black: '친구' });
    expect(pgn).toContain('[Result "1-0"]');
    expect(pgn).toContain('4. Qxf7#');

    const parsed = parsePgn(pgn);
    expect(parsed?.headers.White).toBe('나');
    expect(parsed?.line.moves.map((m) => m.uci)).toEqual(line.moves.map((m) => m.uci));
  });

  it('시작 국면이 다른 PGN도 보존한다', () => {
    const startFen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const line = playAll(['e2e4'], startFen);
    const parsed = parsePgn(lineToPgn(line));
    expect(parsed?.line.startFen).toBe(startFen);
    expect(parsed?.line.moves[0]?.san).toBe('e4');
  });

  it('잘못된 PGN은 null', () => {
    expect(parsePgn('1. e4 e5 2. Ke3')).toBeNull();
  });
});
