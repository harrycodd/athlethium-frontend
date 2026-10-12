import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/lib/i18n';
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
  const { t } = useTranslation('session');
  const tiles = summaryStats(workout, imperial);
  const sets = workout.logged_sets || [];

  return (
    <View>
      {tiles.length > 0 && (
        <Card className="p-5 mb-6">
          <View className="flex-row flex-wrap">
            {tiles.map((tile) => (
              <View key={tile.labelKey} style={{ width: '50%' }} className="mb-4">
                <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">
                  {t(tile.labelKey)}
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
          <Text variant="h3" className="mb-3">{t('summary.sets')}</Text>
          {groupByExercise(sets).map(([exercise, rows]) => (
            <View key={exercise} className="mb-3">
              <Text className="font-bold mb-1">{exercise}</Text>
              {rows.map((s, i) => (
                <Text key={i} variant="muted">
                  {t('summary.setLine', { number: i + 1, detail: describeSet(s, imperial, t) })}
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

/** One logged set as text, e.g. "5 reps × 100 kg". `t` defaults to the current language. */
export function describeSet(s: LoggedSet, imperial: boolean, t: TFunction = i18n.getFixedT(null, 'session')): string {
  const parts: string[] = [];
  if (s.reps) parts.push(t('reps', { ns: 'session', count: s.reps }));
  if (s.weight_kg) parts.push(imperial ? `${Math.round(s.weight_kg / 0.45359237)} lb` : `${s.weight_kg} kg`);
  if (s.duration_sec && !s.reps) parts.push(`${s.duration_sec} s`);
  return parts.join(' × ') || t('summary.done', { ns: 'session' });
}
