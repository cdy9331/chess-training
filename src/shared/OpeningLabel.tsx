import type { GameLine } from '../core/chess';
import { identifyOpening, koreanOpeningName } from '../core/openings';
import styles from './OpeningLabel.module.css';
import { useOpeningBook } from './useOpeningBook';

interface OpeningLabelProps {
  line: GameLine;
  /** 이 수까지만 보고 이름을 찾는다 (기본: 끝까지) */
  uptoPly?: number;
}

/** "📖 이탈리안 게임 · Two Knights Defense (C55)" — 아직 이름이 없으면 아무것도 그리지 않는다. */
export function OpeningLabel({ line, uptoPly }: OpeningLabelProps) {
  const book = useOpeningBook();
  const opening = book ? identifyOpening(book, line, uptoPly) : null;
  if (!opening) return null;
  const { family, detail } = koreanOpeningName(opening.name);
  return (
    <p className={styles.label} title={opening.name}>
      <span aria-hidden>📖</span>
      <strong>{family}</strong>
      {detail && <span className={styles.detail}>· {detail}</span>}
      <span className={styles.eco}>{opening.eco}</span>
    </p>
  );
}
