import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../../src/components/Header";
import { TaskItem } from "../../src/components/TaskItem";
import { useTasks } from "../../src/lib/store";
import { QUADRANTS, Quadrant } from "../../src/types/task";

type FilterKey = "all" | "1" | "2" | "3" | "4";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "1", label: "Q1" },
  { key: "2", label: "Q2" },
  { key: "3", label: "Q3" },
  { key: "4", label: "Q4" },
];

export default function TasksScreen() {
  const router = useRouter();
  const { tasks, getTasksByQuadrant, toggleTask } = useTasks();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filteredTasks =
    activeFilter === "all"
      ? tasks
      : getTasksByQuadrant(parseInt(activeFilter, 10) as Quadrant);

  const activeTasks = filteredTasks.filter((t) => t.status === "active");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />

      {/* ── Title Section ── */}
      <View className="px-7 pt-8 pb-4 flex-row items-end justify-between">
        <View className="gap-1">
          <Text className="font-body text-[10px] font-bold text-label tracking-[3px] uppercase">
            Eisenhower Matrix
          </Text>
          <Text className="font-display text-3xl font-extrabold text-heading tracking-tight">
            Tasks
          </Text>
        </View>
        <Pressable
          className="bg-slate-btn rounded-lg px-4 py-2.5 active:opacity-70"
          onPress={() => router.push("/(tabs)/add")}
        >
          <Text className="font-body text-sm font-bold text-white">
            + New Task
          </Text>
        </Pressable>
      </View>

      {/* ── Filter Tabs ── */}
      <View className="px-7 pb-4">
        <View className="flex-row gap-2">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            const count =
              filter.key === "all"
                ? tasks.filter((t) => t.status === "active").length
                : getTasksByQuadrant(
                    parseInt(filter.key, 10) as Quadrant
                  ).filter((t) => t.status === "active").length;

            return (
              <Pressable
                key={filter.key}
                className={
                  isActive
                    ? "bg-slate rounded-full px-4 py-2 active:opacity-70"
                    : "bg-btn-surface rounded-full px-4 py-2 active:opacity-70"
                }
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text
                  className={
                    isActive
                      ? "font-body text-xs font-bold text-white"
                      : "font-body text-xs font-bold text-label"
                  }
                >
                  {filter.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Task List ── */}
      <ScrollView
        contentContainerClassName="px-7 pt-2 pb-32 gap-3"
        showsVerticalScrollIndicator={false}
      >
        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <View className="items-center py-16 gap-3">
            <Text className="font-display text-lg font-bold text-heading">
              All clear
            </Text>
            <Text className="font-body text-sm text-meta text-center leading-5">
              No tasks in this quadrant.{"\n"}That's either impressive or
              suspicious.
            </Text>
          </View>
        )}

        {/* Active Section */}
        {activeTasks.length > 0 && (
          <View className="gap-3">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase pt-2">
              Active ({activeTasks.length})
            </Text>
            {activeTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </View>
        )}

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <View className="gap-3 pt-4">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
              Completed ({completedTasks.length})
            </Text>
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
