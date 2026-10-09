/**
 * 수 하나의 정확도(0~100). Lichess의 공식을 그대로 쓴다.
 * https://lichess.org/page/accuracy
 */
export function moveAccuracy(lossPercent: number): number {
  const raw = 103.1668 * Math.exp(-0.04354 * Math.max(0, lossPercent)) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

/** 게임 정확도 = 수별 정확도의 평균. 둔 수가 없으면 null. */
export function gameAccuracy(lossPercents: readonly number[]): number | null {
  if (lossPercents.length === 0) return null;
  const sum = lossPercents.reduce((acc, loss) => acc + moveAccuracy(loss), 0);
  return sum / lossPercents.length;
}
