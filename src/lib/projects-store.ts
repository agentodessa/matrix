import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { useProStatus } from "./use-pro-status";

const STORAGE_KEY = "@executive_projects";

/* ── Local helpers ── */

async function loadLocal(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

async function saveLocal(projects: string[]) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch {}
}

/* ── Supabase helpers ── */

async function fetchRemoteProjects(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("name")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.name as string);
}

/* ── Local-only store ── */

let localProjects: string[] = [];
let localInit = false;
const localListeners = new Set<() => void>();
const notifyLocal = () => { localListeners.forEach((l) => l()); };

const useLocalProjects = () => {
  const [, update] = useState(0);
  const ref = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => update((n) => n + 1);
    ref.current = listener;
    localListeners.add(listener);
    if (!localInit) {
      localInit = true;
      loadLocal().then((p) => { localProjects = p; notifyLocal(); });
    }
    return () => { if (ref.current) localListeners.delete(ref.current); };
  }, []);

  return {
    projects: localProjects,
    addProject: (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || localProjects.includes(trimmed)) return;
      localProjects = [...localProjects, trimmed];
      saveLocal(localProjects); notifyLocal();
    },
    removeProject: (name: string) => {
      localProjects = localProjects.filter((p) => p !== name);
      saveLocal(localProjects); notifyLocal();
    },
    reload: async () => { localProjects = await loadLocal(); notifyLocal(); },
  };
};

/* ── Cloud store ── */

const useCloudProjects = (userId: string) => {
  const qc = useQueryClient();

  const { data: projects = [] } = useQuery<string[]>({
    queryKey: ["projects", userId],
    queryFn: () => fetchRemoteProjects(userId),
    enabled: userId !== "__none__",
    staleTime: 1000 * 30,
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("projects").insert({ user_id: userId, name });
      if (error) throw error;
    },
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: ["projects", userId] });
      const prev = qc.getQueryData<string[]>(["projects", userId]);
      qc.setQueryData<string[]>(["projects", userId], (old = []) => [...old, name]);
      return { prev };
    },
    onError: (_e, _n, ctx) => { if (ctx?.prev) qc.setQueryData(["projects", userId], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects", userId] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("projects").delete().eq("user_id", userId).eq("name", name);
      if (error) throw error;
    },
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: ["projects", userId] });
      const prev = qc.getQueryData<string[]>(["projects", userId]);
      qc.setQueryData<string[]>(["projects", userId], (old = []) => old.filter((p) => p !== name));
      return { prev };
    },
    onError: (_e, _n, ctx) => { if (ctx?.prev) qc.setQueryData(["projects", userId], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects", userId] }),
  });

  return {
    projects,
    addProject: (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || projects.includes(trimmed)) return;
      addMutation.mutate(trimmed);
    },
    removeProject: (name: string) => removeMutation.mutate(name),
    reload: async () => { await qc.invalidateQueries({ queryKey: ["projects", userId] }); },
  };
};

/* ── Unified hook ── */

export const useProjects = () => {
  const { userId, isPro } = useProStatus();
  const local = useLocalProjects();
  const cloud = useCloudProjects(isPro && userId ? userId : "__none__");
  return isPro && userId ? cloud : local;
};
