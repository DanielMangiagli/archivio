import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { getSettings, saveSettings } from '../api';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { lang, setLang: setI18nLang, t } = useI18n();
  const [language, setLanguage] = useState(lang);

  const handleSave = async (newLang: string) => {
    setLanguage(newLang as 'it' | 'en');
    await saveSettings({ language: newLang });
    setI18nLang(newLang as 'it' | 'en');
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
      </div>
    </div>
  );
}
