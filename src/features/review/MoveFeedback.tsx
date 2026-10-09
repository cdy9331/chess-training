import { formatSanLine } from '../../core/chess';
import {
  formatEval,
  type MoveClass,
  type PositionEval,
  type ReviewedMove,
} from '../../core/review';
import { MOVE_CLASS_STYLE } from './moveClassStyle';
import styles from './Review.module.css';

export type RetryState =
  | { kind: 'waiting' }
  | { kind: 'checking'; attemptSan: string }
  | { kind: 'judged'; attemptSan: string; classification: MoveClass }
  | { kind: 'revealed' };

export type PreviewKind = 'best' | 'refutation';

interface MoveFeedbackProps {
  move: ReviewedMove | null;
  fenBefore: string;
  evalAfter: PositionEval | undefined;
  isMine: boolean;
  /** 부정확·실수·블런더일 때: 왜 나쁜 수인지 */
  whyBad: string[] | null;
  /** 최선의 수가 왜 좋은지 (펼쳐서 볼 때만 보여준다) */
  whyBest: string[] | null;
  canPreview: Record<PreviewKind, boolean>;
  onPreview: (kind: PreviewKind) => void;
  retry: RetryState | null;
  onStartRetry: () => void;
  onRetryAgain: () => void;
  onReveal: () => void;
  onExitRetry: () => void;
}

const CAN_RETRY: ReadonlySet<MoveClass> = new Set(['inaccuracy', 'mistake', 'blunder']);

export function MoveFeedback({
  move,
  fenBefore,
  evalAfter,
  isMine,
  whyBad,
  whyBest,
  canPreview,
  onPreview,
  retry,
  onStartRetry,
  onRetryAgain,
  onReveal,
  onExitRetry,
}: MoveFeedbackProps) {
  if (!move) {
    return (
      <div className={styles.feedback}>
        <p className={styles.muted}>시작 국면이에요. ▶ 또는 → 키로 한 수씩 살펴보세요.</p>
      </div>
    );
  }

  const style = MOVE_CLASS_STYLE[move.classification];
  const moveNumber = formatSanLine(fenBefore, [move.san]);

  if (retry) {
    return (
      <div className={styles.feedback} style={{ borderColor: 'var(--color-accent)' }}>
        <p className={styles.feedbackTitle}>🎯 더 좋은 수를 찾아보세요</p>
        <p className={styles.muted}>
          실제로는 <strong>{moveNumber}</strong>를 뒀어요. 체스판에서 더 나은 수를 직접 두어 보세요.
        </p>
        {retry.kind === 'checking' && <p>{retry.attemptSan} … 엔진이 확인하는 중</p>}
        {retry.kind === 'judged' && (
          <RetryVerdict attemptSan={retry.attemptSan} classification={retry.classification} />
        )}
        {retry.kind === 'revealed' && (
          <p>
            정답: <strong>{move.bestMoveSan}</strong> (파란 화살표)
          </p>
        )}
        <div className={styles.feedbackActions}>
          {retry.kind === 'judged' && (
            <button type="button" onClick={onRetryAgain}>
              다시 시도
            </button>
          )}
          {retry.kind !== 'revealed' && (
            <button type="button" onClick={onReveal} disabled={retry.kind === 'checking'}>
              정답 보기
            </button>
          )}
          <button type="button" onClick={onExitRetry}>
            리뷰로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isBestPlayed = move.bestMoveUci === move.uci;
  return (
    <div className={styles.feedback} style={{ borderColor: style.color }}>
      <p className={styles.feedbackTitle}>
        <span className={styles.classBadge} style={{ backgroundColor: style.color }}>
          {style.symbol}
        </span>
        {moveNumber} — {style.label}
        {isMine ? '' : ' (상대)'}
      </p>
      <p>{style.explanation}</p>
      {move.allowedMate && <p>⚠️ 이 수 다음 상대에게 강제 메이트가 생겼어요.</p>}
      {move.missedMate && <p>💡 메이트로 끝낼 수 있는 기회가 있었어요.</p>}
      {move.loss >= 1 && (
        <p className={styles.muted}>승률을 약 {Math.round(move.loss)}%p 잃었어요.</p>
      )}
      {!isBestPlayed && move.bestMoveSan && (
        <p>
          {move.classification === 'best' || move.classification === 'good'
            ? '엔진의 1순위 수: '
            : '최선의 수: '}
          <strong>{move.bestMoveSan}</strong> <span className={styles.muted}>(파란 화살표)</span>
          {move.bestLineSan.length > 1 && (
            <span className={styles.bestLine}>{formatSanLine(fenBefore, move.bestLineSan)}</span>
          )}
        </p>
      )}
      {evalAfter && <p className={styles.muted}>이 수 이후 평가: {formatEval(evalAfter)}</p>}

      {whyBad && whyBad.length > 0 && (
        <div className={styles.whyBox}>
          <p className={styles.whyTitle}>❓ 왜 좋지 않은 수인가요?</p>
          <ul className={styles.whyList}>
            {whyBad.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {canPreview.refutation && (
            <button type="button" onClick={() => onPreview('refutation')}>
              ▶ 상대의 최선 응수 따라가 보기
            </button>
          )}
        </div>
      )}

      {whyBest && whyBest.length > 0 && move.bestMoveSan && (
        <BestMoveWhy
          title={isBestPlayed ? '왜 이 수가 최선인가요?' : `${move.bestMoveSan}가 왜 최선인가요?`}
          reasons={whyBest}
          canPreview={canPreview.best}
          onPreview={() => onPreview('best')}
        />
      )}

      {CAN_RETRY.has(move.classification) && move.bestMoveUci && (
        <button type="button" className={styles.retryButton} onClick={onStartRetry}>
          🎯 더 좋은 수 찾아보기
        </button>
      )}
    </div>
  );
}

/** 필요할 때만 펼쳐 보는 "최선의 수 설명" */
function BestMoveWhy({
  title,
  reasons,
  canPreview,
  onPreview,
}: {
  title: string;
  reasons: string[];
  canPreview: boolean;
  onPreview: () => void;
}) {
  return (
    <details className={styles.whyBox}>
      <summary className={styles.whyTitle}>💡 {title}</summary>
      <ul className={styles.whyList}>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {canPreview && (
        <button type="button" onClick={onPreview}>
          ▶ 최선 수순 따라가 보기
        </button>
      )}
    </details>
  );
}

function RetryVerdict({
  attemptSan,
  classification,
}: {
  attemptSan: string;
  classification: MoveClass;
}) {
  const style = MOVE_CLASS_STYLE[classification];
  const correct = classification === 'best' || classification === 'good';
  return (
    <p className={correct ? styles.retryCorrect : styles.retryWrong}>
      <strong>{attemptSan}</strong> — {style.label}.{' '}
      {correct ? '잘 찾았어요! 🎉' : '아직 더 좋은 수가 있어요. 다시 해 보세요.'}
    </p>
  );
}
