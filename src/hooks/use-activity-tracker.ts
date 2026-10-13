import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Session, SessionSegment, WorkoutStep } from '@/types/activity';
import { Workout } from '@/lib/workout-service';
import { UserProfile } from '@/lib/user-service';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

/** Translates an `activity` key (the hook passes its own `t` so labels follow the current language). */
type Translate = (key: string, options?: Record<string, unknown>) => string;

// Step type codes come from the backend; only their display labels are translated.
const STEP_TYPE_LABEL_KEYS: Record<string, string> = {
  warmup: 'stepTypes.warmup',
  interval: 'stepTypes.interval',
  recovery: 'stepTypes.recovery',
  cooldown: 'stepTypes.cooldown',
  tempo: 'stepTypes.tempo',
  endurance: 'stepTypes.endurance',
  exercise: 'stepTypes.exercise',
  work: 'stepTypes.work',
  sprint: 'stepTypes.sprint',
  rest: 'stepTypes.rest',
  threshold: 'stepTypes.threshold',
  strength: 'stepTypes.strength',
  stretching: 'stepTypes.stretching',
  mobility: 'stepTypes.mobility',
};

/** Display label for a step type code, e.g. 'warmup' -> "Warmup" (unknown codes are capitalised as-is). */
export function stepTypeLabel(t: Translate, type: string): string {
  const key = STEP_TYPE_LABEL_KEYS[(type || '').toLowerCase()];
  return key ? t(key) : type.charAt(0).toUpperCase() + type.slice(1);
}

export interface PlayableStep {
  id: string;
  index: number;
  totalSteps: number;
  name: string;
  type: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'tempo' | 'endurance' | 'exercise' | 'work' | string;
  duration: number; // In seconds (0 if untimed/open)
  targetType: 'power' | 'heart_rate' | 'pace' | 'reps' | 'time' | 'none';
  targetLabel: string;
  targetValue: string;
  targetSubtext: string;
  targetUnit?: string;
  color: string;
  notes?: string;
  description?: string;
  assetName?: string;
}

const formatPaceFromSeconds = (secondsPerUnit: number) => {
  if (!secondsPerUnit || secondsPerUnit <= 0 || !isFinite(secondsPerUnit)) return '--:--';
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.round(secondsPerUnit % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getStepColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'warmup':
      return '#0ea5e9'; // Sky blue
    case 'interval':
    case 'work':
    case 'sprint':
      return '#ef4444'; // Red
    case 'recovery':
    case 'rest':
      return '#22c55e'; // Emerald
    case 'cooldown':
      return '#64748b'; // Slate
    case 'tempo':
    case 'threshold':
      return '#f97316'; // Orange
    case 'endurance':
      return '#06b6d4'; // Cyan
    case 'exercise':
    case 'strength':
      return '#eab308'; // Amber
    case 'stretching':
    case 'mobility':
      return '#ec4899'; // Pink
    default:
      return '#22c55e';
  }
};

