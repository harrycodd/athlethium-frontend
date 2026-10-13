import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Text from '@/components/ui/text';
import { GlassButton } from '@/components/ui/glass-button';
import { router } from 'expo-router';
import { signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import {
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  User,
  Check,
  Activity,
  Target,
  Link2,
  Dumbbell,
  Clock,
  Zap,
  Sparkles,
  Trash2,
  Flame,
  Star,
  ExternalLink,
  Heart,
  Footprints,
  Bike,
  Waves,
  Scale,
  Timer,
  Globe,
} from 'lucide-react-native';
import { Trans, useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/user-service';
import { getAutoCalculatedFthr, regenerateIncompleteGeneratedWorkouts } from '@/lib/workout-service';
import { Radius, BorderWidth } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { connectStrava, disconnectStrava } from '@/lib/strava';
import { LANGUAGES, type LanguageCode } from '@/lib/i18n';
import { DEVICE_LANGUAGE, changeAppLanguage, followsDeviceLanguage, type LanguageChoice } from '@/lib/i18n/language';

// Ensure WebBrowser completes its auth session if necessary
WebBrowser.maybeCompleteAuthSession();

const SPORTS = ['running', 'cycling', 'swimming', 'strength', 'stretching'] as const;
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

// Labels are shown via t('equipment.items.<id>'); ids are stored on the profile.
const EQUIPMENT_LIST = [
  { id: 'dumbbells' },
  { id: 'kettlebell' },
  { id: 'pullUpBar' },
  { id: 'squatRack' },
  { id: 'bench' },
  { id: 'dipBar' },
  { id: 'cable' },
  { id: 'latPulldown' },
  { id: 'flyMachine' },
  { id: 'resistanceBands' },
  { id: 'medicineBall' },
] as const;

const formatRunningPace = (secondsPerKm?: number, isImperial: boolean = false) => {
  if (!secondsPerKm || secondsPerKm <= 0) return isImperial ? '07:30' : '04:45';
  const sec = isImperial ? secondsPerKm * 1.60934 : secondsPerKm;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseRunningPace = (str: string, isImperial: boolean = false): number => {
  if (!str) return isImperial ? 280 : 285;
  const clean = str.trim();
  const parts = clean.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    const totalSec = m * 60 + s;
    return isImperial ? Math.round(totalSec / 1.60934) : totalSec;
  }
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 0) {
    const m = Math.floor(num);
    const s = Math.round((num - m) * 60);
    const totalSec = m * 60 + s;
    return isImperial ? Math.round(totalSec / 1.60934) : totalSec;
  }
  return isImperial ? 280 : 285;
};

const formatSwimPace = (secondsPer100m?: number) => {
  if (!secondsPer100m || secondsPer100m <= 0) return '01:45';
  const m = Math.floor(secondsPer100m / 60);
  const s = Math.round(secondsPer100m % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseSwimPace = (str: string): number => {
  if (!str) return 105;
  const clean = str.trim();
  const parts = clean.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 0) {
    const m = Math.floor(num);
    const s = Math.round((num - m) * 60);
    return m * 60 + s;
  }
  return 105;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation('settings');

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);

  // Fitness metric local inputs
  const [fthrInput, setFthrInput] = useState(profile?.fthr ? String(Math.round(profile.fthr)) : '170');
  const [maxHrInput, setMaxHrInput] = useState(profile?.maxHr ? String(Math.round(profile.maxHr)) : '190');
  const [restHrInput, setRestHrInput] = useState(profile?.restHr ? String(Math.round(profile.restHr)) : '55');
  const [cyclingFtpInput, setCyclingFtpInput] = useState(String(Math.round(profile?.ftpCycling ?? profile?.ftp ?? 200)));
  const [runningFtpInput, setRunningFtpInput] = useState(profile?.ftpRunning ? String(Math.round(profile.ftpRunning)) : '');
  const [runningPaceInput, setRunningPaceInput] = useState(
    formatRunningPace(profile?.ftpPaceRunning, (profile?.units || 'Metric') === 'Imperial')
  );
  const [swimPaceInput, setSwimPaceInput] = useState(formatSwimPace(profile?.ftpPaceSwimming));
  const [weightInput, setWeightInput] = useState(
    profile?.weight
      ? profile.units === 'Imperial'
        ? (parseFloat(String(profile.weight)) * 2.20462).toFixed(1)
        : parseFloat(String(profile.weight)).toFixed(1)
      : ''
  );

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: false,
    sports: false,
    metrics: false,
    availability: false,
    equipment: false,
    integrations: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const regenerateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDaysAheadRef = useRef<number | null>(null);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
    if (profile) {
      if (profile.fthr) setFthrInput(String(Math.round(profile.fthr)));
      if (profile.maxHr) setMaxHrInput(String(Math.round(profile.maxHr)));
      if (profile.restHr) setRestHrInput(String(Math.round(profile.restHr)));
      setCyclingFtpInput(String(Math.round(profile.ftpCycling ?? profile.ftp ?? 200)));
      if (profile.ftpRunning) setRunningFtpInput(String(Math.round(profile.ftpRunning)));
      setRunningPaceInput(formatRunningPace(profile.ftpPaceRunning, profile.units === 'Imperial'));
      setSwimPaceInput(formatSwimPace(profile.ftpPaceSwimming));
      if (profile.weight) {
        const w = parseFloat(String(profile.weight));
        setWeightInput(profile.units === 'Imperial' ? (w * 2.20462).toFixed(1) : w.toFixed(1));
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const syncAutoFthr = async () => {
      try {
        const { recommended } = await getAutoCalculatedFthr(user.uid);
        if (!recommended) return;

        const currentFthr = profile?.fthr || 0;
        if (recommended !== currentFthr) {
          await updateUserProfile(user.uid, { fthr: recommended });
        }
      } catch (error) {
        console.error('Failed to auto-calculate FTHR:', error);
      }
    };

    syncAutoFthr();
  }, [user, profile?.fthr]);

  const queuePlanRegeneration = (daysAheadOverride?: number) => {
    if (!user) return;
    if (typeof daysAheadOverride === 'number') {
      pendingDaysAheadRef.current = daysAheadOverride;
    }

    if (regenerateTimeoutRef.current) {
      clearTimeout(regenerateTimeoutRef.current);
    }

    regenerateTimeoutRef.current = setTimeout(async () => {
      try {
        const daysAhead = pendingDaysAheadRef.current ?? profile?.scheduleDaysAhead ?? 1;
        pendingDaysAheadRef.current = null;
        await regenerateIncompleteGeneratedWorkouts(user.uid, daysAhead);
      } catch (error) {
        console.error('Failed to regenerate planned sessions:', error);
      }
    }, 700);
  };

  const updateProfile = async (updates: any, regeneratePlan: boolean = false) => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, updates);
      if (regeneratePlan) {
        queuePlanRegeneration(updates?.scheduleDaysAhead);
      }
    } catch (e) {
      Alert.alert(t('common:error'), t('alerts.updateFailed'));
    }
  };

  const toggleActivity = (sport: typeof SPORTS[number]) => {
    if (!profile) return;
    const activities = { ...(profile.activities || {}) };
    const currentFocuses = { ...(profile.mainFocus || {}) };
    const newValue = !activities[sport];

    if (!newValue && currentFocuses[sport]) {
      Alert.alert(t('alerts.actionRestricted'), t('alerts.cannotDisableFocus'));
      return;
    }

    const activeCount = SPORTS.filter((s) => (s === sport ? newValue : !!activities[s])).length;
    if (activeCount === 0) {
      Alert.alert(t('alerts.actionRestricted'), t('alerts.needActiveSport'));
      return;
    }

    activities[sport] = newValue;
    const sports = SPORTS.filter((s) => !!activities[s]);

    InteractionManager.runAfterInteractions(() => {
      updateProfile({ activities, sports }, true);
    });
  };

  const toggleMainFocus = (sport: typeof SPORTS[number]) => {
    if (!profile) return;
    const currentFocuses = { ...(profile.mainFocus || {}) };
    const isActive = !currentFocuses[sport];

    if (isActive) {
      const currentActiveCount = SPORTS.filter((s) => !!currentFocuses[s]).length;
      if (currentActiveCount >= 3) {
        Alert.alert(t('alerts.maxFocusTitle'), t('alerts.maxFocusMessage'));
        return;
      }
    }

    const activeCount = SPORTS.filter((s) => (s === sport ? isActive : !!currentFocuses[s])).length;
    if (!isActive && activeCount === 0) {
      Alert.alert(t('alerts.actionRestricted'), t('alerts.needMainFocus'));
      return;
    }

    currentFocuses[sport] = isActive;
    const focused_sports = SPORTS.filter((s) => !!currentFocuses[s]);
    updateProfile({ mainFocus: currentFocuses, focused_sports }, true);
  };

  const toggleEquipment = (equipmentId: string) => {
    if (!profile) return;
    const equipmentToggles = { ...(profile.equipmentToggles || {}) };
    (equipmentToggles as any)[equipmentId] = !(equipmentToggles as any)[equipmentId];

    const equipment = EQUIPMENT_LIST.filter((item) => !!(equipmentToggles as any)[item.id]).map(
      (item) => item.id
    );

    updateProfile({ equipmentToggles, equipment }, true);
  };

  const saveDisplayName = () => {
    if (displayName.trim() && displayName.trim() !== (profile?.displayName || '')) {
      updateProfile({ displayName: displayName.trim() });
    }
  };

  const handleStravaConnect = async () => {
    if (!user) return;

    if (profile?.stravaConnected) {
      Alert.alert(t('strava.disconnect'), t('strava.disconnectConfirm'), [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('strava.disconnectButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectStrava();
            } catch (e: any) {
              Alert.alert(t('common:error'), t('strava.disconnectFailed', { message: e?.message || '' }));
            }
          },
        },
      ]);
      return;
    }

    try {
      setConnectingStrava(true);
      const result = await connectStrava('/settings');
      if (result.status === 'connected') {
        Alert.alert(t('common:success'), t('strava.connectedSuccess'));
      } else if (result.status === 'error') {
        Alert.alert(t('common:error'), t('strava.connectFailed', { error: result.error }));
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert(t('common:error'), t('strava.authFailed', { message: e?.message || '' }));
    } finally {
      setConnectingStrava(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(t('account.signOut'), t('account.signOutConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('account.signOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Error signing out: ', error);
          }
        },
      },
    ]);
  };

  const executeAccountDeletion = async (passwordForReauth?: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsDeleting(true);
    try {
      // 1. If password was provided for re-auth, reauthenticate first
      if (passwordForReauth && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, passwordForReauth);
        await reauthenticateWithCredential(currentUser, credential);
      }

      // 1b. Revoke Strava and delete server-held tokens while the account still exists
      if (profile?.stravaConnected) {
        try {
          await disconnectStrava();
        } catch (stravaErr) {
          console.warn("Error disconnecting Strava:", stravaErr);
        }
      }

      // 2. Delete user's workouts collection in Firestore
      try {
        const workoutRef = collection(db, "workouts");
        const q = query(workoutRef, where("userId", "==", currentUser.uid));
        const workoutSnaps = await getDocs(q);
        await Promise.all(workoutSnaps.docs.map((d) => deleteDoc(doc(db, "workouts", d.id))));
      } catch (dbErr) {
        console.warn("Error cleaning up workouts:", dbErr);
      }

      // 3. Delete user's profile document in Firestore
      try {
        await deleteDoc(doc(db, "users", currentUser.uid));
      } catch (dbErr) {
        console.warn("Error deleting user document:", dbErr);
      }

      // 4. Delete the Firebase Auth User
      await deleteUser(currentUser);

      setShowReauthModal(false);
      Alert.alert(t('account.deletedTitle'), t('account.deletedMessage'));
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Error during account deletion:', error);
      if (error.code === 'auth/requires-recent-login') {
        setShowReauthModal(true);
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setReauthError(t('account.incorrectPassword'));
      } else {
        Alert.alert(t('common:error'), error.message || t('account.deleteFailed'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('account.deleteAccount'),
      t('account.deleteConfirm'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('account.deleteAccount'),
          style: 'destructive',
          onPress: () => executeAccountDeletion(),
        },
      ]
    );
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0];
  const languageChoice: LanguageChoice = followsDeviceLanguage() ? DEVICE_LANGUAGE : currentLanguage.code;
  const languageOptions: { choice: LanguageChoice; name: string }[] = [
    { choice: DEVICE_LANGUAGE, name: t('language.device') },
    ...LANGUAGES.map((l) => ({ choice: l.code as LanguageCode, name: l.name })),
  ];

  const selectLanguage = async (next: LanguageChoice) => {
    setShowLanguagePicker(false);
    if (next === languageChoice) return;
    setChangingLanguage(true);
    try {
      await changeAppLanguage(next, user, profile?.scheduleDaysAhead);
    } catch (error) {
      console.error('Failed to change language:', error);
      Alert.alert(t('common:error'), t('language.changeFailed'));
    } finally {
      setChangingLanguage(false);
    }
  };

  // Exact Wizard Theme Tokens
  const cardBackground = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)';

  const activitiesMap = profile?.activities || {
    running: true,
    cycling: true,
    swimming: true,
    strength: true,
    stretching: true,
  };
  const mainFocusMap = profile?.mainFocus || { running: true };
  const dailyMaxHours = profile?.dailyMaxHours || {
    Monday: 1.5,
    Tuesday: 1.5,
    Wednesday: 1.5,
    Thursday: 1.5,
    Friday: 1.5,
    Saturday: 2.0,
    Sunday: 2.0,
  };
  const equipmentToggles = profile?.equipmentToggles || {};
  const currentUnits = profile?.units || 'Metric';
  const scheduleDaysAhead = profile?.scheduleDaysAhead || 1;
  const weeklyHours = profile?.weekly_hours || 7;

  const mainFocusSportsList = SPORTS.filter((s) => !!mainFocusMap[s]);
  const activeSportsCount = SPORTS.filter((s) => !!activitiesMap[s]).length;
  const equipmentCount = EQUIPMENT_LIST.filter((item) => !!equipmentToggles[item.id]).length;
  const totalWeeklyAvailability = Object.values(dailyMaxHours).reduce((sum, h) => sum + (h || 0), 0);

  const getMetricsSummary = () => {
    const parts: string[] = [];
    const hasCycling = activitiesMap.cycling || mainFocusMap.cycling;
    const hasRunning = activitiesMap.running || mainFocusMap.running;
    const hasSwimming = activitiesMap.swimming || mainFocusMap.swimming;

    if (hasCycling) {
      const ftpVal = Math.round(profile?.ftpCycling ?? profile?.ftp ?? 200);
      parts.push(t('metrics.summaryFtp', { watts: ftpVal }));
    }
    if (hasRunning) {
      const paceStr = formatRunningPace(profile?.ftpPaceRunning, currentUnits === 'Imperial');
      parts.push(t('metrics.summaryPace', { pace: paceStr, unit: currentUnits === 'Imperial' ? 'mi' : 'km' }));
    }
    if (hasSwimming && !hasCycling && !hasRunning) {
      const swimPace = formatSwimPace(profile?.ftpPaceSwimming);
      parts.push(t('metrics.summaryCss', { pace: swimPace }));
    }
    parts.push(t('metrics.summaryMaxHr', { bpm: Math.round(profile?.maxHr ?? 190) }));
    return parts.slice(0, 2).join(' · ');
  };

  return (
    <ScreenWrapper className="px-0" withTopInset={false} scrollable={false}>
      {/* Top Header Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top > 0 ? Math.round(insets.top * 0.5) : 8,
          paddingBottom: 8,
          borderBottomWidth: BorderWidth.hairline,
          borderBottomColor: cardBorder,
        }}
      >
        <GlassButton
          onPress={() => router.back()}
          shape="pill"
          size="sm"
          style={{ width: 84, height: 38 }}
          contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 38, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <ChevronLeft size={16} color={colors.text} strokeWidth={2.5} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {t('common:back')}
            </Text>
          </View>
        </GlassButton>

        <Text style={{ fontSize: 21, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>
          {t('title')}
        </Text>

        <View style={{ width: 84 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 60,
            maxWidth: 480,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: ATHLETE PROFILE (COLLAPSIBLE) */}
          <View
            style={{
              borderRadius: Radius.xl,
              backgroundColor: cardBackground,
              borderWidth: BorderWidth.hairline,
              borderColor: expandedSections.profile ? colors.primary : cardBorder,
              marginBottom: 14,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('profile')}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: Radius.lg,
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={22} color="#0284c7" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {t('profile.title')}
                  </Text>
                  {!expandedSections.profile && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {t('profile.summary', { name: displayName || t('profile.defaultName'), units: t(`units.${currentUnits}`), days: scheduleDaysAhead })}
                    </Text>
                  )}
                </View>
              </View>

              {expandedSections.profile ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {expandedSections.profile && (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 18,
                  paddingTop: 12,
                  borderTopWidth: BorderWidth.hairline,
                  borderTopColor: cardBorder,
                }}
              >
                {/* Display Name Input */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
                  {t('profile.nameLabel')}
                </Text>
                <View style={{ marginBottom: 18 }}>
                  <TextInput
                    style={{
                      height: 50,
                      paddingHorizontal: 16,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.thin,
                      borderColor: displayName.trim() ? (isDark ? colors.borderHighlight : '#09090b') : cardBorder,
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: displayName.trim() ? '600' : '400',
                    }}
                    placeholder={t('profile.namePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    value={displayName}
                    onChangeText={setDisplayName}
                    onBlur={saveDisplayName}
                    onSubmitEditing={saveDisplayName}
                  />
                </View>

                {/* Units Selector */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
                  {t('profile.unitsLabel')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                  <TouchableOpacity
                    onPress={() => updateProfile({ units: 'Metric' })}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: Radius.lg,
                      backgroundColor: currentUnits === 'Metric' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                      borderWidth: BorderWidth.thin,
                      borderColor: currentUnits === 'Metric' ? colors.primary : cardBorder,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: currentUnits === 'Metric' ? colors.primary : colors.text }}>
                      {t('units.Metric')}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {t('units.metricDescription')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => updateProfile({ units: 'Imperial' })}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: Radius.lg,
                      backgroundColor: currentUnits === 'Imperial' ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                      borderWidth: BorderWidth.thin,
                      borderColor: currentUnits === 'Imperial' ? colors.primary : cardBorder,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: currentUnits === 'Imperial' ? colors.primary : colors.text }}>
                      {t('units.Imperial')}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {t('units.imperialDescription')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Language Selector */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
                  {t('common:language')}
                </Text>
                <View style={{ marginBottom: 18 }}>
                  <TouchableOpacity
                    onPress={() => setShowLanguagePicker(true)}
                    disabled={changingLanguage}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('common:language')}
                    testID="language-row"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: 50,
                      paddingHorizontal: 16,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.thin,
                      borderColor: cardBorder,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Globe size={18} color={colors.textSecondary} strokeWidth={2.2} />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                        {languageChoice === DEVICE_LANGUAGE
                          ? t('language.deviceCurrent', { language: currentLanguage.name })
                          : currentLanguage.name}
                      </Text>
                    </View>
                    {changingLanguage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <ChevronDown size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, marginLeft: 2 }}>
                    {t('language.helper')}
                  </Text>
                </View>

                {/* Target Weekly Training Hours */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
                  {t('profile.weeklyHoursLabel')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderRadius: Radius.xl,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    marginBottom: 18,
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>
                      {weeklyHours} <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{t('hoursPerWeek')}</Text>
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {t('profile.dailyAverage', { hours: (weeklyHours / 7).toFixed(1) })}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => updateProfile({ weekly_hours: Math.max(1, weeklyHours - 1) }, true)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: Radius.pill,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>-</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => updateProfile({ weekly_hours: Math.min(30, weeklyHours + 1) }, true)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: Radius.pill,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Schedule Lookahead Horizon (Days) */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
                  {t('profile.lookaheadLabel')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => {
                    const isSelected = scheduleDaysAhead === days;
                    return (
                      <TouchableOpacity
                        key={days}
                        onPress={() => updateProfile({ scheduleDaysAhead: days }, true)}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: Radius.lg,
                          backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : cardBackground,
                          borderWidth: BorderWidth.thin,
                          borderColor: isSelected ? colors.primary : cardBorder,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                          {t('profile.daysShort', { days })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* SECTION 2: SPORTS & FOCUS (COLLAPSIBLE) */}
          <View
            style={{
              borderRadius: Radius.xl,
              backgroundColor: cardBackground,
              borderWidth: BorderWidth.hairline,
              borderColor: expandedSections.sports ? colors.primary : cardBorder,
              marginBottom: 14,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('sports')}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: Radius.lg,
                    backgroundColor: 'rgba(249, 115, 22, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Flame size={22} color="#f97316" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {t('sports.title')}
                  </Text>
                  {!expandedSections.sports && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {t('sports.summary', { active: activeSportsCount, focus: mainFocusSportsList.map((s) => t(`sportNames.${s}`)).join(', ') || t('common:none') })}
                    </Text>
                  )}
                </View>
              </View>

              {expandedSections.sports ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {expandedSections.sports && (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 18,
                  paddingTop: 12,
                  borderTopWidth: BorderWidth.hairline,
                  borderTopColor: cardBorder,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
                  <Trans
                    t={t}
                    i18nKey="sports.hint"
                    components={{ bold: <Text style={{ fontWeight: '700', color: colors.text }} /> }}
                  />
                </Text>

                <View style={{ gap: 8 }}>
                  {SPORTS.map((sport) => {
                    const isActive = !!activitiesMap[sport];
                    const isFocus = !!mainFocusMap[sport];

                    return (
                      <View
                        key={sport}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: Radius.lg,
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                          borderWidth: BorderWidth.hairline,
                          borderColor: isFocus ? colors.primary : cardBorder,
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isActive ? colors.text : colors.textSecondary, textTransform: 'capitalize', flex: 1 }}>
                          {t(`sportNames.${sport}`)}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          {isActive && (
                            <TouchableOpacity
                              onPress={() => toggleMainFocus(sport)}
                              activeOpacity={0.7}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: Radius.pill,
                                backgroundColor: isFocus ? (isDark ? 'rgba(234, 179, 8, 0.20)' : 'rgba(234, 179, 8, 0.12)') : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Star
                                size={20}
                                color={isFocus ? '#eab308' : colors.textSecondary}
                                fill={isFocus ? '#eab308' : 'transparent'}
                              />
                            </TouchableOpacity>
                          )}

                          <Switch
                            value={isActive}
                            onValueChange={() => toggleActivity(sport)}
                            trackColor={{ true: colors.primary }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* SECTION 3: FITNESS METRICS (COLLAPSIBLE) */}
          <View
            style={{
              borderRadius: Radius.xl,
              backgroundColor: cardBackground,
              borderWidth: BorderWidth.hairline,
              borderColor: expandedSections.metrics ? colors.primary : cardBorder,
              marginBottom: 14,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('metrics')}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: Radius.lg,
                    backgroundColor: 'rgba(225, 29, 72, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Activity size={22} color="#e11d48" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {t('metrics.title')}
                  </Text>
                  {!expandedSections.metrics && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {getMetricsSummary()}
                    </Text>
                  )}
                </View>
              </View>

              {expandedSections.metrics ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {expandedSections.metrics && (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 18,
                  paddingTop: 12,
                  borderTopWidth: BorderWidth.hairline,
                  borderTopColor: cardBorder,
                }}
              >
                {/* SUB-CATEGORY 1: Heart Rate & Thresholds (Always Shown) */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 2 }}>
                    <Heart size={14} color="#e11d48" strokeWidth={2.5} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t('metrics.heartRateTitle')}
                    </Text>
                  </View>

                  {/* Max HR Card */}
                  <View
                    style={{
                      padding: 12,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.hairline,
                      borderColor: cardBorder,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('metrics.maxHr')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <TextInput
                        value={maxHrInput}
                        onChangeText={setMaxHrInput}
                        onBlur={() => {
                          const num = Math.round(parseFloat(maxHrInput) || 0);
                          if (num > 0) updateProfile({ maxHr: num });
                        }}
                        keyboardType="numeric"
                        style={{
                          height: 38,
                          flex: 1,
                          color: colors.text,
                          fontSize: 17,
                          fontWeight: '800',
                        }}
                      />
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: Radius.pill,
                          backgroundColor: isDark ? 'rgba(225, 29, 72, 0.15)' : 'rgba(225, 29, 72, 0.10)',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#e11d48' }}>bpm</Text>
                      </View>
                    </View>
                  </View>

                  {/* Resting HR Card */}
                  <View
                    style={{
                      padding: 12,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.hairline,
                      borderColor: cardBorder,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('metrics.restHr')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <TextInput
                        value={restHrInput}
                        onChangeText={setRestHrInput}
                        onBlur={() => {
                          const num = Math.round(parseFloat(restHrInput) || 0);
                          if (num > 0) updateProfile({ restHr: num });
                        }}
                        keyboardType="numeric"
                        placeholder="55"
                        placeholderTextColor={colors.textSecondary}
                        style={{
                          height: 38,
                          flex: 1,
                          color: colors.text,
                          fontSize: 17,
                          fontWeight: '800',
                        }}
                      />
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: Radius.pill,
                          backgroundColor: isDark ? 'rgba(225, 29, 72, 0.15)' : 'rgba(225, 29, 72, 0.10)',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#e11d48' }}>bpm</Text>
                      </View>
                    </View>
                  </View>

                  {/* FTHR Card */}
                  <View
                    style={{
                      padding: 12,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.hairline,
                      borderColor: cardBorder,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('metrics.fthr')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <TextInput
                        value={fthrInput}
                        onChangeText={setFthrInput}
                        onBlur={() => {
                          const num = Math.round(parseFloat(fthrInput) || 0);
                          if (num > 0) updateProfile({ fthr: num });
                        }}
                        keyboardType="numeric"
                        style={{
                          height: 38,
                          flex: 1,
                          color: colors.text,
                          fontSize: 17,
                          fontWeight: '800',
                        }}
                      />
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: Radius.pill,
                          backgroundColor: isDark ? 'rgba(225, 29, 72, 0.15)' : 'rgba(225, 29, 72, 0.10)',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#e11d48' }}>bpm</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* SUB-CATEGORY 2: Running Metrics (If Running enabled) */}
                {(activitiesMap.running || mainFocusMap.running) && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 2 }}>
                      <Footprints size={14} color="#22c55e" strokeWidth={2.5} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {t('metrics.runningTitle')}
                      </Text>
                    </View>

                    {/* Running Threshold Pace */}
                    <View
                      style={{
                        padding: 12,
                        borderRadius: Radius.lg,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderWidth: BorderWidth.hairline,
                        borderColor: cardBorder,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
                        {t('metrics.thresholdPace')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TextInput
                          value={runningPaceInput}
                          onChangeText={setRunningPaceInput}
                          onBlur={() => {
                            const secPerKm = parseRunningPace(runningPaceInput, currentUnits === 'Imperial');
                            updateProfile({ ftpPaceRunning: secPerKm });
                            setRunningPaceInput(formatRunningPace(secPerKm, currentUnits === 'Imperial'));
                          }}
                          placeholder={currentUnits === 'Imperial' ? '07:30' : '04:45'}
                          placeholderTextColor={colors.textSecondary}
                          style={{
                            height: 38,
                            flex: 1,
                            color: colors.text,
                            fontSize: 17,
                            fontWeight: '800',
                          }}
                        />
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: Radius.pill,
                            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.10)',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>
                            min/{currentUnits === 'Imperial' ? 'mi' : 'km'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Running Power */}
                    <View
                      style={{
                        padding: 12,
                        borderRadius: Radius.lg,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderWidth: BorderWidth.hairline,
                        borderColor: cardBorder,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
                        {t('metrics.runningPower')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TextInput
                          value={runningFtpInput}
                          onChangeText={setRunningFtpInput}
                          onBlur={() => {
                            const num = Math.round(parseFloat(runningFtpInput) || 0);
                            updateProfile({ ftpRunning: num > 0 ? num : undefined });
                          }}
                          placeholder={t('metrics.runningPowerPlaceholder')}
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          style={{
                            height: 38,
                            flex: 1,
                            color: colors.text,
                            fontSize: 17,
                            fontWeight: '800',
                          }}
                        />
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: Radius.pill,
                            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.10)',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>{t('metrics.watts')}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* SUB-CATEGORY 3: Cycling Metrics (If Cycling enabled) */}
                {(activitiesMap.cycling || mainFocusMap.cycling) && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 2 }}>
                      <Bike size={14} color="#06b6d4" strokeWidth={2.5} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {t('metrics.cyclingTitle')}
                      </Text>
                    </View>

                    {/* Cycling FTP Card */}
                    <View
                      style={{
                        padding: 12,
                        borderRadius: Radius.lg,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderWidth: BorderWidth.hairline,
                        borderColor: cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>
                          {t('metrics.cyclingFtp')}
                        </Text>
                        {(() => {
                          const ftpNum = parseFloat(cyclingFtpInput) || 0;
                          const wKg = profile?.weight ? parseFloat(String(profile.weight)) : 0;
                          if (ftpNum > 0 && wKg > 0) {
                            return (
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 1.5,
                                  borderRadius: Radius.pill,
                                  backgroundColor: isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.12)',
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#06b6d4' }}>
                                  {(ftpNum / wKg).toFixed(2)} W/kg
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TextInput
                          value={cyclingFtpInput}
                          onChangeText={setCyclingFtpInput}
                          onBlur={() => {
                            const num = Math.round(parseFloat(cyclingFtpInput) || 0);
                            if (num > 0) updateProfile({ ftpCycling: num, ftp: num });
                          }}
                          keyboardType="numeric"
                          style={{
                            height: 38,
                            flex: 1,
                            color: colors.text,
                            fontSize: 17,
                            fontWeight: '800',
                          }}
                        />
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: Radius.pill,
                            backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.10)',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#06b6d4' }}>{t('metrics.watts')}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* SUB-CATEGORY 4: Swimming Metrics (If Swimming enabled) */}
                {(activitiesMap.swimming || mainFocusMap.swimming) && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 2 }}>
                      <Waves size={14} color="#3b82f6" strokeWidth={2.5} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {t('metrics.swimmingTitle')}
                      </Text>
                    </View>

                    {/* Critical Swim Speed (CSS) */}
                    <View
                      style={{
                        padding: 12,
                        borderRadius: Radius.lg,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderWidth: BorderWidth.hairline,
                        borderColor: cardBorder,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
                        {t('metrics.css')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TextInput
                          value={swimPaceInput}
                          onChangeText={setSwimPaceInput}
                          onBlur={() => {
                            const secPer100m = parseSwimPace(swimPaceInput);
                            updateProfile({ ftpPaceSwimming: secPer100m });
                            setSwimPaceInput(formatSwimPace(secPer100m));
                          }}
                          placeholder="01:45"
                          placeholderTextColor={colors.textSecondary}
                          style={{
                            height: 38,
                            flex: 1,
                            color: colors.text,
                            fontSize: 17,
                            fontWeight: '800',
                          }}
                        />
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: Radius.pill,
                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.10)',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b82f6' }}>
                            min/100{currentUnits === 'Imperial' ? 'yd' : 'm'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* SUB-CATEGORY 5: Body Composition (Always shown) */}
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 2 }}>
                    <Scale size={14} color="#ec4899" strokeWidth={2.5} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t('metrics.bodyTitle')}
                    </Text>
                  </View>

                  {/* Weight Card */}
                  <View
                    style={{
                      padding: 12,
                      borderRadius: Radius.lg,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      borderWidth: BorderWidth.hairline,
                      borderColor: cardBorder,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
                      {t('metrics.bodyWeight')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <TextInput
                        value={weightInput}
                        onChangeText={setWeightInput}
                        onBlur={() => {
                          const num = parseFloat(weightInput);
                          if (!isNaN(num) && num > 0) {
                            const inKg = currentUnits === 'Imperial' ? num / 2.20462 : num;
                            updateProfile({ weight: inKg.toFixed(1) });
                          }
                        }}
                        placeholder={t('metrics.weightPlaceholder')}
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                        style={{
                          height: 38,
                          flex: 1,
                          color: colors.text,
                          fontSize: 17,
                          fontWeight: '800',
                        }}
                      />
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: Radius.pill,
                          backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.10)',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#ec4899' }}>
                          {currentUnits === 'Imperial' ? 'lbs' : 'kg'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* SECTION 5: DAILY AVAILABILITY (COLLAPSIBLE) */}
          <View
            style={{
              borderRadius: Radius.xl,
              backgroundColor: cardBackground,
              borderWidth: BorderWidth.hairline,
              borderColor: expandedSections.availability ? colors.primary : cardBorder,
              marginBottom: 14,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('availability')}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: Radius.lg,
                    backgroundColor: 'rgba(236, 72, 153, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={22} color="#ec4899" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {t('availability.title')}
                  </Text>
                  {!expandedSections.availability && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {t('availability.summary', { hours: totalWeeklyAvailability.toFixed(1) })}
                    </Text>
                  )}
                </View>
              </View>

              {expandedSections.availability ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {expandedSections.availability && (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 18,
                  paddingTop: 12,
                  borderTopWidth: BorderWidth.hairline,
                  borderTopColor: cardBorder,
                }}
              >
                {/* Total Capacity Summary Card */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: Radius.lg,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderWidth: BorderWidth.hairline,
                    borderColor: cardBorder,
                    marginBottom: 12,
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>
                      {t('availability.totalLabel')}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: 2 }}>
                      {totalWeeklyAvailability.toFixed(1)} <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{t('hoursPerWeek')}</Text>
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: Radius.pill,
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)',
                      borderWidth: BorderWidth.hairline,
                      borderColor: colors.primary,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                      {t('availability.target', { hours: weeklyHours })}
                    </Text>
                  </View>
                </View>

                {/* Daily Availability Stepper Cards */}
                <View style={{ gap: 8 }}>
                  {DAYS_OF_WEEK.map((day) => {
                    const hours = dailyMaxHours[day] ?? 1.5;
                    const isRest = hours === 0;

                    return (
                      <View
                        key={day}
                        style={{
                          padding: 12,
                          borderRadius: Radius.lg,
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                          borderWidth: BorderWidth.hairline,
                          borderColor: isRest ? cardBorder : colors.primary,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: isRest ? colors.textSecondary : colors.primary,
                              }}
                            />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                              {t(`weekdays.${day}`)}
                            </Text>
                          </View>

                          <Text style={{ fontSize: 14, fontWeight: '800', color: isRest ? colors.textSecondary : colors.primary }}>
                            {isRest ? t('availability.restDay') : t('availability.hours', { hours })}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => {
                              const newHours = Math.max(0, Math.round((hours - 0.5) * 10) / 10);
                              const updated = { ...dailyMaxHours, [day]: newHours };
                              const updates: any = { dailyMaxHours: updated };
                              if (day === 'Monday') updates.daily_available_hours = newHours;
                              updateProfile(updates, true);
                            }}
                            style={{
                              minWidth: 48,
                              height: 32,
                              paddingHorizontal: 8,
                              borderRadius: Radius.pill,
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>-0.5h</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              const newHours = Math.min(8, Math.round((hours + 0.5) * 10) / 10);
                              const updated = { ...dailyMaxHours, [day]: newHours };
                              const updates: any = { dailyMaxHours: updated };
                              if (day === 'Monday') updates.daily_available_hours = newHours;
                              updateProfile(updates, true);
                            }}
                            style={{
                              minWidth: 48,
                              height: 32,
                              paddingHorizontal: 8,
                              borderRadius: Radius.pill,
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>+0.5h</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* SECTION 6: STRENGTH EQUIPMENT (COLLAPSIBLE) */}
          {activitiesMap.strength && (
            <View
              style={{
                borderRadius: Radius.xl,
                backgroundColor: cardBackground,
                borderWidth: BorderWidth.hairline,
                borderColor: expandedSections.equipment ? colors.primary : cardBorder,
                marginBottom: 14,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                onPress={() => toggleSection('equipment')}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: Radius.lg,
                      backgroundColor: 'rgba(234, 179, 8, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Dumbbell size={22} color="#eab308" strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                      {t('equipment.title')}
                    </Text>
                    {!expandedSections.equipment && (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {t('equipment.summary', { available: equipmentCount, total: EQUIPMENT_LIST.length })}
                      </Text>
                    )}
                  </View>
                </View>

                {expandedSections.equipment ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {expandedSections.equipment && (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingBottom: 18,
                    paddingTop: 12,
                    borderTopWidth: BorderWidth.hairline,
                    borderTopColor: cardBorder,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
                    {t('equipment.hint')}
                  </Text>

                  <View style={{ gap: 8 }}>
                    {EQUIPMENT_LIST.map((item) => {
                      const isChecked = !!equipmentToggles[item.id];

                      return (
                        <View
                          key={item.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: Radius.lg,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderWidth: BorderWidth.hairline,
                            borderColor: isChecked ? colors.primary : cardBorder,
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '700', color: isChecked ? colors.text : colors.textSecondary, flex: 1, marginRight: 12 }}>
                            {t(`equipment.items.${item.id}`)}
                          </Text>

                          <Switch
                            value={isChecked}
                            onValueChange={() => toggleEquipment(item.id)}
                            trackColor={{ true: colors.primary }}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* SECTION 7: PARTNER INTEGRATIONS (COLLAPSIBLE) */}
          <View
            style={{
              borderRadius: Radius.xl,
              backgroundColor: cardBackground,
              borderWidth: BorderWidth.hairline,
              borderColor: expandedSections.integrations ? colors.primary : cardBorder,
              marginBottom: 24,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('integrations')}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: Radius.lg,
                    backgroundColor: 'rgba(234, 88, 12, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Link2 size={22} color="#ea580c" strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {t('integrations.title')}
                  </Text>
                  {!expandedSections.integrations && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {t('integrations.summary', { status: profile?.stravaConnected ? t('strava.connected') : t('strava.notConnected') })}
                    </Text>
                  )}
                </View>
              </View>

              {expandedSections.integrations ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {expandedSections.integrations && (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 18,
                  paddingTop: 12,
                  borderTopWidth: BorderWidth.hairline,
                  borderTopColor: cardBorder,
                }}
              >
                {/* Strava Integration Card with Compact Connect Button */}
                <View
                  style={{
                    padding: 14,
                    borderRadius: Radius.lg,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderWidth: BorderWidth.hairline,
                    borderColor: profile?.stravaConnected ? colors.primary : cardBorder,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                        Strava
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {t('strava.subtitle')}
                      </Text>
                    </View>

                    {profile?.stravaConnected && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: Radius.pill,
                          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(22, 163, 74, 0.12)',
                        }}
                      >
                        <Check size={12} color={colors.primary} strokeWidth={3} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{t('strava.connected')}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 12 }}>
                    {t('strava.description')}
                  </Text>

                  {/* Full width centered connect button */}
                  <GlassButton
                    onPress={handleStravaConnect}
                    disabled={connectingStrava}
                    loading={connectingStrava}
                    variant={profile?.stravaConnected ? 'glass' : 'glass-primary'}
                    shape="pill"
                    size="md"
                    glowColor={profile?.stravaConnected ? undefined : "#ea580c"}
                    style={{ width: '100%', height: 40 }}
                    contentContainerStyle={{ height: 40, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {profile?.stravaConnected ? (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
                          {t('strava.disconnect')}
                        </Text>
                      ) : (
                        <>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#4ade80' : '#15803d' }}>
                            {t('strava.connect')}
                          </Text>
                          <ExternalLink size={14} color={isDark ? '#4ade80' : '#15803d'} strokeWidth={2.2} />
                        </>
                      )}
                    </View>
                  </GlassButton>
                </View>
              </View>
            )}
          </View>

          {/* SECTION 8: WIZARD RE-RUN & ACCOUNT ACTIONS */}
          <View style={{ marginBottom: 30 }}>
            <GlassButton
              variant="glass"
              size="md"
              shape="pill"
              onPress={() => {
                Alert.alert(
                  t('account.wizardTitle'),
                  t('account.wizardMessage'),
                  [
                    { text: t('common:cancel'), style: 'cancel' },
                    {
                      text: t('account.rerun'),
                      onPress: async () => {
                        await updateProfile({ wizardCompleted: false });
                        router.replace('/wizard');
                      },
                    },
                  ]
                );
              }}
              style={{ height: 40 }}
              contentContainerStyle={{ height: 40, paddingHorizontal: 16, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
              className="mb-3 w-full"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{t('account.rerunWizard')}</Text>
              </View>
            </GlassButton>

            <GlassButton
              variant="glass-destructive"
              size="md"
              shape="pill"
              onPress={handleSignOut}
              style={{ height: 40 }}
              contentContainerStyle={{ height: 40, paddingHorizontal: 16, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
              className="mb-3 w-full"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>{t('account.signOut')}</Text>
              </View>
            </GlassButton>

            <GlassButton
              variant="glass-destructive"
              size="md"
              shape="pill"
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              loading={isDeleting}
              style={{ height: 40 }}
              contentContainerStyle={{ height: 40, paddingHorizontal: 16, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
              className="w-full"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>
                  {isDeleting ? t('account.deleting') : t('account.deleteAccount')}
                </Text>
              </View>
            </GlassButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Re-Authentication Modal */}
      <Modal visible={showReauthModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/70 justify-center items-center px-6"
        >
          <View
            style={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: colors.border,
              borderRadius: Radius.xxl,
              borderWidth: BorderWidth.hairline,
              padding: 24,
              width: '100%',
              maxWidth: 380,
            }}
            className="shadow-2xl"
          >
            <View className="items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-red-500/15 items-center justify-center mb-3">
                <Trash2 size={24} color="#ef4444" />
              </View>
              <Text variant="h2" style={{ fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
                {t('reauth.title')}
              </Text>
              <Text variant="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                {t('reauth.message')}
              </Text>
            </View>

            <View className="mb-4">
              <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">
                {t('reauth.passwordLabel')}
              </Text>
              <TextInput
                value={reauthPassword}
                onChangeText={(text) => {
                  setReauthPassword(text);
                  setReauthError('');
                }}
                placeholder={t('reauth.passwordPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                style={{
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  borderColor: reauthError ? '#ef4444' : colors.border,
                  borderWidth: BorderWidth.thin,
                  borderRadius: Radius.lg,
                  paddingHorizontal: 14,
                  height: 48,
                  fontSize: 15,
                }}
              />
              {!!reauthError && (
                <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>
                  {reauthError}
                </Text>
              )}
            </View>

            <View className="gap-2.5">
              <GlassButton
                label={isDeleting ? t('account.deleting') : t('reauth.confirm')}
                variant="glass-destructive"
                size="md"
                shape="pill"
                disabled={isDeleting || !reauthPassword.trim()}
                loading={isDeleting}
                onPress={() => executeAccountDeletion(reauthPassword)}
                style={{ height: 44 }}
                contentContainerStyle={{ height: 44, justifyContent: 'center', alignItems: 'center' }}
                textStyle={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}
              />
              <GlassButton
                label={t('common:cancel')}
                variant="glass"
                size="md"
                shape="pill"
                disabled={isDeleting}
                onPress={() => {
                  setShowReauthModal(false);
                  setReauthPassword('');
                  setReauthError('');
                }}
                style={{ height: 44 }}
                contentContainerStyle={{ height: 44, justifyContent: 'center', alignItems: 'center' }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center px-6">
          <View
            style={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: colors.border,
              borderRadius: Radius.xxl,
              borderWidth: BorderWidth.hairline,
              padding: 24,
              width: '100%',
              maxWidth: 380,
            }}
            className="shadow-2xl"
          >
            <View className="items-center mb-4">
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: Radius.pill,
                  backgroundColor: 'rgba(2, 132, 199, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Globe size={24} color="#0284c7" />
              </View>
              <Text variant="h2" style={{ fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
                {t('language.pickerTitle')}
              </Text>
              <Text variant="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                {t('language.helper')}
              </Text>
            </View>

            <View style={{ gap: 8, marginBottom: 16 }}>
              {languageOptions.map((language) => {
                const isSelected = language.choice === languageChoice;
                return (
                  <TouchableOpacity
                    key={language.choice}
                    onPress={() => selectLanguage(language.choice)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: Radius.lg,
                      backgroundColor: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.10)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'),
                      borderWidth: BorderWidth.hairline,
                      borderColor: isSelected ? colors.primary : cardBorder,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isSelected ? colors.primary : colors.text }}>
                      {language.name}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <GlassButton
              label={t('common:cancel')}
              variant="glass"
              size="md"
              shape="pill"
              onPress={() => setShowLanguagePicker(false)}
              style={{ height: 44 }}
              contentContainerStyle={{ height: 44, justifyContent: 'center', alignItems: 'center' }}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
