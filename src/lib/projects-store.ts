import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@executive_projects";

let globalProjects: string[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function loadProjects(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) return JSON.parse(json);
    return [];
  } catch {
    return [];
  }
}

async function saveProjects(projects: string[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // silently fail
  }
}

export function useProjects() {
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listenerRef.current = listener;
    listeners.add(listener);

    if (!initialized) {
      initialized = true;
      loadProjects().then((loaded) => {
        globalProjects = loaded;
        notify();
      });
    }

    return () => {
      if (listenerRef.current) listeners.delete(listenerRef.current);
    };
  }, []);

  return {
    projects: globalProjects,

    addProject: (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || globalProjects.includes(trimmed)) return;
      globalProjects = [...globalProjects, trimmed];
      saveProjects(globalProjects);
      notify();
    },

    removeProject: (name: string) => {
      globalProjects = globalProjects.filter((p) => p !== name);
      saveProjects(globalProjects);
      notify();
    },
  };
}
