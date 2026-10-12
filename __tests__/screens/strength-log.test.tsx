/** Logging the sets actually done on a strength session, and seeing them in the summary. */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import StrengthLog from '@/components/strength-log';
import SessionSummary, { describeSet } from '@/components/session-summary';
import type { Workout } from '@/lib/workout-service';
import { fakeFirestore } from '../../test/fake-firestore';

const planned: Workout = {
  id: 'gym1', userId: 'u1', name: 'Full Body Strength A', description: '', date: '2026-10-12',
  sport: 'strength', completed: false, status: 'planned',
  steps: [
    { type: 'exercise', duration: 400, name: 'A. Dumbbell Goblet Squat', sets: 2, reps: 8 },
    { type: 'exercise', duration: 300, name: 'B1. Pull-Up', sets: 1, reps: 6 },
  ],
};

beforeEach(() => fakeFirestore.seed('workouts', 'gym1', { userId: 'u1', sport: 'strength' }));

it('pre-fills the planned exercises and saves what was lifted', async () => {
  const onSaved = jest.fn();
  await render(<StrengthLog workout={planned} onSaved={onSaved} />);
  expect(screen.getByText('Dumbbell Goblet Squat')).toBeTruthy();
  expect(screen.getByText('3 sets · 22 reps · 0 kg total')).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Dumbbell Goblet Squat set 1 weight'), '24');
  await fireEvent.changeText(screen.getByLabelText('Dumbbell Goblet Squat set 2 reps'), '7');
  await fireEvent.changeText(screen.getByLabelText('Dumbbell Goblet Squat set 2 weight'), '24');
  await fireEvent.press(screen.getByText('Save sets'));

  const expected = [
    { exercise: 'Dumbbell Goblet Squat', reps: 8, weight_kg: 24 },
    { exercise: 'Dumbbell Goblet Squat', reps: 7, weight_kg: 24 },
    { exercise: 'Pull-Up', reps: 6 },
  ];
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expected));
  expect(fakeFirestore.get('workouts', 'gym1')!.logged_sets).toEqual(expected);
});

it('adds and removes sets and exercises', async () => {
  const onSaved = jest.fn();
  await render(<StrengthLog workout={planned} onSaved={onSaved} imperial />);
  await fireEvent.press(screen.getByLabelText('Add a set of Pull-Up'));
  await fireEvent.press(screen.getByLabelText('Remove Dumbbell Goblet Squat set 2'));
  await fireEvent.changeText(screen.getByPlaceholderText('Add an exercise (e.g. Hip Thrust)'), 'Hip Thrust');
  await fireEvent.press(screen.getByText('Add'));
  await fireEvent.changeText(screen.getByLabelText('Hip Thrust set 1 weight'), '100');
  await fireEvent.press(screen.getByText('Save sets'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(onSaved.mock.calls[0][0]).toEqual([
    { exercise: 'Dumbbell Goblet Squat', reps: 8 },
    { exercise: 'Pull-Up', reps: 6 }, { exercise: 'Pull-Up', reps: 6 },
    { exercise: 'Hip Thrust', weight_kg: 45.4 }, // entered in lb, stored in kg
  ]);
});

it('summary lists the logged sets by exercise, with no distance', async () => {
  const done: Workout = { ...planned, completed: true, status: 'completed', stats: { duration_seconds: 2400 } as any,
    logged_sets: [{ exercise: 'Deadlift', reps: 5, weight_kg: 100 }, { exercise: 'Plank', duration_sec: 45 }] };
  await render(<SessionSummary workout={done} />);
  expect(screen.getByText('Deadlift')).toBeTruthy();
  expect(screen.getByText('Set 1: 5 reps × 100 kg')).toBeTruthy();
  expect(screen.getByText('Set 1: 45 s')).toBeTruthy();
  expect(screen.queryByText('Distance')).toBeNull();
  expect(describeSet({ exercise: 'X' }, false)).toBe('done');
  expect(describeSet({ exercise: 'X', reps: 5, weight_kg: 45.4 }, true)).toBe('5 reps × 100 lb');
});
