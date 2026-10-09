import { chessAt, type GameLine } from './gameLine';
import {
  getGameStatus,
  outcomeFromStatus,
  type GameEndReason,
  type GameResult,
} from './gameStatus';
import { parsePgn } from './pgn';

export interface ImportedGame {
  line: GameLine;
  result: GameResult;
  /** 체크메이트·스테일메이트처럼 국면에서 알 수 있는 경우만 */
  endReason?: GameEndReason;
  white: string;
  black: string;
  event?: string;
  date?: string;
}

export type PgnImportResult = { ok: true; game: ImportedGame } | { ok: false; error: string };

const RESULTS: readonly GameResult[] = ['1-0', '0-1', '1/2-1/2', '*'];

/** 여러 대국이 이어 붙은 PGN(사이트에서 받은 파일 등)에서 첫 대국만 꺼낸다. */
export function firstPgnGame(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  const starts = [...normalized.matchAll(/^\[Event /gm)].map((m) => m.index);
  return starts.length > 1 ? normalized.slice(0, starts[1]).trim() : normalized;
}

/** 붙여 넣거나 파일로 고른 PGN을 리뷰할 수 있는 대국으로 바꾼다. */
export function importPgn(text: string): PgnImportResult {
  if (!text.trim()) return { ok: false, error: 'PGN을 붙여 넣거나 파일을 골라 주세요.' };
  const parsed = parsePgn(firstPgnGame(text));
  if (!parsed) {
    return {
      ok: false,
      error: 'PGN을 읽지 못했어요. 수 기록에 틀린 수나 오타가 없는지 확인해 주세요.',
    };
  }
  const { line, headers } = parsed;
  if (line.moves.length === 0) return { ok: false, error: '수가 하나도 없는 대국이에요.' };

  // 국면으로 끝이 확실하면 그것을, 아니면 PGN의 Result 헤더를 따른다 (기권·시간패 등)
  const outcome = outcomeFromStatus(getGameStatus(chessAt(line)));
  const headerResult = RESULTS.find((r) => r === headers.Result) ?? '*';
  const clean = (v: string | undefined) => (v && v !== '?' && v !== '????.??.??' ? v : undefined);

  return {
    ok: true,
    game: {
      line,
      result: outcome?.result ?? headerResult,
      endReason: outcome?.reason,
      white: clean(headers.White) ?? '백',
      black: clean(headers.Black) ?? '흑',
      event: clean(headers.Event),
      date: clean(headers.Date),
    },
  };
}
