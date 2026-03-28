import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSubscription } from "../../lib/subscription-store";

export const SubscriptionSection = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isPro } = useSubscription();

  return (
    <View className="gap-3">
      <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
        {t("Subscription")}
      </Text>
      <Pressable
        className="bg-bg-card rounded-lg overflow-hidden active:opacity-70"
        onPress={() => router.push("/paywall")}
      >
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-1 gap-1">
            <Text className="font-body text-base font-bold text-heading">
              {isPro ? t("Pro Plan") : t("Upgrade to Pro")}
            </Text>
            <Text className="font-body text-sm text-body">
              {isPro
                ? t("All features unlocked")
                : t("Calendar, cloud sync, and more — $4.99/mo")}
            </Text>
          </View>
          {!isPro && (
            <View className="bg-success/15 rounded-full px-2.5 py-1">
              <Text className="font-body text-[10px] font-bold text-success uppercase">
                {t("Pro")}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
};
