import { describe, it, expect, beforeEach } from 'vitest';
import { t, getLang, setLang } from '../i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLang('it');
  });

  it('default language is Italian', () => {
    expect(getLang()).toBe('it');
  });

  it('t() returns Italian translation', () => {
    expect(t('app_title')).toBe('Archivio');
  });

  it('t() returns key when translation missing', () => {
    expect(t('nonexistent_key')).toBe('nonexistent_key');
  });

  it('setLang changes language', () => {
    setLang('en');
    expect(getLang()).toBe('en');
  });

  it('t() returns English translation after switch', () => {
    setLang('en');
    expect(t('app_title')).toBe('Archivio');
    expect(t('back')).toBe('← Back');
  });

  it('t() returns Italian after switching back', () => {
    setLang('en');
    setLang('it');
    expect(t('back')).toBe('← Indietro');
  });

  it('all known keys resolve in Italian', () => {
    setLang('it');
    const keys = [
      'app_title', 'subtitle', 'search_placeholder', 'all_statuses',
      'new_project', 'generate_index', 'back', 'edit', 'delete',
      'sync_folder', 'add_file', 'no_projects_found', 'no_files',
      'files', 'photos', 'contract_date', 'amount', 'status', 'client',
      'description', 'notes', 'tags', 'new_project_title', 'edit_project_title',
      'code', 'name', 'description_label', 'contract_date_label',
      'completion_date', 'amount_label', 'status_label', 'notes_label',
      'cancel', 'create', 'save', 'confirm_delete_project', 'confirm_delete_file',
      'error_delete', 'index_generated', 'click_to_open_folder',
      'delete_file_title', 'open_folder_title', 'status_bozza', 'status_in_corso',
      'status_sospeso', 'status_completato', 'status_archiviato',
      'generated_on', 'total_projects', 'amount_paid',
    ];
    for (const key of keys) {
      expect(t(key)).not.toBe(key);
    }
  });

  it('all known keys resolve in English', () => {
    setLang('en');
    const keys = [
      'app_title', 'back', 'edit', 'delete', 'cancel', 'create', 'save',
      'status_bozza', 'status_in_corso', 'status_sospeso',
      'status_completato', 'status_archiviato', 'amount_paid',
    ];
    for (const key of keys) {
      expect(t(key)).not.toBe(key);
    }
  });
});
