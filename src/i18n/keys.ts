// src/i18n/keys.ts
import en from './locales/en/index';

type Leaves<T, P extends string = ''> = {
    [K in keyof T]: T[K] extends object
    ? Leaves<T[K], `${P}${K & string}.`>
    : `${P}${K & string}`;
}[keyof T];

export type HomeKey = Leaves<typeof en.home>;     // 'title' | 'subtitle' | 'searchPlaceholder' | 'currentInput'
export type CommonKey = Leaves<typeof en.common>; // 'language.label' | 'language.english' | 'language.bangla'