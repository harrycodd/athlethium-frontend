import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Modal, Switch, PanResponder } from 'react-native';
import ScreenWrapper from '@/components/ui/screen-wrapper';
import Header from '@/components/header';
import Text from '@/components/ui/text';
import Card from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { LineChart } from 'react-native-gifted-charts';
import { Check, ChevronDown, X, Calendar } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth;
const CHART_SIDE_PADDING = 40;
const CHART_CONTAINER_WIDTH = CHART_WIDTH - (CHART_SIDE_PADDING * 2);
const INITIAL_SPACING = 12;
const END_SPACING = 12;

const METRIC_CONFIG: Record<string, { label: string, color: string, group: 'training' | 'readiness' | 'body' }> = {
  ctl: { label: 'Load (CTL)', color: '#10B981', group: 'training' },
  atl: { label: 'Fatigue (ATL)', color: '#F97316', group: 'training' },
  form: { label: 'Form', color: '#3B82F6', group: 'training' },
  sleep: { label: 'Sleep', color: '#6366F1', group: 'readiness' },
  physical: { label: 'Physical', color: '#8B5CF6', group: 'readiness' },
  mental: { label: 'Mental', group: 'readiness', color: '#A855F7' },
  weight: { label: 'Weight', color: '#EC4899', group: 'body' },
  injury: { label: 'Injury', color: '#EF4444', group: 'readiness' },
  illness: { label: 'Illness', color: '#F43F5E', group: 'readiness' },
};

const METRIC_GROUPS = [
  { id: 'training', title: 'Training Load', keys: ['ctl', 'atl', 'form'] },
  { id: 'readiness', title: 'Daily Readiness', keys: ['sleep', 'physical', 'mental', 'injury', 'illness'] },
  { id: 'body', title: 'Body Metrics', keys: ['weight'] },
];

