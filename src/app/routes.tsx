import { createHashRouter, type RouteObject } from 'react-router';
import { AnalysisPage } from '../features/analysis/AnalysisPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LessonsPage } from '../features/lessons/LessonsPage';
import { OpeningsPage } from '../features/openings/OpeningsPage';
import { PlayPage } from '../features/play/PlayPage';
import { PuzzlesPage } from '../features/puzzles/PuzzlesPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { CoordinatesPage } from '../features/training/CoordinatesPage';
import { MistakesPage } from '../features/training/MistakesPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'play', element: <PlayPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'review/:gameId', element: <ReviewPage /> },
      { path: 'puzzles', element: <PuzzlesPage /> },
      { path: 'openings', element: <OpeningsPage /> },
      { path: 'lessons', element: <LessonsPage /> },
      { path: 'lessons/:lessonId', element: <LessonsPage /> },
      { path: 'mistakes', element: <MistakesPage /> },
      { path: 'coordinates', element: <CoordinatesPage /> },
      { path: 'analysis', element: <AnalysisPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

// 서버 없이 정적 호스팅에서 새로고침해도 404가 나지 않도록 해시 라우터를 쓴다.
export const router = createHashRouter(routes);
