import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Home, Calendar, BarChart2 } from 'lucide-react-native';

export default function AppTabs() {
  const { colorScheme } = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors] || Colors.light;
  const isDark = colorScheme === 'dark';

  if (Platform.OS === 'web') {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#101012' : '#ffffff',
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontWeight: '600',
            fontSize: 11,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: 'Plan',
            tabBarIcon: ({ color, size }) => <Calendar size={size || 22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color, size }) => <BarChart2 size={size || 22} color={color} />,
          }}
        />
      </Tabs>
    );
  }

  return (
    <NativeTabs
      backgroundColor={Platform.OS === 'ios' ? 'transparent' : colors.background}
      blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      indicatorColor={colors.primary}
      tintColor={colors.primary}
      iconColor={{
        selected: colors.primary,
        default: colors.textSecondary,
      }}
      labelStyle={{
        selected: { color: colors.primary, fontWeight: '600' },
        default: { color: colors.textSecondary },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar' }}
          md="calendar_month"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md="bar_chart"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
