import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { Header } from "../../src/components/Header";
import { TaskItem } from "../../src/components/TaskItem";
import { ProGate } from "../../src/components/ProGate";
import { useTasks } from "../../src/lib/store";
import { useProjects } from "../../src/lib/projects-store";
import { Task } from "../../src/types/task";

type CalendarView = "month" | "year";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

/* ── Date helpers ── */

function getToday() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseTaskDate(task: Task): Date | null {
  // Try created_at (ISO string)
  if (task.created_at) {
    const d = new Date(task.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter((t) => {
    const taskDate = parseTaskDate(t);
    return taskDate && isSameDay(taskDate, date);
  });
}

function hasTasksOnDate(tasks: Task[], date: Date): boolean {
  return tasks.some((t) => {
    const taskDate = parseTaskDate(t);
    return taskDate && isSameDay(taskDate, date);
  });
}

/* ── Main Component ── */

export default function CalendarScreen() {
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

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.year);
    setCurrentMonth(today.month);
    setSelectedDate(new Date());
    setView("month");
  };

  const selectMonthFromYear = (month: number) => {
    setCurrentMonth(month);
    setView("month");
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />
      <ProGate feature="calendarFullView" featureLabel="Full Calendar View">

      {/* ── Project Filter ── */}
      {projects.length > 0 && (
        <View className="px-5 pt-3">
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

      {/* ── Navigation bar ── */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          {/* Title — tappable to toggle view */}
          <Pressable onPress={() => setView(view === "month" ? "year" : "month")} className="active:opacity-70">
            <Text className="font-display text-xl font-bold text-heading">
              {view === "month"
                ? `${MONTH_NAMES[currentMonth]} ${currentYear}`
                : `${currentYear}`}
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-2">
            {/* Today button */}
            <Pressable
              className="rounded-full bg-btn-surface border border-border px-3 py-1.5 active:opacity-70"
              onPress={goToToday}
            >
              <Text className="font-body text-xs font-bold text-heading">Today</Text>
            </Pressable>

            {/* Nav arrows */}
            {view === "month" ? (
              <View className="flex-row gap-1">
                <Pressable
                  className="w-8 h-8 items-center justify-center rounded-full bg-btn-surface active:opacity-70"
                  onPress={goToPrevMonth}
                >
                  <Text className="font-body text-sm text-heading">‹</Text>
                </Pressable>
                <Pressable
                  className="w-8 h-8 items-center justify-center rounded-full bg-btn-surface active:opacity-70"
                  onPress={goToNextMonth}
                >
                  <Text className="font-body text-sm text-heading">›</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row gap-1">
                <Pressable
                  className="w-8 h-8 items-center justify-center rounded-full bg-btn-surface active:opacity-70"
                  onPress={() => setCurrentYear(currentYear - 1)}
                >
                  <Text className="font-body text-sm text-heading">‹</Text>
                </Pressable>
                <Pressable
                  className="w-8 h-8 items-center justify-center rounded-full bg-btn-surface active:opacity-70"
                  onPress={() => setCurrentYear(currentYear + 1)}
                >
                  <Text className="font-body text-sm text-heading">›</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {view === "month" ? (
        <MonthView
          year={currentYear}
          month={currentMonth}
          today={today}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          tasks={filteredTasks}
          selectedTasks={selectedTasks}
          toggleTask={toggleTask}
        />
      ) : (
        <YearView
          year={currentYear}
          today={today}
          tasks={filteredTasks}
          onSelectMonth={selectMonthFromYear}
        />
      )}
      </ProGate>
    </SafeAreaView>
  );
}

/* ── Month View ── */

function MonthView({
  year,
  month,
  today,
  selectedDate,
  onSelectDate,
  tasks,
  selectedTasks,
  toggleTask,
}: {
  year: number;
  month: number;
  today: { year: number; month: number; date: number };
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  tasks: Task[];
  selectedTasks: Task[];
  toggleTask: (id: string) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cellSize = (SCREEN_WIDTH - 40) / 7;

  const days = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [firstDay, daysInMonth]);

  const isToday = (day: number) =>
    year === today.year && month === today.month && day === today.date;

  const isSelected = (day: number) =>
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === day;

  const activeTasks = selectedTasks.filter((t) => t.status === "active");
  const completedTasks = selectedTasks.filter((t) => t.status === "completed");

  const isSelectedToday =
    selectedDate.getFullYear() === today.year &&
    selectedDate.getMonth() === today.month &&
    selectedDate.getDate() === today.date;

  const selectedLabel = isSelectedToday
    ? "Today"
    : selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

  return (
    <ScrollView
      contentContainerClassName="pb-32"
      showsVerticalScrollIndicator={false}
    >
      {/* Weekday headers */}
      <View className="flex-row px-5">
        {WEEKDAY_HEADERS.map((d, i) => (
          <View key={i} style={{ width: cellSize }} className="items-center py-2">
            <Text className="font-body text-[11px] font-bold text-meta">
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap px-5">
        {days.map((day, i) => {
          if (day === null) {
            return <View key={`empty-${i}`} style={{ width: cellSize, height: cellSize }} />;
          }

          const date = new Date(year, month, day);
          const hasTasks = hasTasksOnDate(tasks, date);
          const todayFlag = isToday(day);
          const selectedFlag = isSelected(day);

          return (
            <Pressable
              key={day}
              style={{ width: cellSize, height: cellSize }}
              className="items-center justify-center active:opacity-70"
              onPress={() => onSelectDate(new Date(year, month, day))}
            >
              <View
                className={
                  selectedFlag
                    ? "w-10 h-10 rounded-full bg-heading items-center justify-center"
                    : todayFlag
                    ? "w-10 h-10 rounded-full border-2 border-heading items-center justify-center"
                    : "w-10 h-10 rounded-full items-center justify-center"
                }
              >
                <Text
                  className={
                    selectedFlag
                      ? "font-display text-base font-bold text-bg"
                      : todayFlag
                      ? "font-display text-base font-bold text-heading"
                      : "font-display text-base text-heading"
                  }
                >
                  {day}
                </Text>
              </View>
              {hasTasks && !selectedFlag && (
                <View className="w-1 h-1 rounded-full bg-urgent mt-0.5 absolute bottom-1" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected day tasks */}
      <View className="px-5 pt-5">
        <View className="border-t border-border pt-4">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase pb-3">
            {selectedLabel} · {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""}
          </Text>

          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <View className="items-center py-10 gap-2">
              <Text className="font-display text-base font-bold text-heading">
                No tasks
              </Text>
              <Text className="font-body text-sm text-meta">
                Nothing scheduled for this day.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {activeTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
              ))}
              {completedTasks.length > 0 && (
                <View className="gap-3 pt-3">
                  <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
                    Completed ({completedTasks.length})
                  </Text>
                  {completedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

/* ── Year View ── */

function YearView({
  year,
  today,
  tasks,
  onSelectMonth,
}: {
  year: number;
  today: { year: number; month: number; date: number };
  tasks: Task[];
  onSelectMonth: (month: number) => void;
}) {
  return (
    <ScrollView
      contentContainerClassName="px-3 pb-32 pt-2"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row flex-wrap">
        {Array.from({ length: 12 }, (_, month) => (
          <MiniMonth
            key={month}
            year={year}
            month={month}
            today={today}
            tasks={tasks}
            onPress={() => onSelectMonth(month)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

/* ── Mini Month (for Year View) ── */

function MiniMonth({
  year,
  month,
  today,
  tasks,
  onPress,
}: {
  year: number;
  month: number;
  today: { year: number; month: number; date: number };
  tasks: Task[];
  onPress: () => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const isCurrentMonth = year === today.year && month === today.month;
  const cellSize = ((SCREEN_WIDTH - 24) / 3 - 16) / 7;

  const days = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [firstDay, daysInMonth]);

  return (
    <Pressable
      style={{ width: (SCREEN_WIDTH - 24) / 3 }}
      className="p-2 active:opacity-70"
      onPress={onPress}
    >
      <View className="bg-bg-card rounded-xl p-3">
        {/* Month name */}
        <Text
          className={
            isCurrentMonth
              ? "font-display text-sm font-bold text-heading pb-2"
              : "font-display text-sm font-bold text-meta pb-2"
          }
        >
          {MONTH_NAMES_SHORT[month]}
        </Text>

        {/* Weekday headers */}
        <View className="flex-row">
          {WEEKDAY_HEADERS.map((d, i) => (
            <View key={i} style={{ width: cellSize }} className="items-center">
              <Text className="font-body text-[6px] text-meta">{d}</Text>
            </View>
          ))}
        </View>

        {/* Days grid */}
        <View className="flex-row flex-wrap">
          {days.map((day, i) => {
            if (day === null) {
              return <View key={`e-${i}`} style={{ width: cellSize, height: cellSize }} />;
            }

            const isToday =
              year === today.year && month === today.month && day === today.date;
            const date = new Date(year, month, day);
            const hasTasks = hasTasksOnDate(tasks, date);

            return (
              <View
                key={day}
                style={{ width: cellSize, height: cellSize }}
                className="items-center justify-center"
              >
                <Text
                  className={
                    isToday
                      ? "font-body text-[7px] font-bold text-heading"
                      : "font-body text-[7px] text-meta"
                  }
                >
                  {day}
                </Text>
                {hasTasks && (
                  <View
                    className="bg-urgent rounded-full absolute"
                    style={{ width: 2, height: 2, bottom: 0 }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}
