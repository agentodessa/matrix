import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, useColorScheme, Alert } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { useProjects } from "@/lib/projects-store";
import { useTasks } from "@/lib/store";
import { useSubscription } from "@/lib/subscription-store";
import { canCreateProject, FREE_PROJECT_LIMIT } from "@/lib/features";
import { useTranslation } from "react-i18next";
import { useWorkspaceRole } from "@/lib/workspace-context";

export default function ProjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const { projects, addProject, removeProject } = useProjects();
  const { tasks } = useTasks();
  const { plan } = useSubscription();
  const role = useWorkspaceRole();
  const canManageProjects = role === "personal" || role === "owner" || role === "admin";
  const [newName, setNewName] = useState("");
  const atLimit = !canCreateProject(projects.length, plan);

  const taskCountFor = (project: string) =>
    tasks.filter((t) => t.project === project && t.status === "active").length;

  const trimmed = newName.trim();
  const isDuplicate =
    trimmed.length > 0 && projects.some((p) => p.toLowerCase() === trimmed.toLowerCase());

  const handleAdd = () => {
    if (!trimmed || isDuplicate) return;
    if (atLimit) {
      Alert.alert(
        t("Project Limit"),
        t("Free plan allows {{count}} projects. Upgrade to Pro for unlimited.", {
          count: FREE_PROJECT_LIMIT,
        }),
        [
          { text: t("Cancel"), style: "cancel" },
          { text: t("Upgrade"), onPress: () => router.push("/paywall") },
        ],
      );
      return;
    }
    addProject(trimmed);
    setNewName("");
  };

  const handleDelete = (name: string) => {
    const count = taskCountFor(name);
    const message =
      count > 0
        ? t(
            "\"{{name}}\" has {{count}} active task. Tasks won't be deleted, but they'll lose their project label.",
            { name, count },
          )
        : t('Delete "{{name}}"?', { name });

    Alert.alert(t("Remove Project"), message, [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Remove"), style: "destructive", onPress: () => removeProject(name) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Projects")} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Create ── */}
        {canManageProjects ? (
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
                {t("New Project")}
              </Text>
              {plan === "free" && (
                <Text className="font-body text-[10px] font-bold text-meta">
                  {projects.length}/{FREE_PROJECT_LIMIT}
                </Text>
              )}
            </View>
            {atLimit ? (
              <Pressable
                className="bg-bg-card rounded-xl p-4 gap-2 border border-border active:opacity-70"
                onPress={() => router.push("/paywall")}
              >
                <View className="flex-row items-center gap-2">
                  <Text style={{ fontSize: 16 }}>🔒</Text>
                  <Text className="font-body text-sm font-bold text-heading">
                    {t("Project limit reached")}
                  </Text>
                </View>
                <Text className="font-body text-xs text-meta leading-4">
                  {t("Free plan allows {{count}} projects. Upgrade to Pro for unlimited.", {
                    count: FREE_PROJECT_LIMIT,
                  })}
                </Text>
                <View className="bg-success/15 self-start rounded-full px-3 py-1 mt-1">
                  <Text className="font-body text-xs font-bold text-success">
                    {t("Upgrade to Pro")}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View className="gap-2">
                <View className="flex-row items-center gap-3">
                  <TextInput
                    className="flex-1 font-body text-lg font-bold text-heading border-b border-border pb-3"
                    placeholder={t("Project name...")}
                    placeholderTextColor={placeholderColor}
                    value={newName}
                    onChangeText={setNewName}
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                  />
                  <Pressable
                    className={
                      trimmed && !isDuplicate
                        ? "bg-success rounded-full px-5 py-2.5 active:opacity-80"
                        : "bg-btn-surface rounded-full px-5 py-2.5 opacity-50"
                    }
                    onPress={handleAdd}
                    disabled={!trimmed || isDuplicate}
                  >
                    <Text
                      className={
                        trimmed && !isDuplicate
                          ? "font-body text-sm font-bold text-bg"
                          : "font-body text-sm font-bold text-meta"
                      }
                    >
                      {t("Create")}
                    </Text>
                  </Pressable>
                </View>
                {isDuplicate && (
                  <Text className="font-body text-xs text-urgent">
                    {t('A project named "{{name}}" already exists', { name: trimmed })}
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View className="bg-bg-card rounded-lg py-6 items-center">
            <Text className="font-body text-sm text-meta">
              {t("Only admins can manage projects")}
            </Text>
          </View>
        )}

        {/* ── List ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            {t("Your Projects")}
          </Text>
          {projects.length === 0 ? (
            <View className="bg-bg-card rounded-lg py-10 items-center gap-2">
              <Text className="font-display text-base font-bold text-heading">
                {t("No projects yet")}
              </Text>
              <Text className="font-body text-sm text-meta">
                {t("Create your first project above.")}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {projects.map((project) => {
                const count = taskCountFor(project);
                return (
                  <View
                    key={project}
                    className="flex-row items-center justify-between bg-bg-card rounded-lg px-5 py-4"
                  >
                    <View className="flex-1 gap-0.5">
                      <Text className="font-display text-base font-bold text-heading">
                        {project}
                      </Text>
                      <Text className="font-body text-xs text-meta">
                        {t("{{count}} active task", { count })}
                      </Text>
                    </View>
                    {canManageProjects && (
                      <Pressable
                        className="rounded-full bg-btn-surface px-3 py-1.5 active:opacity-70"
                        onPress={() => handleDelete(project)}
                      >
                        <Text className="font-body text-xs font-semibold text-urgent">
                          {t("Remove")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
