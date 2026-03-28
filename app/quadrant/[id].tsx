import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "../../src/components/Header";
import { TaskItem } from "../../src/components/TaskItem";
import { useTasks } from "../../src/lib/store";
import { QUADRANTS, Quadrant } from "../../src/types/task";

export default function QuadrantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const quadrantId = parseInt(id, 10) as Quadrant;
  const quadrant = QUADRANTS[quadrantId];
  const { getTasksByQuadrant, toggleTask } = useTasks();
  const tasks = getTasksByQuadrant(quadrantId);
  const activeTasks = tasks.filter((t) => t.status === "active");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  if (!quadrant) return null;

  const cls = quadrant.classes;
  const titleWords = quadrant.title.split(" ");
  const firstWord = titleWords[0];
  const restWords = titleWords.slice(1).join(" ");
  const displayedTasks =
    activeTab === "active" ? activeTasks : completedTasks;
  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header showBack />
      <ScrollView
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Editorial Header ── */}
        <View className="px-7 pt-8 pb-10 gap-3">
          <View className="flex-row items-center gap-3">
            <View className={`w-2.5 h-2.5 rounded-full ${cls.dot}`} />
            <Text className="font-body text-[10px] font-bold text-label tracking-[3px] uppercase">
              {quadrant.label}
            </Text>
          </View>

          <Text className="font-display text-[42px] font-extrabold text-heading tracking-tighter leading-[44px]">
            {firstWord}
            {"\n"}
            <Text className={cls.badgeText}>
              {restWords || firstWord}
            </Text>
            .
          </Text>

          <Text className="font-body text-base text-body leading-7 pt-2 max-w-[520px]">
            {quadrant.description}
          </Text>

          {/* Stat Row */}
          <View className="flex-row gap-3 pt-3">
            <View className={`${cls.badgeBg} rounded-full px-3 py-1.5`}>
              <Text className={`font-body text-[10px] font-bold ${cls.badgeText}`}>
                {activeTasks.length} active
              </Text>
            </View>
            <View className="bg-btn-surface rounded-full px-3 py-1.5">
              <Text className="font-body text-[10px] font-bold text-meta">
                {completedTasks.length} done
              </Text>
            </View>
          </View>
        </View>

        {/* ── Filter Tabs ── */}
        <View className="px-7 pb-5">
          <View className="flex-row gap-2">
            <Pressable
              className={
                activeTab === "active"
                  ? "bg-slate rounded-full px-5 py-2.5 active:opacity-70"
                  : "bg-btn-surface rounded-full px-5 py-2.5 active:opacity-70"
              }
              onPress={() => setActiveTab("active")}
            >
              <Text
                className={
                  activeTab === "active"
                    ? "font-body text-xs font-bold text-white"
                    : "font-body text-xs font-bold text-label"
                }
              >
                Active ({activeTasks.length})
              </Text>
            </Pressable>
            <Pressable
              className={
                activeTab === "completed"
                  ? "bg-slate rounded-full px-5 py-2.5 active:opacity-70"
                  : "bg-btn-surface rounded-full px-5 py-2.5 active:opacity-70"
              }
              onPress={() => setActiveTab("completed")}
            >
              <Text
                className={
                  activeTab === "completed"
                    ? "font-body text-xs font-bold text-white"
                    : "font-body text-xs font-bold text-label"
                }
              >
                Completed ({completedTasks.length})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Task List ── */}
        <View className="px-7 gap-3">
          {activeTab === "active" && (
            <Pressable
              className="self-start bg-slate-btn rounded-lg px-4 py-2.5 active:opacity-70"
              onPress={() => router.push("/(tabs)/add")}
            >
              <Text className="font-body text-sm font-bold text-white">
                + New Task
              </Text>
            </Pressable>
          )}

          {displayedTasks.length === 0 ? (
            <View className="items-center py-12 gap-2">
              <Text className="font-display text-base font-bold text-heading">
                {activeTab === "active"
                  ? "No active tasks"
                  : "Nothing completed yet"}
              </Text>
              <Text className="font-body text-sm text-meta">
                {activeTab === "active"
                  ? "Everything's under control."
                  : "Time to check something off."}
              </Text>
            </View>
          ) : (
            displayedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleTask} />
            ))
          )}
        </View>

        {/* ── Velocity Insight Card ── */}
        <View className="px-7 pt-10 pb-6">
          <View className="bg-tile rounded-lg p-8 gap-4">
            <Text className="font-body text-xs font-bold text-label uppercase tracking-widest">
              Velocity Insight
            </Text>
            <View className="flex-row items-center gap-8">
              <View className="items-center">
                <Text className="font-display text-3xl font-extrabold text-heading">
                  42m
                </Text>
                <Text className="font-body text-[9px] font-bold text-meta tracking-[1.5px] uppercase">
                  Avg. Resolution
                </Text>
              </View>
              <View className="items-center">
                <Text className="font-display text-3xl font-extrabold text-heading">
                  {tasks.length}
                </Text>
                <Text className="font-body text-[9px] font-bold text-meta tracking-[1.5px] uppercase">
                  Total Tasks
                </Text>
              </View>
              <View className="items-center">
                <Text className="font-display text-3xl font-extrabold text-heading">
                  {completionRate}%
                </Text>
                <Text className="font-body text-[9px] font-bold text-meta tracking-[1.5px] uppercase">
                  Complete
                </Text>
              </View>
            </View>
            {/* Progress bar */}
            <View className="h-1.5 rounded-full bg-slate-track">
              <View
                className="h-1.5 rounded-full bg-slate"
                style={{
                  width: `${Math.min(100, Math.max(0, completionRate))}%`,
                }}
              />
            </View>
          </View>
        </View>

        {/* ── Focus Mode Card (Q1 only) ── */}
        {quadrantId === 1 && (
          <View className="px-7 pb-8">
            <View className="bg-dark rounded-lg p-8 gap-3">
              <Text className="font-body text-[10px] font-bold text-white/60 tracking-[2px] uppercase">
                Deep Work
              </Text>
              <Text className="font-display text-xl font-extrabold text-white leading-7">
                Focus Shroud
              </Text>
              <Text className="font-body text-sm text-white/80 leading-6">
                Eliminate distractions. Only the current urgent task remains
                visible.
              </Text>
              <Pressable className="self-start mt-2 bg-white/20 rounded-lg px-5 py-3 active:opacity-70">
                <Text className="font-body text-sm font-bold text-white">
                  Enter Focus Mode →
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
