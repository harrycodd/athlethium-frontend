import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Header from '@/components/header';
import Text from '@/components/ui/text';
import Card from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { getWorkout, updateWorkout, Workout, deleteWorkout } from '@/lib/workout-service';
import { ActivityType } from '@/types/activity';
import { ChevronLeft, Calendar as CalendarIcon, Clock, ChevronDown, Check, Info, Trash2, Upload, Play, CheckCircle2, RefreshCw, Zap, Heart, FastForward } from 'lucide-react-native';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { Radius, BorderWidth, getIntensityZoneToken } from '@/constants/theme';
import { GlassButton } from '@/components/ui/glass-button';
import { Badge } from '@/components/ui/badge';
import { BarChart } from 'react-native-gifted-charts';
import WorkoutAnalysis from '@/components/workout-analysis';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFitFile } from '@/lib/fit-uploader';
import { cn } from '@/lib/utils';

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 32;

const SPORT_OPTIONS: { label: string; value: ActivityType }[] = [
  { label: 'Running', value: 'running' },
  { label: 'Cycling', value: 'cycling' },
  { label: 'Swimming', value: 'swimming' },
  { label: 'Strength', value: 'strength' },
  { label: 'Stretching', value: 'stretching' },
];

const parseWorkoutDate = (d: any): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d.toDate === 'function') return d.toDate();
  if (typeof d === 'object' && d.seconds) return new Date(d.seconds * 1000);
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

