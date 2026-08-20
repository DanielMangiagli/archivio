import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import it from './locales/it.json';
import en from './locales/en.json';

type Lang = 'it' | 'en';

const translations: Record<Lang, Record<string, string>> = { it, en };

let currentLang: Lang = 'it';

export function t(key: string): string {
  return translations[currentLang][key] || key;
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
}

interface I18nContextValue {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'it',
  t,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang);

  const handleSetLang = useCallback((newLang: Lang) => {
    currentLang = newLang;
    setLangState(newLang);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t, setLang: handleSetLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
