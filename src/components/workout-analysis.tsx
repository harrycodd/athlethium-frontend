import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, Modal } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import MapView, { Polyline } from 'react-native-maps';
import Text from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { Zap, Heart, Activity, Mountain, FastForward, Maximize, X, Clock } from 'lucide-react-native';
import { Workout } from '@/lib/workout-service';
import Card from '@/components/ui/card';
import { cn } from '@/lib/utils';

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 64;

type MetricType = 'speed' | 'power' | 'heartrate' | 'elevation' | 'cadence';

const METRIC_CONFIG: Record<MetricType, { label: string, color: string, unit: string, imperialUnit: string, icon: any }> = {
  speed: { label: 'Speed', color: '#3B82F6', unit: 'km/h', imperialUnit: 'mph', icon: FastForward },
  power: { label: 'Power', color: '#8B5CF6', unit: 'W', imperialUnit: 'W', icon: Zap },
  heartrate: { label: 'Heart Rate', color: '#EF4444', unit: 'bpm', imperialUnit: 'bpm', icon: Heart },
  elevation: { label: 'Elevation', color: '#10B981', unit: 'm', imperialUnit: 'ft', icon: Mountain },
  cadence: { label: 'Cadence', color: '#F59E0B', unit: 'rpm', imperialUnit: 'rpm', icon: Activity },
};

