import { Chess, type Color } from 'chess.js';
import { moveToUci } from '../chess/notation';

export interface RepertoireMove {
  san: string;
  /** 이 수를 왜 두는지 (특히 사용자가 두는 수) */
  comment?: string;
}

export interface RepertoireLine {
  id: string;
  /** 사용자가 맡는 색 */
  side: Color;
  name: string;
  /** 이 라인을 한 줄로 소개 */
  summary: string;
  moves: RepertoireMove[];
}

export interface ResolvedMove extends RepertoireMove {
  uci: string;
  fenBefore: string;
  fenAfter: string;
  /** 사용자가 둘 차례의 수인가 */
  mine: boolean;
}

/** SAN 수순을 실제로 둬 보며 UCI·국면을 붙인다. 불법 수가 있으면 예외 (콘텐츠 오류). */
export function resolveLine(line: RepertoireLine): ResolvedMove[] {
  const chess = new Chess();
  return line.moves.map((m, i) => {
    const fenBefore = chess.fen();
    let move;
    try {
      move = chess.move(m.san);
    } catch {
      throw new Error(`레퍼토리 "${line.id}"의 ${i + 1}번째 수 ${m.san}가 불법이에요.`);
    }
    return {
      ...m,
      uci: moveToUci(move),
      fenBefore,
      fenAfter: chess.fen(),
      mine: move.color === line.side,
    };
  });
}

/** 드릴에서 사용자의 수를 판정한다. 같은 칸 이동이면 정답(프로모션 제외 세부 차이 무시 안 함). */
export function isCorrectDrillMove(expected: ResolvedMove, uci: string): boolean {
  return expected.uci === uci;
}
