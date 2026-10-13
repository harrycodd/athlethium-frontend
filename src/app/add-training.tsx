import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { createWorkout } from '@/lib/workout-service';
import { uploadFitFile } from '@/lib/fit-uploader';
import { ActivityType } from '@/types/activity';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  Check,
  Upload,
  Activity,
  Tag,
  Zap,
} from 'lucide-react-native';
import { format } from 'date-fns';
import DatePickerSheet from '@/components/date-picker-sheet';
import { Radius, BorderWidth } from '@/constants/theme';
import { GlassButton } from '@/components/ui/glass-button';
import { cn } from "@/lib/utils";
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/i18n/format';

const SPORT_OPTIONS: { labelKey: string; value: ActivityType }[] = [
  { labelKey: 'common:sports.running', value: 'running' },
  { labelKey: 'common:sports.cycling', value: 'cycling' },
  { labelKey: 'common:sports.swimming', value: 'swimming' },
  { labelKey: 'common:sports.strength', value: 'strength' },
  { labelKey: 'sports.stretching', value: 'stretching' },
  { labelKey: 'sports.other', value: 'other' },
];

// Stored as the workout's `type`; only the displayed label is translated.
const EVENT_TYPES = ['Session', 'Event', 'Goal'];
const EVENT_TYPE_KEYS: Record<string, string> = { Session: 'session', Event: 'event', Goal: 'goal' };

// `label` is written into the stored workout `meta` string, so it stays English; `key` is the display label.
const EFFORT_LEVELS = [
  { key: 'recovery', label: 'Recovery (Zone 1)', factor: 25 },
  { key: 'steady', label: 'Steady (Zone 2)', factor: 45 },
  { key: 'threshold', label: 'Threshold (Zone 3/4)', factor: 60 },
  { key: 'hard', label: 'VO2max / Hard (Zone 5)', factor: 80 },
];

