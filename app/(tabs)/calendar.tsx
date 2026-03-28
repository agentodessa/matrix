import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, ScrollView, Pressable, Platform, RefreshControl } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { Header } from "../../src/components/Header";
import { TaskItem } from "../../src/components/TaskItem";
import { ProGate } from "../../src/components/ProGate";
import { useTasks } from "../../src/lib/store";
import { useProjects } from "../../src/lib/projects-store";
import { usePullRefresh } from "../../src/lib/use-pull-refresh";
import { Task, getQuadrant } from "../../src/types/task";

type CalendarView = "month" | "year";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

const QUADRANT_COLORS: Record<number, string> = {
  1: "#ac0b18",
  2: "#0051d5",
  3: "#874200",
  4: "#737686",
};

/* ── Helpers ── */

function getToday() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() };
}
function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDayOfWeek(y: number, m: number) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function parseTaskDate(t: Task): Date | null {
  if (t.created_at) { const d = new Date(t.created_at); if (!isNaN(d.getTime())) return d; }
  return null;
}
function getTasksForDate(tasks: Task[], date: Date) {
  return tasks.filter((t) => { const d = parseTaskDate(t); return d && isSameDay(d, date); });
}
function hasTasksOnDate(tasks: Task[], date: Date) {
  return tasks.some((t) => { const d = parseTaskDate(t); return d && isSameDay(d, date); });
}

/* ── Main ── */

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { tasks, toggleTask } = useTasks();
  const { projects } = useProjects();
  const today = getToday();
  const [view, setView] = useState<CalendarView>("month");
  const [currentYear, setCurrentYear] = useState(today.year);
  const [currentMonth, setCurrentMonth] = useState(today.month);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const filteredTasks = useMemo(
    () => selectedProject ? tasks.filter((t) => t.project === selectedProject) : tasks,
    [tasks, selectedProject]
  );
  const selectedTasks = useMemo(
    () => getTasksForDate(filteredTasks, selectedDate),
    [filteredTasks, selectedDate]
  );

  const prev = () => {
    if (view === "year") { setCurrentYear(currentYear - 1); return; }
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const next = () => {
    if (view === "year") { setCurrentYear(currentYear + 1); return; }
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };
  const goToday = () => {
    setCurrentYear(today.year); setCurrentMonth(today.month);
    setSelectedDate(new Date()); setView("month");
  };

  const isWeb = Platform.OS === "web";
  const { refreshing, onRefresh } = usePullRefresh();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {!isWeb && <Header />}
      <ProGate feature="calendarFullView" featureLabel="Full Calendar View">

      {/* ── Toolbar ── */}
      <View className="px-5 pt-3 pb-2">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={prev} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" }} className="bg-btn-surface active:opacity-70">
            <Text className="text-heading text-xs">‹</Text>
          </Pressable>
          <Pressable onPress={() => setView(view === "month" ? "year" : "month")} className="active:opacity-70">
            <Text className="font-display text-base font-bold text-heading" style={{ minWidth: 150, textAlign: "center" }}>
              {view === "month" ? `${t(MONTH_NAMES[currentMonth])} ${currentYear}` : `${currentYear}`}
            </Text>
          </Pressable>
          <Pressable onPress={next} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" }} className="bg-btn-surface active:opacity-70">
            <Text className="text-heading text-xs">›</Text>
          </Pressable>
          <Pressable onPress={goToday} className="bg-btn-surface rounded-md px-2.5 py-1 active:opacity-70">
            <Text className="font-body text-[11px] font-bold text-heading">{t("Today")}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Project Filter ── */}
      {projects.length > 0 && (
        <View className="px-5 pb-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            <Pressable
              className={
                selectedProject === null
                  ? "rounded-full bg-slate px-4 py-1.5"
                  : "rounded-full bg-btn-surface px-4 py-1.5 active:opacity-70"
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
                    : "rounded-full bg-btn-surface px-4 py-1.5 active:opacity-70"
                }
                onPress={() => setSelectedProject(selectedProject === p ? null : p)}
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

      {view === "month" ? (
        <MonthView
          year={currentYear} month={currentMonth} today={today}
          selectedDate={selectedDate} onSelectDate={setSelectedDate}
          tasks={filteredTasks} selectedTasks={selectedTasks} toggleTask={toggleTask}
          refreshing={refreshing} onRefresh={onRefresh}
        />
      ) : (
        <YearView year={currentYear} today={today} tasks={filteredTasks}
          onSelectMonth={(m) => { setCurrentMonth(m); setView("month"); }}
        />
      )}

      </ProGate>
    </SafeAreaView>
  );
}

