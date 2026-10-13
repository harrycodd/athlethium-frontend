/** Languages the app ships with. Names are shown in their own language in the picker. */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isSupportedLanguage(code: unknown): code is LanguageCode {
  return typeof code === 'string' && LANGUAGES.some((l) => l.code === code);
}

/** The phone's language if we support it ("de-AT" -> "de"), otherwise English. */
export function deviceLanguage(): LanguageCode {
  try {
    const base = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0].toLowerCase();
    return isSupportedLanguage(base) ? base : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
