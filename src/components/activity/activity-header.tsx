import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { X, Dumbbell, Footprints, Bike, Waves, Zap, StretchHorizontal, Activity } from 'lucide-react-native';
import Text from '@/components/ui/text';
import { ActivityType } from '@/types/activity';
import { GlassButton } from '@/components/ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { PlayableStep } from '@/hooks/use-activity-tracker';
import { useTranslation } from 'react-i18next';
import { Radius, BorderWidth } from '@/constants/theme';

interface Props {
  name: string;
  type: ActivityType;
  steps?: PlayableStep[];
  currentStepIndex?: number;
  totalProgress?: number;
  onClose: () => void;
}

const iconConfig: Record<string, { icon: any; color: string; bg: string }> = {
  running: { icon: Footprints, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
  cycling: { icon: Bike, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
  swimming: { icon: Waves, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  strength: { icon: Dumbbell, color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' },
  stretching: { icon: StretchHorizontal, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  yoga: { icon: StretchHorizontal, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  rest: { icon: Activity, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  other: { icon: Activity, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' },
};

// Labels for sport codes as shown in the recorder (stretching reads "Stretching" here, not "Mobility").
const SPORT_LABEL_KEYS: Record<string, string> = {
  running: 'sports.running',
  cycling: 'sports.cycling',
  swimming: 'sports.swimming',
  strength: 'sports.strength',
  stretching: 'sports.stretching',
  yoga: 'sports.yoga',
  rest: 'sports.rest',
};

export function ActivityHeader({
  name,
  type,
  steps = [],
  currentStepIndex = 0,
  totalProgress = 0,
  onClose,
}: Props) {
  const sportKey = (type || 'cycling').toLowerCase();
  const config = iconConfig[sportKey] || iconConfig.other;
  const Icon = config.icon;
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('activity');
  // `type` is the stored sport code; show its translated label.
  const sportLabel = SPORT_LABEL_KEYS[sportKey] ? t(SPORT_LABEL_KEYS[sportKey]) : type;

  const totalSteps = steps.length || 1;
  const stepNumber = Math.min(totalSteps, currentStepIndex + 1);
  const progressPercent = Math.round(totalProgress * 100);

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Top Bar: Sport Icon + Workout Name + Close */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: Radius.lg,
              backgroundColor: config.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Icon size={20} color={config.color} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
              numberOfLines={1}
            >
              {name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: config.color,
                  textTransform: 'uppercase',
                }}
              >
                {sportLabel}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>·</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                {t('stepOf', { current: stepNumber, total: totalSteps })}
              </Text>
            </View>
          </View>
        </View>

        <GlassButton
          size="sm"
          shape="circle"
          variant="glass"
          onPress={onClose}
          style={{ width: 36, height: 36 }}
          contentContainerStyle={{ width: 36, height: 36, padding: 0, justifyContent: 'center', alignItems: 'center' }}
        >
          <X size={18} color={colors.text} strokeWidth={2.5} />
        </GlassButton>
      </View>

      {/* Multi-step Visual Segmented Progress Bar */}
      {steps.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 4,
            marginTop: 4,
          }}
        >
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const stepFlex = Math.max(1, step.duration || 60);

            return (
              <View
                key={step.id || idx}
                style={{
                  flex: stepFlex,
                  height: isCurrent ? 5 : 3.5,
                  borderRadius: Radius.pill,
                  backgroundColor: isCompleted
                    ? step.color
                    : isCurrent
                    ? step.color
                    : isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.10)',
                  opacity: isCompleted ? 0.7 : isCurrent ? 1.0 : 0.35,
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
