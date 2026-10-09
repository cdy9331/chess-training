import { useEffect, useState } from 'react';
import type { Glicko } from '../../core/puzzles';
import { puzzlesRepo } from '../../db/repos/puzzles';
import { PuzzleMenu } from './PuzzleMenu';
import { loadPuzzleMode, savePuzzleMode, type PuzzleMode } from './puzzleMode';
import { PuzzleSolver } from './PuzzleSolver';

export function PuzzlesPage() {
  const [rating, setRating] = useState<Glicko | null>(null);
  const [mode, setMode] = useState<PuzzleMode>(loadPuzzleMode);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    puzzlesRepo
      .getRating()
      .then((r) => !cancelled && setRating(r))
      .catch(() => !cancelled && setError('퍼즐 기록을 불러오지 못했어요.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p>{error}</p>;
  if (!rating) return null;

  if (solving) {
    return (
      <PuzzleSolver
        mode={mode}
        rating={rating}
        onRated={setRating}
        onBackToMenu={() => setSolving(false)}
      />
    );
  }

  return (
    <PuzzleMenu
      rating={rating}
      mode={mode}
      onChangeMode={(m) => {
        setMode(m);
        savePuzzleMode(m);
      }}
      onStart={() => setSolving(true)}
    />
  );
}
