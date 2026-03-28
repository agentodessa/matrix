import { useMemo } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-store";
import { useSyncStatus } from "@/lib/use-online-status";
import { SyncPill } from "@/components/SyncPill";
import { WorkspacePill } from "@/components/WorkspacePill";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

const AVATAR_COLORS = [
  "#ac0b18", "#0051d5", "#874200", "#6d28d9",
  "#0d9488", "#c026d3", "#ea580c", "#059669",
];

const AVATAR_EMOJIS = ["🦊", "🐼", "🦉", "🐸", "🦋", "🐙", "🦄", "🐯"];

const useGuestAvatar = () => {
  return useMemo(() => {
    const idx = Math.floor(Math.random() * AVATAR_COLORS.length);
    return {
      color: AVATAR_COLORS[idx],
      emoji: AVATAR_EMOJIS[idx],
    };
  }, []);
};

export const Header = ({ title, showBack = false }: HeaderProps) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const syncStatus = useSyncStatus();
  const guestAvatar = useGuestAvatar();

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() ?? "?";
  const userColor = useMemo(() => {
    if (!user?.email) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < user.email.length; i++) {
      hash = user.email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }, [user?.email]);

  const avatarContent = () => {
    if (!isAuthenticated) {
      return <Text style={{ fontSize: 20 }}>{guestAvatar.emoji}</Text>;
    }
    if (user?.avatarUrl) {
      return (
        <Image
          source={{ uri: user.avatarUrl }}
          className="w-10 h-10 rounded-full"
        />
      );
    }
    return (
      <Text
        className="font-display font-bold"
        style={{ fontSize: 18, color: userColor }}
      >
        {userInitial}
      </Text>
    );
  };

  const avatarBg = isAuthenticated
    ? user?.avatarUrl
      ? "transparent"
      : userColor + "20"
    : guestAvatar.color + "20";

  return (
    <View className="bg-header-bg px-5 pb-3 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {showBack ? (
            <Pressable
              onPress={() => router.push("/(tabs)")}
              className="p-1 active:opacity-70"
            >
              <Text className="font-body text-base text-heading">←</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/profile")}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70 overflow-hidden"
              style={{ backgroundColor: avatarBg }}
            >
              {avatarContent()}
            </Pressable>
          )}
          {title && (
            <Text className="font-body text-2xl font-semibold tracking-tight text-heading">
              {title}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <WorkspacePill />
          <SyncPill status={syncStatus} />
        </View>
      </View>
    </View>
  );
};
