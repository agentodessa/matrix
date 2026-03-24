import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../src/components/Header";
import { useSubscription } from "../src/lib/subscription-store";
import { useAuth } from "../src/lib/auth-store";
import { BillingCycle, PRICING } from "../src/types/user";
import { PaymentMethod } from "../src/lib/mock-payment";

const FEATURES_FREE = [
  "Eisenhower Matrix",
  "Unlimited tasks",
  "Project organization",
  "Focus dashboard",
];

const FEATURES_PRO = [
  "Everything in Free",
  "Full calendar view",
  "Cloud sync across devices",
  "Priority support",
];

export default function PaywallScreen() {
  const router = useRouter();
  const { isPro, subscribe } = useSubscription();
  const { isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [loading, setLoading] = useState(false);

  const price = billingCycle === "monthly" ? PRICING.monthly : PRICING.annual;
  const monthlyEquiv = billingCycle === "annual" ? (PRICING.annual / 12).toFixed(2) : null;

  const handleSubscribe = async (method: PaymentMethod) => {
    if (!isAuthenticated) {
      Alert.alert(
        "Account Required",
        "Create an account first to subscribe to Pro.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => router.push("/auth/sign-up") },
        ]
      );
      return;
    }

    setLoading(true);
    const result = await subscribe(billingCycle, method);
    setLoading(false);

    if (result.success) {
      Alert.alert("Welcome to Pro! 🎉", "You now have access to all features.", [
        { text: "Let's go", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Payment Failed", result.error ?? "Please try again.");
    }
  };

  if (isPro) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <Header title="Pro Plan" showBack />
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text style={{ fontSize: 48 }}>✨</Text>
          <Text className="font-display text-2xl font-bold text-heading">
            You're on Pro!
          </Text>
          <Text className="font-body text-sm text-meta text-center leading-5">
            You have access to all features.{"\n"}Thank you for your support.
          </Text>
          <Pressable
            className="bg-btn-surface rounded-xl px-6 py-3 active:opacity-70 border border-border mt-4"
            onPress={() => router.back()}
          >
            <Text className="font-body text-sm font-bold text-heading">Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title="Upgrade" showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-4 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="items-center gap-2 pt-2">
          <Text className="font-display text-2xl font-bold text-heading">
            Unlock Pro
          </Text>
          <Text className="font-body text-sm text-meta text-center leading-5">
            Get the full experience with calendar view,{"\n"}cloud sync, and more.
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
              Monthly
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
              Annual
            </Text>
            <Text className="font-body text-[10px] font-bold text-success">
              Save 33%
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
              /{billingCycle === "monthly" ? "mo" : "yr"}
            </Text>
          </View>
          {monthlyEquiv && (
            <Text className="font-body text-xs text-meta">
              Just ${monthlyEquiv}/month
            </Text>
          )}
        </View>

        {/* Plan comparison */}
        <View className="flex-row gap-3">
          {/* Free */}
          <View className="flex-1 bg-bg-card rounded-xl p-4 gap-3 border border-border">
            <Text className="font-display text-sm font-bold text-meta">Free</Text>
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
              <Text className="font-display text-sm font-bold text-heading">Pro</Text>
              <View className="bg-success/15 rounded-full px-2 py-0.5">
                <Text className="font-body text-[10px] font-bold text-success">BEST</Text>
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
              {loading ? "Processing..." : " Pay"}
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
              Pay with Card
            </Text>
          </Pressable>
        </View>

        {/* Terms */}
        <Text className="font-body text-[10px] text-meta text-center leading-4">
          Payment will be charged at confirmation. Subscription auto-renews unless{"\n"}
          cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
