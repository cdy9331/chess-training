import { useCallback, useMemo, useState } from 'react';
import {
  createLine,
  fenAt,
  playMove,
  statusAt,
  truncate,
  type GameLine,
  type GameStatus,
} from '../../core/chess';

interface GameState {
  line: GameLine;
  /** 현재 보고 있는 ply (0 = 시작 국면) */
  ply: number;
}

export interface ChessGame {
  line: GameLine;
  ply: number;
  fen: string;
  status: GameStatus;
  lastMoveUci: string | undefined;
  isAtEnd: boolean;
  /** 현재 보고 있는 국면에서 수를 둔다. 이후 수가 있었다면 대체된다. */
  makeMove: (uci: string) => boolean;
  /** 보고 있는 위치와 상관없이 마지막 수 뒤에 수를 두고 마지막 국면으로 이동한다. (AI 응수용) */
  appendMove: (uci: string) => boolean;
  /** 마지막 수를 취소한다. */
  undo: () => void;
  /** 처음 plyCount개의 수만 남긴다. */
  truncateTo: (plyCount: number) => void;
  goTo: (ply: number) => void;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;
  reset: (startFen?: string) => void;
  load: (line: GameLine) => void;
}

export function useChessGame(initialLine: GameLine = createLine()): ChessGame {
  const [state, setState] = useState<GameState>({
    line: initialLine,
    ply: initialLine.moves.length,
  });
  const { line, ply } = state;

  const fen = fenAt(line, ply);
  const status = useMemo(() => statusAt(line, ply), [line, ply]);

  const makeMove = useCallback(
    (uci: string) => {
      const next = playMove(line, ply, uci);
      if (!next) return false;
      setState({ line: next, ply: next.moves.length });
      return true;
    },
    [line, ply],
  );

  const appendMove = useCallback(
    (uci: string) => {
      const next = playMove(line, line.moves.length, uci);
      if (!next) return false;
      setState({ line: next, ply: next.moves.length });
      return true;
    },
    [line],
  );

  const truncateTo = useCallback((plyCount: number) => {
    setState((s) => {
      const shorter = truncate(s.line, plyCount);
      return { line: shorter, ply: shorter.moves.length };
    });
  }, []);

  const goTo = useCallback((target: number) => {
    setState((s) => ({ ...s, ply: Math.max(0, Math.min(target, s.line.moves.length)) }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const shorter = truncate(s.line, s.line.moves.length - 1);
      return { line: shorter, ply: shorter.moves.length };
    });
  }, []);

  const reset = useCallback((startFen?: string) => {
    setState({ line: createLine(startFen), ply: 0 });
  }, []);

  const load = useCallback((newLine: GameLine) => {
    setState({ line: newLine, ply: newLine.moves.length });
  }, []);

  return {
    line,
    ply,
    fen,
    status,
    lastMoveUci: ply > 0 ? line.moves[ply - 1]?.uci : undefined,
    isAtEnd: ply === line.moves.length,
    makeMove,
    appendMove,
    undo,
    truncateTo,
    goTo,
    goFirst: useCallback(() => goTo(0), [goTo]),
    goPrev: useCallback(() => setState((s) => ({ ...s, ply: Math.max(0, s.ply - 1) })), []),
    goNext: useCallback(
      () => setState((s) => ({ ...s, ply: Math.min(s.line.moves.length, s.ply + 1) })),
      [],
    ),
    goLast: useCallback(() => setState((s) => ({ ...s, ply: s.line.moves.length })), []),
    reset,
    load,
  };
}
