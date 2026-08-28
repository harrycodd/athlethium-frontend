import { View } from "react-native";
import Text from "./ui/text";
import Card from "./ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string | number;
  label: string;
  progress: number; // 0 to 1
  className?: string;
};

export default function ProgressCard({
  title,
  value,
  label,
  progress,
  className,
}: Props) {
  return (
    <Card className={cn("p-5", className)}>
      <View className="flex-row justify-between items-end">
        <View>
          <Text variant="muted">{title}</Text>
          <Text variant="h2" className="mt-1">
            {value}
          </Text>
        </View>
        <Text variant="small" className="font-bold text-primary">
          {label}
        </Text>
      </View>

      <View className="h-2 bg-muted rounded-full mt-4 overflow-hidden">
        <View
          className="h-full bg-primary"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </View>
    </Card>
  );
}
