/** The home-screen goal card counts down the days to the goal, in English. */
import React from 'react';
import { addDays, format } from 'date-fns';
import { render, screen } from '@testing-library/react-native';
import GoalCountdown from '@/components/goal-countdown';

jest.mock('@/hooks/use-auth', () => {
  const value = {
    user: { uid: 'u1', email: 'sam@example.com' },
    profile: { uid: 'u1', displayName: 'Sam Rider', wizardCompleted: true, units: 'Metric' },
    loading: false,
  };
  return { useAuth: () => value };
});

const goalIn = (days: number) => ({
  id: 'goal1',
  userId: 'u1',
  name: 'Spring Marathon',
  sport: 'running',
  type: 'Goal',
  date: format(addDays(new Date(), days), 'yyyy-MM-dd'),
  completed: false,
}) as any;

it('shows the days left to an upcoming goal', async () => {
  const goal = goalIn(5);
  await render(<GoalCountdown goal={goal} />);
  expect(screen.getByText('Spring Marathon Countdown')).toBeTruthy();
  const days = Math.ceil((new Date(goal.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  expect(screen.getByText(String(days))).toBeTruthy();
  expect(screen.getByText('days to go')).toBeTruthy();
  expect(screen.getByText('Plan Progress')).toBeTruthy();
  expect(screen.getByText(/^Week \d+ of 12 \(\d+%\)$/)).toBeTruthy();
});

it('uses the singular for one day left', async () => {
  const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await render(<GoalCountdown eventName="Club Race" goalDate={tomorrow} />);
  expect(screen.getByText('Club Race Countdown')).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
  expect(screen.getByText('day to go')).toBeTruthy();
});
