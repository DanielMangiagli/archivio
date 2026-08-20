import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './i18n';
import App from './App';
import { getSettings } from './api';
import { setLang } from './i18n';

async function init() {
  try {
    const settings = await getSettings();
    setLang(settings.language as 'it' | 'en');
  } catch {
    // Use default Italian
  }

  createRoot(document.getElementById('app')!).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>
  );
}

init();
