import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
  View,
  Platform,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import Text from './text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, BorderWidth } from '@/constants/theme';

let NativeGlassView: any = null;
let isLiquidGlassAvailableFn: any = null;
try {
  const expoGlass = require('expo-glass-effect');
  NativeGlassView = expoGlass.GlassView || null;
  isLiquidGlassAvailableFn = expoGlass.isLiquidGlassAvailable || null;
} catch (e) {
  NativeGlassView = null;
  isLiquidGlassAvailableFn = null;
}

export interface GlassButtonProps extends TouchableOpacityProps {
  label?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  variant?: 'glass' | 'glass-primary' | 'glass-clear' | 'glass-tinted' | 'glass-destructive';
  loading?: boolean;
  shape?: 'pill' | 'circle' | 'rounded';
  glowColor?: string;
  tintColor?: string;
  className?: string;
  textStyle?: StyleProp<TextStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function GlassButton({
  label,
  children,
  size = 'md',
  variant = 'glass',
  shape = 'pill',
  loading = false,
  disabled = false,
  style,
  glowColor,
  tintColor,
  className,
  textStyle,
  contentContainerStyle,
  onPress,
  ...props
}: GlassButtonProps) {
  const { colors, isDark } = useTheme();

  const isNativeGlassSupported = Platform.OS === 'ios' && isLiquidGlassAvailableFn?.();
  const GlassComponent = (isNativeGlassSupported && NativeGlassView) ? NativeGlassView : View;

  const getBorderRadius = () => {
    if (shape === 'circle' || shape === 'pill') {
      return Radius.pill;
    }
    if (size === 'sm') return Radius.md;
    if (size === 'lg') return Radius.xl;
    return Radius.lg;
  };

  const getPadding = () => {
    if (size === 'icon') {
      return { width: 40, height: 40, padding: 0, justifyContent: 'center', alignItems: 'center' };
    }
    if (size === 'sm') {
      return { paddingHorizontal: 14, paddingVertical: 8, minHeight: 38 };
    }
    if (size === 'lg') {
      return { paddingHorizontal: 24, paddingVertical: 14, minHeight: 52 };
    }
    return { paddingHorizontal: 20, paddingVertical: 11, minHeight: 44 };
  };

  const borderRadius = getBorderRadius();
  const sizeStyles = getPadding() as ViewStyle;

  const getGlassTint = () => {
    if (tintColor) return tintColor;
    if (variant === 'glass-primary') {
      return isDark ? 'rgba(34, 197, 94, 0.22)' : 'rgba(22, 163, 74, 0.16)';
    }
    if (variant === 'glass-destructive') {
      return isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.14)';
    }
    if (variant === 'glass-clear') {
      return 'transparent';
    }
    return isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';
  };

  const getGlassBorder = () => {
    if (variant === 'glass-primary') {
      return colors.borderPrimary;
    }
    if (variant === 'glass-destructive') {
      return isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)';
    }
    return colors.glass.border;
  };

  const getTextColor = () => {
    if (variant === 'glass-primary') {
      return isDark ? '#4ade80' : '#15803d';
    }
    if (variant === 'glass-destructive') {
      return '#ef4444';
    }
    return colors.text;
  };

  const fontSizes = {
    sm: 13,
    md: 15,
    lg: 16,
    icon: 15,
  };

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.75}
      className={className}
      style={[
        styles.touchable,
        {
          borderRadius,
          opacity: disabled ? 0.45 : 1,
          shadowColor: glowColor || (isDark ? '#000' : '#000'),
        },
        style,
      ]}
      {...props}
    >
      <GlassComponent
        {...(isNativeGlassSupported ? {
          glassEffectStyle: {
            style: variant === 'glass-clear' ? 'clear' : 'regular',
            animate: true,
          },
          isInteractive: false,
          colorScheme: isDark ? 'dark' : 'light',
          tintColor: getGlassTint(),
        } : {})}
        pointerEvents="none"
        style={[
          styles.glassContainer,
          sizeStyles,
          {
            borderRadius,
            backgroundColor: isNativeGlassSupported ? undefined : getGlassTint(),
            borderColor: getGlassBorder(),
            borderWidth: BorderWidth.hairline,
            width: '100%',
          },
          contentContainerStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          children || (
            <Text
              style={[
                {
                  fontSize: fontSizes[size],
                  fontWeight: '700',
                  color: getTextColor(),
                  textAlign: 'center',
                },
                textStyle,
              ]}
            >
              {label}
            </Text>
          )
        )}
      </GlassComponent>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px) saturate(190%)',
          WebkitBackdropFilter: 'blur(20px) saturate(190%)',
        } as any)
      : null),
  },
});
