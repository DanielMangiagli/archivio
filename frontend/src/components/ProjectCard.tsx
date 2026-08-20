import { useI18n } from '../i18n';
import type { ProjectSummary } from '../types';

interface ProjectCardProps {
  project: ProjectSummary;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { t } = useI18n();

  function formatAmount(amount: number | null): string {
    if (amount === null) return '-';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  function formatDate(date: string | null): string {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('it-IT');
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      bozza: t('status_bozza'),
      in_corso: t('status_in_corso'),
      sospeso: t('status_sospeso'),
      completato: t('status_completato'),
      archiviato: t('status_archiviato'),
    };
    return map[status] || status;
  };

  return (
    <div className="project-card" onClick={onClick}>
      <div className="card-header">
        <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18"/>
          <path d="M5 21V7l7-4 7 4v14"/>
          <path d="M9 21v-6h6v6"/>
          <path d="M10 9h1"/>
          <path d="M14 9h1"/>
          <path d="M10 13h1"/>
          <path d="M14 13h1"/>
        </svg>
        <span className="card-code">{project.code}</span>
        <span className={`status status-${project.status}`}>{statusLabel(project.status)}</span>
      </div>
      <h3>{project.name}</h3>
      <p className="client">{project.client}</p>
      <div className="card-meta">
        <span>{formatDate(project.contract_date)}</span>
        <span>{formatAmount(project.amount)}</span>
      </div>
      <div className="card-footer">
        <span>{project.file_count} {t('files')}</span>
        <span>{project.photo_count} {t('photos')}</span>
      </div>
    </div>
  );
}
