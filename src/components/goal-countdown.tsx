import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import Text from "./ui/text";
import Card from "./ui/card";
import { GlassButton } from "./ui/glass-button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { Workout, updateWorkout, createGoalWorkout, regenerateIncompleteGeneratedWorkouts } from "@/lib/workout-service";
import { updateUserProfile } from "@/lib/user-service";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay, addWeeks } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Trophy,
  Target,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Flag,
  Zap,
  Timer,
} from "lucide-react-native";
import { Radius, BorderWidth } from "@/constants/theme";

type Props = {
  goal?: Workout | null;
  eventName?: string;
  goalDate?: Date;
  className?: string;
  onGoalUpdated?: () => void;
};

const SPORTS = ['running', 'cycling', 'swimming', 'strength', 'stretching'] as const;
type TargetCategory = 'all' | 'legs' | 'core' | 'upper' | 'other';
type BodyArea = 'core' | 'upper' | 'lower' | 'all';

interface MilestoneOption {
  category: 'legs' | 'core' | 'upper' | 'all';
  label: string;
  note: string;
}

const STRETCHING_MILESTONES: MilestoneOption[] = [
  // Legs
  { category: 'legs', label: 'Full Front Splits', note: 'Flat ground front splits mobility' },
  { category: 'legs', label: 'Side / Middle Splits', note: 'Center splits hip abduction range' },
  { category: 'legs', label: 'Palms to Floor', note: 'Hamstring & posterior chain flexibility' },
  { category: 'legs', label: 'Deep Squat Mobility', note: 'Deep ankle & hip opener mobility' },
  { category: 'legs', label: 'Pigeon Pose 90°', note: 'Glute & deep rotator hip flexibility' },
  { category: 'legs', label: 'Ankle Dorsiflexion', note: 'Full ankle range of motion' },

  // Core
  { category: 'core', label: 'Thoracic Bridge', note: 'Full backbend & thoracic spine extension' },
  { category: 'core', label: 'L-Sit Mobility', note: 'Core compression & hip flexor range' },
  { category: 'core', label: 'Spinal Decompression & Twists', note: 'Spine mobility and rotational balance' },

  // Upper Body
  { category: 'upper', label: 'Overhead Shoulder Mobility', note: '180° active overhead shoulder flexion' },
  { category: 'upper', label: 'Chest & Anterior Shoulder Opener', note: 'Pectoral and bicep tendon flexibility' },
  { category: 'upper', label: 'Thoracic Extension', note: 'Upper back postural mobility' },

  // All / Full Body
  { category: 'all', label: 'Full Body Mobility Flow', note: 'Complete daily mobility routine' },
  { category: 'all', label: 'Full Body Flexibility Mastery', note: 'Comprehensive multi-joint flexibility' },
];

const STRENGTH_MILESTONES: MilestoneOption[] = [
  // Upper Body
  { category: 'upper', label: '10 Strict Pull-ups', note: '10 consecutive strict reps' },
  { category: 'upper', label: '50 Push-ups unbroken', note: '50 unbroken push-ups' },
  { category: 'upper', label: 'Bodyweight Bench Press', note: '1x bodyweight bench press' },
  { category: 'upper', label: 'Handstand Push-ups', note: 'Strict handstand push-ups against wall' },
  { category: 'upper', label: 'Muscle-Up Mastery', note: 'Strict bar / ring muscle-ups' },
  { category: 'upper', label: 'Overhead Press (0.75x BW)', note: 'Strict barbell overhead press' },

  // Legs
  { category: 'legs', label: '1.5x BW Squat', note: '1.5x bodyweight barbell back squat' },
  { category: 'legs', label: '2x BW Deadlift', note: '2x bodyweight conventional deadlift' },
  { category: 'legs', label: 'Pistol Squats (Single Leg)', note: '5 clean reps per leg' },
  { category: 'legs', label: 'Bulgarian Split Squat Heavy', note: 'Single-leg strength & stability' },

  // Core
  { category: 'core', label: '3-Minute Plank Hold', note: '180s continuous strict core plank' },
  { category: 'core', label: 'Dragon Flag Mastery', note: 'Strict bodyweight dragon flag' },
  { category: 'core', label: 'Hanging Leg Raises (15 reps)', note: 'Toes-to-bar strict leg raises' },
  { category: 'core', label: 'Ab Wheel Rollouts from Toes', note: 'Full extension ab wheel rollouts' },

  // All / Full Body
  { category: 'all', label: 'Clean & Jerk Benchmark', note: 'Olympic weightlifting benchmark' },
  { category: 'all', label: 'Functional Strength Mastery', note: 'Full body functional strength & power' },
];

