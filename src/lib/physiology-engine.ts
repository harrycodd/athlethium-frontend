import { format, subDays } from 'date-fns';
import { UserProfile, updateUserProfile } from './user-service';
import { Workout } from './workout-service';

/**
 * Banister EWMA Physiology Engine for Training Load (Fitness / Fatigue / Form)
 * and Automated Threshold (FTP / Pace) detection.
 */

export interface DailyLoadPoint {
  date: string;
  label: string;
  metrics: Record<string, number | null> & {
    ctl: number;
    atl: number;
    form: number;
    sleep: number | null;
    physical: number | null;
    mental: number | null;
    weight: number | null;
    injury: number | null;
    illness: number | null;
    dailyTss: number;
  };
}

/**
 * Calculates rolling CTL (Fitness), ATL (Fatigue), and Form (TSB = CTL - ATL)
 * across the requested lookback window using completed workouts and subjective metrics.
 */
export function calculateTrainingLoadTimeline(
  profile: UserProfile | null,
  workouts: Workout[],
  daysToLookBack: number = 14
): DailyLoadPoint[] {
  const today = new Date();
  const isImperial = profile?.units === 'Imperial';

  // Group completed workout TSS by date (YYYY-MM-DD)
  const dailyTssMap: Record<string, number> = {};
  workouts.forEach((w) => {
    const isCompleted = w.completed || w.status === 'completed';
    if (!isCompleted || !w.date) return;

    const sport = (w.sport || '').toLowerCase();
    const isStrengthOrMobility = ['strength', 'stretching', 'yoga', 'rest'].includes(sport);
    const tss = isStrengthOrMobility ? 0 : Number(w.tss ?? w.actual_tss ?? w.plannedTss ?? 0);

    dailyTssMap[w.date] = (dailyTssMap[w.date] || 0) + (isNaN(tss) ? 0 : tss);
  });

  // Warm up EWMA over 42 days prior to the start of the visible window
  const warmupDays = 42;
  const totalDaysToProcess = daysToLookBack + warmupDays;

  // Initialize from user's configured baseline CTL
  const baselineCtl = profile?.ctl && profile.ctl > 0 ? profile.ctl : 35;
  const baselineAtl = profile?.atl && profile.atl > 0 ? profile.atl : Math.round(baselineCtl * 0.9);

  let currentCtl = baselineCtl;
  let currentAtl = baselineAtl;

  const allComputedDays: DailyLoadPoint[] = [];

  for (let i = totalDaysToProcess - 1; i >= 0; i--) {
    const targetDate = subDays(today, i);
    const dateKey = format(targetDate, 'yyyy-MM-dd');
    const dayMetrics = profile?.dailyMetricsHistory?.[dateKey] || {};

    const dailyTss = dailyTssMap[dateKey] ?? 0;

    // Banister impulse-response model
    currentCtl = currentCtl + (dailyTss - currentCtl) / 42;
    currentAtl = currentAtl + (dailyTss - currentAtl) / 7;
    const currentForm = currentCtl - currentAtl;

    let weightVal = dayMetrics.weight ? parseFloat(dayMetrics.weight) : null;
    if (weightVal !== null && isImperial) {
      weightVal *= 2.20462;
    }

    allComputedDays.push({
      date: dateKey,
      label: String(i + 1),
      metrics: {
        ctl: Math.round(currentCtl * 10) / 10,
        atl: Math.round(currentAtl * 10) / 10,
        form: Math.round(currentForm * 10) / 10,
        sleep: dayMetrics.sleep || null,
        physical: dayMetrics.physicallyFeeling || null,
        mental: dayMetrics.mentallyFeeling || null,
        weight: weightVal,
        injury: dayMetrics.injury && dayMetrics.injury !== 'None' ? 1 : dayMetrics.injury === 'None' ? 0 : null,
        illness: dayMetrics.illness && dayMetrics.illness !== 'None' ? 1 : dayMetrics.illness === 'None' ? 0 : null,
        dailyTss,
      },
    });
  }

  // Return only the visible lookback slice
  return allComputedDays.slice(-daysToLookBack);
}

/**
 * Calculates TSS for uploaded workouts (FIT files / sensor logs) using athlete profile settings.
 */
