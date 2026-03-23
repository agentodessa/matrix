import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "../../src/components/Header";
import { TaskItem } from "../../src/components/TaskItem";
import { MetricTile } from "../../src/components/MetricTile";
import { useTasks } from "../../src/lib/store";
import { QUADRANTS, Quadrant } from "../../src/types/task";

export default function FocusDashboard() {
  const router = useRouter();
  const { tasks, getTasksByQuadrant, toggleTask } = useTasks();

  const q1Tasks = getTasksByQuadrant(1);
  const q1Active = q1Tasks.filter((t) => t.status === "active");
  const q1Completed = q1Tasks.filter((t) => t.status === "completed");
  const totalActive = tasks.filter((t) => t.status === "active").length;
  const totalCompleted = tasks.filter((t) => t.status === "completed").length;
  const completionRate =
    tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  const topQ1Tasks = q1Active.slice(0, 4);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />
      <ScrollView
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Section ── */}
        <View className="px-7 pt-10 pb-8 gap-3">
          <Text className="font-body text-[12px] font-bold text-label uppercase tracking-[1.1px]">
            Task Command Center
          </Text>
          <Text className="font-display text-5xl font-extrabold text-heading tracking-tighter">
            Do First.
          </Text>
          <Text className="font-body text-lg text-body leading-relaxed max-w-[520px]">
            High-precision focus on urgent and important objectives. Execute
            what matters most before the window closes.
          </Text>
        </View>

        {/* ── Active Urgency Stat Card ── */}
        <View className="px-7 pb-6">
          <View className="bg-bg-card rounded-lg border-l-4 border-slate px-6 py-5 flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="font-body text-xs font-bold text-label uppercase tracking-widest">
                Active Urgency
              </Text>
              <Text className="font-body text-sm text-body">
                Q1 tasks requiring immediate action
              </Text>
            </View>
            <Text className="font-display text-4xl font-extrabold text-heading">
              {q1Active.length}
            </Text>
          </View>
        </View>

        {/* ── Bento Grid ── */}
        <View className="px-7 pb-8 gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <MetricTile
                label="Critical Deadline"
                labelColor="text-urgent"
                value="01h 14m"
                description="Next due"
              />
            </View>
            <View className="flex-1">
              <MetricTile
                label="Execution Depth"
                value={`${completionRate}%`}
                progress={completionRate}
              />
            </View>
          </View>
          <MetricTile
            label="Impact Score"
            value="A+"
            description="Based on urgency-weighted completion velocity"
          />
        </View>

        {/* ── Urgent Queue ── */}
        <View className="px-7 pb-6">
          <Text className="font-body text-xs font-bold text-label uppercase tracking-widest pb-4">
            Urgent Queue
          </Text>
          <View className="gap-3">
            {topQ1Tasks.length > 0 ? (
              topQ1Tasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))
            ) : (
              <View className="items-center py-12 gap-2">
                <Text className="font-display text-base font-bold text-heading">
                  No urgent tasks
                </Text>
                <Text className="font-body text-sm text-meta">
                  Your Q1 queue is clear.
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
                View all {q1Active.length} tasks →
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Velocity Insight Card ── */}
        <View className="px-7 pb-6">
          <View className="bg-tile rounded-lg p-8 gap-4">
            <Text className="font-body text-xs font-bold text-label uppercase tracking-widest">
              Velocity Insight
            </Text>
            <Text className="font-display text-xl font-extrabold text-heading tracking-tight">
              Operational Momentum
            </Text>
            <Text className="font-body text-sm text-body leading-6">
              {totalCompleted} of {tasks.length} objectives resolved across all
              quadrants. Maintain forward pressure on Q1 items.
            </Text>
            {/* Progress bar */}
            <View className="h-1.5 rounded-full bg-slate-track">
              <View
                className="h-1.5 rounded-full bg-slate"
                style={{
                  width: `${Math.min(100, Math.max(0, completionRate))}%`,
                }}
              />
            </View>
            <Text className="font-body text-xs text-meta italic">
              "The key is not to prioritize what's on your schedule, but to
              schedule your priorities." — Stephen Covey
            </Text>
          </View>
        </View>

        {/* ── Focus Mode Card ── */}
        <View className="px-7 pb-8">
          <View className="bg-dark rounded-lg p-12 gap-4">
            <Text className="font-body text-[10px] font-bold text-white/60 tracking-[2px] uppercase">
              Deep Work
            </Text>
            <Text className="font-display text-2xl font-extrabold text-white tracking-tight">
              Focus Shroud
            </Text>
            <Text className="font-body text-sm text-white/70 leading-6">
              Eliminate distractions. Only the current urgent task remains
              visible. Enter a state of peak operational clarity.
            </Text>
            <Pressable className="self-start mt-2 bg-white/20 rounded-lg px-5 py-3 active:opacity-70">
              <Text className="font-body text-sm font-bold text-white">
                Enter Focus Mode →
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
