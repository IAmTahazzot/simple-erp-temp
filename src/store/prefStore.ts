import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { supportedLanguages } from '@/i18n/resources';

type Language = (typeof supportedLanguages)[number];

type Theme = 'light' | 'dark' | 'system';

const isSupportedLanguage = (value: string): value is Language => {
  return supportedLanguages.includes(value as Language);
};

const isTheme = (value: string): value is Theme => {
  return value === 'light' || value === 'dark' || value === 'system';
};

interface PreferencesState {
  language: Language;
  theme: Theme;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  loadPreferences: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'en',
  theme: 'system',

  setLanguage: async (lang) => {
    await SecureStore.setItemAsync('app_language', lang);
    set({ language: lang });
  },

  setTheme: async (theme) => {
    await SecureStore.setItemAsync('app_theme', theme);
    set({ theme });
  },

  loadPreferences: async () => {
    try {
      const storedLanguage = await SecureStore.getItemAsync('app_language');
      const storedTheme = await SecureStore.getItemAsync('app_theme');

      const language: Language =
        storedLanguage && isSupportedLanguage(storedLanguage) ? storedLanguage : 'en';
      const theme: Theme =
        storedTheme && isTheme(storedTheme) ? storedTheme : 'system';

      set({ language, theme });
    } catch {
      // Ignore errors and keep defaults.
    }
  },
}));