export function calculateUploadedWorkoutTss(
  sport: string,
  durationSecs: number,
  stats: any,
  profile: UserProfile | null
): number {
  const sportKey = (sport || '').toLowerCase();
  if (['strength', 'stretching', 'yoga', 'rest'].includes(sportKey)) {
    return 0;
  }

  const hours = Math.max(0.01, durationSecs / 3600);

  // Cycling: NP / FTP
  if (sportKey === 'cycling') {
    const ftp = profile?.ftpCycling || profile?.ftp || 200;
    const power = stats?.normalizedPower || stats?.normalized_power || (stats?.avgPower || stats?.avg_power ? (stats.avgPower || stats.avg_power) * 1.05 : 0);

    if (power > 0 && ftp > 0) {
      const intensityFactor = power / ftp;
      return Math.round(hours * Math.pow(intensityFactor, 2) * 100);
    }
  }

  // Running: Pace vs Threshold Pace
  if (sportKey === 'running') {
    const thresholdPaceSecKm = profile?.ftpPaceRunning || 285; // default ~4:45/km
    const avgPaceSecKm = stats?.averagePaceSecKm || stats?.avgPaceSecKm;

    if (avgPaceSecKm && avgPaceSecKm > 0) {
      const speedThreshold = 1000 / thresholdPaceSecKm;
      const speedActual = 1000 / avgPaceSecKm;
      const intensityFactor = speedActual / speedThreshold;
      return Math.round(hours * Math.pow(intensityFactor, 2) * 100);
    }
  }

  // Heart Rate fallback for all endurance sports
  const fthr = profile?.fthr || 170;
  const avgHr = stats?.avgHeartRate || stats?.avg_heart_rate || stats?.heartRate;
  if (avgHr && avgHr > 0 && fthr > 0) {
    const hrIntensityFactor = avgHr / fthr;
    return Math.round(hours * Math.pow(hrIntensityFactor, 2) * 100);
  }

  // Default moderate endurance intensity (IF ~0.75 -> 56 TSS/hour)
  return Math.round(hours * 55);
}

/**
 * Calculates TSS for workouts recorded live in the app workout player.
 * Multiplies planned TSS by the completion percentage.
 */
export function calculateInAppRecordedTss(
  workout: Workout | null,
  totalTimeElapsed: number,
  completedStepsCount: number,
  totalStepsCount: number
): number {
  const sportKey = (workout?.sport || '').toLowerCase();
  if (['strength', 'stretching', 'yoga', 'rest'].includes(sportKey)) {
    return 0;
  }

  const plannedTss = workout?.plannedTss ?? workout?.tss ?? 50;
  const plannedTime = workout?.plannedTime || workout?.time || totalTimeElapsed || 3600;

  // Fraction completed based on steps and duration
  const stepsRatio = totalStepsCount > 0 ? (completedStepsCount / totalStepsCount) : 1;
  const timeRatio = plannedTime > 0 ? (totalTimeElapsed / plannedTime) : stepsRatio;
  const pctComplete = Math.min(1.0, Math.max(0.1, (stepsRatio + timeRatio) / 2));

  return Math.max(1, Math.round(plannedTss * pctComplete));
}

/**
 * Checks completed workout stats for breakthrough threshold efforts (FTP / Threshold Pace)
 * and automatically updates the athlete's profile settings.
 */
export async function checkAndAutoUpdateFtp(
  profile: UserProfile | null,
  workout: Workout | null,
  stats: any
): Promise<{ updated: boolean; message?: string; newFtp?: number; oldFtp?: number }> {
  if (!profile || !profile.uid || !workout) return { updated: false };

  const sportKey = (workout.sport || '').toLowerCase();

  // 1. Cycling FTP Breakthrough Detection
  if (sportKey === 'cycling') {
    const currentFtp = profile.ftpCycling || profile.ftp || 200;
    const peak20mPower = stats?.peak20mPower || stats?.peak_20m_power || (stats?.avgPower && stats.totalTime >= 1200 ? stats.avgPower : 0);

    if (peak20mPower && peak20mPower > 0) {
      const estimatedFtp = Math.round(peak20mPower * 0.95);
      if (estimatedFtp > currentFtp + 1) {
        await updateUserProfile(profile.uid, {
          ftpCycling: estimatedFtp,
          ftp: estimatedFtp,
        });
        return {
          updated: true,
          message: `New FTP Breakthrough! Updated cycling FTP from ${currentFtp}W to ${estimatedFtp}W.`,
          oldFtp: currentFtp,
          newFtp: estimatedFtp,
        };
      }
    }
  }

  // 2. Running Threshold Pace Breakthrough Detection
  if (sportKey === 'running') {
    const currentThresholdPace = profile.ftpPaceRunning || 285; // sec/km
    const avgPace = stats?.averagePaceSecKm || stats?.avgPaceSecKm;
    const totalTime = stats?.totalTime || stats?.duration || 0;

    // Sustained 20-min+ tempo or 5K benchmark effort
    if (avgPace && avgPace > 0 && totalTime >= 1200) {
      const estimatedThresholdPace = Math.round(avgPace * 1.03);
      // Faster threshold pace (lower seconds per km)
      if (estimatedThresholdPace < currentThresholdPace - 2) {
        await updateUserProfile(profile.uid, {
          ftpPaceRunning: estimatedThresholdPace,
        });
        return {
          updated: true,
          message: `New Threshold Pace Breakthrough! Updated running threshold pace to ${Math.floor(estimatedThresholdPace / 60)}:${String(Math.round(estimatedThresholdPace % 60)).padStart(2, '0')}/km.`,
        };
      }
    }
  }

  return { updated: false };
}
