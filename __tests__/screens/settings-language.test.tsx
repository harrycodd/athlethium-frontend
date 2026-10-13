/** Settings: picking a language switches the app and saves it for the athlete. */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import SettingsScreen from '@/app/settings';
import i18n from '@/lib/i18n';
import { changeAppLanguage } from '@/lib/i18n/language';

jest.mock('@/lib/strava', () => ({ connectStrava: jest.fn(), disconnectStrava: jest.fn() }));

jest.mock('@/lib/i18n/language', () => ({
  changeAppLanguage: jest.fn(async (code: string) => {
    await jest.requireActual('@/lib/i18n').default.changeLanguage(code);
  }),
  DEVICE_LANGUAGE: 'device',
  followsDeviceLanguage: jest.fn(() => false),
  applyLanguage: jest.fn(async () => {}),
  restoreLanguage: jest.fn(async () => {}),
}));

jest.mock('@/hooks/use-auth', () => {
  // Stable objects, as the real AuthProvider keeps them in state.
  const value = {
    user: { uid: 'u1', email: 'sam@example.com' },
    profile: { uid: 'u1', displayName: 'Sam Rider', wizardCompleted: true, scheduleDaysAhead: 3, units: 'Metric' },
    loading: false,
  };
  return { useAuth: () => value };
});

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

it('changes the app language from the picker', async () => {
  await render(<SettingsScreen />);

  // The language row lives in the Athlete Profile section.
  await fireEvent.press(screen.getByText('Athlete Profile'));
  expect(screen.getByText('Upcoming sessions are rewritten in the new language.')).toBeTruthy();
  expect(screen.getByText('English')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Language'));
  expect(screen.getByText('Choose Language')).toBeTruthy();

  await fireEvent.press(screen.getByText('Deutsch'));

  expect(changeAppLanguage).toHaveBeenCalledTimes(1);
  expect(changeAppLanguage).toHaveBeenCalledWith('de', { uid: 'u1', email: 'sam@example.com' }, 3);
  expect(screen.queryByText('Choose Language')).toBeNull();
});

it('does nothing when the current language is picked again', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByText('Athlete Profile'));
  await fireEvent.press(screen.getByLabelText('Language'));

  await fireEvent.press(screen.getAllByText('English')[1]);

  expect(changeAppLanguage).not.toHaveBeenCalled();
  expect(screen.queryByText('Choose Language')).toBeNull();
});

it('offers the phone language and shows it on the row when chosen', async () => {
  const { followsDeviceLanguage } = jest.requireMock('@/lib/i18n/language');
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByText('Athlete Profile'));
  await fireEvent.press(screen.getByLabelText('Language'));

  await fireEvent.press(screen.getByText('Phone language'));
  expect(changeAppLanguage).toHaveBeenCalledWith('device', { uid: 'u1', email: 'sam@example.com' }, 3);

  followsDeviceLanguage.mockReturnValue(true);
  await fireEvent.press(screen.getByLabelText('Language'));
  await fireEvent.press(screen.getByText('Cancel'));
  expect(screen.getByText('Phone language (English)')).toBeTruthy();
  followsDeviceLanguage.mockReturnValue(false);
});
