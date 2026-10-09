import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { playUci } from '../chess/notation';
import { hangingPieces, PIECE_NAME, PIECE_VALUE } from '../chess/threats';
import type { PositionEval } from './positionEval';

/**
 * 초보자용 "왜?" 설명을 만든다. 외부 AI 없이 규칙으로 만든다:
 * 엔진이 계산한 수순(pv)을 실제로 따라가며 기물 득실·메이트·무방비 기물·포크·체크를 찾아 문장으로 바꾼다.
 */

const VALUE = PIECE_VALUE;
const NAME = PIECE_NAME;

/** 기물 득실을 볼 때 따라가는 수순 길이. 짝수면 "내 수"로 끝나 되잡기까지 포함한다. */
const MATERIAL_PLIES = 4;
/** 이 정도 이상 기물 차이가 나야 "이득/손해"로 설명한다 (폰 1 = 1점) */
const MATERIAL_THRESHOLD = 2;

/** 나쁜 수의 이유 종류. 약점 통계와 레슨 추천에 쓴다. */
export type MistakeTag =
  | 'allowedMate' // 상대에게 메이트를 허용
  | 'hangingPiece' // 기물을 공짜로 내줌 / 무방비 기물
  | 'allowedFork' // 상대에게 포크를 허용
  | 'materialLoss' // 수순 끝에 기물 손해
  | 'missedMate' // 메이트 기회를 놓침
  | 'missedWin' // 기물을 얻을 기회를 놓침
  | 'openingPrinciple' // 오프닝 원칙 위반 (이른 퀸·킹 이동)
  | 'positional'; // 눈에 띄는 전술 없이 형세가 나빠짐

export interface Explanation {
  /** 핵심 이유 문장 (중요한 것부터, 최대 3개 정도) */
  reasons: string[];
  /** 이유 종류 (나쁜 수 설명에만 채워진다) */
  tags: MistakeTag[];
}

/** 조사 '을/를'·'이/가'를 받침에 맞게 붙인다. */
function josa(word: string, withFinal: string, withoutFinal: string): string {
  const last = word.charCodeAt(word.length - 1);
  const hasFinal = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

/** ["나이트", "룩"] → "나이트와 룩" */
function joinNames(names: readonly string[]): string {
  return names.reduce((acc, name, i) => (i === 0 ? name : `${josa(acc, '과', '와')} ${name}`), '');
}

function pieceLabel(square: string, type: PieceSymbol) {
  return `${square}의 ${NAME[type]}`;
}

function material(chess: Chess, color: Color): number {
  let sum = 0;
  for (const row of chess.board()) {
    for (const piece of row) if (piece && piece.color === color) sum += VALUE[piece.type];
  }
  return sum;
}

/** (내 기물 - 상대 기물) */
function balance(chess: Chess, me: Color): number {
  return material(chess, me) - material(chess, me === 'w' ? 'b' : 'w');
}

interface LineStep {
  san: string;
  captured?: PieceSymbol;
  check: boolean;
  mate: boolean;
}

/** 수순을 실제로 둬 보며 기록한다. 불법 수에서 멈춘다. */
function playLine(fen: string, ucis: readonly string[], limit = ucis.length) {
  const chess = new Chess(fen);
  const steps: LineStep[] = [];
  for (const uci of ucis.slice(0, limit)) {
    const move = playUci(chess, uci);
    if (!move) break;
    steps.push({
      san: move.san,
      captured: move.captured,
      check: chess.inCheck(),
      mate: chess.isCheckmate(),
    });
  }
  return { chess, steps };
}

/** 방금 움직인 기물이 동시에 공격하는 상대의 귀한 기물들 (포크 판단용) */
function forkTargets(chess: Chess, attackerSquare: Square) {
  const attacker = chess.get(attackerSquare);
  if (!attacker) return [];
  const victimColor: Color = attacker.color === 'w' ? 'b' : 'w';
  const targets: { square: Square; type: PieceSymbol }[] = [];
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== victimColor) continue;
      if (piece.type !== 'k' && VALUE[piece.type] <= VALUE[attacker.type] && VALUE[piece.type] < 3)
        continue;
      if (chess.attackers(piece.square, attacker.color).includes(attackerSquare)) {
        targets.push({ square: piece.square, type: piece.type });
      }
    }
  }
  // 킹을 먼저, 나머지는 비싼 기물부터 ("킹과 룩")
  const rank = (t: PieceSymbol) => (t === 'k' ? 100 : VALUE[t]);
  return targets.sort((a, b) => rank(b.type) - rank(a.type));
}

