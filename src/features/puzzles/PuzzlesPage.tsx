import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Glicko } from '../../core/puzzles';
import { puzzlesRepo } from '../../db/repos/puzzles';
import { PuzzleMenu } from './PuzzleMenu';
import { PuzzleRush } from './PuzzleRush';
import { loadPuzzleMode, savePuzzleMode, type PuzzleMode } from './puzzleMode';
import { PuzzleSolver } from './PuzzleSolver';

export function PuzzlesPage() {
  const [rating, setRating] = useState<Glicko | null>(null);
  const [searchParams] = useSearchParams();
  // 홈의 약점 추천에서 ?theme=fork 처럼 테마를 정해서 들어올 수 있다
  const [mode, setMode] = useState<PuzzleMode>(() => {
    const theme = searchParams.get('theme');
    return theme ? { kind: 'theme', theme } : loadPuzzleMode();
  });
  const [view, setView] = useState<'menu' | 'solve' | 'rush'>(() =>
    searchParams.get('rush') ? 'rush' : 'menu',
  );
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

  if (view === 'rush') return <PuzzleRush onExit={() => setView('menu')} />;

  if (view === 'solve') {
    return (
      <PuzzleSolver
        mode={mode}
        rating={rating}
        onRated={setRating}
        onBackToMenu={() => setView('menu')}
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
      onStart={() => setView('solve')}
      onStartRush={() => setView('rush')}
    />
  );
}
