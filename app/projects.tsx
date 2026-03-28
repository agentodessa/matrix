import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, useColorScheme, Alert } from "react-native";
import { SafeAreaView } from "../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../src/components/Header";
import { useProjects } from "../src/lib/projects-store";
import { useTasks } from "../src/lib/store";
import { useSubscription } from "../src/lib/subscription-store";
import { canCreateProject, FREE_PROJECT_LIMIT } from "../src/lib/features";

export default function ProjectsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const { projects, addProject, removeProject } = useProjects();
  const { tasks } = useTasks();
  const { plan } = useSubscription();
  const [newName, setNewName] = useState("");
  const atLimit = !canCreateProject(projects.length, plan);

  const taskCountFor = (project: string) =>
    tasks.filter((t) => t.project === project && t.status === "active").length;

  const trimmed = newName.trim();
  const isDuplicate = trimmed.length > 0 && projects.some(
    (p) => p.toLowerCase() === trimmed.toLowerCase()
  );

  const handleAdd = () => {
    if (!trimmed || isDuplicate) return;
    if (atLimit) {
      Alert.alert(
        "Project Limit",
        `Free plan allows up to ${FREE_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited projects.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/paywall") },
        ]
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
        ? `"${name}" has ${count} active task${count > 1 ? "s" : ""}. Tasks won't be deleted, but they'll lose their project label.`
        : `Delete "${name}"?`;

    Alert.alert("Remove Project", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeProject(name) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title="Projects" showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Create ── */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
              New Project
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
                  Project limit reached
                </Text>
              </View>
              <Text className="font-body text-xs text-meta leading-4">
                Free plan allows {FREE_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited.
              </Text>
              <View className="bg-success/15 self-start rounded-full px-3 py-1 mt-1">
                <Text className="font-body text-xs font-bold text-success">
                  Upgrade to Pro
                </Text>
              </View>
            </Pressable>
          ) : (
            <View className="gap-2">
              <View className="flex-row items-center gap-3">
                <TextInput
                  className="flex-1 font-body text-lg font-bold text-heading border-b border-border pb-3"
                  placeholder="Project name..."
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
                    Create
                  </Text>
                </Pressable>
              </View>
              {isDuplicate && (
                <Text className="font-body text-xs text-urgent">
                  A project named "{trimmed}" already exists
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ── List ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Your Projects
          </Text>
          {projects.length === 0 ? (
            <View className="bg-bg-card rounded-lg py-10 items-center gap-2">
              <Text className="font-display text-base font-bold text-heading">
                No projects yet
              </Text>
              <Text className="font-body text-sm text-meta">
                Create your first project above.
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
                        {count} active task{count !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Pressable
                      className="rounded-full bg-btn-surface px-3 py-1.5 active:opacity-70"
                      onPress={() => handleDelete(project)}
                    >
                      <Text className="font-body text-xs font-semibold text-urgent">
                        Remove
                      </Text>
                    </Pressable>
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
