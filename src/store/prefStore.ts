import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

interface PreferencesState {
  language: string;
  theme: 'light' | 'dark' | 'system';
  setLanguage: (lang: string) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
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
      const language = await SecureStore.getItemAsync('app_language');
      const theme = await SecureStore.getItemAsync('app_theme') as 'light' | 'dark' | 'system' | null;

      if (language) set({ language });
      if (theme) set({ theme });
    } catch (e) {
      // Ignore error, fallback to defaults
    }
  },
}));
