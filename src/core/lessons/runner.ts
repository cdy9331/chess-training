import { Chess, type Color } from 'chess.js';
import { moveToUci, playUci } from '../chess/notation';
import type { FindMoveStep, PlayOutStep } from './types';

/** SAN 정답 수순들을 UCI로 바꾼다. 불법 수가 있으면 예외 (콘텐츠 오류). */
export function resolveSolutions(step: FindMoveStep): string[][] {
  return step.solutions.map((line) => {
    const chess = new Chess(step.fen);
    return line.map((san) => {
      try {
        return moveToUci(chess.move(san));
      } catch {
        throw new Error(`"${step.title}"의 정답 수순 ${line.join(' ')} 중 ${san}가 불법이에요.`);
      }
    });
  });
}

export type LessonMoveVerdict =
  | { kind: 'continue'; fenAfterMove: string; reply: string; fenAfterReply: string }
  | { kind: 'solved'; fenAfterMove: string }
  | { kind: 'wrong' };

/**
 * 수 찾기 판정.
 * @param played 지금까지 둔 수 (사용자 수 + 정해진 응수, UCI)
 * @param fen 지금 국면
 */
export function checkLessonMove(
  solutions: readonly string[][],
  played: readonly string[],
  fen: string,
  uci: string,
): LessonMoveVerdict {
  const chess = new Chess(fen);
  const move = playUci(chess, uci);
  if (!move) return { kind: 'wrong' };
  const fenAfterMove = chess.fen();
  if (chess.isCheckmate()) return { kind: 'solved', fenAfterMove };

  // 지금까지의 수순과 같고 다음 수가 uci인 정답 줄
  const matching = solutions.filter(
    (line) => played.every((m, i) => line[i] === m) && line[played.length] === uci,
  );
  const line = matching[0];
  if (!line) return { kind: 'wrong' };
  const reply = line[played.length + 1];
  if (!reply) return { kind: 'solved', fenAfterMove };
  if (!playUci(chess, reply)) return { kind: 'solved', fenAfterMove };
  return { kind: 'continue', fenAfterMove, reply, fenAfterReply: chess.fen() };
}

/** 지금 둬야 할 정답 수 (힌트·정답 보기용) */
export function nextSolutionMove(solutions: readonly string[][], played: readonly string[]) {
  return solutions.find((line) => played.every((m, i) => line[i] === m))?.[played.length] ?? null;
}

export type PlayOutResult =
  { kind: 'ongoing' } | { kind: 'success'; message: string } | { kind: 'fail'; message: string };

/**
 * 실습 목표 판정. chess는 지금까지 둔 수가 반영된 상태(3회 반복 판정에 필요).
 * @param userMoves 사용자가 둔 수의 개수
 */
export function checkPlayOut(
  step: PlayOutStep,
  chess: Chess,
  user: Color,
  userMoves: number,
  lastMove?: { color: Color; promotion?: string },
): PlayOutResult {
  if (step.goal === 'promote' && lastMove?.color === user && lastMove.promotion) {
    return { kind: 'success', message: '폰을 승격했어요! 🎉' };
  }
  if (chess.isCheckmate()) {
    return chess.turn() === user
      ? { kind: 'fail', message: '체크메이트를 당했어요.' }
      : { kind: 'success', message: '체크메이트! 🎉' };
  }
  if (chess.isStalemate()) {
    return {
      kind: 'fail',
      message: '스테일메이트예요 — 상대가 둘 수 있는 수가 없지만 체크도 아니라서 무승부가 됐어요.',
    };
  }
  if (chess.isDraw()) return { kind: 'fail', message: '무승부가 됐어요.' };
  if (step.goal === 'promote' && lastMove?.color !== user && lastMove?.promotion) {
    return { kind: 'fail', message: '상대 폰이 승격했어요.' };
  }
  if (userMoves >= step.maxMoves && chess.turn() === user) {
    return { kind: 'fail', message: `${step.maxMoves}수 안에 목표를 이루지 못했어요.` };
  }
  return { kind: 'ongoing' };
}

/** 실습에서 사용자가 맡는 색 = 시작 국면에서 둘 차례 */
export function playOutColor(step: PlayOutStep): Color {
  return step.fen.split(' ')[1] === 'b' ? 'b' : 'w';
}
