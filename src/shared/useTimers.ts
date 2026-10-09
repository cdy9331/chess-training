import { useCallback, useEffect, useRef } from 'react';

/** 예약한 setTimeout을 화면을 떠나거나 clear()할 때 한꺼번에 취소한다. */
export function useTimers() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const clear = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current.clear();
  }, []);
  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);
  useEffect(() => clear, [clear]);
  return { schedule, clear };
}
