/** Viewing the plan: today's sessions (including a double day) render from Firestore. */
import React from 'react';
import { format } from 'date-fns';
import { act, render, screen } from '@testing-library/react-native';
import PlanScreen from '@/app/(tabs)/plan';
import { fakeFirestore } from '../../test/fake-firestore';

const UID = 'u1';
const today = format(new Date(), 'yyyy-MM-dd');

jest.mock('@/hooks/use-auth', () => {
  // Stable objects, as the real AuthProvider keeps them in state.
  const { format: fmt } = require('date-fns');
  const value = {
    user: { uid: 'u1' },
    profile: { uid: 'u1', wizardCompleted: true, dailyMaxHours: { [fmt(new Date(), 'EEEE')]: 2.5 } },
    loading: false,
  };
  return { useAuth: () => value };
});

const session = (id: string, data: object) =>
  fakeFirestore.seed('workouts', id, { userId: UID, date: today, completed: false, status: 'planned', ...data });

it('shows an empty day', async () => {
  await render(<PlanScreen />);
  expect(screen.getByText('Your Plan')).toBeTruthy();
  expect(screen.getByText('No sessions scheduled for this day.')).toBeTruthy();
  expect(screen.getByText('2.5 hrs')).toBeTruthy();
});

it("shows today's sessions, both halves of a double day", async () => {
  session(`plan_${UID}_${today}`, { sport: 'cycling', name: 'Endurance Ride', tss: 70, time: 7200, slot: 'am' });
  session(`plan_${UID}_${today}_pm`, { sport: 'running', name: 'Easy Run', tss: 30, time: 2700, slot: 'pm' });
  session('other-user', { userId: 'someone-else', sport: 'swimming', name: 'Not Mine' });

  await render(<PlanScreen />);

  expect(screen.getByText('Endurance Ride')).toBeTruthy();
  expect(screen.getByText('Easy Run')).toBeTruthy();
  expect(screen.queryByText('Not Mine')).toBeNull();
});

it('updates when a freshly generated plan arrives', async () => {
  await render(<PlanScreen />);
  expect(screen.getByText('No sessions scheduled for this day.')).toBeTruthy();
  await act(async () => {
    session(`plan_${UID}_${today}`, { sport: 'swimming', name: 'Aerobic Swim', tss: 40, time: 3000 });
  });
  expect(screen.getByText('Aerobic Swim')).toBeTruthy();
});
