import { firstPgnGame, importPgn } from './pgnImport';

const SCHOLAR = `[Event "Casual"]
[White "Kim"]
[Black "?"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`;

describe('importPgn', () => {
  it('메이트로 끝난 대국: 결과와 끝난 이유를 국면에서 정한다', () => {
    const r = importPgn(SCHOLAR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.game.line.moves.map((m) => m.uci)).toEqual([
      'e2e4',
      'e7e5',
      'f1c4',
      'b8c6',
      'd1h5',
      'g8f6',
      'h5f7',
    ]);
    expect(r.game).toMatchObject({
      result: '1-0',
      endReason: 'checkmate',
      white: 'Kim',
      black: '흑',
      event: 'Casual',
    });
  });

  it('기권 등은 Result 헤더를 따른다, 헤더 없이 수만 있어도 된다', () => {
    const r = importPgn('[Result "0-1"]\n\n1. d4 d5 0-1');
    expect(r.ok && r.game).toMatchObject({ result: '0-1', endReason: undefined });
    const bare = importPgn('1. e4 c5 2. Nf3');
    expect(bare.ok && bare.game.result).toBe('*');
  });

  it('시계 주석이 붙은 사이트 PGN과 여러 대국 파일', () => {
    const two = `[Event "A"]\r\n\r\n1. e4 { [%clk 0:03:00] } e5 { [%clk 0:03:00] } *\r\n\r\n[Event "B"]\r\n\r\n1. d4 *`;
    expect(firstPgnGame(two)).not.toContain('"B"');
    const r = importPgn(two);
    expect(r.ok && r.game.line.moves.length).toBe(2);
  });

  it('잘못된 입력은 이유와 함께 거절한다', () => {
    expect(importPgn('  ').ok).toBe(false);
    expect(importPgn('1. e4 e5 2. Ke3 Qh4 3. Kxh4').ok).toBe(false);
    expect(importPgn('[Event "x"]\n\n*').ok).toBe(false);
  });
});
