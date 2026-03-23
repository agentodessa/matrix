export type Urgency = "urgent" | "routine";
export type Importance = "high" | "casual";
export type TaskStatus = "active" | "completed";

export type Quadrant = 1 | 2 | 3 | 4;

export interface Task {
  id: string;
  title: string;
  description?: string;
  urgency: Urgency;
  importance: Importance;
  status: TaskStatus;
  deadline?: string;
  delegate?: string;
  timeEstimate?: string;
  project?: string;
  created_at: string;
  completed_at?: string;
}

export interface QuadrantClasses {
  border: string;
  badgeBg: string;
  badgeText: string;
  dot: string;
}

export interface QuadrantInfo {
  id: Quadrant;
  label: string;
  title: string;
  priority: string;
  description: string;
  classes: QuadrantClasses;
}

export const QUADRANTS: Record<Quadrant, QuadrantInfo> = {
  1: {
    id: 1,
    label: "Quadrant 01",
    title: "Do First",
    priority: "Immediate",
    description:
      "High-precision focus on urgent and important objectives. These items require immediate execution to maintain operational velocity.",
    classes: {
      border: "border-l-q-do",
      badgeBg: "bg-urgent-soft",
      badgeText: "text-urgent",
      dot: "bg-q-do",
    },
  },
  2: {
    id: 2,
    label: "Quadrant 02",
    title: "Schedule",
    priority: "High Priority",
    description:
      "Important but not urgent. Plan these tasks strategically to prevent them from becoming emergencies.",
    classes: {
      border: "border-l-slate",
      badgeBg: "bg-slate-soft",
      badgeText: "text-slate",
      dot: "bg-q-schedule",
    },
  },
  3: {
    id: 3,
    label: "Quadrant 03",
    title: "Delegate",
    priority: "Strategic",
    description:
      "Urgent but not important to you personally. Hand these off to the right people.",
    classes: {
      border: "border-l-strategic",
      badgeBg: "bg-strategic-soft",
      badgeText: "text-strategic",
      dot: "bg-q-delegate",
    },
  },
  4: {
    id: 4,
    label: "Quadrant 04",
    title: "Eliminate",
    priority: "Low Priority",
    description:
      "Neither urgent nor important. Remove these distractions from your workflow.",
    classes: {
      border: "border-l-meta",
      badgeBg: "bg-slate-soft",
      badgeText: "text-meta",
      dot: "bg-q-eliminate",
    },
  },
};

export function getQuadrant(task: Task): Quadrant {
  if (task.urgency === "urgent" && task.importance === "high") return 1;
  if (task.urgency === "routine" && task.importance === "high") return 2;
  if (task.urgency === "urgent" && task.importance === "casual") return 3;
  return 4;
}
