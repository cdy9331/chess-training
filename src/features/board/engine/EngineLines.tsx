import { formatSanLine, uciLineToSan } from '../../../core/chess';
import { formatScore, type AnalysisLine } from '../../../core/engine';
import styles from './EngineLines.module.css';
import type { EngineAnalysis } from './useEngineAnalysis';

/** 후보 수순은 앞부분만 보여준다 (너무 길면 초보자가 읽기 어렵다). */
const PV_DISPLAY_PLIES = 10;

interface EngineLinesProps {
  fen: string;
  analysis: EngineAnalysis;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** 후보 수순을 누르면 첫 수를 둔다. */
  onPlayMove?: (uci: string) => void;
  /** 분석할 수 없는 국면일 때 보여줄 안내 (예: 게임 종료) */
  disabledReason?: string;
}

export function EngineLines({
  fen,
  analysis,
  enabled,
  onToggle,
  onPlayMove,
  disabledReason,
}: EngineLinesProps) {
  return (
    <section className={styles.panel} aria-label="엔진 분석">
      <header className={styles.header}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          엔진 분석
        </label>
        <span className={styles.meta}>{statusText(analysis, enabled, disabledReason)}</span>
      </header>

      {analysis.status === 'error' && (
        <p className={styles.error}>
          엔진을 실행하지 못했어요: {analysis.error} <br />
          페이지를 새로고침하거나 엔진 분석을 껐다 켜 보세요.
        </p>
      )}

      {enabled && !disabledReason && analysis.lines.length > 0 && (
        <ol className={styles.lines}>
          {analysis.lines.map((line) => (
            <LineItem key={line.multipv} fen={fen} line={line} onPlayMove={onPlayMove} />
          ))}
        </ol>
      )}
    </section>
  );
}

function LineItem({
  fen,
  line,
  onPlayMove,
}: {
  fen: string;
  line: AnalysisLine;
  onPlayMove?: (uci: string) => void;
}) {
  const sans = uciLineToSan(fen, line.pv.slice(0, PV_DISPLAY_PLIES));
  const firstMove = line.pv[0];
  const positive = line.score.kind === 'mate' ? line.score.value > 0 : line.score.value >= 0;
  return (
    <li>
      <button
        type="button"
        className={styles.line}
        onClick={() => firstMove && onPlayMove?.(firstMove)}
        disabled={!onPlayMove}
        title="누르면 이 수순의 첫 수를 둡니다"
      >
        <span className={`${styles.score} ${positive ? styles.scoreWhite : styles.scoreBlack}`}>
          {formatScore(line.score)}
        </span>
        <span className={styles.pv}>
          {formatSanLine(fen, sans)}
          {line.pv.length > PV_DISPLAY_PLIES && ' …'}
        </span>
      </button>
    </li>
  );
}

function statusText(analysis: EngineAnalysis, enabled: boolean, disabledReason?: string) {
  if (!enabled) return '꺼짐';
  if (disabledReason) return disabledReason;
  switch (analysis.status) {
    case 'analyzing':
      return analysis.depth > 0 ? `분석 중… 깊이 ${analysis.depth}` : '분석 준비 중…';
    case 'done':
      return `깊이 ${analysis.depth} · 완료`;
    case 'error':
      return '오류';
    case 'off':
      return '꺼짐';
  }
}
