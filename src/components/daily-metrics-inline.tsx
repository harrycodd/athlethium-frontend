import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, Modal, FlatList } from 'react-native';
import Text from './ui/text';
import { GlassButton } from './ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import Card from './ui/card';
import { ChevronDown, ChevronUp, Activity, Brain, Moon, Scale, Thermometer, AlertCircle, FileText, CheckCircle2 } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { isAfter, startOfDay } from 'date-fns';

type Metrics = {
  physicallyFeeling: number;
  mentallyFeeling: number;
  sleep: number;
  weight: string;
  illness: string;
  injury: string;
  notes: string;
};

type Props = {
  onSave: (metrics: Metrics) => void;
  initialMetrics?: Metrics;
  isToday?: boolean;
  date?: Date;
};

const LEVELS = ['1', '2', '3', '4', '5'];
const INJURY_OPTIONS = ['None', 'Minor', 'Moderate', 'Severe'];
const ILLNESS_OPTIONS = ['None', 'Mild', 'Sick'];

export default function DailyMetricsInline({ onSave, initialMetrics, isToday = true, date }: Props) {
  const theme = useTheme();
  const { profile } = useAuth();
  const isImperial = profile?.units === 'Imperial';

  const [expanded, setExpanded] = useState(false);

  const isFuture = date ? isAfter(startOfDay(date), startOfDay(new Date())) : false;

  const [metrics, setMetrics] = useState<Metrics>({
    physicallyFeeling: initialMetrics?.physicallyFeeling || 3,
    mentallyFeeling: initialMetrics?.mentallyFeeling || 3,
    sleep: initialMetrics?.sleep || 3,
    weight: initialMetrics?.weight || '0',
    illness: initialMetrics?.illness || 'None',
    injury: initialMetrics?.injury || 'None',
    notes: initialMetrics?.notes || '',
  });

  if (isFuture) return null;

  const updateMetric = (key: keyof Metrics, value: any) => {
    if (!isToday) return;
    setMetrics(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!isToday) return;
    onSave(metrics);
    setExpanded(false);
  };

  const SimpleSlider = ({ label, valueKey, icon: Icon, color }: { label: string, valueKey: keyof Metrics, icon: any, color: string }) => (
    <View className="mb-6">
      <View className="flex-row items-center justify-center mb-3">
        <View style={{ backgroundColor: `${color}15` }} className="p-1.5 rounded-lg mr-2">
          <Icon size={16} color={color} />
        </View>
        <Text className="font-bold text-sm">{label}</Text>
      </View>
      <View className="flex-row justify-between w-full">
        {LEVELS.map((level, index) => {
          const isSelected = metrics[valueKey] === index + 1;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => updateMetric(valueKey, index + 1)}
              disabled={!isToday}
              className={cn(
                "flex-1 mx-1 py-2.5 rounded-xl items-center justify-center border",
                isSelected ? "bg-primary border-primary" : "bg-muted border-border",
                !isToday && !isSelected && "opacity-40"
              )}
            >
              <Text className={cn("text-sm font-bold", isSelected ? "text-white" : "text-foreground")}>
                {level}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const SelectionGroup = ({ label, valueKey, options, icon: Icon, color }: { label: string, valueKey: keyof Metrics, options: string[], icon: any, color: string }) => (
    <View className="mb-6">
      <View className="flex-row items-center justify-center mb-3">
        <View style={{ backgroundColor: `${color}15` }} className="p-1.5 rounded-lg mr-2">
          <Icon size={16} color={color} />
        </View>
        <Text className="font-bold text-sm">{label}</Text>
      </View>
      <View className="flex-row justify-between w-full">
        {options.map((option) => {
          const isSelected = metrics[valueKey] === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => updateMetric(valueKey, option)}
              disabled={!isToday}
              className={cn(
                "flex-1 mx-1 py-2 rounded-xl items-center justify-center border",
                isSelected ? "bg-primary border-primary" : "bg-muted border-border",
                !isToday && !isSelected && "opacity-40"
              )}
            >
              <Text className={cn("text-[10px] text-center font-bold", isSelected ? "text-white" : "text-foreground")}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const CompactMetric = ({ icon: Icon, value, color, label }: any) => (
    <View className="items-center px-2 py-1">
      <View style={{ backgroundColor: `${color}15` }} className="p-2 rounded-xl mb-1">
        <Icon size={16} color={color} />
      </View>
      <Text className="text-[10px] font-bold" style={{ color: theme.textSecondary }}>{value}</Text>
    </View>
  );

  const canExpand = isToday || !!initialMetrics;

  return (
    <>
      <Card className="p-0 mb-4 overflow-hidden border-border shadow-none">
        <TouchableOpacity
          onPress={() => {
            if (canExpand) setExpanded(!expanded);
          }}
          disabled={!canExpand}
          activeOpacity={canExpand ? 0.7 : 1}
          className={cn(
            "items-center justify-center",
            expanded ? "p-4 bg-muted/30" : (initialMetrics ? "p-3.5" : "py-2.5 px-4")
          )}
        >
          <View className="flex-row items-center justify-center">
            <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Daily Readiness</Text>
            {!isToday && (
              <View className="bg-muted px-1.5 py-0.5 rounded-md ml-2">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase">History</Text>
              </View>
            )}
            {initialMetrics && isToday && (
              <View className="ml-2">
                <CheckCircle2 size={12} color={theme.primary} />
              </View>
            )}
          </View>

          {!expanded ? (
            initialMetrics ? (
              <View className="flex-row items-center justify-center mt-2 gap-2">
                <CompactMetric icon={Activity} value={metrics.physicallyFeeling} color="#3B82F6" />
                <CompactMetric icon={Brain} value={metrics.mentallyFeeling} color="#8B5CF6" />
                <CompactMetric icon={Moon} value={metrics.sleep} color="#6366F1" />
                <CompactMetric icon={Scale} value={`${metrics.weight}${isImperial ? 'lbs' : 'kg'}`} color="#EC4899" />
                <CompactMetric icon={AlertCircle} value={metrics.injury} color="#EF4444" />
                <CompactMetric icon={Thermometer} value={metrics.illness} color="#F59E0B" />
              </View>
            ) : (
              <View className="mt-0.5 items-center">
                <Text variant="muted" className="text-[11px] italic">No entry recorded</Text>
              </View>
            )
          ) : (
            <View className="mt-1 items-center">
              <Text variant="muted" className="text-[10px] font-medium">
                {isToday ? "Record your stats for today" : "Viewing past readiness data"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {expanded && (
          <View className="p-6 border-t border-border">
            <SimpleSlider label="Physical Feeling" valueKey="physicallyFeeling" icon={Activity} color="#3B82F6" />
            <SimpleSlider label="Mental Feeling" valueKey="mentallyFeeling" icon={Brain} color="#8B5CF6" />
            <SimpleSlider label="Sleep Quality" valueKey="sleep" icon={Moon} color="#6366F1" />

            <SelectionGroup label="Injury" valueKey="injury" options={INJURY_OPTIONS} icon={AlertCircle} color="#EF4444" />
            <SelectionGroup label="Illness" valueKey="illness" options={ILLNESS_OPTIONS} icon={Thermometer} color="#F59E0B" />

            <View className="mb-8">
              <View className="flex-row items-center justify-center mb-3">
                <View style={{ backgroundColor: '#EC489915' }} className="p-1.5 rounded-lg mr-2">
                  <Scale size={16} color="#EC4899" />
                </View>
                <Text className="font-bold text-sm">Weight ({isImperial ? 'lbs' : 'kg'})</Text>
              </View>

              <View
                className={cn(
                  "mx-1 py-2 rounded-xl flex-row items-center justify-center border border-border bg-muted/50",
                  !isToday && "opacity-40"
                )}
              >
                <TextInput
                  value={metrics.weight}
                  onChangeText={(val) => updateMetric('weight', val)}
                  keyboardType="numeric"
                  editable={isToday}
                  placeholder={isImperial ? "154.0" : "70.0"}
                  placeholderTextColor={theme.textSecondary}
                  className="text-[14px] text-center font-bold p-0 m-0 w-[50px]"
                  style={{ color: theme.text, includeFontPadding: false, textAlignVertical: 'center' }}
                />
              </View>
            </View>

            <View className="mb-8">
              <View className="flex-row items-center justify-center mb-3">
                <View style={{ backgroundColor: '#64748b15' }} className="p-1.5 rounded-lg mr-2">
                  <FileText size={16} color="#64748b" />
                </View>
                <Text className="font-bold text-sm">Notes</Text>
              </View>
              <TextInput
                value={metrics.notes}
                onChangeText={(val) => updateMetric('notes', val)}
                placeholder={isToday ? "How do you feel today?" : "No notes recorded."}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={isToday}
                className={cn(
                  "bg-muted/50 rounded-2xl p-4 border border-border text-foreground text-sm min-h-[80px]",
                  !isToday && "opacity-60"
                )}
                style={{ color: theme.text }}
              />
            </View>

            {isToday && (
              <GlassButton
                label="Save Readiness"
                variant="glass-primary"
                size="lg"
                shape="pill"
                onPress={handleSave}
                className="w-full mt-2"
              />
            )}
          </View>
        )}
      </Card>
    </>
  );
}
