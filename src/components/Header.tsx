import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

const AVATAR_COLORS = [
  "#ac0b18", "#0051d5", "#874200", "#6d28d9",
  "#0d9488", "#c026d3", "#ea580c", "#059669",
];

const AVATAR_EMOJIS = ["🦊", "🐼", "🦉", "🐸", "🦋", "🐙", "🦄", "🐯"];

function useGuestAvatar() {
  return useMemo(() => {
    const idx = Math.floor(Math.random() * AVATAR_COLORS.length);
    return {
      color: AVATAR_COLORS[idx],
      emoji: AVATAR_EMOJIS[idx],
    };
  }, []);
}

export function Header({ title = "The Executive", showBack = false }: HeaderProps) {
  const router = useRouter();
  const avatar = useGuestAvatar();

  return (
    <View className="bg-header-bg px-5 pb-3 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {showBack ? (
            <Pressable onPress={() => router.back()} className="p-1 active:opacity-70">
              <Text className="font-body text-base text-heading">←</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/profile")}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: avatar.color + "20" }}
            >
              <Text style={{ fontSize: 20 }}>{avatar.emoji}</Text>
            </Pressable>
          )}
          <Text className="font-body text-2xl font-semibold tracking-tight text-heading">
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}
