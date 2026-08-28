import { View, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type Props = ViewProps & {
  className?: string;
};

export default function Divider({ className, ...props }: Props) {
  return (
    <View
      className={cn("h-[1px] w-full bg-border", className)}
      {...props}
    />
  );
}
