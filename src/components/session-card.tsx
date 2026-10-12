import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassButton } from "./ui/glass-button";
import Text from "./ui/text";
import { GlassCard } from "./ui/glass-card";
import { Badge } from "./ui/badge";
import { ActivityType } from "@/types/activity";
import { getIntensityZoneToken } from "@/constants/theme";
import { Dumbbell, Footprints, Bike, Waves, CheckCircle2, StretchHorizontal, Activity, Zap, Clock } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  name: string;
  meta?: string;
  description: string;
  sport?: ActivityType | string;
  intensity?: number;
  completed?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onChange?: () => void;
  onAnalyze?: () => void;
  onDetails?: () => void;
  tss?: number;
  time?: number; // Total seconds
  source?: string;
};

// labelKey: i18n key, translated when rendered
const activityConfig: Record<string, { icon: any, lightColor: string, bgColor: string, labelKey: string }> = {
  running: { icon: Footprints, lightColor: "#f97316", bgColor: "bg-orange-500/10", labelKey: "common:sports.running" },
  cycling: { icon: Bike, lightColor: "#3b82f6", bgColor: "bg-blue-500/10", labelKey: "common:sports.cycling" },
  swimming: { icon: Waves, lightColor: "#06b6d4", bgColor: "bg-cyan-500/10", labelKey: "common:sports.swimming" },
  strength: { icon: Dumbbell, lightColor: "#a855f7", bgColor: "bg-purple-500/10", labelKey: "common:sports.strength" },
  stretching: { icon: StretchHorizontal, lightColor: "#f59e0b", bgColor: "bg-amber-500/10", labelKey: "common:sports.stretching" },
  yoga: { icon: StretchHorizontal, lightColor: "#10b981", bgColor: "bg-emerald-500/10", labelKey: "session:sports.yoga" },
  other: { icon: Activity, lightColor: "#6b7280", bgColor: "bg-gray-500/10", labelKey: "session:sports.other" },
};

export default function SessionCard({
  name,
  meta,
  description,
  sport = 'cycling',
  intensity,
  completed = false,
  onStart,
  onComplete,
  onChange,
  onAnalyze,
  onDetails,
  tss,
  time,
  source
}: Props) {
  const { t } = useTranslation('session');
  const sportKey = sport.toLowerCase();
  const config = activityConfig[sportKey] || (sportKey.includes('strength') ? activityConfig.strength : activityConfig.other);
  const displayName = name || t(config.labelKey);
  const Icon = config.icon;
  const { colors, isDark } = useTheme();

  const zoneToken = getIntensityZoneToken(intensity);

  // Format Duration string
  const formatDuration = (totalSec?: number) => {
    if (!totalSec || totalSec <= 0) return null;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) {
      return m > 0 ? t('duration.hm', { h, m }) : t('duration.h', { h });
    }
    return t('duration.m', { m });
  };

  const durStr = formatDuration(time);

  return (
    <GlassCard
      style={{ marginBottom: 16 }}
    >
      <View className="flex-row items-start mb-3 justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <View className={cn("p-2.5 rounded-2xl mr-3", config.bgColor)}>
            <Icon size={20} color={isDark ? '#ffffff' : config.lightColor} />
          </View>
          <View className="flex-1">
            <Text variant="h3" className="font-bold tracking-tight" numberOfLines={1}>
              {displayName}
            </Text>
            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
              {intensity !== undefined && intensity !== null && !['strength', 'stretching', 'yoga', 'rest'].includes(sportKey) && (
                <Badge label={zoneToken.shortName} intensity={intensity} size="sm" />
              )}
              {durStr && (
                <View className="flex-row items-center gap-1">
                  <Clock size={11} color={colors.textSecondary} />
                  <Text variant="muted" className="text-xs font-semibold">
                    {durStr}
                  </Text>
                </View>
              )}
              {tss !== undefined && tss > 0 && (
                <View className="flex-row items-center gap-1">
                  <Zap size={11} color={colors.textSecondary} />
                  <Text variant="muted" className="text-xs font-semibold">
                    {Math.round(tss)} TSS
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {completed && (
          <View className="p-1">
            <CheckCircle2 size={22} strokeWidth={2.5} color={colors.primary} />
          </View>
        )}
      </View>

      <Text className="text-foreground/80 dark:text-foreground/90 text-sm leading-relaxed mb-4" numberOfLines={3}>
        {description}
      </Text>

      {!completed ? (
        <View className="flex-row gap-2">
          <GlassButton 
            label={t('common:start')}
            variant="glass-primary"
            shape="pill"
            onPress={onStart} 
            size="sm"
            style={{ flex: 1.4 }}
          />
          <GlassButton 
            label={t('common:details')}
            variant="glass" 
            shape="pill"
            onPress={onDetails} 
            size="sm"
            style={{ flex: 1 }}
          />
          <GlassButton 
            label={t('common:complete')}
            variant="glass" 
            shape="pill"
            onPress={onComplete} 
            size="sm"
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <View className="flex-row gap-2">
          <GlassButton 
            label={t('common:analyse')}
            variant="glass-primary"
            shape="pill"
            onPress={onAnalyze} 
            size="sm"
            style={{ flex: 1.5 }}
          />
          <GlassButton 
            label={t('common:details')}
            variant="glass" 
            shape="pill"
            onPress={onDetails} 
            size="sm"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </GlassCard>
  );
}
