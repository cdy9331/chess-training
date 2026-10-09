import type { Color } from 'chess.js';
import type { RawScore } from './uci';

/**
 * 항상 백 관점의 점수.
 * - cp: 센티폰 (100 = 폰 한 개만큼 백 우세)
 * - mate: 양수면 백이 N수 안에 메이트, 음수면 흑이 메이트. 0이면 이미 메이트된 국면.
 */
export type Score = { kind: 'cp'; value: number } | { kind: 'mate'; value: number };

/** 엔진 점수(둘 차례 기준)를 백 관점으로 바꾼다. 엔진 점수는 반드시 이 함수를 거친다. */
export function normalizeScore(raw: RawScore, sideToMove: Color): Score {
  const sign = sideToMove === 'w' ? 1 : -1;
  // 'mate 0'은 둘 차례인 쪽이 이미 메이트당했다는 뜻 → 상대가 이긴 것으로 기록한다.
  if (raw.kind === 'mate' && raw.value === 0) return { kind: 'mate', value: 0 };
  return { kind: raw.kind, value: raw.value * sign + 0 }; // +0: -0 방지
}

/**
 * 백의 승리 확률(%)로 변환. Lichess의 정확도 계산에서 쓰는 공식과 같다.
 * https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/WinPercent.scala
 */
export function whiteWinPercent(score: Score): number {
  if (score.kind === 'mate') return score.value > 0 ? 100 : score.value < 0 ? 0 : 50;
  const cp = Math.max(-1000, Math.min(1000, score.value));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** 화면 표시용: "+0.34", "-1.20", "M3", "-M2", "0.00" */
export function formatScore(score: Score): string {
  if (score.kind === 'mate') {
    if (score.value === 0) return '#';
    return score.value > 0 ? `M${score.value}` : `-M${-score.value}`;
  }
  const pawns = score.value / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(2)}`;
}
