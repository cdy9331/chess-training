import { Chess, type Color } from 'chess.js';

export type GameStatus =
  | { kind: 'ongoing'; turn: Color; inCheck: boolean }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' }
  | { kind: 'threefoldRepetition' }
  | { kind: 'fiftyMoveRule' }
  | { kind: 'insufficientMaterial' };

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

/** 게임이 끝난 이유. 규칙에 의한 종료 + 사람이 결정한 종료(기권, 무승부 합의) */
export type GameEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'threefoldRepetition'
  | 'fiftyMoveRule'
  | 'insufficientMaterial'
  | 'resign'
  | 'drawAgreed';

export interface GameOutcome {
  result: Exclude<GameResult, '*'>;
  reason: GameEndReason;
}

/** 규칙상 끝난 국면이면 그 결과, 진행 중이면 null */
export function outcomeFromStatus(status: GameStatus): GameOutcome | null {
  if (status.kind === 'ongoing') return null;
  const result = statusToResult(status);
  return result === '*' ? null : { result, reason: status.kind };
}

export function resignOutcome(resigning: Color): GameOutcome {
  return { result: resigning === 'w' ? '0-1' : '1-0', reason: 'resign' };
}

const REASON_TEXT: Record<GameEndReason, string> = {
  checkmate: '체크메이트',
  stalemate: '스테일메이트',
  threefoldRepetition: '같은 국면 3회 반복',
  fiftyMoveRule: '50수 규칙',
  insufficientMaterial: '메이트할 기물 부족',
  resign: '기권',
  drawAgreed: '무승부 합의',
};

export function describeEndReason(reason: GameEndReason): string {
  return REASON_TEXT[reason];
}

/** 특정 색 입장에서의 결과 */
export function resultFor(result: GameResult, color: Color): 'win' | 'loss' | 'draw' | 'ongoing' {
  if (result === '*') return 'ongoing';
  if (result === '1/2-1/2') return 'draw';
  return (result === '1-0') === (color === 'w') ? 'win' : 'loss';
}

/** 3회 반복 판정에 이전 국면이 필요하므로 수순이 담긴 Chess 인스턴스를 받는다. */
export function getGameStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) return { kind: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' };
  if (chess.isStalemate()) return { kind: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { kind: 'insufficientMaterial' };
  if (chess.isThreefoldRepetition()) return { kind: 'threefoldRepetition' };
  if (chess.isDrawByFiftyMoves()) return { kind: 'fiftyMoveRule' };
  return { kind: 'ongoing', turn: chess.turn(), inCheck: chess.inCheck() };
}

export function statusToResult(status: GameStatus): GameResult {
  switch (status.kind) {
    case 'ongoing':
      return '*';
    case 'checkmate':
      return status.winner === 'w' ? '1-0' : '0-1';
    default:
      return '1/2-1/2';
  }
}

const COLOR_NAME: Record<Color, string> = { w: '백', b: '흑' };

export function describeStatus(status: GameStatus): string {
  switch (status.kind) {
    case 'ongoing':
      return `${COLOR_NAME[status.turn]} 차례${status.inCheck ? ' — 체크!' : ''}`;
    case 'checkmate':
      return `체크메이트! ${COLOR_NAME[status.winner]} 승리`;
    case 'stalemate':
      return '스테일메이트 — 무승부 (둘 수 있는 수가 없지만 체크는 아님)';
    case 'threefoldRepetition':
      return '같은 국면 3회 반복 — 무승부';
    case 'fiftyMoveRule':
      return '50수 동안 폰 이동·잡기 없음 — 무승부';
    case 'insufficientMaterial':
      return '메이트할 기물 부족 — 무승부';
  }
}
