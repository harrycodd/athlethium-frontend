import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, BorderWidth } from '@/constants/theme';

interface GlassCardProps extends ViewProps {
  elevated?: boolean;
  glowColor?: string;
  intensityColor?: string;
  borderRadius?: number;
}

export function GlassCard({
  children,
  style,
  elevated = false,
  glowColor,
  intensityColor,
  borderRadius = Radius.xl,
  ...props
}: GlassCardProps) {
  const { colors, isDark } = useTheme();

  const glassBg = elevated ? colors.glass.backgroundElevated : colors.glass.background;
  const glassBorder = intensityColor || (elevated ? colors.glass.borderHighlight : colors.glass.border);

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: glassBg,
          borderColor: glassBorder,
          borderRadius: borderRadius,
          borderWidth: BorderWidth.hairline,
          shadowColor: glowColor || (isDark ? '#000' : '#64748b'),
        },
        elevated && styles.elevated,
        glowColor ? { shadowOpacity: 0.25, shadowRadius: 16 } : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: BorderWidth.hairline,
    padding: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  elevated: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
});
