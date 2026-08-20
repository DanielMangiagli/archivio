import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RowSelectionState } from '@tanstack/react-table';
import { listProjects } from '../api';
import { useI18n } from '../i18n';
import ProjectTable from '../components/ProjectTable';
import ProjectDialog from './ProjectDialog';
import type { ProjectSummary } from '../types';

interface DashboardProps {
  onProjectClick: (id: string) => void;
  onSettingsClick: () => void;
}

function exportCsv(projects: ProjectSummary[], selectedIds: Set<string>) {
  const rows = selectedIds.size > 0
    ? projects.filter((p) => selectedIds.has(p.id))
    : projects;

  const headers = ['Codice', 'Nome', 'Committente', 'Stato', 'Data Contratto', 'Data Completamento', 'Importo', 'Importo Pagato', 'File', 'Foto'];
  const statusMap: Record<string, string> = {
    bozza: 'Bozza',
    in_corso: 'In Corso',
    sospeso: 'Sospeso',
    completato: 'Completato',
    archiviato: 'Archiviato',
  };

  const csvRows = rows.map((p) => [
    p.code,
    p.name,
    p.client,
    statusMap[p.status] || p.status,
    p.contract_date || '',
    p.completion_date || '',
    p.amount != null ? p.amount.toString() : '',
    p.amount_paid != null ? p.amount_paid.toString() : '',
    p.file_count.toString(),
    p.photo_count.toString(),
  ]);

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...csvRows.map((r: string[]) => r.map(escape).join(','))].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `archivio_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard({
  onProjectClick,
  onSettingsClick,
}: DashboardProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const handleExportCsv = () => {
    const selectedIds = new Set(
      Object.keys(rowSelection).map((idx) => projects[parseInt(idx)]?.id).filter(Boolean)
    );
    exportCsv(projects, selectedIds);
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
          <button className="btn" onClick={handleExportCsv}>
            {t('export_csv')}
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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
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