export default function ProgressScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeRange, setActiveRange] = useState<'7d' | '14d' | '28d'>('14d');
  const [activePreset, setActivePreset] = useState<'Load' | 'Readiness' | 'Custom'>('Load');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['ctl', 'atl', 'form']);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [chartHeight, setChartHeight] = useState(220);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Generate dynamic data from profile.dailyMetricsHistory
  const dynamicData = useMemo(() => {
    let daysToLookBack = activeRange === '7d' ? 7 : activeRange === '14d' ? 14 : 28;
    const today = new Date();
    const isImperial = profile?.units === 'Imperial';

    // Track the latest load values to "fill forward" for continuous lines
    // We default to the user's current profile values if no history is found yet
    let lastKnownLoad = {
      ctl: profile?.ctl || 0,
      atl: profile?.atl || 0,
      form: (profile?.ctl || 0) - (profile?.atl || 0)
    };

    // We process from furthest back to today
    const tempDays = [];
    for (let i = daysToLookBack - 1; i >= 0; i--) {
      const targetDate = subDays(today, i);
      const dateKey = format(targetDate, 'yyyy-MM-dd');
      const dayMetrics = profile?.dailyMetricsHistory?.[dateKey] || {};

      // Load metrics carry forward if missing for a day
      if (dayMetrics.ctl !== undefined) lastKnownLoad.ctl = dayMetrics.ctl;
      if (dayMetrics.atl !== undefined) lastKnownLoad.atl = dayMetrics.atl;
      if (dayMetrics.form !== undefined) lastKnownLoad.form = dayMetrics.form;

      let weightVal = dayMetrics.weight ? parseFloat(dayMetrics.weight) : null;
      if (weightVal !== null && isImperial) {
        weightVal *= 2.20462; // kg to lbs conversion
      }

      const metrics: Record<string, number | null> = {
        ctl: lastKnownLoad.ctl,
        atl: lastKnownLoad.atl,
        form: lastKnownLoad.form,
        sleep: dayMetrics.sleep || null,
        physical: dayMetrics.physicallyFeeling || null,
        mental: dayMetrics.mentallyFeeling || null,
        weight: weightVal,
        injury: (dayMetrics.injury && dayMetrics.injury !== 'None') ? 1 : (dayMetrics.injury === 'None' ? 0 : null),
        illness: (dayMetrics.illness && dayMetrics.illness !== 'None') ? 1 : (dayMetrics.illness === 'None' ? 0 : null),
      };

      tempDays.push({
        date: dateKey,
        label: String(i + 1),
        metrics
      });
    }

    return tempDays;
  }, [profile, activeRange]);

  const chartSpacing = useMemo(() => {
    const count = dynamicData.length;
    if (count <= 1) return CHART_CONTAINER_WIDTH - (INITIAL_SPACING + END_SPACING);
    return (CHART_CONTAINER_WIDTH - (INITIAL_SPACING + END_SPACING)) / (count - 1);
  }, [dynamicData.length]);

  const selectedDay = selectedDayIndex !== null && selectedDayIndex >= 0 && selectedDayIndex < dynamicData.length
    ? dynamicData[selectedDayIndex]
    : null;

  const updateDayFromX = useCallback((x: number) => {
    if (!dynamicData.length) return;
    const rawIndex = Math.round((x - INITIAL_SPACING) / chartSpacing);
    const clampedIndex = Math.max(0, Math.min(dynamicData.length - 1, rawIndex));
    setSelectedDayIndex(clampedIndex);
  }, [dynamicData.length, chartSpacing]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      updateDayFromX(evt.nativeEvent.locationX);
    },
    onPanResponderMove: (evt) => {
      updateDayFromX(evt.nativeEvent.locationX);
    },
  }), [updateDayFromX]);

  const formatMetricValue = (key: string, val: number | null) => {
    if (val === null || val === undefined) return '--';
    const isImperial = profile?.units === 'Imperial';
    switch (key) {
      case 'ctl':
      case 'atl':
        return `${Math.round(val)}`;
      case 'form':
        return `${val > 0 ? '+' : ''}${Math.round(val)}`;
      case 'sleep':
      case 'physical':
      case 'mental':
        return `${val}/5`;
      case 'weight':
        return `${val.toFixed(1)} ${isImperial ? 'lbs' : 'kg'}`;
      case 'injury':
      case 'illness':
        return val === 1 ? 'Yes' : 'None';
      default:
        return `${val}`;
    }
  };

  const getAxisBounds = (metricKeys: string[]) => {
    if (metricKeys.length === 0) return { min: 0, max: 100 };

    // If we have any readiness metrics, they always use a fixed 0-5 scale
    if (metricKeys.some(k => METRIC_CONFIG[k].group === 'readiness')) {
      return { min: 0, max: 5 };
    }

    let min = Infinity;
    let max = -Infinity;

    metricKeys.forEach(key => {
      dynamicData.forEach(day => {
        const val = day.metrics[key];
        if (val !== null) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });

    if (min === Infinity || max === -Infinity) return { min: 0, max: 100 };
    if (min === max) return { min: min - 5, max: max + 5 };

    const buffer = (max - min) * 0.1 || 5;
    return { min: min - buffer, max: max + buffer };
  };

  // Pre-calculate bounds for each active group
  const trainingMetrics = selectedMetrics.filter(k => METRIC_CONFIG[k].group === 'training');
  const bodyMetrics = selectedMetrics.filter(k => METRIC_CONFIG[k].group === 'body');

  const readinessBounds = { min: 0, max: 5 };
  const trainingBounds = getAxisBounds(trainingMetrics);
  const bodyBounds = getAxisBounds(bodyMetrics);

  const getChartData = (key: string) => {
    const config = METRIC_CONFIG[key];
    // Map current metric to its shared group bounds
    const { min, max } = config.group === 'readiness' ? readinessBounds : (config.group === 'training' ? trainingBounds : bodyBounds);
    const range = max - min || 1;

    let lastValidValue = 0;
    const labelStep = activeRange === '7d' ? 1 : activeRange === '14d' ? 2 : 4;

    return dynamicData.map((day, index) => {
      const rawVal = day.metrics[key];
      const isLoadMetric = config.group === 'training';

      const dayMetrics = profile?.dailyMetricsHistory?.[day.date] || {};
      const hasActualLog = dayMetrics[key] !== undefined || (key === 'weight' && dayMetrics.weight);
      const shouldPlotPoint = isLoadMetric || hasActualLog;

      if (rawVal !== null) {
        lastValidValue = ((rawVal - min) / range) * 100;
      }

      const isLabelVisible = index % labelStep === 0 || index === dynamicData.length - 1;

      return {
        value: lastValidValue,
        label: isLabelVisible ? day.label : '',
        labelTextStyle: { color: theme.textSecondary, fontSize: 10, width: 40, textAlign: 'center', marginLeft: -12 },
        hideDataPoint: !shouldPlotPoint,
        dataPointColor: shouldPlotPoint ? METRIC_CONFIG[key].color : 'transparent',
        onPress: () => setSelectedDayIndex(prev => prev === index ? null : index),
      };
    });
  };

  const linesToRender = selectedMetrics.slice(0, 5);
  const chartProps: any = {
    data: linesToRender.length > 0 ? getChartData(linesToRender[0]) : [],
    color1: linesToRender.length > 0 ? METRIC_CONFIG[linesToRender[0]].color : 'transparent',
    dataPointsColor1: linesToRender.length > 0 ? METRIC_CONFIG[linesToRender[0]].color : 'transparent',
    thickness1: 3,
  };

  if (linesToRender.length > 1) {
    chartProps.data2 = getChartData(linesToRender[1]);
    chartProps.color2 = METRIC_CONFIG[linesToRender[1]].color;
    chartProps.dataPointsColor2 = METRIC_CONFIG[linesToRender[1]].color;
    chartProps.thickness2 = 3;
  }
  if (linesToRender.length > 2) {
    chartProps.data3 = getChartData(linesToRender[2]);
    chartProps.color3 = METRIC_CONFIG[linesToRender[2]].color;
    chartProps.dataPointsColor3 = METRIC_CONFIG[linesToRender[2]].color;
    chartProps.thickness3 = 3;
  }
  if (linesToRender.length > 3) {
    chartProps.data4 = getChartData(linesToRender[3]);
    chartProps.color4 = METRIC_CONFIG[linesToRender[3]].color;
    chartProps.dataPointsColor4 = METRIC_CONFIG[linesToRender[3]].color;
    chartProps.thickness4 = 3;
  }
  if (linesToRender.length > 4) {
    chartProps.data5 = getChartData(linesToRender[4]);
    chartProps.color5 = METRIC_CONFIG[linesToRender[4]].color;
    chartProps.dataPointsColor5 = METRIC_CONFIG[linesToRender[4]].color;
    chartProps.thickness5 = 3;
  }

  // Both scales are shown at all times
  const leftAxisGroup: string = 'readiness';
  const rightAxisGroup: string = (bodyMetrics.length > 0 && trainingMetrics.length === 0) ? 'body' : 'training';

  // Left Axis Configuration
  let leftAxisTitle = '';
  let leftAxisColor = 'transparent';
  let leftLabelBounds = { min: 0, max: 5 };
  let leftLabelPrecision = 0;

  if (leftAxisGroup === 'readiness') {
    leftAxisTitle = 'Readiness';
    leftAxisColor = '#8B5CF6'; // Violet
    leftLabelBounds = readinessBounds;
    leftLabelPrecision = 0;
  } else if (leftAxisGroup === 'body') {
    leftAxisTitle = `Weight (${profile?.units === 'Imperial' ? 'lbs' : 'kg'})`;
    leftAxisColor = '#EC4899'; // Pink
    leftLabelBounds = bodyBounds;
    leftLabelPrecision = 1;
  }

  // Right Axis Configuration
  let rightAxisTitle = '';
  let rightAxisColor = 'transparent';
  let rightLabelBounds = { min: 0, max: 100 };
  let rightLabelPrecision = 0;

  if (rightAxisGroup === 'training') {
    rightAxisTitle = 'Training Load';
    rightAxisColor = '#10B981'; // Emerald
    rightLabelBounds = trainingBounds;
    rightLabelPrecision = 0;
  } else if (rightAxisGroup === 'body') {
    rightAxisTitle = `Weight (${profile?.units === 'Imperial' ? 'lbs' : 'kg'})`;
    rightAxisColor = '#EC4899'; // Pink
    rightLabelBounds = bodyBounds;
    rightLabelPrecision = 1;
  }

  const getMetricLegendInfo = (key: string) => {
    const config = METRIC_CONFIG[key];
    const isImperial = profile?.units === 'Imperial';
    const weightUnit = isImperial ? 'lbs' : 'kg';

    if (config.group === 'readiness') {
      return {
        axisLabel: 'Left',
        rangeLabel: '0-5',
      };
    }

    if (config.group === 'training') {
      const minVal = Math.round(trainingBounds.min);
      const maxVal = Math.round(trainingBounds.max);
      return {
        axisLabel: 'Right',
        rangeLabel: `${minVal}-${maxVal}`,
      };
    }

    if (config.group === 'body') {
      const minVal = Math.round(bodyBounds.min);
      const maxVal = Math.round(bodyBounds.max);
      let axisLabel = 'Scaled';
      if (leftAxisGroup === 'body') {
        axisLabel = 'Left';
      } else if (rightAxisGroup === 'body') {
        axisLabel = 'Right';
      }
      return {
        axisLabel,
        rangeLabel: `${minVal}-${maxVal} ${weightUnit}`,
      };
    }

    return { axisLabel: '', rangeLabel: '' };
  };

  const RangeButton = ({ range, label }: { range: '7d' | '14d' | '28d', label: string }) => {
    const isActive = activeRange === range;
    return (
      <GlassButton
        label={label}
        variant={isActive ? "glass-primary" : "glass"}
        shape="pill"
        size="sm"
        onPress={() => {
          setActiveRange(range);
          setSelectedDayIndex(null);
        }}
        style={{ flex: 1, height: 36 }}
        contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, height: 36, width: '100%', justifyContent: 'center', alignItems: 'center' }}
        textStyle={{ fontSize: 13, fontWeight: '700' }}
      />
    );
  };

  const handlePresetChange = (preset: 'Load' | 'Readiness' | 'Custom') => {
    setActivePreset(preset);
    setShowPresetDropdown(false);

    if (preset === 'Load') {
      setSelectedMetrics(['ctl', 'atl', 'form']);
    } else if (preset === 'Readiness') {
      setSelectedMetrics(['sleep', 'physical', 'mental']);
    } else {
      setShowCustomModal(true);
    }
  };

  const toggleCustomMetric = (key: string) => {
    if (selectedMetrics.includes(key)) {
      setSelectedMetrics(prev => prev.filter(k => k !== key));
    } else {
      if (selectedMetrics.length < 5) {
        setSelectedMetrics(prev => [...prev, key]);
      }
    }
  };

  return (
    <>
      <ScreenWrapper className="px-0" scrollable={false} withBottomInset={false}>
        <View className="flex-1" style={{ paddingBottom: insets.bottom + 60 }}>
          <View className="px-4">
            <Header title="Progress" subtitle="Track your fitness metrics over time" />

            <View className="flex-row justify-between gap-2 mb-6">
              <RangeButton range="7d" label="7 Days" />
              <RangeButton range="14d" label="14 Days" />
              <RangeButton range="28d" label="28 Days" />
            </View>

            <View className="flex-row items-center justify-between mb-6 z-10 relative">
              <Text variant="h3">Interactive Chart</Text>
              <GlassButton
                variant="glass"
                size="sm"
                shape="pill"
                onPress={() => setShowPresetDropdown(!showPresetDropdown)}
                style={{ width: 110, height: 34 }}
                contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 34, justifyContent: 'center', alignItems: 'center' }}
              >
                <View className="flex-row items-center justify-center gap-1.5">
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text }}>{activePreset}</Text>
                  <ChevronDown size={14} color={theme.colors.text} strokeWidth={2.5} />
                </View>
              </GlassButton>
            </View>

            {showPresetDropdown && (
              <GlassCard 
                style={{ 
                  position: 'absolute', 
                  top: 136, 
                  right: 16, 
                  width: 200, 
                  padding: 6, 
                  zIndex: 50,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                }}
              >
                <TouchableOpacity 
                  onPress={() => handlePresetChange('Load')} 
                  className={cn(
                    "p-3 rounded-xl flex-row items-center justify-between",
                    activePreset === 'Load' ? "bg-primary/15" : "bg-transparent"
                  )}
                >
                  <Text className={cn("text-sm font-semibold", activePreset === 'Load' ? "text-primary font-bold" : "text-foreground")}>
                    Fitness & Fatigue
                  </Text>
                  {activePreset === 'Load' && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handlePresetChange('Readiness')} 
                  className={cn(
                    "p-3 rounded-xl flex-row items-center justify-between",
                    activePreset === 'Readiness' ? "bg-primary/15" : "bg-transparent"
                  )}
                >
                  <Text className={cn("text-sm font-semibold", activePreset === 'Readiness' ? "text-primary font-bold" : "text-foreground")}>
                    Daily Readiness
                  </Text>
                  {activePreset === 'Readiness' && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handlePresetChange('Custom')} 
                  className={cn(
                    "p-3 rounded-xl flex-row items-center justify-between",
                    activePreset === 'Custom' ? "bg-primary/15" : "bg-transparent"
                  )}
                >
                  <Text className={cn("text-sm font-semibold", activePreset === 'Custom' ? "text-primary font-bold" : "text-foreground")}>
                    Custom...
                  </Text>
                  {activePreset === 'Custom' && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>
              </GlassCard>
            )}
          </View>

          <View
            className="flex-1 items-center justify-center bg-card/10"
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setChartHeight(height - 150);
            }}
          >
            {/* Axis Labels Header Row */}
            <View style={{
              width: CHART_WIDTH,
              paddingHorizontal: 16,
              flexDirection: 'row',
              justifyContent: (leftAxisGroup && rightAxisGroup) ? 'space-between' : 'center',
              marginBottom: 8
            }}>
              {/* Left Axis Title */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {leftAxisGroup ? (
                  <>
                    <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 6, backgroundColor: leftAxisColor }} />
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: leftAxisColor }}>
                      {leftAxisTitle}
                    </Text>
                  </>
                ) : null}
              </View>

              {/* Right Axis Title */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {rightAxisGroup ? (
                  <>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: rightAxisColor }}>
                      {rightAxisTitle}
                    </Text>
                    <View style={{ width: 10, height: 10, borderRadius: 5, marginLeft: 6, backgroundColor: rightAxisColor }} />
                  </>
                ) : null}
              </View>
            </View>

            {/* Chart and Axes Container */}
            <View style={{ height: chartHeight + 40, width: CHART_WIDTH, position: 'relative' }}>
              {/* Custom Axis Labels Layer */}
              <View style={{ position: 'absolute', height: chartHeight, width: CHART_WIDTH, top: 0, left: 0, justifyContent: 'space-between', paddingVertical: 20, pointerEvents: 'none' }}>
                {[...Array(5)].map((_, i) => (
                  <View key={i} className="flex-row justify-between w-full px-3">
                    <Text style={{ fontSize: 10, color: leftAxisGroup ? leftAxisColor : 'transparent', fontWeight: 'bold', width: 36 }}>
                      {leftAxisGroup
                        ? (leftLabelBounds.max - (i * (leftLabelBounds.max - leftLabelBounds.min) / 4)).toFixed(leftLabelPrecision)
                        : ''}
                    </Text>
                    <Text style={{ fontSize: 10, color: rightAxisGroup ? rightAxisColor : 'transparent', fontWeight: 'bold', width: 36, textAlign: 'right' }}>
                      {rightAxisGroup
                        ? (rightLabelBounds.max - (i * (rightLabelBounds.max - rightLabelBounds.min) / 4)).toFixed(rightLabelPrecision)
                        : ''}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Day Stats Overlay HUD on top of Graph */}
              {selectedDay && (
                <GlassCard
                  elevated
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 14,
                    right: 14,
                    zIndex: 40,
                    padding: 10,
                    borderRadius: 16,
                    borderColor: theme.colors.borderHighlight,
                    backgroundColor: theme.isDark ? 'rgba(24, 24, 28, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-1.5">
                      <Calendar size={13} color={theme.colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.text }}>
                        {format(new Date(selectedDay.date + 'T12:00:00'), 'EEE, MMM d, yyyy')}
                      </Text>
                      {selectedDay.date === format(new Date(), 'yyyy-MM-dd') && (
                        <View className="bg-primary/20 px-1.5 py-0.5 rounded-full ml-1">
                          <Text style={{ fontSize: 9, fontWeight: '700', color: theme.colors.primary }}>
                            Today
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedDayIndex(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="p-1 rounded-full bg-muted/30"
                    >
                      <X size={12} color={theme.colors.textSecondary} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row flex-wrap gap-x-2.5 gap-y-1.5">
                    {selectedMetrics.map((key) => {
                      const config = METRIC_CONFIG[key];
                      if (!config) return null;
                      const val = selectedDay.metrics[key];
                      return (
                        <View key={key} className="flex-row items-center bg-card/60 rounded-lg px-2 py-0.5 border border-border/40">
                          <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: config.color }} />
                          <Text style={{ fontSize: 10, color: theme.colors.textSecondary, marginRight: 3 }}>
                            {config.label.split(' (')[0]}:
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.text }}>
                            {formatMetricValue(key, val)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </GlassCard>
              )}

              {/* Chart and Day Touch Targets Wrapper */}
              <View style={{ width: CHART_CONTAINER_WIDTH, height: chartHeight + 40, marginLeft: CHART_SIDE_PADDING, overflow: 'hidden', position: 'relative' }}>
                {/* Vertical Guide Line for Selected Day */}
                {selectedDayIndex !== null && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: INITIAL_SPACING + selectedDayIndex * chartSpacing - 1,
                      top: 0,
                      height: chartHeight,
                      width: 2,
                      backgroundColor: theme.colors.primary,
                      borderRadius: 1,
                      zIndex: 15,
                      opacity: 0.8,
                    }}
                  />
                )}

                {/* Drag / Pan & Tap Interactive Responder Layer */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: CHART_CONTAINER_WIDTH,
                    height: chartHeight,
                    zIndex: 25,
                  }}
                  {...panResponder.panHandlers}
                />

                {selectedMetrics.length > 0 ? (
                  <LineChart
                    {...chartProps}
                    width={CHART_CONTAINER_WIDTH}
                    height={chartHeight}
                    yAxisColor="transparent"
                    xAxisColor={theme.textSecondary}
                    yAxisThickness={0}
                    yAxisLabelWidth={0}
                    hideYAxisText
                    yAxisTextStyle={{ color: 'transparent' }}
                    xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10, width: 36, textAlign: 'center', marginLeft: -18 }}
                    rulesColor={theme.border}
                    rulesLength={CHART_CONTAINER_WIDTH}
                    spacing={chartSpacing}
                    initialSpacing={INITIAL_SPACING}
                    endSpacing={END_SPACING}
                    curved
                    hideDataPoints={false}
                    maxValue={100}
                    minValue={0}
                    noOfSections={4}
                    disableScroll={true}
                  />
                ) : (
                  <View style={{ height: chartHeight, width: CHART_CONTAINER_WIDTH, alignItems: 'center', justifyContent: 'center' }}>
                    <Text variant="muted">Select at least one metric to display.</Text>
                  </View>
                )}
              </View>
            </View>

            <View className="px-6 w-full items-center pb-4">
              <View className="flex-row flex-wrap gap-x-3 gap-y-2 justify-center">
                {selectedMetrics.map(key => {
                  const { axisLabel } = getMetricLegendInfo(key);
                  const badgeChar = axisLabel === 'Left' ? 'L' : axisLabel === 'Right' ? 'R' : 'S';
                  return (
                    <View key={key} className="flex-row items-center mr-1">
                      <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: METRIC_CONFIG[key].color }} />
                      <Text variant="small" className="font-bold">{METRIC_CONFIG[key].label}</Text>
                      <Text style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 3 }}>
                        ({badgeChar})
                      </Text>
                    </View>
                  );
                })}
              </View>

              {activePreset === 'Custom' && (
                <View className="mt-3.5">
                  <GlassButton
                    label="Edit Metrics..."
                    variant="glass-primary"
                    size="sm"
                    shape="pill"
                    onPress={() => setShowCustomModal(true)}
                    style={{ width: 120, height: 32 }}
                    contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0, width: '100%', height: 32, justifyContent: 'center', alignItems: 'center' }}
                    textStyle={{ fontSize: 12, fontWeight: '700' }}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </ScreenWrapper>

      {/* Custom Graph Selection Modal outside ScreenWrapper */}
      <Modal visible={showCustomModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-card rounded-t-[32px] p-6 pb-12 h-[82%] border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text variant="h2">Custom Graph</Text>
                <Text variant="muted" className="text-xs mt-1">
                  Select up to 5 metrics ({selectedMetrics.length}/5 selected)
                </Text>
              </View>
              <GlassButton
                size="icon"
                shape="circle"
                variant="glass"
                onPress={() => setShowCustomModal(false)}
                style={{ width: 36, height: 36 }}
                contentContainerStyle={{ width: 36, height: 36, padding: 0 }}
              >
                <X size={18} color={theme.colors.text} strokeWidth={2.5} />
              </GlassButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {METRIC_GROUPS.map((group) => (
                <View key={group.id} className="mb-5">
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    {group.title}
                  </Text>
                  
                  <View 
                    style={{ 
                      borderRadius: 18, 
                      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor: theme.colors.border,
                      borderWidth: 1,
                      overflow: 'hidden'
                    }}
                  >
                    {group.keys.map((key, index) => {
                      const config = METRIC_CONFIG[key];
                      if (!config) return null;
                      const isSelected = selectedMetrics.includes(key);
                      const disabled = !isSelected && selectedMetrics.length >= 5;

                      return (
                        <View 
                          key={key} 
                          className={cn(
                            "flex-row items-center justify-between px-4 py-3.5",
                            index < group.keys.length - 1 && "border-b border-border/40",
                            disabled && "opacity-40"
                          )}
                        >
                          <View className="flex-row items-center flex-1 pr-3">
                            <View className="w-3.5 h-3.5 rounded-full mr-3" style={{ backgroundColor: config.color }} />
                            <Text className="text-sm font-semibold text-foreground">
                              {config.label}
                            </Text>
                          </View>
                          
                          <Switch
                            value={isSelected}
                            onValueChange={() => toggleCustomMetric(key)}
                            disabled={disabled}
                            trackColor={{
                              false: theme.isDark ? '#334155' : '#cbd5e1',
                              true: theme.colors.primary,
                            }}
                            thumbColor={theme.isDark ? '#f8fafc' : '#ffffff'}
                            ios_backgroundColor={theme.isDark ? '#334155' : '#cbd5e1'}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <GlassButton
              label="Apply"
              variant="glass-primary"
              size="lg"
              shape="pill"
              onPress={() => setShowCustomModal(false)}
              className="mt-4 w-full"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