function mateLength(e: PositionEval | undefined, color: Color): number | null {
  if (e?.kind !== 'score' || e.score.kind !== 'mate') return null;
  const n = e.score.value;
  return (color === 'w' ? n > 0 : n < 0) ? Math.abs(n) : null;
}

function formatLineSan(steps: readonly LineStep[], max = 4) {
  return steps
    .slice(0, max)
    .map((s) => s.san)
    .join(' ');
}

export interface MistakeInput {
  fenBefore: string;
  playedUci: string;
  mover: Color;
  /** 수를 두기 전 평가 (최선 수순 pv 포함) */
  before: PositionEval;
  /** 수를 둔 뒤 평가 (상대의 최선 응수 pv 포함) */
  after: PositionEval;
  /** 게임의 몇 번째 수인지 (오프닝 원칙 설명용, 0부터) */
  plyIndex?: number;
}

/** 오프닝으로 보는 구간 (양쪽 합쳐 이 수 이전) */
const OPENING_PLIES = 16;

/** 부정확·실수·블런더가 왜 나쁜지 */
export function explainMistake({
  fenBefore,
  playedUci,
  mover,
  before,
  after,
  plyIndex = 99,
}: MistakeInput): Explanation {
  const reasons: string[] = [];
  const tags: MistakeTag[] = [];
  const opponent: Color = mover === 'w' ? 'b' : 'w';
  const afterMove = new Chess(fenBefore);
  const played = playUci(afterMove, playedUci);
  if (!played) return { reasons, tags };
  const fenAfter = afterMove.fen();
  const refutation = after.kind === 'score' ? after.pv : [];

  // 1) 메이트를 허용
  const oppMate = mateLength(after, opponent);
  if (oppMate !== null) {
    const { steps } = playLine(fenAfter, refutation, oppMate * 2 - 1);
    tags.push('allowedMate');
    reasons.push(
      oppMate === 1
        ? `상대가 ${steps[0]?.san ?? '다음 수'}로 바로 체크메이트할 수 있어요.`
        : `이 수 다음 상대에게 ${oppMate}수 만에 메이트하는 방법이 생겨요: ${formatLineSan(steps, oppMate * 2 - 1)}`,
    );
  }

  // 2) 상대의 최선 응수가 무엇을 노리는가: 공짜 기물 / 포크
  const replyUci = refutation[0];
  if (replyUci && oppMate === null) {
    const chess = new Chess(fenAfter);
    const reply = playUci(chess, replyUci);
    if (reply?.captured) {
      const lost = `${reply.to}의 ${NAME[reply.captured]}`;
      tags.push('hangingPiece');
      reasons.push(`상대가 ${reply.san}로 ${josa(lost, '을', '를')} 잡을 수 있어요.`);
    } else if (reply) {
      const targets = forkTargets(chess, reply.to);
      if (targets.length >= 2) {
        const names = joinNames(targets.map((t) => NAME[t.type]));
        tags.push('allowedFork');
        reasons.push(
          `상대가 ${reply.san}로 ${josa(names, '을', '를')} 동시에 공격하는 포크를 걸 수 있어요. 둘 다 지킬 수는 없어요.`,
        );
      }
    }
  }

  // 3) 둔 뒤 지켜지지 않은 기물 (위에서 설명하지 않은 경우)
  if (reasons.length === 0) {
    const hanging = hangingPieces(afterMove, mover)[0];
    if (hanging && VALUE[hanging.type] >= 3) {
      const label = pieceLabel(hanging.square, hanging.type);
      tags.push('hangingPiece');
      reasons.push(`${josa(label, '이', '가')} 공격받고 있는데 제대로 지켜지지 않아요.`);
    }
  }

  // 4) 수순 끝의 기물 손해
  const startBalance = balance(new Chess(fenBefore), mover);
  const refuted = playLine(fenAfter, refutation, MATERIAL_PLIES - 1);
  const lossAfterLine = startBalance - balance(refuted.chess, mover);
  if (oppMate === null && lossAfterLine >= MATERIAL_THRESHOLD) {
    tags.push('materialLoss');
    reasons.push(
      `상대의 최선 수순(${formatLineSan(refuted.steps)})대로 가면 기물을 약 ${lossAfterLine}점(폰=1, 나이트·비숍=3, 룩=5, 퀸=9) 잃어요.`,
    );
  }

  // 4-1) 오프닝 원칙 위반 (기물 손해가 없을 때 초보자가 가장 이해하기 쉬운 이유)
  if (reasons.length === 0 && plyIndex < OPENING_PLIES) {
    if (played.piece === 'q' && !played.captured) {
      tags.push('openingPrinciple');
      reasons.push(
        '오프닝에서 퀸을 너무 일찍 꺼냈어요. 상대가 기물을 전개하면서 퀸을 쫓아내 시간(템포)을 벌 수 있어요.',
      );
    } else if (played.piece === 'k' && !played.isKingsideCastle() && !played.isQueensideCastle()) {
      tags.push('openingPrinciple');
      reasons.push(
        '킹을 움직여서 캐슬링을 할 수 없게 됐어요. 오프닝에서는 캐슬링으로 킹을 지키는 게 좋아요.',
      );
    }
  }

  // 5) 놓친 기회: 메이트 / 기물 이득
  const myMate = mateLength(before, mover);
  const bestLine = before.kind === 'score' ? before.pv : [];
  if (myMate !== null && mateLength(after, mover) === null) {
    const { steps } = playLine(fenBefore, bestLine, 1);
    tags.push('missedMate');
    reasons.push(
      myMate === 1
        ? `${steps[0]?.san ?? '다른 수'}를 두면 바로 체크메이트였어요!`
        : `${steps[0]?.san ?? '다른 수'}로 시작하면 ${myMate}수 만에 메이트할 수 있었어요.`,
    );
  } else if (bestLine.length > 0) {
    const best = playLine(fenBefore, bestLine, MATERIAL_PLIES);
    const gain = balance(best.chess, mover) - startBalance;
    if (gain >= MATERIAL_THRESHOLD) {
      tags.push('missedWin');
      reasons.push(
        `${best.steps[0]?.san}를 뒀다면 기물을 약 ${gain}점 얻을 수 있었어요 (${formatLineSan(best.steps)}).`,
      );
    }
  }

  if (reasons.length === 0) {
    tags.push('positional');
    reasons.push(
      '당장 기물을 잃지는 않지만, 엔진이 끝까지 계산해 보니 상대에게 더 좋은 기회를 주는 수예요. ' +
        '최선 수순과 상대의 응수를 따라가 비교해 보세요.',
    );
  }
  return { reasons: reasons.slice(0, 3), tags: [...new Set(tags)] };
}

