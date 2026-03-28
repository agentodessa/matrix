import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useTasks } from "@/lib/store";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { WebSidebar } from "@/components/WebSidebar";

export default function TabLayout() {
  const { t } = useTranslation();
  const { getTasksByQuadrant } = useTasks();
  const urgentCount = getTasksByQuadrant(1).filter((task) => task.status === "active").length;

  if (Platform.OS === "web") {
    return <WebSidebar urgentCount={urgentCount} />;
  }

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "scope", selected: "scope" }} />
        <NativeTabs.Trigger.Label>{t("Focus")}</NativeTabs.Trigger.Label>
        {urgentCount > 0 && (
          <NativeTabs.Trigger.Badge>{String(urgentCount)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <NativeTabs.Trigger.Label>{t("Tasks")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="add">
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }}
          selectedColor="#006d4a"
        />
        <NativeTabs.Trigger.Label>{t("Add")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Icon sf={{ default: "calendar", selected: "calendar" }} />
        <NativeTabs.Trigger.Label>{t("Calendar")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="system">
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <NativeTabs.Trigger.Label>{t("Settings")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
