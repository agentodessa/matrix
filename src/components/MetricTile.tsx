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
    <View className="flex-1 rounded-lg bg-bg-tile p-5 gap-2">
      <Text
        className={
          labelColor
            ? `font-body text-[10px] font-bold uppercase tracking-widest ${labelColor}`
            : "font-body text-[10px] font-bold uppercase tracking-widest text-label"
        }
        numberOfLines={1}
      >
        {label}
      </Text>

      <Text className="font-display text-2xl font-extrabold tracking-tight text-heading" numberOfLines={1}>
        {value}
      </Text>

      {description ? (
        <Text className="font-body text-xs text-meta" numberOfLines={1}>{description}</Text>
      ) : null}

      {progress !== undefined ? (
        <View className="h-1.5 rounded-full bg-slate-track mt-1">
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
