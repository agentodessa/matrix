import { View, type ViewProps } from "react-native";
import { isGlassAvailable } from "@/lib/glass";

interface GlassCardProps extends ViewProps {
  fallbackClassName?: string;
}

export const GlassCard = ({
  children,
  className,
  fallbackClassName = "bg-bg-card rounded-lg",
  style,
  ...props
}: GlassCardProps) => {
  if (isGlassAvailable()) {
    const { GlassView } = require("expo-glass-effect");
    return (
      <GlassView
        glassEffectStyle="regular"
        className={className}
        style={style}
        {...props}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      className={`${fallbackClassName} ${className ?? ""}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
};
