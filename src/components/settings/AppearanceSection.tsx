import { useState, useCallback } from "react";
import { View, Text, Switch, Pressable, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { saveTheme } from "@/lib/theme-store";
import { setLanguage } from "@/lib/i18n";

export const AppearanceSection = () => {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === "dark");

  const handleThemeChange = useCallback((val: boolean) => {
    setIsDark(val);
    saveTheme(val ? "dark" : "light");
  }, []);

  return (
    <View className="gap-3">
      <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
        {t("Appearance")}
      </Text>
      <View className="bg-bg-card rounded-lg overflow-hidden">
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-1 gap-1">
            <Text className="font-body text-base font-bold text-heading">{t("Dark Mode")}</Text>
            <Text className="font-body text-sm text-body">
              {t("Optimized for low-light environments")}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleThemeChange}
            trackColor={{ false: "#d9e4ea", true: "#565e74" }}
            thumbColor="#ffffff"
          />
        </View>
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-1 gap-1">
            <Text className="font-body text-base font-bold text-heading">{t("Language")}</Text>
            <Text className="font-body text-sm text-body">
              {(
                { en: "English", es: "Español", fr: "Français", ru: "Русский" } as Record<
                  string,
                  string
                >
              )[i18n.language] ?? "English"}
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
  );
};
