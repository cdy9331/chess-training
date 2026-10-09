import { aiAcceptsDraw, resolveColor, undoTargetPly } from './rules';

describe('undoTargetPly', () => {
  it('내 차례면 AI 수와 내 수를 함께 되돌린다', () => {
    expect(undoTargetPly(4, 'w', 'w')).toBe(2);
  });

  it('AI가 생각 중이면 내 수만 되돌린다', () => {
    expect(undoTargetPly(5, 'b', 'w')).toBe(4);
  });

  it('0보다 작아지지 않는다', () => {
    expect(undoTargetPly(1, 'b', 'b')).toBe(0); // 흑으로 시작, AI(백)가 1수 둔 상태
    expect(undoTargetPly(0, 'w', 'w')).toBe(0);
  });
});

describe('aiAcceptsDraw', () => {
  it('AI가 불리하면 받아들인다', () => {
    expect(aiAcceptsDraw({ kind: 'cp', value: 300 }, 'b', 10)).toBe(true);
    expect(aiAcceptsDraw({ kind: 'mate', value: -3 }, 'w', 10)).toBe(true);
  });

  it('AI가 유리하면 거절한다', () => {
    expect(aiAcceptsDraw({ kind: 'cp', value: 300 }, 'w', 100)).toBe(false);
  });

  it('비슷한 국면은 충분히 둔 뒤에만 받아들인다', () => {
    expect(aiAcceptsDraw({ kind: 'cp', value: 10 }, 'w', 20)).toBe(false);
    expect(aiAcceptsDraw({ kind: 'cp', value: 10 }, 'w', 80)).toBe(true);
  });
});

describe('resolveColor', () => {
  it('선택한 색을 그대로, 무작위면 난수로 정한다', () => {
    expect(resolveColor('b')).toBe('b');
    expect(resolveColor('random', () => 0.1)).toBe('w');
    expect(resolveColor('random', () => 0.9)).toBe('b');
  });
});
