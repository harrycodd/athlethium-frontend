import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Alert, Switch, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Text from '@/components/ui/text';
import { GlassButton } from '@/components/ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/user-service';
import { regenerateIncompleteGeneratedWorkouts, createWorkout } from '@/lib/workout-service';
import { ChevronLeft, ChevronDown, Check, Dumbbell, Target, User, Sparkles, Award, Clock, Flame, Calendar as CalendarIcon, Flag, Zap, Timer, PieChart, Sliders, Link2, ExternalLink, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, BorderWidth } from '@/constants/theme';
import { format, addWeeks, differenceInWeeks } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';


const SPORTS = ['running', 'cycling', 'swimming', 'strength', 'stretching'] as const;
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const EQUIPMENT_LIST = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'pullUpBar', label: 'Pull-up Bar' },
  { id: 'squatRack', label: 'Squat Rack' },
  { id: 'bench', label: 'Bench' },
  { id: 'dipBar', label: 'Dip Bar' },
  { id: 'cable', label: 'Cable' },
  { id: 'latPulldown', label: 'Lat Pulldown' },
  { id: 'flyMachine', label: 'Fly Machine' },
  { id: 'resistanceBands', label: 'Resistance Bands' },
  { id: 'medicineBall', label: 'Medicine Ball' },
] as const;

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

const SPORT_COLORS: Record<string, string> = {
  running: '#22c55e',
  cycling: '#06b6d4',
  swimming: '#3b82f6',
  strength: '#eab308',
  stretching: '#ec4899',
};

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

