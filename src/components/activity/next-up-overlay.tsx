import React from 'react';
import { View } from 'react-native';
import { ChevronRight, FastForward } from 'lucide-react-native';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, BorderWidth } from '@/constants/theme';
import { PlayableStep, stepTypeLabel } from '@/hooks/use-activity-tracker';
import { useTranslation } from 'react-i18next';

interface Props {
  isVisible: boolean;
  nextStep?: PlayableStep | null;
  timeRemaining?: number;
}

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? (s > 0 ? `${m}m ${s}s` : `${m}m`) : `${s}s`;
};

export function NextUpOverlay({ isVisible, nextStep, timeRemaining = 0 }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('activity');

  if (!isVisible || !nextStep) return null;

  const nextColor = nextStep.color || colors.primary;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 96,
        left: 16,
        right: 16,
        borderRadius: Radius.xl,
        backgroundColor: isDark ? '#18181b' : '#ffffff',
        borderWidth: BorderWidth.thin,
        borderColor: nextColor,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: Radius.lg,
          backgroundColor: `${nextColor}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}
      >
        <FastForward size={18} color={nextColor} strokeWidth={2.5} />
      </View>

      <View style={{ flex: 1, marginRight: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: nextColor, textTransform: 'uppercase' }}>
            {t('nextUp', { type: stepTypeLabel(t, nextStep.type) })}
          </Text>
          {nextStep.duration > 0 && (
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>
              ({formatDuration(nextStep.duration)})
            </Text>
          )}
        </View>
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 1 }}
          numberOfLines={1}
        >
          {nextStep.name}
        </Text>
        <Text
          style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}
          numberOfLines={1}
        >
          {nextStep.targetValue}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: Radius.pill,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {timeRemaining}s
        </Text>
      </View>
    </View>
  );
}
