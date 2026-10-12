import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Play, Pause, SkipBack, SkipForward, Check } from 'lucide-react-native';
import { GlassButton } from '@/components/ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import Text from '@/components/ui/text';
import { Radius, BorderWidth } from '@/constants/theme';

interface Props {
  isActive: boolean;
  onToggleActive: () => void;
  canGoPrevious?: boolean;
  onPrevious?: () => void;
  isLastStep?: boolean;
  nextLabel?: string;
  onNext: () => void;
}

export function ActivityControls({
  isActive,
  onToggleActive,
  canGoPrevious = false,
  onPrevious,
  isLastStep = false,
  nextLabel,
  onNext,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('activity');

  return (
    <View style={{ width: '100%', gap: 10 }}>
      {/* Main Controls Row: Prev Step | Play/Pause | Next Step */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        {/* Previous Step Button */}
        <TouchableOpacity
          onPress={onPrevious}
          disabled={!canGoPrevious}
          activeOpacity={0.7}
          style={{
            width: 56,
            height: 56,
            borderRadius: Radius.pill,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: BorderWidth.hairline,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canGoPrevious ? 1 : 0.35,
          }}
        >
          <SkipBack size={22} color={colors.text} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Big Center Play/Pause Button */}
        <GlassButton
          onPress={onToggleActive}
          variant={isActive ? 'glass' : 'glass-primary'}
          shape="pill"
          glowColor={isActive ? undefined : (isDark ? '#22c55e' : '#16a34a')}
          style={{ flex: 1, maxWidth: 170, height: 64 }}
          contentContainerStyle={{ height: 64, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {isActive ? (
              <>
                <Pause size={26} color={colors.text} fill={colors.text} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{t('controls.pause')}</Text>
              </>
            ) : (
              <>
                <Play
                  size={26}
                  color={isDark ? '#4ade80' : '#15803d'}
                  fill={isDark ? '#4ade80' : '#15803d'}
                  style={{ marginLeft: 2 }}
                />
                <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#4ade80' : '#15803d' }}>
                  {t('controls.play')}
                </Text>
              </>
            )}
          </View>
        </GlassButton>

        {/* Next Step / Skip Forward Button */}
        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.7}
          style={{
            width: 56,
            height: 56,
            borderRadius: Radius.pill,
            backgroundColor: isLastStep
              ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.12)')
              : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
            borderWidth: BorderWidth.hairline,
            borderColor: isLastStep ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLastStep ? (
            <Check size={22} color={colors.primary} strokeWidth={2.8} />
          ) : (
            <SkipForward size={22} color={colors.text} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
