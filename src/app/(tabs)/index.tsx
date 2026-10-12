import GoalCountdown from "@/components/goal-countdown";
import Header from "@/components/header";
import SessionCard from "@/components/session-card";
import ScreenWrapper from "@/components/ui/screen-wrapper";
import Text from "@/components/ui/text";
import { GlassButton } from "@/components/ui/glass-button";
import { useFocusEffect, useRouter } from "expo-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Settings } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { subscribeToWorkouts, toggleWorkoutCompletion, Workout, deleteWorkout, getUpcomingGoalEvent, generateMissingTrainingDays } from "@/lib/workout-service";
import { useAuth } from "@/hooks/use-auth";
import { Timestamp } from "firebase/firestore";
import Card from "@/components/ui/card";
import DailyMetricsInline from "@/components/daily-metrics-inline";
import { updateUserProfile } from "@/lib/user-service";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";



export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const { user, profile } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [upcomingGoal, setUpcomingGoal] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const isAutoGeneratingRef = useRef(false);
  const { t } = useTranslation('home');

  const fetchGoal = useCallback(async () => {
    if (!user) return;
    const goal = await getUpcomingGoalEvent(user.uid);
    setUpcomingGoal(goal);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchGoal();

    const unsubscribe = subscribeToWorkouts(user.uid, new Date(), (data) => {
      setWorkouts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, fetchGoal]);

  const generateMissingDaysOnOpen = useCallback(async () => {
    if (!user || !profile || !profile.wizardCompleted || isAutoGeneratingRef.current) return;

    isAutoGeneratingRef.current = true;
    try {
      await generateMissingTrainingDays(user.uid, profile.scheduleDaysAhead || 1);
    } catch (error) {
      console.error("Failed to auto-generate upcoming training:", error);
    } finally {
      isAutoGeneratingRef.current = false;
    }
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      generateMissingDaysOnOpen();
    }, [generateMissingDaysOnOpen])
  );

  const handleToggleComplete = async (workout: Workout) => {
    if (!workout.id) return;

    const isCompleted = workout.completed || workout.status === 'completed';
    const title = isCompleted ? t('common:toggleComplete.redoTitle') : t('common:toggleComplete.completeTitle');
    const message = isCompleted
      ? t('common:toggleComplete.redoMessage')
      : t('common:toggleComplete.completeMessage');

    Alert.alert(
      title,
      message,
      [
        { text: t('common:cancel'), style: "cancel" },
        {
          text: isCompleted ? t('common:toggleComplete.redo') : t('common:complete'),
          onPress: async () => {
            try {
              await toggleWorkoutCompletion(workout.id!, workout.status);
            } catch (error) {
              console.error("Failed to toggle workout:", error);
            }
          }
        }
      ]
    );
  };

  const handleSaveMetrics = async (metrics: any) => {
    if (!user || !profile) return;
    try {
      const dateKey = format(new Date(), 'yyyy-MM-dd');
      const history = { ...(profile.dailyMetricsHistory || {}) };
      history[dateKey] = metrics;

      const injuryFlag = metrics.injury === 'None' ? 0 : 1;
      const illnessFlag = metrics.illness === 'None' ? 0 : 1;

      await updateUserProfile(user.uid, {
        dailyMetrics: metrics, // keep for backward compatibility/quick access
        dailyMetricsHistory: history,
        injury: injuryFlag,
        illness: illnessFlag
      });
    } catch (error) {
      console.error("Failed to save metrics:", error);
    }
  };

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayMetrics = profile?.dailyMetricsHistory?.[todayKey];

  return (
    <ScreenWrapper className="px-4" withBottomInset={false}>
      <Header
        title={t('greeting', { name: profile?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || t('defaultName') })}
        subtitle={t('onTrack')}
        rightElement={
          <GlassButton
            size="icon"
            shape="circle"
            variant="glass"
            onPress={() => router.push('/settings')}
            style={{ width: 42, height: 42 }}
          >
            <Settings size={20} color={theme.colors.text} strokeWidth={2} />
          </GlassButton>
        }
      />


      <DailyMetricsInline
        onSave={handleSaveMetrics}
        initialMetrics={todayMetrics}
        isToday={true}
        date={new Date()}
      />

      {(upcomingGoal || profile?.goal) && (
        <GoalCountdown
          goal={upcomingGoal}
          eventName={upcomingGoal?.name || profile?.goal?.name || t('targetGoal')}
          goalDate={upcomingGoal?.date ? new Date(upcomingGoal.date) : (profile?.goal?.date ? new Date(profile.goal.date) : new Date())}
          onGoalUpdated={fetchGoal}
          className="mb-6"
        />
      )}

      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text variant="h3">{t('todaysSession')}</Text>
          <GlassButton
            label={t('logExtra')}
            variant="glass-primary"
            size="sm"
            shape="pill"
            onPress={() => router.push({ pathname: '/add-training', params: { date: new Date().toISOString() } })}
            style={{ minHeight: 32 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 }}
          />
        </View>

        {loading ? (

          <ActivityIndicator color={theme.primary} className="py-10" />
        ) : workouts.length > 0 ? (
          workouts.map((workout) => (
            <SessionCard
              key={workout.id}
              sport={workout.sport as any}
              name={workout.name}
              tss={workout.tss}
              time={workout.time}
              source={workout.source}
              description={workout.description}
              completed={workout.completed}
              onStart={() => workout.id && router.push({ pathname: '/activity/[id]' as any, params: { id: workout.id } })}
              onComplete={() => handleToggleComplete(workout)}
              onAnalyze={() => workout.id && router.push({ pathname: '/session/[id]' as any, params: { id: workout.id, tab: 'analysis' } })}
              onDetails={() => workout.id && router.push({ pathname: '/session/[id]' as any, params: { id: workout.id } })}
            />
          ))
        ) : (
          <View className="py-10 items-center justify-center bg-muted/20 rounded-2xl border border-dashed border-border">
            <Text variant="muted">{t('noWorkoutsToday')}</Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}
