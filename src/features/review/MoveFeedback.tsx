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

interface MoveFeedbackProps {
  move: ReviewedMove | null;
  fenBefore: string;
  evalAfter: PositionEval | undefined;
  isMine: boolean;
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
      {CAN_RETRY.has(move.classification) && move.bestMoveUci && (
        <button type="button" className={styles.retryButton} onClick={onStartRetry}>
          🎯 더 좋은 수 찾아보기
        </button>
      )}
    </div>
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