export default function AddTrainingScreen() {
  const { t } = useTranslation('addTraining');
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

  const [name, setName] = useState('');
  const [sport, setSport] = useState<ActivityType>('running');
  const [eventType, setEventType] = useState('Session');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(dateParam ? new Date(dateParam) : new Date());

  const [duration, setDuration] = useState('00:30:00');
  const [effortLevel, setEffortLevel] = useState(EFFORT_LEVELS[1]); // Steady default

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showEffortPicker, setShowEffortPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sportLabel = (value: string) => {
    const option = SPORT_OPTIONS.find(s => s.value === value);
    return option ? t(option.labelKey) : value;
  };
  const eventTypeLabel = (value: string) => (EVENT_TYPE_KEYS[value] ? t(`eventTypes.${EVENT_TYPE_KEYS[value]}`) : value);
  const effortLabel = (level: (typeof EFFORT_LEVELS)[number]) => t(`effortLevels.${level.key}`);

  const formatDurationInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let digits = cleaned.padStart(6, '0');
    if (digits.length > 6) digits = digits.slice(-6);
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const ss = digits.slice(4, 6);
    return `${hh}:${mm}:${ss}`;
  };

  const getDurationInSeconds = () => {
    const parts = duration.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  };

  const isStrengthOrMobility = ['strength', 'stretching', 'yoga'].includes(sport.toLowerCase());

  const calculateTSS = () => {
    if (isStrengthOrMobility) return 0;
    const totalHours = getDurationInSeconds() / 3600;
    return Math.round(totalHours * effortLevel.factor);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert(t('alerts.requiredTitle'), t('alerts.nameRequired'));
      return;
    }

    setLoading(true);
    try {
      const durationSecs = getDurationInSeconds();
      const minutesFormatted = Math.floor(durationSecs / 60);
      const durationStr = `${minutesFormatted}m`;
      const tss = isStrengthOrMobility ? 0 : calculateTSS();
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const meta = isStrengthOrMobility
        ? `${durationStr} • ${sport.toUpperCase()}`
        : `${durationStr} • ${effortLevel.label} • ~${tss} TSS`;

      await createWorkout({
        userId: user.uid,
        sport,
        name: name.trim(),
        description: description.trim() || `Manually added ${sport} session`,
        meta,
        date: dateString,
        completed: false,
        status: 'planned',
        type: eventType,
        segments: [
          {
            title: `Manual ${sport} session`,
            description: description.trim() || `Manual ${sport} session`,
            duration: durationSecs,
          },
        ],
        plannedTime: durationSecs,
        plannedTss: tss,
      });

      router.back();
    } catch (error) {
      console.error('Failed to add training:', error);
      Alert.alert(t('common:error'), t('alerts.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const file = result.assets[0];

      const uploadResult = await uploadFitFile(user!.uid, file);

      if (uploadResult.success) {
        Alert.alert(t('common:success'), t('alerts.uploadSuccess'));
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      } else {
        console.error('Upload failed:', uploadResult.error);
        Alert.alert(t('alerts.uploadErrorTitle'), uploadResult.error || t('alerts.uploadFailed'));
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(t('common:error'), error?.message || t('alerts.uploadException'));
    } finally {
      setUploading(false);
    }
  };

  const PickerButton = ({ label, value, icon: Icon, onPress }: any) => (
    <View className="mb-3 flex-1">
      <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={{
          borderRadius: Radius.xl,
          borderWidth: BorderWidth.hairline,
          borderColor: theme.colors.border,
          backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View className="mr-2.5">
          <Icon size={16} color={theme.colors.primary} />
        </View>
        <Text
          className="flex-1 text-[15px] font-semibold"
          style={{ color: theme.colors.text, includeFontPadding: false }}
          numberOfLines={1}
        >
          {value}
        </Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <ScreenWrapper scrollable={false} withTopInset={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          {/* Navigation Bar */}
          <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
            <GlassButton
              onPress={() => router.back()}
              shape="pill"
              size="sm"
              style={{ width: 80, height: 36 }}
              contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 36, justifyContent: 'center', alignItems: 'center' }}
            >
              <View className="flex-row items-center justify-center gap-1">
                <ChevronLeft size={16} color={theme.colors.text} strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>{t('common:back')}</Text>
              </View>
            </GlassButton>

            <View className="flex-row gap-2 items-center">
              <GlassButton
                onPress={handleFileUpload}
                disabled={uploading || loading}
                shape="pill"
                size="sm"
                style={{ width: 92, height: 36 }}
                contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 36, justifyContent: 'center', alignItems: 'center' }}
              >
                <View className="flex-row items-center justify-center gap-1.5">
                  <Upload size={13} color={theme.colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>{t('upload')}</Text>
                </View>
              </GlassButton>
            </View>
          </View>

          {/* Prominent Session Title Section */}
          <View className="px-4 pt-3 pb-3">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('namePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline={true}
              className="text-2xl font-black tracking-tight"
              style={{
                color: theme.colors.text,
                includeFontPadding: false,
                paddingVertical: 0,
                lineHeight: 30,
              }}
            />
            <View className="flex-row items-center gap-2 mt-2 flex-wrap">
              {/* Sport Badge */}
              <View
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  borderColor: 'rgba(34, 197, 94, 0.35)',
                  borderWidth: BorderWidth.hairline,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: Radius.full,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'capitalize' }}>
                  {sportLabel(sport)}
                </Text>
              </View>

              {/* Event Type Badge */}
              <View
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: theme.colors.border,
                  borderWidth: BorderWidth.hairline,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: Radius.full,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
                  {eventTypeLabel(eventType)}
                </Text>
              </View>

              {/* Calculated TSS Badge */}
              {!isStrengthOrMobility && (
                <View
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: theme.colors.border,
                    borderWidth: BorderWidth.hairline,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: Radius.full,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
                    {t('tssBadge', { tss: calculateTSS() })}
                  </Text>
                </View>
              )}

              {/* Effort Level Badge */}
              {!isStrengthOrMobility && (
                <View
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: BorderWidth.hairline,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: Radius.full,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#60a5fa' }}>
                    {effortLabel(effortLevel)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Uploading Modal */}
          <Modal visible={uploading} transparent animationType="fade">
            <View className="flex-1 bg-black/60 justify-center items-center px-6">
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.colors.border,
                  borderRadius: Radius.xxl,
                  borderWidth: BorderWidth.hairline,
                  padding: 24,
                  alignItems: 'center',
                }}
                className="w-full shadow-lg"
              >
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="h2" className="mt-5 mb-2 text-center">{t('uploading.title')}</Text>
                <Text variant="muted" className="text-center text-xs">
                  {t('uploading.message')}
                </Text>
              </View>
            </View>
          </Modal>

          <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
            <View>
              {/* Row 1: Date & Sport */}
              <View className="flex-row gap-2 items-stretch">
                <PickerButton
                  label={t('fields.date')}
                  value={formatDate(selectedDate, 'EEE, MMM do')}
                  icon={CalendarIcon}
                  onPress={() => setShowDatePicker(true)}
                />
                <PickerButton
                  label={t('fields.sport')}
                  value={sportLabel(sport)}
                  icon={Activity}
                  onPress={() => setShowSportPicker(true)}
                />
              </View>

              {/* Row 2: Type & Effort Level */}
              <View className="flex-row gap-2 items-stretch">
                <PickerButton
                  label={t('fields.type')}
                  value={eventTypeLabel(eventType)}
                  icon={Tag}
                  onPress={() => setShowTypePicker(true)}
                />
                {!isStrengthOrMobility && (
                  <PickerButton
                    label={t('fields.effortLevel')}
                    value={effortLabel(effortLevel)}
                    icon={Zap}
                    onPress={() => setShowEffortPicker(true)}
                  />
                )}
              </View>

              {/* Planned Duration */}
              <View className="mb-4">
                <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">
                  {t('fields.plannedDuration')}
                </Text>
                <View
                  style={{
                    borderRadius: Radius.xl,
                    borderWidth: BorderWidth.hairline,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  }}
                  className="py-3 px-3.5 flex-row items-center"
                >
                  <View className="mr-2.5">
                    <Clock size={16} color={theme.colors.primary} />
                  </View>
                  <TextInput
                    value={duration}
                    onChangeText={(text) => setDuration(formatDurationInput(text))}
                    keyboardType="numeric"
                    placeholder="00:00:00"
                    placeholderTextColor={theme.colors.textSecondary}
                    className="flex-1 text-[15px] font-semibold p-0 m-0"
                    style={{ color: theme.colors.text, includeFontPadding: false, textAlignVertical: 'center', paddingVertical: 0 }}
                  />
                </View>
              </View>

              {/* Description & Goals */}
              <View className="mb-6">
                <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">
                  {t('fields.description')}
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('fields.descriptionPlaceholder')}
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  style={{
                    borderRadius: Radius.xl,
                    borderWidth: BorderWidth.hairline,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    color: theme.colors.text,
                    textAlignVertical: 'top',
                    includeFontPadding: false,
                    minHeight: 120,
                    padding: 14,
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                />
              </View>
            </View>
          </ScrollView>

          {/* Sticky Actions */}
          <View className="px-4 pt-3 pb-8 border-t border-border bg-background">
            <View className="flex-row gap-2">
              <GlassButton
                label={loading ? t('saving') : t('addToPlan')}
                variant="glass-primary"
                size="lg"
                shape="pill"
                onPress={handleSave}
                disabled={loading}
                loading={loading}
                style={{ flex: 1, height: 48 }}
                contentContainerStyle={{ height: 48, justifyContent: 'center', alignItems: 'center' }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenWrapper>

      {/* Date Picker Modal */}
      <DatePickerSheet
        visible={showDatePicker}
        value={selectedDate}
        title={t('fields.date')}
        onChange={setSelectedDate}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Modals for Pickers */}
      <SelectionModal
        visible={showSportPicker}
        onClose={() => setShowSportPicker(false)}
        title={t('pickers.sport')}
        options={SPORT_OPTIONS.map(s => ({ label: t(s.labelKey), value: s.value }))}
        selectedValue={sport}
        onSelect={(val: any) => setSport(val)}
      />

      <SelectionModal
        visible={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        title={t('pickers.eventType')}
        options={EVENT_TYPES.map(type => ({ label: eventTypeLabel(type), value: type }))}
        selectedValue={eventType}
        onSelect={(val: any) => setEventType(val)}
      />

      <SelectionModal
        visible={showEffortPicker}
        onClose={() => setShowEffortPicker(false)}
        title={t('pickers.effortLevel')}
        options={EFFORT_LEVELS.map(e => ({ label: effortLabel(e), value: e }))}
        selectedValue={effortLevel}
        onSelect={(val: any) => setEffortLevel(val)}
      />
    </>
  );
}

function SelectionModal({ visible, onClose, title, options, selectedValue, onSelect }: any) {
  const { t } = useTranslation('addTraining');
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="bg-card rounded-t-[32px] p-6 pb-12 border-t border-border">
          <Text variant="h2" className="mb-6">{title}</Text>
          {options.map((opt: any, index: number) => {
            const isSelected = selectedValue === opt.value || selectedValue?.label === opt.value?.label;
            return (
              <TouchableOpacity
                key={opt.label}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className={cn(
                  "flex-row items-center py-4 border-b border-border",
                  index === options.length - 1 && "border-b-0"
                )}
              >
                <Text className={`flex-1 text-lg ${isSelected ? 'text-primary font-bold' : ''}`}>
                  {opt.label}
                </Text>
                {isSelected && <Check size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
          <GlassButton
            label={t('common:cancel')}
            variant="glass"
            size="lg"
            shape="pill"
            onPress={onClose}
            className="mt-6 w-full"
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
