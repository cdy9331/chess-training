import { defineConfig } from '@playwright/test';

const PORT = 4174;

/**
 * 스모크 E2E. 브라우저를 따로 내려받지 않고 PC에 설치된 Edge를 쓴다
 * (Chrome을 쓰려면 PW_CHANNEL=chrome). 빌드 결과(preview)로 확인해 엔진 WASM 로딩까지 검사한다.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: process.env.PW_CHANNEL ?? 'msedge',
    // 서비스 워커 캐시가 테스트 사이에 남지 않게 한다
    serviceWorkers: 'block',
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
