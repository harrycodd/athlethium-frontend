import { Session } from '@/types/activity';

export const MOCK_SESSIONS: Record<string, Session> = {
  'strength-1': {
    id: 'strength-1',
    type: 'strength',
    name: 'Full Body Strength',
    segments: [
      { title: 'Warm up', description: '5 min dynamic stretching', assetName: 'HandsBehindBackChestOpener' },
      { title: 'Box Squat', description: '3 sets of 5 reps @ 80% max', assetName: 'LyingQuadStretch' },
      { title: 'Bench Press', description: '3 sets of 8 reps @ 75% max', assetName: 'CrossBodyShoulderStretch' },
      { title: 'Deadlift', description: '2 sets of 5 reps @ 85% max', assetName: 'StandingForwardFold' },
      { title: 'Cool down', description: '5 min light walk and stretching', assetName: 'ChildsPose' },
    ],
  },
  'run-1': {
    id: 'run-1',
    type: 'running',
    name: 'Threshold Intervals',
    segments: [
      { title: 'Warm up', description: '10 min easy jog', duration: 600 },
      { title: 'Fast Interval 1', description: '5 min at Threshold pace', duration: 300 },
      { title: 'Recovery', description: '2 min walk', duration: 120 },
      { title: 'Fast Interval 2', description: '5 min at Threshold pace', duration: 300 },
      { title: 'Cool down', description: '10 min very easy jog', duration: 600 },
    ],
  },
  'swim-1': {
    id: 'swim-1',
    type: 'swimming',
    name: 'Endurance Swim',
    segments: [
      { title: 'Warm up', description: '200m easy choice', duration: 300 },
      { title: 'Main Set', description: '1000m steady freestyle', duration: 1200 },
      { title: 'Cool down', description: '100m easy backstroke', duration: 180 },
    ],
  },
};
