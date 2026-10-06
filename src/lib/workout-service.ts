import { callFunction } from './api';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp, serverTimestamp, getDocs, getDoc, deleteDoc, deleteField } from "firebase/firestore";

// ... (keep existing imports)

export const deleteWorkout = async (workoutId: string) => {
  try {
    const docRef = doc(db, "workouts", workoutId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting workout:", error);
    throw error;
  }
};

import { db } from "./firebase";
import { ActivityType, SessionSegment, WorkoutStep } from "@/types/activity";
import { addDays, format, isSameDay, startOfDay, endOfDay } from "date-fns";

export interface Workout {
  id?: string;
  workoutId?: string;
  userId: string;
  sport: string; // aligned with ActivityType
  name: string;
  description: string;
  meta?: string;
  date: string; // YYYY-MM-DD string as per requirements
  completed: boolean;
  status: 'planned' | 'completed' | 'skipped';
  intensity?: number; // -1 (Rest) to 7 (Sprint)
  coach_rationale?: string;
  execution_tips?: string;
  targetType?: string; // power, heart_rate, pace, reps, time
  steps?: WorkoutStep[];
  segments?: SessionSegment[];
  type?: string; // 'Session', 'Event', 'Goal'
  completedAt?: any;
  createdAt?: any;
  stats?: any;
  stravaId?: string;
  tss?: number; // Actual TSS
  time?: number; // Actual Time in seconds
  plannedTime?: number; // Planned time in seconds
  plannedTss?: number;
  plannedDistance?: number;
  source?: string;
  fit_file_url?: string; // legacy public URL (no longer written)
  fit_file_path?: string; // private Cloud Storage path, server-only access
  actual_time?: number;
  actual_tss?: number;
  completion_type?: string;
}

const toPositiveNumber = (value: any): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const deriveWorkoutFthr = (workout: any): number | null => {
  const directFthr = toPositiveNumber(
    workout?.fthr ??
    workout?.threshold_hr ??
    workout?.thresholdHeartRate ??
    workout?.stats?.fthr ??
    workout?.stats?.threshold_hr ??
    workout?.stats?.thresholdHeartRate
  );

  if (directFthr) return Math.round(directFthr);

  const avgHr = toPositiveNumber(
    workout?.avg_heart_rate ??
    workout?.avgHeartRate ??
    workout?.stats?.avg_heart_rate ??
    workout?.stats?.avgHeartRate
  );

  if (avgHr) return Math.round(avgHr * 0.95);

  const maxHr = toPositiveNumber(
    workout?.max_heart_rate ??
    workout?.maxHeartRate ??
    workout?.stats?.max_heart_rate ??
    workout?.stats?.maxHeartRate
  );

  if (maxHr) return Math.round(maxHr * 0.9);

  return null;
};

const getWorkoutSortTimestampMs = (workout: any): number => {
  const completedAt = workout?.completedAt;

  if (completedAt?.toMillis && typeof completedAt.toMillis === 'function') {
    return completedAt.toMillis();
  }

  if (typeof completedAt?.seconds === 'number') {
    return completedAt.seconds * 1000;
  }

  if (typeof completedAt === 'string') {
    const parsed = Date.parse(completedAt);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (typeof workout?.date === 'string') {
    const parsedDate = Date.parse(workout.date);
    if (!Number.isNaN(parsedDate)) return parsedDate;
  }

  return 0;
};

export const getAutoCalculatedFthr = async (userId: string) => {
  const workoutRef = collection(db, "workouts");
  const q = query(workoutRef, where("userId", "==", userId));

  const snap = await getDocs(q);
  const completedWorkouts = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as any)
    .filter(workout => workout.completed || workout.status === 'completed');

  if (completedWorkouts.length === 0) {
    return { best: null as number | null, last: null as number | null, recommended: null as number | null };
  }

  const withFthr = completedWorkouts
    .map(workout => ({
      workout,
      fthr: deriveWorkoutFthr(workout),
      sortTs: getWorkoutSortTimestampMs(workout),
    }))
    .filter(item => !!item.fthr) as { workout: any; fthr: number; sortTs: number }[];

  if (withFthr.length === 0) {
    return { best: null as number | null, last: null as number | null, recommended: null as number | null };
  }

  const best = withFthr.reduce((max, item) => Math.max(max, item.fthr), 0);
  const last = withFthr.sort((a, b) => b.sortTs - a.sortTs)[0]?.fthr ?? null;
  const recommended = Math.max(best || 0, last || 0) || null;

  return { best, last, recommended };
};

export const generateTrainingSessionForDate = async (_userId: string, date: string) => {
  // The backend takes the user from the ID token; _userId is kept for call-site compatibility.
  await callFunction('generate_training_session', { date });
};

const hasWorkoutForDate = async (userId: string, date: string) => {
  const workoutRef = collection(db, "workouts");
  const q = query(
    workoutRef,
    where("userId", "==", userId),
    where("date", "==", date)
  );

  const snap = await getDocs(q);
  return !snap.empty;
};

const isAutoGeneratedWorkout = (workout: any) => {
  return (
    workout?.event_type === 'Training' ||
    workout?.tss_type === 'estimated' ||
    typeof workout?.workoutId === 'string'
  );
};

const normalizeWorkoutDate = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    return value.length >= 10 ? value.slice(0, 10) : null;
  }
  if (value?.toDate && typeof value.toDate === 'function') {
    return format(value.toDate(), 'yyyy-MM-dd');
  }
  if (value instanceof Date) {
    return format(value, 'yyyy-MM-dd');
  }
  return null;
};

