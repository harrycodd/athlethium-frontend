import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[isDark ? 'dark' : 'light'];

  return {
    ...themeColors,
    colors: themeColors,
    isDark,
  };
}
