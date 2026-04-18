import bn from './locales/bn/index';
import en from './locales/en/index';
export const defaultNS = 'common';

export const resources = {
  en,
  bn
} as const;

export const supportedLanguages = ['en', 'bn'] as const;

export type AppLanguage = (typeof supportedLanguages)[number];