export const regenerateIncompleteGeneratedWorkouts = async (userId: string, scheduleDaysAhead: number) => {
  const horizon = Math.max(1, Math.floor(scheduleDaysAhead || 1));
  const today = format(new Date(), 'yyyy-MM-dd');
  const lastDate = format(addDays(new Date(), horizon - 1), 'yyyy-MM-dd');

  const workoutRef = collection(db, "workouts");
  const q = query(workoutRef, where("userId", "==", userId));
  const snap = await getDocs(q);

  const docsToDelete = snap.docs.filter((docSnap) => {
    const workout = docSnap.data() as any;
    const normalizedDate = normalizeWorkoutDate(workout?.date);
    const inWindow = !!normalizedDate && normalizedDate >= today && normalizedDate <= lastDate;
    const incomplete = !workout?.completed && workout?.status !== 'completed';

    return inWindow && incomplete && isAutoGeneratedWorkout(workout);
  });

  await Promise.all(docsToDelete.map((docSnap) => deleteDoc(doc(db, "workouts", docSnap.id))));

  const generatedCount = await generateMissingTrainingDays(userId, horizon);

  return {
    deletedCount: docsToDelete.length,
    generatedCount,
  };
};

export const generateMissingTrainingDays = async (userId: string, scheduleDaysAhead: number) => {
  // Check if user has completed setup wizard first
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data?.wizardCompleted) {
        console.log(`Skipping plan generation for user ${userId} - setup wizard not completed yet.`);
        return 0;
      }
    } else {
      return 0;
    }
  } catch (error) {
    console.error("Error verifying wizard completion status during generation:", error);
    return 0;
  }

  const horizon = Math.max(1, Math.floor(scheduleDaysAhead || 1));
  let generatedCount = 0;

  for (let dayOffset = 0; dayOffset < horizon; dayOffset += 1) {
    const date = format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
    const exists = await hasWorkoutForDate(userId, date);
    if (exists) continue;

    try {
      await generateTrainingSessionForDate(userId, date);
      generatedCount += 1;
    } catch (error) {
      console.error(`Failed to auto-generate training for ${date}:`, error);
    }
  }

  return generatedCount;
};

export const getUpcomingGoalEvent = async (userId: string): Promise<Workout | null> => {
  const workoutRef = collection(db, "workouts");
  const todayString = format(new Date(), 'yyyy-MM-dd');

  const qEvent = query(
    workoutRef,
    where("userId", "==", userId),
    where("type", "==", "Event")
  );

  const qGoal = query(
    workoutRef,
    where("userId", "==", userId),
    where("type", "==", "Goal")
  );

  try {
    const [eventSnap, goalSnap] = await Promise.all([getDocs(qEvent), getDocs(qGoal)]);

    const events = eventSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));
    const goals = goalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workout));

    // First check for active upcoming goals/events
    const upcoming = [...events, ...goals]
      .filter(workout => workout.date >= todayString && !workout.completed)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length > 0) return upcoming[0];

    // If no active upcoming goal, find the most recent past or completed goal
    const past = [...events, ...goals]
      .sort((a, b) => b.date.localeCompare(a.date));

    return past.length > 0 ? past[0] : null;
  } catch (error) {
    console.error("Error fetching upcoming goal/event:", error);
    return null;
  }
};

