/** 연속 학습일 계산. 날짜는 사용자의 지역 시간 기준 "YYYY-MM-DD"로 비교한다. */

export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y ?? 0, (m ?? 1) - 1, (d ?? 1) - 1).getTime());
}

export interface StreakInfo {
  /** 오늘(또는 어제)까지 이어진 연속 학습일 */
  current: number;
  /** 기록 중 가장 긴 연속 학습일 */
  longest: number;
  /** 오늘 학습했는가 */
  activeToday: boolean;
  /** 학습한 날 수 */
  totalDays: number;
}

/**
 * @param activityTimes 학습 활동이 있었던 시각들 (퍼즐·대국·레슨·오프닝·실수 복습)
 * 오늘 아직 학습하지 않았더라도 어제까지 이어졌다면 연속 기록은 유지된다.
 */
export function computeStreak(activityTimes: readonly number[], now: number): StreakInfo {
  const days = new Set(activityTimes.map(dayKey));
  const today = dayKey(now);
  const activeToday = days.has(today);

  let current = 0;
  let cursor = activeToday ? today : previousDay(today);
  while (days.has(cursor)) {
    current += 1;
    cursor = previousDay(cursor);
  }

  let longest = 0;
  for (const day of days) {
    if (days.has(previousDay(day))) continue; // 연속 구간의 시작일만 센다
    let length = 0;
    let d = day;
    // 시작일부터 다음 날들을 따라간다
    while (days.has(d)) {
      length += 1;
      const [y, m, dd] = d.split('-').map(Number);
      d = dayKey(new Date(y ?? 0, (m ?? 1) - 1, (dd ?? 1) + 1).getTime());
    }
    longest = Math.max(longest, length);
  }

  return { current, longest, activeToday, totalDays: days.size };
}
