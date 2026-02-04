import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ko from './locales/ko.json';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
};

// Get language from language-storage (Zustand persisted state)
const getStoredLanguage = (): string => {
  try {
    const stored = localStorage.getItem('language-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.language || 'en';
    }
  } catch (e) {
    // Ignore errors
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: getStoredLanguage(), // Default to English, respect stored preference
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
