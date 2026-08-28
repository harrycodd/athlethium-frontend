import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, BorderWidth } from '@/constants/theme';
import { Timer, ArrowDownUp } from 'lucide-react-native';

interface Props {
  time: string;
  label: string;
  mode: 'countdown' | 'countup';
  stepProgress?: number; // 0 to 1
  accentColor?: string;
  onToggleMode?: () => void;
}

export function ActivityTimer({
  time,
  label,
  mode,
  stepProgress = 0,
  accentColor,
  onToggleMode,
}: Props) {
  const { colors, isDark } = useTheme();
  const themeColor = accentColor || colors.primary;

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: Radius.xxl,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
        borderWidth: BorderWidth.hairline,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        marginBottom: 14,
      }}
    >
      {/* Timer Mode Toggle Pill */}
      <TouchableOpacity
        onPress={onToggleMode}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: Radius.pill,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          marginBottom: 8,
        }}
      >
        <Timer size={13} color={themeColor} strokeWidth={2.5} />
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {label} ({mode === 'countdown' ? 'COUNTDOWN' : 'ELAPSED'})
        </Text>
        <ArrowDownUp size={11} color={colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>

      {/* Giant Digital Time Readout */}
      <Text
        style={{
          fontSize: 64,
          fontWeight: '900',
          color: colors.text,
          letterSpacing: -2,
          lineHeight: 70,
          fontVariant: ['tabular-nums'],
        }}
      >
        {time}
      </Text>

      {/* Step Progress Line */}
      {stepProgress > 0 && (
        <View
          style={{
            width: '80%',
            height: 4,
            borderRadius: Radius.pill,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            marginTop: 10,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.min(100, Math.max(0, stepProgress * 100))}%`,
              height: '100%',
              borderRadius: Radius.pill,
              backgroundColor: themeColor,
            }}
          />
        </View>
      )}
    </View>
  );
}
