import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, useColorScheme, Alert } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { useTeams, usePendingInvites, useTeamMutations } from "@/lib/teams-store";
import { useAuth } from "@/lib/auth-store";
import { useSubscription } from "@/lib/subscription-store";
import { useTranslation } from "react-i18next";

export default function TeamScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const { isAuthenticated } = useAuth();
  const { isProTeam } = useSubscription();
  const { teams } = useTeams();
  const { invites: pendingInvites } = usePendingInvites();
  const { createTeam, acceptInvite, declineInvite } = useTeamMutations();
  const [newName, setNewName] = useState("");

  const trimmed = newName.trim();

  const handleCreate = () => {
    if (!trimmed) return;
    createTeam.mutate(trimmed, {
      onSuccess: () => {
        setNewName("");
      },
      onError: (err: any) => {
        Alert.alert(t("Error"), err?.message ?? t("Failed to create team."));
      },
    });
  };

  const handleAccept = (inviteId: string, _teamId: string) => {
    acceptInvite.mutate(inviteId, {
      onError: (err: any) => {
        Alert.alert(t("Error"), err?.message ?? t("Failed to accept invite."));
      },
    });
  };

  const handleDecline = (inviteId: string) => {
    declineInvite.mutate(inviteId, {
      onError: (err: any) => {
        Alert.alert(t("Error"), err?.message ?? t("Failed to decline invite."));
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <Header title={t("Team")} showBack />
        <View className="flex-1 items-center justify-center px-7 gap-5">
          <Text className="font-display text-xl font-extrabold text-heading text-center">
            {t("Sign in required")}
          </Text>
          <Text className="font-body text-sm text-meta text-center leading-5">
            {t("Create or join a team to collaborate with others.")}
          </Text>
          <Pressable
            className="bg-success rounded-xl py-4 px-8 items-center active:opacity-80"
            onPress={() => router.push("/auth/sign-up")}
          >
            <Text className="font-body text-base font-extrabold text-bg tracking-wide">
              {t("Create Account")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Team")} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Pending Invites ── */}
        {pendingInvites.length > 0 && (
          <View className="gap-2">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
              {t("Pending Invites")}
            </Text>
            {pendingInvites.map((invite) => (
              <View key={invite.id} className="bg-bg-card rounded-xl px-5 py-4 gap-3">
                <Text className="font-display text-base font-bold text-heading">
                  {invite.team_name}
                </Text>
                <View className="flex-row gap-2">
                  <Pressable
                    className="flex-1 bg-success rounded-lg py-2.5 items-center active:opacity-80"
                    onPress={() => handleAccept(invite.id, invite.team_id)}
                  >
                    <Text className="font-body text-sm font-bold text-bg">{t("Accept")}</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 bg-btn-surface rounded-lg py-2.5 items-center active:opacity-70"
                    onPress={() => handleDecline(invite.id)}
                  >
                    <Text className="font-body text-sm font-bold text-meta">{t("Decline")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── New Team ── */}
        {isProTeam ? (
          <View className="gap-2">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
              {t("New Team")}
            </Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="flex-1 font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder={t("Team name...")}
                placeholderTextColor={placeholderColor}
                value={newName}
                onChangeText={setNewName}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <Pressable
                className={
                  trimmed
                    ? "bg-success rounded-full px-5 py-2.5 active:opacity-80"
                    : "bg-btn-surface rounded-full px-5 py-2.5 opacity-50"
                }
                onPress={handleCreate}
                disabled={!trimmed || createTeam.isPending}
              >
                <Text
                  className={
                    trimmed
                      ? "font-body text-sm font-bold text-bg"
                      : "font-body text-sm font-bold text-meta"
                  }
                >
                  {t("Create")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
              {t("New Team")}
            </Text>
            <View className="bg-bg-card rounded-lg p-5 gap-3">
              <Text className="font-body text-sm font-bold text-heading">
                {t("Pro Team required")}
              </Text>
              <Text className="font-body text-sm text-body">
                {t("Upgrade to Pro Team to create and manage teams.")}
              </Text>
              <Pressable
                className="bg-success rounded-lg py-3 items-center active:opacity-80"
                onPress={() => router.push("/paywall")}
              >
                <Text className="font-body text-sm font-bold text-bg">
                  {t("Upgrade to Pro Team")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Your Teams ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            {t("Your Teams")}
          </Text>
          {teams.length === 0 ? (
            <View className="bg-bg-card rounded-lg py-10 items-center gap-2">
              <Text className="font-display text-base font-bold text-heading">
                {t("No teams yet")}
              </Text>
              <Text className="font-body text-sm text-meta">
                {t("Create your first team above.")}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {teams.map((team) => (
                <Pressable
                  key={team.id}
                  className="flex-row items-center justify-between bg-bg-card rounded-lg px-5 py-4 active:opacity-70"
                  onPress={() => router.push(`/team/${team.id}`)}
                >
                  <Text className="font-display text-base font-bold text-heading flex-1">
                    {team.name}
                  </Text>
                  <Text className="font-body text-sm text-meta">›</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
