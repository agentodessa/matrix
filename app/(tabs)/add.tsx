import { useCallback } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Keyboard } from "react-native";
import { SafeAreaView } from "../../src/lib/styled";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { useColorScheme } from "react-native";
import { Header } from "../../src/components/Header";
import { useTasks } from "../../src/lib/store";
import {
  Urgency,
  Importance,
  getQuadrant,
  QUADRANTS,
} from "../../src/types/task";

interface FormData {
  title: string;
  description: string;
  urgency: Urgency;
  importance: Importance;
}

export default function AddTaskScreen() {
  const router = useRouter();
  const { addTask } = useTasks();

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
      urgency: "urgent",
      importance: "high",
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
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const cls = quadrantInfo.classes;

  const onSubmit = useCallback(
    (data: FormData) => {
      Keyboard.dismiss();
      addTask({
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        urgency: data.urgency,
        importance: data.importance,
      });
      reset();
      router.navigate("/(tabs)");
    },
    [addTask, reset, router]
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header />
      <ScrollView
        contentContainerClassName="px-7 pt-8 pb-40 gap-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Editorial Heading ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-slate tracking-[3px] uppercase">
            New Objective
          </Text>
          <Text className="font-display text-[38px] font-extrabold text-heading tracking-tighter leading-[42px]">
            Define the{"\n"}
            <Text className="text-slate">Objective.</Text>
          </Text>
        </View>

        {/* ── Title Input ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Task Designation
          </Text>
          <Controller
            control={control}
            name="title"
            rules={{ required: true, validate: (v) => v.trim().length > 0 }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-lg font-bold text-heading border-b border-border pb-3"
                placeholder="What requires your attention?"
                placeholderTextColor={String(placeholderColor)}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                returnKeyType="next"
              />
            )}
          />
        </View>

        {/* ── Description Input ── */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Context & Details
          </Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="font-body text-base text-body border-b border-border pb-3 min-h-[80px]"
                placeholder="Expand on the nuances of this objective..."
                placeholderTextColor={String(placeholderColor)}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
        </View>

        {/* ── Urgency Selector ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Urgency
          </Text>
          <Controller
            control={control}
            name="urgency"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row gap-3">
                <Pressable
                  className={
                    value === "urgent"
                      ? "flex-1 bg-urgent rounded-full py-3 items-center active:opacity-70"
                      : "flex-1 bg-btn-surface rounded-full py-3 items-center active:opacity-70"
                  }
                  onPress={() => onChange("urgent")}
                >
                  <Text
                    className={
                      value === "urgent"
                        ? "font-body text-sm font-bold text-white"
                        : "font-body text-sm font-bold text-heading"
                    }
                  >
                    Urgent
                  </Text>
                </Pressable>
                <Pressable
                  className={
                    value === "routine"
                      ? "flex-1 bg-slate rounded-full py-3 items-center active:opacity-70"
                      : "flex-1 bg-btn-surface rounded-full py-3 items-center active:opacity-70"
                  }
                  onPress={() => onChange("routine")}
                >
                  <Text
                    className={
                      value === "routine"
                        ? "font-body text-sm font-bold text-white"
                        : "font-body text-sm font-bold text-heading"
                    }
                  >
                    Routine
                  </Text>
                </Pressable>
              </View>
            )}
          />
        </View>

        {/* ── Importance Selector ── */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase">
            Importance
          </Text>
          <Controller
            control={control}
            name="importance"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row gap-3">
                <Pressable
                  className={
                    value === "high"
                      ? "flex-1 bg-slate rounded-full py-3 items-center active:opacity-70"
                      : "flex-1 bg-btn-surface rounded-full py-3 items-center active:opacity-70"
                  }
                  onPress={() => onChange("high")}
                >
                  <Text
                    className={
                      value === "high"
                        ? "font-body text-sm font-bold text-white"
                        : "font-body text-sm font-bold text-heading"
                    }
                  >
                    High
                  </Text>
                </Pressable>
                <Pressable
                  className={
                    value === "casual"
                      ? "flex-1 bg-meta rounded-full py-3 items-center active:opacity-70"
                      : "flex-1 bg-btn-surface rounded-full py-3 items-center active:opacity-70"
                  }
                  onPress={() => onChange("casual")}
                >
                  <Text
                    className={
                      value === "casual"
                        ? "font-body text-sm font-bold text-white"
                        : "font-body text-sm font-bold text-heading"
                    }
                  >
                    Casual
                  </Text>
                </Pressable>
              </View>
            )}
          />
        </View>

        {/* ── Live Quadrant Preview ── */}
        <View className="bg-bg-card rounded-lg overflow-hidden">
          <View className={`h-1.5 ${cls.badgeBg}`} />
          <View className="px-5 py-4 flex-row items-center gap-4">
            <View className={`w-3 h-3 rounded-full ${cls.dot}`} />
            <View className="flex-1">
              <Text className="font-body text-[10px] font-bold text-meta tracking-[1.5px] uppercase">
                Maps to
              </Text>
              <Text className="font-display text-base font-extrabold text-heading">
                {quadrantInfo.label} · {quadrantInfo.title}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Save Button ── */}
        <Pressable
          className={
            isValid
              ? "bg-slate-btn rounded-lg py-4 items-center mt-4 active:opacity-70"
              : "bg-btn-surface rounded-lg py-4 items-center mt-4 opacity-50"
          }
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
        >
          <Text
            className={
              isValid
                ? "font-body text-base font-bold text-white"
                : "font-body text-base font-bold text-meta"
            }
          >
            Save Objective →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
