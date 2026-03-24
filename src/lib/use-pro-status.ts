import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/**
 * Shared Pro user status — cached globally to avoid repeated Supabase calls.
 * Returns the user ID if Pro + authenticated, null otherwise.
 */

let cachedUserId: string | null = null;
let cachedIsPro: boolean = false;
let resolved = false;
let resolvePromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

async function refresh() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      cachedUserId = null;
      cachedIsPro = false;
      resolved = true;
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
    notify();
  } catch {
    cachedUserId = null;
    cachedIsPro = false;
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

export function useProStatus(): { userId: string | null; isPro: boolean } {
  const [, update] = useState(0);

  useEffect(() => {
    const listener = () => update((n) => n + 1);
    listeners.add(listener);
    if (!resolved && resolvePromise) {
      resolvePromise.then(() => listener());
    }
    return () => { listeners.delete(listener); };
  }, []);

  return {
    userId: cachedUserId,
    isPro: cachedIsPro,
  };
}

/** Get pro user ID — for use outside React components */
export function getProUserIdSync(): string | null {
  return cachedIsPro ? cachedUserId : null;
}
