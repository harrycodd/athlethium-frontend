import { View, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type Props = ViewProps & {
  className?: string;
};

export default function Container({ children, className, ...props }: Props) {
  return (
    <View
      className={cn("w-full px-4", className)}
      {...props}
    >
      {children}
    </View>
  );
}
