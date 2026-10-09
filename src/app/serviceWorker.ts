/**
 * 빌드한 앱에서만 서비스 워커를 등록한다 (개발 서버에서는 캐시가 수정 사항을 가려 혼란스럽다).
 * 서비스 워커가 엔진·데이터를 미리 받아 두므로 한 번 열어 본 뒤에는 인터넷 없이도 동작한다.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
