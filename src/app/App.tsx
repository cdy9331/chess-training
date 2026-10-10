import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { settingsRepo } from '../db/repos/settings';
import { setMoveSoundEnabled } from '../shared/moveSounds';
import { router } from './routes';

export function App() {
  // 저장된 효과음 설정을 처음 한 번 불러온다 (불러오기 전에는 기본값 켬)
  useEffect(() => {
    settingsRepo
      .getMoveSound()
      .then(setMoveSoundEnabled)
      .catch(() => undefined);
  }, []);

  return <RouterProvider router={router} />;
}
