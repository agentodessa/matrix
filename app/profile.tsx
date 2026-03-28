import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useTasks } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { useSubscription } from "@/lib/subscription-store";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tasks } = useTasks();
  const { user, isAuthenticated, signOut } = useAuth();
  const { plan, isPro } = useSubscription();

  const totalCompleted = tasks.filter((t) => t.status === "completed").length;
  const totalActive = tasks.filter((t) => t.status === "active").length;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Profile")} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-8 pb-40 gap-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Info */}
        <View className="items-center gap-4">
          {isAuthenticated ? (
            <>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} className="w-24 h-24 rounded-full" />
              ) : (
                <View className="w-24 h-24 rounded-full bg-success/15 items-center justify-center">
                  <Text style={{ fontSize: 40 }}>
                    {user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                  </Text>
                </View>
              )}
              <View className="items-center gap-1">
                <Text className="font-display text-xl font-extrabold text-heading">
                  {user?.displayName}
                </Text>
                <Text className="font-body text-sm text-meta">{user?.email}</Text>
                <View
                  className={
                    isPro
                      ? "bg-success/15 rounded-full px-3 py-1 mt-1"
                      : "bg-btn-surface rounded-full px-3 py-1 mt-1 border border-border"
                  }
                >
                  <Text
                    className={
                      isPro
                        ? "font-body text-xs font-bold text-success"
                        : "font-body text-xs font-bold text-meta"
                    }
                  >
                    {isPro ? t("Pro Plan") : t("Free Plan")}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View className="w-24 h-24 rounded-full bg-slate/10 items-center justify-center border-2 border-dashed border-border">
                <Text style={{ fontSize: 40 }}>👤</Text>
              </View>
              <View className="items-center gap-1">
                <Text className="font-display text-xl font-extrabold text-heading">
                  {t("Guest User")}
                </Text>
                <Text className="font-body text-sm text-meta">
                  {t("Sign up to sync your data across devices")}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-bg-card rounded-xl p-4 items-center gap-1">
            <Text className="font-display text-2xl font-extrabold text-heading">{totalActive}</Text>
            <Text className="font-body text-[10px] font-bold text-meta tracking-widest uppercase">
              {t("Active")}
            </Text>
          </View>
          <View className="flex-1 bg-bg-card rounded-xl p-4 items-center gap-1">
            <Text className="font-display text-2xl font-extrabold text-heading">
              {totalCompleted}
            </Text>
            <Text className="font-body text-[10px] font-bold text-meta tracking-widest uppercase">
              {t("Completed")}
            </Text>
          </View>
          <View className="flex-1 bg-bg-card rounded-xl p-4 items-center gap-1">
            <Text className="font-display text-2xl font-extrabold text-heading">
              {tasks.length}
            </Text>
            <Text className="font-body text-[10px] font-bold text-meta tracking-widest uppercase">
              {t("Total")}
            </Text>
          </View>
        </View>

        {/* Auth actions or subscription */}
        {isAuthenticated ? (
          <View className="gap-3">
            {!isPro && (
              <Pressable
                className="bg-success rounded-xl py-4 items-center active:opacity-80"
                onPress={() => router.push("/paywall")}
              >
                <Text className="font-body text-base font-extrabold text-bg tracking-wide">
                  {t("Upgrade to Pro — $4.99/mo")}
                </Text>
              </Pressable>
            )}
            {isPro && (
              <View className="bg-bg-card rounded-xl p-5 gap-2">
                <Text className="font-body text-sm font-bold text-heading">
                  {t("Subscription")}
                </Text>
                <Text className="font-body text-sm text-body leading-5">
                  {t("You're on the Pro plan. All features are unlocked.")}
                </Text>
              </View>
            )}
            <Pressable
              className="bg-btn-surface rounded-xl py-4 items-center active:opacity-70 border border-border"
              onPress={async () => {
                await signOut();
                router.back();
              }}
            >
              <Text className="font-body text-base font-bold text-urgent">{t("Sign Out")}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            <GoogleSignInButton />
            <Pressable
              className="bg-success rounded-xl py-4 items-center active:opacity-80"
              onPress={() => router.push("/auth/sign-up")}
            >
              <Text className="font-body text-base font-extrabold text-bg tracking-wide">
                {t("Create Account")}
              </Text>
            </Pressable>
            <Pressable
              className="bg-btn-surface rounded-xl py-4 items-center active:opacity-70 border border-border"
              onPress={() => router.push("/auth/sign-in")}
            >
              <Text className="font-body text-base font-bold text-heading">{t("Sign In")}</Text>
            </Pressable>
          </View>
        )}

        {/* Info */}
        {!isAuthenticated && (
          <View className="bg-bg-card rounded-xl p-5 gap-2">
            <Text className="font-body text-sm font-bold text-heading">
              {t("Why create an account?")}
            </Text>
            <View className="gap-1.5">
              <Text className="font-body text-sm text-body leading-5">
                • {t("Sync tasks across all your devices")}
              </Text>
              <Text className="font-body text-sm text-body leading-5">
                • {t("Back up your data to the cloud")}
              </Text>
              <Text className="font-body text-sm text-body leading-5">
                • {t("Unlock Pro features like full calendar")}
              </Text>
            </View>
          </View>
        )}

        <Text className="font-body text-xs text-meta text-center leading-4">
          {t("Your tasks are stored locally on this device.")}
          {isAuthenticated && isPro ? "\n" + t("Pro users get cloud sync.") : ""}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
