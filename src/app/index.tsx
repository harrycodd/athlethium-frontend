import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
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
