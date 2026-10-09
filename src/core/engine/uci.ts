/** 엔진이 보낸 점수. 둘 차례 기준이므로 그대로 쓰지 말고 score.ts에서 정규화한다. */
export type RawScore = { kind: 'cp'; value: number } | { kind: 'mate'; value: number };

export interface UciInfo {
  depth?: number;
  multipv?: number;
  score?: RawScore;
  /** aspiration window 실패로 나온 경계값이면 true (정확한 평가가 아님) */
  bound?: boolean;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pv?: string[];
}

export type UciMessage =
  | { type: 'uciok' }
  | { type: 'readyok' }
  | { type: 'info'; info: UciInfo }
  | { type: 'bestmove'; bestmove: string | null; ponder?: string }
  | { type: 'other'; line: string };

const NUMERIC_FIELDS = {
  depth: 'depth',
  multipv: 'multipv',
  nodes: 'nodes',
  nps: 'nps',
  time: 'timeMs',
} as const satisfies Record<string, keyof UciInfo>;

function parseInfo(tokens: string[]): UciInfo {
  const info: UciInfo = {};
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === 'string') break; // 'info string ...'은 자유 텍스트
    if (token === 'pv') {
      info.pv = tokens.slice(i + 1);
      break;
    }
    if (token === 'score') {
      const kind = tokens[i + 1];
      const value = Number(tokens[i + 2]);
      if ((kind === 'cp' || kind === 'mate') && Number.isFinite(value)) {
        info.score = { kind, value };
      }
      i += 2;
      continue;
    }
    if (token === 'lowerbound' || token === 'upperbound') {
      info.bound = true;
      continue;
    }
    if (token && token in NUMERIC_FIELDS) {
      const value = Number(tokens[i + 1]);
      if (Number.isFinite(value))
        info[NUMERIC_FIELDS[token as keyof typeof NUMERIC_FIELDS]] = value;
      i += 1;
    }
  }
  return info;
}

export function parseUciLine(rawLine: string): UciMessage {
  const line = rawLine.trim();
  const tokens = line.split(/\s+/);
  switch (tokens[0]) {
    case 'uciok':
      return { type: 'uciok' };
    case 'readyok':
      return { type: 'readyok' };
    case 'info':
      return { type: 'info', info: parseInfo(tokens) };
    case 'bestmove': {
      const move = tokens[1];
      const ponderIndex = tokens.indexOf('ponder');
      const ponder = ponderIndex > 0 ? tokens[ponderIndex + 1] : undefined;
      return {
        type: 'bestmove',
        // 메이트/스테일메이트 국면에서는 'bestmove (none)'이 온다.
        bestmove: move && move !== '(none)' ? move : null,
        ...(ponder ? { ponder } : {}),
      };
    }
    default:
      return { type: 'other', line };
  }
}
