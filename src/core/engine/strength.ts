import type { Color } from 'chess.js';
import type { AnalysisLine, EngineClient, SearchLimits } from './EngineClient';
import { whiteWinPercent } from './score';

/**
 * 후보 수를 고르는 방식.
 * - best: 엔진의 1순위 수 (엔진 자체 옵션으로 강도를 조절한 경우)
 * - weighted: 여러 후보 중 승률 손실이 클수록 덜 고르는 확률 선택.
 *   Stockfish의 최저 강도(UCI_Elo 1320)도 초보자에게는 너무 강하므로 낮은 레벨에서 쓴다.
 */
export type MovePick =
  | { kind: 'best' }
  | {
      kind: 'weighted';
      /** 클수록 나쁜 수도 자주 고른다 (승률 %p 단위, 아래 moverValue 참고) */
      temperature: number;
      /** 이보다 가치를 많이 잃는 수는 고르지 않는다 (승률 %p 단위) */
      maxLoss: number;
    };

export interface LevelConfig {
  level: number;
  /** 대략적인 수준. 실제 사람 레이팅과 정확히 맞춘 값은 아니다. */
  label: string;
  description: string;
  /** 게임 시작 시 엔진에 적용할 옵션 */
  engineOptions: Record<string, string | number | boolean>;
  search: SearchLimits & { multipv: number };
  pick: MovePick;
}

const NO_LIMIT = { UCI_LimitStrength: false, 'Skill Level': 20 } as const;

/**
 * 난이도 튜닝은 이 표에서만 한다.
 *
 * 레벨 1~9는 모두 "엔진 후보 수 중 확률 선택"을 쓴다. Stockfish의 UCI_Elo 제한은 긴 시간 대국
 * 기준으로 맞춰져 있어서, 0.5초씩 생각하게 하면 표시값보다 훨씬 약했다
 * (시뮬레이션: 확률 선택 레벨 4가 UCI_Elo 1320에 4:0, 레벨 5가 UCI_Elo 1500에 3.5:0.5).
 * 그래서 레벨 이름에 Elo 숫자를 붙이지 않는다 — 실제 사람 레이팅과 맞춘 값이 아니다.
 */
export const LEVELS: readonly LevelConfig[] = [
  {
    level: 1,
    label: '입문',
    description: '행마법을 막 배운 수준. 기물을 자주 공짜로 내줘요.',
    engineOptions: NO_LIMIT,
    search: { depth: 6, multipv: 40 },
    pick: { kind: 'weighted', temperature: 30, maxLoss: 100 },
  },
  {
    level: 2,
    label: '초보',
    description: '가끔 좋은 수를 두지만 실수가 많아요.',
    engineOptions: NO_LIMIT,
    search: { depth: 8, multipv: 40 },
    pick: { kind: 'weighted', temperature: 18, maxLoss: 100 },
  },
  {
    level: 3,
    label: '초급',
    description: '큰 실수는 줄었지만 전술을 자주 놓쳐요.',
    engineOptions: NO_LIMIT,
    search: { depth: 8, multipv: 30 },
    pick: { kind: 'weighted', temperature: 10, maxLoss: 60 },
  },
  {
    level: 4,
    label: '초중급',
    description: '기물을 잘 지키고 간단한 전술을 노려요.',
    engineOptions: NO_LIMIT,
    search: { depth: 8, multipv: 12 },
    pick: { kind: 'weighted', temperature: 6, maxLoss: 30 },
  },
  {
    level: 5,
    label: '중급',
    description: '실수가 드물고 작은 이득을 잘 챙겨요.',
    engineOptions: NO_LIMIT,
    search: { depth: 8, multipv: 8 },
    pick: { kind: 'weighted', temperature: 4, maxLoss: 20 },
  },
  {
    level: 6,
    label: '중상급',
    description: '전술을 거의 놓치지 않아요.',
    engineOptions: NO_LIMIT,
    search: { depth: 10, multipv: 6 },
    pick: { kind: 'weighted', temperature: 2.5, maxLoss: 15 },
  },
  {
    level: 7,
    label: '상급',
    description: '작은 우위를 끝까지 지켜 이겨요.',
    engineOptions: NO_LIMIT,
    search: { depth: 12, multipv: 5 },
    pick: { kind: 'weighted', temperature: 1.5, maxLoss: 10 },
  },
  {
    level: 8,
    label: '고수',
    description: '깊게 계산하고 실수가 거의 없어요.',
    engineOptions: NO_LIMIT,
    search: { depth: 14, multipv: 4 },
    pick: { kind: 'weighted', temperature: 0.8, maxLoss: 6 },
  },
  {
    level: 9,
    label: '전문가',
    description: '아주 강해요. 최선에 가까운 수만 둬요.',
    engineOptions: NO_LIMIT,
    search: { depth: 16, multipv: 3 },
    pick: { kind: 'weighted', temperature: 0.4, maxLoss: 3 },
  },
  {
    level: 10,
    label: '최강',
    description: '제한 없는 Stockfish. 사람이 이기기는 거의 불가능해요.',
    engineOptions: NO_LIMIT,
    search: { movetimeMs: 1500, multipv: 1 },
    pick: { kind: 'best' },
  },
];

