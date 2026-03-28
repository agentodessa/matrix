import { useState, useCallback } from "react";
import { Text, Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/lib/workspace-context";

const SPRING_CONFIG = { damping: 22, stiffness: 260, mass: 0.8 };

const WorkspaceOption = ({
  label,
  isActive,
  emoji,
  onPress,
  index,
}: {
  label: string;
  isActive: boolean;
  emoji: string;
  onPress: () => void;
  index: number;
}) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(200)}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, SPRING_CONFIG); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
        onPress={onPress}
      >
        <Animated.View
          style={animStyle}
          className={`flex-row items-center gap-3 px-4 py-3 rounded-xl ${isActive ? "bg-accent/10" : ""}`}
        >
          <View
            className={`w-9 h-9 rounded-full items-center justify-center ${isActive ? "bg-accent/15" : "bg-bg-elevated"}`}
          >
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
          </View>
          <View className="flex-1">
            <Text
              className={`font-body text-[15px] ${isActive ? "font-semibold text-accent" : "font-medium text-heading"}`}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
          {isActive && (
            <Animated.View entering={FadeIn.duration(200)}>
              <Text className="text-accent text-base">✓</Text>
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const getEmoji = (type: "personal" | "team", name: string) => {
  if (type === "personal") return "👤";
  const teamEmojis = ["🚀", "⚡", "🎯", "💎", "🔥", "🌟", "🏆", "💫"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return teamEmojis[Math.abs(hash) % teamEmojis.length];
};

export const WorkspacePill = () => {
  const { t } = useTranslation();
  const { workspaceName, workspaces, setWorkspace, workspaceId, workspaceType } = useWorkspace();
  const [open, setOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const displayName = workspaceType === "personal" ? t("Personal") : workspaceName;
  const truncated = displayName.length > 14 ? displayName.slice(0, 14) + "…" : displayName;

  const handleClose = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback((id: string) => {
    setWorkspace(id);
    handleClose();
  }, [setWorkspace, handleClose]);

  const dropdownWidth = Math.min(screenWidth - 32, 280);

  return (
    <>
      <Pressable
        className="flex-row items-center gap-1.5 active:opacity-70"
        onPress={() => setOpen((v) => !v)}
      >
        <View className="w-2 h-2 rounded-full bg-success" />
        <Text className="font-body text-sm font-semibold text-heading" numberOfLines={1}>
          {truncated}
        </Text>
        <Text className="text-meta text-sm tracking-tighter">•••</Text>
      </Pressable>

      {open && (
        <>
          <Pressable
            className="absolute top-0 left-0 right-0 bottom-0"
            style={{ zIndex: 99 }}
            onPress={handleClose}
          />
          <Animated.View
            entering={FadeIn.duration(150)}
            style={{ width: dropdownWidth, zIndex: 100 }}
            className="absolute top-12 right-0 bg-bg-card rounded-2xl p-2 shadow-lg"
          >
            <View className="px-4 pt-2 pb-1">
              <Text className="font-display text-xs font-semibold text-meta uppercase tracking-widest">
                {t("Workspaces")}
              </Text>
            </View>

            {workspaces.map((ws, index) => (
              <WorkspaceOption
                key={ws.id}
                label={ws.type === "personal" ? t("Personal") : ws.name}
                isActive={ws.id === workspaceId}
                emoji={getEmoji(ws.type, ws.name)}
                onPress={() => handleSelect(ws.id)}
                index={index}
              />
            ))}
          </Animated.View>
        </>
      )}
    </>
  );
};
