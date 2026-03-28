import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-store";
import { useSubscription } from "@/lib/subscription-store";

export const DataSection = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isPro } = useSubscription();

  return (
    <View className="gap-3">
      <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
        {t("Data")}
      </Text>
      <View className="bg-bg-card rounded-lg overflow-hidden">
        <Pressable
          className="active:opacity-70"
          onPress={() => {
            if (!isPro) router.push("/paywall");
          }}
        >
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-1 gap-1">
              <Text className="font-body text-base font-bold text-heading">{t("Cloud Sync")}</Text>
              <Text className="font-body text-sm text-body">
                {isPro && isAuthenticated
                  ? t("Connected")
                  : isPro
                    ? t("Sign in to enable")
                    : t("Pro feature")}
              </Text>
            </View>
            {!isPro && (
              <View className="bg-success/15 rounded-full px-2 py-0.5">
                <Text className="font-body text-[10px] font-bold text-success uppercase">
                  {t("Pro")}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
};
