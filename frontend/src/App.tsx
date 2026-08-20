import { useState, useCallback } from 'react';
import { useI18n } from './i18n';
import Dashboard from './views/Dashboard';
import ProjectDetail from './views/ProjectDetail';
import Settings from './views/Settings';

type View = 'dashboard' | 'project' | 'settings';

export default function App() {
  const { t } = useI18n();
  const [view, setView] = useState<View>('dashboard');
  const [projectId, setProjectId] = useState<string | null>(null);

  const navigateToProject = useCallback((id: string) => {
    setProjectId(id);
    setView('project');
  }, []);

  const navigateToDashboard = useCallback(() => {
    setProjectId(null);
    setView('dashboard');
  }, []);

  const navigateToSettings = useCallback(() => {
    setView('settings');
  }, []);

  return (
    <>
      {view === 'dashboard' && (
        <Dashboard
          onProjectClick={navigateToProject}
          onSettingsClick={navigateToSettings}
        />
      )}
      {view === 'project' && projectId && (
        <ProjectDetail
          projectId={projectId}
          onBack={navigateToDashboard}
        />
      )}
      {view === 'settings' && (
        <Settings onBack={navigateToDashboard} />
      )}
    </>
  );
}
