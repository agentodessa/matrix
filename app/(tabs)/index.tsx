import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../../src/components/Header";
import { TaskItem } from "../../src/components/TaskItem";
import { MetricTile } from "../../src/components/MetricTile";
import { DraggableMatrix } from "../../src/components/DraggableMatrix";
import { useTasks } from "../../src/lib/store";
import { useProjects } from "../../src/lib/projects-store";
import { usePullRefresh } from "../../src/lib/use-pull-refresh";
import { ViewModeToggle } from "../../src/components/ViewModeToggle";
import { QUADRANTS, Quadrant, Task } from "../../src/types/task";
import { useQuadrantT } from "../../src/lib/use-quadrant-t";

type ViewMode = "focus" | "matrix";

export default function FocusDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { tasks, getTasksByQuadrant, toggleTask, updateTask } = useTasks();
  const { projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("focus");
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handleDragStateChange = useCallback((dragging: boolean) => {
    setScrollEnabled(!dragging);
  }, []);

  const { refreshing, onRefresh } = usePullRefresh();

  const filterByProject = (list: Task[]) =>
    selectedProject ? list.filter((t) => t.project === selectedProject) : list;

  const filteredTasks = filterByProject(tasks);
  const q1Active = filterByProject(getTasksByQuadrant(1)).filter((t) => t.status === "active");
  const totalActive = filteredTasks.filter((t) => t.status === "active").length;
  const totalCompleted = filteredTasks.filter((t) => t.status === "completed").length;
  const completionRate =
    filteredTasks.length > 0 ? Math.round((totalCompleted / filteredTasks.length) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />
      <ScrollView
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#737686" />}
      >
        {/* ── View Mode Toggle ── */}
        <View className="px-7 pt-4">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </View>

        {/* ── Project Filter ── */}
        {projects.length > 0 && (
          <View className="px-7 pt-3">
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
                  {t("All")}
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

        {viewMode === "focus" ? (
          <FocusView
            q1Active={q1Active}
            totalActive={totalActive}
            totalCompleted={totalCompleted}
            completionRate={completionRate}
            filteredTasks={filteredTasks}
            filterByProject={filterByProject}
            getTasksByQuadrant={getTasksByQuadrant}
            toggleTask={toggleTask}
            router={router}
          />
        ) : (
          <DraggableMatrix
            filterByProject={filterByProject}
            getTasksByQuadrant={getTasksByQuadrant}
            toggleTask={toggleTask}
            updateTask={updateTask}
            onViewQuadrant={(q) => router.push(`/quadrant/${q}`)}
            onDragStateChange={handleDragStateChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Focus View (existing dashboard) ── */

const FocusView = ({
  q1Active,
  totalActive,
  totalCompleted,
  completionRate,
  filteredTasks,
  filterByProject,
  getTasksByQuadrant,
  toggleTask,
  router,
}: {
  q1Active: Task[];
  totalActive: number;
  totalCompleted: number;
  completionRate: number;
  filteredTasks: Task[];
  filterByProject: (list: Task[]) => Task[];
  getTasksByQuadrant: (q: Quadrant) => Task[];
  toggleTask: (id: string) => void;
  router: ReturnType<typeof useRouter>;
}) => {
  const { t } = useTranslation();
  const quadrantT = useQuadrantT();
  return (
    <>
      {/* ── Urgent Tasks First ── */}
      <View className="px-7 pt-6 pb-4">
        <View className="flex-row items-baseline justify-between pb-4">
          <Text className="font-display text-2xl font-extrabold text-heading tracking-tight">
            {t("Urgent Queue")}
          </Text>
          <Text className="font-body text-xs font-bold text-meta">
            {q1Active.length} {t("active")}
          </Text>
        </View>

        <View className="gap-3">
          {q1Active.length > 0 ? (
            q1Active.slice(0, 4).map((task) => (
              <TaskItem key={task.id} task={task} onToggle={toggleTask} />
            ))
          ) : (
            <View className="bg-bg-card rounded-lg py-10 items-center gap-2">
              <Text className="font-display text-base font-bold text-heading">
                {t("All clear")}
              </Text>
              <Text className="font-body text-sm text-meta">
                {t("No urgent tasks right now.")}
              </Text>
            </View>
          )}
        </View>

        {q1Active.length > 4 && (
          <Pressable
            className="mt-4 self-center active:opacity-70"
            onPress={() => router.push("/quadrant/1")}
          >
            <Text className="font-body text-sm font-bold text-slate">
              {t("View all {{count}} tasks →", { count: q1Active.length })}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Metrics ── */}
      <View className="px-7 py-4 gap-3">
        <View className="flex-row gap-3">
          <MetricTile
            label={t("Completion")}
            value={`${completionRate}%`}
            progress={completionRate}
          />
          <MetricTile
            label={t("Active")}
            value={`${totalActive}`}
            description={t("all quadrants")}
          />
        </View>
      </View>

      {/* ── Quadrant Overview ── */}
      <View className="px-7 py-4">
        <Text className="font-body text-xs font-bold text-label uppercase tracking-widest pb-4">
          {t("Quadrants")}
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {([1, 2, 3, 4] as Quadrant[]).map((q) => {
            const info = QUADRANTS[q];
            const count = filterByProject(getTasksByQuadrant(q)).filter(
              (t) => t.status === "active"
            ).length;
            return (
              <Pressable
                key={q}
                className="w-[47%] bg-bg-card rounded-lg p-4 gap-1 active:opacity-70"
                onPress={() => router.push(`/quadrant/${q}`)}
              >
                <View className={`w-2 h-2 rounded-full ${info.classes.dot}`} />
                <Text className="font-display text-base font-bold text-heading">
                  {quadrantT(q).title}
                </Text>
                <Text className="font-body text-xs text-meta">
                  {count} {t("active")}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Progress ── */}
      <View className="px-7 py-4">
        <View className="bg-bg-tile rounded-lg p-6 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-body text-xs font-bold text-label uppercase tracking-widest">
              {t("Progress")}
            </Text>
            <Text className="font-body text-sm font-bold text-slate">
              {totalCompleted}/{filteredTasks.length}
            </Text>
          </View>
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
    </>
  );
};

