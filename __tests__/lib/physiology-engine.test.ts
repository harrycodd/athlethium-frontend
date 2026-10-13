/** The Progress chart's training load: it must count what was actually done, not what was planned. */
import { format, subDays } from 'date-fns';
import { calculateTrainingLoadTimeline } from '@/lib/physiology-engine';

const day = (daysAgo: number) => format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
const profile = { ctl: 30, atl: 30 } as any;

it("counts a completed planned session's actual load, not its planned load", () => {
  const workouts = [
    // Planned at 42 TSS, actually ridden at 127.5 (as the backend stores a completed planned session).
    { date: day(1), sport: 'cycling', completed: true, status: 'completed', tss: 42.2, plannedTss: 42.2, actual_tss: 127.5 },
  ] as any;

  const timeline = calculateTrainingLoadTimeline(profile, workouts, 7);

  expect(timeline.find((d) => d.date === day(1))?.metrics.dailyTss).toBe(127.5);
});

it('falls back to tss for sessions without an actual load', () => {
  const workouts = [{ date: day(2), sport: 'swimming', completed: true, tss: 75 }] as any;
  const timeline = calculateTrainingLoadTimeline(profile, workouts, 7);
  expect(timeline.find((d) => d.date === day(2))?.metrics.dailyTss).toBe(75);
});

it('ignores planned sessions and strength work', () => {
  const workouts = [
    { date: day(1), sport: 'running', completed: false, status: 'planned', tss: 60 },
    { date: day(1), sport: 'strength', completed: true, actual_tss: 40 },
  ] as any;
  const timeline = calculateTrainingLoadTimeline(profile, workouts, 7);
  expect(timeline.find((d) => d.date === day(1))?.metrics.dailyTss).toBe(0);
});

it('training moves the fitness and fatigue lines', () => {
  const rest = calculateTrainingLoadTimeline(profile, [], 7);
  const trained = calculateTrainingLoadTimeline(
    profile,
    [{ date: day(3), sport: 'cycling', completed: true, actual_tss: 150 }] as any,
    7
  );

  const last = (t: typeof rest) => t[t.length - 1].metrics;
  expect(last(trained).atl).toBeGreaterThan(last(rest).atl as number);
  expect(last(trained).ctl).toBeGreaterThan(last(rest).ctl as number);
});
