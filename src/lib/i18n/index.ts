import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NAMESPACES, resources } from './locales';
import { DEFAULT_LANGUAGE, LANGUAGES, deviceLanguage } from './languages';

export { LANGUAGES, isSupportedLanguage, deviceLanguage } from './languages';
export type { LanguageCode } from './languages';

export const defaultNS = 'common';

i18n.use(initReactI18next).init({
  // Start in the phone's language; a saved choice is restored by `restoreLanguage` (language.ts).
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map((l) => l.code),
  resources,
  ns: [...NAMESPACES],
  defaultNS,
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  returnNull: false,
  compatibilityJSON: 'v4',
});

export const getCurrentLanguage = () => i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;

export default i18n;