export default function SessionDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[], tab?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'details' | 'structure' | 'analysis'>((tab as 'analysis') || 'details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);

  const [name, setName] = useState('');
  const [sport, setSport] = useState<ActivityType>('running');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [duration, setDuration] = useState('00:00:00');

  const formatDurationInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let digits = cleaned.padStart(6, '0');
    if (digits.length > 6) digits = digits.slice(-6);
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const ss = digits.slice(4, 6);
    return `${hh}:${mm}:${ss}`;
  };

  const formatSecondsToHHMMSS = (totalSeconds: number) => {
    const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const ss = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const getDurationInSeconds = () => {
    const parts = duration.split(':').map(Number);
    if (parts.length !== 3) return 0;
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      try {
        const data = await getWorkout(id);
        if (data) {
          setWorkout(data);
          setName(data.name || '');
          setSport((data.sport as ActivityType) || 'running');
          setDescription(data.description || '');
          setSelectedDate(parseWorkoutDate(data.date));

          if (data.plannedTime && data.plannedTime > 0) {
            setDuration(formatSecondsToHHMMSS(data.plannedTime));
          } else if (data.segments && data.segments.length > 0) {
            const totalDuration = data.segments.reduce((acc, seg) => acc + (seg.duration || 0), 0);
            setDuration(formatSecondsToHHMMSS(totalDuration));
          }
        }
      } catch (error) {
        console.error("Failed to load workout details:", error);
        Alert.alert("Error", "Could not load session details.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const handleFileUpload = async () => {
    if (!user) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];

      if (file.name && !file.name.toLowerCase().endsWith('.fit')) {
        const proceed = await new Promise(resolve => {
          Alert.alert(
            "Verify File",
            "This doesn't look like a .fit file. Are you sure you want to upload it?",
            [
              { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
              { text: "Upload Anyway", onPress: () => resolve(true) }
            ]
          );
        });
        if (!proceed) return;
      }

      setUploading(true);

      const uploadResult = await uploadFitFile(user.uid, file, id);

      if (uploadResult.success) {
        Alert.alert('Success', 'Workout file uploaded and analyzed successfully!');
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      } else {
        console.error('Upload failed:', uploadResult.error);
        Alert.alert('Upload Error', uploadResult.error || 'Failed to upload workout file.');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error?.message || 'An error occurred during file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (markAsCompleted: boolean = false, isAutoSave: boolean = false) => {
    if (!workout || !workout.id) return;
    if (!isAutoSave) setSaving(true);
    try {
      const durationSecs = getDurationInSeconds();
      const minutesFormatted = Math.floor(durationSecs / 60);
      const durationStr = `${minutesFormatted}m`;
      const dateString = format(selectedDate, 'yyyy-MM-dd');

      const updates: Partial<Workout> = {
        name: name,
        sport: sport,
        description: description,
        date: dateString,
        meta: `${durationStr} • Updated`,
        plannedTime: durationSecs,
      };

      if (!workout.segments || workout.segments.length <= 1) {
        updates.segments = [{
          title: name,
          description: description,
          duration: durationSecs
        }];
      }

      if (markAsCompleted) {
        updates.status = 'completed';
        updates.completed = true;
        updates.completedAt = Timestamp.now();
        const isStrengthOrMobility = ['strength', 'stretching', 'yoga', 'rest'].includes(sport.toLowerCase());
        const plannedTss = isStrengthOrMobility ? 0 : (workout.plannedTss ?? workout.tss ?? 0);
        updates.tss = plannedTss;
        updates.actual_tss = plannedTss;
        const finalTime = durationSecs || workout.plannedTime || workout.time || 0;
        updates.time = finalTime;
        updates.actual_time = finalTime;
        updates.completion_type = 'manual_save';
      }

      await updateWorkout(workout.id, updates);

      if (isAutoSave) {
        setWorkout(prev => prev ? { ...prev, ...updates } : null);
      }

      if (markAsCompleted) {
        router.back();
      } else if (!isAutoSave) {
        Alert.alert("Success", "Session updated.");
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      if (!isAutoSave) Alert.alert("Error", "Failed to save changes.");
    } finally {
      if (!isAutoSave) setSaving(false);
    }
  };

  const debounceTimeout = React.useRef<any>(null);

  useEffect(() => {
    if (loading || !workout || !workout.id) return;

    const durationSecs = getDurationInSeconds();
    const dateString = format(selectedDate, 'yyyy-MM-dd');

    const hasChanged =
      name !== workout.name ||
      sport !== workout.sport ||
      description !== (workout.description || '') ||
      dateString !== workout.date ||
      durationSecs !== (workout.plannedTime || 0);

    if (!hasChanged) return;

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      handleSave(false, true);
    }, 1000);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [name, sport, description, selectedDate, duration, workout, loading]);

  const handleRedo = () => {
    Alert.alert(
      "Redo Workout",
      "Are you sure you want to redo this workout and mark it as no longer complete?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redo",
          style: "destructive",
          onPress: async () => {
            if (!workout?.id) return;
            try {
              setSaving(true);
              await updateWorkout(workout.id, {
                status: 'planned',
                completed: false,
                completedAt: null,
                stats: null,
                time: null,
                tss: null,
                actual_time: null,
                actual_tss: null,
                distance_m: null,
                fit_file_url: null,
                fit_file_path: null,
                fit_file_processed: null,
                completion_type: null,
                source: null,
                timeSeriesUrl: null
              } as any);

              router.back();
            } catch (error) {
              console.error("Error redoing workout:", error);
              Alert.alert("Error", "Failed to redo session.");
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!workout?.id) return;
            try {
              setSaving(true);
              await deleteWorkout(workout.id);
              router.back();
            } catch (error) {
              console.error("Error deleting workout:", error);
              Alert.alert("Error", "Failed to delete session.");
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const zoneToken = getIntensityZoneToken(workout?.intensity);

  const PickerButton = ({ label, value, icon: Icon, onPress }: any) => (
    <View className="mb-3 flex-1">
      <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">{label}</Text>
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
        <Text className="flex-1 text-[15px] font-semibold" style={{ color: theme.colors.text, includeFontPadding: false }}>{value}</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper scrollable={false} className="justify-center items-center" withTopInset={false}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenWrapper>
    );
  }

  const isCompleted = workout?.completed || workout?.status === 'completed';

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
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>Back</Text>
              </View>
            </GlassButton>

            <View className="flex-row gap-2 items-center">
              {isCompleted ? (
                <GlassButton
                  onPress={handleRedo}
                  disabled={uploading || saving}
                  shape="pill"
                  size="sm"
                  style={{ width: 84, height: 36 }}
                  contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 36, justifyContent: 'center', alignItems: 'center' }}
                >
                  <View className="flex-row items-center justify-center gap-1.5">
                    <RefreshCw size={13} color={theme.colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Redo</Text>
                  </View>
                </GlassButton>
              ) : (
                <GlassButton
                  onPress={handleFileUpload}
                  disabled={uploading || saving}
                  shape="pill"
                  size="sm"
                  style={{ width: 92, height: 36 }}
                  contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 36, justifyContent: 'center', alignItems: 'center' }}
                >
                  <View className="flex-row items-center justify-center gap-1.5">
                    <Upload size={13} color={theme.colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Upload</Text>
                  </View>
                </GlassButton>
              )}
              <GlassButton
                onPress={handleDelete}
                shape="circle"
                size="icon"
                style={{ width: 36, height: 36 }}
                contentContainerStyle={{ width: 36, height: 36, padding: 0 }}
              >
                <Trash2 size={16} color="#ef4444" />
              </GlassButton>
            </View>
          </View>

          {/* Prominent Session Title Section */}
          <View className="px-4 pt-3 pb-3">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Session Name"
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
              {workout?.intensity !== undefined && !['strength', 'stretching', 'yoga', 'rest'].includes(sport.toLowerCase()) && (
                <Badge label={zoneToken.shortName} intensity={workout.intensity} size="sm" />
              )}
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
                  {sport}
                </Text>
              </View>
              {workout?.tss !== undefined && workout.tss > 0 && (
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
                    {Math.round(workout.tss)} TSS
                  </Text>
                </View>
              )}
              {isCompleted && (
                <View 
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    borderColor: 'rgba(34, 197, 94, 0.35)',
                    borderWidth: BorderWidth.hairline,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: Radius.full,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={12} color={theme.colors.primary} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                    Completed
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Modal visible={uploading} transparent animationType="fade">
            <View className="flex-1 bg-background/80 justify-center items-center px-6">
              <View 
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderRadius: Radius.xxl,
                  borderWidth: BorderWidth.hairline,
                  padding: 24,
                  alignItems: 'center',
                }}
                className="w-full shadow-lg"
              >
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="h2" className="mt-6 mb-2 text-center">Uploading Workout</Text>
                <Text variant="muted" className="text-center">Parsing FIT file and generating analytics. This might take a few seconds...</Text>
              </View>
            </View>
          </Modal>

          {/* Tab Toggle */}
          <View className="px-4 flex-row gap-2 mb-4">
            <GlassButton
              label="Details"
              variant={activeTab === 'details' ? 'glass-primary' : 'glass'}
              size="sm"
              shape="pill"
              onPress={() => setActiveTab('details')}
              style={{ flex: 1, height: 36 }}
              contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, height: 36, width: '100%', justifyContent: 'center', alignItems: 'center' }}
              textStyle={{ fontSize: 13, fontWeight: '700' }}
            />

            {isCompleted && (
              <GlassButton
                label="Analysis"
                variant={activeTab === 'analysis' ? 'glass-primary' : 'glass'}
                size="sm"
                shape="pill"
                onPress={() => setActiveTab('analysis')}
                style={{ flex: 1, height: 36 }}
                contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, height: 36, width: '100%', justifyContent: 'center', alignItems: 'center' }}
                textStyle={{ fontSize: 13, fontWeight: '700' }}
              />
            )}

            <GlassButton
              label="Structure"
              variant={activeTab === 'structure' ? 'glass-primary' : 'glass'}
              size="sm"
              shape="pill"
              onPress={() => setActiveTab('structure')}
              style={{ flex: 1, height: 36 }}
              contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, height: 36, width: '100%', justifyContent: 'center', alignItems: 'center' }}
              textStyle={{ fontSize: 13, fontWeight: '700' }}
            />
          </View>

          {activeTab === 'analysis' ? (
            <WorkoutAnalysis workout={workout as any} />
          ) : (
            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
              {activeTab === 'details' ? (
                <View>
                  <View className="flex-row gap-2 items-stretch">
                    <PickerButton
                      label="Date"
                      value={format(selectedDate, 'EEE, MMM do')}
                      icon={CalendarIcon}
                      onPress={() => setShowDatePicker(true)}
                    />
                    <PickerButton
                      label="Sport"
                      value={SPORT_OPTIONS.find(s => s.value === sport)?.label || sport}
                      icon={Clock}
                      onPress={() => setShowSportPicker(true)}
                    />
                  </View>

                  <View className="mb-4">
                    <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">Planned Duration</Text>
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

                  {isCompleted && workout?.time ? (
                    <View className="mb-4">
                      <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">Session Duration</Text>
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
                          <CheckCircle2 size={16} color={theme.colors.primary} />
                        </View>
                        <Text className="flex-1 text-[15px] font-semibold" style={{ color: theme.colors.text, includeFontPadding: false }}>
                          {formatSecondsToHHMMSS(workout.time)}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View className="mb-6">
                    <Text variant="small" className="mb-1.5 ml-1 text-muted-foreground uppercase font-bold tracking-wider text-[11px]">Description & Goals</Text>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="What are the goals for this session?"
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
                        minHeight: 140,
                        padding: 14,
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    />
                  </View>
                </View>
              ) : (
                <WorkoutStructure workout={workout} />
              )}
            </ScrollView>
          )}

          {/* Sticky Actions */}
          {!isCompleted && (
            <View className="px-4 pt-3 pb-8 border-t border-border bg-background">
              <View className="flex-row gap-2">
                <GlassButton
                  variant="glass-primary"
                  size="lg"
                  shape="pill"
                  onPress={() => router.push({ pathname: '/activity/[id]' as any, params: { id: workout?.id } })}
                  style={{ flex: 1, height: 48 }}
                  contentContainerStyle={{ height: 48, justifyContent: 'center', alignItems: 'center' }}
                >
                  <View className="flex-row items-center gap-2">
                    <Play size={18} color={theme.isDark ? "#4ade80" : "#15803d"} fill={theme.isDark ? "#4ade80" : "#15803d"} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.isDark ? "#4ade80" : "#15803d" }}>Start Activity</Text>
                  </View>
                </GlassButton>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </ScreenWrapper>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(_event: any, date?: Date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Sport Picker Modal */}
      <Modal visible={showSportPicker} transparent animationType="slide">
        <TouchableOpacity className="flex-1 bg-black/50 justify-end" activeOpacity={1} onPress={() => setShowSportPicker(false)}>
          <View className="bg-card rounded-t-[32px] p-6 pb-12 border-t border-border">
            <Text variant="h2" className="mb-6">Select Sport</Text>
            {SPORT_OPTIONS.map((opt: any, index: number) => (
              <TouchableOpacity
                key={opt.label}
                onPress={() => {
                  setSport(opt.value);
                  setShowSportPicker(false);
                }}
                className={cn(
                  "flex-row items-center py-4 border-b border-border",
                  index === SPORT_OPTIONS.length - 1 && "border-b-0"
                )}
              >
                <Text className={`flex-1 text-lg ${sport === opt.value ? 'text-primary font-bold' : ''}`}>
                  {opt.label}
                </Text>
                {sport === opt.value && <Check size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
            <GlassButton 
              label="Cancel" 
              variant="glass" 
              size="lg" 
              shape="pill" 
              onPress={() => setShowSportPicker(false)} 
              className="mt-6 w-full" 
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function WorkoutStructure({ workout }: { workout: Workout | null }) {
  const theme = useTheme();
  const { profile } = useAuth();
  const isImperial = profile?.units === 'Imperial';

  const [timeSeriesRaw, setTimeSeriesRaw] = useState<Record<string, number[]> | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'speed' | 'power' | 'hr' | null>(null);

  useEffect(() => {
    let isMounted = true;
    const tsUrl = (workout as any)?.timeSeriesUrl;
    if (tsUrl) {
      fetch(tsUrl)
        .then(res => res.json())
        .then(data => {
          if (isMounted) setTimeSeriesRaw(data);
        })
        .catch(console.error);
    }
    return () => { isMounted = false; };
  }, [workout]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const formatPaceFromMinutes = (paceMinutes: number) => {
    if (!paceMinutes || paceMinutes <= 0) return '--:--';
    const totalSeconds = paceMinutes * 60;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const hasCompletedLaps = workout?.completed && workout?.stats?.laps && workout.stats.laps.length > 0;

  if (hasCompletedLaps) {
    if (!timeSeriesRaw) {
      return (
        <View className="py-20 items-center">
          <ActivityIndicator size="small" color={theme.primary} />
          <Text variant="muted" className="mt-2">Loading lap data...</Text>
        </View>
      );
    }

    const lapsRaw = workout.stats.laps;

    // Enrich laps with timeseries data
    const enrichedLaps = lapsRaw.map((lap: any) => {
      let startIndex = 0;
      let endIndex = 0;

      if (timeSeriesRaw['time']) {
        startIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= (lap.start_time_elapsed || 0));
        endIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= (lap.end_time_elapsed || 0));

        if (startIndex === -1) startIndex = 0;
        if (endIndex === -1 || endIndex <= startIndex) endIndex = timeSeriesRaw['time'].length - 1;
      }

      let duration = lap.total_elapsed_time || lap.total_timer_time;
      if (!duration && timeSeriesRaw['time']) {
        duration = timeSeriesRaw['time'][endIndex] - timeSeriesRaw['time'][startIndex];
      }

      let distance = lap.total_distance;
      if (!distance && timeSeriesRaw['distance']) {
        distance = timeSeriesRaw['distance'][endIndex] - timeSeriesRaw['distance'][startIndex];
      }

      const getAvg = (metric: string, requireMoving: boolean = false) => {
        if (!timeSeriesRaw[metric] || startIndex >= endIndex) return 0;
        let sum = 0;
        let count = 0;
        for (let i = startIndex; i <= endIndex; i++) {
          if (timeSeriesRaw[metric][i] != null) {
            const isMoving = timeSeriesRaw['moving'] ? timeSeriesRaw['moving'][i] : (timeSeriesRaw['speed'] ? timeSeriesRaw['speed'][i] > 0.5 : true);
            if (!requireMoving || isMoving) {
              sum += timeSeriesRaw[metric][i];
              count++;
            }
          }
        }
        return count > 0 ? sum / count : 0;
      };

      const avgPower = getAvg('power', true) || lap.average_watts;
      const avgHr = getAvg('heartrate', true) || lap.average_heartrate;
      const avgSpeed = getAvg('speed', true) || lap.average_speed;

      return {
        ...lap,
        derivedDuration: duration || 0,
        derivedDistance: distance || 0,
        derivedAvgPower: avgPower,
        derivedAvgHr: avgHr,
        derivedAvgSpeed: avgSpeed,
      };
    });

    const totalDuration = enrichedLaps.reduce((sum: number, lap: any) => sum + lap.derivedDuration, 0);

    const availableMetrics: ('speed' | 'power' | 'hr')[] = [];
    if (enrichedLaps.some((l: any) => l.derivedAvgPower > 0)) availableMetrics.push('power');
    if (enrichedLaps.some((l: any) => l.derivedAvgHr > 0)) availableMetrics.push('hr');
    if (enrichedLaps.some((l: any) => l.derivedAvgSpeed > 0)) availableMetrics.push('speed');

    let primaryMetric = selectedMetric;
    if (!primaryMetric) {
      if (availableMetrics.includes('power')) primaryMetric = 'power';
      else if (availableMetrics.includes('hr')) primaryMetric = 'hr';
      else primaryMetric = 'speed';
    }

    let maxMetricValue = 0;

    if (primaryMetric === 'power') {
      maxMetricValue = Math.max(...enrichedLaps.map((l: any) => l.derivedAvgPower));
    } else if (primaryMetric === 'hr') {
      maxMetricValue = Math.max(...enrichedLaps.map((l: any) => l.derivedAvgHr));
    } else {
      maxMetricValue = Math.max(...enrichedLaps.map((l: any) => l.derivedAvgSpeed));
    }

    const METRIC_CONFIG = {
      speed: { label: workout?.sport === 'running' ? 'Pace' : 'Speed', color: '#3B82F6', icon: FastForward },
      power: { label: 'Power', color: '#8B5CF6', icon: Zap },
      hr: { label: 'Heart Rate', color: '#EF4444', icon: Heart },
    };

    return (
      <View className="mb-6">
        {availableMetrics.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2 px-1">
              {availableMetrics.map(metric => {
                const config = METRIC_CONFIG[metric];
                const Icon = config.icon;
                const isActive = primaryMetric === metric;
                return (
                  <GlassButton
                    key={metric}
                    variant={isActive ? 'glass-primary' : 'glass'}
                    size="sm"
                    shape="pill"
                    onPress={() => setSelectedMetric(metric)}
                    style={{ minHeight: 32 }}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 }}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Icon size={14} color={isActive ? (theme.isDark ? '#4ade80' : '#15803d') : theme.textSecondary} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? (theme.isDark ? '#4ade80' : '#15803d') : theme.textSecondary }}>
                        {config.label}
                      </Text>
                    </View>
                  </GlassButton>
                );
              })}
            </View>
          </ScrollView>
        )}
        <Card className="p-4 mb-6 flex-row items-end h-[160px] border-none bg-muted/30 shadow-none overflow-hidden">
          {enrichedLaps.map((lap: any, index: number) => {
            const widthFlex = lap.derivedDuration > 0 ? lap.derivedDuration / Math.max(1, totalDuration) : 0;

            let metricValue = 0;
            if (primaryMetric === 'power') metricValue = lap.derivedAvgPower;
            else if (primaryMetric === 'hr') metricValue = lap.derivedAvgHr;
            else metricValue = lap.derivedAvgSpeed;

            const heightPercent = maxMetricValue > 0 ? Math.max(5, (metricValue / maxMetricValue) * 100) : 10;
            const isRest = metricValue < (maxMetricValue * 0.5);
            const color = isRest ? '#94a3b8' : theme.primary;

            return (
              <View
                key={`chart-lap-${index}`}
                style={{ flex: widthFlex, height: `${heightPercent}%`, backgroundColor: color, marginHorizontal: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}
              />
            );
          })}
        </Card>

        {enrichedLaps.map((lap: any, index: number) => {
          const lapDuration = lap.derivedDuration;
          const lapDistance = isImperial ? lap.derivedDistance / 1609.34 : lap.derivedDistance / 1000;
          const isRunning = workout.sport === 'running';

          let metricDisplay = '';
          let metricLabel = '';
          if (primaryMetric === 'power') {
            metricDisplay = `${Math.round(lap.derivedAvgPower)}W`;
            metricLabel = 'Avg Power';
          } else if (primaryMetric === 'hr') {
            metricDisplay = `${Math.round(lap.derivedAvgHr)} bpm`;
            metricLabel = 'Avg HR';
          } else {
            if (isRunning) {
              const lapPace = lap.derivedAvgSpeed > 0 ? 60 / lap.derivedAvgSpeed : 0;
              metricDisplay = `${formatPaceFromMinutes(lapPace)} /${isImperial ? 'mi' : 'km'}`;
              metricLabel = 'Avg Pace';
            } else {
              const lapSpeedMph = isImperial ? lap.derivedAvgSpeed * 0.621371 : lap.derivedAvgSpeed;
              metricDisplay = `${lapSpeedMph.toFixed(1)} ${isImperial ? 'mph' : 'km/h'}`;
              metricLabel = 'Avg Speed';
            }
          }

          return (
            <Card key={`lap-${index}`} className="mb-4 p-4 border-l-4 border-l-primary shadow-none">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="font-bold text-lg leading-tight">Lap {lap.lap_index || index + 1}</Text>
                  <View className="flex-row items-center mt-1">
                    <View className="mr-1">
                      <Clock size={12} color={theme.textSecondary} />
                    </View>
                    <Text variant="muted" className="text-xs font-medium">
                      {formatDuration(lapDuration)}
                    </Text>
                  </View>
                </View>
                <View className="bg-primary/10 px-2 py-1 rounded-lg">
                  <Text className="text-xs font-bold text-primary uppercase">Step {index + 1}</Text>
                </View>
              </View>

              <View className="flex-row justify-between mt-2 pt-2 border-t border-border">
                <View>
                  <Text variant="muted" className="text-[10px] uppercase font-bold tracking-widest">{metricLabel}</Text>
                  <Text className="font-semibold text-base">{metricDisplay}</Text>
                </View>
                <View className="items-end">
                  <Text variant="muted" className="text-[10px] uppercase font-bold tracking-widest">Distance</Text>
                  <Text className="font-semibold text-base">
                    {lapDistance > 0 ? `${lapDistance.toFixed(2)} ${isImperial ? 'mi' : 'km'}` : '--'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    );
  }

  const hasSteps = workout?.steps && workout.steps.length > 0;
  const hasSegments = workout?.segments && workout.segments.length > 0;

  if (!workout || (!hasSteps && !hasSegments)) {
    return (
      <View className="py-20 items-center">
        <Text variant="muted">No structure details available for this session.</Text>
      </View>
    );
  }

  // Generate chart data from steps (preferred) or segments
  const stepsData = (workout.steps || []).map((step: any) => ({
    value: step.target_high || step.target_low || (step.type === 'recovery' ? 50 : 80),
    frontColor: step.type === 'warmup' ? '#94a3b8' :
      step.type === 'cooldown' ? '#94a3b8' :
        step.type === 'recovery' ? '#10b981' :
          step.type === 'interval' ? '#ef4444' : theme.primary,
  }));

  const finalChartData = stepsData.length > 0 ? stepsData : (workout.segments || []).map((seg: any) => ({
    value: seg.duration ? 80 : 0,
    frontColor: theme.primary,
  }));

  const renderStepsList = () => {
    if (hasSteps) {
      return (workout.steps || []).map((step: any, index: number) => {
        const stepName = step.name || `${step.type.toUpperCase()} Step`;
        const durM = Math.floor(step.duration / 60);
        const durS = step.duration % 60;
        const durLabel = durM > 0 ? (durS > 0 ? `${durM}m ${durS}s` : `${durM}m`) : `${durS}s`;

        let targetBadge = null;
        if (step.target_low && step.target_high) {
          targetBadge = `${step.target_low}-${step.target_high}% FTP`;
        } else if (step.target_low) {
          targetBadge = `>${step.target_low}% FTP`;
        } else if (step.reps && step.sets) {
          targetBadge = `${step.sets} sets × ${step.reps} reps`;
        } else if (step.reps) {
          targetBadge = `${step.reps} reps`;
        }

        const isInterval = step.type === 'interval';
        const isRecovery = step.type === 'recovery';
        const borderColor = isInterval ? '#ef4444' : (isRecovery ? '#10b981' : theme.border);

        return (
          <Card key={index} className="mb-4 p-4 border-l-4 shadow-none" style={{ borderLeftColor: borderColor }}>
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-2">
                <Text className="font-bold text-lg leading-tight">{stepName}</Text>
                <View className="flex-row items-center mt-1 gap-2">
                  <View className="flex-row items-center">
                    <Clock size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                    <Text variant="muted" className="text-xs font-semibold">{durLabel}</Text>
                  </View>
                  {targetBadge && (
                    <View className="bg-muted px-2 py-0.5 rounded-md">
                      <Text className="text-[11px] font-bold text-primary">{targetBadge}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View className="bg-primary/10 px-2 py-1 rounded-lg">
                <Text className="text-xs font-bold text-primary uppercase">{step.type}</Text>
              </View>
            </View>

            {step.notes ? (
              <Text className="text-foreground/80 leading-5 text-sm mt-1">{step.notes}</Text>
            ) : null}
          </Card>
        );
      });
    }

    return (workout.segments || []).map((seg: any, index: number) => (
      <Card key={index} className="mb-4 p-4 border-l-4 border-l-primary shadow-none">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="font-bold text-lg leading-tight">{seg.title}</Text>
            {seg.duration && (
              <View className="flex-row items-center mt-1">
                <Clock size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                <Text variant="muted" className="text-xs font-medium">
                  {Math.floor(seg.duration / 60)}m {seg.duration % 60}s
                </Text>
              </View>
            )}
          </View>
          <View className="bg-primary/10 px-2 py-1 rounded-lg">
            <Text className="text-xs font-bold text-primary uppercase">Step {index + 1}</Text>
          </View>
        </View>

        {seg.description ? (
          <Text className="text-foreground/80 leading-5 text-sm">{seg.description}</Text>
        ) : null}
      </Card>
    ));
  };

  return (
    <View className="mb-6">
      {finalChartData.length > 0 && (
        <Card className="p-4 mb-6 items-center justify-center overflow-hidden h-[160px] border-none bg-muted/30 shadow-none">
          <BarChart
            data={finalChartData}
            width={CHART_WIDTH - 64}
            height={100}
            barWidth={Math.max(4, (CHART_WIDTH - 64) / Math.max(1, finalChartData.length))}
            spacing={0}
            initialSpacing={0}
            hideRules
            hideYAxisText
            yAxisThickness={0}
            xAxisThickness={2}
            xAxisColor={theme.border}
            maxValue={140}
            minHeight={5}
            isAnimated
            disableScroll
          />
        </Card>
      )}

      {renderStepsList()}
    </View>
  );
}
