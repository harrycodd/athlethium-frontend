import "@/global.css";
import "@/lib/i18n";
import { restoreLanguage } from "@/lib/i18n/language";
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, View, StyleSheet, ActivityIndicator, LogBox } from 'react-native';
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

// A language picked on this device before wins over the phone's language until the profile loads.
restoreLanguage();

LogBox.ignoreLogs([
  'BloomFilter error',
  '@firebase/firestore: Firestore',
]);

function RootLayoutNav() {
  const { colorScheme } = useColorScheme();
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (loading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isWizard = segments[0] === 'wizard';
    const isRoot = !segments[0];

    if (!user && !inAuthGroup) {
      // Redirect to the login page if the user is not authenticated
      router.replace('/(auth)/login');
    } else if (user && profile) {
      if (!profile.wizardCompleted && !isWizard) {
        // Redirect to setup wizard only if explicitly not completed
        router.replace('/wizard');
      } else if (profile.wizardCompleted && (inAuthGroup || isWizard || isRoot)) {
        // Redirect to main tabs if wizard is completed
        router.replace('/(tabs)');
      }
    }
  }, [user, profile, loading, segments, rootNavigationState?.key]);

  if (loading || !rootNavigationState?.key) {
    const isDark = colorScheme === 'dark';
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#101012' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#101012',
      card: '#18181b',
      text: '#f8fafc',
      border: 'rgba(255, 255, 255, 0.12)',
    }
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#ffffff',
      card: '#ffffff',
      text: '#09090b',
      border: 'rgba(228, 228, 231, 0.9)',
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
      <Stack screenOptions={{ animation: 'fade' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="wizard" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="settings" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_right'
          }} 
        />
        <Stack.Screen 
          name="add-training" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }} 
        />
        <Stack.Screen 
          name="session/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }} 
        />
        <Stack.Screen 
          name="activity/[id]" 
          options={{ 
            headerShown: false,
            // i18n-ignore: presentation mode, not text
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom'
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
});

