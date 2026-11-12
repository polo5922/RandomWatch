import en from '../public/_locales/en/messages.json';

export type MessageKey = keyof typeof en;

type I18nApi = { getMessage(key: string, subs?: string[]): string; getUILanguage(): string };
const api = () => (globalThis as { chrome?: { i18n?: I18nApi } }).chrome?.i18n;

/**
 * Texte traduit selon la langue du navigateur (_locales/fr ou en, l'anglais par défaut).
 * Hors extension (tests), retombe sur le texte anglais.
 */
export function t(key: MessageKey, ...subs: (string | number)[]): string {
  const s = subs.map(String);
  return api()?.getMessage(key, s) || en[key].message.replace(/\$(\d)/g, (_, i: string) => s[Number(i) - 1] ?? '');
}

export const uiLanguage = () => api()?.getUILanguage() ?? 'en';