export interface BestMoveInput {
  fenBefore: string;
  mover: Color;
  /** 최선 수가 포함된 평가 (pv[0]이 최선 수) */
  before: PositionEval;
  /** 게임의 몇 번째 수인지 (오프닝 설명용, 0부터) */
  plyIndex: number;
}

/** 최선의 수가 왜 좋은지 */
export function explainBestMove({
  fenBefore,
  mover,
  before,
  plyIndex,
}: BestMoveInput): Explanation {
  const reasons: string[] = [];
  if (before.kind !== 'score' || !before.pv[0]) return { reasons, tags: [] };
  const bestUci = before.pv[0];
  const opponent: Color = mover === 'w' ? 'b' : 'w';
  const start = new Chess(fenBefore);
  const chess = new Chess(fenBefore);
  const move = playUci(chess, bestUci);
  if (!move) return { reasons, tags: [] };

  // 1) 메이트
  const myMate = mateLength(before, mover);
  if (myMate !== null) {
    const { steps } = playLine(fenBefore, before.pv, myMate * 2 - 1);
    reasons.push(
      myMate === 1
        ? `${move.san}는 바로 체크메이트예요!`
        : `${myMate}수 만에 체크메이트로 이어져요: ${formatLineSan(steps, myMate * 2 - 1)}`,
    );
    return { reasons, tags: [] };
  }

  // 2) 잡기
  if (move.captured) {
    const victim = josa(NAME[move.captured], '을', '를');
    const defended = start.attackers(move.to as Square, opponent).length > 0;
    if (!defended) {
      reasons.push(`지켜지지 않은 상대 ${victim} 공짜로 잡아요.`);
    } else if (VALUE[move.captured] > VALUE[move.piece]) {
      reasons.push(
        `더 값싼 ${josa(NAME[move.piece], '으로', '로')} 상대의 더 귀한 ${victim} 잡아요.`,
      );
    } else {
      reasons.push(`상대 ${victim} 잡아요.`);
    }
  }

  // 3) 위협받던 기물을 구함
  const hangingBefore = hangingPieces(start, mover).filter((p) => VALUE[p.type] >= 3);
  const hangingAfter = new Set(hangingPieces(chess, mover).map((p) => p.square));
  const saved = hangingBefore.find((p) => !hangingAfter.has(p.square) && p.square !== move.to);
  const movedAway = hangingBefore.find((p) => p.square === move.from);
  if (movedAway) {
    reasons.push(`공격받던 ${josa(NAME[movedAway.type], '을', '를')} 안전한 곳으로 옮겨요.`);
  } else if (saved) {
    reasons.push(`공격받던 ${josa(pieceLabel(saved.square, saved.type), '을', '를')} 지켜요.`);
  }

  // 4) 체크 / 포크 / 새로운 위협
  if (chess.inCheck()) reasons.push('체크를 걸어 상대가 둘 수 있는 수를 줄여요.');
  const targets = forkTargets(chess, move.to as Square);
  if (targets.length >= 2) {
    const names = joinNames(targets.map((t) => NAME[t.type]));
    reasons.push(
      `${josa(NAME[move.piece], '이', '가')} ${josa(names, '을', '를')} 동시에 노리는 포크예요.`,
    );
  } else {
    // 새로 생긴 위협 (폰도 포함: 초보자에게는 공짜 폰을 노리는 것도 중요한 생각)
    const threatened = hangingPieces(chess, opponent).filter(
      (p) => !hangingPieces(start, opponent).some((q) => q.square === p.square),
    )[0];
    if (threatened) {
      reasons.push(
        `다음에 ${josa(pieceLabel(threatened.square, threatened.type), '을', '를')} 잡겠다고 위협해요.`,
      );
    }
  }

  // 5) 기물 이득으로 이어지는 수순
  const line = playLine(fenBefore, before.pv, MATERIAL_PLIES);
  const gain = balance(line.chess, mover) - balance(start, mover);
  if (gain >= MATERIAL_THRESHOLD && !move.captured) {
    reasons.push(`수순대로 가면 기물을 약 ${gain}점 얻어요: ${formatLineSan(line.steps)}`);
  }

  // 6) 원칙적인 수 (오프닝)
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    reasons.push('캐슬링으로 킹을 안전한 곳에 두고 룩을 싸움에 참여시켜요.');
  } else if (plyIndex < 20 && (move.piece === 'n' || move.piece === 'b')) {
    const homeRank = mover === 'w' ? '1' : '8';
    if (move.from[1] === homeRank) reasons.push('잠자던 기물을 전개해서 싸움에 참여시켜요.');
  }
  if (plyIndex < 16 && move.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) {
    reasons.push('중앙 칸을 차지해서 기물들이 움직일 공간을 넓혀요.');
  }
  if (move.promotion) reasons.push(`폰이 ${NAME[move.promotion]}로 승격해요.`);

  if (reasons.length === 0) {
    reasons.push(
      '눈에 띄는 전술은 없지만, 엔진이 여러 수를 끝까지 계산해 보니 이 수가 형세를 가장 좋게 유지해요. ' +
        '아래 "수순 따라가 보기"로 이후 진행을 확인해 보세요.',
    );
  }
  return { reasons: reasons.slice(0, 3), tags: [] };
}
