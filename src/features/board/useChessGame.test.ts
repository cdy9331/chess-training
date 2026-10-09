import { act, renderHook } from '@testing-library/react';
import { START_FEN } from '../../core/chess';
import { useChessGame } from './useChessGame';

describe('useChessGame', () => {
  it('수를 두고 이전/다음으로 탐색한다', () => {
    const { result } = renderHook(() => useChessGame());
    act(() => {
      result.current.makeMove('e2e4');
    });
    act(() => {
      result.current.makeMove('e7e5');
    });
    expect(result.current.ply).toBe(2);
    expect(result.current.lastMoveUci).toBe('e7e5');

    act(() => result.current.goFirst());
    expect(result.current.fen).toBe(START_FEN);
    expect(result.current.isAtEnd).toBe(false);

    act(() => result.current.goNext());
    expect(result.current.lastMoveUci).toBe('e2e4');

    act(() => result.current.goLast());
    expect(result.current.isAtEnd).toBe(true);
  });

  it('불법 수는 false를 돌려주고 상태를 바꾸지 않는다', () => {
    const { result } = renderHook(() => useChessGame());
    let ok = true;
    act(() => {
      ok = result.current.makeMove('e2e5');
    });
    expect(ok).toBe(false);
    expect(result.current.line.moves).toHaveLength(0);
  });

  it('무르기는 마지막 수를 지운다', () => {
    const { result } = renderHook(() => useChessGame());
    act(() => {
      result.current.makeMove('e2e4');
    });
    act(() => {
      result.current.makeMove('e7e5');
    });
    act(() => result.current.undo());
    expect(result.current.line.moves.map((m) => m.san)).toEqual(['e4']);
    expect(result.current.ply).toBe(1);
  });

  it('체크메이트 상태를 알려준다', () => {
    const { result } = renderHook(() => useChessGame());
    for (const uci of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) {
      act(() => {
        result.current.makeMove(uci);
      });
    }
    expect(result.current.status).toEqual({ kind: 'checkmate', winner: 'b' });
  });
});
