import React from 'react';
import { View } from 'react-native';
import Card from '@/components/ui/card';
import Text from '@/components/ui/text';
import { Workout } from '@/lib/workout-service';
import { LoggedSet, summaryStats } from '@/lib/session-stats';

interface Props {
  workout: Workout;
  imperial?: boolean;
}

/** Stat tiles that suit the session's sport, plus the logged sets for strength sessions. */
export default function SessionSummary({ workout, imperial = false }: Props) {
  const tiles = summaryStats(workout, imperial);
  const sets = workout.logged_sets || [];

  return (
    <View>
      {tiles.length > 0 && (
        <Card className="p-5 mb-6">
          <View className="flex-row flex-wrap">
            {tiles.map((tile) => (
              <View key={tile.label} style={{ width: '50%' }} className="mb-4">
                <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">
                  {tile.label}
                </Text>
                <Text className="text-xl font-bold">
                  {tile.value}
                  {tile.unit ? <Text variant="muted"> {tile.unit}</Text> : null}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {(workout.sport || '').toLowerCase() === 'strength' && sets.length > 0 && (
        <Card className="p-5 mb-12">
          <Text variant="h3" className="mb-3">Sets</Text>
          {groupByExercise(sets).map(([exercise, rows]) => (
            <View key={exercise} className="mb-3">
              <Text className="font-bold mb-1">{exercise}</Text>
              {rows.map((s, i) => (
                <Text key={i} variant="muted">
                  {`Set ${i + 1}: ${describeSet(s, imperial)}`}
                </Text>
              ))}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function groupByExercise(sets: LoggedSet[]): [string, LoggedSet[]][] {
  const groups = new Map<string, LoggedSet[]>();
  for (const s of sets) groups.set(s.exercise, [...(groups.get(s.exercise) || []), s]);
  return [...groups.entries()];
}

export function describeSet(s: LoggedSet, imperial: boolean): string {
  const parts: string[] = [];
  if (s.reps) parts.push(`${s.reps} reps`);
  if (s.weight_kg) parts.push(imperial ? `${Math.round(s.weight_kg / 0.45359237)} lb` : `${s.weight_kg} kg`);
  if (s.duration_sec && !s.reps) parts.push(`${s.duration_sec} s`);
  return parts.join(' × ') || 'done';
}
