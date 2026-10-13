import { cleanSets, displayToKg, initialSets, kgToDisplay, setTotals, summaryStats } from '@/lib/session-stats';
import type { Workout } from '@/lib/workout-service';
import i18n from '@/lib/i18n';

const base = { userId: 'u', name: 'x', description: '', date: '2026-10-12', completed: true, status: 'completed' } as const;
// tiles carry translation keys; check them as an English-speaking user sees them
const english = (w: Partial<Workout>, imperial: boolean) =>
  summaryStats({ ...base, sport: 'cycling', ...w } as Workout, imperial)
    .map(({ labelKey, ...rest }) => ({ label: i18n.t(labelKey, { ns: 'session' }), ...rest }));
const labels = (w: Partial<Workout>, imperial = false) => english(w, imperial).map((t) => t.label);
const value = (w: Partial<Workout>, label: string, imperial = false) =>
  english(w, imperial).find((t) => t.label === label);

const RIDE = { duration_seconds: 3600, distance_m: 30000, avg_speed_ms: 8.33, elevation_m: 400, avg_power: 210,
  normalized_power: 225, avg_heart_rate: 140, max_heart_rate: 171, avg_cadence: 88, calories: 900 };

describe('summaryStats shows only what suits the sport', () => {
  it('ride: distance, speed, power, elevation, cadence, HR, TSS', () => {
    expect(labels({ sport: 'cycling', stats: RIDE, actual_tss: 72 })).toEqual([
      'Duration', 'Distance', 'Avg Speed', 'Avg Power', 'Norm. Power', 'Elevation', 'Cadence', 'Avg HR', 'Max HR',
      'Calories', 'TSS']);
    expect(value({ stats: RIDE }, 'Avg Speed')).toEqual({ label: 'Avg Speed', value: '30.0', unit: 'km/h' });
    expect(value({ stats: RIDE }, 'Distance', true)).toEqual({ label: 'Distance', value: '18.64', unit: 'mi' });
  });

  it('run: pace instead of speed, steps per minute, no normalised power', () => {
    const run = { duration_seconds: 3000, distance_m: 10000, avg_speed_ms: 10000 / 3000, avg_cadence: 85 };
    expect(value({ sport: 'running', stats: run }, 'Avg Pace')).toEqual({ label: 'Avg Pace', value: '5:00', unit: '/km' });
    expect(value({ sport: 'running', stats: run }, 'Cadence')).toEqual({ label: 'Cadence', value: '170', unit: 'spm' });
    expect(labels({ sport: 'running', stats: { ...run, normalized_power: 300 } })).not.toContain('Norm. Power');
  });

  it('swim: metres and pace per 100 m', () => {
    const swim = { sport: 'swimming', stats: { duration_seconds: 1800, distance_m: 1500 } };
    expect(value(swim, 'Distance')).toEqual({ label: 'Distance', value: '1500', unit: 'm' });
    expect(value(swim, 'Pace')).toEqual({ label: 'Pace', value: '2:00', unit: '/100m' });
    expect(value(swim, 'Pace', true)?.unit).toBe('/100yd');
  });

  it('strength: sets, reps and volume; never distance or speed', () => {
    const gym = { sport: 'strength', stats: { duration_seconds: 2400, avg_heart_rate: 118, distance: 1200 },
      logged_sets: [{ exercise: 'Squat', reps: 5, weight_kg: 100 }, { exercise: 'Squat', reps: 5, weight_kg: 100 }] };
    expect(labels(gym)).toEqual(['Duration', 'Sets', 'Reps', 'Volume', 'Avg HR']);
    expect(value(gym, 'Volume')).toEqual({ label: 'Volume', value: '1000', unit: 'kg' });
    expect(value(gym, 'Volume', true)?.unit).toBe('lb');
  });

  it('mobility: just duration', () => {
    expect(labels({ sport: 'stretching', time: 1200 })).toEqual(['Duration']);
  });

  it('hides unrecorded values and reads the older distance field', () => {
    expect(labels({ stats: { distance: 5000, avg_power: 0 } })).toEqual(['Distance']);
    expect(labels({ stats: { duration_seconds: 600, distance_m: 5000 } })).toContain('Avg Speed'); // derived
  });
});

describe('strength log helpers', () => {
  const planned = {
    ...base, sport: 'strength',
    steps: [
      { type: 'warmup', duration: 300, name: 'Warm-up' },
      { type: 'exercise', duration: 400, name: 'A. Barbell Back Squat', sets: 3, reps: 5 },
      { type: 'exercise', duration: 200, name: 'D1. Front Plank', sets: 2 },
      { type: 'exercise', duration: 100 },
    ],
  } as Workout;

  it('starts from the planned exercises', () => {
    expect(initialSets(planned)).toEqual([
      { exercise: 'Barbell Back Squat', reps: 5 }, { exercise: 'Barbell Back Squat', reps: 5 },
      { exercise: 'Barbell Back Squat', reps: 5 }, { exercise: 'Front Plank' }, { exercise: 'Front Plank' },
    ]);
  });

  it('prefers what was already logged or imported', () => {
    const logged = [{ exercise: 'Deadlift', reps: 5, weight_kg: 120 }];
    expect(initialSets({ ...planned, logged_sets: logged })).toEqual(logged);
    expect(initialSets({ ...base, sport: 'strength' } as Workout)).toEqual([]);
  });

  it('totals, cleaning and unit conversion', () => {
    expect(setTotals([{ exercise: 'A', reps: 5, weight_kg: 60 }, { exercise: 'B' }])).toEqual({ sets: 2, reps: 5, volumeKg: 300 });
    expect(cleanSets([{ exercise: '  Row ', reps: 8.4, weight_kg: 40.04, duration_sec: 0 }, { exercise: ' ' }]))
      .toEqual([{ exercise: 'Row', reps: 8, weight_kg: 40 }]);
    expect(displayToKg('100', true)).toBe(45.4);
    expect(displayToKg('62,5', false)).toBe(62.5);
    expect(displayToKg('', false)).toBeUndefined();
    expect(kgToDisplay(45.4, true)).toBe('100.1');
    expect(kgToDisplay(undefined, false)).toBe('');
  });
});
