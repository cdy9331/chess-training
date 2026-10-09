// Lichess 퍼즐 DB(raw-data/lichess_db_puzzle.csv.zst)에서 초보자 학습용 퍼즐을 골라
// public/data/puzzles/ 에 레이팅 구간별 JSON으로 저장한다. 실행: npm run data:puzzles
//
// 고르는 기준 (PLAN.md 4.3):
// - 품질: Popularity ≥ 80, NbPlays ≥ 100, RatingDeviation ≤ 90
// - 레이팅 400~2199를 100점 구간으로 나누고 구간당 최대 2000개
// - 초보 핵심 테마는 구간마다 최소 QUOTA개씩 먼저 담고, 나머지는 무작위로 채운다
// 원본 CSV는 수백만 줄이라 디스크에 풀지 않고 스트림으로 해제하며 구간·테마별 표본(reservoir)만 남긴다.
// (압축 파일 자체(약 300MB)는 프레임 경계를 읽기 위해 메모리에 올린다.)
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { readZstdLines } from './lib/zstd.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = join(root, 'raw-data', 'lichess_db_puzzle.csv.zst');
const OUTPUT = join(root, 'public', 'data', 'puzzles');

const DATA_VERSION = 1; // src/core/puzzles/types.ts의 PUZZLE_DATA_VERSION과 같아야 한다
const MIN_POPULARITY = 80;
const MIN_PLAYS = 100;
const MAX_RATING_DEVIATION = 90;
const MIN_RATING = 400;
const MAX_RATING = 2199;
const BAND_SIZE = 100;
const PER_BAND = 2000;
const QUOTA = 160;
/** 드문 테마부터: 퍼즐에 여러 테마가 있으면 앞쪽 테마의 몫으로 센다. src/core/puzzles/themes.ts와 맞출 것 */
const KEY_THEMES = [
  'skewer',
  'discoveredAttack',
  'backRankMate',
  'pin',
  'hangingPiece',
  'fork',
  'mateIn2',
  'mateIn1',
  'endgame',
] as const;
const OTHER = 'other';

if (!existsSync(INPUT)) {
  console.error(`[build-puzzles] 원본이 없습니다: ${INPUT}`);
  console.error(
    'https://database.lichess.org/#puzzles 에서 lichess_db_puzzle.csv.zst를 받아 raw-data/에 넣으세요.',
  );
  process.exit(1);
}

/** 시드 고정 난수 (mulberry32) — 같은 원본이면 항상 같은 퍼즐이 뽑힌다 */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seeded(2026);

type Row = [id: string, fen: string, moves: string, rating: number, themes: string];

/** 구간 → 테마 버킷 → 표본 */
interface Reservoir {
  seen: number;
  items: Row[];
}
const reservoirs = new Map<number, Map<string, Reservoir>>();

