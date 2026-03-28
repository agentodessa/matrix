import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

export const AboutSection = () => {
  const { t } = useTranslation();

  return (
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
  );
};
