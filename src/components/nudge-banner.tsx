import { View, Pressable } from "react-native";
import Text from "./ui/text";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  onPress?: () => void;
  variant?: "info" | "warning" | "success";
  className?: string;
};

export default function NudgeBanner({
  title,
  description,
  onPress,
  variant = "info",
  className,
}: Props) {
  const variants = {
    info: "bg-primary/10 border-primary/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    success: "bg-green-500/10 border-green-500/20",
  };

  const textVariants = {
    info: "text-primary",
    warning: "text-yellow-600",
    success: "text-green-600",
  };

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "p-4 rounded-xl border flex-row items-center",
        variants[variant],
        className
      )}
    >
      <View className="flex-1">
        <Text className={cn("font-bold", textVariants[variant])}>
          {title}
        </Text>
        <Text variant="small" className="mt-0.5">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
