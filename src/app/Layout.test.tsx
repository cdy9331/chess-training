import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { NAV_ITEMS } from './navItems';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('앱 레이아웃', () => {
  it('모든 메뉴 항목을 보여준다', () => {
    renderAt('/');
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: new RegExp(item.label) })).toBeInTheDocument();
    }
  });

  it('메뉴를 누르면 해당 페이지로 이동한다', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: /퍼즐/ }));
    expect(screen.getByRole('heading', { level: 1, name: '퍼즐' })).toBeInTheDocument();
  });

  it('없는 주소는 안내 페이지를 보여준다', () => {
    renderAt('/no-such-page');
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument();
  });
});
