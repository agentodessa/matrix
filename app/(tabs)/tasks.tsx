import { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../../src/components/Header";
import { TaskItem } from "../../src/components/TaskItem";
import { useTasks } from "../../src/lib/store";
import { useProjects } from "../../src/lib/projects-store";
import { usePullRefresh } from "../../src/lib/use-pull-refresh";
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
  const { projects } = useProjects();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { refreshing, onRefresh } = usePullRefresh();

  const projectFiltered = selectedProject
    ? tasks.filter((t) => t.project === selectedProject)
    : tasks;

  const filteredTasks =
    activeFilter === "all"
      ? projectFiltered
      : projectFiltered.filter(
          (t) =>
            getTasksByQuadrant(parseInt(activeFilter, 10) as Quadrant).some(
              (q) => q.id === t.id
            )
        );

  const activeTasks = filteredTasks.filter((t) => t.status === "active");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />

      {/* ── Title Section ── */}
      <View className="px-7 pt-8 pb-4 flex-row items-end justify-between">
        <View className="gap-1">
          <Text className="font-display text-3xl font-extrabold text-heading tracking-tight">
            Tasks
          </Text>
        </View>
        <Pressable
          className="bg-success rounded-full px-5 py-3 active:opacity-80"
          onPress={() => router.push("/(tabs)/add")}
        >
          <Text className="font-body text-sm font-extrabold text-bg tracking-wide">
            + New Task
          </Text>
        </Pressable>
      </View>

      {/* ── Project Filter ── */}
      {projects.length > 0 && (
        <View className="px-7 pb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            <Pressable
              className={
                selectedProject === null
                  ? "rounded-full bg-slate px-4 py-1.5"
                  : "rounded-full bg-btn-surface border border-border px-4 py-1.5 active:opacity-70"
              }
              onPress={() => setSelectedProject(null)}
            >
              <Text
                className={
                  selectedProject === null
                    ? "font-body text-xs font-bold text-white"
                    : "font-body text-xs font-bold text-heading"
                }
              >
                All
              </Text>
            </Pressable>
            {projects.map((p) => (
              <Pressable
                key={p}
                className={
                  selectedProject === p
                    ? "rounded-full bg-slate px-4 py-1.5"
                    : "rounded-full bg-btn-surface border border-border px-4 py-1.5 active:opacity-70"
                }
                onPress={() =>
                  setSelectedProject(selectedProject === p ? null : p)
                }
              >
                <Text
                  className={
                    selectedProject === p
                      ? "font-body text-xs font-bold text-white"
                      : "font-body text-xs font-bold text-heading"
                  }
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Filter Tabs ── */}
      <View className="px-7 pb-4">
        <View className="flex-row gap-2">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            const count =
              filter.key === "all"
                ? projectFiltered.filter((t) => t.status === "active").length
                : getTasksByQuadrant(
                    parseInt(filter.key, 10) as Quadrant
                  ).filter((t) => t.status === "active" && (!selectedProject || t.project === selectedProject)).length;

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#737686" />}
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
