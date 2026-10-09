import { Chess } from 'chess.js';
import { hangingPieces, threatsAgainst } from './threats';

describe('위협 표시', () => {
  it('지켜지지 않은 기물, 더 싼 기물에게 공격받는 기물', () => {
    // 백 나이트 e5는 흑 폰 d6에 공격받음 (지켜져도 더 싼 기물), 백 비숍 b5는 공격받지 않음
    const chess = new Chess('4k3/8/3p4/1B2N3/8/8/8/4K2R w K - 0 1');
    expect(hangingPieces(chess, 'w').map((h) => h.square)).toEqual(['e5']);
  });

  it('상대가 둘 수 있는 체크와 잡기', () => {
    // 흑 퀸 d8은 지켜지지 않은 나이트 d4를 잡을 수 있고, Qa5+·Qe7+·Qh4+ 체크도 있다
    const t = threatsAgainst('3qk3/8/8/8/3N4/8/8/4K3 w - - 0 1', 'w');
    expect(t.captures).toEqual([{ from: 'd8', to: 'd4' }]);
    expect(t.checks.map((m) => m.to).sort()).toEqual(['a5', 'e7', 'h4']);
    expect(t.hanging.map((h) => h.square)).toEqual(['d4']);
  });

  it('내 차례가 아니거나 체크 중이면 상대 수는 계산하지 않는다', () => {
    expect(threatsAgainst('4k3/8/8/8/8/8/8/4K2r w - - 0 1', 'w').checks).toEqual([]);
    expect(threatsAgainst('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', 'w')).toEqual(
      {
        hanging: [],
        checks: [],
        captures: [],
      },
    );
    expect(threatsAgainst('잘못된 FEN', 'w').checks).toEqual([]);
  });
});