function addToReservoir(band: number, bucket: string, row: Row) {
  let buckets = reservoirs.get(band);
  if (!buckets) reservoirs.set(band, (buckets = new Map()));
  let r = buckets.get(bucket);
  if (!r) buckets.set(bucket, (r = { seen: 0, items: [] }));
  r.seen += 1;
  if (r.items.length < PER_BAND) {
    r.items.push(row);
  } else {
    const j = Math.floor(random() * r.seen);
    if (j < PER_BAND) r.items[j] = row;
  }
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

/** 수순이 모두 합법인지 확인 (원본 데이터 오류 방지) */
function isValidPuzzle(fen: string, moves: string): boolean {
  try {
    const chess = new Chess(fen);
    for (const uci of moves.split(' ')) {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    return true;
  } catch {
    return false;
  }
}

const started = Date.now();
let scanned = 0;
let passed = 0;
let header: string[] | null = null;

const lines = readZstdLines(INPUT);

for await (const line of lines) {
  if (!header) {
    header = line.split(',');
    const expected = [
      'PuzzleId',
      'FEN',
      'Moves',
      'Rating',
      'RatingDeviation',
      'Popularity',
      'NbPlays',
      'Themes',
    ];
    if (expected.some((name, i) => header?.[i] !== name)) {
      console.error(`[build-puzzles] 예상과 다른 CSV 머리글: ${line}`);
      process.exit(1);
    }
    continue;
  }
  scanned += 1;
  if (scanned % 500_000 === 0) console.log(`[build-puzzles] ${scanned.toLocaleString()}줄 읽음…`);

  // 쉼표가 들어가는 필드가 없어 단순 분리로 충분하다 (GameUrl, OpeningTags 포함)
  const [id, fen, moves, ratingS, rdS, popS, playsS, themes = ''] = line.split(',');
  const rating = Number(ratingS);
  if (
    !id ||
    !fen ||
    !moves ||
    Number(popS) < MIN_POPULARITY ||
    Number(playsS) < MIN_PLAYS ||
    Number(rdS) > MAX_RATING_DEVIATION ||
    rating < MIN_RATING ||
    rating > MAX_RATING
  ) {
    continue;
  }
  passed += 1;
  const themeList = themes.split(' ');
  const bucket = KEY_THEMES.find((t) => themeList.includes(t)) ?? OTHER;
  const band = Math.floor(rating / BAND_SIZE) * BAND_SIZE;
  addToReservoir(band, bucket, [id, fen, moves, rating, themes]);
}

// --- 구간마다 테마 몫을 먼저 담고 나머지를 무작위로 채운다 ---
if (existsSync(OUTPUT)) {
  for (const f of readdirSync(OUTPUT)) if (f.endsWith('.json')) rmSync(join(OUTPUT, f));
}
mkdirSync(OUTPUT, { recursive: true });

const index = {
  version: DATA_VERSION,
  bandSize: BAND_SIZE,
  generatedAt: new Date().toISOString().slice(0, 10),
  source: 'Lichess puzzle database (CC0) https://database.lichess.org/#puzzles',
  bands: [] as { band: number; file: string; count: number }[],
  themes: {} as Record<string, number>,
};
let invalid = 0;
let totalBytes = 0;

for (const band of [...reservoirs.keys()].sort((a, b) => a - b)) {
  const buckets = reservoirs.get(band) ?? new Map<string, Reservoir>();
  const chosen: Row[] = [];
  const leftovers: Row[] = [];
  for (const theme of [...KEY_THEMES, OTHER]) {
    const items = shuffle([...(buckets.get(theme)?.items ?? [])]);
    const take = theme === OTHER ? 0 : QUOTA;
    chosen.push(...items.slice(0, take));
    leftovers.push(...items.slice(take));
  }
  chosen.push(...shuffle(leftovers).slice(0, Math.max(0, PER_BAND - chosen.length)));

  const valid = chosen.filter((row) => {
    const ok = isValidPuzzle(row[1], row[2]);
    if (!ok) invalid += 1;
    return ok;
  });
  valid.sort((a, b) => a[3] - b[3]);
  for (const row of valid) {
    for (const t of row[4].split(' ')) if (t) index.themes[t] = (index.themes[t] ?? 0) + 1;
  }

  const file = `r${String(band).padStart(4, '0')}.json`;
  const json = JSON.stringify(valid);
  writeFileSync(join(OUTPUT, file), json);
  totalBytes += Buffer.byteLength(json);
  index.bands.push({ band, file, count: valid.length });
}

writeFileSync(join(OUTPUT, 'index.json'), JSON.stringify(index, null, 2));
totalBytes += statSync(join(OUTPUT, 'index.json')).size;

const total = index.bands.reduce((s, b) => s + b.count, 0);
console.log(
  `[build-puzzles] 읽은 퍼즐 ${scanned.toLocaleString()}개, 기준 통과 ${passed.toLocaleString()}개`,
);
console.log(`[build-puzzles] 저장 ${total.toLocaleString()}개 (잘못된 수순으로 제외 ${invalid}개)`);
console.log(`[build-puzzles] 구간별: ${index.bands.map((b) => `${b.band}:${b.count}`).join(' ')}`);
console.log(
  `[build-puzzles] 핵심 테마: ${KEY_THEMES.map((t) => `${t}:${index.themes[t] ?? 0}`).join(' ')}`,
);
console.log(
  `[build-puzzles] 총 크기 ${(totalBytes / 1024 / 1024).toFixed(2)}MB, ${((Date.now() - started) / 1000).toFixed(0)}초`,
);
