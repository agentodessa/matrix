import { View, Text, Pressable } from "react-native";
import { Task, getQuadrant, QUADRANTS } from "../types/task";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
}

export function TaskItem({ task, onToggle }: TaskItemProps) {
  const quadrant = getQuadrant(task);
  const info = QUADRANTS[quadrant];
  const classes = info.classes;
  const isCompleted = task.status === "completed";

  return (
    <View
      className={
        isCompleted
          ? `rounded-lg border-l-4 bg-card p-4 opacity-50 ${classes.border}`
          : `rounded-lg border-l-4 bg-card p-4 ${classes.border}`
      }
    >
      {/* Top row: badge + project */}
      <View className="flex-row items-center gap-2">
        <View className={`rounded-full px-2 py-0.5 ${classes.badgeBg}`}>
          <Text className={`font-body text-xs font-semibold ${classes.badgeText}`}>
            {info.priority}
          </Text>
        </View>
        {task.project ? (
          <Text className="font-body text-xs text-meta">{task.project}</Text>
        ) : null}
      </View>

      {/* Title */}
      <Text
        className={
          isCompleted
            ? "mt-2 font-display text-xl font-bold text-heading line-through"
            : "mt-2 font-display text-xl font-bold text-heading"
        }
      >
        {task.title}
      </Text>

      {/* Description */}
      {task.description ? (
        <Text className="mt-1 font-body text-sm text-body">{task.description}</Text>
      ) : null}

      {/* Bottom row: time estimate, deadline, action */}
      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {task.timeEstimate ? (
            <Text className="font-body text-xs text-meta">{task.timeEstimate}</Text>
          ) : null}
          {task.deadline ? (
            <Text className="font-body text-xs text-meta">{task.deadline}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onToggle(task.id)}
          className="rounded-full bg-btn-surface px-3 py-1.5"
        >
          <Text className="font-body text-xs font-semibold text-heading">
            {isCompleted ? "Undo" : "Done"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
