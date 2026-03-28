import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { SyncStatus } from "../lib/use-online-status";

function SpinningIcon() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(rotation);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: 14, height: 14 }, style]}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: "transparent",
          borderTopColor: "#8e98b0",
          borderRightColor: "#8e98b0",
        }}
      />
    </Animated.View>
  );
}

export function SyncPill({ status }: { status: SyncStatus }) {
  if (status === "offline") {
    return <View className="w-3 h-3 rounded-full bg-urgent" />;
  }

  if (status === "syncing") {
    return <SpinningIcon />;
  }

  // synced
  return <View className="w-3 h-3 rounded-full bg-success" />;
}
