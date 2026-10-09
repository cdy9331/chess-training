import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { chessAt, createLine, fenAt, sideToMove } from '../../../core/chess';
import { isAbortError, type LevelConfig } from '../../../core/engine';
import { checkPlayOut, playOutColor, type PlayOutStep } from '../../../core/lessons';
import { useAiOpponent } from '../../board/engine/useAiOpponent';
import { Board } from '../../board/Board';
import { MoveList } from '../../board/MoveList';
import { useChessGame } from '../../board/useChessGame';
import styles from '../Lessons.module.css';

/** 실습 상대: 제한 없는 엔진이 최선으로 버틴다 (엔드게임 기술을 제대로 익히기 위해) */
const LESSON_OPPONENT: LevelConfig = {
  level: 0,
  label: '레슨 상대',
  description: '',
  engineOptions: { UCI_LimitStrength: false, 'Skill Level': 20 },
  search: { depth: 14, multipv: 1 },
  pick: { kind: 'best' },
};
const MIN_THINK_MS = 400;

interface PlayOutStepViewProps {
  step: PlayOutStep;
  onSuccess: () => void;
}

export function PlayOutStepView({ step, onSuccess }: PlayOutStepViewProps) {
  const game = useChessGame(useMemo(() => createLine(step.fen), [step.fen]));
  const { chooseMove } = useAiOpponent(LESSON_OPPONENT);
  const [engineError, setEngineError] = useState(false);
  const [attempt, setAttempt] = useState(1);

  const user = playOutColor(step);
  const moves = game.line.moves;
  const endFen = fenAt(game.line, moves.length);
  const userMoves = moves.filter((_, i) => sideToMove(fenAt(game.line, i)) === user).length;
  const last = moves.at(-1);
  const result = useMemo(
    () =>
      checkPlayOut(
        step,
        chessAt(game.line),
        user,
        userMoves,
        last
          ? {
              color: sideToMove(fenAt(game.line, moves.length - 1)),
              promotion: last.uci.length === 5 ? last.uci[4] : undefined,
            }
          : undefined,
      ),
    [step, game.line, user, userMoves, last, moves.length],
  );
  const engineTurn = result.kind === 'ongoing' && sideToMove(endFen) !== user;

  const notifySuccess = useEffectEvent(() => onSuccess());
  useEffect(() => {
    if (result.kind === 'success') notifySuccess();
  }, [result.kind]);

  const playEngineMove = useEffectEvent((uci: string) => game.appendMove(uci));
  useEffect(() => {
    if (!engineTurn) return;
    const controller = new AbortController();
    const minDelay = new Promise((r) => setTimeout(r, MIN_THINK_MS));
    Promise.all([chooseMove(endFen, controller.signal), minDelay])
      .then(([uci]) => {
        if (!controller.signal.aborted && uci) playEngineMove(uci);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error) && !controller.signal.aborted) setEngineError(true);
      });
    return () => controller.abort();
  }, [engineTurn, endFen, chooseMove]);

  function restart() {
    game.reset(step.fen);
    setAttempt((a) => a + 1);
    setEngineError(false);
  }

  return (
    <div className={styles.layout}>
      <div className={styles.boardColumn}>
        <Board
          fen={game.fen}
          orientation={user === 'w' ? 'white' : 'black'}
          onMove={game.makeMove}
          interactive={result.kind === 'ongoing' && !engineTurn && game.isAtEnd}
          lastMoveUci={game.lastMoveUci}
        />
      </div>
      <aside className={styles.panel}>
        <div className={styles.textBox}>
          <h2 className={styles.stepTitle}>♟ {step.title}</h2>
          <p>{step.prompt}</p>
          {step.tips && (
            <ul className={styles.tips}>
              {step.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>

        <p className={styles.counter}>
          내가 둔 수 {userMoves} / {step.maxMoves}
          {attempt > 1 && ` · ${attempt}번째 도전`}
        </p>

        {result.kind === 'ongoing' && (
          <p className={styles.small} role="status">
            {engineTurn ? '🤔 엔진이 생각 중…' : '✋ 당신 차례예요'}
          </p>
        )}
        {result.kind === 'success' && (
          <div className={styles.successBox} role="status">
            <strong>{result.message}</strong>
            <p>실습 성공! "다음"으로 넘어가세요.</p>
          </div>
        )}
        {result.kind === 'fail' && (
          <div className={styles.failBox} role="status">
            <strong>{result.message}</strong>
            <p>괜찮아요. 팁을 다시 읽고 한 번 더 해 봐요.</p>
          </div>
        )}
        {engineError && <p className={styles.bad}>엔진이 응답하지 않아요. 다시 시작해 주세요.</p>}

        <button type="button" onClick={restart}>
          ↺ 처음부터 다시
        </button>

        <MoveList
          startFen={game.line.startFen}
          moves={game.line.moves}
          currentPly={game.ply}
          onSelectPly={game.goTo}
        />
      </aside>
    </div>
  );
}
