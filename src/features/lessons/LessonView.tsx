import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CATEGORY_INFO, LEVEL_NAME, type Lesson } from '../../core/lessons';
import { LESSONS } from '../../content/lessons';
import { lessonsRepo } from '../../db/repos/lessons';
import styles from './Lessons.module.css';
import { ExplainStepView } from './steps/ExplainStepView';
import { FindMoveStepView } from './steps/FindMoveStepView';
import { PlayOutStepView } from './steps/PlayOutStepView';
import { PuzzlesStepView } from './steps/PuzzlesStepView';

export function LessonView({ lesson }: { lesson: Lesson }) {
  /** null = 저장된 진도를 불러오는 중 */
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  /** 수 찾기·실습을 마쳐서 "다음"으로 갈 수 있는 단계 */
  const [cleared, setCleared] = useState<ReadonlySet<number>>(new Set());
  const [finished, setFinished] = useState(false);

  // 이어서 보기: 저장된 단계부터 시작
  useEffect(() => {
    let cancelled = false;
    lessonsRepo
      .get(lesson.id)
      .then((p) => {
        if (cancelled) return;
        const index = Math.min(p?.stepIndex ?? 0, lesson.steps.length - 1);
        setStepIndex(index);
        // 이미 지나온 단계는 다시 풀지 않아도 넘어갈 수 있다
        setCleared(new Set(Array.from({ length: index }, (_, i) => i)));
      })
      .catch(() => !cancelled && setStepIndex(0));
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  if (stepIndex === null) return null;
  const step = lesson.steps[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === lesson.steps.length - 1;
  const canGoNext = step.kind === 'explain' || cleared.has(stepIndex);

  function goTo(index: number) {
    setStepIndex(index);
    void lessonsRepo.saveStep(lesson.id, index).catch(() => undefined);
  }

  function markCleared() {
    setCleared((c) => new Set(c).add(stepIndex ?? 0));
  }

  async function finish() {
    setFinished(true);
    await lessonsRepo.complete(lesson.id).catch(() => undefined);
  }

  const nextLesson = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1];

  return (
    <section className={styles.page}>
      <Link to="/lessons">← 레슨 목록</Link>
      <header>
        <p className={styles.small}>
          {CATEGORY_INFO[lesson.category].name} · {LEVEL_NAME[lesson.level]}
        </p>
        <h1 className={styles.title}>{lesson.title}</h1>
      </header>

      <ol className={styles.stepper} aria-label="레슨 단계">
        {lesson.steps.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              className={`${styles.stepDot} ${i === stepIndex ? styles.stepCurrent : ''} ${
                cleared.has(i) ? styles.stepDone : ''
              }`}
              aria-current={i === stepIndex ? 'step' : undefined}
              disabled={i > stepIndex && !cleared.has(i - 1)}
              onClick={() => goTo(i)}
              title={s.title}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      {finished ? (
        <div className={styles.finishCard}>
          <p className={styles.finishTitle}>🎉 레슨 완료!</p>
          <p className={styles.muted}>"{lesson.title}"를 마쳤어요.</p>
          <div className={styles.actions}>
            {nextLesson && (
              <Link to={`/lessons/${nextLesson.id}`} className={styles.primaryLink}>
                다음 레슨: {nextLesson.title} →
              </Link>
            )}
            <Link to="/lessons">레슨 목록</Link>
            <Link to="/puzzles">퍼즐로 연습하기</Link>
          </div>
        </div>
      ) : (
        <>
          {step.kind === 'explain' && <ExplainStepView key={stepIndex} step={step} />}
          {step.kind === 'findMove' && (
            <FindMoveStepView key={stepIndex} step={step} onSolved={markCleared} />
          )}
          {step.kind === 'playOut' && (
            <PlayOutStepView key={stepIndex} step={step} onSuccess={markCleared} />
          )}
          {step.kind === 'puzzles' && (
            <PuzzlesStepView key={stepIndex} step={step} onComplete={markCleared} />
          )}

          <div className={styles.navRow}>
            <button type="button" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}>
              ◀ 이전
            </button>
            {isLast ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => void finish()}
                disabled={!canGoNext}
              >
                레슨 완료 ✓
              </button>
            ) : (
              <button
                type="button"
                className={styles.primary}
                onClick={() => goTo(stepIndex + 1)}
                disabled={!canGoNext}
              >
                다음 ▶
              </button>
            )}
          </div>
          {!canGoNext && (
            <p className={styles.small}>
              {step.kind === 'playOut'
                ? '실습에 성공하면 다음으로 넘어갈 수 있어요.'
                : step.kind === 'puzzles'
                  ? '연습 퍼즐을 모두 마치면(정답 보기 포함) 다음으로 넘어갈 수 있어요.'
                  : '정답을 찾거나 "정답 보기"를 누르면 다음으로 넘어갈 수 있어요.'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
