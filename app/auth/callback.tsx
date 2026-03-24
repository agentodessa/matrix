import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/lib/supabase";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle the OAuth callback — extract tokens from URL fragment
    const accessToken = params.access_token as string | undefined;
    const refreshToken = params.refresh_token as string | undefined;

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          router.replace("/(tabs)");
        });
    } else {
      // No tokens — just go back
      router.replace("/(tabs)");
    }
  }, [params, router]);

  return (
    <SafeAreaView className="flex-1 bg-bg items-center justify-center" edges={["top"]}>
      <View className="items-center gap-4">
        <ActivityIndicator size="large" />
        <Text className="font-body text-sm text-meta">Signing you in...</Text>
      </View>
    </SafeAreaView>
  );
}
