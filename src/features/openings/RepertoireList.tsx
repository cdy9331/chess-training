import { useEffect, useState } from 'react';
import type { RepertoireLine } from '../../core/openings';
import { isDue } from '../../core/srs/scheduler';
import { REPERTOIRE } from '../../content/openings/repertoire';
import { openingsRepo } from '../../db/repos/openings';
import type { OpeningProgressRecord } from '../../db/schema';
import styles from './Openings.module.css';
import type { DrillMode } from './RepertoireDrill';

const DAY = 24 * 60 * 60 * 1000;

function dueText(progress: OpeningProgressRecord | undefined, now: number): string {
  if (!progress) return '아직 연습 전';
  if (isDue(progress, now)) return '🔔 오늘 복습할 차례';
  const days = Math.ceil((progress.due - now) / DAY);
  return `${days}일 뒤 복습`;
}

interface RepertoireListProps {
  onStart: (line: RepertoireLine, mode: DrillMode) => void;
}

export function RepertoireList({ onStart }: RepertoireListProps) {
  const [progress, setProgress] = useState<Map<string, OpeningProgressRecord> | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    openingsRepo
      .progressMap()
      .then((p) => !cancelled && setProgress(p))
      .catch(() => !cancelled && setProgress(new Map()));
    return () => {
      cancelled = true;
    };
  }, []);

  const dueLines = REPERTOIRE.filter((l) => {
    const p = progress?.get(l.id);
    return p && isDue(p, now);
  });

  const renderGroup = (side: 'w' | 'b', title: string) => (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <ul className={styles.lineList}>
        {REPERTOIRE.filter((l) => l.side === side).map((line) => {
          const p = progress?.get(line.id);
          return (
            <li key={line.id} className={styles.lineCard}>
              <div className={styles.lineMain}>
                <strong>{line.name}</strong>
                <span className={styles.small}>{line.summary}</span>
                <span className={styles.small}>
                  {Math.ceil(line.moves.length / 2)}수 · {dueText(p, now)}
                  {p && ` · 숙련도 ${'●'.repeat(p.box)}${'○'.repeat(5 - p.box)}`}
                </span>
              </div>
              <div className={styles.lineActions}>
                <button type="button" onClick={() => onStart(line, 'learn')}>
                  📘 배우기
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => onStart(line, 'test')}
                >
                  🧠 외워서 두기
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className={styles.listWrap}>
      <p className={styles.muted}>
        <strong>배우기</strong>: 화살표와 설명을 보며 따라 둬요. <strong>외워서 두기</strong>: 힌트
        없이 두고, 결과에 따라 다음 복습 날짜가 정해져요 (틀린 라인은 다음 날 다시 나와요).
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
    </div>
  );
}
