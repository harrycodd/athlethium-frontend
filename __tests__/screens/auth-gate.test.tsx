/** The app's entry route sends people to login, onboarding, or their plan. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { onAuthStateChanged } from 'firebase/auth';
import Index from '@/app/index';
import { AuthProvider } from '@/hooks/use-auth';
import { fakeFirestore } from '../../test/fake-firestore';

const signedInAs = (user: object | null) =>
  (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
    cb(user);
    return () => {};
  });

const renderApp = () =>
  render(
    <AuthProvider>
      <Index />
    </AuthProvider>
  );

it('signed-out visitors go to login', async () => {
  signedInAs(null);
  await renderApp();
  expect(await screen.findByText('redirect:/(auth)/login')).toBeTruthy();
});

it('athletes who have not finished onboarding go to the wizard', async () => {
  fakeFirestore.seed('users', 'u1', { uid: 'u1', wizardCompleted: false, timezone: 'Europe/London' });
  signedInAs({ uid: 'u1', email: 'a@b.c' });
  await renderApp();
  expect(await screen.findByText('redirect:/wizard')).toBeTruthy();
});

it('onboarded athletes go to their plan, and their time zone is kept current', async () => {
  fakeFirestore.seed('users', 'u1', { uid: 'u1', wizardCompleted: true, timezone: 'Mars/Olympus' });
  signedInAs({ uid: 'u1', email: 'a@b.c' });
  await renderApp();
  expect(await screen.findByText('redirect:/(tabs)')).toBeTruthy();
  expect(fakeFirestore.get('users', 'u1')!.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
});

it('a brand-new account gets a default profile and is sent to onboarding', async () => {
  signedInAs({ uid: 'new', email: 'new.rider@example.com' });
  await renderApp();
  expect(await screen.findByText('redirect:/wizard')).toBeTruthy();
  expect(fakeFirestore.get('users', 'new')).toMatchObject({ uid: 'new', displayName: 'new.rider', wizardCompleted: false });
});
