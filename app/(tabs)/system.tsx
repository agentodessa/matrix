import { View, Text, Switch, Pressable, ScrollView, useColorScheme } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../../src/components/Header";
import { saveTheme } from "../../src/lib/theme-store";
import { useAuth } from "../../src/lib/auth-store";
import { useSubscription } from "../../src/lib/subscription-store";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../src/lib/i18n";

export default function SystemScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, isAuthenticated } = useAuth();
  const { isPro } = useSubscription();
  const { t, i18n } = useTranslation();

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

        {/* ── Subscription Section ── */}
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
            {t("Appearance")}
          </Text>
          <View className="bg-bg-card rounded-lg overflow-hidden">
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 gap-1">
                <Text className="font-body text-base font-bold text-heading">
                  {t("Dark Mode")}
                </Text>
                <Text className="font-body text-sm text-body">
                  {t("Optimized for low-light environments")}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => saveTheme(val ? "dark" : "light")}
                trackColor={{ false: "#d9e4ea", true: "#565e74" }}
                thumbColor="#ffffff"
              />
            </View>
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 gap-1">
                <Text className="font-body text-base font-bold text-heading">
                  {t("Language")}
                </Text>
                <Text className="font-body text-sm text-body">
                  {({ en: "English", es: "Español", fr: "Français", ru: "Русский" } as Record<string, string>)[i18n.language] ?? "English"}
                </Text>
              </View>
              <View className="flex-row gap-2">
                {(["en", "es", "fr", "ru"] as const).map((lng) => (
                  <Pressable
                    key={lng}
                    className={
                      i18n.language === lng
                        ? "rounded-full bg-slate px-3 py-1.5"
                        : "rounded-full bg-btn-surface border border-border px-3 py-1.5 active:opacity-70"
                    }
                    onPress={() => setLanguage(lng)}
                  >
                    <Text
                      className={
                        i18n.language === lng
                          ? "font-body text-xs font-bold text-white"
                          : "font-body text-xs font-bold text-heading"
                      }
                    >
                      {lng.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── Projects Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            {t("Organization")}
          </Text>
          <Pressable
            className="bg-bg-card rounded-lg overflow-hidden active:opacity-70"
            onPress={() => router.push("/projects")}
          >
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 gap-1">
                <Text className="font-body text-base font-bold text-heading">
                  {t("Projects")}
                </Text>
                <Text className="font-body text-sm text-body">
                  {t("Create and manage your projects")}
                </Text>
              </View>
              <Text className="text-meta text-base">→</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Data Section ── */}
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
                  <Text className="font-body text-base font-bold text-heading">
                    {t("Cloud Sync")}
                  </Text>
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
                    <Text className="font-body text-[10px] font-bold text-success">PRO</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <View className="px-5 pt-5 pb-4 gap-1">
              <Text className="font-body text-base font-bold text-heading">
                {t("Export Data")}
              </Text>
              <Text className="font-body text-sm text-body">
                {t("Download your tasks as JSON")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── About Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            {t("About")}
          </Text>
          <View className="bg-bg-card rounded-lg px-5 py-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-base font-extrabold text-heading tracking-tight">
                {t("The Executive")}
              </Text>
              <Text className="font-body text-[10px] font-bold text-meta">
                v1.0.0
              </Text>
            </View>
            <Text className="font-body text-xs text-meta pt-1">
              {t("Eisenhower Matrix task manager for iOS and macOS")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
