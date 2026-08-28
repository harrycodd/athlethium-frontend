import React from "react";
import { cn } from "@/lib/utils";
import { StatusBar } from "expo-status-bar";
import { ScrollView, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";

type Props = ViewProps & {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  withTopInset?: boolean;
  withBottomInset?: boolean;
};

export default function ScreenWrapper({
  children,
  className,
  scrollable = true,
  withTopInset = true,
  withBottomInset = true,
  style,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: withTopInset ? Math.max(insets.top, 16) : 0,
          paddingBottom: withBottomInset ? insets.bottom : 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: withBottomInset ? 40 : (insets.bottom + 80),
            flexGrow: 1,
          }}
          className={className}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }} className={cn("flex-1", className)}>
          {children}
        </View>
      )}
    </View>
  );
}
