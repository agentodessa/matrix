import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * Shared Pro user status — cached globally to avoid repeated Supabase calls.
 * Persists to AsyncStorage so Pro status survives offline/restarts.
 */

const PRO_CACHE_KEY = "@executive_pro_status";

let cachedUserId: string | null = null;
let cachedIsPro: boolean = false;
let resolved = false;
let resolvePromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => { listeners.forEach((l) => l()); };

async function persistProStatus() {
  try {
    await AsyncStorage.setItem(
      PRO_CACHE_KEY,
      JSON.stringify({ userId: cachedUserId, isPro: cachedIsPro })
    );
  } catch {}
}

async function restoreProStatus(): Promise<boolean> {
  try {
    const json = await AsyncStorage.getItem(PRO_CACHE_KEY);
    if (!json) return false;
    const { userId, isPro } = JSON.parse(json);
    cachedUserId = userId;
    cachedIsPro = isPro;
    return true;
  } catch {
    return false;
  }
}

async function refresh() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      cachedUserId = null;
      cachedIsPro = false;
      resolved = true;
      await persistProStatus();
      notify();
      return;
    }

    cachedUserId = session.user.id;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", session.user.id)
      .single();

    cachedIsPro = sub?.plan === "pro" && sub?.status === "active";
    resolved = true;
    await persistProStatus();
    notify();
  } catch {
    // Network failure — restore last known status instead of wiping to free
    if (!resolved) {
      await restoreProStatus();
    }
    resolved = true;
    notify();
  }
}

// Initialize once
if (!resolvePromise) {
  resolvePromise = refresh();
}

// Listen for auth changes
supabase.auth.onAuthStateChange(() => {
  resolved = false;
  resolvePromise = refresh();
});

export const useProStatus = (): { userId: string | null; isPro: boolean } => {
  const [, update] = useState(0);
  const { workspaceType } = useWorkspace();

  useEffect(() => {
    const listener = () => update((n) => n + 1);
    listeners.add(listener);
    if (!resolved && resolvePromise) {
      resolvePromise.then(() => listener());
    }
    return () => { listeners.delete(listener); };
  }, []);

  // Team workspaces always have Pro features (owner pays for Pro Team)
  if (workspaceType === "team") {
    return { userId: cachedUserId, isPro: true };
  }

  return {
    userId: cachedUserId,
    isPro: cachedIsPro,
  };
};

/** Get pro user ID — for use outside React components */
export const getProUserIdSync = (): string | null => {
  return cachedIsPro ? cachedUserId : null;
};
