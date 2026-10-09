export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const DAY = 24 * 60 * 60 * 1000;

/** 다음 복습일을 "오늘 / 내일 / N일 뒤"로 */
export function formatDueIn(due: number, now: number): string {
  const days = Math.ceil((due - now) / DAY);
  if (days <= 0) return '오늘';
  if (days === 1) return '내일';
  return `${days}일 뒤`;
}
