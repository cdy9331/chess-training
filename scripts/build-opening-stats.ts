// Lichess 월별 대국 기록(raw-data/games/*.pgn.zst)에서 오프닝 "선택률" 통계를 만든다.
// 실행: npm run data:opening-stats
//
// - 두 사람 모두 레이팅 MIN_RATING 이상인 대국만 센다 (사용자 요청: 1400 이상).
// - 처음 MAX_PLIES 수까지 각 국면(EPD)이 몇 판에서 나왔는지 센다.
//   오프닝 이름 목록(openings.json)에 없는 국면도 자주 나오면 남겨서 탐색기에서 더 깊이 따라갈 수 있게 한다.
// - 대국이 수백만 판이라 드문 국면은 주기적으로 버려 메모리를 제한한다 (빈도 근사; 남기는 기준보다 훨씬 작은 수만 버린다).
// 결과: public/data/openings/stats.json  { counts: { [epd]: 판 수 } }
// 참고: 2015-01(약 150만 판)에서 약 65분 걸렸다 (chess.js로 처음 20수를 실제로 둬 보기 때문).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { readZstdLines } from './lib/zstd.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_DIR = join(root, 'raw-data', 'games');
const OUTPUT = join(root, 'public', 'data', 'openings', 'stats.json');

const STATS_VERSION = 1; // src/core/openings/book.ts의 OPENING_STATS_VERSION과 같아야 한다
const MIN_RATING = 1400;
const MAX_PLIES = 20;
/** 최종 결과에 남길 최소 판 수 (파일 크기와 통계 신뢰도의 균형) */
const MIN_COUNT = 150;
/** 메모리 제한: 이만큼 판을 읽을 때마다 아주 드문 국면을 버린다 */
const PRUNE_EVERY_GAMES = 100_000;
const PRUNE_BELOW = 3;

const toEpd = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

const file = existsSync(INPUT_DIR)
  ? readdirSync(INPUT_DIR).find((f) => f.endsWith('.pgn.zst'))
  : undefined;
if (!file) {
  console.error(`[build-opening-stats] ${INPUT_DIR}에 .pgn.zst 파일이 없습니다.`);
  console.error(
    'https://database.lichess.org/ 의 월별 표준 대국 파일을 raw-data/games/에 넣으세요.',
  );
  process.exit(1);
}

const counts = new Map<string, number>();
let gamesRead = 0;
let gamesUsed = 0;
let whiteElo = 0;
let blackElo = 0;
const started = Date.now();

function prune() {
  for (const [epd, n] of counts) if (n < PRUNE_BELOW) counts.delete(epd);
}

/** "1. e4 e5 2. Nf3 {[%eval 0.2]} Nc6 ... 1-0" → ["e4", "e5", "Nf3", "Nc6", ...] */
function sanTokens(movetext: string): string[] {
  return movetext
    .replace(/\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
    .map((t) => t.replace(/^\d+\.+/, '').replace(/[!?]+$/, ''))
    .filter(Boolean);
}

function countGame(movetext: string) {
  const chess = new Chess();
  let ply = 0;
  for (const san of sanTokens(movetext)) {
    if (ply >= MAX_PLIES) break;
    try {
      chess.move(san);
    } catch {
      return;
    }
    ply += 1;
    const epd = toEpd(chess.fen());
    counts.set(epd, (counts.get(epd) ?? 0) + 1);
  }
}

for await (const line of readZstdLines(join(INPUT_DIR, file))) {
  if (line.startsWith('[')) {
    if (line.startsWith('[WhiteElo "')) whiteElo = Number(line.slice(11, -2)) || 0;
    else if (line.startsWith('[BlackElo "')) blackElo = Number(line.slice(11, -2)) || 0;
    continue;
  }
  if (!line.trim()) continue;
  // 머리글 다음의 수순 줄 (Lichess 덤프는 한 판의 수순이 한 줄)
  gamesRead += 1;
  if (whiteElo >= MIN_RATING && blackElo >= MIN_RATING) {
    gamesUsed += 1;
    countGame(line);
    if (gamesUsed % PRUNE_EVERY_GAMES === 0) {
      prune();
      console.log(
        `[build-opening-stats] ${gamesRead.toLocaleString()}판 읽음, ${gamesUsed.toLocaleString()}판 사용, 국면 ${counts.size.toLocaleString()}개`,
      );
    }
  }
  whiteElo = 0;
  blackElo = 0;
}

const kept: Record<string, number> = {};
for (const [epd, n] of counts) if (n >= MIN_COUNT) kept[epd] = n;

mkdirSync(dirname(OUTPUT), { recursive: true });
const json = JSON.stringify({
  version: STATS_VERSION,
  source: `Lichess ${file} (CC0) https://database.lichess.org/`,
  minRating: MIN_RATING,
  maxPlies: MAX_PLIES,
  minCount: MIN_COUNT,
  games: gamesUsed,
  counts: kept,
});
writeFileSync(OUTPUT, json);

console.log(
  `[build-opening-stats] 전체 ${gamesRead.toLocaleString()}판 중 양쪽 ${MIN_RATING} 이상 ${gamesUsed.toLocaleString()}판 사용`,
);
console.log(
  `[build-opening-stats] ${MIN_COUNT}판 이상 나온 국면 ${Object.keys(kept).length.toLocaleString()}개, ${(json.length / 1024).toFixed(0)}KB, ${((Date.now() - started) / 1000).toFixed(0)}초`,
);
