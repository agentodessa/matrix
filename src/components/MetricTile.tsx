import { View, Text } from "react-native";

interface MetricTileProps {
  label: string;
  labelColor?: string;
  value: string;
  description?: string;
  progress?: number;
  children?: React.ReactNode;
}

export function MetricTile({
  label,
  labelColor,
  value,
  description,
  progress,
  children,
}: MetricTileProps) {
  return (
    <View className="rounded-lg bg-tile p-8">
      <Text
        className={
          labelColor
            ? `font-body text-xs font-bold uppercase tracking-widest ${labelColor}`
            : "font-body text-xs font-bold uppercase tracking-widest text-label"
        }
      >
        {label}
      </Text>

      <Text className="mt-2 font-display text-4xl font-extrabold tracking-tighter text-heading">
        {value}
      </Text>

      {description ? (
        <Text className="mt-1 font-body text-base text-body">{description}</Text>
      ) : null}

      {progress !== undefined ? (
        <View className="mt-3 h-1.5 rounded-full bg-slate-track">
          <View
            className="h-1.5 rounded-full bg-slate"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </View>
      ) : null}

      {children}
    </View>
  );
}
