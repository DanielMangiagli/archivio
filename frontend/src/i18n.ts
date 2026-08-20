// Copyright Daniele Mangiagli
// Licensed under the PolyForm Noncommercial License 1.0.0
// See LICENSE file in the project root for full license information.

import it from './locales/it.json';
import en from './locales/en.json';

type Lang = 'it' | 'en';

const translations: Record<Lang, Record<string, string>> = { it, en };

let currentLang: Lang = 'it';

export function setLang(lang: Lang) {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

export function t(key: string): string {
  return translations[currentLang][key] || key;
}
