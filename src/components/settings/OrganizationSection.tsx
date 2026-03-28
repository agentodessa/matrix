import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTeams, usePendingInvites } from "@/lib/teams-store";
import { useAuth } from "@/lib/auth-store";

export const OrganizationSection = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { teams } = useTeams();
  const { invites: pendingInvites } = usePendingInvites();

  const teamSubtitle = user
    ? teams.length > 0
      ? t("{{count}} team", { count: teams.length })
      : t("Create or join a team")
    : t("Sign in to create a team");

  return (
    <View className="gap-3">
      <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
        {t("Organization")}
      </Text>
      <View className="bg-bg-card rounded-lg overflow-hidden">
        {/* Projects row */}
        <Pressable className="active:opacity-70" onPress={() => router.push("/projects")}>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-1 gap-1">
              <Text className="font-body text-base font-bold text-heading">{t("Projects")}</Text>
              <Text className="font-body text-sm text-body">
                {t("Create and manage your projects")}
              </Text>
            </View>
            <Text className="text-meta text-base">→</Text>
          </View>
        </Pressable>

        {/* Team row */}
        <Pressable className="active:opacity-70" onPress={() => router.push("/team")}>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-1 gap-1">
              <Text className="font-body text-base font-bold text-heading">{t("Team")}</Text>
              <Text className="font-body text-sm text-body">{teamSubtitle}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {pendingInvites.length > 0 && <View className="w-2.5 h-2.5 rounded-full bg-urgent" />}
              <Text className="text-meta text-base">→</Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
};
