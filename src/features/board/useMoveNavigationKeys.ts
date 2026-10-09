import { useEffect } from 'react';

interface NavigationHandlers {
  first: () => void;
  prev: () => void;
  next: () => void;
  last: () => void;
}

/** ←/→/Home/End 키로 기보를 탐색한다. 입력창에 포커스가 있을 때는 무시한다. */
export function useMoveNavigationKeys({ first, prev, next, last }: NavigationHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { target } = e;
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      const action = { ArrowLeft: prev, ArrowRight: next, Home: first, End: last }[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [first, prev, next, last]);
}
