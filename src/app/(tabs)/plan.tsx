import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Header from '@/components/header';
import Text from '@/components/ui/text';
import Calendar from '@/components/calendar';
import SessionCard from '@/components/session-card';
import { format, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { subscribeToWorkouts, toggleWorkoutCompletion, Workout, deleteWorkout } from '@/lib/workout-service';
import { useTheme } from '@/hooks/use-theme';
import { Plus, Clock, Check } from 'lucide-react-native';
import Card from '@/components/ui/card';
import { updateUserProfile } from '@/lib/user-service';
import { GlassButton } from '@/components/ui/glass-button';
import { cn } from '@/lib/utils';
import DailyMetricsInline from '@/components/daily-metrics-inline';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/i18n/format';

export default function PlanScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const router = useRouter();
  const { user, profile } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation('plan');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = subscribeToWorkouts(user.uid, selectedDate, (data) => {
      setWorkouts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedDate]);

  const handleSaveMetrics = async (metrics: any) => {
    if (!user || !profile) return;
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      const history = { ...(profile.dailyMetricsHistory || {}) };
      history[dateKey] = metrics;

      const injuryFlag = metrics.injury === 'None' ? 0 : 1;
      const illnessFlag = metrics.illness === 'None' ? 0 : 1;

      await updateUserProfile(user.uid, {
        dailyMetricsHistory: history,
        // Also update top-level if saving for today
        ...(isSameDay(selectedDate, new Date()) ? {
          dailyMetrics: metrics,
          injury: injuryFlag,
          illness: illnessFlag
        } : {})
      });
    } catch (error) {
      console.error("Failed to save metrics:", error);
    }
  };



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

  const handleAddTraining = () => {
    router.push({
      pathname: '/add-training',
      params: { date: selectedDate.toISOString() }
    });
  };

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const dayName = format(selectedDate, 'EEEE'); // storage key (English weekday), not displayed
  const currentDailyTarget = (profile?.dailyHoursOverrides?.[dateKey] ?? profile?.dailyMaxHours?.[dayName]) ?? 1.5;

  const handleUpdateDailyTarget = async (newTarget: number) => {
    if (!user || !profile) return;
    const overrides = { ...(profile.dailyHoursOverrides || {}) };
    overrides[dateKey] = newTarget;
    try {
      await updateUserProfile(user.uid, { dailyHoursOverrides: overrides });
    } catch (error) {
      console.error("Error updating daily target:", error);
    }
    setShowOverrideModal(false);
  };

  const headerTitle = t('title');

  return (
    <>
      <ScreenWrapper className="px-4" withBottomInset={false}>
        <Header
          title={headerTitle}
          subtitle={formatDate(selectedDate, 'EEEE, MMMM do')}
          rightElement={
            <GlassButton
              size="icon"
              shape="circle"
              variant="glass"
              onPress={handleAddTraining}
              style={{ width: 42, height: 42 }}
            >
              <Plus size={20} color={theme.colors.text} strokeWidth={2.5} />
            </GlassButton>
          }
        />

        <Calendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onToggleExpand={setIsCalendarExpanded}
          className="mb-6"
        />

        <DailyMetricsInline
          key={format(selectedDate, 'yyyy-MM-dd')}
          onSave={handleSaveMetrics}
          initialMetrics={profile?.dailyMetricsHistory?.[format(selectedDate, 'yyyy-MM-dd')]}
          isToday={isSameDay(selectedDate, new Date())}
          date={selectedDate}
        />

        <Card className="p-4 mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="p-2 rounded-xl bg-primary/10 mr-3">
                <Clock size={20} color={theme.colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-sm">{t('dailyMax.title')}</Text>
                <Text variant="muted" className="text-xs">{t('dailyMax.limitFor', { date: formatDate(selectedDate, 'MMM do') })}</Text>
              </View>
            </View>
            <GlassButton
              label={t('dailyMax.hoursShort', { count: currentDailyTarget })}
              variant="glass"
              size="sm"
              shape="pill"
              onPress={() => setShowOverrideModal(true)}
              style={{ width: 86, height: 38, alignSelf: 'center' }}
              contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 38, justifyContent: 'center', alignItems: 'center' }}
              textStyle={{ fontSize: 13, fontWeight: '700' }}
            />
          </View>
        </Card>

        <View className="mb-4">
          <Text variant="h3" className="mb-4">
            {isSameDay(selectedDate, new Date()) ? t('todaysSchedule') : t('scheduledSessions')}
          </Text>

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
              <Text variant="muted">{t('emptyDay')}</Text>
            </View>
          )}
        </View>
      </ScreenWrapper>

      {/* Modals outside ScreenWrapper */}
      <Modal visible={showOverrideModal} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowOverrideModal(false)}
        >
          <View className="bg-card rounded-t-[32px] p-6 pb-12">
            <Text variant="h2" className="mb-6">{t('dailyMax.modalTitle')}</Text>
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[400px]">
              {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => handleUpdateDailyTarget(opt)}
                  className="flex-row items-center py-4 border-b border-border last:border-b-0"
                >
                  <Text className={`flex-1 text-lg ${currentDailyTarget === opt ? 'text-primary font-bold' : ''}`}>
                    {t('dailyMax.hoursOption', { count: opt })}
                  </Text>
                  {currentDailyTarget === opt && <Check size={20} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <GlassButton
              label={t('common:cancel')}
              variant="glass"
              size="lg"
              shape="pill"
              onPress={() => setShowOverrideModal(false)}
              className="mt-6 w-full"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
