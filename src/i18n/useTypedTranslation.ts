import { useTranslation } from 'react-i18next';

import type { CommonKey, HomeKey } from './keys';

export function useHomeTranslation() {
  const { t: rawT, i18n } = useTranslation('home');
  const t = (key: HomeKey, options?: Record<string, unknown>): string =>
    rawT(key as string, options);
  return { t, i18n };
}

export function useCommonTranslation() {
  const { t: rawT, i18n } = useTranslation('common');
  const t = (key: CommonKey, options?: Record<string, unknown>): string =>
    rawT(key as string, options);
  return { t, i18n };
}
