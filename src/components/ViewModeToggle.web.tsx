import { useEffect } from "react";
import { View, Text, Pressable, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

const COLORS = {
  light: { active: "#2a3439", inactive: "#717c82", pillBg: "rgba(0,0,0,0.08)", trackBg: "#e1e9ee" },
  dark: {
    active: "#e0e4e6",
    inactive: "#6b777d",
    pillBg: "rgba(255,255,255,0.12)",
    trackBg: "#232b2e",
  },
};

interface Props {
  value: "focus" | "matrix";
  onChange: (mode: "focus" | "matrix") => void;
}

export const WebViewModeToggle = ({ value, onChange }: Props) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? COLORS.dark : COLORS.light;

  const progress = useSharedValue(value === "focus" ? 0 : 1);

  useEffect(() => {
    progress.value = withSpring(value === "focus" ? 0 : 1, SPRING_CONFIG);
  }, [value]);

  const pillStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    top: 4,
    left: 4,
    width: "calc(50% - 4px)" as unknown as number,
    height: "calc(100% - 8px)" as unknown as number,
    borderRadius: 9,
    backgroundColor: colors.pillBg,
    transform: [{ translateX: progress.value * 130 }],
  }));

  const focusTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.active, colors.inactive]),
  }));

  const matrixTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inactive, colors.active]),
  }));

  return (
    <View
      style={{
        backgroundColor: colors.trackBg,
        borderRadius: 12,
        padding: 4,
        flexDirection: "row",
        position: "relative",
        width: 268,
      }}
    >
      <Animated.View style={pillStyle} />
      <Pressable
        style={{ flex: 1, alignItems: "center", paddingVertical: 10, zIndex: 1 }}
        onPress={() => onChange("focus")}
      >
        <Animated.Text
          style={[{ fontSize: 13, fontWeight: "700", fontFamily: "Inter" }, focusTextStyle]}
        >
          Focus
        </Animated.Text>
      </Pressable>
      <Pressable
        style={{ flex: 1, alignItems: "center", paddingVertical: 10, zIndex: 1 }}
        onPress={() => onChange("matrix")}
      >
        <Animated.Text
          style={[{ fontSize: 13, fontWeight: "700", fontFamily: "Inter" }, matrixTextStyle]}
        >
          Matrix
        </Animated.Text>
      </Pressable>
    </View>
  );
};
