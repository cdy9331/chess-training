import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

/** 초보자용 기물 점수 (설명·위협 표시용. 엔진 평가와는 무관) */
export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: '폰',
  n: '나이트',
  b: '비숍',
  r: '룩',
  q: '퀸',
  k: '킹',
};

export interface HangingPiece {
  square: Square;
  type: PieceSymbol;
}

/** 지켜지지 않았거나 더 싼 기물에게 공격받는 color의 기물들 (값 큰 순) */
export function hangingPieces(chess: Chess, color: Color): HangingPiece[] {
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const result: HangingPiece[] = [];
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== color || piece.type === 'k') continue;
      const attackers = chess.attackers(piece.square, enemy);
      if (attackers.length === 0) continue;
      const defended = chess.attackers(piece.square, color).length > 0;
      const cheapest = Math.min(
        ...attackers.map((s) => PIECE_VALUE[chess.get(s)?.type ?? 'q'] || 100),
      );
      if (!defended || cheapest < PIECE_VALUE[piece.type])
        result.push({ square: piece.square, type: piece.type });
    }
  }
  return result.sort((a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type]);
}

export interface ThreatMove {
  from: Square;
  to: Square;
}

export interface Threats {
  /** 위험한 내 기물 */
  hanging: HangingPiece[];
  /** 상대가 다음에 둘 수 있는 체크 */
  checks: ThreatMove[];
  /** 상대가 다음에 잡을 수 있는 내 기물 (체크와 겹치면 체크로만) */
  captures: ThreatMove[];
}

const NONE: Threats = { hanging: [], checks: [], captures: [] };

/**
 * 연습 모드 코칭: me 쪽이 둘 차례일 때, 상대가 "지금 둘 차례라면" 할 수 있는 체크와 잡기.
 * 합법 수 계산은 chess.js에 맡기고, 둘 차례만 바꾼 FEN을 쓴다.
 */
export function threatsAgainst(fen: string, me: Color): Threats {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return NONE;
  }
  const hanging = hangingPieces(chess, me);
  // 내가 체크당한 상태면 차례를 넘길 수 없다 (체크 표시는 체스판이 따로 한다)
  if (chess.turn() !== me || chess.inCheck()) return { ...NONE, hanging };

  const fields = fen.split(' ');
  fields[1] = me === 'w' ? 'b' : 'w';
  fields[3] = '-'; // 앙파상은 차례가 바뀌면 무효
  let enemy: Chess;
  try {
    enemy = new Chess(fields.join(' '));
  } catch {
    return { ...NONE, hanging };
  }
  const checks: ThreatMove[] = [];
  const captures: ThreatMove[] = [];
  for (const move of enemy.moves({ verbose: true })) {
    if (move.san.includes('+') || move.san.includes('#')) {
      checks.push({ from: move.from, to: move.to });
    } else if (move.captured) {
      captures.push({ from: move.from, to: move.to });
    }
  }
  return { hanging, checks, captures };
}