export function normalizeWorkoutSteps(
  workout: (Workout & Session) | null,
  profile?: UserProfile | null,
  t: Translate = i18n.getFixedT(null, 'activity') as Translate
): PlayableStep[] {
  if (!workout) return [];

  const isImperial = profile?.units === 'Imperial';
  const cyclingFtp = profile?.ftpCycling ?? profile?.ftp ?? 200;
  const runningFtp = profile?.ftpRunning ?? 250;
  const runningThresholdPace = profile?.ftpPaceRunning ?? 285; // sec/km (4:45/km default)
  const swimCssPace = profile?.ftpPaceSwimming ?? 105; // sec/100m (1:45 default)
  const fthr = profile?.fthr ?? 170;
  const maxHr = profile?.maxHr ?? 190;
  const weightKg = profile?.weight ? parseFloat(String(profile.weight)) : 70;
  const sport = workout.sport?.toLowerCase() || 'cycling';

  // 1. If workout has structured `steps`
  if (workout.steps && workout.steps.length > 0) {
    const totalSteps = workout.steps.length;

    return workout.steps.map((step, index) => {
      const type = step.type || 'interval';
      const duration = Number(step.duration) || 0;
      const color = getStepColor(type);
      let targetLabel = t('targets.intensityLabel');
      let targetValue = t('targets.steadyEffort');
      let targetSubtext = t('targets.zone2Aerobic');
      let targetType: PlayableStep['targetType'] = 'none';

      // Power based (cycling or running power)
      if (sport === 'cycling' || (sport === 'running' && step.targetType === 'power')) {
        targetType = 'power';
        targetLabel = t('targets.powerLabel');
        const ftp = sport === 'cycling' ? cyclingFtp : runningFtp;

        if (step.target_low && step.target_high) {
          if (step.target_high <= 200) {
            // Percent of FTP
            const lowW = Math.round(ftp * (step.target_low / 100));
            const highW = Math.round(ftp * (step.target_high / 100));
            targetValue = `${lowW} - ${highW} W`;
            const lowWkg = (lowW / weightKg).toFixed(1);
            const highWkg = (highW / weightKg).toFixed(1);
            targetSubtext = `${step.target_low}-${step.target_high}% FTP · ${lowWkg}-${highWkg} W/kg`;
          } else {
            // Absolute watts
            const lowW = Math.round(step.target_low);
            const highW = Math.round(step.target_high);
            targetValue = `${lowW} - ${highW} W`;
            targetSubtext = `${Math.round((lowW / ftp) * 100)}-${Math.round((highW / ftp) * 100)}% FTP`;
          }
        } else if (step.target_low) {
          const lowW = step.target_low <= 200 ? Math.round(ftp * (step.target_low / 100)) : Math.round(step.target_low);
          targetValue = `>${lowW} W`;
          targetSubtext = `>${Math.round((lowW / ftp) * 100)}% FTP`;
        } else {
          // Estimate from step type
          if (type === 'warmup') {
            const lowW = Math.round(ftp * 0.50);
            const highW = Math.round(ftp * 0.65);
            targetValue = `${lowW} - ${highW} W`;
            targetSubtext = t('targets.warmupZone');
          } else if (type === 'interval') {
            const lowW = Math.round(ftp * 0.95);
            const highW = Math.round(ftp * 1.05);
            targetValue = `${lowW} - ${highW} W`;
            targetSubtext = t('targets.thresholdZone');
          } else if (type === 'recovery') {
            const lowW = Math.round(ftp * 0.45);
            const highW = Math.round(ftp * 0.55);
            targetValue = `${lowW} - ${highW} W`;
            targetSubtext = t('targets.activeRecovery');
          } else if (type === 'cooldown') {
            const lowW = Math.round(ftp * 0.45);
            const highW = Math.round(ftp * 0.60);
            targetValue = `${lowW} - ${highW} W`;
            targetSubtext = t('targets.cooldownZone');
          } else {
            const lowW = Math.round(ftp * 0.65);
            const highW = Math.round(ftp * 0.75);
            targetValue = `${lowW} - ${highW} W`;
            targetSubtext = t('targets.enduranceZone');
          }
        }
      }
      // Running Pace
      else if (sport === 'running') {
        targetType = 'pace';
        targetLabel = t('targets.paceLabel');
        const unitLabel = isImperial ? 'mi' : 'km';
        const factor = isImperial ? 1.60934 : 1.0;

        if (type === 'interval') {
          const lowSec = Math.round(runningThresholdPace * 0.95 * factor);
          const highSec = Math.round(runningThresholdPace * 1.02 * factor);
          targetValue = `${formatPaceFromSeconds(lowSec)} - ${formatPaceFromSeconds(highSec)} /${unitLabel}`;
          targetSubtext = t('targets.racePace');
        } else if (type === 'warmup' || type === 'recovery' || type === 'cooldown') {
          const lowSec = Math.round(runningThresholdPace * 1.20 * factor);
          const highSec = Math.round(runningThresholdPace * 1.35 * factor);
          targetValue = `${formatPaceFromSeconds(lowSec)} - ${formatPaceFromSeconds(highSec)} /${unitLabel}`;
          targetSubtext = t('targets.easyAerobicPace');
        } else {
          const lowSec = Math.round(runningThresholdPace * 1.08 * factor);
          const highSec = Math.round(runningThresholdPace * 1.18 * factor);
          targetValue = `${formatPaceFromSeconds(lowSec)} - ${formatPaceFromSeconds(highSec)} /${unitLabel}`;
          targetSubtext = t('targets.steadyEndurancePace');
        }
      }
      // Swimming Pace
      else if (sport === 'swimming') {
        targetType = 'pace';
        targetLabel = t('targets.cssPaceLabel');
        const unitLabel = isImperial ? '100yd' : '100m';

        if (type === 'interval') {
          const lowSec = Math.round(swimCssPace * 0.95);
          const highSec = Math.round(swimCssPace * 1.02);
          targetValue = `${formatPaceFromSeconds(lowSec)} - ${formatPaceFromSeconds(highSec)} /${unitLabel}`;
          targetSubtext = t('targets.criticalSwimSpeed');
        } else {
          const lowSec = Math.round(swimCssPace * 1.10);
          const highSec = Math.round(swimCssPace * 1.25);
          targetValue = `${formatPaceFromSeconds(lowSec)} - ${formatPaceFromSeconds(highSec)} /${unitLabel}`;
          targetSubtext = t('targets.aerobicRecoveryPace');
        }
      }
      // Strength / Reps
      else if (sport === 'strength' || step.reps || step.sets) {
        targetType = 'reps';
        targetLabel = t('targets.repsLabel');
        if (step.sets && step.reps) {
          targetValue = t('targets.setsReps', { sets: step.sets, reps: step.reps });
        } else if (step.reps) {
          targetValue = t('targets.reps', { reps: step.reps });
        } else {
          targetValue = t('targets.qualityReps');
        }
        targetSubtext = t('targets.eccentricForm');
      }
      // Heart Rate fallback
      else if (step.targetType === 'heart_rate' || fthr > 0) {
        targetType = 'heart_rate';
        targetLabel = t('targets.heartRateLabel');
        if (step.target_low && step.target_high) {
          const lowBpm = step.target_high <= 150 ? Math.round(fthr * (step.target_low / 100)) : Math.round(step.target_low);
          const highBpm = step.target_high <= 150 ? Math.round(fthr * (step.target_high / 100)) : Math.round(step.target_high);
          targetValue = `${lowBpm} - ${highBpm} bpm`;
          targetSubtext = t('targets.hrZone');
        } else {
          targetValue = `${Math.round(fthr * 0.85)} - ${Math.round(fthr * 0.95)} bpm`;
          targetSubtext = t('targets.thresholdHr');
        }
      }

      const defaultName = t('defaultStepName', { type: stepTypeLabel(t, type) });

      return {
        id: `step-${index}`,
        index,
        totalSteps,
        name: step.name || defaultName,
        type,
        duration,
        targetType,
        targetLabel,
        targetValue,
        targetSubtext,
        notes: step.notes,
        description: step.notes,
        color,
      };
    });
  }

  // 2. If workout has legacy `segments`
  if (workout.segments && workout.segments.length > 0) {
    const totalSteps = workout.segments.length;

    return workout.segments.map((seg, index) => {
      const duration = Number(seg.duration) || 0;
      const color = '#22c55e';

      return {
        id: `segment-${index}`,
        index,
        totalSteps,
        name: seg.title || t('defaultSegmentName', { number: index + 1 }),
        type: 'work',
        duration,
        targetType: 'time',
        targetLabel: t('targets.sessionLabel'),
        targetValue: seg.title || t('targets.executeSegment'),
        targetSubtext: t('targets.followGuidance'),
        notes: seg.description,
        description: seg.description,
        assetName: seg.assetName,
        color,
      };
    });
  }

  // 3. Fallback: single full workout step
  const totalDuration = Number(workout.plannedTime || workout.time || 3600);
  return [
    {
      id: 'step-0',
      index: 0,
      totalSteps: 1,
      name: workout.name || t('defaultWorkoutName'),
      type: 'work',
      duration: totalDuration,
      targetType: sport === 'cycling' ? 'power' : 'pace',
      targetLabel: sport === 'cycling' ? t('targets.powerLabel') : t('targets.paceLabel'),
      targetValue: sport === 'cycling' ? `${Math.round(cyclingFtp * 0.75)} W` : `${formatPaceFromSeconds(runningThresholdPace * 1.15)} /km`,
      targetSubtext: t('targets.zone2AerobicEndurance'),
      description: workout.description,
      color: '#22c55e',
    },
  ];
}

