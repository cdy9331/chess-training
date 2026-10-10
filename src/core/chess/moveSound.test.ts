import { START_FEN } from './fen';
import { fenAfterMove } from './notation';
import { moveSoundKind, soundForTransition } from './moveSound';

describe('착수음 종류', () => {
  it('SAN으로 정한다', () => {
    expect(moveSoundKind('e4')).toBe('move');
    expect(moveSoundKind('Nxe5')).toBe('capture');
    expect(moveSoundKind('O-O-O')).toBe('castle');
    expect(moveSoundKind('Qxf7#')).toBe('check');
    expect(moveSoundKind('exd8=Q+')).toBe('check');
  });

  it('정확히 한 수 진행했을 때만 소리를 낸다', () => {
    const afterE4 = fenAfterMove(START_FEN, 'e2e4') ?? '';
    expect(soundForTransition(START_FEN, afterE4, 'e2e4')).toBe('move');
    // 되돌리기(같은 수가 lastMove로 남아 있어도 국면이 맞지 않음)
    expect(soundForTransition(afterE4, START_FEN, 'e2e4')).toBeNull();
    // 같은 국면이 다시 그려진 경우
    expect(soundForTransition(afterE4, afterE4, 'e2e4')).toBeNull();
    expect(soundForTransition(START_FEN, afterE4, undefined)).toBeNull();
  });
});
