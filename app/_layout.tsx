import "@/lib/i18n";
import "../global.css";
import { ActivityIndicator, View, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useThemePersistence } from "@/lib/theme-store";
import { lightTheme, darkTheme } from "@/lib/theme";
import { QueryProvider } from "@/lib/query-client";
import { useRealtimeSync } from "@/lib/realtime-sync";

const AppContent = () => {
  const themeLoaded = useThemePersistence();
  const colorScheme = useColorScheme();
  useRealtimeSync();

  const themeVars = colorScheme === "dark" ? darkTheme : lightTheme;

  if (!themeLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[{ flex: 1 }, themeVars]}>
      <View className="flex-1 bg-bg" style={themeVars}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
            animation: "fade",
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
};

export default function RootLayout() {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
}
