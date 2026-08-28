export type ActivityType = 'strength' | 'stretching' | 'swimming' | 'running' | 'cycling' | 'yoga' | 'rest' | 'other';

export interface WorkoutStep {
  type: string; // warmup, interval, recovery, cooldown, exercise
  duration: number; // in seconds
  name?: string;
  target_low?: number; // % FTP or HR
  target_high?: number;
  targetType?: string; // power, heart_rate, pace, reps, time
  reps?: number;
  sets?: number;
  notes?: string;
}

export interface SessionSegment {
  title: string;
  description: string;
  duration?: number; // In seconds, if applicable
  assetName?: string;
}

export interface Session {
  id: string;
  type: ActivityType;
  name: string;
  segments: SessionSegment[];
}

export interface ActivityStats {
  timeElapsed: number; // seconds
  distance?: number; // meters
  pace?: number; // seconds per km (or speed)
  currentSegmentIndex: number;
}
