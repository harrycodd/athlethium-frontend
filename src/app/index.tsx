import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { colors, isDark } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#101012' : '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#22c55e" size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profile?.wizardCompleted) {
    return <Redirect href="/wizard" />;
  }

  return <Redirect href="/(tabs)" />;
}
