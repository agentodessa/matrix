import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/lib/subscription-store";
import { Feature, isFeatureAvailable } from "@/lib/features";

interface ProGateProps {
  feature: Feature;
  featureLabel: string;
  children: React.ReactNode;
}

export const ProGate = ({ feature, featureLabel, children }: ProGateProps) => {
  const { t } = useTranslation();
  const { plan } = useSubscription();
  const router = useRouter();

  if (isFeatureAvailable(feature, plan)) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1 items-center justify-center px-8 gap-6">
      <View className="items-center gap-3">
        <View className="w-16 h-16 rounded-full bg-slate/10 items-center justify-center">
          <Text style={{ fontSize: 28 }}>🔒</Text>
        </View>
        <Text className="font-display text-xl font-bold text-heading text-center">
          {featureLabel}
        </Text>
        <Text className="font-body text-sm text-meta text-center leading-5">
          {t("This feature is available on the Pro plan.")}{"\n"}
          {t("Upgrade to unlock the full experience.")}
        </Text>
      </View>

      <View className="w-full gap-3">
        <Pressable
          className="bg-success rounded-xl py-4 items-center active:opacity-80"
          onPress={() => router.push("/paywall")}
        >
          <Text className="font-body text-base font-extrabold text-bg tracking-wide">
            {t("Upgrade to Pro")}
          </Text>
        </Pressable>
        <View className="flex-row items-center justify-center gap-1">
          <Text className="font-body text-xs text-meta">{t("Starting at")}</Text>
          <Text className="font-body text-xs font-bold text-heading">$4.99/{t("mo")}</Text>
        </View>
      </View>
    </View>
  );
};
