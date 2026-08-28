import React from 'react';
import { View } from 'react-native';
import { Timer, Navigation, Gauge, Clock } from 'lucide-react-native';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, BorderWidth } from '@/constants/theme';

interface Props {
  totalTime: string;
  totalPlannedTime?: string;
  totalTimeRemaining?: string;
  distance?: string;
  pace?: string;
}

export function ActivityStats({ totalTime, totalPlannedTime, totalTimeRemaining, distance, pace }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
      {/* Total Elapsed Time */}
      <View
        style={{
          flex: 1,
          padding: 12,
          borderRadius: Radius.lg,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
          borderWidth: BorderWidth.hairline,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <Timer size={12} color="#22c55e" strokeWidth={2.5} />
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Total Time
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
          {totalTime}
        </Text>
        {!!totalPlannedTime && (
          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>
            of {totalPlannedTime}
          </Text>
        )}
      </View>

      {/* GPS Distance (if available) */}
      {distance ? (
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: Radius.lg,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
            borderWidth: BorderWidth.hairline,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <Navigation size={12} color="#06b6d4" strokeWidth={2.5} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Distance
            </Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
            {distance}
          </Text>
        </View>
      ) : null}

      {/* Current Pace / Remaining */}
      {pace ? (
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: Radius.lg,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
            borderWidth: BorderWidth.hairline,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <Gauge size={12} color="#f97316" strokeWidth={2.5} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              GPS Pace
            </Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
            {pace}
          </Text>
        </View>
      ) : totalTimeRemaining ? (
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: Radius.lg,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
            borderWidth: BorderWidth.hairline,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <Clock size={12} color="#a855f7" strokeWidth={2.5} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Remaining
            </Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] }}>
            {totalTimeRemaining}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
