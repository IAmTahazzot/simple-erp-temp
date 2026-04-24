export const Colors = {
    light: {
        background: '#FFF',
        background2: '#EDEDED',
        border: '#c7c7c7',
        primary: '#171717',
        text: '#171717',
        label: '#4b4b4b',
        placeholder: '#797979'
    },
    dark: {
        background: '#000000ff'
    },
}

export const Themes = {
    VOID: '#000000',
    DARK: '#171717',
    WATER: '#0051EA',
    DANGER: '#FF0000',
    INFO: '#1586FF',
} as const;

export type ThemeType = keyof typeof Themes;
