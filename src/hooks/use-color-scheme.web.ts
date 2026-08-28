import { useColorScheme as useRNColorScheme } from "react-native";

export function useColorScheme() {
  const systemColorScheme = useRNColorScheme();
  
  const colorScheme = systemColorScheme === 'unspecified' ? 'light' : (systemColorScheme ?? 'light');

  return {
    colorScheme: colorScheme as "light" | "dark",
  };
}