export function useActivityTracker(
  workout: (Workout & Session) | null,
  profile?: UserProfile | null
) {
  const { t } = useTranslation('activity');
  // `t` changes with the language, so step labels are rebuilt when it changes.
  const steps = useMemo(() => normalizeWorkoutSteps(workout, profile, t), [workout, profile, t]);

  const [hasStarted, setHasStarted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timerMode, setTimerMode] = useState<'countdown' | 'countup'>('countdown');

  // Step Timers
  const [stepTimeRemaining, setStepTimeRemaining] = useState<number | null>(null);
  const [stepTimeElapsed, setStepTimeElapsed] = useState(0);

  // Total Workout Timers
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);

  const currentStep = steps[currentStepIndex] || null;
  const nextStep = steps[currentStepIndex + 1] || null;
  const previousStep = steps[currentStepIndex - 1] || null;

  const totalPlannedTime = useMemo(() => {
    return steps.reduce((sum, s) => sum + (s.duration || 0), 0);
  }, [steps]);

  // Initialize timers when step index changes or workout loads
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.duration > 0) {
      setStepTimeRemaining(currentStep.duration);
    } else {
      setStepTimeRemaining(null);
    }
    setStepTimeElapsed(0);
  }, [currentStepIndex, currentStep?.duration]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
    }
  }, [currentStepIndex, steps.length]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStepIndex(index);
      }
    },
    [steps.length]
  );

  // Total Elapsed Time loop: continuously climbs once started (even while paused)
  useEffect(() => {
    if (!hasStarted) return;

    const totalInterval = setInterval(() => {
      setTotalTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(totalInterval);
  }, [hasStarted]);

  // Active Step timer loop: ONLY increments/decrements while actively playing
  useEffect(() => {
    if (!isActive) return;

    const stepInterval = setInterval(() => {
      setStepTimeElapsed((prev) => prev + 1);

      if (stepTimeRemaining !== null) {
        setStepTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(stepInterval);
  }, [isActive, stepTimeRemaining !== null]);

  // Handle auto-progression on timer zero
  useEffect(() => {
    if (isActive && stepTimeRemaining === 0) {
      handleNextStep();
    }
  }, [stepTimeRemaining, isActive, handleNextStep]);

  const toggleActive = useCallback(() => {
    setIsActive((prev) => {
      const next = !prev;
      if (next) {
        setHasStarted(true);
      }
      return next;
    });
  }, []);

  const toggleTimerMode = useCallback(() => {
    setTimerMode((prev) => (prev === 'countdown' ? 'countup' : 'countdown'));
  }, []);

  const reset = useCallback(() => {
    setHasStarted(false);
    setIsActive(false);
    setCurrentStepIndex(0);
    setTotalTimeElapsed(0);
    setStepTimeElapsed(0);
    if (steps[0]?.duration) {
      setStepTimeRemaining(steps[0].duration);
    }
  }, [steps]);

  const isPreviewVisible =
    stepTimeRemaining !== null && stepTimeRemaining <= 20 && stepTimeRemaining > 0 && nextStep !== null;

  // Step Progress Calculation (0.0 to 1.0)
  const stepProgress = useMemo(() => {
    if (!currentStep || currentStep.duration <= 0) return 0;
    return Math.min(1, Math.max(0, stepTimeElapsed / currentStep.duration));
  }, [currentStep, stepTimeElapsed]);

  // Overall Workout Progress Calculation (0.0 to 1.0)
  const totalProgress = useMemo(() => {
    if (totalPlannedTime <= 0) return 0;
    return Math.min(1, Math.max(0, totalTimeElapsed / totalPlannedTime));
  }, [totalPlannedTime, totalTimeElapsed]);

  const totalTimeRemaining = useMemo(() => {
    if (totalPlannedTime <= 0) return null;
    return Math.max(0, totalPlannedTime - totalTimeElapsed);
  }, [totalPlannedTime, totalTimeElapsed]);

  const finishWorkout = useCallback(() => {
    setIsActive(false);
    setHasStarted(false);
    const stats = {
      totalTime: totalTimeElapsed,
      stepsCompleted: currentStepIndex + 1,
      totalSteps: steps.length,
      completedAt: new Date(),
    };
    return stats;
  }, [totalTimeElapsed, currentStepIndex, steps.length]);

  return {
    hasStarted,
    isActive,
    timerMode,
    steps,
    currentStepIndex,
    currentStep,
    nextStep,
    previousStep,
    stepTimeRemaining,
    stepTimeElapsed,
    stepProgress,
    totalTimeElapsed,
    totalPlannedTime,
    totalTimeRemaining,
    totalProgress,
    isPreviewVisible,
    toggleActive,
    toggleTimerMode,
    goToNextStep: handleNextStep,
    goToPreviousStep: handlePreviousStep,
    goToStep,
    finishWorkout,
    reset,
    isComplete:
      steps.length > 0 && currentStepIndex === steps.length - 1 && stepTimeRemaining === 0,

    // Legacy backwards-compatibility aliases
    currentSegment: currentStep ? { title: currentStep.name, description: currentStep.notes || '', assetName: currentStep.assetName } : null,
    nextSegment: nextStep ? { title: nextStep.name, description: nextStep.notes || '' } : null,
    timeRemaining: stepTimeRemaining,
    timeElapsed: stepTimeElapsed,
    goToNextSegment: handleNextStep,
  };
}