const getDefaultDistanceForGoal = (goal: string, currentUnits: 'Metric' | 'Imperial') => {
  const isImp = currentUnits === 'Imperial';
  switch (goal) {
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

const getDefaultDurationForGoal = (goal: string) => {
  switch (goal) {
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

const getSteps = (hasStrength: boolean) => {
  return hasStrength ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 9, 10];
};

export default function WizardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [connectingStrava, setConnectingStrava] = useState(false);

  // Form states initialized with defaults
  const [displayName, setDisplayName] = useState('');
  const [units, setUnits] = useState<'Metric' | 'Imperial'>('Metric');
  const [weeklyHours, setWeeklyHours] = useState(7);
  const [activities, setActivities] = useState<Record<string, boolean>>({
    running: true,
    cycling: true,
    swimming: true,
    strength: true,
    stretching: true,
  });
  const [mainFocus, setMainFocus] = useState<Record<string, boolean>>({
    running: true,
    cycling: false,
    swimming: false,
    strength: false,
    stretching: false,
  });
  const [trainingGoalType, setTrainingGoalType] = useState('General Fitness');

  // Goal Event setup states
  const [goalName, setGoalName] = useState('My Fitness Target');
  const [goalSport, setGoalSport] = useState('running');
  const [goalDistance, setGoalDistance] = useState('');
  const [goalDuration, setGoalDuration] = useState('01:00:00');
  const [goalDate, setGoalDate] = useState<Date>(addWeeks(new Date(), 12));
  const [goalNotes, setGoalNotes] = useState('');
  const [showGoalDatePicker, setShowGoalDatePicker] = useState(false);

  // Dropdown Milestone picker state & Other body area selection
  const [milestoneCategory, setMilestoneCategory] = useState<TargetCategory>('all');
  const [customBodyArea, setCustomBodyArea] = useState<BodyArea>('all');
  const [showMilestonePicker, setShowMilestonePicker] = useState(false);


  // Sport Allocation Distribution State (Step 6)
  const [sportPercentages, setSportPercentages] = useState<Record<string, number>>({
    running: 50,
    cycling: 20,
    swimming: 10,
    strength: 10,
    stretching: 10,
  });
  const [sportSessions, setSportSessions] = useState<Record<string, number>>({
    running: 3,
    cycling: 1,
    swimming: 1,
    strength: 2,
    stretching: 2,
  });
  const [allocationMode, setAllocationMode] = useState<'percentage' | 'sessions'>('percentage');

  const [dailyMaxHours, setDailyMaxHours] = useState<Record<string, number>>({
    Monday: 1.5,
    Tuesday: 1.5,
    Wednesday: 1.5,
    Thursday: 1.5,
    Friday: 1.5,
    Saturday: 2.0,
    Sunday: 2.0,
  });
  const [equipmentToggles, setEquipmentToggles] = useState<Record<string, boolean>>({
    dumbbells: true,
    kettlebell: true,
    pullUpBar: true,
    squatRack: true,
    bench: true,
    dipBar: true,
    cable: true,
    latPulldown: true,
    flyMachine: true,
    resistanceBands: true,
    medicineBall: true,
  });

  const steps = getSteps(!!activities.strength);
  const currentStepIndex = Math.max(0, steps.indexOf(step));
  const totalSteps = steps.length;
  const displayStepNumber = currentStepIndex + 1;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Sync state from profile once loaded
  useEffect(() => {
    if (profile) {
      if (profile.displayName) setDisplayName(profile.displayName);
      if (profile.units) {
        setUnits(profile.units);
      }
      if (profile.weekly_hours) setWeeklyHours(profile.weekly_hours);
      if (profile.activities) {
        setActivities({
          running: !!profile.activities.running,
          cycling: !!profile.activities.cycling,
          swimming: !!profile.activities.swimming,
          strength: !!profile.activities.strength,
          stretching: !!profile.activities.stretching,
        });
      }
      if (profile.mainFocus) {
        setMainFocus({
          running: !!profile.mainFocus.running,
          cycling: !!profile.mainFocus.cycling,
          swimming: !!profile.mainFocus.swimming,
          strength: !!profile.mainFocus.strength,
          stretching: !!profile.mainFocus.stretching,
        });
      }
      if (profile.trainingGoalType) {
        setTrainingGoalType(profile.trainingGoalType);
        setGoalName(`${profile.trainingGoalType} Target`);
        const defDist = getDefaultDistanceForGoal(profile.trainingGoalType, profile.units || 'Metric');
        const defDur = getDefaultDurationForGoal(profile.trainingGoalType);
        if (defDist) setGoalDistance(defDist);
        if (defDur) setGoalDuration(defDur);
      }
      if (profile.goal) {
        if (profile.goal.name) setGoalName(profile.goal.name);
        if (profile.goal.date) setGoalDate(new Date(profile.goal.date));
        if (profile.goal.sports?.[0]) setGoalSport(profile.goal.sports[0]);
        if (profile.goal.targetDistance) setGoalDistance(profile.goal.targetDistance.toString());
        if (profile.goal.targetTimeString) setGoalDuration(profile.goal.targetTimeString);
        if (profile.goal.notes) setGoalNotes(profile.goal.notes);
      }
      if (profile.sportPercentages) {
        setSportPercentages(profile.sportPercentages);
      }
      if (profile.sportSessionsPerWeek) {
        setSportSessions(profile.sportSessionsPerWeek);
      }
      if (profile.dailyMaxHours) {
        setDailyMaxHours({
          Monday: profile.dailyMaxHours.Monday ?? 1.5,
          Tuesday: profile.dailyMaxHours.Tuesday ?? 1.5,
          Wednesday: profile.dailyMaxHours.Wednesday ?? 1.5,
          Thursday: profile.dailyMaxHours.Thursday ?? 1.5,
          Friday: profile.dailyMaxHours.Friday ?? 1.5,
          Saturday: profile.dailyMaxHours.Saturday ?? 2.0,
          Sunday: profile.dailyMaxHours.Sunday ?? 2.0,
        });
      }
      if (profile.equipmentToggles) {
        setEquipmentToggles({
          dumbbells: !!(profile.equipmentToggles as any).dumbbells,
          kettlebell: !!(profile.equipmentToggles as any).kettlebell,
          pullUpBar: !!(profile.equipmentToggles as any).pullUpBar,
          squatRack: !!(profile.equipmentToggles as any).squatRack,
          bench: !!(profile.equipmentToggles as any).bench,
          dipBar: !!(profile.equipmentToggles as any).dipBar,
          cable: !!(profile.equipmentToggles as any).cable,
          latPulldown: !!(profile.equipmentToggles as any).latPulldown,
          flyMachine: !!(profile.equipmentToggles as any).flyMachine,
          resistanceBands: !!(profile.equipmentToggles as any).resistanceBands,
          medicineBall: !!(profile.equipmentToggles as any).medicineBall,
        });
      }
    }
  }, [profile]);

  const getSelectedMainFocusSports = () => {
    return SPORTS.filter(s => !!mainFocus[s] && !!activities[s]);
  };

  const mainFocusSportsList = getSelectedMainFocusSports();
  const activeSportsList = SPORTS.filter(s => !!activities[s]);

  // Adjust goals dynamically based on focused sports
  useEffect(() => {
    const activeFocus = getSelectedMainFocusSports();
    const goals = getDynamicGoals(activeFocus);
    if (!goals.includes(trainingGoalType)) {
      setTrainingGoalType('General Fitness');
      setGoalName('General Fitness Target');
      setGoalDistance('');
      setGoalDuration('01:00:00');
    }
    // Only allow setting a goal in a MAIN FOCUS sport
    if (activeFocus.length > 0 && !activeFocus.includes(goalSport as any)) {
      setGoalSport(activeFocus[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, mainFocus]);

  // Balance sport distribution whenever active sports list changes
  useEffect(() => {
    const active = SPORTS.filter(s => !!activities[s]);
    if (active.length === 0) return;

    setSportPercentages(prev => {
      const activeTotal = active.reduce((sum, s) => sum + (prev[s] || 0), 0);
      if (activeTotal === 100) return prev;

      // Distribute 100% proportionally among active sports with focus bias
      const focuses = getSelectedMainFocusSports();
      const updated: Record<string, number> = {};
      const basePerSport = Math.floor(60 / active.length);
      active.forEach(s => {
        const isFocus = focuses.includes(s);
        updated[s] = isFocus ? basePerSport + Math.floor(40 / Math.max(1, focuses.length)) : basePerSport;
      });

      // Normalize to sum exactly 100
      const currentSum = Object.values(updated).reduce((a, b) => a + b, 0);
      if (active.length > 0 && currentSum !== 100) {
        updated[active[0]] += (100 - currentSum);
      }
      return { ...prev, ...updated };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  const handleSelectUnits = (selectedUnits: 'Metric' | 'Imperial') => {
    setUnits(selectedUnits);
    const updatedDist = getDefaultDistanceForGoal(trainingGoalType, selectedUnits);
    if (updatedDist) setGoalDistance(updatedDist);
  };

  const handleSelectGoalType = (goal: string) => {
    setTrainingGoalType(goal);
    setGoalName(`${goal} Target`);
    const defDist = getDefaultDistanceForGoal(goal, units);
    const defDur = getDefaultDurationForGoal(goal);
    if (defDist) setGoalDistance(defDist);
    if (defDur) setGoalDuration(defDur);
  };

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
      // Swimming standard pace: /100m (or /100yd)
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

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    }
  };

  const handleNext = () => {
    if (step === 1 && !displayName.trim()) {
      Alert.alert('Required', 'Please enter your name to proceed.');
      return;
    }
    if (step === 3) {
      const activeSports = SPORTS.filter(s => !!activities[s]);
      if (activeSports.length === 0) {
        Alert.alert('Required', 'Please select at least one active sport.');
        return;
      }
      const focusSports = getSelectedMainFocusSports();
      if (focusSports.length === 0) {
        Alert.alert('Required', 'Please select a Main Focus(es) from your active sports.');
        return;
      }
    }
    if (step === 5 && !goalName.trim()) {
      Alert.alert('Required', 'Please enter or select a name for your goal.');
      return;
    }
    if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1]);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const activeSports = SPORTS.filter(s => !!activities[s]);
      const focusedSports = getSelectedMainFocusSports();
      const equipment = activities.strength
        ? EQUIPMENT_LIST.filter(item => !!equipmentToggles[item.id]).map(item => item.id)
        : ['bodyweight'];

      const formattedGoalDate = format(goalDate, 'yyyy-MM-dd');
      const isCardio = goalSport === 'running' || goalSport === 'cycling' || goalSport === 'swimming';
      const numericDistance = isCardio ? (parseFloat(goalDistance) || undefined) : undefined;
      const totalGoalSeconds = getDurationInSeconds(goalDuration);
      const calculatedPace = isCardio ? calculateTargetPaceOrSpeed() : undefined;

      const fullGoalNotes = [
        goalNotes.trim() || undefined,
        (milestoneCategory === 'other' || isStrengthSport || isStretchingSport) && customBodyArea ? `Target Area: ${customBodyArea}` : undefined,
      ].filter(Boolean).join(' • ');

      const goalPayload: any = {
        name: goalName.trim() || trainingGoalType,
        type: 'Goal',
        date: formattedGoalDate,
        sports: [goalSport],
      };
      if (numericDistance !== undefined) {
        goalPayload.targetDistance = numericDistance;
        goalPayload.targetDistanceUnit = units === 'Imperial' ? 'mi' : 'km';
      }
      if (totalGoalSeconds > 0) {
        goalPayload.targetTime = totalGoalSeconds;
        goalPayload.targetTimeString = goalDuration;
      }
      if (calculatedPace) {
        goalPayload.targetPace = calculatedPace;
      }
      if (fullGoalNotes) {
        goalPayload.notes = fullGoalNotes;
      }

      const updates: any = {
        displayName: displayName.trim(),
        units,
        weekly_hours: weeklyHours,
        activities,
        mainFocus,
        sports: activeSports,
        focused_sports: focusedSports,
        trainingGoalType,
        dailyMaxHours,
        equipmentToggles,
        equipment: equipment.length > 0 ? equipment : ['bodyweight'],
        goal: goalPayload,
        sportPercentages,
        sportSessionsPerWeek: sportSessions,
        wizardCompleted: true,
      };

      await updateUserProfile(user.uid, updates);

      // Create initial Goal event in workouts collection
      try {
        const metaDetails = [
          'Goal',
          format(goalDate, 'MMM d, yyyy'),
          numericDistance ? `${numericDistance} ${units === 'Imperial' ? 'mi' : 'km'}` : null,
          totalGoalSeconds > 0 ? `Target ${goalDuration}` : null,
          calculatedPace ? `(${calculatedPace})` : null
        ].filter(Boolean).join(' • ');

        const goalWorkoutDoc: any = {
          userId: user.uid,
          sport: goalSport as any,
          name: goalName.trim() || `${trainingGoalType} Target`,
          description: fullGoalNotes || `Primary ${trainingGoalType} milestone target`,
          meta: metaDetails,
          date: formattedGoalDate,
          completed: false,
          status: 'planned',
          type: 'Goal',
        };
        if (totalGoalSeconds > 0) {
          goalWorkoutDoc.plannedTime = totalGoalSeconds;
        }
        if (numericDistance !== undefined) {
          goalWorkoutDoc.plannedDistance = numericDistance;
        }

        await createWorkout(goalWorkoutDoc);
      } catch (goalErr) {
        console.error('Failed to create initial goal workout:', goalErr);
      }


      // Regenerate plan for the next week based on new profile settings
      try {
        await regenerateIncompleteGeneratedWorkouts(user.uid, profile?.scheduleDaysAhead || 1);
      } catch (err) {
        console.error('Failed to regenerate workouts during setup:', err);
      }

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Wizard finish error:', error);
      Alert.alert('Error', 'Failed to complete setup wizard');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivity = (sport: typeof SPORTS[number]) => {
    const nextVal = !activities[sport];
    const activeCount = SPORTS.filter(s => !!activities[s]).length;
    if (!nextVal && activeCount <= 1) {
      Alert.alert('Restricted', 'You must have at least one active sport.');
      return;
    }

    setActivities(prev => {
      const next = { ...prev, [sport]: nextVal };
      if (!nextVal && mainFocus[sport]) {
        const nextActive = SPORTS.find(s => s !== sport && next[s]);
        if (nextActive) {
          setMainFocus({
            running: false,
            cycling: false,
            swimming: false,
            strength: false,
            stretching: false,
            [nextActive]: true
          });
        }
      }
      return next;
    });
  };

  const toggleMainFocus = (sport: typeof SPORTS[number]) => {
    if (!activities[sport]) {
      Alert.alert('Restricted', 'Please enable this sport in active sports first.');
      return;
    }

    const currentActiveFocuses = SPORTS.filter(s => !!mainFocus[s] && !!activities[s]);
    const isActive = !!mainFocus[sport];

    if (isActive && currentActiveFocuses.length <= 1) {
      Alert.alert('Restricted', 'You must have at least one main focus.');
      return;
    }

    setMainFocus(prev => ({
      ...prev,
      [sport]: !isActive
    }));
  };

  const handleStravaConnect = async () => {
    if (!user) return;

    if (profile?.stravaConnected) {
      Alert.alert(
        "Disconnect Strava",
        "Are you sure you want to disconnect your Strava account?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: async () => {
              try {
                await updateUserProfile(user.uid, {
                  stravaConnected: false,
                  stravaAccessToken: null as any,
                  stravaRefreshToken: null as any,
                  stravaAthleteId: null as any,
                });
              } catch (err) {
                console.error(err);
              }
            }
          }
        ]
      );
      return;
    }

    try {
      setConnectingStrava(true);
      const STRAVA_CLIENT_ID = "157155";
      const returnUrl = Linking.createURL('/wizard');
      const stateObj = JSON.stringify({ uid: user.uid, return_url: returnUrl });
      const state = encodeURIComponent(stateObj);
      const redirectUri = "https://europe-west2-athlethium-app.cloudfunctions.net/strava_callback";
      const authUrl = `https://www.strava.com/oauth/mobile/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&approval_prompt=auto&scope=activity:read_all,profile:read_all&state=${state}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      if (result.type === 'success' && result.url) {
        const url = Linking.parse(result.url);
        if (url.queryParams?.success === 'true') {
          Alert.alert("Success", "Strava Connected Successfully!");
        } else if (url.queryParams?.error) {
          Alert.alert("Error", `Failed to connect to Strava: ${url.queryParams.error}`);
        }
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Authentication failed: " + (e?.message || ''));
    } finally {
      setConnectingStrava(false);
    }
  };

  const isStepValid = () => {

    if (step === 1) return displayName.trim().length > 0;
    if (step === 3) return SPORTS.filter(s => !!activities[s]).length > 0 && getSelectedMainFocusSports().length > 0;
    if (step === 5) return goalName.trim().length > 0;
    return true;
  };

  const cardBackground = isDark ? '#1c1c1e' : '#f2f2f7';
  const cardBorder = colors.border;

  const weeksUntilGoal = Math.max(1, differenceInWeeks(goalDate, new Date()));
  const isCardioSport = goalSport === 'running' || goalSport === 'cycling' || goalSport === 'swimming';
  const isStrengthSport = goalSport === 'strength';
  const isStretchingSport = goalSport === 'stretching';
  const targetPaceOrSpeed = isCardioSport ? calculateTargetPaceOrSpeed() : null;

  // Active milestone list for Stretching / Strength
  const activeMilestones = isStretchingSport ? STRETCHING_MILESTONES : isStrengthSport ? STRENGTH_MILESTONES : [];
  const filteredMilestones = activeMilestones.filter(m => {
    if (milestoneCategory === 'all') return true;
    return m.category === milestoneCategory;
  });

  const totalAllocatedPercentage = activeSportsList.reduce((sum, s) => sum + (sportPercentages[s] || 0), 0);

  return (
    <ScreenWrapper scrollable={false} withTopInset={true} withBottomInset={true}>
      {/* Apple-style Top Bar Navigation */}
      <View
        style={{
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        {/* Absolutely Centered Apple Step Indicator Capsule */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 10,
            bottom: 10,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 0,
          }}
        >
          <View
            style={{
              paddingHorizontal: 14,
              height: 28,
              borderRadius: Radius.pill,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderWidth: BorderWidth.hairline,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: colors.text, includeFontPadding: false }}>
              {`Step ${displayStepNumber} of ${totalSteps}`}
            </Text>
          </View>
        </View>

        {/* Left Liquid Glass Back Button */}
        <View style={{ zIndex: 1, width: 78, alignItems: 'flex-start' }}>
          {currentStepIndex > 0 ? (
            <GlassButton
              onPress={handleBack}
              shape="pill"
              size="sm"
              style={{ width: 78, height: 34 }}
              contentContainerStyle={{ width: 78, height: 34, minHeight: 34, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <ChevronLeft size={16} color={colors.text} strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, includeFontPadding: false }}>
                  Back
                </Text>
              </View>
            </GlassButton>
          ) : (
            <View style={{ width: 78, height: 34 }} />
          )}
        </View>

        {/* Right Liquid Glass Action Pill */}
        <View style={{ zIndex: 1, width: isLastStep ? 92 : 74, alignItems: 'flex-end' }}>
          {isLastStep ? (
            <GlassButton
              onPress={handleFinish}
              disabled={saving}
              loading={saving}
              variant="glass-primary"
              shape="pill"
              size="sm"
              label="Complete"
              style={{ width: 92, height: 34 }}
              contentContainerStyle={{ width: 92, height: 34, minHeight: 34, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
              textStyle={{ fontSize: 13, fontWeight: '700', color: isDark ? '#4ade80' : '#15803d', includeFontPadding: false }}
            />
          ) : (
            <GlassButton
              onPress={handleNext}
              disabled={!isStepValid()}
              variant={isStepValid() ? "glass-primary" : "glass"}
              shape="pill"
              size="sm"
              label="Next"
              style={{ width: 74, height: 34, opacity: isStepValid() ? 1 : 0.45 }}
              contentContainerStyle={{ width: 74, height: 34, minHeight: 34, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
              textStyle={{
                fontSize: 13,
                fontWeight: '700',
                color: isStepValid() ? (isDark ? '#4ade80' : '#15803d') : colors.textSecondary,
                includeFontPadding: false,
              }}
            />
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
            maxWidth: 480,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: Athlete Name */}
          {step === 1 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <User size={32} color="#0284c7" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Welcome Athlete
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  What should we call you during your training journey?
                </Text>
              </View>

              <View style={{ marginBottom: 24 }}>
                <TextInput
                  style={{
                    height: 54,
                    paddingHorizontal: 18,
                    borderRadius: Radius.lg,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: displayName.trim() ? (isDark ? colors.borderHighlight : '#09090b') : cardBorder,
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: displayName.trim() ? '600' : '400',
                  }}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoFocus={true}
                  onSubmitEditing={handleNext}
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          {/* STEP 2: Preferences & Target weekly training hours */}
          {step === 2 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <Sparkles size={32} color="#8b5cf6" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Preferences
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Choose your measurement units and target weekly training hours.
                </Text>
              </View>

              {/* Units Selector */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10, marginLeft: 4 }}>
                Measurement Units
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={() => handleSelectUnits('Metric')}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: Radius.lg,
                    backgroundColor: units === 'Metric' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: units === 'Metric' ? colors.primary : cardBorder,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: units === 'Metric' ? colors.primary : colors.text }}>
                    Metric
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    km / kg / °C
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectUnits('Imperial')}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: Radius.lg,
                    backgroundColor: units === 'Imperial' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: units === 'Imperial' ? colors.primary : cardBorder,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: units === 'Imperial' ? colors.primary : colors.text }}>
                    Imperial
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    mi / lbs / °F
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10, marginLeft: 4 }}>
                Target weekly training hours
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 20,
                  borderRadius: Radius.xl,
                  backgroundColor: cardBackground,
                  borderWidth: BorderWidth.hairline,
                  borderColor: cardBorder,
                  marginBottom: 24,
                }}
              >
                <View>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>
                    {weeklyHours} <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>hours / week</Text>
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                    ~{(weeklyHours / 7).toFixed(1)} hrs daily average
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setWeeklyHours(prev => Math.max(1, prev - 1))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: Radius.pill,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>-</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setWeeklyHours(prev => Math.min(30, prev + 1))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: Radius.pill,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Sports & Focus */}
          {step === 3 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <Flame size={32} color="#f97316" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Sports & Focus
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Enable your disciplines and tap the star to select your main focus.
                </Text>
              </View>

              <View style={{ gap: 10, marginBottom: 24 }}>
                {SPORTS.map((sport) => {
                  const isActive = !!activities[sport];
                  const isFocus = !!mainFocus[sport];

                  return (
                    <View
                      key={sport}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: Radius.xl,
                        backgroundColor: cardBackground,
                        borderWidth: BorderWidth.hairline,
                        borderColor: isFocus ? colors.primary : cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: isActive ? colors.text : colors.textSecondary, textTransform: 'capitalize' }}>
                          {sport}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {isActive && (
                          <TouchableOpacity
                            onPress={() => toggleMainFocus(sport)}
                            activeOpacity={0.7}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: Radius.pill,
                              backgroundColor: isFocus ? (isDark ? 'rgba(234, 179, 8, 0.20)' : 'rgba(234, 179, 8, 0.12)') : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Star
                              size={22}
                              color={isFocus ? '#eab308' : colors.textSecondary}
                              fill={isFocus ? '#eab308' : 'transparent'}
                            />
                          </TouchableOpacity>
                        )}

                        <Switch
                          value={isActive}
                          onValueChange={() => toggleActivity(sport)}
                          trackColor={{ true: colors.primary }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 4: Primary Goal */}
          {step === 4 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <Target size={32} color="#3b82f6" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Primary Goal
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Select your overall training discipline target.
                </Text>
              </View>

              <View style={{ gap: 8, marginBottom: 24 }}>
                {getDynamicGoals(mainFocusSportsList).map((goal) => {
                  const isSelected = trainingGoalType === goal;
                  return (
                    <TouchableOpacity
                      key={goal}
                      onPress={() => handleSelectGoalType(goal)}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 18,
                        borderRadius: Radius.xl,
                        backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                        borderWidth: BorderWidth.thin,
                        borderColor: isSelected ? colors.primary : cardBorder,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: isSelected ? colors.primary : colors.text,
                          flex: 1,
                          marginRight: 12,
                        }}
                      >
                        {goal}
                      </Text>
                      {isSelected && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 5: Goal Event / Milestone Setup (Only Main Focus Sports) */}
          {step === 5 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <Flag size={32} color="#f59e0b" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Set Your Goal
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Target specific milestones and dates for your main focus.
                </Text>
              </View>

              {/* Goal Sport Selector - RESTRICTED TO MAIN FOCUS ONLY */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    MAIN FOCUS SPORT
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    ★ Focused Sports Only
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {mainFocusSportsList.map(sport => {
                    const isSelected = goalSport === sport;
                    return (
                      <TouchableOpacity
                        key={sport}
                        onPress={() => {
                          setGoalSport(sport);
                          if (sport === 'stretching') {
                            setGoalName('Full Front Splits');
                            setGoalNotes('Flat ground front splits mobility');
                          } else if (sport === 'strength') {
                            setGoalName('10 Strict Pull-ups');
                            setGoalNotes('10 consecutive strict reps');
                          } else if (sport === 'swimming') {
                            setGoalName('1500m Swim Target');
                            setGoalDistance('1500');
                          } else {
                            const defDist = getDefaultDistanceForGoal(trainingGoalType, units);
                            if (defDist) setGoalDistance(defDist);
                            setGoalName(`${trainingGoalType} Target`);
                          }
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: Radius.pill,
                          backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                          borderWidth: BorderWidth.thin,
                          borderColor: isSelected ? colors.primary : cardBorder,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? colors.primary : colors.text, textTransform: 'capitalize' }}>
                          ★ {sport}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* STRETCHING / STRENGTH: Dropdown Picker Button */}
              {(isStretchingSport || isStrengthSport) && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8, marginLeft: 4 }}>
                    {isStretchingSport ? 'FLEXIBILITY MILESTONE / FOCUS' : 'STRENGTH BENCHMARK / FOCUS'}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowMilestonePicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      height: 54,
                      borderRadius: Radius.lg,
                      backgroundColor: cardBackground,
                      borderWidth: BorderWidth.thin,
                      borderColor: cardBorder,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        {goalName || (isStretchingSport ? 'Select Flexibility Milestone' : 'Select Strength Benchmark')}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' }} numberOfLines={1}>
                        Category: {milestoneCategory === 'all' ? 'All Focus Areas' : milestoneCategory}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: Radius.pill,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronDown size={18} color={colors.text} />
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* OTHER / CUSTOM SUB-SELECTOR: Target Body Area (Core, Upper Body, Lower Body, All Body) */}
              {(milestoneCategory === 'other' || isStrengthSport || isStretchingSport) && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8, marginLeft: 4 }}>
                    TARGET ANATOMICAL AREA FOR ALGORITHM
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['all', 'core', 'upper', 'lower'] as const).map(area => {
                      const isSelected = customBodyArea === area;
                      const areaLabels: Record<BodyArea, string> = {
                        all: 'All Body',
                        core: 'Core',
                        upper: 'Upper Body',
                        lower: 'Lower Body / Legs',
                      };
                      return (
                        <TouchableOpacity
                          key={area}
                          onPress={() => setCustomBodyArea(area)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: Radius.lg,
                            backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                            borderWidth: BorderWidth.thin,
                            borderColor: isSelected ? colors.primary : cardBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primary : colors.text, textAlign: 'center' }}>
                            {areaLabels[area]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Goal Name / Custom Input Field */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8, marginLeft: 4 }}>
                  {isStretchingSport ? 'CUSTOM GOAL / MILESTONE NAME' : isStrengthSport ? 'CUSTOM TARGET / BENCHMARK NAME' : 'GOAL / EVENT NAME'}
                </Text>
                <TextInput
                  style={{
                    height: 52,
                    paddingHorizontal: 16,
                    borderRadius: Radius.lg,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: goalName.trim() ? (isDark ? colors.borderHighlight : '#09090b') : cardBorder,
                    color: colors.text,
                    fontSize: 16,
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
                  value={goalName}
                  onChangeText={setGoalName}
                />
              </View>

              {/* CARDIO / ENDURANCE: Target Distance */}
              {isCardioSport && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                      {goalSport === 'swimming' ? 'TARGET SWIM DISTANCE (METERS / YARDS)' : `TARGET DISTANCE (${units === 'Imperial' ? 'MILES' : 'KILOMETERS'})`}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                      {goalSport === 'swimming' ? (units === 'Imperial' ? 'Yards' : 'Meters') : (units === 'Imperial' ? 'Imperial (mi)' : 'Metric (km)')}
                    </Text>
                  </View>

                  {/* Quick Distance Presets */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
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
                          paddingVertical: 8,
                          borderRadius: Radius.md,
                          backgroundColor: goalDistance === p.val ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                          borderWidth: BorderWidth.thin,
                          borderColor: goalDistance === p.val ? colors.primary : cardBorder,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: goalDistance === p.val ? colors.primary : colors.textSecondary }}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {goalSport === 'cycling' && [
                      { label: units === 'Imperial' ? '12.5m' : '20k', val: units === 'Imperial' ? '12.5' : '20.0' },
                      { label: units === 'Imperial' ? '25m (TT)' : '40k (TT)', val: units === 'Imperial' ? '25.0' : '40.0' },
                      { label: units === 'Imperial' ? '50m' : '80k', val: units === 'Imperial' ? '50.0' : '80.0' },
                      { label: units === 'Imperial' ? '100m' : '160k', val: units === 'Imperial' ? '100.0' : '160.0' },
                    ].map(p => (
                      <TouchableOpacity
                        key={p.label}
                        onPress={() => setGoalDistance(p.val)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: Radius.md,
                          backgroundColor: goalDistance === p.val ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                          borderWidth: BorderWidth.thin,
                          borderColor: goalDistance === p.val ? colors.primary : cardBorder,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: goalDistance === p.val ? colors.primary : colors.textSecondary }}>
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
                          paddingVertical: 8,
                          borderRadius: Radius.md,
                          backgroundColor: goalDistance === p.val ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                          borderWidth: BorderWidth.thin,
                          borderColor: goalDistance === p.val ? colors.primary : cardBorder,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: goalDistance === p.val ? colors.primary : colors.textSecondary }}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Distance Input */}
                  <TextInput
                    style={{
                      height: 52,
                      paddingHorizontal: 16,
                      borderRadius: Radius.lg,
                      backgroundColor: cardBackground,
                      borderWidth: BorderWidth.thin,
                      borderColor: goalDistance.trim() ? (isDark ? colors.borderHighlight : '#09090b') : cardBorder,
                      color: colors.text,
                      fontSize: 16,
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

              {/* CARDIO: Target Finish Time (HH:MM:SS) & Calculated Pace Badge */}
              {isCardioSport && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                      TARGET FINISH TIME (HH:MM:SS)
                    </Text>
                    {targetPaceOrSpeed && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Zap size={12} color={colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                          {targetPaceOrSpeed}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      height: 52,
                      paddingHorizontal: 16,
                      borderRadius: Radius.lg,
                      backgroundColor: cardBackground,
                      borderWidth: BorderWidth.thin,
                      borderColor: cardBorder,
                    }}
                  >
                    <Timer size={18} color={colors.primary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: 16,
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

              {/* Target Date Section */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    TARGET EVENT DATE
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    {weeksUntilGoal} weeks away
                  </Text>
                </View>

                {/* Timeline Presets */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {[8, 12, 16, 24].map(w => {
                    const isSelected = weeksUntilGoal === w;
                    return (
                      <TouchableOpacity
                        key={w}
                        onPress={() => setGoalDate(addWeeks(new Date(), w))}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: Radius.lg,
                          backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                          borderWidth: BorderWidth.thin,
                          borderColor: isSelected ? colors.primary : cardBorder,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                          +{w}w
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Date display & picker toggle */}
                <TouchableOpacity
                  onPress={() => setShowGoalDatePicker(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    height: 52,
                    borderRadius: Radius.lg,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: cardBorder,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CalendarIcon size={18} color={colors.primary} />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                      {format(goalDate, 'MMMM d, yyyy')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                    Change Date
                  </Text>
                </TouchableOpacity>

                {/* iOS Date Picker Modal with Done button */}
                {Platform.OS === 'ios' ? (
                  <Modal visible={showGoalDatePicker} transparent animationType="slide">
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
                      activeOpacity={1}
                      onPress={() => setShowGoalDatePicker(false)}
                    >
                      <View
                        style={{
                          backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                          borderTopLeftRadius: 28,
                          borderTopRightRadius: 28,
                          borderTopWidth: BorderWidth.hairline,
                          borderColor: cardBorder,
                          padding: 20,
                          paddingBottom: Math.max(insets.bottom, 24),
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                            Select Target Date
                          </Text>
                          <GlassButton
                            onPress={() => setShowGoalDatePicker(false)}
                            shape="pill"
                            size="sm"
                            variant="glass-primary"
                            label="Done"
                            style={{ height: 34, minWidth: 64 }}
                          />
                        </View>

                        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 8 }}>
                          <DateTimePicker
                            value={goalDate}
                            mode="date"
                            display="spinner"
                            minimumDate={new Date()}
                            onChange={(_event, selected) => {
                              if (selected) setGoalDate(selected);
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
                  showGoalDatePicker && (
                    <DateTimePicker
                      value={goalDate}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(_event, selected) => {
                        setShowGoalDatePicker(false);
                        if (selected) setGoalDate(selected);
                      }}
                    />
                  )
                )}
              </View>

              {/* Target Notes / Focus Description */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8, marginLeft: 4 }}>
                  {isStretchingSport ? 'MOBILITY FOCUS / NOTES (OPTIONAL)' : isStrengthSport ? 'BENCHMARK METRICS / NOTES (OPTIONAL)' : 'TARGET NOTES (OPTIONAL)'}
                </Text>
                <TextInput
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: Radius.lg,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: cardBorder,
                    color: colors.text,
                    fontSize: 15,
                    minHeight: 48,
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
                />
              </View>
            </View>
          )}

          {/* STEP 6: Sport Time Allocation & Session Frequency */}
          {step === 6 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <PieChart size={32} color="#06b6d4" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Training Distribution
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Allocate what portion of your {weeklyHours} weekly hours or sessions to assign each sport.
                </Text>
              </View>

              {/* Mode Toggle: Percentage vs Weekly Sessions */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setAllocationMode('percentage')}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: Radius.lg,
                    backgroundColor: allocationMode === 'percentage' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: allocationMode === 'percentage' ? colors.primary : cardBorder,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: allocationMode === 'percentage' ? colors.primary : colors.text }}>
                    % Time Split
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAllocationMode('sessions')}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: Radius.lg,
                    backgroundColor: allocationMode === 'sessions' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: allocationMode === 'sessions' ? colors.primary : cardBorder,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: allocationMode === 'sessions' ? colors.primary : colors.text }}>
                    Weekly Sessions
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Multi-sport Stacked Progress Bar (for Percentage Mode) */}
              {allocationMode === 'percentage' && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                      TOTAL ALLOCATED
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: totalAllocatedPercentage === 100 ? colors.primary : '#ef4444' }}>
                      {totalAllocatedPercentage}% / 100%
                    </Text>
                  </View>

                  <View
                    style={{
                      height: 10,
                      width: '100%',
                      borderRadius: Radius.pill,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      flexDirection: 'row',
                      overflow: 'hidden',
                    }}
                  >
                    {activeSportsList.map(sport => {
                      const pct = sportPercentages[sport] || 0;
                      if (pct <= 0) return null;
                      return (
                        <View
                          key={sport}
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: SPORT_COLORS[sport] || colors.primary,
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Sport Split Cards */}
              <View style={{ gap: 10, marginBottom: 24 }}>
                {activeSportsList.map(sport => {
                  const isFocus = mainFocusSportsList.includes(sport);
                  const pct = sportPercentages[sport] || 0;
                  const sess = sportSessions[sport] || 1;
                  const estimatedHours = ((pct / 100) * weeklyHours).toFixed(1);

                  return (
                    <View
                      key={sport}
                      style={{
                        padding: 16,
                        borderRadius: Radius.xl,
                        backgroundColor: cardBackground,
                        borderWidth: BorderWidth.hairline,
                        borderColor: isFocus ? colors.primary : cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: SPORT_COLORS[sport] || colors.primary,
                            }}
                          />
                          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>
                            {sport} {isFocus && <Text style={{ color: colors.primary, fontSize: 13 }}>★ Main Focus</Text>}
                          </Text>
                        </View>

                        {allocationMode === 'percentage' ? (
                          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                            {pct}% <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>({estimatedHours}h/wk)</Text>
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                            {sess} <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{sess === 1 ? 'session' : 'sessions'}/wk</Text>
                          </Text>
                        )}
                      </View>

                      {/* Steppers */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                        {allocationMode === 'percentage' ? (
                          <>
                            <TouchableOpacity
                              onPress={() => {
                                setSportPercentages(prev => ({
                                  ...prev,
                                  [sport]: Math.max(0, (prev[sport] || 0) - 5)
                                }));
                              }}
                              style={{
                                minWidth: 52,
                                height: 36,
                                paddingHorizontal: 10,
                                borderRadius: Radius.pill,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>-5%</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                setSportPercentages(prev => ({
                                  ...prev,
                                  [sport]: Math.min(100, (prev[sport] || 0) + 5)
                                }));
                              }}
                              style={{
                                minWidth: 52,
                                height: 36,
                                paddingHorizontal: 10,
                                borderRadius: Radius.pill,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>+5%</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              onPress={() => {
                                setSportSessions(prev => ({
                                  ...prev,
                                  [sport]: Math.max(1, (prev[sport] || 1) - 1)
                                }));
                              }}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: Radius.pill,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>-</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => {
                                setSportSessions(prev => ({
                                  ...prev,
                                  [sport]: Math.min(14, (prev[sport] || 1) + 1)
                                }));
                              }}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: Radius.pill,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>+</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 7: Default Daily Availability */}
          {step === 7 && (() => {
            const totalWeeklyAvailability = Object.values(dailyMaxHours).reduce((sum, h) => sum + (h || 0), 0);
            const isCapacitySufficient = totalWeeklyAvailability >= weeklyHours;

            return (
              <View>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <View
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: Radius.xl,
                      backgroundColor: cardBackground,
                      borderWidth: BorderWidth.hairline,
                      borderColor: cardBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.4 : 0.08,
                      shadowRadius: 12,
                    }}
                  >
                    <Clock size={32} color="#ec4899" strokeWidth={2} />
                  </View>
                </View>

                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                    Default Daily Availability
                  </Text>
                  <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                    Set your typical available training hours. Specific days can always be customized on your training calendar.
                  </Text>
                </View>

                {/* Total Capacity Summary vs Target Hours Card */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: isCapacitySufficient ? cardBorder : '#ef4444',
                    marginBottom: 20,
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>
                      Total Available Capacity
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: isCapacitySufficient ? colors.primary : '#ef4444', marginTop: 2 }}>
                      {totalWeeklyAvailability.toFixed(1)} <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>hours / week</Text>
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: Radius.pill,
                        backgroundColor: isCapacitySufficient ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.10)'),
                        borderWidth: BorderWidth.hairline,
                        borderColor: isCapacitySufficient ? colors.primary : '#ef4444',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isCapacitySufficient ? colors.primary : '#ef4444' }}>
                        Target: {weeklyHours}h
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Daily Availability Cards */}
                <View style={{ gap: 10, marginBottom: 20 }}>
                  {DAYS_OF_WEEK.map((day) => {
                    const hours = dailyMaxHours[day] ?? 1.5;
                    const isRest = hours === 0;
                    const canDecrease = hours > 0 && (totalWeeklyAvailability - 0.5 >= weeklyHours);

                    return (
                      <View
                        key={day}
                        style={{
                          padding: 16,
                          borderRadius: Radius.xl,
                          backgroundColor: cardBackground,
                          borderWidth: BorderWidth.hairline,
                          borderColor: isRest ? cardBorder : colors.primary,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: isRest ? colors.textSecondary : colors.primary,
                              }}
                            />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                              {day}
                            </Text>
                          </View>

                          <Text style={{ fontSize: 16, fontWeight: '800', color: isRest ? colors.textSecondary : colors.primary }}>
                            {isRest ? 'Rest Day' : `${hours} hrs`}
                          </Text>
                        </View>

                        {/* Steppers */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (totalWeeklyAvailability - 0.5 < weeklyHours) {
                                Alert.alert(
                                  'Minimum Target Reached',
                                  `Total available hours cannot go below your Target Weekly Training Hours (${weeklyHours} hrs).`
                                );
                                return;
                              }
                              setDailyMaxHours(prev => ({
                                ...prev,
                                [day]: Math.max(0, Math.round((hours - 0.5) * 10) / 10)
                              }));
                            }}
                            style={{
                              minWidth: 52,
                              height: 36,
                              paddingHorizontal: 10,
                              borderRadius: Radius.pill,
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: canDecrease ? 1 : 0.4,
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>-0.5h</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setDailyMaxHours(prev => ({
                                ...prev,
                                [day]: Math.min(8, Math.round((hours + 0.5) * 10) / 10)
                              }));
                            }}
                            style={{
                              minWidth: 52,
                              height: 36,
                              paddingHorizontal: 10,
                              borderRadius: Radius.pill,
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>+0.5h</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* STEP 8: Equipment (Styled like Select Active Sports) */}
          {step === 8 && activities.strength && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <Dumbbell size={32} color="#eab308" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Strength Equipment
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Select equipment you have available for workouts.
                </Text>
              </View>

              <View style={{ gap: 10, marginBottom: 24 }}>
                {EQUIPMENT_LIST.map((item) => {
                  const isChecked = !!equipmentToggles[item.id];

                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: Radius.xl,
                        backgroundColor: cardBackground,
                        borderWidth: BorderWidth.hairline,
                        borderColor: isChecked ? colors.primary : cardBorder,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '700', color: isChecked ? colors.text : colors.textSecondary, flex: 1, marginRight: 12 }}>
                        {item.label}
                      </Text>

                      <Switch
                        value={isChecked}
                        onValueChange={() => {
                          setEquipmentToggles(prev => ({
                            ...prev,
                            [item.id]: !prev[item.id]
                          }));
                        }}
                        trackColor={{ true: colors.primary }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 9: Partner Integrations */}
          {step === 9 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <Link2 size={32} color="#ea580c" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Partner Integrations
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Connect your training platforms to automatically sync activities, GPS, and power data.
                </Text>
              </View>

              <View style={{ gap: 12, marginBottom: 24 }}>
                {/* Strava Integration Card */}
                <View
                  style={{
                    padding: 18,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: profile?.stravaConnected ? colors.primary : cardBorder,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: Radius.lg,
                          backgroundColor: 'rgba(234, 88, 12, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Link2 size={24} color="#ea580c" strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                          Strava
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          Rides, Runs, Swims & GPS Activities
                        </Text>
                      </View>
                    </View>

                    {profile?.stravaConnected && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: Radius.pill,
                          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(22, 163, 74, 0.12)',
                        }}
                      >
                        <Check size={14} color={colors.primary} strokeWidth={3} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Connected</Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 }}>
                    Automatically imports your completed workouts, power duration curves, heart rate, and GPS tracks.
                  </Text>

                  <GlassButton
                    onPress={handleStravaConnect}
                    disabled={connectingStrava}
                    loading={connectingStrava}
                    variant={profile?.stravaConnected ? 'glass' : 'glass-primary'}
                    shape="pill"
                    size="sm"
                    glowColor={profile?.stravaConnected ? undefined : "#ea580c"}
                    style={{ width: '100%', height: 42 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {profile?.stravaConnected ? (
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
                          Disconnect Strava
                        </Text>
                      ) : (
                        <>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
                            Connect with Strava
                          </Text>
                          <ExternalLink size={16} color="#ffffff" strokeWidth={2.2} />
                        </>
                      )}
                    </View>
                  </GlassButton>
                </View>

                {/* Garmin Connect Card (Coming Soon) */}
                <View
                  style={{
                    padding: 16,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    opacity: 0.75,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: Radius.lg,
                          backgroundColor: 'rgba(37, 99, 235, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Link2 size={22} color="#2563eb" strokeWidth={2.2} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                          Garmin Connect
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                          Edge, Forerunner & Fenix devices
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: Radius.md,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>
                        COMING SOON
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Wahoo ELEMNT Card (Coming Soon) */}
                <View
                  style={{
                    padding: 16,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    opacity: 0.75,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: Radius.lg,
                          backgroundColor: 'rgba(71, 85, 105, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Link2 size={22} color="#64748b" strokeWidth={2.2} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                          Wahoo ELEMNT
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                          ELEMNT GPS bike computers
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: Radius.md,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>
                        COMING SOON
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' }}>
                You can also connect, disconnect, or manage accounts anytime in Settings.
              </Text>
            </View>
          )}

          {/* STEP 10: Summary & Plan Review */}
          {step === 10 && (
            <View>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: Radius.xl,
                    backgroundColor: cardBackground,
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.4 : 0.08,
                    shadowRadius: 12,
                  }}
                >
                  <Award size={32} color="#22c55e" strokeWidth={2} />
                </View>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
                  Ready to Train
                </Text>
                <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                  Review your personalized profile configurations.
                </Text>
              </View>

              <View
                style={{
                  borderRadius: Radius.xl,
                  backgroundColor: cardBackground,
                  borderWidth: BorderWidth.hairline,
                  borderColor: cardBorder,
                  padding: 20,
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', paddingBottom: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Athlete Name</Text>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{displayName}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', paddingBottom: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Metrics Units</Text>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{units}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', paddingBottom: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Target Weekly Hours</Text>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{weeklyHours} hours</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', paddingBottom: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Main Focus</Text>
                  <Text style={{ fontWeight: '700', color: colors.text, textTransform: 'capitalize', fontSize: 14 }}>
                    {mainFocusSportsList.join(', ')}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', paddingBottom: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Primary Goal</Text>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{trainingGoalType}</Text>
                </View>

                {/* Multi-line Time Distribution Breakdown */}
                <View style={{ borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Time Distribution</Text>
                    <Text style={{ fontWeight: '600', color: colors.textSecondary, fontSize: 12 }}>
                      {weeklyHours}h / week total
                    </Text>
                  </View>
                  <View style={{ gap: 6, paddingLeft: 4 }}>
                    {activeSportsList.map(sport => {
                      const pct = sportPercentages[sport] || 0;
                      const hrs = ((pct / 100) * weeklyHours).toFixed(1);
                      const sess = sportSessions[sport] || 1;
                      const isFocus = mainFocusSportsList.includes(sport);

                      return (
                        <View key={sport} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: SPORT_COLORS[sport] || colors.primary,
                              }}
                            />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>
                              {sport} {isFocus && <Text style={{ color: colors.primary, fontSize: 12 }}>★</Text>}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                            {pct}% <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>({hrs}h • {sess}x/wk)</Text>
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', paddingBottom: 10 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Target Milestone</Text>
                  <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14, textAlign: 'right' }}>
                      {goalName}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, textAlign: 'right' }}>
                      {format(goalDate, 'MMM d, yyyy')}
                      {isCardioSport && goalDistance ? ` • ${goalDistance} ${goalSport === 'swimming' ? (units === 'Imperial' ? 'yd' : 'm') : (units === 'Imperial' ? 'mi' : 'km')}` : ''}
                      {isCardioSport && goalDuration ? ` • ${goalDuration}` : ''}
                      {targetPaceOrSpeed ? ` (${targetPaceOrSpeed})` : ''}
                      {goalNotes ? ` • ${goalNotes}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Partner Integration Review Item */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Integrations</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {profile?.stravaConnected ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Check size={14} color={colors.primary} strokeWidth={3} />
                        <Text style={{ fontWeight: '700', color: colors.primary, fontSize: 14 }}>Strava Connected</Text>
                      </View>
                    ) : (
                      <Text style={{ fontWeight: '600', color: colors.textSecondary, fontSize: 14 }}>Standalone</Text>
                    )}
                  </View>
                </View>
              </View>

              {saving && (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary }}>
                    Generating personalized training plan...
                  </Text>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MILESTONE SELECTION MODAL (Dropdown Sheet for Strength & Stretching) */}
      <Modal visible={showMilestonePicker} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowMilestonePicker(false)}
        >
          <View
            style={{
              backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: BorderWidth.hairline,
              borderColor: cardBorder,
              paddingTop: 20,
              paddingHorizontal: 20,
              paddingBottom: Math.max(insets.bottom, 24),
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {isStretchingSport ? 'Select Flexibility Target' : 'Select Strength Benchmark'}
              </Text>
              <GlassButton
                onPress={() => setShowMilestonePicker(false)}
                shape="pill"
                size="sm"
                variant="glass-primary"
                label="Done"
                style={{ height: 34, minWidth: 64 }}
              />
            </View>

            {/* Category Segmented Filter Tabs: All, Legs, Core, Upper Body, Other */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
              {(['all', 'legs', 'core', 'upper', 'other'] as const).map(cat => {
                const isSelected = milestoneCategory === cat;
                const catLabels: Record<TargetCategory, string> = {
                  all: 'All Areas',
                  legs: 'Legs',
                  core: 'Core',
                  upper: 'Upper Body',
                  other: 'Other / Custom',
                };

                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setMilestoneCategory(cat);
                      if (cat === 'other') {
                        setGoalName('');
                        setGoalNotes('Custom milestone target');
                        setShowMilestonePicker(false);
                      }
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: Radius.pill,
                      backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(22, 163, 74, 0.12)') : cardBackground,
                      borderWidth: BorderWidth.thin,
                      borderColor: isSelected ? colors.primary : cardBorder,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                      {catLabels[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Milestone Options List */}
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8, paddingBottom: 16 }}>
                {filteredMilestones.map(m => {
                  const isSelected = goalName === m.label;
                  return (
                    <TouchableOpacity
                      key={m.label}
                      onPress={() => {
                        setGoalName(m.label);
                        setGoalNotes(m.note);
                        setShowMilestonePicker(false);
                      }}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderRadius: Radius.xl,
                        backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                        borderWidth: BorderWidth.thin,
                        borderColor: isSelected ? colors.primary : cardBorder,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                          {m.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>
                          {m.note}
                        </Text>
                      </View>
                      {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}

                {/* Other Option */}
                <TouchableOpacity
                  onPress={() => {
                    setMilestoneCategory('other');
                    setGoalName('');
                    setGoalNotes('Custom milestone target');
                    setShowMilestonePicker(false);
                  }}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderRadius: Radius.xl,
                    backgroundColor: milestoneCategory === 'other' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                    borderWidth: BorderWidth.thin,
                    borderColor: milestoneCategory === 'other' ? colors.primary : cardBorder,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: milestoneCategory === 'other' ? colors.primary : colors.text }}>
                      Other / Custom Target
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>
                      Select target anatomical area and enter custom movement
                    </Text>
                  </View>
                  {milestoneCategory === 'other' && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Apple-style Bottom Progress Bar */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 14),
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            height: 4,
            width: '100%',
            borderRadius: 999,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${(displayStepNumber / totalSteps) * 100}%`,
              borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}