export function getLevel(level: number): LevelConfig {
  const config = LEVELS.find((l) => l.level === level);
  if (!config) throw new Error(`없는 레벨: ${level}`);
  return config;
}

/** 0 이상 1 미만의 난수를 돌려주는 함수. 테스트에서는 시드를 고정한 것을 넣는다. */
export type Random = () => number;

/** 시드를 고정할 수 있는 간단한 난수 생성기 (mulberry32) */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 후보 수의 "가치" (둘 차례 관점, 클수록 좋음).
 * 승률만 쓰면 크게 이기고 있을 때 모든 수가 ~100%로 같아져서 메이트를 마무리하지 못한다
 * (레벨끼리 대국 시뮬레이션에서 200수가 넘도록 끝나지 않음). 그래서 점수 차이를 조금 더한다.
 */
const CP_WEIGHT = 0.02; // 100cp 차이 = 승률 2%p만큼의 손실로 취급
const CP_CAP = 1000;
/** 메이트는 어떤 점수보다 확실히 높게: 1수 메이트 2900, 10수 이상 메이트 2000 */
const MATE_BASE = 3000;
const MATE_STEP = 100;

function cpEquivalent(line: AnalysisLine): number {
  const { score } = line;
  if (score.kind === 'cp') return Math.max(-CP_CAP, Math.min(CP_CAP, score.value));
  if (score.value === 0) return 0;
  // 빠른 메이트일수록 높게. (예전엔 범위가 점수 상한과 겹쳐 1수 메이트를 낮게 평가하는 버그가 있었다)
  const value = MATE_BASE - Math.min(Math.abs(score.value), 10) * MATE_STEP;
  return score.value > 0 ? value : -value;
}

function moverValue(line: AnalysisLine, mover: Color): number {
  const sign = mover === 'w' ? 1 : -1;
  const white = whiteWinPercent(line.score);
  const winPercent = mover === 'w' ? white : 100 - white;
  return winPercent + CP_WEIGHT * sign * cpEquivalent(line);
}

/** 엔진 후보 수 중에서 정책에 따라 하나를 고른다. 후보가 없으면 null. */
export function pickMove(
  lines: readonly AnalysisLine[],
  mover: Color,
  pick: MovePick,
  random: Random,
): string | null {
  const candidates = lines.flatMap((line) => {
    const uci = line.pv[0];
    return uci ? [{ uci, value: moverValue(line, mover) }] : [];
  });
  const best = candidates[0];
  if (!best) return null;
  if (pick.kind === 'best') return best.uci;

  const bestValue = Math.max(...candidates.map((c) => c.value));
  const weighted = candidates
    .map((c) => ({ uci: c.uci, loss: bestValue - c.value }))
    .filter(({ loss }) => loss <= pick.maxLoss)
    .map(({ uci, loss }) => ({ uci, weight: Math.exp(-loss / pick.temperature) }));

  const total = weighted.reduce((sum, c) => sum + c.weight, 0);
  let r = random() * total;
  for (const candidate of weighted) {
    r -= candidate.weight;
    if (r < 0) return candidate.uci;
  }
  return weighted.at(-1)?.uci ?? null;
}

/** 새 게임을 시작할 때 엔진에 레벨 설정을 적용한다. */
export async function applyLevel(client: EngineClient, config: LevelConfig): Promise<void> {
  for (const [name, value] of Object.entries(config.engineOptions)) {
    await client.setOption(name, value);
  }
  await client.newGame();
}

/** AI의 다음 수를 고른다. 메이트/스테일메이트 국면이면 null. */
export async function chooseAiMove(
  client: EngineClient,
  fen: string,
  config: LevelConfig,
  random: Random,
  signal?: AbortSignal,
): Promise<string | null> {
  const result = await client.analyze(fen, { ...config.search, signal });
  if (config.pick.kind === 'best') return result.bestMoveUci;
  const mover: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  return pickMove(result.lines, mover, config.pick, random) ?? result.bestMoveUci;
}
