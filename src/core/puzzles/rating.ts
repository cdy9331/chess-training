/**
 * Glicko-2 레이팅 (퍼즐 한 개 = 한 경기).
 * Mark Glickman, "Example of the Glicko-2 system" 의 계산 순서를 그대로 따른다.
 * http://www.glicko.net/glicko/glicko2.pdf
 */
export interface Glicko {
  rating: number;
  rd: number;
  volatility: number;
}

export interface GlickoGame {
  opponentRating: number;
  opponentRd: number;
  /** 1 = 승(퍼즐 성공), 0 = 패(실패) */
  score: number;
}

/** 처음 사용자. RD가 크면 처음 몇 문제에서 레이팅이 빠르게 제자리를 찾는다. */
export const INITIAL_PUZZLE_RATING: Glicko = { rating: 1000, rd: 300, volatility: 0.06 };

/** 퍼즐 데이터는 RD를 저장하지 않으므로 고정값을 쓴다 (빌드 시 RD ≤ 90인 퍼즐만 골랐다). */
const PUZZLE_RD = 80;
/** 변동성 변화 제한 (Glickman 권장 0.3~1.2) */
const TAU = 0.5;
const SCALE = 173.7178;
/** 너무 확신하거나(작은 RD) 너무 불확실해지지 않게 범위를 둔다 */
const MIN_RD = 45;
const MAX_RD = 350;

export function glicko2(player: Glicko, games: readonly GlickoGame[], tau = TAU): Glicko {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  if (games.length === 0) {
    const rd = Math.sqrt(phi ** 2 + player.volatility ** 2) * SCALE;
    return { ...player, rd };
  }

  const terms = games.map((game) => {
    const muJ = (game.opponentRating - 1500) / SCALE;
    const phiJ = game.opponentRd / SCALE;
    const g = 1 / Math.sqrt(1 + (3 * phiJ ** 2) / Math.PI ** 2);
    const e = 1 / (1 + Math.exp(-g * (mu - muJ)));
    return { g, e, score: game.score };
  });
  const v = 1 / terms.reduce((sum, t) => sum + t.g ** 2 * t.e * (1 - t.e), 0);
  const scoreSum = terms.reduce((sum, t) => sum + t.g * (t.score - t.e), 0);
  const delta = v * scoreSum;

  // 변동성 갱신 (Illinois 알고리즘)
  const a = Math.log(player.volatility ** 2);
  const f = (x: number) =>
    (Math.exp(x) * (delta ** 2 - phi ** 2 - v - Math.exp(x))) /
      (2 * (phi ** 2 + v + Math.exp(x)) ** 2) -
    (x - a) / tau ** 2;
  let A = a;
  let B: number;
  if (delta ** 2 > phi ** 2 + v) {
    B = Math.log(delta ** 2 - phi ** 2 - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k += 1;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  const volatility = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi ** 2 + volatility ** 2);
  const newPhi = 1 / Math.sqrt(1 / phiStar ** 2 + 1 / v);
  const newMu = mu + newPhi ** 2 * scoreSum;
  return { rating: newMu * SCALE + 1500, rd: newPhi * SCALE, volatility };
}

/** 퍼즐 하나를 풀고 난 뒤의 사용자 레이팅 */
export function updatePuzzleRating(player: Glicko, puzzleRating: number, solved: boolean): Glicko {
  const next = glicko2(player, [
    { opponentRating: puzzleRating, opponentRd: PUZZLE_RD, score: solved ? 1 : 0 },
  ]);
  return {
    rating: Math.round(next.rating * 10) / 10,
    rd: Math.min(MAX_RD, Math.max(MIN_RD, next.rd)),
    volatility: next.volatility,
  };
}

export function isGlicko(value: unknown): value is Glicko {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.rating === 'number' &&
    Number.isFinite(v.rating) &&
    typeof v.rd === 'number' &&
    Number.isFinite(v.rd) &&
    typeof v.volatility === 'number' &&
    Number.isFinite(v.volatility)
  );
}