/* ── Month View with event bars ── */

function MonthView({
  year, month, today, selectedDate, onSelectDate, tasks, selectedTasks, toggleTask, refreshing, onRefresh,
}: {
  year: number; month: number;
  today: { year: number; month: number; date: number };
  selectedDate: Date; onSelectDate: (d: Date) => void;
  tasks: Task[]; selectedTasks: Task[]; toggleTask: (id: string) => void;
  refreshing: boolean; onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const isWeb = Platform.OS === "web";
  const MAX_EVENTS = isWeb ? 3 : 2;

  const days = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [firstDay, daysInMonth]);

  // Precompute tasks per day
  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayTasks = getTasksForDate(tasks, date);
      if (dayTasks.length > 0) map[d] = dayTasks;
    }
    return map;
  }, [tasks, year, month, daysInMonth]);

  const isToday = (d: number) => year === today.year && month === today.month && d === today.date;
  const isSelected = (d: number) =>
    selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === d;

  const activeTasks = selectedTasks.filter((t) => t.status === "active");
  const completedTasks = selectedTasks.filter((t) => t.status === "completed");
  const isSelectedToday =
    selectedDate.getFullYear() === today.year && selectedDate.getMonth() === today.month && selectedDate.getDate() === today.date;
  const selectedLabel = isSelectedToday ? t("Today") :
    selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#737686" />}
      >
        {/* Weekday headers */}
        <View style={{ flexDirection: "row", paddingHorizontal: 4 }}>
          {(isWeb ? WEEKDAYS : WEEKDAYS_SHORT).map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
              <Text className={i >= 5 ? "font-body text-[11px] font-bold text-meta/40" : "font-body text-[11px] font-bold text-meta"}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 4 }}>
          {days.map((day, i) => {
            if (day === null) {
              return <View key={`e-${i}`} style={{ width: "14.285%", minHeight: isWeb ? 80 : 52, borderTopWidth: 1, borderColor: "rgba(150,150,150,0.08)" }} />;
            }

            const todayFlag = isToday(day);
            const selectedFlag = isSelected(day);
            const dayTasks = tasksByDay[day] ?? [];
            const activeDayTasks = dayTasks.filter((t) => t.status === "active");
            const overflow = activeDayTasks.length > MAX_EVENTS ? activeDayTasks.length - MAX_EVENTS : 0;

            return (
              <Pressable
                key={day}
                style={{
                  width: "14.285%",
                  minHeight: isWeb ? 80 : 52,
                  borderTopWidth: 1,
                  borderColor: selectedFlag ? "rgba(100,160,255,0.4)" : "rgba(150,150,150,0.08)",
                  backgroundColor: selectedFlag ? "rgba(100,160,255,0.06)" : "transparent",
                  padding: 3,
                }}
                className="active:opacity-70"
                onPress={() => onSelectDate(new Date(year, month, day))}
              >
                {/* Day number */}
                <View style={{ alignItems: "flex-end", marginBottom: 2 }}>
                  <View
                    style={{
                      width: 22, height: 22, borderRadius: 11,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: todayFlag ? "#ac0b18" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11, fontWeight: todayFlag || selectedFlag ? "700" : "400",
                        color: todayFlag ? "#fff" : selectedFlag ? "#6fa8ff" : "#999",
                      }}
                    >
                      {day}
                    </Text>
                  </View>
                </View>

                {/* Event bars */}
                {activeDayTasks.slice(0, MAX_EVENTS).map((task) => {
                  const q = getQuadrant(task);
                  const color = QUADRANT_COLORS[q];
                  return (
                    <View
                      key={task.id}
                      style={{
                        backgroundColor: color + "25",
                        borderLeftWidth: 2,
                        borderLeftColor: color,
                        borderRadius: 2,
                        paddingHorizontal: 3,
                        paddingVertical: 1,
                        marginBottom: 1,
                      }}
                    >
                      <Text
                        style={{ fontSize: 9, color, fontWeight: "600" }}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                    </View>
                  );
                })}
                {overflow > 0 && (
                  <Text style={{ fontSize: 8, color: "#888", paddingLeft: 3 }}>
                    +{overflow} {t("more")}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── Selected day detail ── */}
        <View className="px-5 pt-6">
          <View className="bg-bg-tile rounded-lg p-5">
            <View className="flex-row items-center justify-between pb-3">
              <Text className="font-body text-xs font-bold text-heading">
                {selectedLabel}
              </Text>
              <Text className="font-body text-[10px] text-meta">
                {activeTasks.length} {activeTasks.length !== 1 ? t("tasks") : t("task")}
              </Text>
            </View>

            {activeTasks.length === 0 && completedTasks.length === 0 ? (
              <View className="items-center py-6 gap-1">
                <Text className="font-body text-sm text-meta">{t("No tasks for this day")}</Text>
              </View>
            ) : (
              <View className="gap-2">
                {activeTasks.map((task) => (
                  <CalendarTaskRow key={task.id} task={task} onToggle={toggleTask} />
                ))}
                {completedTasks.length > 0 && (
                  <View className="gap-2 pt-2">
                    <Text className="font-body text-[10px] font-bold text-meta tracking-[1px] uppercase">
                      {t("Done")} ({completedTasks.length})
                    </Text>
                    {completedTasks.map((task) => (
                      <CalendarTaskRow key={task.id} task={task} onToggle={toggleTask} />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Compact task row for calendar detail ── */

function CalendarTaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const q = getQuadrant(task);
  const color = QUADRANT_COLORS[q];
  const done = task.status === "completed";

  return (
    <Pressable
      style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: color + "0a",
        borderLeftWidth: 3, borderLeftColor: color,
        borderRadius: 8, padding: 10,
        opacity: done ? 0.5 : 1,
      }}
      className="active:opacity-70"
      onPress={() => onToggle(task.id)}
    >
      {/* Checkbox */}
      <View style={{
        width: 18, height: 18, borderRadius: 9,
        borderWidth: 2, borderColor: color,
        alignItems: "center", justifyContent: "center",
        backgroundColor: done ? color : "transparent",
      }}>
        {done && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>✓</Text>}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 13, fontWeight: "600", color: done ? "#888" : "#e5e2e1", textDecorationLine: done ? "line-through" : "none" }}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.deadline && (
          <Text style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{task.deadline}</Text>
        )}
      </View>

      {task.project && (
        <View style={{ backgroundColor: "rgba(150,150,150,0.15)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: "600", color: "#888" }}>{task.project}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ── Year View ── */

function YearView({
  year, today, tasks, onSelectMonth,
}: {
  year: number; today: { year: number; month: number; date: number };
  tasks: Task[]; onSelectMonth: (m: number) => void;
}) {
  return (
    <ScrollView contentContainerClassName="px-4 pb-32 pt-2" showsVerticalScrollIndicator={false}>
      <View className="flex-row flex-wrap">
        {Array.from({ length: 12 }, (_, m) => (
          <MiniMonth key={m} year={year} month={m} today={today} tasks={tasks} onPress={() => onSelectMonth(m)} />
        ))}
      </View>
    </ScrollView>
  );
}

function MiniMonth({
  year, month, today, tasks, onPress,
}: {
  year: number; month: number;
  today: { year: number; month: number; date: number };
  tasks: Task[]; onPress: () => void;
}) {
  const { t } = useTranslation();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const isCurrent = year === today.year && month === today.month;

  const days = useMemo(() => {
    const r: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) r.push(null);
    for (let d = 1; d <= daysInMonth; d++) r.push(d);
    return r;
  }, [firstDay, daysInMonth]);

  return (
    <Pressable style={{ width: "33.33%" }} className="p-2 active:opacity-70" onPress={onPress}>
      <View className="bg-bg-card rounded-xl p-3">
        <Text className={isCurrent ? "font-display text-sm font-bold text-heading pb-2" : "font-display text-sm font-bold text-meta pb-2"}>
          {t(MONTH_SHORT[month])}
        </Text>
        <View className="flex-row">
          {WEEKDAYS_SHORT.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Text className="font-body text-[7px] text-meta">{d}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {days.map((day, i) => {
            if (!day) return <View key={`e-${i}`} style={{ width: "14.285%", aspectRatio: 1 }} />;
            const isToday = year === today.year && month === today.month && day === today.date;
            const hasTasks = hasTasksOnDate(tasks, new Date(year, month, day));
            return (
              <View key={day} style={{ width: "14.285%", aspectRatio: 1, alignItems: "center", justifyContent: "center" }}>
                <View style={{
                  width: 14, height: 14, borderRadius: 7,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: isToday ? "#ac0b18" : "transparent",
                }}>
                  <Text style={{ fontSize: 7, fontWeight: isToday ? "700" : "400", color: isToday ? "#fff" : "#888" }}>
                    {day}
                  </Text>
                </View>
                {hasTasks && <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: "#ac0b18", position: "absolute", bottom: 0 }} />}
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}