const formatPaceFromKmh = (speedKmh: number) => {
  if (!speedKmh || speedKmh <= 0) return '--:--';
  const totalMinutesPerKm = 60 / speedKmh;
  const minutes = Math.floor(totalMinutesPerKm);
  const seconds = Math.round((totalMinutesPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatPaceFromMinutes = (paceMinutes: number) => {
  if (!paceMinutes || paceMinutes <= 0) return '--:--';
  const totalSeconds = paceMinutes * 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatRunningMinimum = (paceMinutes: number) => {
  if (!paceMinutes || paceMinutes <= 0 || !Number.isFinite(paceMinutes)) return 'N/A';
  return formatPaceFromMinutes(paceMinutes);
};

interface Props {
  workout: Workout;
}

export default function WorkoutAnalysis({ workout }: Props) {
  const theme = useTheme();
  const { profile } = useAuth();
  const isImperial = profile?.units === 'Imperial';
  const isRunning = workout?.sport === 'running';

  const [loading, setLoading] = useState(true);
  const [timeSeriesRaw, setTimeSeriesRaw] = useState<Record<string, number[]> | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricType>('speed');
  const [chartData, setChartData] = useState<{ value: number; label?: string; labelTextStyle?: any; index?: number; dataPointText?: string }[]>([]);
  const [runningChartProps, setRunningChartProps] = useState<any>(null);
  const [selectedLapIndex, setSelectedLapIndex] = useState<number | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  const mapRef = useRef<MapView>(null);



  useEffect(() => {
    let isMounted = true;
    const loadTimeseries = async () => {
      setLoading(true);
      const tsUrl = (workout as any).timeSeriesUrl;
      if (tsUrl) {
        try {
          const res = await fetch(tsUrl);
          if (res.ok) {
            const tsData = await res.json();
            if (isMounted) {
              setTimeSeriesRaw(tsData);
              if (tsData.speed && tsData.speed.length > 0) setActiveMetric('speed');
              else if (tsData.power && tsData.power.length > 0) setActiveMetric('power');
              else if (tsData.heartrate && tsData.heartrate.length > 0) setActiveMetric('heartrate');
            }
          }
        } catch (e) {
          console.error("Failed to load timeseries JSON:", e);
        }
      }
      if (isMounted) setLoading(false);
    };

    loadTimeseries();
    return () => { isMounted = false; };
  }, [workout]);

  const getMapCoordinates = () => {
    if (!timeSeriesRaw || !timeSeriesRaw['latlng'] || timeSeriesRaw['latlng'].length === 0) return null;
    
    let arr = timeSeriesRaw['latlng'] as any[];

    // Slice by lap if a lap is selected
    const laps = workout?.stats?.laps || [];
    const activeLap = selectedLapIndex !== null ? laps.find((l: any) => l.lap_index === selectedLapIndex) : null;
    
    if (activeLap && timeSeriesRaw['time']) {
       let startIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= activeLap.start_time_elapsed);
       let endIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= activeLap.end_time_elapsed);
       
       if (startIndex === -1) startIndex = 0;
       if (endIndex === -1 || endIndex <= startIndex) endIndex = timeSeriesRaw['time'].length - 1;
       
       arr = arr.slice(startIndex, endIndex + 1);
    }

    const coords = arr.filter(pt => pt && Array.isArray(pt) && pt.length === 2)
                      .map(pt => ({ latitude: pt[0], longitude: pt[1] }));
                      
    return coords.length > 0 ? coords : null;
  };

  const mapCoordinates = getMapCoordinates();

  const getSpeedDisplayValue = (value: number) => {
    return isImperial ? value * 0.621371 : value;
  };

  const getRunningPaceValue = (value: number) => {
    const speedUnits = getSpeedDisplayValue(value);
    return speedUnits > 0 ? 60 / speedUnits : 0;
  };

  const formatMetricValue = (metric: MetricType, value: number) => {
    if (metric === 'speed' && isRunning) {
      return formatPaceFromMinutes(getRunningPaceValue(value));
    }
    if (metric === 'speed') {
      return getSpeedDisplayValue(value).toFixed(1);
    }
    return value.toFixed(0);
  };

  // Fit map to coordinates when they change
  useEffect(() => {
    if (mapRef.current && mapCoordinates && mapCoordinates.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(mapCoordinates, {
          edgePadding: { top: 20, right: 20, bottom: 20, left: 20 },
          animated: true,
        });
      }, 500);
    }
  }, [mapCoordinates]);

  useEffect(() => {
    if (timeSeriesRaw && timeSeriesRaw[activeMetric] && timeSeriesRaw[activeMetric].length > 0) {
      let rawArray = timeSeriesRaw[activeMetric];
      
      const laps = workout?.stats?.laps || [];
      const activeLap = selectedLapIndex !== null ? laps.find((l: any) => l.lap_index === selectedLapIndex) : null;
      
      if (activeLap && timeSeriesRaw['time']) {
         let startIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= activeLap.start_time_elapsed);
         let endIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= activeLap.end_time_elapsed);
         
         if (startIndex === -1) startIndex = 0;
         if (endIndex === -1 || endIndex <= startIndex) endIndex = timeSeriesRaw['time'].length - 1;
         
         rawArray = rawArray.slice(startIndex, endIndex + 1);
      }
      
      const maxPoints = 100;
      const step = Math.max(1, Math.floor(rawArray.length / maxPoints));
      
      let chartProps = null;
      const bottomPace = 10;
      
      if (activeMetric === 'speed' && isRunning) {
        let fastestPace = bottomPace;
        for (let i = 0; i < rawArray.length; i++) {
          const pace = getRunningPaceValue(rawArray[i]);
          if (pace > 0 && pace < fastestPace) {
            fastestPace = pace;
          }
        }
        const topPace = Math.min(bottomPace - 1, Math.floor(fastestPace));
        const paceRange = bottomPace - topPace;
        
        const labels = [];
        for (let p = bottomPace; p >= topPace; p--) {
          labels.push(`${p.toString().padStart(2, '0')}:00`);
        }
        
        chartProps = {
          maxValue: paceRange,
          noOfSections: paceRange,
          stepValue: 1,
          yAxisLabelTexts: labels,
        };
      }
      setRunningChartProps(chartProps);

      const downsampled = [];
      for (let i = 0; i < rawArray.length; i += step) {
        let val = rawArray[i];
        let originalPace = 0;
        if (isImperial && activeMetric === 'elevation') {
          val *= 3.28084;
        }
        if (activeMetric === 'cadence' && isRunning) {
          val *= 2;
        }
        if (activeMetric === 'speed') {
          if (isRunning) {
            originalPace = getRunningPaceValue(val);
            const cappedPace = originalPace === 0 ? bottomPace : Math.min(originalPace, bottomPace);
            val = Math.max(0, bottomPace - cappedPace);
          } else {
            val = getSpeedDisplayValue(val);
          }
        }
        downsampled.push({
          value: val,
          label: '',
          labelTextStyle: { color: 'transparent' },
          ...(activeMetric === 'speed' && isRunning ? { dataPointText: formatPaceFromMinutes(originalPace) } : {})
        });
      }
      setChartData(downsampled);
    } else {
      setChartData([]);
    }
  }, [timeSeriesRaw, activeMetric, selectedLapIndex, workout, isImperial]);

  // Calculate full-workout moving average speed
  const overallMovingAvgSpeed = useMemo(() => {
    if (!timeSeriesRaw || !timeSeriesRaw['speed']) return null;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < timeSeriesRaw['speed'].length; i++) {
      if (timeSeriesRaw['speed'][i] != null) {
        const isMoving = timeSeriesRaw['moving'] ? timeSeriesRaw['moving'][i] : timeSeriesRaw['speed'][i] > 0.5;
        if (isMoving) {
          sum += timeSeriesRaw['speed'][i];
          count++;
        }
      }
    }
    return count > 0 ? sum / count : 0;
  }, [timeSeriesRaw]);



  if (loading) {
    return (
      <View className="justify-center items-center py-10">
        <ActivityIndicator size="large" color={theme.primary} />
        <Text variant="muted" className="mt-4">Loading analysis data...</Text>
      </View>
    );
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const availableMetrics = timeSeriesRaw 
    ? (Object.keys(METRIC_CONFIG) as MetricType[]).filter(k => timeSeriesRaw[k] && timeSeriesRaw[k].length > 0)
    : [];

  const getDynamicStats = () => {
    if (!timeSeriesRaw || !timeSeriesRaw[activeMetric] || timeSeriesRaw[activeMetric].length === 0) return null;
    
    let arr = timeSeriesRaw[activeMetric];

    const laps = workout?.stats?.laps || [];
    const activeLap = selectedLapIndex !== null ? laps.find((l: any) => l.lap_index === selectedLapIndex) : null;
    
    if (activeLap && timeSeriesRaw['time']) {
       let startIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= activeLap.start_time_elapsed);
       let endIndex = timeSeriesRaw['time'].findIndex((t: number) => t >= activeLap.end_time_elapsed);
       
       if (startIndex === -1) startIndex = 0;
       if (endIndex === -1 || endIndex <= startIndex) endIndex = timeSeriesRaw['time'].length - 1;
       
       arr = arr.slice(startIndex, endIndex + 1);
    }

    if (arr.length === 0) return null;
    
    let sum = 0;
    let count = 0;
    let max = -Infinity;
    let min = Infinity;
    
    for (let i = 0; i < arr.length; i++) {
      const isMoving = timeSeriesRaw['moving'] ? timeSeriesRaw['moving'][i] : (timeSeriesRaw['speed'] ? timeSeriesRaw['speed'][i] > 0.5 : true);
      if (isMoving) {
        if (arr[i] > max) max = arr[i];
        if (arr[i] < min) min = arr[i];
        sum += arr[i];
        count++;
      }
    }
    
    if (count === 0) return null;
    let avg = sum / count;
    
    if (activeMetric === 'speed') {
      max = isRunning ? getRunningPaceValue(max) : getSpeedDisplayValue(max);
      min = isRunning ? getRunningPaceValue(min) : getSpeedDisplayValue(min);
      avg = isRunning ? getRunningPaceValue(avg) : getSpeedDisplayValue(avg);
    } else if (isImperial && activeMetric === 'elevation') {
      max *= 3.28084; min *= 3.28084; avg *= 3.28084;
    } else if (activeMetric === 'cadence' && isRunning) {
      max *= 2; min *= 2; avg *= 2;
    }
    
    let np: number | null = null;
    if (activeMetric === 'power') {
      // Prefer backend calculated NP
      if (workout?.stats?.normalized_power) {
        np = workout.stats.normalized_power;
      } else if (arr.length > 30) {
        // Fallback to basic NP estimation (30s rolling average, 4th power, average, 4th root)
        let rollingSum = 0;
        const rollingAvgs = [];
        for (let i = 0; i < arr.length; i++) {
          rollingSum += arr[i];
          if (i >= 30) {
            rollingSum -= arr[i - 30];
            rollingAvgs.push(rollingSum / 30);
          }
        }
        if (rollingAvgs.length > 0) {
           const npSum = rollingAvgs.reduce((a, b) => a + Math.pow(b, 4), 0);
           np = Math.pow(npSum / rollingAvgs.length, 0.25);
        }
      }
    }

    return { max, min, avg, np };
  };

  const dynamicStats = getDynamicStats();
  const bestEfforts = workout?.stats?.best_efforts?.[activeMetric];

  let distance = 0;
  let durationSecs = workout.time || 0;
  let tss = workout.tss || 0;
  let avgSpeed = 0;
  
  if (workout.stats) {
    distance = (workout.stats.distance || 0) / 1000;
    if (isImperial) distance *= 0.621371;
    
    durationSecs = workout.stats.totalTime || durationSecs;
    if (workout.stats.averagePace && workout.stats.averagePace > 0) {
      avgSpeed = 3600 / workout.stats.averagePace;
      if (isImperial) avgSpeed *= 0.621371;
    }
  }

  if (overallMovingAvgSpeed && overallMovingAvgSpeed > 0) {
    avgSpeed = isImperial ? overallMovingAvgSpeed * 0.621371 : overallMovingAvgSpeed;
  }

  const activeUnit = activeMetric === 'speed' && isRunning
    ? (isImperial ? 'min/mi' : 'min/km')
    : (activeMetric === 'cadence' && isRunning)
      ? 'spm'
      : (isImperial ? METRIC_CONFIG[activeMetric].imperialUnit : METRIC_CONFIG[activeMetric].unit);

  const renderMetricValue = (value: string) => (
    <View className="items-center">
      <Text className="text-lg font-bold">{value}</Text>
      <Text variant="small" className="mt-1">{activeUnit}</Text>
    </View>
  );

  return (
    <ScrollView className="flex-1 pb-10 px-4" showsVerticalScrollIndicator={false}>
      {mapCoordinates && mapCoordinates.length > 0 && (
        <Card className="p-0 mb-6 overflow-hidden border border-border bg-card shadow-sm h-48 rounded-[24px]">
          <MapView
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
            mapType="standard"
            showsUserLocation={false}
            pitchEnabled={false}
            rotateEnabled={false}
            scrollEnabled={true}
            zoomEnabled={true}
            initialRegion={{
              latitude: mapCoordinates[0].latitude,
              longitude: mapCoordinates[0].longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Polyline
              coordinates={mapCoordinates}
              strokeColor={theme.primary}
              strokeWidth={4}
            />
          </MapView>
          <TouchableOpacity 
            onPress={() => setIsMapExpanded(true)}
            className="absolute top-3 right-3 bg-background/80 p-2 rounded-full border border-border"
          >
            <Maximize size={16} color={theme.text} />
          </TouchableOpacity>
        </Card>
      )}

      {availableMetrics.length > 0 && (
        <View className="mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2 px-1">
              {availableMetrics.map(metric => {
                const config = METRIC_CONFIG[metric];
                const Icon = config.icon;
                const isActive = activeMetric === metric;
                return (
                  <TouchableOpacity
                    key={metric}
                    onPress={() => setActiveMetric(metric)}
                    className={cn(
                      "flex-row items-center gap-2 px-4 py-2 rounded-full border",
                      isActive ? "bg-primary border-primary" : "bg-card border-border"
                    )}
                  >
                    <Icon size={14} color={isActive ? "#fff" : theme.textSecondary} />
                    <Text className={cn("font-bold text-xs", isActive ? "text-white" : "text-muted-foreground")}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {workout?.stats?.laps && workout.stats.laps.length > 1 && (
            <View className="mb-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                <View className="flex-row gap-2 px-1">
                  <TouchableOpacity
                    onPress={() => setSelectedLapIndex(null)}
                    className={cn(
                      "px-4 py-2 rounded-lg border",
                      selectedLapIndex === null ? "bg-foreground border-foreground" : "bg-card border-border"
                    )}
                  >
                    <Text className={cn("font-bold text-xs", selectedLapIndex === null ? "text-background" : "text-muted-foreground")}>Entire Session</Text>
                  </TouchableOpacity>
                  {workout.stats.laps.map((lap: any) => (
                    <TouchableOpacity
                      key={lap.lap_index}
                      onPress={() => setSelectedLapIndex(lap.lap_index)}
                      className={cn(
                        "px-4 py-2 rounded-lg border",
                        selectedLapIndex === lap.lap_index ? "bg-foreground border-foreground" : "bg-card border-border"
                      )}
                    >
                      <Text className={cn("font-bold text-xs", selectedLapIndex === lap.lap_index ? "text-background" : "text-muted-foreground")}>Lap {lap.lap_index}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {chartData.length > 0 ? (
            <Card className="p-4 items-center justify-center overflow-hidden border border-border bg-card shadow-sm">
              <View className="w-full flex-row justify-between mb-4 px-2">
                <Text variant="h3">{METRIC_CONFIG[activeMetric].label}</Text>
                <Text variant="muted" className="font-bold">{activeUnit}</Text>
              </View>
              <LineChart
                data={chartData}
                width={CHART_WIDTH - 30}
                height={180}
                {...(runningChartProps ? runningChartProps : {})}
                color={METRIC_CONFIG[activeMetric].color}
                thickness={2}
                dataPointsColor={METRIC_CONFIG[activeMetric].color}
                hideDataPoints={true}
                yAxisColor="transparent"
                xAxisColor="transparent"
                yAxisLabelWidth={45}
                yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10, fontWeight: 'bold' }}
                rulesColor={theme.border}
                rulesType="solid"
                yAxisSide={0}
                isAnimated
                focusEnabled
                showTextOnFocus
                focusedDataPointShape="circle"
                focusedDataPointColor={METRIC_CONFIG[activeMetric].color}
                focusedDataPointRadius={4}
                showStripOnFocus
                stripColor={theme.border}
                textShiftY={-20}
                textShiftX={-10}
                textColor={theme.text}
                textFontSize={12}
                spacing={Math.max(2, (CHART_WIDTH - 20) / chartData.length)}
                initialSpacing={0}
                endSpacing={0}
                curved
              />
            </Card>
          ) : (
            <ActivityIndicator size="small" color={theme.primary} className="py-10" />
          )}

          {dynamicStats && (
            <View className="flex-row justify-between mt-4">
              <Card className="flex-1 p-3 mr-2 items-center">
                <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1 text-[10px]">Max {METRIC_CONFIG[activeMetric].label}</Text>
                <Text className="text-lg font-bold">{activeMetric === 'speed' && isRunning ? formatPaceFromMinutes(dynamicStats.max) : dynamicStats.max.toFixed(0)}</Text>
                <Text variant="small" className="mt-1">{activeUnit}</Text>
              </Card>
              <Card className="flex-1 p-3 mx-1 items-center">
                <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1 text-[10px]">Avg {METRIC_CONFIG[activeMetric].label}</Text>
                <Text className="text-lg font-bold">{activeMetric === 'speed' && isRunning ? formatPaceFromMinutes(dynamicStats.avg) : dynamicStats.avg.toFixed(0)}</Text>
                <Text variant="small" className="mt-1">{activeUnit}</Text>
              </Card>
              {dynamicStats.np !== null ? (
                <Card className="flex-1 p-3 ml-2 items-center">
                  <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1 text-[10px]">Norm. Power</Text>
                  <Text className="text-lg font-bold">{dynamicStats.np.toFixed(0)} <Text variant="small">W</Text></Text>
                </Card>
              ) : (
                <Card className="flex-1 p-3 ml-2 items-center">
                  <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1 text-[10px]">Min {METRIC_CONFIG[activeMetric].label}</Text>
                  <Text className="text-lg font-bold">{activeMetric === 'speed' && isRunning ? formatRunningMinimum(dynamicStats.min) : dynamicStats.min.toFixed(0)}</Text>
                  <Text variant="small" className="mt-1">{activeUnit}</Text>
                </Card>
              )}
            </View>
          )}

          {bestEfforts && Object.keys(bestEfforts).length > 0 && (
            <View className="mt-6">
              <Text variant="h3" className="mb-3">Best Efforts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                <View className="flex-row gap-2">
                   {['5s', '10s', '30s', '1m', '3m', '5m', '10m', '20m', '30m', '1hr'].map(interval => {
                    if (bestEfforts[interval] === undefined) return null;
                    
                    let effortVal = bestEfforts[interval];
                    if (activeMetric === 'speed') effortVal = getSpeedDisplayValue(effortVal);
                    else if (isImperial && activeMetric === 'elevation') effortVal *= 3.28084;
                    else if (activeMetric === 'cadence' && isRunning) effortVal *= 2;
                    
                    return (
                      <Card key={interval} className="p-3 items-center justify-center min-w-[70px]">
                        <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1 text-[10px]">{interval}</Text>
                        <Text className="text-base font-bold">{activeMetric === 'speed' && isRunning ? formatPaceFromMinutes(getRunningPaceValue(bestEfforts[interval])) : Math.round(effortVal)}</Text>
                      </Card>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      <Text variant="h3" className="mb-4 mt-2">{workout.completed ? 'Completed Workout' : 'Session Metrics'}</Text>
      <Card className="p-5 mb-12">


        <View className="flex-row justify-between mb-4">
          <View>
            <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">Duration</Text>
            <Text className="text-2xl font-bold">{formatDuration(durationSecs)}</Text>
          </View>
          <View className="items-end">
            <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">Distance</Text>
            <Text className="text-2xl font-bold">{distance.toFixed(2)} <Text variant="muted">{isImperial ? 'mi' : 'km'}</Text></Text>
          </View>
        </View>

        <View className="h-[1px] bg-border w-full mb-4" />

        <View className="flex-row justify-between">
          <View>
            <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">Avg Speed</Text>
            <Text className="text-lg font-semibold">
              {avgSpeed > 0
                ? (isRunning ? formatPaceFromMinutes(60 / avgSpeed) : avgSpeed.toFixed(1))
                : '--'}
            </Text>
            <Text variant="muted" className="mt-1">{isRunning ? (isImperial ? 'min/mi' : 'min/km') : (isImperial ? 'mph' : 'km/h')}</Text>
          </View>
          <View className="items-end">
            <Text variant="small" className="text-muted-foreground uppercase font-bold tracking-wider mb-1">TSS</Text>
            <Text className="text-lg font-semibold">{tss > 0 ? tss : '--'}</Text>
          </View>
        </View>
      </Card>

      {/* Full Screen Map Modal */}
      <Modal visible={isMapExpanded} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsMapExpanded(false)}>
        <View className="flex-1 bg-background">
          {mapCoordinates && mapCoordinates.length > 0 && (
            <MapView
              style={{ width: '100%', height: '100%' }}
              mapType="standard"
              showsUserLocation={false}
              initialRegion={{
                latitude: mapCoordinates[0].latitude,
                longitude: mapCoordinates[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Polyline
                coordinates={mapCoordinates}
                strokeColor={theme.primary}
                strokeWidth={4}
              />
            </MapView>
          )}
          <TouchableOpacity 
            onPress={() => setIsMapExpanded(false)}
            className="absolute top-6 right-4 bg-background/90 p-3 rounded-full border border-border shadow-md"
          >
            <X size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}
