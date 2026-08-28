import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { createUserProfile } from '@/lib/user-service';
import { Radius, BorderWidth } from '@/constants/theme';
import { GlassButton } from '@/components/ui/glass-button';
import { ChevronLeft, Mail, Lock, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function SignupScreen() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('auth');

  const handleNext = () => {
    if (step === 0) {
      if (!email.trim() || !email.includes('@')) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      handleFinalSignup();
    }
  };

  const handleFinalSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await createUserProfile(userCredential.user.uid, email.trim(), email.trim().split('@')[0]);
      router.replace('/wizard');
    } catch (error: any) {
      const code = error?.code;
      if (code === 'auth/email-already-in-use') {
        Alert.alert('Registration Error', 'An account already exists with this email address.');
      } else if (code === 'auth/invalid-email') {
        Alert.alert('Registration Error', 'Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        Alert.alert('Registration Error', 'Password is too weak. Please use at least 6 characters.');
      } else {
        Alert.alert('Registration Error', 'Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((step - 1) as 0 | 1);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(auth)/login');
      }
    }
  };

  const isCurrentStepValid = () => {
    if (step === 0) return email.trim().length > 3 && email.includes('@');
    if (step === 1) return password.length >= 6;
    if (step === 2) return confirmPassword.length >= 6 && confirmPassword === password;
    return false;
  };

  const isValid = isCurrentStepValid();

  return (
    <ScreenWrapper scrollable={false} withTopInset={true} withBottomInset={true}>
      {/* Top Bar Navigation */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        {/* Left Liquid Glass Back Button */}
        <GlassButton
          onPress={handleBack}
          shape="pill"
          size="sm"
          style={{ width: 78, height: 34 }}
          contentContainerStyle={{ width: 78, height: 34, minHeight: 34, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <ChevronLeft size={16} color={colors.text} strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, includeFontPadding: false }}>
              {t('back', 'Back')}
            </Text>
          </View>
        </GlassButton>

        {/* Right Liquid Glass Pill "Next / Sign Up" Button */}
        <GlassButton
          onPress={handleNext}
          disabled={loading || !isValid}
          loading={loading}
          variant={isValid ? "glass-primary" : "glass"}
          shape="pill"
          size="sm"
          label={step === 2 ? t('signUpButton', 'Sign Up') : 'Next'}
          style={{ width: step === 2 ? 88 : 74, height: 34 }}
          contentContainerStyle={{ width: step === 2 ? 88 : 74, height: 34, minHeight: 34, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
          textStyle={{
            fontSize: 13,
            fontWeight: '700',
            color: isValid ? (isDark ? '#4ade80' : '#15803d') : colors.textSecondary,
            includeFontPadding: false,
          }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
            maxWidth: 420,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Centered Hero Icon Badge (iOS Squircle) */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: Radius.xl,
                backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7',
                borderWidth: BorderWidth.hairline,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 12,
              }}
            >
              {step === 0 && <Mail size={32} color="#0284c7" strokeWidth={2} />}
              {step === 1 && <Lock size={32} color={colors.primary} strokeWidth={2} />}
              {step === 2 && <ShieldCheck size={32} color="#8b5cf6" strokeWidth={2} />}
            </View>
          </View>

          {/* Apple Setup Title & Subtitle */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                letterSpacing: -0.5,
                color: colors.text,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              {step === 0 && t('createAccount', 'Add Account')}
              {step === 1 && 'Create Password'}
              {step === 2 && 'Confirm Password'}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {step === 0 && 'Enter your email address.'}
              {step === 1 && 'Choose a password with at least 6 characters.'}
              {step === 2 && 'Re-enter your password to finish setup.'}
            </Text>
          </View>

          {/* Single Form Field for this Step */}
          <View style={{ marginBottom: 24 }}>
            {step === 0 && (
              <TextInput
                style={{
                  height: 54,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  backgroundColor: isDark 
                    ? (email.trim() ? 'rgba(255, 255, 255, 0.14)' : '#1c1c1e')
                    : (email.trim() ? '#ffffff' : '#f2f2f7'),
                  borderWidth: 1.5,
                  borderColor: isDark 
                    ? (email.trim() ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.10)')
                    : (email.trim() ? '#09090b' : 'rgba(0, 0, 0, 0.06)'),
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: email.trim() ? '600' : '400',
                  shadowColor: isDark ? '#ffffff' : '#000000',
                  shadowOpacity: email.trim() ? 0.15 : 0,
                  shadowRadius: 8,
                }}
                placeholder={t('emailPlaceholder', 'usuario@example.com')}
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus={true}
                onSubmitEditing={handleNext}
                returnKeyType="next"
              />
            )}

            {step === 1 && (
              <TextInput
                style={{
                  height: 54,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  backgroundColor: isDark 
                    ? (password ? 'rgba(255, 255, 255, 0.14)' : '#1c1c1e')
                    : (password ? '#ffffff' : '#f2f2f7'),
                  borderWidth: 1.5,
                  borderColor: isDark 
                    ? (password ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.10)')
                    : (password ? '#09090b' : 'rgba(0, 0, 0, 0.06)'),
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: password ? '600' : '400',
                  shadowColor: isDark ? '#ffffff' : '#000000',
                  shadowOpacity: password ? 0.15 : 0,
                  shadowRadius: 8,
                }}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoFocus={true}
                onSubmitEditing={handleNext}
                returnKeyType="next"
              />
            )}

            {step === 2 && (
              <TextInput
                style={{
                  height: 54,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  backgroundColor: isDark 
                    ? (confirmPassword ? 'rgba(255, 255, 255, 0.14)' : '#1c1c1e')
                    : (confirmPassword ? '#ffffff' : '#f2f2f7'),
                  borderWidth: 1.5,
                  borderColor: isDark 
                    ? (confirmPassword ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.10)')
                    : (confirmPassword ? '#09090b' : 'rgba(0, 0, 0, 0.06)'),
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: confirmPassword ? '600' : '400',
                  shadowColor: isDark ? '#ffffff' : '#000000',
                  shadowOpacity: confirmPassword ? 0.15 : 0,
                  shadowRadius: 8,
                }}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoFocus={true}
                onSubmitEditing={handleFinalSignup}
                returnKeyType="done"
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
