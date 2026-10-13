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

/** The phone's languages, most preferred first. On iOS this includes the app's own Language setting. */
function phoneLanguages(): string[] {
  try {
    // Loaded lazily so a build without the native module falls back to Intl instead of crashing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    const codes = getLocales().map((l) => l.languageCode ?? l.languageTag.split('-')[0]);
    if (codes.length) return codes;
  } catch {
    // fall through
  }
  try {
    return [Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0]];
  } catch {
    return [];
  }
}

/** The first of the phone's languages we support ("de-AT" -> "de"), otherwise English. */
export function deviceLanguage(): LanguageCode {
  const match = phoneLanguages()
    .map((code) => code.toLowerCase())
    .find(isSupportedLanguage);
  return match ?? DEFAULT_LANGUAGE;
}
