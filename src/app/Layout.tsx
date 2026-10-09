import { NavLink, Outlet } from 'react-router';
import { ThemeToggle } from '../shared/ThemeToggle';
import styles from './Layout.module.css';
import { NAV_ITEMS } from './navItems';

export function Layout() {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="주 메뉴">
        <div className={styles.brand}>♞ 체스 트레이닝</div>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
              >
                <span className={styles.icon} aria-hidden>
                  {item.icon}
                </span>
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className={styles.navFooter}>
          <ThemeToggle />
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
