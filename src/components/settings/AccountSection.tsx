import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth-store";
import { useSubscription } from "../../lib/subscription-store";

export const AccountSection = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isPro } = useSubscription();

  return (
    <View className="gap-3">
      <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
        {t("Account")}
      </Text>
      <Pressable
        className="bg-bg-card rounded-lg overflow-hidden active:opacity-70"
        onPress={() => router.push("/profile")}
      >
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-1 gap-1">
            <Text className="font-body text-base font-bold text-heading">
              {isAuthenticated ? user?.displayName : t("Guest User")}
            </Text>
            <Text className="font-body text-sm text-body">
              {isAuthenticated ? user?.email : t("Tap to sign up or sign in")}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {isAuthenticated && (
              <View
                className={
                  isPro
                    ? "bg-success/15 rounded-full px-2 py-0.5"
                    : "bg-btn-surface rounded-full px-2 py-0.5 border border-border"
                }
              >
                <Text
                  className={
                    isPro
                      ? "font-body text-[10px] font-bold text-success"
                      : "font-body text-[10px] font-bold text-meta"
                  }
                >
                  {isPro ? t("Pro") : t("Free")}
                </Text>
              </View>
            )}
            <Text className="text-meta text-base">→</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};
