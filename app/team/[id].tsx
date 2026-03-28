import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  useColorScheme,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Header } from "@/components/Header";
import { useTeams, useTeamMembers, useTeamInvites, useTeamMutations } from "@/lib/teams-store";
import { useAuth } from "@/lib/auth-store";
import { useTranslation } from "react-i18next";
import type { TeamRole } from "@/types/team";

export default function TeamDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";

  const { user } = useAuth();
  const { teams } = useTeams();
  const { members } = useTeamMembers(id ?? null);
  const { invites: pendingInvites } = useTeamInvites(id ?? null);
  const { inviteByEmail, removeMember, updateRole, leaveTeam, deleteTeam, declineInvite } =
    useTeamMutations();

  const [inviteEmail, setInviteEmail] = useState("");

  const team = teams.find((item) => item.id === id);
  const myMembership = members.find((m) => m.user_id === user?.id);
  const isOwner = myMembership?.role === "owner";
  const isAdmin = myMembership?.role === "admin";
  const canManage = isOwner || isAdmin;

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email || !id) return;
    inviteByEmail.mutate(
      { teamId: id, email },
      {
        onSuccess: () => setInviteEmail(""),
        onError: (err: any) => {
          Alert.alert(t("Error"), err?.message ?? t("Failed to send invite."));
        },
      },
    );
  };

  const handleCopyLink = () => {
    if (!team) return;
    const link = `eisenhower-reminder:///team/join?code=${team.invite_code}`;
    Share.share({ message: link });
  };

  const handleCancelInvite = (inviteId: string) => {
    declineInvite.mutate(inviteId, {
      onError: (err: any) => {
        Alert.alert(t("Error"), err?.message ?? t("Failed to cancel invite."));
      },
    });
  };

  const handleRemoveMember = (userId: string, displayName: string) => {
    if (!id) return;
    Alert.alert(t("Remove Member"), t("Remove {{name}} from this team?", { name: displayName }), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Remove"),
        style: "destructive",
        onPress: () => {
          removeMember.mutate(
            { teamId: id, userId },
            {
              onError: (err: any) => {
                Alert.alert(t("Error"), err?.message ?? t("Failed to remove member."));
              },
            },
          );
        },
      },
    ]);
  };

  const handleToggleRole = (userId: string, currentRole: TeamRole) => {
    if (!id) return;
    const newRole: TeamRole = currentRole === "admin" ? "member" : "admin";
    updateRole.mutate(
      { teamId: id, userId, role: newRole },
      {
        onError: (err: any) => {
          Alert.alert(t("Error"), err?.message ?? t("Failed to update role."));
        },
      },
    );
  };

  const handleLeave = () => {
    if (!id) return;
    Alert.alert(t("Leave Team"), t("Are you sure you want to leave this team?"), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Leave"),
        style: "destructive",
        onPress: () => {
          leaveTeam.mutate(id, {
            onSuccess: () => router.back(),
            onError: (err: any) => {
              Alert.alert(t("Error"), err?.message ?? t("Failed to leave team."));
            },
          });
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      t("Delete Team"),
      t("This will permanently delete the team and remove all members. This cannot be undone."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () => {
            deleteTeam.mutate(id, {
              onSuccess: () => router.back(),
              onError: (err: any) => {
                Alert.alert(t("Error"), err?.message ?? t("Failed to delete team."));
              },
            });
          },
        },
      ],
    );
  };

  if (!team) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <Header title={t("Team")} showBack />
        <View className="flex-1 items-center justify-center px-7">
          <Text className="font-body text-sm text-meta text-center">{t("Team not found.")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={team.name} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Invite Section (owner/admin only) ── */}
        {canManage && (
          <View className="gap-3">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
              {t("Invite Members")}
            </Text>

            {/* Email invite */}
            <View className="flex-row items-center gap-3">
              <TextInput
                className="flex-1 font-body text-base font-bold text-heading border-b border-border pb-3"
                placeholder={t("Email address...")}
                placeholderTextColor={placeholderColor}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={handleInvite}
              />
              <Pressable
                className={
                  inviteEmail.trim()
                    ? "bg-success rounded-full px-5 py-2.5 active:opacity-80"
                    : "bg-btn-surface rounded-full px-5 py-2.5 opacity-50"
                }
                onPress={handleInvite}
                disabled={!inviteEmail.trim() || inviteByEmail.isPending}
              >
                <Text
                  className={
                    inviteEmail.trim()
                      ? "font-body text-sm font-bold text-bg"
                      : "font-body text-sm font-bold text-meta"
                  }
                >
                  {t("Send")}
                </Text>
              </Pressable>
            </View>

            {/* Copy invite link */}
            <Pressable
              className="bg-bg-card rounded-xl py-3.5 items-center active:opacity-70"
              onPress={handleCopyLink}
            >
              <Text className="font-body text-sm font-bold text-heading">
                {t("Copy Invite Link")}
              </Text>
            </Pressable>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <View className="gap-2">
                <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
                  {t("Pending Invites")}
                </Text>
                {pendingInvites.map((invite) => (
                  <View
                    key={invite.id}
                    className="flex-row items-center justify-between bg-bg-card rounded-lg px-4 py-3"
                  >
                    <Text className="font-body text-sm text-body flex-1">{invite.email}</Text>
                    <Pressable
                      className="rounded-full bg-btn-surface px-3 py-1.5 active:opacity-70"
                      onPress={() => handleCancelInvite(invite.id)}
                    >
                      <Text className="font-body text-xs font-semibold text-urgent">
                        {t("Cancel")}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Members List ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            {t("Members")}
          </Text>
          {members.map((member) => {
            const displayName = member.display_name ?? member.user_id.slice(0, 8);
            const isSelf = member.user_id === user?.id;
            const memberIsOwner = member.role === "owner";

            return (
              <View key={member.id} className="bg-bg-card rounded-lg px-5 py-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 gap-0.5">
                    <Text className="font-display text-base font-bold text-heading">
                      {displayName}
                      {isSelf ? ` (${t("you")})` : ""}
                    </Text>
                    {member.email ? (
                      <Text className="font-body text-xs text-meta">{member.email}</Text>
                    ) : null}
                  </View>
                  {/* Role badge */}
                  <View
                    className={
                      memberIsOwner
                        ? "bg-q2/15 rounded-full px-3 py-1"
                        : member.role === "admin"
                          ? "bg-success/15 rounded-full px-3 py-1"
                          : "bg-btn-surface rounded-full px-3 py-1"
                    }
                  >
                    <Text
                      className={
                        memberIsOwner
                          ? "font-body text-[10px] font-bold text-q2 uppercase tracking-wide"
                          : member.role === "admin"
                            ? "font-body text-[10px] font-bold text-success uppercase tracking-wide"
                            : "font-body text-[10px] font-bold text-meta uppercase tracking-wide"
                      }
                    >
                      {member.role}
                    </Text>
                  </View>
                </View>

                {/* Action buttons (owner only for role changes, owner/admin for remove) */}
                {!memberIsOwner && !isSelf && (
                  <View className="flex-row gap-2">
                    {isOwner && (
                      <Pressable
                        className="flex-1 bg-btn-surface rounded-lg py-2 items-center active:opacity-70"
                        onPress={() => handleToggleRole(member.user_id, member.role)}
                      >
                        <Text className="font-body text-xs font-semibold text-heading">
                          {member.role === "admin" ? t("Demote") : t("Promote")}
                        </Text>
                      </Pressable>
                    )}
                    {canManage && (
                      <Pressable
                        className="flex-1 bg-btn-surface rounded-lg py-2 items-center active:opacity-70"
                        onPress={() => handleRemoveMember(member.user_id, displayName)}
                      >
                        <Text className="font-body text-xs font-semibold text-urgent">
                          {t("Remove")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Actions ── */}
        <View className="gap-3">
          {!isOwner && (
            <Pressable
              className="bg-btn-surface rounded-xl py-4 items-center active:opacity-70"
              onPress={handleLeave}
            >
              <Text className="font-body text-base font-bold text-urgent">{t("Leave Team")}</Text>
            </Pressable>
          )}
          {isOwner && (
            <Pressable
              className="bg-btn-surface rounded-xl py-4 items-center active:opacity-70"
              onPress={handleDelete}
            >
              <Text className="font-body text-base font-bold text-urgent">{t("Delete Team")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
