import { Chess } from 'chess.js';
import { impossiblePositionReason, isValidFen } from '../../core/chess';
import { CATEGORY_ORDER, resolveSolutions } from '../../core/lessons';
import { LESSONS } from '.';

/** 레슨 콘텐츠의 모든 국면·정답이 체스 규칙상 맞는지 확인한다. */
function checkFen(fen: string, where: string) {
  expect(isValidFen(fen), `${where}: FEN 형식`).toBe(true);
  expect(impossiblePositionReason(fen), `${where}: 불가능한 국면`).toBeNull();
}

describe('레슨 콘텐츠', () => {
  it('ID가 겹치지 않고, 모든 분야·레벨에 레슨이 있다', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LESSONS).toHaveLength(42);
    for (const category of CATEGORY_ORDER) {
      expect(LESSONS.filter((l) => l.category === category).length).toBeGreaterThanOrEqual(3);
    }
    for (const level of [1, 2, 3] as const) {
      expect(LESSONS.some((l) => l.level === level)).toBe(true);
    }
  });

  it('퍼즐 연습 단계는 주제와 개수가 정상이다', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.kind !== 'puzzles') continue;
        expect(step.themes.length, lesson.id).toBeGreaterThan(0);
        expect(step.count, lesson.id).toBeGreaterThan(0);
      }
    }
  });

  for (const lesson of LESSONS) {
    describe(lesson.id, () => {
      it('모든 단계의 국면이 합법이다', () => {
        lesson.steps.forEach((step, i) => {
          if ('fen' in step && step.fen) checkFen(step.fen, `${lesson.id} #${i + 1}`);
        });
      });

      it('수 찾기 정답이 합법이고, "#"로 끝나는 정답은 실제로 메이트다', () => {
        for (const step of lesson.steps) {
          if (step.kind !== 'findMove') continue;
          expect(() => resolveSolutions(step)).not.toThrow();
          for (const line of step.solutions) {
            if (!line.at(-1)?.endsWith('#')) continue;
            const chess = new Chess(step.fen);
            for (const san of line) chess.move(san);
            expect(chess.isCheckmate(), `${lesson.id}: ${line.join(' ')}`).toBe(true);
          }
        }
      });

      it('실습 국면은 아직 끝나지 않았다', () => {
        for (const step of lesson.steps) {
          if (step.kind !== 'playOut') continue;
          expect(new Chess(step.fen).isGameOver()).toBe(false);
        }
      });
    });
  }
});