export const createGoalWorkout = async (
  userId: string,
  goalData: { name: string; date: string; sport?: string; description?: string }
): Promise<string> => {
  const workoutRef = collection(db, "workouts");
  const docRef = await addDoc(workoutRef, {
    userId,
    name: goalData.name,
    sport: goalData.sport || 'running',
    date: goalData.date,
    type: 'Goal',
    description: goalData.description || '',
    completed: false,
    status: 'planned',
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const subscribeToWorkouts = (userId: string, date: Date, callback: (workouts: Workout[]) => void) => {
  const workoutRef = collection(db, "workouts");
  const dateString = format(date, 'yyyy-MM-dd');

  const q = query(
    workoutRef,
    where("userId", "==", userId),
    where("date", "==", dateString)
  );

  return onSnapshot(q,
    (snapshot) => {
      const rawWorkouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workout[];

      // Deduplicate planned workouts that share identical date, sport, and name
      const seen = new Set<string>();
      const workouts: Workout[] = [];
      for (const w of rawWorkouts) {
        const key = `${w.date}_${(w.sport || '').toLowerCase()}_${(w.name || '').toLowerCase()}`;
        const isPlanned = !w.completed && w.status !== 'completed';
        if (isPlanned && seen.has(key)) {
          continue;
        }
        if (isPlanned) {
          seen.add(key);
        }
        workouts.push(w);
      }

      callback(workouts);
    },
    (error) => {
      if (error.code === 'permission-denied') {
        console.log('Workout subscription permission denied (likely logged out)');
      } else {
        console.error('Error in workout subscription:', error);
      }
      callback([]);
    }
  );
};

import { removeUndefinedFields } from "./user-service";

export const createWorkout = async (workout: Omit<Workout, 'id' | 'createdAt'>) => {
  try {
    const workoutRef = collection(db, "workouts");
    const sanitized = removeUndefinedFields(workout);
    const docRef = await addDoc(workoutRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating workout:", error);
    throw error;
  }
};

export const updateWorkout = async (workoutId: string, data: Partial<Workout>) => {
  try {
    const docRef = doc(db, "workouts", workoutId);
    const sanitized = removeUndefinedFields(data);
    await updateDoc(docRef, sanitized);
  } catch (error) {
    console.error("Error updating workout:", error);
    throw error;
  }
};


export const getWorkout = async (workoutId: string): Promise<Workout | null> => {
  try {
    const docRef = doc(db, "workouts", workoutId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Workout;
    }
    return null;
  } catch (error) {
    console.error("Error fetching workout:", error);
    return null;
  }
};

export const toggleWorkoutCompletion = async (workoutId: string, currentStatus: string) => {
  const isNowCompleted = currentStatus !== 'completed';
  const newStatus = isNowCompleted ? 'completed' : 'planned';

  // Get the current workout data first to check for plannedTime
  const docRef = doc(db, "workouts", workoutId);
  const docSnap = await getDoc(docRef);
  const workoutData = docSnap.data() as Workout;

  const data: Partial<Workout> | any = {
    status: newStatus as any,
    completed: isNowCompleted,
  };

  if (isNowCompleted) {
    data.completedAt = serverTimestamp();
    const isStrengthOrMobility = ['strength', 'stretching', 'yoga', 'rest'].includes(workoutData?.sport?.toLowerCase() || '');
    const plannedTss = isStrengthOrMobility ? 0 : (workoutData?.plannedTss ?? workoutData?.tss ?? 0);
    data.tss = plannedTss;
    data.actual_tss = plannedTss;
    const finalTime = workoutData?.plannedTime || workoutData?.time || 0;
    data.time = finalTime;
    data.actual_time = finalTime;
    data.completion_type = 'manual_toggle';
  } else {
    data.completedAt = null;
    data.stats = deleteField();
    data.time = deleteField();
    data.tss = deleteField();
    data.source = deleteField();
    data.actual_time = deleteField();
    data.actual_tss = deleteField();
    data.distance_m = deleteField();
    data.fit_file_url = deleteField();
    data.fit_file_path = deleteField();
    data.fit_file_processed = deleteField();
    data.completion_type = deleteField();
  }

  return updateWorkout(workoutId, data);
};
