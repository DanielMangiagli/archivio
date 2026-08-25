import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import {
  getSettings,
  saveSettings,
  listCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getFolderTemplate,
  saveFolderTemplate,
} from '../api';
import type { Category, FolderTemplate, FolderTemplatePhase } from '../types';

interface SettingsProps {
  onBack: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const DEFAULT_TEMPLATE: FolderTemplate = {
  phases: [
    { id: 'contratto', label: 'Contratto', folder_name: 'contratto', subfolders: ['documenti'] },
    { id: 'esecuzione', label: 'Esecuzione', folder_name: 'esecuzione', subfolders: ['relazioni', 'foto/originals', 'foto/thumb', 'documenti'] },
    { id: 'pagamento', label: 'Pagamento', folder_name: 'pagamento', subfolders: ['fatture', 'certificati'] },
  ],
};

export default function Settings({ onBack }: SettingsProps) {
  const { lang, setLang: setI18nLang, t } = useI18n();
  const [language, setLanguage] = useState(lang);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrefix, setNewPrefix] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [error, setError] = useState('');

  const [template, setTemplate] = useState<FolderTemplate>({ phases: [] });
  const [templateSaved, setTemplateSaved] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch(console.error);
    getFolderTemplate().then(setTemplate).catch(console.error);
  }, []);

  const handleSave = async (newLang: string) => {
    setLanguage(newLang as 'it' | 'en');
    await saveSettings({ language: newLang });
    setI18nLang(newLang as 'it' | 'en');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const cat = await addCategory(newName.trim(), newPrefix.trim());
      setCategories([...categories, cat]);
      setNewName('');
      setNewPrefix('');
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete_category'))) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditPrefix(cat.prefix);
    setError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      const updated = await updateCategory(editingId, {
        name: editName.trim(),
        prefix: editPrefix.trim(),
      });
      setCategories(categories.map((c) => (c.id === editingId ? updated : c)));
      setEditingId(null);
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  // ---- Folder Template handlers ----

  const handleAddPhase = () => {
    const n = template.phases.length + 1;
    const id = `fase_${n}`;
    const label = `${t('phase')} ${n}`;
    setTemplate({
      phases: [
        ...template.phases,
        { id, label, folder_name: slugify(label), subfolders: [] },
      ],
    });
  };

  const handleRemovePhase = (phaseId: string) => {
    setTemplate({
      phases: template.phases.filter((p) => p.id !== phaseId),
    });
  };

  const handleUpdatePhase = (phaseId: string, updates: Partial<FolderTemplatePhase>) => {
    setTemplate({
      phases: template.phases.map((p) => {
        if (p.id !== phaseId) return p;
        const updated = { ...p, ...updates };
        if (updates.label !== undefined && !updates.folder_name) {
          updated.folder_name = slugify(updates.label);
        }
        return updated;
      }),
    });
  };

  const handleMovePhase = (phaseId: string, direction: -1 | 1) => {
    const idx = template.phases.findIndex((p) => p.id === phaseId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= template.phases.length) return;
    const newPhases = [...template.phases];
    [newPhases[idx], newPhases[newIdx]] = [newPhases[newIdx], newPhases[idx]];
    setTemplate({ phases: newPhases });
  };

  const handleAddSubfolder = (phaseId: string) => {
    setTemplate({
      phases: template.phases.map((p) =>
        p.id === phaseId ? { ...p, subfolders: [...p.subfolders, ''] } : p
      ),
    });
  };

  const handleUpdateSubfolder = (phaseId: string, index: number, value: string) => {
    setTemplate({
      phases: template.phases.map((p) => {
        if (p.id !== phaseId) return p;
        const newSubs = [...p.subfolders];
        newSubs[index] = value;
        return { ...p, subfolders: newSubs };
      }),
    });
  };

  const handleRemoveSubfolder = (phaseId: string, index: number) => {
    setTemplate({
      phases: template.phases.map((p) => {
        if (p.id !== phaseId) return p;
        const newSubs = [...p.subfolders];
        newSubs.splice(index, 1);
        return { ...p, subfolders: newSubs };
      }),
    });
  };

  const handleSaveTemplate = async () => {
    try {
      const cleaned: FolderTemplate = {
        phases: template.phases.map((p) => ({
          id: slugify(p.label) || p.id,
          label: p.label,
          folder_name: slugify(p.folder_name) || p.id,
          subfolders: p.subfolders.filter((s) => s.trim() !== ''),
        })),
      };
      await saveFolderTemplate(cleaned);
      setTemplate(cleaned);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  const handleResetTemplate = () => {
    if (!window.confirm(t('confirm_reset_template'))) return;
    setTemplate(DEFAULT_TEMPLATE);
  };

  return (
    <div className="settings-page">
      <header>
        <button className="btn" onClick={onBack}>{t('back')}</button>
        <h1>{t('settings_title')}</h1>
      </header>
      <div className="settings-content">
        <div className="settings-group">
          <label className="settings-label">{t('language')}</label>
          <select
            className="settings-input"
            value={language}
            onChange={(e) => handleSave(e.target.value)}
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="settings-group">
          <h2>{t('categories')}</h2>

          <form className="category-form" onSubmit={handleAdd}>
            <input
              type="text"
              placeholder={t('category_name')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder={t('category_prefix')}
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
              required
              maxLength={10}
            />
            <button type="submit" className="btn primary">{t('add_category')}</button>
          </form>

          {error && <div className="category-error">{error}</div>}

          <div className="category-list">
            {categories.map((cat) =>
              editingId === cat.id ? (
                <form
                  key={cat.id}
                  className="category-item category-item-edit"
                  onSubmit={handleUpdate}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    value={editPrefix}
                    onChange={(e) => setEditPrefix(e.target.value)}
                    required
                    maxLength={10}
                  />
                  <button type="submit" className="btn primary">{t('save')}</button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setEditingId(null)}
                  >
                    {t('cancel')}
                  </button>
                </form>
              ) : (
                <div key={cat.id} className="category-item">
                  <span className="category-item-name">{cat.name}</span>
                  <span className="category-item-prefix">{cat.prefix}</span>
                  <span className="category-item-counter">
                    #{cat.next_number}
                  </span>
                  <button className="btn" onClick={() => startEdit(cat)}>
                    {t('edit')}
                  </button>
                  <button className="btn danger" onClick={() => handleDelete(cat.id)}>
                    {t('delete')}
                  </button>
                </div>
              )
            )}
            {categories.length === 0 && (
              <div className="category-empty">{t('no_categories')}</div>
            )}
          </div>
        </div>

        {/* ---- Folder Structure ---- */}
        <div className="settings-group">
          <h2>{t('folder_structure')}</h2>
          <p className="folder-structure-desc">{t('folder_structure_desc')}</p>

          <div className="phase-list">
            {template.phases.map((phase, phaseIdx) => (
              <div key={phase.id} className="phase-card">
                <div className="phase-card-header">
                  <div className="phase-card-reorder">
                    <button
                      className="btn-icon"
                      disabled={phaseIdx === 0}
                      onClick={() => handleMovePhase(phase.id, -1)}
                      title={t('move_up')}
                    >
                      &#9650;
                    </button>
                    <button
                      className="btn-icon"
                      disabled={phaseIdx === template.phases.length - 1}
                      onClick={() => handleMovePhase(phase.id, 1)}
                      title={t('move_down')}
                    >
                      &#9660;
                    </button>
                  </div>
                  <input
                    type="text"
                    className="phase-input-label"
                    value={phase.label}
                    onChange={(e) => handleUpdatePhase(phase.id, { label: e.target.value })}
                    placeholder={t('phase_name')}
                  />
                  <input
                    type="text"
                    className="phase-input-folder"
                    value={phase.folder_name}
                    onChange={(e) => handleUpdatePhase(phase.id, { folder_name: e.target.value })}
                    placeholder={t('folder_name')}
                  />
                  <button className="btn danger" onClick={() => handleRemovePhase(phase.id)}>
                    {t('delete')}
                  </button>
                </div>

                <div className="phase-subfolders">
                  <span className="phase-subfolders-label">{t('subfolders')}:</span>
                  {phase.subfolders.map((sub, subIdx) => (
                    <div key={subIdx} className="phase-subfolder-item">
                      <input
                        type="text"
                        className="phase-subfolder-input"
                        value={sub}
                        onChange={(e) => handleUpdateSubfolder(phase.id, subIdx, e.target.value)}
                        placeholder={t('subfolder_name')}
                      />
                      <button
                        className="btn-icon danger"
                        onClick={() => handleRemoveSubfolder(phase.id, subIdx)}
                      >
                        &#10005;
                      </button>
                    </div>
                  ))}
                  <button className="btn small" onClick={() => handleAddSubfolder(phase.id)}>
                    + {t('add_subfolder')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {template.phases.length === 0 && (
            <div className="category-empty">{t('no_phases')}</div>
          )}

          <div className="folder-template-actions">
            <button className="btn primary" onClick={handleAddPhase}>
              + {t('add_phase')}
            </button>
            <button className="btn" onClick={handleResetTemplate}>
              {t('reset_to_default')}
            </button>
            <button className="btn primary" onClick={handleSaveTemplate}>
              {t('save')}
            </button>
            {templateSaved && <span className="template-saved">{t('settings_saved')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
