import { View, Text, Switch, useColorScheme } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { Header } from "../../src/components/Header";
import { saveTheme } from "../../src/lib/theme-store";

export default function SystemScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />
      <View className="px-7 pt-8 gap-8">
        {/* ── Title ── */}
        <View className="gap-1">
          <Text className="font-body text-[10px] font-bold text-label tracking-[3px] uppercase">
            Configuration
          </Text>
          <Text className="font-display text-3xl font-extrabold text-heading tracking-tight">
            System
          </Text>
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

        {/* ── Data Section ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            Data
          </Text>
          <View className="bg-bg-card rounded-lg overflow-hidden">
            <View className="px-5 py-4 gap-1">
              <Text className="font-body text-base font-bold text-heading">
                Cloud Sync
              </Text>
              <Text className="font-body text-sm text-body">
                Not connected
              </Text>
            </View>
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
      </View>
    </SafeAreaView>
  );
}
