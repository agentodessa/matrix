import { Platform } from "react-native";
import { useTasks } from "../../src/lib/store";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { WebSidebar } from "../../src/components/WebSidebar";

export default function TabLayout() {
  const { getTasksByQuadrant } = useTasks();
  const urgentCount = getTasksByQuadrant(1).filter(
    (t) => t.status === "active"
  ).length;

  if (Platform.OS === "web") {
    return <WebSidebar urgentCount={urgentCount} />;
  }

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "scope", selected: "scope" }}
        />
        <NativeTabs.Trigger.Label>Focus</NativeTabs.Trigger.Label>
        {urgentCount > 0 && (
          <NativeTabs.Trigger.Badge>{String(urgentCount)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks">
        <NativeTabs.Trigger.Icon
          sf={{ default: "list.bullet", selected: "list.bullet" }}
        />
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="add">
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }}
          selectedColor="#006d4a"
        />
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Icon
          sf={{ default: "calendar", selected: "calendar" }}
        />
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="system">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
