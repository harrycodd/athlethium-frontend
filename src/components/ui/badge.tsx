import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { IntensityZones, getIntensityZoneToken, Radius } from '@/constants/theme';

interface BadgeProps extends ViewProps {
  label: string;
  intensity?: number;
  variant?: 'zone' | 'neutral' | 'success' | 'warning' | 'primary';
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  intensity,
  variant = 'zone',
  size = 'md',
  style,
  ...props
}: BadgeProps) {
  let bg = 'rgba(100, 116, 139, 0.15)';
  let border = 'rgba(100, 116, 139, 0.3)';
  let text = '#94a3b8';

  if (intensity !== undefined && intensity !== null) {
    const token = getIntensityZoneToken(intensity);
    bg = token.bg;
    border = token.border;
    text = token.text;
  } else if (variant === 'success') {
    bg = 'rgba(34, 197, 94, 0.15)';
    border = 'rgba(34, 197, 94, 0.35)';
    text = '#22c55e';
  } else if (variant === 'warning') {
    bg = 'rgba(245, 158, 11, 0.15)';
    border = 'rgba(245, 158, 11, 0.35)';
    text = '#fbbf24';
  } else if (variant === 'primary') {
    bg = 'rgba(22, 163, 74, 0.15)';
    border = 'rgba(22, 163, 74, 0.35)';
    text = '#16a34a';
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: Radius.full,
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: isSmall ? 11 : 12,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
