import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../src/components/Header";
import { useSubscription } from "../src/lib/subscription-store";
import { useAuth } from "../src/lib/auth-store";
import { BillingCycle, PRICING } from "../src/types/user";
import { PaymentMethod } from "../src/lib/mock-payment";
import { useTranslation } from "react-i18next";

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isPro, subscribe } = useSubscription();
  const { isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [loading, setLoading] = useState(false);

  const FEATURES_FREE = [
    t("Eisenhower Matrix"),
    t("Unlimited tasks"),
    t("Project organization"),
    t("Focus dashboard"),
  ];

  const FEATURES_PRO = [
    t("Everything in Free"),
    t("Full calendar view"),
    t("Cloud sync across devices"),
    t("Priority support"),
  ];

  const price = billingCycle === "monthly" ? PRICING.monthly : PRICING.annual;
  const monthlyEquiv = billingCycle === "annual" ? (PRICING.annual / 12).toFixed(2) : null;

  const handleSubscribe = async (method: PaymentMethod) => {
    if (!isAuthenticated) {
      Alert.alert(
        t("Account Required"),
        t("Create an account first to subscribe to Pro."),
        [
          { text: t("Cancel"), style: "cancel" },
          { text: t("Sign Up"), onPress: () => router.push("/auth/sign-up") },
        ]
      );
      return;
    }

    setLoading(true);
    const result = await subscribe(billingCycle, method);
    setLoading(false);

    if (result.success) {
      Alert.alert(t("Welcome to Pro! 🎉"), t("You now have access to all features."), [
        { text: t("Let's go"), onPress: () => router.back() },
      ]);
    } else {
      Alert.alert(t("Payment Failed"), result.error ?? t("Please try again."));
    }
  };

  if (isPro) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <Header title={t("Pro Plan")} showBack />
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text style={{ fontSize: 48 }}>✨</Text>
          <Text className="font-display text-2xl font-bold text-heading">
            {t("You're on Pro!")}
          </Text>
          <Text className="font-body text-sm text-meta text-center leading-5">
            {t("You have access to all features.")}{"\n"}{t("Thank you for your support.")}
          </Text>
          <Pressable
            className="bg-btn-surface rounded-xl px-6 py-3 active:opacity-70 border border-border mt-4"
            onPress={() => router.back()}
          >
            <Text className="font-body text-sm font-bold text-heading">{t("Done")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Upgrade")} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-4 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="items-center gap-2 pt-2">
          <Text className="font-display text-2xl font-bold text-heading">
            {t("Unlock Pro")}
          </Text>
          <Text className="font-body text-sm text-meta text-center leading-5">
            {t("Get the full experience with calendar view,")}{"\n"}{t("cloud sync, and more.")}
          </Text>
        </View>

        {/* Billing toggle */}
        <View className="flex-row bg-btn-surface rounded-xl p-1">
          <Pressable
            className={
              billingCycle === "monthly"
                ? "flex-1 rounded-lg bg-bg py-3 items-center"
                : "flex-1 rounded-lg py-3 items-center active:opacity-70"
            }
            onPress={() => setBillingCycle("monthly")}
          >
            <Text
              className={
                billingCycle === "monthly"
                  ? "font-body text-sm font-bold text-heading"
                  : "font-body text-sm font-bold text-meta"
              }
            >
              {t("Monthly")}
            </Text>
          </Pressable>
          <Pressable
            className={
              billingCycle === "annual"
                ? "flex-1 rounded-lg bg-bg py-3 items-center"
                : "flex-1 rounded-lg py-3 items-center active:opacity-70"
            }
            onPress={() => setBillingCycle("annual")}
          >
            <Text
              className={
                billingCycle === "annual"
                  ? "font-body text-sm font-bold text-heading"
                  : "font-body text-sm font-bold text-meta"
              }
            >
              {t("Annual")}
            </Text>
            <Text className="font-body text-[10px] font-bold text-success">
              {t("Save 33%")}
            </Text>
          </Pressable>
        </View>

        {/* Price */}
        <View className="items-center gap-1">
          <View className="flex-row items-baseline">
            <Text className="font-display text-4xl font-extrabold text-heading">
              ${price.toFixed(2)}
            </Text>
            <Text className="font-body text-base text-meta ml-1">
              /{billingCycle === "monthly" ? t("mo") : t("yr")}
            </Text>
          </View>
          {monthlyEquiv && (
            <Text className="font-body text-xs text-meta">
              {t("Just ${{amount}}/month", { amount: monthlyEquiv })}
            </Text>
          )}
        </View>

        {/* Plan comparison */}
        <View className="flex-row gap-3">
          {/* Free */}
          <View className="flex-1 bg-bg-card rounded-xl p-4 gap-3 border border-border">
            <Text className="font-display text-sm font-bold text-meta">{t("Free")}</Text>
            {FEATURES_FREE.map((f) => (
              <View key={f} className="flex-row items-start gap-2">
                <Text className="font-body text-xs text-meta">✓</Text>
                <Text className="font-body text-xs text-body flex-1">{f}</Text>
              </View>
            ))}
          </View>

          {/* Pro */}
          <View className="flex-1 bg-bg-card rounded-xl p-4 gap-3 border-2 border-success">
            <View className="flex-row items-center gap-2">
              <Text className="font-display text-sm font-bold text-heading">{t("Pro")}</Text>
              <View className="bg-success/15 rounded-full px-2 py-0.5">
                <Text className="font-body text-[10px] font-bold text-success uppercase">{t("Best")}</Text>
              </View>
            </View>
            {FEATURES_PRO.map((f) => (
              <View key={f} className="flex-row items-start gap-2">
                <Text className="font-body text-xs text-success">✓</Text>
                <Text className="font-body text-xs text-body flex-1">{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment buttons */}
        <View className="gap-3 pt-2">
          <Pressable
            className={
              loading
                ? "bg-heading rounded-xl py-4 items-center opacity-50"
                : "bg-heading rounded-xl py-4 items-center active:opacity-80"
            }
            onPress={() => handleSubscribe("apple_pay")}
            disabled={loading}
          >
            <Text className="font-body text-base font-extrabold text-bg tracking-wide">
              {loading ? t("Processing...") : t(" Pay")}
            </Text>
          </Pressable>
          <Pressable
            className={
              loading
                ? "bg-btn-surface rounded-xl py-4 items-center border border-border opacity-50"
                : "bg-btn-surface rounded-xl py-4 items-center border border-border active:opacity-70"
            }
            onPress={() => handleSubscribe("stripe")}
            disabled={loading}
          >
            <Text className="font-body text-base font-bold text-heading">
              {t("Pay with Card")}
            </Text>
          </Pressable>
        </View>

        {/* Terms */}
        <Text className="font-body text-[10px] text-meta text-center leading-4">
          {t("Payment will be charged at confirmation. Subscription auto-renews unless")}{"\n"}
          {t("cancelled at least 24 hours before the end of the current period.")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
