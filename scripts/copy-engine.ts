// node_modules의 Stockfish WASM 빌드를 public/engine/으로 복사한다 (postinstall/prebuild에서 실행).
// 단일 스레드 lite 빌드는 COOP/COEP 헤더가 필요 없어 정적 호스팅에서 동작한다.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'node_modules', 'stockfish');
const targetDir = join(root, 'public', 'engine');

const FILES: [from: string, to: string][] = [
  ['bin/stockfish-19-lite-single.js', 'stockfish-19-lite-single.js'],
  ['bin/stockfish-19-lite-single.wasm', 'stockfish-19-lite-single.wasm'],
  ['Copying.txt', 'COPYING-stockfish.txt'], // GPLv3 고지
];

mkdirSync(targetDir, { recursive: true });

for (const [from, to] of FILES) {
  const src = join(sourceDir, from);
  const dest = join(targetDir, to);
  if (!existsSync(src)) {
    console.error(`[copy-engine] 파일이 없습니다: ${src} — 'npm install'을 먼저 실행하세요.`);
    process.exit(1);
  }
  if (existsSync(dest) && statSync(dest).size === statSync(src).size) continue;
  copyFileSync(src, dest);
  console.log(`[copy-engine] ${from} → public/engine/${to}`);
}
