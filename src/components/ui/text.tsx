import React from "react";
import { Text as RNText, TextProps } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

type Props = TextProps & {
  variant?: "h1" | "h2" | "h3" | "body" | "muted" | "small";
  className?: string;
};

export default function Text({
  variant,
  className,
  style,
  ...props
}: Props) {
  const { colors } = useTheme();

  const isMuted = variant === "muted" || variant === "small";

  const fontSizes: Record<string, number> = {
    h1: 26,
    h2: 20,
    h3: 17,
    body: 15,
    muted: 14,
    small: 12,
  };

  const fontWeights: Record<string, '400' | '500' | '600' | '700'> = {
    h1: '700',
    h2: '700',
    h3: '600',
    body: '400',
    muted: '400',
    small: '500',
  };

  const defaultStyle: any = {};
  if (variant) {
    defaultStyle.fontSize = fontSizes[variant];
    defaultStyle.fontWeight = fontWeights[variant];
    defaultStyle.color = isMuted ? colors.textSecondary : colors.text;
  } else {
    // If no variant is specified on a nested or standalone Text, allow color to default or inherit
    defaultStyle.color = colors.text;
  }

  return (
    <RNText
      style={[
        defaultStyle,
        style,
      ]}
      className={cn(className)}
      {...props}
    />
  );
}
