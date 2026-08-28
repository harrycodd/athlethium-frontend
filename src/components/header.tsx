import { View } from "react-native";
import Text from "./ui/text";
import { cn } from "@/lib/utils";

type Props = {
  title: string | React.ReactNode;
  subtitle?: string;
  className?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
};

export default function Header({
  title,
  subtitle,
  className,
  leftElement,
  rightElement,
}: Props) {
  return (
    <View className={cn("flex-row items-center justify-between py-6", className)}>
      <View className="flex-row items-center flex-1">
        {leftElement ? <View className="mr-4">{leftElement}</View> : null}
        <View className="flex-1">
          {typeof title === 'string' ? <Text variant="h1" numberOfLines={1} ellipsizeMode="tail">{title}</Text> : title}
          {subtitle ? (
            <Text variant="muted" className="mt-1">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightElement ? <View>{rightElement}</View> : null}
    </View>
  );
}
