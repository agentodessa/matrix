import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Task, getQuadrant, QUADRANTS } from "@/types/task";
import { useQuadrantT } from "@/lib/use-quadrant-t";
import { useWorkspaceRole } from "@/lib/workspace-context";
import { useAuth } from "@/lib/auth-store";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const TaskItem = ({ task, onToggle, onDelete }: TaskItemProps) => {
  const { t } = useTranslation();
  const quadrantT = useQuadrantT();
  const role = useWorkspaceRole();
  const { user } = useAuth();
  const canDelete =
    role === "personal" || role === "owner" || role === "admin" || task.created_by === user?.id;
  const quadrant = getQuadrant(task);
  const info = QUADRANTS[quadrant];
  const qText = quadrantT(quadrant);
  const { classes } = info;
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
            {qText.priority}
          </Text>
        </View>
        {task.project ? <Text className="font-body text-xs text-meta">{task.project}</Text> : null}
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
        <View className="flex-row items-center gap-2">
          {canDelete && onDelete && (
            <Pressable
              onPress={() => onDelete(task.id)}
              className="rounded-full bg-btn-surface px-3 py-1.5"
            >
              <Text className="font-body text-xs font-semibold text-urgent">{t("Delete")}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onToggle(task.id)}
            className="rounded-full bg-btn-surface px-3 py-1.5"
          >
            <Text className="font-body text-xs font-semibold text-heading">
              {isCompleted ? t("Undo") : t("Done")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
