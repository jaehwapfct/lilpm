import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';

export type Language = 'en' | 'ko';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang: Language) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
    }),
    {
      name: 'language-storage',
      onRehydrateStorage: () => (state) => {
        // Sync i18n with persisted language on load
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
