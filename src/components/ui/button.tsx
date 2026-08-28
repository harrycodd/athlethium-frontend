import React from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  Platform,
  StyleSheet,
  ViewStyle,
  View,
} from "react-native";
import Text from "./text";
import { useTheme } from "@/hooks/use-theme";
import { Radius, BorderWidth } from "@/constants/theme";

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

type Props = Omit<TouchableOpacityProps, 'children'> & {
  children?: React.ReactNode;
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass" | "glass-primary";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
  textClassName?: string;
};

export default function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  className,
  textClassName,
  children,
  disabled,
  onPress,
  style,
  ...props
}: Props) {
  const { colors, isDark } = useTheme();
  const isNativeGlassSupported = Platform.OS === 'ios' && isLiquidGlassAvailableFn?.();
  const GlassComponent = (isNativeGlassSupported && NativeGlassView) ? NativeGlassView : View;

  const isGlassVariant = variant === "glass" || variant === "glass-primary";

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md, minHeight: 36 },
    md: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.lg, minHeight: 46 },
    lg: { paddingHorizontal: 28, paddingVertical: 16, borderRadius: Radius.xl, minHeight: 54 },
  };

  const textColors: Record<string, string> = {
    primary: '#ffffff',
    'glass-primary': isDark ? '#4ade80' : '#15803d',
    secondary: colors.text,
    glass: colors.text,
    outline: colors.text,
    ghost: colors.text,
  };

  const textFontSizes: Record<string, number> = {
    sm: 13,
    md: 15,
    lg: 16,
  };

  const getBorderRadius = () => {
    if (size === 'sm') return Radius.md;
    if (size === 'lg') return Radius.xl;
    return Radius.lg;
  };

  if (isGlassVariant) {
    const tintColor = variant === 'glass-primary'
      ? (isDark ? 'rgba(34, 197, 94, 0.22)' : 'rgba(22, 163, 74, 0.16)')
      : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)');

    const borderColor = variant === 'glass-primary'
      ? colors.borderPrimary
      : colors.glass.border;

    return (
      <TouchableOpacity
        disabled={disabled || loading}
        onPress={onPress as any}
        activeOpacity={0.75}
        style={[
          styles.touchable,
          {
            borderRadius: getBorderRadius(),
            opacity: disabled || loading ? 0.5 : 1,
            shadowColor: isDark ? '#000' : '#000',
          },
          style,
        ]}
        className={className}
        {...props}
      >
        <GlassComponent
          {...(isNativeGlassSupported ? {
            glassEffectStyle: {
              style: 'regular',
              animate: true,
            },
            isInteractive: true,
            colorScheme: isDark ? 'dark' : 'light',
            tintColor,
          } : {})}
          style={[
            styles.glassContainer,
            sizeStyles[size],
            {
              borderRadius: getBorderRadius(),
              backgroundColor: isNativeGlassSupported ? undefined : tintColor,
              borderColor,
              borderWidth: BorderWidth.thin,
            },
          ]}
        >
          {loading && (
            <ActivityIndicator
              color={textColors[variant]}
              size="small"
              style={{ marginRight: label || children ? 8 : 0 }}
            />
          )}

          {children || (
            <Text
              numberOfLines={1}
              style={{
                color: textColors[variant],
                fontSize: textFontSizes[size],
                fontWeight: '700',
              }}
              className={textClassName}
            >
              {label}
            </Text>
          )}
        </GlassComponent>
      </TouchableOpacity>
    );
  }

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: BorderWidth.hairline,
      borderColor: colors.border,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: BorderWidth.thin,
      borderColor: colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  };

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={onPress as any}
      activeOpacity={0.75}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: getBorderRadius(),
          opacity: disabled || loading ? 0.5 : 1,
        },
        variantStyles[variant],
        sizeStyles[size],
        style,
      ]}
      className={className}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : colors.textSecondary}
          size="small"
          style={{ marginRight: label || children ? 8 : 0 }}
        />
      )}

      {children || (
        <Text
          numberOfLines={1}
          style={{
            color: textColors[variant],
            fontSize: textFontSizes[size],
            fontWeight: '700',
          }}
          className={textClassName}
        >
          {label}
        </Text>
      )}
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
