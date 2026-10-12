import React, { useState } from 'react';
import { View, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, BorderWidth } from '@/constants/theme';
import { GlassButton } from '@/components/ui/glass-button';
import { ChevronLeft, KeyRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('auth');

  const isFormValid = email.trim().length > 0;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSendLink = async () => {
    if (!email.trim()) {
      Alert.alert(t('common:error'), t('errors.enterEmail'));
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        t('common:success'),
        t('resetLinkSent'),
        [{ text: t('common:ok'), onPress: handleBack }]
      );
    } catch (error: any) {
      const code = error?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        Alert.alert(t('common:error'), t('errors.noAccountForEmail'));
      } else {
        Alert.alert(t('common:error'), t('errors.tryAgainLaterSentence'));
      }
    } finally {
      setLoading(false);
    }
  };

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
              {t('common:back')}
            </Text>
          </View>
        </GlassButton>

        {/* Right Liquid Glass Pill "Send Link" Button */}
        <GlassButton
          onPress={handleSendLink}
          disabled={loading || !isFormValid}
          loading={loading}
          variant={isFormValid ? "glass-primary" : "glass"}
          shape="pill"
          size="sm"
          label={t('sendLink', 'Send Link')}
          style={{ width: 96, height: 34 }}
          contentContainerStyle={{ width: 96, height: 34, minHeight: 34, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
          textStyle={{
            fontSize: 13,
            fontWeight: '700',
            color: isFormValid ? (isDark ? '#4ade80' : '#15803d') : colors.textSecondary,
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
              <KeyRound size={32} color={colors.primary} strokeWidth={2} />
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
              {t('resetPassword', 'Reset Password')}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {t('resetInstructions', "Enter your email and we'll send you a link to reset your password.")}
            </Text>
          </View>

          {/* Single Form Field */}
          <View style={{ marginBottom: 24 }}>
            <TextInput
              style={{
                height: 54,
                paddingHorizontal: 18,
                borderRadius: Radius.lg,
                backgroundColor: isDark 
                  ? (email.trim() ? 'rgba(255, 255, 255, 0.14)' : '#1c1c1e')
                  : (email.trim() ? '#ffffff' : '#f2f2f7'),
                borderWidth: BorderWidth.thin,
                borderColor: isDark 
                  ? (email.trim() ? colors.borderHighlight : colors.border)
                  : (email.trim() ? '#09090b' : colors.border),
                color: colors.text,
                fontSize: 16,
                fontWeight: email.trim() ? '600' : '400',
              }}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus={true}
              onSubmitEditing={handleSendLink}
              returnKeyType="send"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
