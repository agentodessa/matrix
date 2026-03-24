import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Task, Quadrant, getQuadrant, TaskStatus } from "../types/task";
import { supabase } from "./supabase";
import { useProStatus } from "./use-pro-status";

const STORAGE_KEY = "@executive_tasks";

/* ── Local AsyncStorage helpers ── */

async function loadLocal(): Promise<Task[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

async function saveLocal(tasks: Task[]) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
}

/* ── Supabase helpers ── */

async function fetchRemoteTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRemoteTask);
}

function mapRemoteTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? undefined,
    urgency: r.urgency as Task["urgency"],
    importance: r.importance as Task["importance"],
    status: r.status as Task["status"],
    deadline: (r.deadline as string) ?? undefined,
    delegate: (r.delegate as string) ?? undefined,
    timeEstimate: (r.time_estimate as string) ?? undefined,
    project: (r.project as string) ?? undefined,
    created_at: r.created_at as string,
    completed_at: (r.completed_at as string) ?? undefined,
  };
}

function toRemoteRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    urgency: task.urgency,
    importance: task.importance,
    status: task.status,
    deadline: task.deadline ?? null,
    delegate: task.delegate ?? null,
    time_estimate: task.timeEstimate ?? null,
    project: task.project ?? null,
    created_at: task.created_at,
    completed_at: task.completed_at ?? null,
  };
}

/* ── Local-only store (free/guest) ── */

let localTasks: Task[] = [];
let localInit = false;
const localListeners = new Set<() => void>();
function notifyLocal() { localListeners.forEach((l) => l()); }

function useLocalTasks() {
  const [, update] = useState(0);
  const ref = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => update((n) => n + 1);
    ref.current = listener;
    localListeners.add(listener);
    if (!localInit) {
      localInit = true;
      loadLocal().then((t) => { localTasks = t; notifyLocal(); });
    }
    return () => { if (ref.current) localListeners.delete(ref.current); };
  }, []);

  return {
    tasks: localTasks,
    addTask: (task: Omit<Task, "id" | "created_at" | "status">) => {
      const newTask: Task = { ...task, id: Date.now().toString(), status: "active", created_at: new Date().toISOString() };
      localTasks = [newTask, ...localTasks];
      saveLocal(localTasks); notifyLocal();
    },
    toggleTask: (id: string) => {
      localTasks = localTasks.map((t) => t.id === id ? {
        ...t,
        status: (t.status === "active" ? "completed" : "active") as TaskStatus,
        completed_at: t.status === "active" ? new Date().toISOString() : undefined,
      } : t);
      saveLocal(localTasks); notifyLocal();
    },
    updateTask: (id: string, updates: Partial<Pick<Task, "urgency" | "importance" | "project">>) => {
      localTasks = localTasks.map((t) => t.id === id ? { ...t, ...updates } : t);
      saveLocal(localTasks); notifyLocal();
    },
    deleteTask: (id: string) => {
      localTasks = localTasks.filter((t) => t.id !== id);
      saveLocal(localTasks); notifyLocal();
    },
    reload: async () => { localTasks = await loadLocal(); notifyLocal(); },
  };
}

/* ── Cloud store (Pro users) ── */

function useCloudTasks(userId: string) {
  const qc = useQueryClient();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks", userId],
    queryFn: () => fetchRemoteTasks(userId),
    enabled: userId !== "__none__",
    staleTime: 1000 * 30,
  });

  const addMutation = useMutation({
    mutationFn: async (task: Omit<Task, "id" | "created_at" | "status">) => {
      const newTask: Task = { ...task, id: Date.now().toString(), status: "active", created_at: new Date().toISOString() };
      const { error } = await supabase.from("tasks").insert(toRemoteRow(newTask, userId));
      if (error) throw error;
      return newTask;
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: ["tasks", userId] });
      const prev = qc.getQueryData<Task[]>(["tasks", userId]);
      const optimistic: Task = { ...task, id: `temp-${Date.now()}`, status: "active", created_at: new Date().toISOString() };
      qc.setQueryData<Task[]>(["tasks", userId], (old = []) => [optimistic, ...old]);
      return { prev };
    },
    onError: (_e, _t, ctx) => { if (ctx?.prev) qc.setQueryData(["tasks", userId], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", userId] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const newStatus = task.status === "active" ? "completed" : "active";
      const { error } = await supabase.from("tasks")
        .update({ status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null })
        .eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks", userId] });
      const prev = qc.getQueryData<Task[]>(["tasks", userId]);
      qc.setQueryData<Task[]>(["tasks", userId], (old = []) =>
        old.map((t) => t.id === id ? {
          ...t, status: (t.status === "active" ? "completed" : "active") as TaskStatus,
          completed_at: t.status === "active" ? new Date().toISOString() : undefined,
        } : t));
      return { prev };
    },
    onError: (_e, _i, ctx) => { if (ctx?.prev) qc.setQueryData(["tasks", userId], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", userId] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<Task, "urgency" | "importance" | "project">> }) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ["tasks", userId] });
      const prev = qc.getQueryData<Task[]>(["tasks", userId]);
      qc.setQueryData<Task[]>(["tasks", userId], (old = []) => old.map((t) => t.id === id ? { ...t, ...updates } : t));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["tasks", userId], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", userId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks", userId] });
      const prev = qc.getQueryData<Task[]>(["tasks", userId]);
      qc.setQueryData<Task[]>(["tasks", userId], (old = []) => old.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (_e, _i, ctx) => { if (ctx?.prev) qc.setQueryData(["tasks", userId], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", userId] }),
  });

  return {
    tasks,
    addTask: (task: Omit<Task, "id" | "created_at" | "status">) => addMutation.mutate(task),
    toggleTask: (id: string) => toggleMutation.mutate(id),
    updateTask: (id: string, updates: Partial<Pick<Task, "urgency" | "importance" | "project">>) => updateMutation.mutate({ id, updates }),
    deleteTask: (id: string) => deleteMutation.mutate(id),
    reload: async () => { await qc.invalidateQueries({ queryKey: ["tasks", userId] }); },
  };
}

/* ── Unified hook ── */

export function useTasks() {
  const { userId, isPro } = useProStatus();
  const local = useLocalTasks();
  const cloud = useCloudTasks(isPro && userId ? userId : "__none__");
  const store = isPro && userId ? cloud : local;

  return {
    ...store,
    getTasksByQuadrant: (q: Quadrant) => store.tasks.filter((t) => getQuadrant(t) === q),
  };
}
