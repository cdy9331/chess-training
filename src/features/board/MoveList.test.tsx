import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createLine, playMove, START_FEN, type GameLine } from '../../core/chess';
import { MoveList } from './MoveList';

function line(ucis: string[], startFen?: string): GameLine {
  return ucis.reduce<GameLine>(
    (l, uci) => playMove(l, l.moves.length, uci) ?? l,
    createLine(startFen),
  );
}

describe('MoveList', () => {
  it('수 번호와 함께 기보를 보여주고, 누르면 해당 ply를 알린다', async () => {
    const onSelect = vi.fn();
    const game = line(['e2e4', 'e7e5', 'g1f3']);
    render(
      <MoveList startFen={START_FEN} moves={game.moves} currentPly={3} onSelectPly={onSelect} />,
    );
    const rows = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(rows).toEqual(['1.e4e5', '2.Nf3']);
    expect(screen.getByRole('button', { name: 'Nf3' })).toHaveAttribute('aria-current', 'step');

    await userEvent.click(screen.getByRole('button', { name: 'e5' }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('흑 차례로 시작하는 국면은 "…"로 백 칸을 비운다', () => {
    const startFen = '4k3/4p3/8/8/8/8/8/4K3 b - - 0 12';
    const game = line(['e7e5', 'e1e2'], startFen);
    render(
      <MoveList startFen={startFen} moves={game.moves} currentPly={0} onSelectPly={() => {}} />,
    );
    const rows = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(rows).toEqual(['12.…e5', '13.Ke2']);
  });

  it('수가 없으면 안내 문구를 보여준다', () => {
    render(<MoveList startFen={START_FEN} moves={[]} currentPly={0} onSelectPly={() => {}} />);
    expect(screen.getByText(/아직 둔 수가 없어요/)).toBeInTheDocument();
  });
});
