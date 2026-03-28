import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

export const OrganizationSection = () => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
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
  );
};
