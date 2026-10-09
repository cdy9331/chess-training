import { useState } from 'react';
import type { RepertoireLine } from '../../core/openings';
import { OpeningExplorer } from './OpeningExplorer';
import styles from './Openings.module.css';
import { RepertoireDrill, type DrillMode } from './RepertoireDrill';
import { RepertoireList } from './RepertoireList';

type Tab = 'repertoire' | 'explorer';

export function OpeningsPage() {
  const [tab, setTab] = useState<Tab>('repertoire');
  const [drill, setDrill] = useState<{ line: RepertoireLine; mode: DrillMode } | null>(null);

  if (drill) {
    return (
      <RepertoireDrill
        key={`${drill.line.id}-${drill.mode}`}
        line={drill.line}
        mode={drill.mode}
        onExit={() => setDrill(null)}
        onRestart={(mode) => setDrill({ line: drill.line, mode })}
      />
    );
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>오프닝</h1>
      <p className={styles.muted}>
        오프닝은 게임의 첫 단계예요. 원칙(중앙 차지, 기물 전개, 캐슬링)을 지키는 수순을 익혀 두면
        시작부터 손해 보는 일이 줄어요.
      </p>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'repertoire'}
          className={tab === 'repertoire' ? styles.tabActive : undefined}
          onClick={() => setTab('repertoire')}
        >
          🎯 레퍼토리 연습
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'explorer'}
          className={tab === 'explorer' ? styles.tabActive : undefined}
          onClick={() => setTab('explorer')}
        >
          🔎 오프닝 탐색기
        </button>
      </div>

      {tab === 'repertoire' ? (
        <RepertoireList onStart={(line, mode) => setDrill({ line, mode })} />
      ) : (
        <OpeningExplorer />
      )}
    </section>
  );
}
