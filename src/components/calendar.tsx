import { View, Pressable } from 'react-native';
import React, { useState, useMemo } from 'react';
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday
} from 'date-fns';
import Text from '@/components/ui/text';
import Card from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/i18n/format';

import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';

type CalendarProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onToggleExpand?: (isExpanded: boolean) => void;
  className?: string;
  flat?: boolean;
};

export default function Calendar({
  selectedDate,
  onDateSelect,
  onToggleExpand,
  className,
  flat = false
}: CalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const theme = useTheme();
  const { t } = useTranslation('plan');

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(viewDate, { weekStartsOn: 1 });

  const days = useMemo(() => {
    if (isExpanded) {
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [isExpanded, calendarStart, calendarEnd, weekStart, weekEnd]);

  const rows = useMemo(() => {
    const r: Date[][] = [];
    let cells: Date[] = [];
    days.forEach((day, i) => {
      cells.push(day);
      if ((i + 1) % 7 === 0) {
        r.push(cells);
        cells = [];
      }
    });
    return r;
  }, [days]);

  // Narrow weekday labels (M T W T F S S in English) in the current language, Monday first.
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) => formatDate(d, 'EEEEE'));

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggleExpand?.(newState);
  };

  const renderContent = () => (
    <>
      <View className="flex-row justify-between items-center mb-4">
        <Text variant="h3" className="mr-1">
          {formatDate(viewDate, 'MMMM yyyy')}
        </Text>

        <View className="flex-row gap-1.5 items-center">
          <GlassButton
            size="sm"
            shape="pill"
            variant={isSameDay(selectedDate, new Date()) ? "glass-primary" : "glass"}
            label={t('calendar.today')}
            style={{ width: 58, height: 26 }}
            contentContainerStyle={{ width: 58, height: 26, minHeight: 26, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }}
            textStyle={{
              fontSize: 11,
              fontWeight: '700',
              textAlign: 'center',
              color: isSameDay(selectedDate, new Date()) ? '#22c55e' : theme.colors.text,
              includeFontPadding: false,
            }}
            onPress={() => {
              const now = new Date();
              onDateSelect(now);
              setViewDate(now);
            }}
          />
          <GlassButton
            size="icon"
            shape="circle"
            variant="glass"
            style={{ width: 26, height: 26 }}
            contentContainerStyle={{ width: 26, height: 26, minHeight: 26, padding: 0, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setViewDate(isExpanded ? subMonths(viewDate, 1) : subWeeks(viewDate, 1))}
          >
            <ChevronLeft size={14} color={theme.colors.text} strokeWidth={2.5} />
          </GlassButton>
          <GlassButton
            size="icon"
            shape="circle"
            variant="glass"
            style={{ width: 26, height: 26 }}
            contentContainerStyle={{ width: 26, height: 26, minHeight: 26, padding: 0, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setViewDate(isExpanded ? addMonths(viewDate, 1) : addWeeks(viewDate, 1))}
          >
            <ChevronRight size={14} color={theme.colors.text} strokeWidth={2.5} />
          </GlassButton>
        </View>
      </View>

      <View className="flex-row justify-between mb-2 mt-2">
        {daysOfWeek.map((d, i) => (
          <View key={i} className="flex-1 items-center">
            <Text variant="small" className="font-bold text-muted-foreground">{d}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, i) => (
        <View key={i} className="flex-row justify-between mb-2">
          {row.map((day: Date) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, viewDate);
            const today = isToday(day);

            return (
              <Pressable
                key={day.toString()}
                onPress={() => {
                  onDateSelect(day);
                  setViewDate(day);
                }}
                className={cn(
                  "flex-1 aspect-square items-center justify-center rounded-full mx-0.5",
                  isSelected ? "bg-primary" : today ? "bg-primary/10" : ""
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-primary-foreground" :
                      !isExpanded || isCurrentMonth ? "text-foreground" : "text-foreground opacity-40",
                    today && !isSelected ? "text-primary font-bold" : ""
                  )}
                >
                  {formatDate(day, 'd')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View className="items-center mt-2">
        <GlassButton
          size="sm"
          shape="pill"
          variant="glass"
          onPress={handleToggle}
          style={{ width: 80, height: 26, alignSelf: 'center' }}
          contentContainerStyle={{
            width: 80,
            height: 26,
            minHeight: 26,
            paddingHorizontal: 0,
            paddingVertical: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View className="flex-row items-center justify-center gap-1">
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.text, includeFontPadding: false }}>
              {isExpanded ? t('calendar.collapse') : t('calendar.expand')}
            </Text>
            {isExpanded ? (
              <ChevronUp size={13} color={theme.colors.text} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={13} color={theme.colors.text} strokeWidth={2.5} />
            )}
          </View>
        </GlassButton>
      </View>
    </>
  );

  if (flat) {
    return <View className={className}>{renderContent()}</View>;
  }

  return (
    <GlassCard style={{ padding: 16, paddingBottom: 18, marginBottom: 16 }} className={className}>
      {renderContent()}
    </GlassCard>
  );
}
