import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/card';
import Text from '@/components/ui/text';
import { GlassButton } from '@/components/ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { updateWorkout, Workout } from '@/lib/workout-service';
import { cleanSets, displayToKg, initialSets, kgToDisplay, LoggedSet, setTotals } from '@/lib/session-stats';

interface Props {
  workout: Workout;
  imperial?: boolean;
  onSaved?: (sets: LoggedSet[]) => void;
}

/**
 * Log what was actually lifted: one row per set, starting from the planned exercises (or the sets
 * imported from a watch). Saved to the workout's `logged_sets`.
 */
export default function StrengthLog({ workout, imperial = false, onSaved }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation('session');
  const [sets, setSets] = useState<LoggedSet[]>(() => initialSets(workout));
  // weights are edited as text so "62." can be typed; parsed on save
  const [weights, setWeights] = useState<string[]>(() => initialSets(workout).map((s) => kgToDisplay(s.weight_kg, imperial)));
  const [newExercise, setNewExercise] = useState('');
  const [saving, setSaving] = useState(false);
  const unit = imperial ? 'lb' : 'kg';

  const update = (i: number, patch: Partial<LoggedSet>) =>
    setSets((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const addSet = (exercise: string, after?: number) => {
    const template = after !== undefined ? sets[after] : undefined;
    const row: LoggedSet = { exercise, ...(template?.reps ? { reps: template.reps } : {}) };
    const at = after !== undefined ? after + 1 : sets.length;
    setSets((prev) => [...prev.slice(0, at), row, ...prev.slice(at)]);
    setWeights((prev) => [...prev.slice(0, at), after !== undefined ? prev[after] : '', ...prev.slice(at)]);
  };

  const removeSet = (i: number) => {
    setSets((prev) => prev.filter((_, j) => j !== i));
    setWeights((prev) => prev.filter((_, j) => j !== i));
  };

  const withWeights = () => sets.map((s, i) => ({ ...s, weight_kg: displayToKg(weights[i] || '', imperial) }));
  const totals = setTotals(withWeights());

  const save = async () => {
    if (!workout.id) return;
    setSaving(true);
    try {
      const cleaned = cleanSets(withWeights());
      await updateWorkout(workout.id, { logged_sets: cleaned });
      onSaved?.(cleaned);
      Alert.alert(t('strengthLog.savedTitle'), t('strengthLog.savedMessage', { count: cleaned.length }));
    } catch (error) {
      console.error('Failed to save sets:', error);
      Alert.alert(t('common:error'), t('strengthLog.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 56,
    textAlign: 'center' as const,
  };

  return (
    <Card className="p-4 mb-6">
      <Text variant="h3" className="mb-1">{t('strengthLog.title')}</Text>
      <Text variant="muted" className="mb-4">
        {t('strengthLog.totals', {
          count: totals.sets,
          reps: t('reps', { count: totals.reps }),
          volume: imperial ? Math.round(totals.volumeKg / 0.45359237) : totals.volumeKg,
          unit,
        })}
      </Text>

      {sets.map((s, i) => {
        const header = i === 0 || sets[i - 1].exercise !== s.exercise;
        const setNumber = sets.slice(0, i + 1).filter((x) => x.exercise === s.exercise).length;
        return (
          <View key={i}>
            {header && <Text className="font-bold mt-2 mb-1">{s.exercise}</Text>}
            <View className="flex-row items-center gap-2 mb-2">
              <Text variant="muted" style={{ width: 48 }}>{t('strengthLog.setNumber', { number: setNumber })}</Text>
              <TextInput
                accessibilityLabel={t('strengthLog.repsInputLabel', { exercise: s.exercise, number: setNumber })}
                value={s.reps ? String(s.reps) : ''}
                onChangeText={(text) => update(i, { reps: parseInt(text, 10) || undefined })}
                keyboardType="number-pad"
                placeholder={t('strengthLog.repsPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
              <Text variant="muted">×</Text>
              <TextInput
                accessibilityLabel={t('strengthLog.weightInputLabel', { exercise: s.exercise, number: setNumber })}
                value={weights[i] ?? ''}
                onChangeText={(text) => setWeights((prev) => prev.map((w, j) => (j === i ? text : w)))}
                keyboardType="decimal-pad"
                placeholder={unit}
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
              <Text variant="muted">{unit}</Text>
              <View className="flex-1" />
              <TouchableOpacity accessibilityLabel={t('strengthLog.addSetLabel', { exercise: s.exercise })} onPress={() => addSet(s.exercise, i)}>
                <Plus size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel={t('strengthLog.removeSetLabel', { exercise: s.exercise, number: setNumber })} onPress={() => removeSet(i)}>
                <Trash2 size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <View className="flex-row items-center gap-2 mt-3 mb-4">
        <TextInput
          value={newExercise}
          onChangeText={setNewExercise}
          placeholder={t('strengthLog.addExercisePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={{ ...inputStyle, flex: 1, textAlign: 'left' as const }}
        />
        <GlassButton
          label={t('strengthLog.add')}
          size="sm"
          shape="pill"
          variant="glass"
          onPress={() => {
            if (!newExercise.trim()) return;
            addSet(newExercise.trim());
            setNewExercise('');
          }}
        />
      </View>

      <GlassButton label={t('strengthLog.save')} variant="glass-primary" shape="pill" size="md" loading={saving} disabled={saving} onPress={save} />
    </Card>
  );
}