const getDynamicGoals = (focused_sports: string[] = []) => {
  const goals = ['General Fitness'];
  const hasSwim = focused_sports.includes('swimming');
  const hasBike = focused_sports.includes('cycling');
  const hasRun = focused_sports.includes('running');
  const hasStrength = focused_sports.includes('strength');
  const hasStretching = focused_sports.includes('stretching');

  if (hasSwim && hasBike && hasRun) {
    goals.push('Ironman', 'Half Ironman (70.3)', 'Olympic Triathlon', 'Sprint Triathlon');
  } else if (hasSwim && hasRun && !hasBike) {
    goals.push('Aquathlon', 'SwimRun');
  } else if (hasBike && hasRun && !hasSwim) {
    goals.push('Duathlon');
  }

  if (hasRun) {
    goals.push('Marathon', 'Half Marathon', '10K', '5K');
  }
  if (hasBike) {
    goals.push('Century Ride', '40K TT', '10 Mile TT');
  }
  if (hasSwim) {
    goals.push('1500m Freestyle', '400m Individual Medley', '200m Stroke Specialization', '100m Sprint Event', 'Open Water 1.5K', 'Open Water 5K', 'Open Water 10K');
  }
  if (hasStrength) {
    goals.push('Functional Strength & Conditioning');
  }
  if (hasStretching) {
    goals.push('Full Body Flexibility', 'Front Splits Mastery', 'Middle Splits Mastery');
  }

  return Array.from(new Set(goals));
};

const getDefaultDistanceForGoal = (goalName: string, currentUnits: 'Metric' | 'Imperial') => {
  const isImp = currentUnits === 'Imperial';
  switch (goalName) {
    case 'Marathon':
      return isImp ? '26.2' : '42.2';
    case 'Half Marathon':
      return isImp ? '13.1' : '21.1';
    case '10K':
      return isImp ? '6.2' : '10.0';
    case '5K':
      return isImp ? '3.1' : '5.0';
    case 'Century Ride':
      return isImp ? '100' : '160.9';
    case '40K TT':
      return isImp ? '24.8' : '40.0';
    case '10 Mile TT':
      return isImp ? '10.0' : '16.1';
    case '1500m Freestyle':
      return '1500';
    case 'Open Water 5K':
      return isImp ? '3.1' : '5.0';
    case 'Open Water 10K':
      return isImp ? '6.2' : '10.0';
    case 'Sprint Triathlon':
      return isImp ? '16.0' : '25.7';
    case 'Olympic Triathlon':
      return isImp ? '32.0' : '51.5';
    case 'Half Ironman (70.3)':
      return isImp ? '70.3' : '113.0';
    case 'Ironman':
      return isImp ? '140.6' : '226.0';
    default:
      return '';
  }
};

const getDefaultDurationForGoal = (goalName: string) => {
  switch (goalName) {
    case 'Marathon':
      return '03:45:00';
    case 'Half Marathon':
      return '01:45:00';
    case '10K':
      return '00:45:00';
    case '5K':
      return '00:22:30';
    case 'Century Ride':
      return '05:30:00';
    case '40K TT':
      return '01:05:00';
    case '10 Mile TT':
      return '00:25:00';
    case '1500m Freestyle':
      return '00:24:00';
    case 'Olympic Triathlon':
      return '02:30:00';
    case 'Half Ironman (70.3)':
      return '05:15:00';
    case 'Ironman':
      return '11:00:00';
    default:
      return '01:00:00';
  }
};

