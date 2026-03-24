import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Task, Quadrant, getQuadrant, TaskStatus } from "../types/task";

const STORAGE_KEY = "@executive_tasks";

const SEED_TASKS: Task[] = [
  {
    id: "1",
    title: "Finalize Q3 Board Presentation",
    description:
      "Review financial data from the marketing department and sync with the CFO before the 4PM call.",
    urgency: "urgent",
    importance: "high",
    status: "active",
    deadline: "2h",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Client Crisis Management: Project Atlas",
    description:
      "Deploy patch for the server downtime affecting premium users in the EMEA region.",
    urgency: "urgent",
    importance: "high",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Executive Committee Briefing",
    description:
      "Prepare the one-page summary on the new acquisition strategy for the board meeting tomorrow morning.",
    urgency: "urgent",
    importance: "high",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "4",
    title: "Draft Legal Compliance Memo",
    description: "",
    urgency: "urgent",
    importance: "high",
    status: "completed",
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "5",
    title: "Weekly Deep-Work Planning",
    description: "Block out focused time for strategic thinking.",
    urgency: "routine",
    importance: "high",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "6",
    title: "Architecture Review: Project X",
    description: "Review system architecture for scalability improvements.",
    urgency: "routine",
    importance: "high",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "7",
    title: "Social Media Asset Creation",
    description: "Design team deliverable for Q4 campaign.",
    urgency: "urgent",
    importance: "casual",
    status: "active",
    delegate: "Design Team",
    created_at: new Date().toISOString(),
  },
  {
    id: "8",
    title: "Invoice Processing",
    description: "Monthly invoice batch processing.",
    urgency: "urgent",
    importance: "casual",
    status: "active",
    delegate: "Accounts Dept",
    created_at: new Date().toISOString(),
  },
  {
    id: "9",
    title: "Check redundant news feeds",
    description: "Distraction identified",
    urgency: "routine",
    importance: "casual",
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "10",
    title: "Review 2021 Email Archives",
    description: "Low impact activity",
    urgency: "routine",
    importance: "casual",
    status: "active",
    created_at: new Date().toISOString(),
  },
];

async function loadTasks(): Promise<Task[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) return JSON.parse(json);
    // First launch — seed with sample data
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TASKS));
    return SEED_TASKS;
  } catch {
    return SEED_TASKS;
  }
}

async function saveTasks(tasks: Task[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // silently fail
  }
}

let globalTasks: Task[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function useTasks() {
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listenerRef.current = listener;
    listeners.add(listener);

    if (!initialized) {
      initialized = true;
      loadTasks().then((loaded) => {
        globalTasks = loaded;
        notify();
      });
    }

    return () => {
      if (listenerRef.current) listeners.delete(listenerRef.current);
    };
  }, []);

  return {
    tasks: globalTasks,

    getTasksByQuadrant: (q: Quadrant) =>
      globalTasks.filter((t) => getQuadrant(t) === q),

    addTask: (task: Omit<Task, "id" | "created_at" | "status">) => {
      const newTask: Task = {
        ...task,
        id: Date.now().toString(),
        status: "active",
        created_at: new Date().toISOString(),
      };
      globalTasks = [newTask, ...globalTasks];
      saveTasks(globalTasks);
      notify();
    },

    toggleTask: (id: string) => {
      globalTasks = globalTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: (t.status === "active" ? "completed" : "active") as TaskStatus,
              completed_at: t.status === "active" ? new Date().toISOString() : undefined,
            }
          : t
      );
      saveTasks(globalTasks);
      notify();
    },

    updateTask: (id: string, updates: Partial<Pick<Task, "urgency" | "importance" | "project">>) => {
      globalTasks = globalTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      );
      saveTasks(globalTasks);
      notify();
    },

    deleteTask: (id: string) => {
      globalTasks = globalTasks.filter((t) => t.id !== id);
      saveTasks(globalTasks);
      notify();
    },
  };
}
