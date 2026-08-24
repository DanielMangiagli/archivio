import { useCallback, useEffect, useState } from 'react';
import {
  addFile, deleteProject, openFileLocation, pickFiles,
  removeFile, scanProject, updateProject,
} from '../api';
import Dialog from '../components/Dialog';
import EditableField from '../components/EditableField';
import type { SelectOption } from '../components/EditableField';
import FileList from '../components/FileList';
import { useI18n } from '../i18n';
import type { FileEntry, Project, ProjectStatus } from '../types';

interface Props {
  projectId: string;
  onBack: () => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; i18n: string }[] = [
  { value: 'bozza', i18n: 'status_bozza' },
  { value: 'in_corso', i18n: 'status_in_corso' },
  { value: 'sospeso', i18n: 'status_sospeso' },
  { value: 'completato', i18n: 'status_completato' },
  { value: 'archiviato', i18n: 'status_archiviato' },
];

const PHASE_I18N: Record<string, string> = {
  contratto: 'phase_contratto',
  esecuzione: 'phase_esecuzione',
  pagamento: 'phase_pagamento',
};

function fmtAmount(v: number | null) {
  if (v === null) return '-';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
}

function fmtDate(v: string | null) {
  return v ? new Date(v + 'T00:00:00').toLocaleDateString('it-IT') : '-';
}

function fmtDateTime(v: string | null) {
  return v ? new Date(v).toLocaleString('it-IT') : '-';
}

export default function ProjectDetail({ projectId, onBack }: Props) {
  const { t } = useI18n();
  const [project, setProject] = useState<Project | null>(null);
  const [currentPhase, setCurrentPhase] = useState('contratto');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await scanProject(projectId);
      setProject(p);
      const phase = p.phases.find((ph) => ph.id === currentPhase) || p.phases[0];
      if (phase) setCurrentPhase(phase.id);
    } catch { onBack(); }
  }, [projectId, currentPhase, onBack]);

  useEffect(() => { load(); }, [load]);

  const save = async (field: string, value: any) => {
    if (!project) return;
    try {
      await updateProject(project.id, { [field]: value });
      setProject({ ...project, [field]: value });
    } catch (err) {
      alert(t('error_delete') + err);
    }
  };

  const addFiles = async () => {
    try {
      const paths = await pickFiles();
      if (paths?.length) {
        for (const p of paths) await addFile(projectId, currentPhase, p);
        await load();
      }
    } catch (e) {
      console.error('Failed to pick files:', e);
    }
  };

  const removeFileHandler = async (path: string) => {
    try {
      await removeFile(projectId, currentPhase, path);
      await load();
    } catch (err) { alert(t('error_delete') + err); }
  };

  const handleDelete = async () => {
    try {
      await deleteProject(projectId);
      onBack();
    } catch (err) { alert(t('error_delete') + err); }
  };

  if (!project) return null;

  const phase = project.phases.find((p) => p.id === currentPhase) || project.phases[0];
  const files: FileEntry[] = phase?.files || [];
  const statusOpts: SelectOption[] = STATUS_OPTIONS.map((s) => ({ value: s.value, label: t(s.i18n) }));
  const statusLabel = (s: string) => statusOpts.find((o) => o.value === s)?.label || s;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="info-row">
      <span className="info-label">{label}</span>
      {children}
    </div>
  );

  return (
    <div className="project-detail">
      <header>
        <button className="btn" onClick={onBack}>{t('back')}</button>
        <div className="project-title">
          <Field label={t('code')}>
            <EditableField value={project.code} type="text" onSave={(v) => save('code', v)} />
          </Field>
          <Field label={t('name')}>
            <EditableField value={project.name} type="text" onSave={(v) => save('name', v)} />
          </Field>
        </div>
        <div className="header-actions">
          <button className="btn danger" onClick={() => setShowDeleteConfirm(true)}>{t('delete')}</button>
        </div>
      </header>

      <div className="project-info">
        <Field label={t('client')}>
          <EditableField value={project.client} type="text" onSave={(v) => save('client', v)} />
        </Field>
        <Field label={t('contract_date')}>
          <EditableField value={project.contract_date} type="date" formatDisplay={fmtDate} onSave={(v) => save('contract_date', v)} />
        </Field>
        <Field label={t('completion_date')}>
          <EditableField value={project.completion_date} type="date" formatDisplay={fmtDate} onSave={(v) => save('completion_date', v)} />
        </Field>
        <Field label={t('amount')}>
          <EditableField value={project.amount} type="number" formatDisplay={fmtAmount} onSave={(v) => save('amount', v)} />
        </Field>
        <Field label={t('amount_paid')}>
          <EditableField value={project.amount_paid} type="number" formatDisplay={fmtAmount} onSave={(v) => save('amount_paid', v)} />
        </Field>
        <Field label={t('status')}>
          <EditableField value={project.status} type="select" onSelectOptions={statusOpts} formatDisplay={statusLabel} onSave={(v) => save('status', v)} />
        </Field>
        <div className="info-row info-row-wide">
          <span className="info-label">{t('description')}</span>
          <EditableField value={project.description} type="textarea" onSave={(v) => save('description', v)} />
        </div>
        <div className="info-row info-row-wide">
          <span className="info-label">{t('notes')}</span>
          <EditableField value={project.notes} type="textarea" onSave={(v) => save('notes', v)} />
        </div>
        {project.tags.length > 0 && (
          <div className="info-row info-row-wide">
            <span className="info-label">{t('tags')}</span>
            <span>{project.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</span>
          </div>
        )}
        <Field label={t('created_at')}><span>{fmtDateTime(project.created_at)}</span></Field>
        <Field label={t('updated_at')}><span>{fmtDateTime(project.updated_at)}</span></Field>
      </div>

      <div className="tabs">
        {project.phases.map((p) => (
          <button key={p.id} className={`tab ${p.id === currentPhase ? 'active' : ''}`} onClick={() => setCurrentPhase(p.id)}>
            {t(PHASE_I18N[p.id] || p.label)} ({p.files.length})
          </button>
        ))}
      </div>

      <div className="phase-content">
        <div className="phase-toolbar">
          <button className="btn" onClick={load}>{t('sync_folder')}</button>
          <button className="btn primary" onClick={addFiles}>{t('add_file')}</button>
        </div>
        <FileList files={files} projectId={projectId} phaseId={currentPhase} onRemoveFile={removeFileHandler} onOpenFile={(path) => openFileLocation(projectId, path)} />
      </div>

      {showDeleteConfirm && (
        <Dialog title={t('delete')} onClose={() => setShowDeleteConfirm(false)}>
          <p>{t('confirm_delete_project')}</p>
          <div className="dialog-actions">
            <button className="btn" onClick={() => setShowDeleteConfirm(false)}>{t('cancel')}</button>
            <button className="btn danger" onClick={handleDelete}>{t('delete')}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
