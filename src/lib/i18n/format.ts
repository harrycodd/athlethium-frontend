import { format, type Locale } from 'date-fns';
import { de, enUS, es, fr, it, ja } from 'date-fns/locale';
import i18n from './index';

const DATE_LOCALES: Record<string, Locale> = { en: enUS, es, fr, de, it, ja };

/** date-fns locale for the current app language (month and day names, ordinals, week start). */
export function dateLocale(): Locale {
  // The chosen language decides, even before its translation files are filled in
  // (resolvedLanguage falls back to English while a language has no strings yet).
  const chosen = (i18n.language || '').split('-')[0];
  return DATE_LOCALES[chosen] ?? DATE_LOCALES[i18n.resolvedLanguage || ''] ?? enUS;
}

/**
 * Formats a date for display in the current language, e.g. formatDate(d, 'EEEE, MMMM do').
 * Use plain date-fns `format` for storage keys such as 'yyyy-MM-dd'.
 */
export function formatDate(date: Date | number, pattern: string): string {
  return format(date, pattern, { locale: dateLocale() });
}

/** Numbers with the language's separators (e.g. 1.234,5 in German). */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language, options).format(value);
  } catch {
    return String(value);
  }
}
