import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-store";
import { useTeamMutations } from "@/lib/teams-store";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TeamJoinScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuth();
  const { joinByCode } = useTeamMutations();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (!user) {
      AsyncStorage.setItem("@executive_pending_join", code).then(() => {
        router.replace("/auth/sign-up");
      });
      return;
    }

    supabase
      .from("teams")
      .select("id, name")
      .eq("invite_code", code)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setTeam(data);
        }
        setLoading(false);
      });
  }, [code, user]);

  const handleJoin = () => {
    if (!code || !team) return;
    joinByCode.mutate(code, {
      onSuccess: (joinedTeam) => {
        Alert.alert(t("Joined!"), t("You have joined {{name}}.", { name: team.name }), [
          {
            text: t("OK"),
            onPress: () => router.replace(`/team/${joinedTeam.id}`),
          },
        ]);
      },
      onError: (err: any) => {
        Alert.alert(t("Error"), err?.message ?? t("Failed to join team."));
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Join Team")} showBack />
      <View className="flex-1 items-center justify-center px-7">
        {loading ? (
          <ActivityIndicator size="small" />
        ) : notFound ? (
          <Text className="font-body text-base text-meta text-center">
            {t("Invalid invite link")}
          </Text>
        ) : team ? (
          <View className="w-full gap-5 items-center">
            <View className="items-center gap-2">
              <Text className="font-display text-2xl font-bold text-heading text-center">
                {team.name}
              </Text>
              <Text className="font-body text-sm text-meta text-center">
                {t("You've been invited to join this team.")}
              </Text>
            </View>
            <Pressable
              className="w-full bg-success rounded-xl py-4 items-center active:opacity-80"
              onPress={handleJoin}
              disabled={joinByCode.isPending}
            >
              <Text className="font-body text-base font-extrabold text-bg tracking-wide">
                {joinByCode.isPending ? t("Joining...") : t("Join Team")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
