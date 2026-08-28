import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const defaultNS = 'common';
export const resources = {
  en: {
    common: en.common,
    auth: en.auth,
    tabs: en.tabs,
    workout: en.workout,
    readiness: en.readiness,
  },
} as const;

export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
];

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  compatibilityJSON: 'v4',
});

export const changeLanguage = async (lng: string) => {
  return i18n.changeLanguage(lng);
};

export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

export default i18n;
