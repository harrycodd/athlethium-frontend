/** Switching language at runtime: screens re-render, dates follow the language, the phone's language is detected. */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import i18n, { deviceLanguage } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';

const MONDAY = new Date(2026, 9, 5); // 5 October 2026

afterEach(async () => {
  jest.restoreAllMocks();
  await act(() => i18n.changeLanguage('en'));
});

it('renders the login screen and keeps working after a language change', async () => {
  await render(<LoginScreen />);
  expect(screen.getByText('Sign In')).toBeTruthy();

  await act(() => i18n.changeLanguage('ja'));
  expect(i18n.language).toBe('ja');
  // still rendered (Japanese text falls back to English until translators fill it in)
  expect(screen.getByPlaceholderText(i18n.t('auth:emailPlaceholder'))).toBeTruthy();

  await act(() => i18n.changeLanguage('en'));
  expect(screen.getByText('Sign In')).toBeTruthy();
});

it('formats dates in the current language', async () => {
  expect(formatDate(MONDAY, 'EEEE')).toBe('Monday');

  await act(() => i18n.changeLanguage('ja'));
  expect(formatDate(MONDAY, 'EEEE')).toBe('月曜日');

  await act(() => i18n.changeLanguage('en'));
  expect(formatDate(MONDAY, 'EEEE')).toBe('Monday');
});

describe('deviceLanguage', () => {
  const mockLocale = (locale: string) =>
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () => ({ resolvedOptions: () => ({ locale }) }) as unknown as Intl.DateTimeFormat
    );

  it('uses a supported phone language without its region', () => {
    mockLocale('de-AT');
    expect(deviceLanguage()).toBe('de');
  });

  it('falls back to English for an unsupported phone language', () => {
    mockLocale('pt-BR');
    expect(deviceLanguage()).toBe('en');
  });
});
