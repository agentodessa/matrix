import { Text, Pressable, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/lib/workspace-context";

export const WorkspacePill = () => {
  const { t } = useTranslation();
  const { workspaceName, workspaces, setWorkspace, workspaceId } = useWorkspace();

  if (workspaces.length <= 1) return null;

  const handlePress = () => {
    const buttons = workspaces.map((ws) => ({
      text: ws.type === "personal" ? t("Personal") : ws.name,
      onPress: () => setWorkspace(ws.id),
      style: ws.id === workspaceId ? ("cancel" as const) : ("default" as const),
    }));
    buttons.push({ text: t("Cancel"), onPress: () => {}, style: "cancel" as const });
    Alert.alert(t("Switch Workspace"), undefined, buttons);
  };

  const displayName = workspaces.find((w) => w.id === workspaceId)?.type === "personal"
    ? t("Personal")
    : workspaceName;

  return (
    <Pressable
      className="bg-btn-surface rounded-full px-3 py-1.5 active:opacity-70 border border-border"
      onPress={handlePress}
    >
      <Text className="font-body text-[10px] font-bold text-heading" numberOfLines={1}>
        {displayName.length > 12 ? displayName.slice(0, 12) + "…" : displayName}
      </Text>
    </Pressable>
  );
};
