import type { ReactNode } from 'react';
import styles from './PagePlaceholder.module.css';

interface PagePlaceholderProps {
  title: string;
  description?: string;
  /** 이 화면이 구현될 PLAN.md의 Phase 번호 */
  phase?: number;
  children?: ReactNode;
}

export function PagePlaceholder({ title, description, phase, children }: PagePlaceholderProps) {
  return (
    <section>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {phase !== undefined && <p className={styles.badge}>Phase {phase}에서 만들 예정이에요</p>}
      {children}
    </section>
  );
}
