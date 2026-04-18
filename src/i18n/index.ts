import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { defaultNS, resources, supportedLanguages, type AppLanguage } from './resources';

const LANGUAGE_STORAGE_KEY = 'app.language';

async function readSavedLanguage() {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.warn('AsyncStorage unavailable, using device language fallback.', error);
    return null;
  }
}

async function persistLanguage(language: AppLanguage) {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('AsyncStorage unavailable, language will not persist.', error);
  }
}

function isSupportedLanguage(language: string): language is AppLanguage {
  return supportedLanguages.includes(language as AppLanguage);
}

function getDeviceLanguage(): AppLanguage {
  const languageCode = getLocales()[0]?.languageCode?.toLowerCase() ?? 'en';
  return isSupportedLanguage(languageCode) ? languageCode : 'en';
}

export async function initI18n() {
  if (i18n.isInitialized) {
    return i18n;
  }

  const savedLanguage = await readSavedLanguage();
  const initialLanguage =
    savedLanguage && isSupportedLanguage(savedLanguage) ? savedLanguage : getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    defaultNS,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    lng: initialLanguage,
    ns: [defaultNS, 'home'],
    resources,
    returnNull: false,
    supportedLngs: [...supportedLanguages],
  });

  return i18n;
}

export async function setAppLanguage(language: AppLanguage) {
  await i18n.changeLanguage(language);
  await persistLanguage(language);
}

export { i18n };

