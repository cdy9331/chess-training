// lichess-org/chess-openings(raw-data/openings/a~e.tsv)를 "국면 → 오프닝 이름" 표로 바꿔
// public/data/openings/openings.json 에 저장한다. 실행: npm run data:openings
//
// - 각 수순을 chess.js로 실제로 둬 보며 거치는 모든 국면을 기록한다.
// - 수순의 끝 국면에는 이름을 붙이고, 중간 국면은 이름 없이 "정석 수순 안(book)"으로 표시한다.
// - 국면은 EPD(반수·수 번호 제외)로 비교하므로 수순 순서가 달라도 같은 국면이면 인식된다(전치).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_DIR = join(root, 'raw-data', 'openings');
const OUTPUT_DIR = join(root, 'public', 'data', 'openings');
const DATA_VERSION = 1; // src/core/openings/book.ts의 OPENING_DATA_VERSION과 같아야 한다

/** chess.js FEN에서 반수·수 번호를 뺀 국면 식별자 (src/core/chess/fen.ts의 fenToEpd와 같은 규칙) */
const toEpd = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

type Entry = [eco: string, name: string] | 0;
const positions: Record<string, Entry> = {};
let lines = 0;
let invalid = 0;
let named = 0;

for (const letter of ['a', 'b', 'c', 'd', 'e']) {
  const file = join(INPUT_DIR, `${letter}.tsv`);
  if (!existsSync(file)) {
    console.error(`[build-openings] 파일이 없습니다: ${file}`);
    console.error(
      'https://github.com/lichess-org/chess-openings 의 a~e.tsv를 raw-data/openings/에 넣으세요.',
    );
    process.exit(1);
  }
  const rows = readFileSync(file, 'utf8').split('\n').slice(1).filter(Boolean);
  for (const row of rows) {
    const [eco, name, pgn] = row.split('\t');
    if (!eco || !name || !pgn) continue;
    lines += 1;
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch {
      invalid += 1;
      continue;
    }
    // 수순을 처음부터 다시 둬 보며 중간 국면을 모두 기록
    const replay = new Chess();
    for (const move of chess.history()) {
      replay.move(move);
      const epd = toEpd(replay.fen());
      if (!(epd in positions)) positions[epd] = 0;
    }
    // 끝 국면에 이름: 같은 국면이 여러 번 나오면 먼저 나온(파일 순서상 더 기본적인) 이름을 쓴다
    const endEpd = toEpd(replay.fen());
    if (positions[endEpd] === 0) {
      positions[endEpd] = [eco, name];
      named += 1;
    }
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const output = {
  version: DATA_VERSION,
  source: 'lichess-org/chess-openings (CC0) https://github.com/lichess-org/chess-openings',
  generatedAt: new Date().toISOString().slice(0, 10),
  positions,
};
const json = JSON.stringify(output);
writeFileSync(join(OUTPUT_DIR, 'openings.json'), json);

console.log(`[build-openings] 오프닝 수순 ${lines}개 (읽지 못한 수순 ${invalid}개)`);
console.log(
  `[build-openings] 국면 ${Object.keys(positions).length}개 (이름 있는 국면 ${named}개), ${(json.length / 1024).toFixed(0)}KB`,
);
