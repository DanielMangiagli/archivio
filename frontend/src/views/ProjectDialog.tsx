import { useState } from 'react';
import { useI18n } from '../i18n';
import { createProject, updateProject } from '../api';
import type { Project } from '../types';
import Dialog from '../components/Dialog';
import DatePicker from '../components/DatePicker';

interface ProjectDialogProps {
  mode: 'create' | 'edit';
  project?: Project;
  onClose: () => void;
}

export default function ProjectDialog({ mode, project, onClose }: ProjectDialogProps) {
  const { t } = useI18n();
  const [code, setCode] = useState(project?.code || '');
  const [name, setName] = useState(project?.name || '');
  const [client, setClient] = useState(project?.client || '');
  const [description, setDescription] = useState(project?.description || '');
  const [contractDate, setContractDate] = useState(project?.contract_date || '');
  const [completionDate, setCompletionDate] = useState(project?.completion_date || '');
  const [amount, setAmount] = useState(project?.amount?.toString() || '');
  const [status, setStatus] = useState(project?.status || 'bozza');
  const [notes, setNotes] = useState(project?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = {
      code,
      name,
      client,
      description,
      contract_date: contractDate || undefined,
      amount: amount ? parseFloat(amount) : undefined,
    };
    console.log('ProjectDialog submitting contractDate:', contractDate);
    console.log('ProjectDialog create params:', params);
    if (mode === 'create') {
      await createProject(params);
    } else if (project) {
      await updateProject(project.id, {
        code,
        name,
        client,
        description,
        contract_date: contractDate || undefined,
        completion_date: completionDate || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        status,
        notes,
      });
    }
    onClose();
  };

  return (
    <Dialog
      title={mode === 'create' ? t('new_project_title') : t('edit_project_title')}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <label>
          {t('code')}
          <input
            type="text"
            value={code}
            required
            placeholder={t('code_placeholder')}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label>
          {t('name')}
          <input
            type="text"
            value={name}
            required
            placeholder={t('name_placeholder')}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {t('client')}
          <input
            type="text"
            value={client}
            required
            placeholder={t('client_placeholder')}
            onChange={(e) => setClient(e.target.value)}
          />
        </label>
        <label>
          {t('description_label')}
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="dialog-field">
          <span className="dialog-field-label">{t('contract_date_label')}</span>
          <DatePicker value={contractDate} onChange={setContractDate} />
        </div>
        {mode === 'edit' && (
          <div className="dialog-field">
            <span className="dialog-field-label">{t('completion_date')}</span>
            <DatePicker value={completionDate} onChange={setCompletionDate} />
          </div>
        )}
        <label>
          {t('amount_label')}
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {mode === 'edit' && (
          <>
            <label>
              {t('status_label')}
              <select value={status} onChange={(e) => setStatus(e.target.value as Project['status'])}>
                <option value="bozza">{t('status_bozza')}</option>
                <option value="in_corso">{t('status_in_corso')}</option>
                <option value="sospeso">{t('status_sospeso')}</option>
                <option value="completato">{t('status_completato')}</option>
                <option value="archiviato">{t('status_archiviato')}</option>
              </select>
            </label>
            <label>
              {t('notes_label')}
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn primary">
            {mode === 'create' ? t('create') : t('save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