export default function GoalCountdown({
  goal,
  eventName = "Target Event",
  goalDate = new Date(),
  className,
  onGoalUpdated,
}: Props) {
  const theme = useTheme();
  const { colors, isDark } = theme;
  const { user, profile } = useAuth();
  const units: 'Metric' | 'Imperial' = profile?.units === 'Imperial' ? 'Imperial' : 'Metric';

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Full Wizard Goal form state
  const [goalSport, setGoalSport] = useState('running');
  const [trainingGoalType, setTrainingGoalType] = useState('General Fitness');
  const [goalNameInput, setGoalNameInput] = useState('My Fitness Target');
  const [goalDistance, setGoalDistance] = useState('');
  const [goalDuration, setGoalDuration] = useState('01:00:00');
  const [targetGoalDate, setTargetGoalDate] = useState<Date>(addWeeks(new Date(), 12));
  const [goalNotes, setGoalNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [milestoneCategory, setMilestoneCategory] = useState<TargetCategory>('all');
  const [customBodyArea, setCustomBodyArea] = useState<BodyArea>('all');
  const [showMilestonePicker, setShowMilestonePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveGoalDate = goal?.date ? new Date(goal.date) : goalDate;
  const effectiveName = goal?.name || eventName;
  const now = new Date();

  // Calculate days remaining
  const diffTime = effectiveGoalDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isAchievedOrPast =
    daysRemaining <= 0 ||
    goal?.completed ||
    goal?.status === 'completed' ||
    isBefore(startOfDay(effectiveGoalDate), startOfDay(now));

  // Assume standard 12-week (84 days) training block for progress
  const DEFAULT_BLOCK_DAYS = 84;
  const totalWeeks = 12;
  const daysElapsed = Math.max(0, DEFAULT_BLOCK_DAYS - Math.max(0, daysRemaining));
  const currentWeek = Math.min(totalWeeks, Math.max(1, Math.ceil(daysElapsed / 7)));
  const progress = Math.min(1, Math.max(0, daysElapsed / DEFAULT_BLOCK_DAYS));

  const isCardioSport = goalSport === 'running' || goalSport === 'cycling' || goalSport === 'swimming';
  const isStrengthSport = goalSport === 'strength';
  const isStretchingSport = goalSport === 'stretching';

  const weeksUntilGoal = Math.max(1, Math.round(
    (targetGoalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)
  ));

  const formatDurationInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let digits = cleaned.padStart(6, '0');
    if (digits.length > 6) digits = digits.slice(-6);
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const ss = digits.slice(4, 6);
    return `${hh}:${mm}:${ss}`;
  };

  const getDurationInSeconds = (durationStr: string) => {
    const parts = durationStr.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  };

  const calculateTargetPaceOrSpeed = () => {
    const totalSecs = getDurationInSeconds(goalDuration);
    const dist = parseFloat(goalDistance);
    if (!dist || dist <= 0 || !totalSecs || totalSecs <= 0) return null;

    if (goalSport === 'swimming') {
      const isImp = units === 'Imperial';
      const actualUnits = dist < 50 ? (isImp ? dist * 1760 : dist * 1000) : dist;
      const hundredUnits = actualUnits / 100;
      if (hundredUnits <= 0) return null;
      const secPer100 = totalSecs / hundredUnits;
      const paceMin = Math.floor(secPer100 / 60);
      const paceSec = Math.floor(secPer100 % 60);
      return `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /100${isImp ? 'yd' : 'm'}`;
    } else if (goalSport === 'running') {
      const paceSeconds = totalSecs / dist;
      const paceMin = Math.floor(paceSeconds / 60);
      const paceSec = Math.floor(paceSeconds % 60);
      return `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /${units === 'Imperial' ? 'mi' : 'km'}`;
    } else if (goalSport === 'cycling') {
      const hours = totalSecs / 3600;
      const speed = (dist / hours).toFixed(1);
      return `${speed} ${units === 'Imperial' ? 'mph' : 'km/h'}`;
    }
    return null;
  };

  const targetPaceOrSpeed = calculateTargetPaceOrSpeed();

  const handleSelectGoalType = (goalType: string) => {
    setTrainingGoalType(goalType);
    setGoalNameInput(`${goalType} Target`);
    const defDist = getDefaultDistanceForGoal(goalType, units);
    const defDur = getDefaultDurationForGoal(goalType);
    if (defDist) setGoalDistance(defDist);
    if (defDur) setGoalDuration(defDur);
  };

  const handleOpenNewGoal = () => {
    setGoalSport(profile?.goal?.sports?.[0] || 'running');
    setTrainingGoalType('General Fitness');
    setGoalNameInput('');
    setGoalDistance('');
    setGoalDuration('01:00:00');
    setTargetGoalDate(addWeeks(new Date(), 12));
    setGoalNotes('');
    setIsEditing(false);
    setShowDetailsModal(false);
    setShowNewGoalModal(true);
  };

  const handleEditGoal = () => {
    setGoalSport(goal?.sport || profile?.goal?.sports?.[0] || 'running');
    setTrainingGoalType(goal?.name || profile?.goal?.type || 'General Fitness');
    setGoalNameInput(effectiveName);
    setGoalDistance((goal as any)?.targetDistance || (profile?.goal as any)?.distance || '');
    setGoalDuration((goal as any)?.targetDuration || (profile?.goal as any)?.duration || '01:00:00');
    setTargetGoalDate(effectiveGoalDate);
    setGoalNotes(goal?.description || (profile?.goal as any)?.notes || '');
    setIsEditing(true);
    setShowDetailsModal(false);
    setShowNewGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!user || !goalNameInput.trim()) {
      Alert.alert('Required', 'Please enter or select a goal title.');
      return;
    }

    setSaving(true);
    try {
      const dateStr = format(targetGoalDate, 'yyyy-MM-dd');
      const goalPayload: any = {
        name: goalNameInput.trim(),
        date: dateStr,
        sport: goalSport,
        type: 'Goal',
        description: goalNotes.trim(),
        completed: false,
        status: 'planned',
      };

      if (isCardioSport) {
        if (goalDistance) goalPayload.targetDistance = goalDistance;
        if (goalDuration) goalPayload.targetDuration = goalDuration;
        if (targetPaceOrSpeed) goalPayload.targetPace = targetPaceOrSpeed;
      }

      if (isEditing && goal?.id) {
        await updateWorkout(goal.id, goalPayload);
      } else {
        await createGoalWorkout(user.uid, goalPayload);
      }

      const parsedDist = parseFloat(goalDistance);
      const totalSecs = getDurationInSeconds(goalDuration);

      await updateUserProfile(user.uid, {
        goal: {
          name: goalNameInput.trim(),
          date: dateStr,
          type: trainingGoalType,
          sports: [goalSport],
          targetDistance: !isNaN(parsedDist) && parsedDist > 0 ? parsedDist : undefined,
          targetDistanceUnit: isCardioSport ? (goalSport === 'swimming' ? (units === 'Imperial' ? 'yd' : 'm') : (units === 'Imperial' ? 'mi' : 'km')) : undefined,
          targetTime: totalSecs > 0 ? totalSecs : undefined,
          targetTimeString: goalDuration,
          targetPace: targetPaceOrSpeed || undefined,
          notes: goalNotes.trim() || undefined,
        },
      });

      // Regenerate training schedule to match new goal
      try {
        await regenerateIncompleteGeneratedWorkouts(user.uid, profile?.scheduleDaysAhead || 14);
      } catch (err) {
        console.log("Schedule sync notice:", err);
      }

      setShowNewGoalModal(false);
      if (onGoalUpdated) onGoalUpdated();
    } catch (err) {
      console.error('Error saving goal:', err);
      Alert.alert('Error', 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkGoalAchieved = async () => {
    if (!goal?.id) return;
    try {
      await updateWorkout(goal.id, {
        completed: true,
        status: 'completed',
      });
      setShowDetailsModal(false);
      if (onGoalUpdated) onGoalUpdated();
      Alert.alert('🎉 Congratulations!', 'Goal marked as achieved! What would you like to achieve next?');
    } catch (err) {
      console.error('Error completing goal:', err);
    }
  };

  const filteredMilestones = (isStretchingSport ? STRETCHING_MILESTONES : STRENGTH_MILESTONES).filter(
    m => milestoneCategory === 'all' || m.category === milestoneCategory
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (isAchievedOrPast) {
            handleOpenNewGoal();
          } else {
            setShowDetailsModal(true);
          }
        }}
      >
        <Card className={cn("p-4", className)}>
          {isAchievedOrPast ? (
            /* Achieved / Past Target Date State */
            <View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-amber-500/15 items-center justify-center border border-amber-500/30">
                    <Trophy size={16} color="#f59e0b" />
                  </View>
                  <View>
                    <Text variant="small" className="text-amber-500 font-bold text-xs uppercase tracking-wider">
                      Goal Target Reached!
                    </Text>
                    <Text className="text-base font-extrabold text-foreground" numberOfLines={1}>
                      {effectiveName}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </View>

              <View className="mt-3 pt-3 border-t border-border flex-row items-center justify-between">
                <Text variant="muted" className="text-xs font-semibold">
                  What is your next goal?
                </Text>
                <GlassButton
                  label="+ Set Next Goal"
                  variant="glass-primary"
                  size="sm"
                  shape="pill"
                  onPress={handleOpenNewGoal}
                  style={{ height: 32 }}
                  contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 0, height: 32 }}
                  textStyle={{ fontSize: 12, fontWeight: '700' }}
                />
              </View>
            </View>
          ) : (
            /* Active Countdown State */
            <View>
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-2">
                  <Text variant="muted" className="font-medium text-xs">
                    {effectiveName} Countdown
                  </Text>
                  <View className="flex-row items-baseline mt-1">
                    <Text className="text-2xl font-bold text-foreground">
                      {Math.max(0, daysRemaining)}
                    </Text>
                    <Text variant="muted" className="ml-1 text-sm font-semibold">
                      days to go
                    </Text>
                  </View>
                </View>

                <GlassButton
                  label="Details"
                  variant="glass"
                  size="sm"
                  shape="pill"
                  onPress={() => setShowDetailsModal(true)}
                  style={{ width: 58, height: 26, alignSelf: 'flex-start', marginTop: -3 }}
                  contentContainerStyle={{
                    width: 58,
                    height: 26,
                    minHeight: 26,
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  textStyle={{
                    fontSize: 11,
                    fontWeight: '700',
                    textAlign: 'center',
                    color: theme.colors.text,
                    includeFontPadding: false,
                  }}
                />
              </View>

              {daysRemaining <= DEFAULT_BLOCK_DAYS && (
                <View className="mt-4">
                  <View className="flex-row justify-between mb-1.5">
                    <Text variant="small" className="text-muted-foreground text-xs">
                      Plan Progress
                    </Text>
                    <Text variant="small" className="text-foreground font-bold text-[10px]">
                      Week {currentWeek} of {totalWeeks} ({Math.round(progress * 100)}%)
                    </Text>
                  </View>
                  <View className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <View
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, progress * 100)}%` }}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </Card>
      </TouchableOpacity>

      {/* Goal Details Modal */}
      <Modal visible={showDetailsModal} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowDetailsModal(false)}
        >
          <View className="bg-card rounded-t-[32px] p-6 pb-12 border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Target size={20} color={theme.colors.primary} />
                <Text variant="h2">Goal Details</Text>
              </View>
              <GlassButton
                size="icon"
                shape="circle"
                variant="glass"
                onPress={() => setShowDetailsModal(false)}
                style={{ width: 34, height: 34 }}
                contentContainerStyle={{ width: 34, height: 34, padding: 0 }}
              >
                <X size={16} color={theme.colors.text} strokeWidth={2.5} />
              </GlassButton>
            </View>

            <View className="bg-muted/30 rounded-2xl p-4 border border-border mb-4">
              <Text className="text-xl font-black text-foreground mb-1">
                {effectiveName}
              </Text>
              <View className="flex-row items-center gap-3 mt-1 flex-wrap">
                <View className="flex-row items-center gap-1">
                  <CalendarIcon size={13} color={theme.colors.textSecondary} />
                  <Text variant="muted" className="text-xs font-semibold">
                    {format(effectiveGoalDate, 'EEEE, MMMM do, yyyy')}
                  </Text>
                </View>
                {goal?.sport && (
                  <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25">
                    <Text className="text-[10px] font-bold text-primary capitalize">{goal.sport}</Text>
                  </View>
                )}
                {(goal as any)?.targetPace && (
                  <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 flex-row items-center gap-1">
                    <Zap size={10} color={theme.colors.primary} />
                    <Text className="text-[10px] font-bold text-primary">{(goal as any).targetPace}</Text>
                  </View>
                )}
              </View>
            </View>

            <View className="bg-muted/30 rounded-2xl p-4 border border-border mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Training Block Progress
                </Text>
                <Text className="text-xs font-bold text-foreground">
                  Week {currentWeek} of {totalWeeks}
                </Text>
              </View>

              <View className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                <View
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </View>

              <View className="flex-row justify-between items-center text-xs">
                <Text variant="muted" className="text-[11px]">
                  {daysElapsed} days completed
                </Text>
                <Text variant="muted" className="text-[11px] font-bold text-primary">
                  {Math.max(0, daysRemaining)} days remaining
                </Text>
              </View>

              {goal?.description ? (
                <View className="mt-3 pt-3 border-t border-border/40">
                  <Text variant="muted" className="text-xs italic">
                    &ldquo;{goal.description}&rdquo;
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="gap-2.5">
              <GlassButton
                label="Mark as Achieved"
                variant="glass-primary"
                size="md"
                shape="pill"
                onPress={handleMarkGoalAchieved}
                style={{ height: 42 }}
                contentContainerStyle={{ height: 42, justifyContent: 'center', alignItems: 'center' }}
              />

              <View className="flex-row gap-2">
                <GlassButton
                  label="Edit Goal"
                  variant="glass"
                  size="md"
                  shape="pill"
                  onPress={handleEditGoal}
                  style={{ flex: 1, height: 40 }}
                  contentContainerStyle={{ height: 40, justifyContent: 'center', alignItems: 'center' }}
                />
                <GlassButton
                  label="+ Set Next Goal"
                  variant="glass"
                  size="md"
                  shape="pill"
                  onPress={handleOpenNewGoal}
                  style={{ flex: 1, height: 40 }}
                  contentContainerStyle={{ height: 40, justifyContent: 'center', alignItems: 'center' }}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FULL SETUP WIZARD GOAL CREATION / EDIT MODAL */}
      <Modal visible={showNewGoalModal} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-card rounded-t-[32px] p-6 pb-10 h-[88%] border-t border-border">
            {/* Header Bar */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2.5">
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: Radius.lg,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Flag size={20} color="#f59e0b" strokeWidth={2.2} />
                </View>
                <View>
                  <Text variant="h2">{isEditing ? 'Edit Goal' : 'Set Your Goal'}</Text>
                  <Text variant="muted" className="text-xs">
                    Target specific milestones and race dates
                  </Text>
                </View>
              </View>
              <GlassButton
                size="icon"
                shape="circle"
                variant="glass"
                onPress={() => setShowNewGoalModal(false)}
                style={{ width: 34, height: 34 }}
                contentContainerStyle={{ width: 34, height: 34, padding: 0 }}
              >
                <X size={16} color={theme.colors.text} strokeWidth={2.5} />
              </GlassButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {/* 1. SPORT SELECTOR */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                  Sport Focus
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {SPORTS.map(sport => {
                    const isSelected = goalSport === sport;
                    return (
                      <TouchableOpacity
                        key={sport}
                        onPress={() => {
                          setGoalSport(sport);
                          if (sport === 'stretching') {
                            setGoalNameInput('Full Front Splits');
                            setGoalNotes('Flat ground front splits mobility');
                          } else if (sport === 'strength') {
                            setGoalNameInput('10 Strict Pull-ups');
                            setGoalNotes('10 consecutive strict reps');
                          } else if (sport === 'swimming') {
                            setGoalNameInput('1500m Swim Target');
                            setGoalDistance('1500');
                          } else {
                            const defDist = getDefaultDistanceForGoal(trainingGoalType, units);
                            if (defDist) setGoalDistance(defDist);
                            setGoalNameInput(`${trainingGoalType} Target`);
                          }
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: Radius.pill,
                          backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                          borderWidth: BorderWidth.thin,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? colors.primary : colors.text, textTransform: 'capitalize' }}>
                          ★ {sport}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 2. DYNAMIC GOAL TEMPLATES (FOR CARDIO & MULTISPORT) */}
              {isCardioSport && (
                <View className="mb-4">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    Goal Templates
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {getDynamicGoals([goalSport]).map((preset) => {
                      const isSelected = trainingGoalType === preset;
                      return (
                        <TouchableOpacity
                          key={preset}
                          onPress={() => handleSelectGoalType(preset)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: Radius.pill,
                            backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(22, 163, 74, 0.12)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                            borderWidth: BorderWidth.thin,
                            borderColor: isSelected ? colors.primary : colors.border,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 3. STRETCHING / STRENGTH: Dropdown Picker Button */}
              {(isStretchingSport || isStrengthSport) && (
                <View className="mb-4">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    {isStretchingSport ? 'Flexibility Milestone / Focus' : 'Strength Benchmark / Focus'}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowMilestonePicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      height: 52,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.thin,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        {goalNameInput || (isStretchingSport ? 'Select Flexibility Milestone' : 'Select Strength Benchmark')}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' }} numberOfLines={1}>
                        Category: {milestoneCategory === 'all' ? 'All Focus Areas' : milestoneCategory}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: Radius.pill,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronDown size={16} color={colors.text} />
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* 4. TARGET ANATOMICAL AREA FOR ALGORITHM (STRENGTH / STRETCHING / OTHER) */}
              {(milestoneCategory === 'other' || isStrengthSport || isStretchingSport) && (
                <View className="mb-4">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    Target Anatomical Area for Training Algorithm
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['all', 'core', 'upper', 'lower'] as const).map(area => {
                      const isSelected = customBodyArea === area;
                      const areaLabels: Record<BodyArea, string> = {
                        all: 'All Body',
                        core: 'Core',
                        upper: 'Upper Body',
                        lower: 'Lower / Legs',
                      };
                      return (
                        <TouchableOpacity
                          key={area}
                          onPress={() => setCustomBodyArea(area)}
                          style={{
                            flex: 1,
                            paddingVertical: 9,
                            borderRadius: Radius.lg,
                            backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                            borderWidth: BorderWidth.thin,
                            borderColor: isSelected ? colors.primary : colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? colors.primary : colors.text, textAlign: 'center' }}>
                            {areaLabels[area]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 5. GOAL / EVENT NAME INPUT */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                  {isStretchingSport ? 'Custom Goal / Milestone Name' : isStrengthSport ? 'Custom Benchmark Name' : 'Goal / Event Name'}
                </Text>
                <TextInput
                  style={{
                    height: 50,
                    paddingHorizontal: 16,
                    borderRadius: Radius.lg,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderWidth: BorderWidth.thin,
                    borderColor: goalNameInput.trim() ? colors.primary : colors.border,
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                  placeholder={
                    isStretchingSport
                      ? "e.g. Front Splits, Palms to Floor, Custom"
                      : isStrengthSport
                        ? "e.g. 10 Strict Pull-ups, 100kg Squat, Custom"
                        : "e.g. Autumn Marathon, Sub-4h Target"
                  }
                  placeholderTextColor={colors.textSecondary}
                  value={goalNameInput}
                  onChangeText={setGoalNameInput}
                />
              </View>

              {/* 6. TARGET DISTANCE & PRESETS (FOR CARDIO) */}
              {isCardioSport && (
                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2 px-1">
                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {goalSport === 'swimming' ? 'Target Swim Distance (Meters/Yards)' : `Target Distance (${units === 'Imperial' ? 'Miles' : 'Kilometers'})`}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                      {goalSport === 'swimming' ? (units === 'Imperial' ? 'Yards' : 'Meters') : (units === 'Imperial' ? 'Imperial (mi)' : 'Metric (km)')}
                    </Text>
                  </View>

                  {/* Quick Distance Chips */}
                  <View className="flex-row gap-2 mb-2.5">
                    {goalSport === 'running' && [
                      { label: units === 'Imperial' ? '5K (3.1m)' : '5K', val: units === 'Imperial' ? '3.1' : '5.0' },
                      { label: units === 'Imperial' ? '10K (6.2m)' : '10K', val: units === 'Imperial' ? '6.2' : '10.0' },
                      { label: units === 'Imperial' ? 'Half 13.1m' : 'Half 21.1k', val: units === 'Imperial' ? '13.1' : '21.1' },
                      { label: units === 'Imperial' ? 'Full 26.2m' : 'Full 42.2k', val: units === 'Imperial' ? '26.2' : '42.2' },
                    ].map(p => (
                      <TouchableOpacity
                        key={p.label}
                        onPress={() => setGoalDistance(p.val)}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          borderRadius: Radius.md,
                          backgroundColor: goalDistance === p.val ? (isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(22, 163, 74, 0.12)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                          borderWidth: BorderWidth.thin,
                          borderColor: goalDistance === p.val ? colors.primary : colors.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: goalDistance === p.val ? colors.primary : colors.textSecondary }}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {goalSport === 'cycling' && [
                      { label: units === 'Imperial' ? '12.5m' : '20k', val: units === 'Imperial' ? '12.5' : '20.0' },
                      { label: units === 'Imperial' ? '25m' : '40k', val: units === 'Imperial' ? '25.0' : '40.0' },
                      { label: units === 'Imperial' ? '50m' : '80k', val: units === 'Imperial' ? '50.0' : '80.0' },
                      { label: units === 'Imperial' ? '100m' : '160k', val: units === 'Imperial' ? '100.0' : '160.0' },
                    ].map(p => (
                      <TouchableOpacity
                        key={p.label}
                        onPress={() => setGoalDistance(p.val)}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          borderRadius: Radius.md,
                          backgroundColor: goalDistance === p.val ? (isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(22, 163, 74, 0.12)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                          borderWidth: BorderWidth.thin,
                          borderColor: goalDistance === p.val ? colors.primary : colors.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: goalDistance === p.val ? colors.primary : colors.textSecondary }}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {goalSport === 'swimming' && [
                      { label: '750m', val: '750' },
                      { label: '1500m', val: '1500' },
                      { label: '3800m', val: '3800' },
                      { label: '5000m', val: '5000' },
                    ].map(p => (
                      <TouchableOpacity
                        key={p.label}
                        onPress={() => setGoalDistance(p.val)}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          borderRadius: Radius.md,
                          backgroundColor: goalDistance === p.val ? (isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(22, 163, 74, 0.12)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                          borderWidth: BorderWidth.thin,
                          borderColor: goalDistance === p.val ? colors.primary : colors.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: goalDistance === p.val ? colors.primary : colors.textSecondary }}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={{
                      height: 50,
                      paddingHorizontal: 16,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.thin,
                      borderColor: goalDistance.trim() ? colors.primary : colors.border,
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                    placeholder={
                      goalSport === 'swimming'
                        ? "Distance in meters/yards (e.g. 1500)"
                        : `Distance in ${units === 'Imperial' ? 'miles (e.g. 26.2)' : 'km (e.g. 42.2)'}`
                    }
                    placeholderTextColor={colors.textSecondary}
                    value={goalDistance}
                    onChangeText={setGoalDistance}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* 7. TARGET FINISH TIME & AUTO PACE CALCULATION */}
              {isCardioSport && (
                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2 px-1">
                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Target Finish Time (HH:MM:SS)
                    </Text>
                    {targetPaceOrSpeed && (
                      <View className="flex-row items-center gap-1 bg-primary/15 px-2 py-0.5 rounded-full">
                        <Zap size={11} color={colors.primary} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                          {targetPaceOrSpeed}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      height: 50,
                      paddingHorizontal: 16,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.thin,
                      borderColor: colors.border,
                    }}
                  >
                    <Timer size={18} color={colors.primary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: '700',
                      }}
                      placeholder={goalSport === 'swimming' ? "00:24:00" : "03:45:00"}
                      placeholderTextColor={colors.textSecondary}
                      value={goalDuration}
                      onChangeText={text => setGoalDuration(formatDurationInput(text))}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              )}

              {/* 8. TARGET DATE & TIMELINE PRESETS */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2 px-1">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Target Event Date
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                    {weeksUntilGoal} weeks away
                  </Text>
                </View>

                {/* Timeline Presets Chips */}
                <View className="flex-row gap-2 mb-2.5">
                  {[8, 12, 16, 24].map(w => {
                    const isSelected = weeksUntilGoal === w;
                    return (
                      <TouchableOpacity
                        key={w}
                        onPress={() => setTargetGoalDate(addWeeks(new Date(), w))}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: Radius.lg,
                          backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(22, 163, 74, 0.12)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                          borderWidth: BorderWidth.thin,
                          borderColor: isSelected ? colors.primary : colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                          +{w}w
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Date Display Pill */}
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    height: 50,
                    borderRadius: Radius.lg,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderWidth: BorderWidth.thin,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CalendarIcon size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {format(targetGoalDate, 'MMMM d, yyyy')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    Change Date
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 9. TARGET NOTES / FOCUS DESCRIPTION */}
              <View className="mb-6">
                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                  {isStretchingSport ? 'Mobility Focus / Notes (Optional)' : isStrengthSport ? 'Benchmark Target Notes (Optional)' : 'Target Notes (Optional)'}
                </Text>
                <TextInput
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: Radius.lg,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderWidth: BorderWidth.thin,
                    borderColor: colors.border,
                    color: colors.text,
                    fontSize: 14,
                    minHeight: 52,
                    textAlignVertical: 'top',
                  }}
                  placeholder={
                    isStretchingSport
                      ? "e.g. Daily 15m hip mobility routine, reach flat ground"
                      : isStrengthSport
                        ? "e.g. 10 strict reps, 100 kg 1RM target"
                        : "e.g. Sub-3:45 finish, negative split pacing"
                  }
                  placeholderTextColor={colors.textSecondary}
                  value={goalNotes}
                  onChangeText={setGoalNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            <GlassButton
              label={isEditing ? 'Save & Update Plan' : 'Set Goal & Generate Plan'}
              variant="glass-primary"
              size="lg"
              shape="pill"
              disabled={saving}
              loading={saving}
              onPress={handleSaveGoal}
              className="mt-2 w-full"
            />
          </View>
        </View>
      </Modal>

      {/* MILESTONE PICKER MODAL (FOR STRENGTH & STRETCHING) */}
      <Modal visible={showMilestonePicker} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowMilestonePicker(false)}
        >
          <View
            style={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: BorderWidth.hairline,
              borderColor: colors.border,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
                  {isStretchingSport ? 'Flexibility Milestones' : 'Strength Benchmarks'}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  Select a milestone to calibrate your weekly progression.
                </Text>
              </View>
              <GlassButton
                size="icon"
                shape="circle"
                variant="glass"
                onPress={() => setShowMilestonePicker(false)}
                style={{ width: 34, height: 34 }}
                contentContainerStyle={{ width: 34, height: 34, padding: 0 }}
              >
                <X size={16} color={colors.text} strokeWidth={2.5} />
              </GlassButton>
            </View>

            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
              {(['all', 'legs', 'core', 'upper'] as const).map(cat => {
                const isSelected = milestoneCategory === cat;
                const catLabels: Record<string, string> = {
                  all: 'All Milestones',
                  legs: 'Legs & Hips',
                  core: 'Core & Spine',
                  upper: 'Upper Body',
                };
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setMilestoneCategory(cat)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: Radius.pill,
                      backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(22, 163, 74, 0.12)') : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                      borderWidth: BorderWidth.thin,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                      {catLabels[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Milestone Options List */}
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8, paddingBottom: 16 }}>
                {filteredMilestones.map(m => {
                  const isSelected = goalNameInput === m.label;
                  return (
                    <TouchableOpacity
                      key={m.label}
                      onPress={() => {
                        setGoalNameInput(m.label);
                        setGoalNotes(m.note);
                        setShowMilestonePicker(false);
                      }}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 14,
                        borderRadius: Radius.xl,
                        backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                        borderWidth: BorderWidth.thin,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                          {m.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                          {m.note}
                        </Text>
                      </View>
                      {isSelected && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}

                {/* Other Option */}
                <TouchableOpacity
                  onPress={() => {
                    setMilestoneCategory('other');
                    setGoalNameInput('');
                    setGoalNotes('Custom milestone target');
                    setShowMilestonePicker(false);
                  }}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: Radius.xl,
                    backgroundColor: milestoneCategory === 'other' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                    borderWidth: BorderWidth.thin,
                    borderColor: milestoneCategory === 'other' ? colors.primary : colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: milestoneCategory === 'other' ? colors.primary : colors.text }}>
                      Other / Custom Target
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      Select target anatomical area and enter custom movement
                    </Text>
                  </View>
                  {milestoneCategory === 'other' && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* iOS & Android Target Date Picker */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View
              style={{
                backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                borderTopWidth: BorderWidth.hairline,
                borderColor: colors.border,
                padding: 20,
                paddingBottom: 36,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                  Select Target Date
                </Text>
                <GlassButton
                  onPress={() => setShowDatePicker(false)}
                  shape="pill"
                  size="sm"
                  variant="glass-primary"
                  label="Done"
                  style={{ height: 34, minWidth: 64 }}
                />
              </View>

              <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 8 }}>
                <DateTimePicker
                  value={targetGoalDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_event, selected) => {
                    if (selected) setTargetGoalDate(selected);
                  }}
                  textColor={colors.text}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={{ width: 320, alignSelf: 'center' }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={targetGoalDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(_event: any, selected?: Date) => {
              setShowDatePicker(false);
              if (selected) setTargetGoalDate(selected);
            }}
          />
        )
      )}
    </>
  );
}
