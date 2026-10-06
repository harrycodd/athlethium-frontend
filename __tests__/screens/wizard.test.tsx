/** Onboarding: a new athlete completes the wizard, connects Strava and gets their first plan. */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import WizardScreen from '@/app/wizard';
import { auth } from '@/lib/firebase';
import { connectStrava } from '@/lib/strava';
import { fakeFirestore } from '../../test/fake-firestore';
import { mockRouter } from '../../test/setup';

const UID = 'new-athlete';

jest.mock('@/lib/strava', () => ({ connectStrava: jest.fn(), disconnectStrava: jest.fn() }));

jest.mock('@/hooks/use-auth', () => {
  const value = {
    user: { uid: 'new-athlete', email: 'alex@example.com' },
    profile: { uid: 'new-athlete', wizardCompleted: false, scheduleDaysAhead: 1 },
    loading: false,
  };
  return { useAuth: () => value };
});

beforeEach(() => {
  (auth as any).currentUser = { uid: UID, getIdToken: jest.fn().mockResolvedValue('tok') };
  fakeFirestore.seed('users', UID, { uid: UID, wizardCompleted: false });
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ generated_dates: [] }) });
  (connectStrava as jest.Mock).mockResolvedValue({ status: 'connected' });
});

/** Presses Next until `text` is on screen (fails after the wizard's last step). */
const nextUntil = async (text: string) => {
  for (let i = 0; i < 12 && !screen.queryByText(text); i += 1) {
    await fireEvent.press(screen.getByText('Next'));
  }
  expect(screen.getByText(text)).toBeTruthy();
};

it('a new athlete can onboard as a Pro, connect Strava and receive a plan', async () => {
  await render(<WizardScreen />);
  expect(screen.getByText('Welcome Athlete')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), 'Alex Racer');

  await nextUntil('Connect with Strava');
  await fireEvent.press(screen.getByText('Connect with Strava'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Success', 'Strava Connected Successfully!'));
  expect(connectStrava).toHaveBeenCalledWith('/wizard');

  await nextUntil('Professional');
  await fireEvent.press(screen.getByText('Professional'));

  await nextUntil('Complete');
  await fireEvent.press(screen.getByText('Complete'));

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));

  const saved = fakeFirestore.get('users', UID)!;
  expect(saved).toMatchObject({
    displayName: 'Alex Racer',
    wizardCompleted: true,
    fitness_level: 'pro',
    sports: expect.arrayContaining(['running', 'cycling', 'swimming']),
    focused_sports: ['running'],
  });
  expect(saved.ctl).toBeGreaterThan(0);
  expect(saved.goal).toMatchObject({ name: 'My Fitness Target', type: 'Goal' });

  const goals = Object.values(fakeFirestore.all('workouts')).filter((w) => w.type === 'Goal');
  expect(goals).toEqual([expect.objectContaining({ userId: UID, name: 'My Fitness Target' })]);

  // The first plan is requested from the backend with the athlete's token.
  expect(globalThis.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/generate_training_session$/),
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) })
  );
});

it('the name step must be filled in', async () => {
  await render(<WizardScreen />);
  await fireEvent(screen.getByPlaceholderText('Enter your name'), 'submitEditing');
  expect(Alert.alert).toHaveBeenCalledWith('Required', 'Please enter your name to proceed.');
  expect(screen.getByText('Welcome Athlete')).toBeTruthy();
});

it('a failed Strava connection is reported and onboarding can continue', async () => {
  (connectStrava as jest.Mock).mockResolvedValue({ status: 'error', error: 'strava_auth_rejected' });
  await render(<WizardScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), 'Alex');
  await nextUntil('Connect with Strava');
  await fireEvent.press(screen.getByText('Connect with Strava'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to connect to Strava: strava_auth_rejected')
  );
  await nextUntil('Complete');
});

it('a save failure keeps the athlete on the wizard', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  fakeFirestore.reset(); // no profile document: the update fails
  await render(<WizardScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), 'Alex');
  await nextUntil('Complete');
  await fireEvent.press(screen.getByText('Complete'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to complete setup wizard'));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
