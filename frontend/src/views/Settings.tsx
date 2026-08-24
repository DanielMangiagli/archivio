import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import {
  getSettings,
  saveSettings,
  listCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../api';
import type { Category } from '../types';

interface SettingsProps {
  onBack: () => void;
}

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

  useEffect(() => {
    listCategories().then(setCategories).catch(console.error);
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
      </div>
    </div>
  );
}
