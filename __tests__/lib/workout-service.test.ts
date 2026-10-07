/**
 * Plan sync: the app asks the backend to plan any missing days, and shows what Firestore holds,
 * including both halves of a double day.
 */
import { format, addDays } from 'date-fns';
import { auth } from '@/lib/firebase';
import { fakeFirestore } from '../../test/fake-firestore';
import {
  generateMissingTrainingDays,
  regenerateIncompleteGeneratedWorkouts,
  subscribeToWorkouts,
  toggleWorkoutCompletion,
  Workout,
} from '@/lib/workout-service';

const UID = 'athlete-1';
const today = format(new Date(), 'yyyy-MM-dd');
const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd');

const okFetch = () =>
  jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ generated_dates: [] }), text: async () => '' });

const requestedDates = () =>
  (globalThis.fetch as jest.Mock).mock.calls.map(([, init]) => JSON.parse(init.body).date);

beforeEach(() => {
  (auth as any).currentUser = { uid: UID, getIdToken: jest.fn().mockResolvedValue('tok') };
  globalThis.fetch = okFetch();
  fakeFirestore.seed('users', UID, { uid: UID, wizardCompleted: true });
});

describe('generateMissingTrainingDays', () => {
  it('asks the backend for every day in the window that has no session yet', async () => {
    fakeFirestore.seed('workouts', 'existing', { userId: UID, date: day(1), sport: 'cycling' });
    fakeFirestore.seed('workouts', 'someone-else', { userId: 'other', date: day(2), sport: 'cycling' });

    await expect(generateMissingTrainingDays(UID, 3)).resolves.toBe(2);
    expect(requestedDates()).toEqual([today, day(2)]);
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/generate_training_session$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('does nothing until onboarding is complete', async () => {
    fakeFirestore.seed('users', UID, { uid: UID, wizardCompleted: false });
    await expect(generateMissingTrainingDays(UID, 7)).resolves.toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does nothing without a profile', async () => {
    await expect(generateMissingTrainingDays('nobody', 7)).resolves.toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('keeps going when one day fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => '{"error":"boom"}' })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await expect(generateMissingTrainingDays(UID, 2)).resolves.toBe(1);
    expect(requestedDates()).toEqual([today, day(1)]);
  });
});

it('regenerating replaces only unfinished generated sessions in the window', async () => {
  fakeFirestore.seed('workouts', 'gen-today', { userId: UID, date: today, workoutId: 'plan_x', completed: false });
  fakeFirestore.seed('workouts', 'done-today', { userId: UID, date: day(1), workoutId: 'plan_y', completed: true, status: 'completed' });
  fakeFirestore.seed('workouts', 'manual', { userId: UID, date: day(1), name: 'Club ride', completed: false });
  fakeFirestore.seed('workouts', 'later', { userId: UID, date: day(10), workoutId: 'plan_z', completed: false });

  const result = await regenerateIncompleteGeneratedWorkouts(UID, 2);

  expect(result).toEqual({ deletedCount: 1, generatedCount: 1 });
  expect(Object.keys(fakeFirestore.all('workouts')).sort()).toEqual(['done-today', 'later', 'manual']);
  expect(requestedDates()).toEqual([today]);
});

describe('subscribeToWorkouts', () => {
  const received = () => {
    const cb = jest.fn();
    const unsub = subscribeToWorkouts(UID, new Date(), cb);
    return { cb, unsub, latest: (): Workout[] => cb.mock.calls.at(-1)![0] };
  };

  it('shows both sessions of a double day, morning first', () => {
    fakeFirestore.seed('workouts', `plan_${UID}_${today}_pm`, {
      userId: UID, date: today, sport: 'cycling', name: 'Endurance Ride', slot: 'pm', completed: false,
    });
    fakeFirestore.seed('workouts', `plan_${UID}_${today}`, {
      userId: UID, date: today, sport: 'cycling', name: 'Endurance Ride', slot: 'am', completed: false,
    });
    const { latest, unsub } = received();
    expect(latest().map((w) => w.slot)).toEqual(['am', 'pm']);
    unsub();
  });

  it('hides duplicate planned copies but never completed sessions', () => {
    const base = { userId: UID, date: today, sport: 'running', name: 'Easy Run', completed: false };
    fakeFirestore.seed('workouts', 'a', base);
    fakeFirestore.seed('workouts', 'b', base);
    fakeFirestore.seed('workouts', 'c', { ...base, completed: true, status: 'completed' });
    const { latest } = received();
    expect(latest().map((w) => w.id)).toEqual(['a', 'c']);
  });

  it('updates live when the backend writes a new plan', () => {
    const { latest } = received();
    expect(latest()).toEqual([]);
    fakeFirestore.serverWrite('workouts', `plan_${UID}_${today}`, {
      userId: UID, date: today, sport: 'swimming', name: 'Aerobic Swim', completed: false,
    });
    expect(latest().map((w) => w.name)).toEqual(['Aerobic Swim']);
  });
});

it('marking a session complete records planned load, and undoing clears it', async () => {
  fakeFirestore.seed('workouts', 'w1', { userId: UID, date: today, sport: 'cycling', plannedTss: 60, plannedTime: 3600, status: 'planned' });
  await toggleWorkoutCompletion('w1', 'planned');
  expect(fakeFirestore.get('workouts', 'w1')).toMatchObject({ completed: true, status: 'completed', tss: 60, time: 3600 });
  await toggleWorkoutCompletion('w1', 'completed');
  const undone = fakeFirestore.get('workouts', 'w1')!;
  expect(undone).toMatchObject({ completed: false, status: 'planned' });
  expect(undone.tss).toBeUndefined();
});
