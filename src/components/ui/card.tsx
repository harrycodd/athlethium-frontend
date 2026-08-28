import React from "react";
import { View, ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Radius, BorderWidth } from "@/constants/theme";

type Props = ViewProps & {
  className?: string;
  elevated?: boolean;
};

export default function Card({ children, className, style, elevated = false, ...props }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: Radius.xl,
          borderWidth: BorderWidth.hairline,
          padding: 18,
          shadowColor: isDark ? '#000000' : '#64748b',
          shadowOffset: { width: 0, height: elevated ? 4 : 2 },
          shadowOpacity: elevated ? (isDark ? 0.4 : 0.12) : (isDark ? 0.2 : 0.06),
          shadowRadius: elevated ? 12 : 8,
          elevation: elevated ? 4 : 2,
        },
        style,
      ]}
      className={cn(className)}
      {...props}
    >
      {children}
    </View>
  );
}
