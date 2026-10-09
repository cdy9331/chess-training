import { useEffect, useState } from 'react';
import { fenToEpd } from '../../core/chess';
import { resolveLine, type OpeningBook, type RepertoireLine } from '../../core/openings';
import { isDue } from '../../core/srs/scheduler';
import { REPERTOIRE } from '../../content/openings/repertoire';
import { customLineToRepertoire, openingsRepo } from '../../db/repos/openings';
import type { OpeningProgressRecord } from '../../db/schema';
import { useOpeningBook } from '../../shared/useOpeningBook';
import styles from './Openings.module.css';
import type { DrillMode } from './RepertoireDrill';

const DAY = 24 * 60 * 60 * 1000;
/** 라인의 인기도는 이 수(ply)까지 둔 국면이 실제 대국에서 나온 판 수로 잰다 */
const POPULARITY_PLY = 6;

function dueText(progress: OpeningProgressRecord | undefined, now: number): string {
  if (!progress) return '아직 연습 전';
  if (isDue(progress, now)) return '🔔 오늘 복습할 차례';
  const days = Math.ceil((progress.due - now) / DAY);
  return `${days}일 뒤 복습`;
}

function popularity(book: OpeningBook | null, line: RepertoireLine): number {
  if (!book) return 0;
  const moves = resolveLine(line);
  const at = moves[Math.min(POPULARITY_PLY, moves.length) - 1];
  return at ? book.count(fenToEpd(at.fenAfter)) : 0;
}

interface RepertoireListProps {
  onStart: (line: RepertoireLine, mode: DrillMode) => void;
}

export function RepertoireList({ onStart }: RepertoireListProps) {
  const book = useOpeningBook();
  const [progress, setProgress] = useState<Map<string, OpeningProgressRecord> | null>(null);
  const [customLines, setCustomLines] = useState<RepertoireLine[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.all([openingsRepo.progressMap(), openingsRepo.listCustomLines()])
      .then(([p, custom]) => {
        if (cancelled) return;
        setProgress(p);
        setCustomLines(custom.map(customLineToRepertoire));
      })
      .catch(() => !cancelled && setProgress(new Map()));
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function removeCustom(line: RepertoireLine) {
    if (!window.confirm(`"${line.name}" 라인을 삭제할까요? 복습 기록도 함께 지워져요.`)) return;
    await openingsRepo.removeCustomLine(line.id);
    setReloadToken((t) => t + 1);
  }

  const allLines = [...REPERTOIRE, ...customLines];
  const dueLines = allLines.filter((l) => {
    const p = progress?.get(l.id);
    return p && isDue(p, now);
  });

  const renderCard = (line: RepertoireLine, custom: boolean) => {
    const p = progress?.get(line.id);
    const games = popularity(book, line);
    return (
      <li key={line.id} className={styles.lineCard}>
        <div className={styles.lineMain}>
          <strong>{line.name}</strong>
          <span className={styles.small}>{line.summary}</span>
          <span className={styles.small}>
            {Math.ceil(line.moves.length / 2)}수 · {dueText(p, now)}
            {p && ` · 숙련도 ${'●'.repeat(p.box)}${'○'.repeat(5 - p.box)}`}
            {games > 0 &&
              ` · ${Math.ceil(Math.min(POPULARITY_PLY, line.moves.length) / 2)}수째까지 같은 실전 대국 ${games.toLocaleString()}판`}
          </span>
        </div>
        <div className={styles.lineActions}>
          <button type="button" onClick={() => onStart(line, 'learn')}>
            📘 배우기
          </button>
          <button type="button" className={styles.primary} onClick={() => onStart(line, 'test')}>
            🧠 외워서 두기
          </button>
          {custom && (
            <button type="button" onClick={() => void removeCustom(line)} aria-label="라인 삭제">
              🗑
            </button>
          )}
        </div>
      </li>
    );
  };

  const renderGroup = (side: 'w' | 'b', title: string) => {
    // 실제 대국에서 많이 나오는 라인부터 (통계가 없으면 원래 순서)
    const lines = REPERTOIRE.filter((l) => l.side === side)
      .map((line, index) => ({ line, index, games: popularity(book, line) }))
      .sort((a, b) => b.games - a.games || a.index - b.index)
      .map((x) => x.line);
    return (
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>{title}</h2>
        <ul className={styles.lineList}>{lines.map((line) => renderCard(line, false))}</ul>
      </section>
    );
  };

  return (
    <div className={styles.listWrap}>
      <p className={styles.muted}>
        <strong>배우기</strong>: 화살표와 설명을 보며 따라 둬요. <strong>외워서 두기</strong>: 힌트
        없이 두고, 결과에 따라 다음 복습 날짜가 정해져요 (틀린 라인은 다음 날 다시 나와요).
        {book?.stats && ' 같은 색 안에서는 실전에서 많이 나오는 라인부터 보여줘요.'}
      </p>
      {dueLines.length > 0 && (
        <div className={styles.dueBox}>
          <strong>🔔 오늘 복습할 라인 {dueLines.length}개</strong>
          <div className={styles.dueButtons}>
            {dueLines.map((l) => (
              <button key={l.id} type="button" onClick={() => onStart(l, 'test')}>
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {renderGroup('w', '♔ 백으로 둘 때')}
      {renderGroup('b', '♚ 흑으로 둘 때')}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>📌 내가 만든 라인</h2>
        {customLines.length === 0 ? (
          <p className={styles.small}>
            오프닝 탐색기에서 수순을 따라간 뒤 "이 수순 연습하기"를 누르면 여기에 저장돼요.
          </p>
        ) : (
          <ul className={styles.lineList}>{customLines.map((line) => renderCard(line, true))}</ul>
        )}
      </section>
    </div>
  );
}
