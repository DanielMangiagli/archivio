import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { generateIndex, listProjects, openIndex } from '../api';
import { useI18n } from '../i18n';
import ProjectTable from '../components/ProjectTable';
import ProjectDialog from './ProjectDialog';

interface DashboardProps {
  onProjectClick: (id: string) => void;
  onSettingsClick: () => void;
}

export default function Dashboard({
  onProjectClick,
  onSettingsClick,
}: DashboardProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const handleGenerateIndex = async () => {
    try {
      await generateIndex();
      await openIndex();
    } catch (e) {
      alert('Error: ' + e);
    }
  };

  const handleMutate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }, [queryClient]);

  return (
    <div className="dashboard">
      <header>
        <h1>{t('app_title')}</h1>
        <div className="header-actions">
          <button
            className="btn primary"
            onClick={() => setShowCreateDialog(true)}
          >
            {t('new_project')}
          </button>
          <button className="btn" onClick={handleGenerateIndex}>
            {t('generate_index')}
          </button>
          <button
            className="btn btn-settings"
            title={t('settings')}
            onClick={onSettingsClick}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>
      <ProjectTable
        projects={projects}
        onProjectClick={onProjectClick}
        onMutate={handleMutate}
      />
      {showCreateDialog && (
        <ProjectDialog
          mode="create"
          onClose={() => {
            setShowCreateDialog(false);
            handleMutate();
          }}
        />
      )}
    </div>
  );
}
