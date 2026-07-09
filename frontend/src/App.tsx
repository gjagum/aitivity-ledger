import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './_components/Layout.tsx';
import { DashboardPage } from './dashboard/pages/DashboardPage.tsx';
import { TaskListPage } from './tasks/pages/TaskListPage.tsx';
import { TaskDetailPage } from './tasks/pages/TaskDetailPage.tsx';
import { WeeklyReportPage } from './reports/pages/WeeklyReportPage.tsx';
import { ActivityPage } from './reports/pages/ActivityPage.tsx';
import { AgentsPage } from './agents/pages/AgentsPage.tsx';
import { SessionsPage } from './sessions/pages/SessionsPage.tsx';
import { SessionDetailPage } from './sessions/pages/SessionDetailPage.tsx';
import { LocksPage } from './locks/pages/LocksPage.tsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/locks" element={<LocksPage />} />
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/reports/weekly" element={<WeeklyReportPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
