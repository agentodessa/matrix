import { useEffect } from "react";
import { View, Text, TextInput, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const HEADING_COLOR = { light: "#2a3439", dark: "#e0e4e6" };

const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const colorScheme = useColorScheme();
  const color = HEADING_COLOR[colorScheme === "dark" ? "dark" : "light"];
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]); // oxlint-disable-line react-hooks/exhaustive-deps -- animatedValue is a Reanimated shared value

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${Math.round(animatedValue.value)}${suffix}`,
    } as any;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      className="font-display text-2xl font-extrabold tracking-tight p-0 m-0"
      style={{ color }}
      animatedProps={animatedProps}
      defaultValue={`0${suffix}`}
    />
  );
};

const getProgressColor = (v: number) => {
  "worklet";
  return v < 30 ? "#dc2626" : v < 70 ? "#d97706" : "#16a34a";
};

const AnimatedProgressBar = ({ progress }: { progress: number }) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(100, Math.max(0, progress)), {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]); // oxlint-disable-line react-hooks/exhaustive-deps -- animatedProgress is a Reanimated shared value

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
    backgroundColor: getProgressColor(animatedProgress.value),
  }));

  return (
    <View className="h-1.5 rounded-full bg-slate-track mt-1">
      <Animated.View className="h-1.5 rounded-full" style={barStyle} />
    </View>
  );
};

interface MetricTileProps {
  label: string;
  labelColor?: string;
  value: string;
  description?: string;
  progress?: number;
  children?: React.ReactNode;
}

export const MetricTile = ({
  label,
  labelColor,
  value,
  description,
  progress,
  children,
}: MetricTileProps) => {
  const numericMatch = value.match(/^(\d+)(.*)$/);

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

      {numericMatch ? (
        <AnimatedNumber value={parseInt(numericMatch[1], 10)} suffix={numericMatch[2]} />
      ) : (
        <Text
          className="font-display text-2xl font-extrabold tracking-tight text-heading"
          numberOfLines={1}
        >
          {value}
        </Text>
      )}

      {description ? (
        <Text className="font-body text-xs text-meta" numberOfLines={1}>
          {description}
        </Text>
      ) : null}

      {progress === undefined ? null : <AnimatedProgressBar progress={progress} />}

      {children}
    </View>
  );
};
