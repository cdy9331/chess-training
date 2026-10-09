import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

const TEMPLATE = new URL('./sw-template.js', import.meta.url);

/** 오프라인에 필요 없는 파일 */
const SKIP = [/\.map$/, /^sw\.js$/, /(^|\/)\./];

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * 빌드 결과(해시가 붙은 JS/CSS)와 public/ 파일(엔진, 퍼즐·오프닝 데이터) 목록을 넣어 sw.js를 만든다.
 * 내용이 바뀌면 VERSION이 바뀌고, sw.js 바이트가 달라져 브라우저가 새 서비스 워커를 설치한다.
 * (vite-plugin-pwa 대신 직접 만든 이유: 필요한 기능이 "전부 미리 받아 두기" 하나뿐이라서)
 */
export function precacheServiceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'chess-training-precache-sw',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const hash = createHash('sha256');
      const files = new Set<string>(['./', 'index.html']);

      for (const [fileName, output] of Object.entries(bundle)) {
        if (SKIP.some((re) => re.test(fileName))) continue;
        files.add(fileName);
        hash.update(fileName);
        hash.update(output.type === 'chunk' ? output.code : output.source);
      }
      for (const path of listFiles(publicDir)) {
        const fileName = relative(publicDir, path).split(sep).join('/');
        if (SKIP.some((re) => re.test(fileName))) continue;
        files.add(fileName);
        hash.update(fileName);
        hash.update(readFileSync(path));
      }

      const template = readFileSync(TEMPLATE, 'utf8');
      hash.update(template);
      const version = hash.digest('hex').slice(0, 12);
      const source =
        `const VERSION = ${JSON.stringify(version)};\n` +
        `const FILES = ${JSON.stringify([...files].sort())};\n` +
        template;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
