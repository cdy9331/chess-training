import { fenToEpd } from './fen';
import { fenAfterMove, uciToSan } from './notation';

export type MoveSoundKind = 'move' | 'capture' | 'castle' | 'check';

/** SAN으로 착수음 종류를 정한다 (체크가 가장 우선, 잡기·캐슬링 순). */
export function moveSoundKind(san: string): MoveSoundKind {
  if (san.includes('+') || san.includes('#')) return 'check';
  if (san.includes('x')) return 'capture';
  if (san.startsWith('O-O')) return 'castle';
  return 'move';
}

/**
 * 체스판 국면이 prevFen에서 uci 한 수로 nextFen이 됐다면 그 수의 착수음 종류, 아니면 null.
 * (수를 되돌리거나 여러 수를 건너뛴 경우에는 소리를 내지 않는다)
 */
export function soundForTransition(
  prevFen: string,
  nextFen: string,
  uci: string | undefined,
): MoveSoundKind | null {
  if (!uci) return null;
  const after = fenAfterMove(prevFen, uci);
  if (!after || fenToEpd(after) !== fenToEpd(nextFen)) return null;
  const san = uciToSan(prevFen, uci);
  return san ? moveSoundKind(san) : null;
}
