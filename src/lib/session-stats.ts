/**
 * What to show for a completed session, by sport, and the strength-set log helpers.
 * The backend stores only the stats that suit each sport (see activity_stats.py); these helpers
 * format them and hide anything that wasn't recorded.
 */
import type { Workout } from './workout-service';

export interface LoggedSet {
  exercise: string;
  reps?: number;
  weight_kg?: number;
  duration_sec?: number;
}

export interface StatTile {
  label: string;
  value: string;
  unit?: string;
}

const KG_PER_LB = 0.45359237;

const formatDuration = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

const formatPace = (secsPerUnit: number) => `${Math.floor(secsPerUnit / 60)}:${String(Math.round(secsPerUnit % 60)).padStart(2, '0')}`;

const positive = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

/** The stat tiles for a completed session: only what means something for its sport and was recorded. */
export function summaryStats(workout: Workout, imperial = false): StatTile[] {
  const stats: Record<string, any> = workout.stats || {};
  const sport = (workout.sport || '').toLowerCase();
  const tiles: StatTile[] = [];
  const add = (label: string, value: number | undefined, fmt: (v: number) => string, unit?: string) => {
    if (value !== undefined) tiles.push({ label, value: fmt(value), unit });
  };

  const duration = positive(stats.duration_seconds) ?? positive(workout.actual_time) ?? positive(workout.time);
  // distance_m is what the backend writes; `distance` (metres) is the older field
  const distance = positive(stats.distance_m) ?? positive(stats.distance);
  const speed = positive(stats.avg_speed_ms) ?? (distance && duration ? distance / duration : undefined);
  const tss = positive(workout.actual_tss) ?? positive(workout.tss);

  add('Duration', duration, formatDuration);

  if (sport === 'cycling' || sport === 'running') {
    add('Distance', distance, (m) => (imperial ? m / 1609.34 : m / 1000).toFixed(2), imperial ? 'mi' : 'km');
    if (sport === 'cycling') {
      add('Avg Speed', speed, (ms) => (ms * (imperial ? 2.23694 : 3.6)).toFixed(1), imperial ? 'mph' : 'km/h');
    } else {
      add('Avg Pace', speed, (ms) => formatPace((imperial ? 1609.34 : 1000) / ms), imperial ? '/mi' : '/km');
    }
    add('Avg Power', positive(stats.avg_power), (w) => w.toFixed(0), 'W');
    if (sport === 'cycling') add('Norm. Power', positive(stats.normalized_power), (w) => w.toFixed(0), 'W');
    add('Elevation', positive(stats.elevation_m), (m) => (imperial ? m * 3.28084 : m).toFixed(0), imperial ? 'ft' : 'm');
    // running cadence is recorded per leg; show steps per minute
    add('Cadence', positive(stats.avg_cadence), (c) => (sport === 'running' ? c * 2 : c).toFixed(0), sport === 'running' ? 'spm' : 'rpm');
  } else if (sport === 'swimming') {
    add('Distance', distance, (m) => (imperial ? m * 1.09361 : m).toFixed(0), imperial ? 'yd' : 'm');
    add('Pace', distance && duration ? duration / (distance / (imperial ? 91.44 : 100)) : undefined, formatPace,
      imperial ? '/100yd' : '/100m');
  } else if (sport === 'strength') {
    const totals = setTotals(workout.logged_sets || []);
    add('Sets', positive(totals.sets), (v) => String(v));
    add('Reps', positive(totals.reps), (v) => String(v));
    add('Volume', positive(totals.volumeKg), (kg) => (imperial ? kg / KG_PER_LB : kg).toFixed(0), imperial ? 'lb' : 'kg');
  }

  add('Avg HR', positive(stats.avg_heart_rate), (v) => v.toFixed(0), 'bpm');
  add('Max HR', positive(stats.max_heart_rate), (v) => v.toFixed(0), 'bpm');
  add('Calories', positive(stats.calories), (v) => v.toFixed(0), 'kcal');
  if (sport === 'cycling' || sport === 'running' || sport === 'swimming') add('TSS', tss, (v) => v.toFixed(0));
  return tiles;
}

/** Strength log rows to start from: what was logged (or imported), else the planned exercises. */
export function initialSets(workout: Workout): LoggedSet[] {
  if (workout.logged_sets && workout.logged_sets.length > 0) return workout.logged_sets.map((s) => ({ ...s }));
  const out: LoggedSet[] = [];
  for (const step of workout.steps || []) {
    if (step.type !== 'exercise' || !step.name) continue;
    const exercise = step.name.replace(/^[A-Z]\d?\.\s*/, ''); // "B1. Pull-Up" -> "Pull-Up"
    for (let i = 0; i < Math.max(1, step.sets || 1); i += 1) {
      out.push(step.reps ? { exercise, reps: step.reps } : { exercise });
    }
  }
  return out;
}

export function setTotals(sets: LoggedSet[]) {
  return {
    sets: sets.length,
    reps: sets.reduce((sum, s) => sum + (s.reps || 0), 0),
    volumeKg: Math.round(sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight_kg || 0), 0)),
  };
}

/** Sets with blank or invalid numbers removed, ready to save. */
export function cleanSets(sets: LoggedSet[]): LoggedSet[] {
  return sets
    .filter((s) => s.exercise.trim().length > 0)
    .map((s) => {
      const out: LoggedSet = { exercise: s.exercise.trim() };
      if (positive(s.reps)) out.reps = Math.round(s.reps!);
      if (positive(s.weight_kg)) out.weight_kg = Math.round(s.weight_kg! * 10) / 10;
      if (positive(s.duration_sec)) out.duration_sec = Math.round(s.duration_sec!);
      return out;
    });
}

export const kgToDisplay = (kg: number | undefined, imperial: boolean) =>
  kg === undefined ? '' : String(Math.round((imperial ? kg / KG_PER_LB : kg) * 10) / 10);

export const displayToKg = (text: string, imperial: boolean): number | undefined => {
  const value = parseFloat(text.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round((imperial ? value * KG_PER_LB : value) * 10) / 10;
};
