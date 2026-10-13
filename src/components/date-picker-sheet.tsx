import React from 'react';
import { Modal, Platform, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import Text from '@/components/ui/text';
import { GlassButton } from '@/components/ui/glass-button';
import { useTheme } from '@/hooks/use-theme';
import { BorderWidth } from '@/constants/theme';

interface DatePickerSheetProps {
  visible: boolean;
  value: Date;
  title: string;
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
}

/**
 * Picks a day. iOS: a bottom sheet with a full calendar (the bare picker only renders a small
 * date chip). Android: the system date dialog.
 */
export default function DatePickerSheet({ visible, value, title, onChange, onClose, minimumDate }: DatePickerSheetProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  if (Platform.OS !== 'ios') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        onChange={(_event: any, date?: Date) => {
          onClose();
          if (date) onChange(date);
        }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
        testID="date-picker-backdrop"
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: theme.isDark ? '#1c1c1e' : '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: BorderWidth.hairline,
            borderColor: theme.colors.border,
            padding: 20,
            paddingBottom: 36,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.text }}>{title}</Text>
            <GlassButton
              onPress={onClose}
              shape="pill"
              size="sm"
              variant="glass-primary"
              label={t('common:done')}
              style={{ height: 34, minWidth: 64 }}
            />
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            locale={i18n.resolvedLanguage}
            accentColor={theme.colors.primary}
            themeVariant={theme.isDark ? 'dark' : 'light'}
            onChange={(_event: any, date?: Date) => {
              if (date) onChange(date);
            }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
