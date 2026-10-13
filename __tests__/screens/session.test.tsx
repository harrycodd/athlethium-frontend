/** Session details: a completed and a planned session render their labels from Firestore. */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SessionDetailsScreen from '@/app/session/[id]';
import { fakeFirestore } from '../../test/fake-firestore';

const UID = 'u1';

jest.mock('@/hooks/use-auth', () => {
  // Stable objects, as the real AuthProvider keeps them in state.
  const value = { user: { uid: 'u1' }, profile: { uid: 'u1', units: 'Metric' }, loading: false };
  return { useAuth: () => value };
});

// native map views and animated charts aren't available in Jest
jest.mock('react-native-maps', () => ({ __esModule: true, default: () => null, Polyline: () => null }));
jest.mock('react-native-gifted-charts', () => ({ BarChart: () => null, LineChart: () => null }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => () => null);

// test/setup.tsx mocks expo-router with no route params; open the seeded session instead
const openSession = (id: string) => {
  const params = { id };
  jest.spyOn(jest.requireMock('expo-router'), 'useLocalSearchParams').mockReturnValue(params);
};

it('shows a completed ride with its analysis and structure', async () => {
  fakeFirestore.seed('workouts', 'ride1', {
    userId: UID, date: '2026-10-12', sport: 'cycling', name: 'Sweet Spot Ride', description: 'Steady work',
    completed: true, status: 'completed', tss: 72, time: 3600, plannedTime: 3600,
    stats: { duration_seconds: 3600, distance_m: 30000, avg_power: 210 },
    steps: [
      { type: 'warmup', duration: 600, target_low: 50, target_high: 65 },
      { type: 'interval', duration: 1200, name: 'Sweet Spot', target_low: 88, target_high: 93 },
    ],
  });
  openSession('ride1');
  await render(<SessionDetailsScreen />);

  expect(await screen.findByText('Completed')).toBeTruthy();
  expect(screen.getByText('Redo')).toBeTruthy();
  expect(screen.getByText('Session Duration')).toBeTruthy();
  expect(screen.getAllByText('Cycling').length).toBeGreaterThan(0); // sport badge and picker
  expect(screen.getByText('72 TSS')).toBeTruthy();

  await fireEvent.press(screen.getByText('Analysis'));
  expect(await screen.findByText('Completed Workout')).toBeTruthy();
  expect(screen.getByText('Avg Power')).toBeTruthy();
  expect(screen.getByText('Distance')).toBeTruthy();

  await fireEvent.press(screen.getByText('Structure'));
  expect(await screen.findByText('WARMUP Step')).toBeTruthy();
  expect(screen.getByText('50-65% FTP')).toBeTruthy();
  expect(screen.getByText('Sweet Spot')).toBeTruthy(); // backend step name, shown as-is
  expect(screen.getByText('10m')).toBeTruthy();
});

it('shows a planned strength session ready to log and start', async () => {
  fakeFirestore.seed('workouts', 'gym1', {
    userId: UID, date: '2026-10-12', sport: 'strength', name: 'Full Body Strength A', description: '',
    completed: false, status: 'planned', plannedTime: 2700,
    steps: [{ type: 'exercise', duration: 600, name: 'A. Barbell Back Squat', sets: 3, reps: 5 }],
  });
  openSession('gym1');
  await render(<SessionDetailsScreen />);

  expect(await screen.findByText('Log your sets')).toBeTruthy();
  expect(screen.getByText('3 sets · 15 reps · 0 kg total')).toBeTruthy();
  expect(screen.getByText('Planned Duration')).toBeTruthy();
  expect(screen.getByText('Description & Goals')).toBeTruthy();
  expect(screen.getByPlaceholderText('What are the goals for this session?')).toBeTruthy();
  expect(screen.getByText('Start Activity')).toBeTruthy();
  expect(screen.getByText('Upload')).toBeTruthy();
  expect(screen.queryByText('Analysis')).toBeNull();
  expect(screen.getAllByText('Strength').length).toBeGreaterThan(0);

  await fireEvent.press(screen.getByText('Structure'));
  expect(await screen.findByText('3 sets × 5 reps')).toBeTruthy();
  expect(screen.getByText('Exercise')).toBeTruthy();
});
