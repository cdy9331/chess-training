import { fenAt, lineFromUcis, START_FEN } from '../chess';
import { explainBestMove, explainMistake, type PositionEval } from '.';

const score = (cp: number, pv: string[]): PositionEval => ({
  kind: 'score',
  score: { kind: 'cp', value: cp },
  bestMoveUci: pv[0] ?? null,
  pv,
  depth: 14,
});
const mate = (n: number, pv: string[]): PositionEval => ({
  kind: 'score',
  score: { kind: 'mate', value: n },
  bestMoveUci: pv[0] ?? null,
  pv,
  depth: 14,
});

describe('explainMistake', () => {
  it('퀸을 공짜로 주면 상대가 무엇으로 잡는지 알려준다', () => {
    // 1. e4 e5 2. Qh5 Nc6 3. Qxe5+?? Nxe5
    const line = lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'd1h5', 'b8c6']);
    const { reasons } = explainMistake({
      fenBefore: fenAt(line, 4),
      playedUci: 'h5e5',
      mover: 'w',
      before: score(30, ['f1c4', 'd8e7']),
      after: score(-900, ['c6e5', 'd2d4', 'e5c6']),
    });
    expect(reasons[0]).toBe('상대가 Nxe5로 e5의 퀸을 잡을 수 있어요.');
    // 퀸(9)을 잃었지만 Qxe5로 폰(1)을 먼저 잡았으므로 순손실 8점
    expect(reasons.some((r) => r.includes('8점'))).toBe(true);
  });

  it('메이트를 허용하면 그 수를 알려준다', () => {
    const line = lineFromUcis(START_FEN, ['f2f3', 'e7e5']);
    const { reasons } = explainMistake({
      fenBefore: fenAt(line, 2),
      playedUci: 'g2g4',
      mover: 'w',
      before: score(-40, ['e2e4']),
      after: mate(-1, ['d8h4']),
    });
    expect(reasons[0]).toBe('상대가 Qh4#로 바로 체크메이트할 수 있어요.');
  });

  it('이유 종류(태그)를 함께 돌려준다', () => {
    const line = lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'd1h5', 'b8c6']);
    const queenBlunder = explainMistake({
      fenBefore: fenAt(line, 4),
      playedUci: 'h5e5',
      mover: 'w',
      before: score(30, ['f1c4', 'd8e7']),
      after: score(-900, ['c6e5', 'd2d4', 'e5c6']),
    });
    expect(queenBlunder.tags).toEqual(['hangingPiece', 'materialLoss']);

    const fork = explainMistake({
      fenBefore: '4k3/8/8/8/1n6/8/7P/R3K3 w - - 0 1',
      playedUci: 'h2h3',
      mover: 'w',
      before: score(200, ['a1a4']),
      after: score(-300, ['b4c2']),
    });
    expect(fork.tags).toContain('allowedFork');

    const quiet = explainMistake({
      fenBefore: START_FEN,
      playedUci: 'a2a3',
      mover: 'w',
      before: score(30, ['e2e4']),
      after: score(-10, ['e7e5']),
    });
    expect(quiet.tags).toEqual(['positional']);
  });

  it('상대에게 포크를 허용하면 알려준다', () => {
    const { reasons } = explainMistake({
      fenBefore: '4k3/8/8/8/1n6/8/7P/R3K3 w - - 0 1',
      playedUci: 'h2h3',
      mover: 'w',
      before: score(200, ['a1a4']),
      after: score(-300, ['b4c2']),
    });
    expect(reasons[0]).toContain('포크');
    expect(reasons[0]).toContain('킹과 룩을');
  });

  it('놓친 1수 메이트를 알려준다', () => {
    const { reasons } = explainMistake({
      fenBefore: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      playedUci: 'h2h3',
      mover: 'w',
      before: mate(1, ['d1d8']),
      after: score(500, ['g8f8']),
    });
    expect(reasons).toContain('Rd8#를 두면 바로 체크메이트였어요!');
  });

  it('오프닝에서 퀸을 일찍 꺼내면 원칙을 설명한다', () => {
    const line = lineFromUcis(START_FEN, ['e2e4', 'e7e5']);
    const { reasons } = explainMistake({
      fenBefore: fenAt(line, 2),
      playedUci: 'd1h5',
      mover: 'w',
      before: score(40, ['g1f3']),
      after: score(-20, ['b8c6']),
      plyIndex: 2,
    });
    expect(reasons[0]).toContain('퀸을 너무 일찍');
  });

  it('특별한 이유가 없으면 일반 설명', () => {
    const { reasons } = explainMistake({
      fenBefore: START_FEN,
      playedUci: 'a2a3',
      mover: 'w',
      before: score(30, ['e2e4']),
      after: score(-10, ['e7e5']),
    });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('엔진이 끝까지 계산해 보니');
  });
});

describe('explainBestMove', () => {
  it('지켜지지 않은 기물을 공짜로 잡는다', () => {
    const { reasons } = explainBestMove({
      fenBefore: '4k3/8/8/3q4/8/2N5/8/4K3 w - - 0 1',
      mover: 'w',
      before: score(900, ['c3d5']),
      plyIndex: 30,
    });
    expect(reasons[0]).toBe('지켜지지 않은 상대 퀸을 공짜로 잡아요.');
  });

  it('메이트 수순', () => {
    const { reasons } = explainBestMove({
      fenBefore: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      mover: 'w',
      before: mate(1, ['d1d8']),
      plyIndex: 30,
    });
    expect(reasons).toEqual(['Rd8#는 바로 체크메이트예요!']);
  });

  it('오프닝의 캐슬링과 전개를 설명한다', () => {
    const line = lineFromUcis(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5']);
    expect(
      explainBestMove({
        fenBefore: fenAt(line, 6),
        mover: 'w',
        before: score(30, ['e1g1']),
        plyIndex: 6,
      }).reasons,
    ).toContain('캐슬링으로 킹을 안전한 곳에 두고 룩을 싸움에 참여시켜요.');

    const { reasons } = explainBestMove({
      fenBefore: fenAt(line, 2),
      mover: 'w',
      before: score(30, ['g1f3']),
      plyIndex: 2,
    });
    expect(reasons).toContain('잠자던 기물을 전개해서 싸움에 참여시켜요.');
    expect(reasons.some((r) => r.includes('e5') && r.includes('위협'))).toBe(true);
  });
});
