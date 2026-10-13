import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, type TextInputProps } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/user-service';
import { Link, useRouter } from 'expo-router';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Text from '@/components/ui/text';
import { GlassButton } from '@/components/ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

const FIELD_HEIGHT = 52;

/**
 * A login text field. On iOS the native placeholder sits at a different height from typed text, so
 * the hint is drawn here, centred like the text; the native placeholder stays (invisible) for
 * VoiceOver and autofill.
 */
function LoginField({ placeholder, value, ...props }: TextInputProps & { placeholder: string; value: string }) {
  const { colors } = useTheme();
  const drawHint = Platform.OS === 'ios';
  return (
    <View
      style={{
        height: FIELD_HEIGHT,
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.border,
        justifyContent: 'center',
      }}
    >
      {drawHint && !value && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, color: colors.textSecondary }}>
            {placeholder}
          </Text>
        </View>
      )}
      <TextInput
        {...props}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={drawHint ? 'transparent' : colors.textSecondary}
        style={{ height: '100%', paddingHorizontal: 16, paddingVertical: 0, fontSize: 16, color: colors.text }}
      />
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('auth');

  const hasEmail = email.trim().length > 0;
  const hasPassword = password.length > 0;
  const isFormFilled = hasEmail && hasPassword;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common:error'), t('errors.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userProfile = await getUserProfile(userCredential.user.uid);
      if (userProfile?.wizardCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/wizard');
      }
    } catch (error: any) {
      const code = error?.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-email'
      ) {
        Alert.alert(t('errors.loginTitle'), t('errors.incorrectCredentials'));
      } else {
        Alert.alert(t('errors.loginTitle'), t('errors.tryAgainLater'));
      }
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', paddingVertical: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Text style={{ fontSize: 34, fontWeight: '900', letterSpacing: -0.5, color: colors.text }}>
          Athlethium
        </Text>
      </View>

      <View style={{ gap: 16, marginBottom: 28 }}>
        <View>
          <Text 
            variant="small" 
            style={{ 
              marginBottom: 6, 
              marginLeft: 4, 
              color: colors.textSecondary, 
              fontWeight: '600' 
            }}
          >
            {t('email', 'Email')}
          </Text>
          <LoginField
            placeholder={t('emailPlaceholder', 'example@email.com')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text 
            variant="small" 
            style={{ 
              marginBottom: 6, 
              marginLeft: 4, 
              color: colors.textSecondary, 
              fontWeight: '600' 
            }}
          >
            {t('password', 'Password')}
          </Text>
          <LoginField
            placeholder={t('passwordPlaceholder', '••••••••')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      {/* Glowing Sign In Button when filled */}
      <GlassButton 
        label={t('signInButton', 'Sign In')} 
        onPress={handleLogin}
        disabled={loading}
        loading={loading}
        variant="glass-primary"
        shape="rounded"
        size="lg"
        glowColor={isFormFilled ? '#22c55e' : undefined}
        // i18n-ignore: colour values
        tintColor={isFormFilled ? (isDark ? 'rgba(34, 197, 94, 0.35)' : 'rgba(22, 163, 74, 0.25)') : undefined}
        style={{ 
          minHeight: 52,
          opacity: isFormFilled ? 1 : 0.65,
          shadowColor: isFormFilled ? '#22c55e' : '#000000',
          shadowOpacity: isFormFilled ? (isDark ? 0.6 : 0.35) : 0.1,
          shadowRadius: isFormFilled ? 16 : 4,
          elevation: isFormFilled ? 6 : 2,
        }}
      />

      <Link href="/(auth)/signup" asChild>
        <TouchableOpacity style={{ marginTop: 24, alignItems: 'center', padding: 8 }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            {t('dontHaveAccount', "Don't have an account? ")}{" "}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {t('signUp', 'Sign Up')}
            </Text>
          </Text>
        </TouchableOpacity>
      </Link>

      <Link href="/(auth)/forgot-password" asChild>
        <TouchableOpacity style={{ marginTop: 8, alignItems: 'center', padding: 8 }}>
          <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600', textAlign: 'center' }}>
            {t('forgotPassword', 'Forgot Password?')}
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );

  return (
    <ScreenWrapper scrollable={true}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, minHeight: 520 }}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'center' }}>
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </View>
    </ScreenWrapper>
  );
}
