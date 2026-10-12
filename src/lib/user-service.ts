import { deviceTimeZone } from './api';
import { getCurrentLanguage } from './i18n';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;

  // Backend Requirements (Training Algorithm)
  ctl: number;
  atl: number;
  weekly_hours: number;
  daily_available_hours: number;
  sports: string[];
  focused_sports: string[];
  equipment: string[];
  history: Record<string, { focus: number[], hours: number[] }>;
  intensity_weeks: number;
  injury: number; // 0 or 1
  illness: number; // 0 or 1

  // UI & App state
  units: 'Metric' | 'Imperial';
  mainFocus: Record<string, boolean>;
  activities: Record<string, boolean>;
  equipmentToggles: Record<string, boolean>;
  intervalType: string;
  scheduleDaysAhead: number;
  stravaConnected: boolean;
  stravaAccessToken?: string | null;
  stravaRefreshToken?: string | null;
  stravaAthleteId?: string | null;
  stravaExpiresAt?: number | null;
  timezone?: string; // IANA zone used by the backend to decide the athlete's "today"
  language?: string; // app language code; the backend writes session text in it
  garminConnected: boolean;
  wahooConnected: boolean;
  lastSyncAt?: any;

  dailyMetrics?: any;
  dailyMetricsHistory?: Record<string, any>;
  dailyMaxHours: Record<string, number>;
  dailyHoursOverrides: Record<string, number>;
  ftp: number; // Deprecated, but keep for backwards compatibility if needed
  ftpCycling?: number;
  ftpRunning?: number;
  ftpPaceRunning?: number; // stored in seconds/km
  ftpPaceSwimming?: number; // stored in seconds/100m
  fthr: number;
  maxHr?: number;
  restHr?: number;
  weight?: string | number;
  primaryGoal?: string;
  fitness_level?: string;
  trainingGoalType: string;
  goal?: {
    name: string;
    type: string;
    date: string;
    sports: string[];
    targetDistance?: number;
    targetDistanceUnit?: string;
    targetTime?: number; // target duration in seconds
    targetTimeString?: string; // e.g. "03:45:00"
    targetPace?: string; // e.g. "5:20/km"
    notes?: string;
    bodyArea?: 'core' | 'upper' | 'lower' | 'all'; // strength/mobility focus
  };
  sportAllocations?: Record<string, { percentage: number; sessionsPerWeek?: number; hoursPerWeek?: number }>;
  sportPercentages?: Record<string, number>;
  sportSessionsPerWeek?: Record<string, number>;
  wizardCompleted?: boolean;
}

export const DEFAULT_PROFILE: Partial<UserProfile> = {
  ctl: 0,
  atl: 0,
  weekly_hours: 7,
  daily_available_hours: 1.5,
  sports: ['running', 'cycling', 'swimming', 'strength', 'stretching'],
  focused_sports: ['running'],
  equipment: ['dumbbells', 'kettlebell', 'pullUpBar', 'squatRack', 'bench', 'dipBar', 'cable', 'latPulldown', 'flyMachine', 'resistanceBands', 'medicineBall'],
  history: {},
  intensity_weeks: 3,
  injury: 0,
  illness: 0,

  dailyMaxHours: {
    "Monday": 1.5,
    "Tuesday": 1.5,
    "Wednesday": 1.5,
    "Thursday": 1.5,
    "Friday": 1.5,
    "Saturday": 2.0,
    "Sunday": 2.0,
  },
  dailyHoursOverrides: {},
  units: 'Metric',
  mainFocus: { swimming: false, cycling: false, running: true, strength: false, stretching: false },
  activities: { running: true, swimming: true, cycling: true, strength: true, stretching: true },
  equipmentToggles: {
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
  },
  intervalType: 'mix',
  scheduleDaysAhead: 1,
  stravaConnected: false,
  garminConnected: false,
  wahooConnected: false,
  dailyMetricsHistory: {},

  ftp: 200,
  ftpCycling: 200,
  ftpRunning: 250,
  ftpPaceRunning: 330, // 5:30 min/km
  ftpPaceSwimming: 110, // 1:50 min/100m
  fthr: 170,
  trainingGoalType: 'General Fitness',
  wizardCompleted: false,
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const removeUndefinedFields = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields);
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = (typeof val === 'object' && val !== null && !(val instanceof Date) && typeof (val as any)?.toDate !== 'function')
        ? removeUndefinedFields(val)
        : val;
    }
  }
  return result;
};

export const createUserProfile = async (uid: string, email: string | null, displayName: string | null) => {
  try {
    const docRef = doc(db, "users", uid);
    const newProfile: UserProfile = {
      uid,
      email,
      displayName,
      ...DEFAULT_PROFILE,
      timezone: deviceTimeZone(),
      language: getCurrentLanguage(),
    } as UserProfile;

    await setDoc(docRef, removeUndefinedFields(newProfile));
    return newProfile;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    const docRef = doc(db, "users", uid);
    const sanitized = removeUndefinedFields(data);
    await updateDoc(docRef, sanitized);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};


export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const docRef = doc(db, "users", uid);
  return onSnapshot(docRef,
    (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (error) => {
      if (error.code === 'permission-denied') {
        console.log('Profile subscription permission denied (likely logged out)');
      } else {
        console.error('Error in profile subscription:', error);
      }
      callback(null);
    }
  );
};
