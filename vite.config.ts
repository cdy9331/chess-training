import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 상대 경로로 빌드해 GitHub Pages 같은 하위 경로 정적 호스팅에서도 동작하게 한다.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // 테스트 파일이 많아지면서 전체 실행 시 jsdom 준비 등으로 5초 기본 제한을 넘기는 경우가 생겼다
    testTimeout: 15_000,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
