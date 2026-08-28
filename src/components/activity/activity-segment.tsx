import React from 'react';
import { View } from 'react-native';
import { Zap, Heart, Gauge, Dumbbell, Clock, Sparkles } from 'lucide-react-native';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, BorderWidth } from '@/constants/theme';
import { PlayableStep } from '@/hooks/use-activity-tracker';

interface Props {
  step: PlayableStep | null;
  title?: string;
  description?: string;
  assetName?: string;
}

export function ActivitySegment({ step, title, description }: Props) {
  const { colors, isDark } = useTheme();

  if (!step && !title && !description) return null;

  const stepName = step?.name || title || 'Current Step';
  const stepType = (step?.type || 'INTERVAL').toUpperCase();
  const stepColor = step?.color || colors.primary;
  const targetLabel = step?.targetLabel || 'TARGET METRIC';
  const targetValue = step?.targetValue || 'Steady Pace';
  const targetSubtext = step?.targetSubtext || '';
  const notes = step?.notes || step?.description || description || '';

  // Icon for target type
  const renderTargetIcon = () => {
    switch (step?.targetType) {
      case 'power':
        return <Zap size={16} color={stepColor} strokeWidth={2.5} />;
      case 'heart_rate':
        return <Heart size={16} color={stepColor} strokeWidth={2.5} />;
      case 'pace':
        return <Gauge size={16} color={stepColor} strokeWidth={2.5} />;
      case 'reps':
        return <Dumbbell size={16} color={stepColor} strokeWidth={2.5} />;
      default:
        return <Sparkles size={16} color={stepColor} strokeWidth={2.5} />;
    }
  };

  return (
    <View
      style={{
        borderRadius: Radius.xxl,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
        borderWidth: BorderWidth.hairline,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        padding: 16,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      {/* Top Header: Step Type Pill + Step Counter */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 3.5,
            borderRadius: Radius.pill,
            backgroundColor: `${stepColor}20`,
            borderWidth: BorderWidth.hairline,
            borderColor: `${stepColor}40`,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: stepColor,
            }}
          />
          <Text style={{ fontSize: 11, fontWeight: '800', color: stepColor, letterSpacing: 0.5 }}>
            {stepType}
          </Text>
        </View>

        {step?.totalSteps && (
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
            Step {step.index + 1} of {step.totalSteps}
          </Text>
        )}
      </View>

      {/* Step Title */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: -0.4,
          marginBottom: 12,
        }}
        numberOfLines={2}
      >
        {stepName}
      </Text>

      {/* HERO TARGET CARD: Exactly what Pace / Power / HR is right */}
      <View
        style={{
          padding: 14,
          borderRadius: Radius.xl,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
          borderWidth: BorderWidth.thin,
          borderColor: `${stepColor}35`,
          marginBottom: notes ? 10 : 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {renderTargetIcon()}
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {targetLabel}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 28,
            fontWeight: '900',
            color: stepColor,
            letterSpacing: -0.5,
            lineHeight: 34,
          }}
        >
          {targetValue}
        </Text>

        {!!targetSubtext && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.textSecondary,
              marginTop: 3,
            }}
          >
            {targetSubtext}
          </Text>
        )}
      </View>

      {/* Coaching Tips / Notes */}
      {!!notes && (
        <View style={{ marginTop: 2, paddingHorizontal: 2 }}>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
            numberOfLines={3}
          >
            {notes}
          </Text>
        </View>
      )}
    </View>
  );
}
