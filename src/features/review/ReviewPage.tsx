import { useParams } from 'react-router';
import { GameHistory } from './GameHistory';
import { GameReplay } from './GameReplay';

export function ReviewPage() {
  const { gameId } = useParams();
  const id = Number(gameId);
  if (gameId !== undefined && Number.isInteger(id)) return <GameReplay key={id} gameId={id} />;
  return <GameHistory />;
}
