import { Stack } from 'expo-router';
import { SignupDraftProvider } from '@/hooks/use-signup-draft';

export default function AuthLayout() {
  return (
    <SignupDraftProvider>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </SignupDraftProvider>
  );
}
