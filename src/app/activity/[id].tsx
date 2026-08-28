import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Text from '@/components/ui/text';
import { GlassButton } from '@/components/ui/glass-button';
import { useActivityTracker } from '@/hooks/use-activity-tracker';
import { useLocationTracker } from '@/hooks/use-location-tracker';
import { getWorkout, updateWorkout, Workout } from '@/lib/workout-service';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { serverTimestamp } from 'firebase/firestore';

import { ActivityControls } from '@/components/activity/activity-controls';
import { ActivityHeader } from '@/components/activity/activity-header';
import { ActivitySegment } from '@/components/activity/activity-segment';
import { ActivityStats } from '@/components/activity/activity-stats';
import { ActivityTimer } from '@/components/activity/activity-timer';
import { NextUpOverlay } from '@/components/activity/next-up-overlay';

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { profile } = useAuth();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchWorkout = async () => {
      const data = await getWorkout(id);
      setWorkout(data);
      setLoading(false);
    };

    fetchWorkout();
  }, [id]);

  const tracker = useActivityTracker(workout as any, profile);
  const isGpsEnabled = workout?.sport === 'running' || workout?.sport === 'cycling';
  const location = useLocationTracker(isGpsEnabled, tracker.isActive);

  if (loading) {
    return (
      <ScreenWrapper scrollable={false} className="justify-center items-center" withTopInset={true}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenWrapper>
    );
  }

  if (!workout) {
    return (
      <ScreenWrapper scrollable={false} className="px-6 justify-center items-center" withTopInset={true}>
        <Text variant="h2" className="mb-4">Session not found</Text>
        <GlassButton label="Go Back" variant="glass" size="md" shape="pill" onPress={() => router.back()} />
      </ScreenWrapper>
    );
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatPace = (secondsPerKm: number) => {
    if (!secondsPerKm || secondsPerKm === Infinity || secondsPerKm <= 0) return '--:--';
    const isImperial = profile?.units === 'Imperial';
    const sec = isImperial ? secondsPerKm * 1.60934 : secondsPerKm;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const saveWorkoutResults = async () => {
    if (!id) return;

    const results = tracker.finishWorkout();
    try {
      await updateWorkout(id, {
        status: 'completed',
        completed: true,
        completedAt: serverTimestamp(),
        time: tracker.totalTimeElapsed,
        tss: (results as any)?.tss || workout.tss || 0,
        stats: {
          ...results,
          totalTime: tracker.totalTimeElapsed,
          distance: location.distance,
          averagePace: location.currentPace,
        },
      });
    } catch (error) {
      console.error('Failed to save workout stats:', error);
    }
  };

  const isLastStep = tracker.currentStepIndex >= tracker.steps.length - 1;

  const handleNext = async () => {
    if (!isLastStep) {
      tracker.goToNextStep();
    } else {
      Alert.alert(
        'Finish Workout',
        'Are you sure you want to finish this workout and save your results?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Finish',
            onPress: async () => {
              await saveWorkoutResults();
              router.replace('/(tabs)');
            },
          },
        ]
      );
    }
  };

  const handleClose = async () => {
    if (tracker.totalTimeElapsed < 120) {
      Alert.alert(
        'End Session',
        'This session is under 2 minutes. What would you like to do?',
        [
          {
            text: 'Finish',
            onPress: async () => {
              await saveWorkoutResults();
              router.replace('/(tabs)');
            },
          },
          { text: 'Resume', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert(
        'End Session',
        'Are you sure you want to finish this session and save your results?',
        [
          { text: 'Resume', style: 'cancel' },
          {
            text: 'Finish & Save',
            onPress: async () => {
              await saveWorkoutResults();
              router.replace('/(tabs)');
            },
          },
        ]
      );
    }
  };

  // Active step time display based on mode
  const currentStepTime =
    tracker.timerMode === 'countdown' && tracker.stepTimeRemaining !== null
      ? tracker.stepTimeRemaining
      : tracker.stepTimeElapsed;

  const timerLabel =
    tracker.timerMode === 'countdown' && tracker.stepTimeRemaining !== null
      ? 'Step Remaining'
      : 'Step Elapsed';

  return (
    <ScreenWrapper scrollable={false} className="px-4 pb-6" withTopInset={true}>
      <ActivityHeader
        name={workout.name}
        type={workout.sport as any}
        steps={tracker.steps}
        currentStepIndex={tracker.currentStepIndex}
        totalProgress={tracker.totalProgress}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Step Timer Readout */}
          <ActivityTimer
            time={formatTime(currentStepTime)}
            label={timerLabel}
            mode={tracker.timerMode}
            stepProgress={tracker.stepProgress}
            accentColor={tracker.currentStep?.color}
            onToggleMode={tracker.toggleTimerMode}
          />

          {/* Current Step Hero Card with exact Target Metric */}
          <ActivitySegment step={tracker.currentStep} />

          {/* Total Workout Overview Stats */}
          <ActivityStats
            totalTime={formatTime(tracker.totalTimeElapsed)}
            totalPlannedTime={tracker.totalPlannedTime > 0 ? formatTime(tracker.totalPlannedTime) : undefined}
            totalTimeRemaining={
              tracker.totalTimeRemaining !== null && tracker.totalTimeRemaining > 0
                ? formatTime(tracker.totalTimeRemaining)
                : undefined
            }
            distance={
              isGpsEnabled && location.distance > 0
                ? `${(profile?.units === 'Imperial' ? location.distance / 1609.34 : location.distance / 1000).toFixed(2)} ${profile?.units === 'Imperial' ? 'mi' : 'km'}`
                : undefined
            }
            pace={
              isGpsEnabled && location.currentPace > 0
                ? `${formatPace(location.currentPace)} /${profile?.units === 'Imperial' ? 'mi' : 'km'}`
                : undefined
            }
          />
        </View>

        {/* Step Navigation & Playback Controls */}
        <ActivityControls
          isActive={tracker.isActive}
          onToggleActive={tracker.toggleActive}
          canGoPrevious={tracker.currentStepIndex > 0}
          onPrevious={tracker.goToPreviousStep}
          isLastStep={isLastStep}
          nextLabel={isLastStep ? 'FINISH WORKOUT' : 'NEXT STEP'}
          onNext={handleNext}
        />
      </ScrollView>

      {/* Next Up Toast/Overlay */}
      <NextUpOverlay
        isVisible={tracker.isPreviewVisible}
        nextStep={tracker.nextStep}
        timeRemaining={tracker.stepTimeRemaining ?? 0}
      />
    </ScreenWrapper>
  );
}
