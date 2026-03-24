import { View, Text, Switch, Pressable, ScrollView, useColorScheme } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../../src/components/Header";
import { saveTheme } from "../../src/lib/theme-store";
import { useAuth } from "../../src/lib/auth-store";
import { useSubscription } from "../../src/lib/subscription-store";

export default function SystemScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isAuthenticated } = useAuth();
  const { isPro } = useSubscription();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />
      <ScrollView
        contentContainerClassName="px-7 pt-8 pb-32 gap-8"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            Account
          </Text>
          <Pressable
            className="bg-bg-card rounded-lg overflow-hidden active:opacity-70"
            onPress={() => router.push("/profile")}
          >
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 gap-1">
                <Text className="font-body text-base font-bold text-heading">
                  {isAuthenticated ? user?.displayName : "Guest User"}
                </Text>
                <Text className="font-body text-sm text-body">
                  {isAuthenticated ? user?.email : "Tap to sign up or sign in"}
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
                      {isPro ? "Pro" : "Free"}
                    </Text>
                  </View>
                )}
                <Text className="text-meta text-base">→</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ── Subscription Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            Subscription
          </Text>
          <Pressable
            className="bg-bg-card rounded-lg overflow-hidden active:opacity-70"
            onPress={() => router.push("/paywall")}
          >
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 gap-1">
                <Text className="font-body text-base font-bold text-heading">
                  {isPro ? "Pro Plan" : "Upgrade to Pro"}
                </Text>
                <Text className="font-body text-sm text-body">
                  {isPro
                    ? "All features unlocked"
                    : "Calendar, cloud sync, and more — $4.99/mo"}
                </Text>
              </View>
              {!isPro && (
                <View className="bg-success/15 rounded-full px-2.5 py-1">
                  <Text className="font-body text-[10px] font-bold text-success">
                    PRO
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* ── Appearance Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            Appearance
          </Text>
          <View className="bg-bg-card rounded-lg overflow-hidden">
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 gap-1">
                <Text className="font-body text-base font-bold text-heading">
                  Dark Mode
                </Text>
                <Text className="font-body text-sm text-body">
                  Optimized for low-light environments
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => saveTheme(val ? "dark" : "light")}
                trackColor={{ false: "#d9e4ea", true: "#565e74" }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* ── Projects Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            Organization
          </Text>
          <Pressable
            className="bg-bg-card rounded-lg overflow-hidden active:opacity-70"
            onPress={() => router.push("/projects")}
          >
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 gap-1">
                <Text className="font-body text-base font-bold text-heading">
                  Projects
                </Text>
                <Text className="font-body text-sm text-body">
                  Create and manage your projects
                </Text>
              </View>
              <Text className="text-meta text-base">→</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Data Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            Data
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
                  <Text className="font-body text-base font-bold text-heading">
                    Cloud Sync
                  </Text>
                  <Text className="font-body text-sm text-body">
                    {isPro && isAuthenticated
                      ? "Connected"
                      : isPro
                      ? "Sign in to enable"
                      : "Pro feature"}
                  </Text>
                </View>
                {!isPro && (
                  <View className="bg-success/15 rounded-full px-2 py-0.5">
                    <Text className="font-body text-[10px] font-bold text-success">PRO</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <View className="h-px bg-border mx-5" />
            <View className="px-5 py-4 gap-1">
              <Text className="font-body text-base font-bold text-heading">
                Export Data
              </Text>
              <Text className="font-body text-sm text-body">
                Download your tasks as JSON
              </Text>
            </View>
          </View>
        </View>

        {/* ── About Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            About
          </Text>
          <View className="bg-bg-card rounded-lg p-6 gap-3">
            <Text className="font-display text-lg font-extrabold text-heading tracking-tight">
              The Executive
            </Text>
            <Text className="font-body text-sm text-body leading-6">
              Eisenhower Matrix task manager.{"\n"}
              Designed for focus, power, and clarity.
            </Text>
            <Text className="font-body text-[10px] font-bold text-meta tracking-[2px] uppercase pt-2">
              Built with Expo · NativeWind · Liquid Glass
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
