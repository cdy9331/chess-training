import { useEffect, useState } from 'react';
import { lineFromUcis, resignOutcome, START_FEN } from '../../core/chess';
import { resolveColor, type ColorChoice } from '../../core/play/rules';
import { gamesRepo } from '../../db/repos/games';
import type { GameRecord } from '../../db/schema';
import { buildGamePgn } from './gamePgn';
import { GameSetup, type SetupChoice } from './GameSetup';
import { PlayingGame } from './PlayingGame';

type View =
  | { kind: 'loading' }
  | { kind: 'setup'; playing: GameRecord | undefined }
  | { kind: 'playing'; record: GameRecord };

export function PlayPage() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    gamesRepo
      .findPlaying()
      .then((playing) => {
        if (!cancelled) setView({ kind: 'setup', playing });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('저장된 대국을 불러오지 못했어요. 새 대국은 시작할 수 있어요.');
          setView({ kind: 'setup', playing: undefined });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function start(choice: SetupChoice & { color: ColorChoice }) {
    // 진행 중이던 대국이 있으면 기권 처리하고 새로 시작한다.
    if (view.kind === 'setup' && view.playing) await abandon(view.playing);
    const id = await gamesRepo.create({
      source: 'ai',
      startFen: START_FEN,
      playerColor: resolveColor(choice.color),
      aiLevel: choice.level,
      practice: choice.practice,
    });
    const record = await gamesRepo.get(id);
    if (record) setView({ kind: 'playing', record });
  }

  async function backToSetup() {
    setView({ kind: 'setup', playing: await gamesRepo.findPlaying() });
  }

  if (view.kind === 'loading') return null;

  if (view.kind === 'playing') {
    return (
      <PlayingGame
        key={view.record.id}
        record={view.record}
        onNewGame={backToSetup}
        onRematch={() =>
          start({
            level: view.record.aiLevel,
            practice: view.record.practice,
            color: view.record.playerColor,
          })
        }
      />
    );
  }

  return (
    <GameSetup
      playing={view.playing}
      loadError={loadError}
      onStart={start}
      onResume={(record) => setView({ kind: 'playing', record })}
    />
  );
}

async function abandon(record: GameRecord) {
  const outcome = resignOutcome(record.playerColor);
  const line = lineFromUcis(record.startFen, record.movesUci);
  await gamesRepo.finish(record.id, outcome, record.movesUci, buildGamePgn(record, line, outcome));
}
