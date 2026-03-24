import { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Keyboard, useColorScheme, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { Header } from "../../src/components/Header";
import { useTasks } from "../../src/lib/store";
import { useProjects } from "../../src/lib/projects-store";
import {
  Urgency,
  Importance,
  getQuadrant,
  QUADRANTS,
} from "../../src/types/task";

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return d;
}

function formatDate(date: Date) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

interface FormData {
  title: string;
  description: string;
  deadline: Date;
  urgency: Urgency;
  importance: Importance;
  project: string;
}

export default function AddTaskScreen() {
  const router = useRouter();
  const { addTask } = useTasks();
  const { projects } = useProjects();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const [showPicker, setShowPicker] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isValid },
  } = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      deadline: getTomorrow(),
      urgency: "urgent",
      importance: "high",
      project: "",
    },
    mode: "onChange",
  });

  const urgency = watch("urgency");
  const importance = watch("importance");

  const quadrant = getQuadrant({
    urgency,
    importance,
    id: "",
    title: "",
    status: "active",
    created_at: "",
  });
  const quadrantInfo = QUADRANTS[quadrant];
  const cls = quadrantInfo.classes;

  const onSubmit = useCallback(
    (data: FormData) => {
      Keyboard.dismiss();
      addTask({
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        deadline: formatDate(data.deadline),
        urgency: data.urgency,
        importance: data.importance,
        project: data.project || undefined,
      });
      reset();
      router.navigate("/(tabs)");
    },
    [addTask, reset, router]
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title="Create Task" />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Title ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Title
          </Text>
          <Controller
            control={control}
            name="title"
            rules={{ required: true, validate: (v) => v.trim().length > 0 }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder="What needs to be done?"
                placeholderTextColor={placeholderColor}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                returnKeyType="next"
              />
            )}
          />
        </View>

        {/* ── Description ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Details
          </Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-base text-body border-b border-border pb-3"
                placeholder="Context, links, notes..."
                placeholderTextColor={placeholderColor}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}
          />
        </View>

        {/* ── Deadline (Date Picker) ── */}
        <Controller
          control={control}
          name="deadline"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
                Deadline
              </Text>
              <Pressable
                className="border-b border-border pb-3 active:opacity-70"
                onPress={() => setShowPicker(true)}
              >
                <Text className="font-body text-base font-bold text-heading">
                  {formatDate(value)}
                </Text>
              </Pressable>

              {(showPicker || Platform.OS === "ios") && (
                <DateTimePicker
                  value={value}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "compact" : "default"}
                  minimumDate={new Date()}
                  onChange={(_, selected) => {
                    setShowPicker(false);
                    if (selected) onChange(selected);
                  }}
                  themeVariant={colorScheme === "dark" ? "dark" : "light"}
                />
              )}
            </View>
          )}
        />

        {/* ── Project ── */}
        <Controller
          control={control}
          name="project"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
                  Project
                </Text>
                <Pressable
                  className="active:opacity-70"
                  onPress={() => router.push("/projects")}
                >
                  <Text className="font-body text-xs font-bold text-slate">
                    Manage
                  </Text>
                </Pressable>
              </View>
              {projects.length === 0 ? (
                <Pressable
                  className="border border-dashed border-border rounded-lg py-4 items-center active:opacity-70"
                  onPress={() => router.push("/projects")}
                >
                  <Text className="font-body text-sm text-meta">
                    No projects yet — tap to create one
                  </Text>
                </Pressable>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2"
                >
                  {projects.map((p) => (
                    <Pressable
                      key={p}
                      className={
                        value === p
                          ? "rounded-full bg-slate px-4 py-2 active:opacity-70"
                          : "rounded-full bg-btn-surface border border-border px-4 py-2 active:opacity-70"
                      }
                      onPress={() => onChange(value === p ? "" : p)}
                    >
                      <Text
                        className={
                          value === p
                            ? "font-body text-sm font-bold text-white"
                            : "font-body text-sm font-bold text-heading"
                        }
                      >
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        />

        {/* ── Urgency + Importance ── */}
        <View className="flex-row gap-4">
          <Controller
            control={control}
            name="urgency"
            render={({ field: { onChange, value } }) => (
              <Pressable
                className={
                  value === "urgent"
                    ? "flex-1 bg-urgent-soft rounded-lg py-3 items-center active:opacity-70 border border-urgent"
                    : "flex-1 bg-btn-surface rounded-lg py-3 items-center active:opacity-70 border border-border"
                }
                onPress={() => onChange(value === "urgent" ? "routine" : "urgent")}
              >
                <Text
                  className={
                    value === "urgent"
                      ? "font-body text-[10px] font-bold text-urgent tracking-widest uppercase"
                      : "font-body text-[10px] font-bold text-meta tracking-widest uppercase"
                  }
                >
                  Urgency
                </Text>
                <Text
                  className={
                    value === "urgent"
                      ? "font-display text-lg font-extrabold text-urgent"
                      : "font-display text-lg font-extrabold text-heading"
                  }
                >
                  {value === "urgent" ? "Urgent" : "Routine"}
                </Text>
                <Text
                  className={
                    value === "urgent"
                      ? "font-body text-[10px] text-urgent/60 pt-1"
                      : "font-body text-[10px] text-meta pt-1"
                  }
                >
                  Tap to change
                </Text>
              </Pressable>
            )}
          />

          <Controller
            control={control}
            name="importance"
            render={({ field: { onChange, value } }) => (
              <Pressable
                className={
                  value === "high"
                    ? "flex-1 bg-slate rounded-lg py-3 items-center active:opacity-70"
                    : "flex-1 bg-btn-surface rounded-lg py-3 items-center active:opacity-70 border border-border"
                }
                onPress={() => onChange(value === "high" ? "casual" : "high")}
              >
                <Text
                  className={
                    value === "high"
                      ? "font-body text-[10px] font-bold text-white/60 tracking-widest uppercase"
                      : "font-body text-[10px] font-bold text-meta tracking-widest uppercase"
                  }
                >
                  Importance
                </Text>
                <Text
                  className={
                    value === "high"
                      ? "font-display text-lg font-extrabold text-white"
                      : "font-display text-lg font-extrabold text-heading"
                  }
                >
                  {value === "high" ? "High" : "Casual"}
                </Text>
                <Text
                  className={
                    value === "high"
                      ? "font-body text-[10px] text-white/40 pt-1"
                      : "font-body text-[10px] text-meta pt-1"
                  }
                >
                  Tap to change
                </Text>
              </Pressable>
            )}
          />
        </View>

        {/* ── Quadrant Preview ── */}
        <View className="flex-row items-center gap-3 px-1">
          <View className={`w-2.5 h-2.5 rounded-full ${cls.dot}`} />
          <Text className="font-body text-sm text-meta">
            → {quadrantInfo.title}
          </Text>
        </View>

        {/* ── Save ── */}
        <Pressable
          className={
            isValid
              ? "bg-success rounded-full py-4 items-center active:opacity-80"
              : "bg-btn-surface rounded-full py-4 items-center opacity-50"
          }
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
        >
          <Text
            className={
              isValid
                ? "font-body text-base font-extrabold text-bg tracking-wide"
                : "font-body text-base font-bold text-meta"
            }
          >
            + New Task
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
