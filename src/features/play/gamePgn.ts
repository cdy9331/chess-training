import { getLevel } from '../../core/engine';
import { lineToPgn, type GameLine, type GameOutcome } from '../../core/chess';
import type { GameRecord } from '../../db/schema';

function pgnDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 저장용 PGN. 기권·합의 무승부처럼 규칙으로 알 수 없는 결과도 Result에 반영한다. */
export function buildGamePgn(record: GameRecord, line: GameLine, outcome: GameOutcome): string {
  const ai = `컴퓨터 (레벨 ${record.aiLevel} · ${getLevel(record.aiLevel).label})`;
  return lineToPgn(line, {
    Event: 'AI 대국',
    Site: '체스 트레이닝',
    Date: pgnDate(record.createdAt),
    White: record.playerColor === 'w' ? '나' : ai,
    Black: record.playerColor === 'b' ? '나' : ai,
    Result: outcome.result,
    Termination: outcome.reason,
  });
}
