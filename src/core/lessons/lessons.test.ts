import { Chess } from 'chess.js';
import {
  checkLessonMove,
  checkPlayOut,
  nextSolutionMove,
  resolveSolutions,
  type FindMoveStep,
  type PlayOutStep,
} from '.';

const SKEWER: FindMoveStep = {
  kind: 'findMove',
  title: '스큐어',
  fen: '4r3/8/8/4k3/8/8/8/R6K w - - 0 1',
  prompt: '룩으로 킹 뒤의 룩을 노리세요',
  solutions: [['Re1+', 'Kd4', 'Rxe8']],
  explanation: '',
};

describe('수 찾기', () => {
  const solutions = resolveSolutions(SKEWER);

  it('SAN 정답을 UCI로 바꾼다', () => {
    expect(solutions).toEqual([['a1e1', 'e5d4', 'e1e8']]);
    expect(() => resolveSolutions({ ...SKEWER, solutions: [['Re9']] })).toThrow();
  });

  it('정답이면 정해진 응수까지 두고, 마지막 수로 끝난다', () => {
    const first = checkLessonMove(solutions, [], SKEWER.fen, 'a1e1');
    expect(first.kind).toBe('continue');
    if (first.kind !== 'continue') return;
    expect(first.reply).toBe('e5d4');
    const second = checkLessonMove(solutions, ['a1e1', 'e5d4'], first.fenAfterReply, 'e1e8');
    expect(second.kind).toBe('solved');
  });

  it('틀린 수와 힌트', () => {
    expect(checkLessonMove(solutions, [], SKEWER.fen, 'a1a5').kind).toBe('wrong');
    expect(nextSolutionMove(solutions, [])).toBe('a1e1');
    expect(nextSolutionMove(solutions, ['a1e1', 'e5d4'])).toBe('e1e8');
  });

  it('적혀 있지 않아도 체크메이트면 정답', () => {
    const step: FindMoveStep = {
      ...SKEWER,
      fen: '7k/Q7/6K1/8/8/8/8/8 w - - 0 1',
      solutions: [['Qg7#']],
    };
    expect(checkLessonMove(resolveSolutions(step), [], step.fen, 'a7h7').kind).toBe('solved');
  });
});

describe('실습 판정', () => {
  const mateStep: PlayOutStep = {
    kind: 'playOut',
    title: '',
    fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    prompt: '',
    goal: 'mate',
    maxMoves: 3,
  };

  it('메이트하면 성공, 당하면 실패', () => {
    const won = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
    expect(checkPlayOut(mateStep, won, 'w', 1).kind).toBe('success');
    const lost = new Chess('7K/6q1/6k1/8/8/8/8/8 w - - 0 1');
    expect(checkPlayOut(mateStep, lost, 'w', 1).kind).toBe('fail');
  });

  it('스테일메이트는 실패로 알려준다', () => {
    const stalemate = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const result = checkPlayOut(mateStep, stalemate, 'w', 1);
    expect(result).toMatchObject({ kind: 'fail' });
    if (result.kind === 'fail') expect(result.message).toContain('스테일메이트');
  });

  it('수 제한을 넘기면 실패', () => {
    const chess = new Chess('8/8/8/4k3/8/8/8/R3K3 w - - 0 1');
    expect(checkPlayOut(mateStep, chess, 'w', 2).kind).toBe('ongoing');
    expect(checkPlayOut(mateStep, chess, 'w', 3).kind).toBe('fail');
  });

  it('승격 목표', () => {
    const step: PlayOutStep = { ...mateStep, goal: 'promote' };
    const chess = new Chess('4Q3/8/8/8/8/8/8/K6k b - - 0 1');
    expect(checkPlayOut(step, chess, 'w', 4, { color: 'w', promotion: 'q' }).kind).toBe('success');
  });
});
