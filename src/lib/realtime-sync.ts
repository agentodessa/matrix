import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { queryClient } from "./query-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

let channel: RealtimeChannel | null = null;
let subscribedUserId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function invalidateAll(userId: string) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
    queryClient.invalidateQueries({ queryKey: ["projects", userId] });
  }, 500);
}

export function useRealtimeSync() {
  const didSetup = useRef(false);

  useEffect(() => {
    if (didSetup.current) return;
    didSetup.current = true;

    let mounted = true;

    async function setup() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) return;

      const userId = session.user.id;

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .single();

      if (!sub || sub.plan !== "pro" || sub.status !== "active") return;
      if (!mounted) return;
      if (subscribedUserId === userId && channel) return;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      subscribedUserId = userId;

      channel = supabase
        .channel(`sync-${userId}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "tasks",
          filter: `user_id=eq.${userId}`,
        }, () => invalidateAll(userId))
        .on("postgres_changes", {
          event: "*", schema: "public", table: "projects",
          filter: `user_id=eq.${userId}`,
        }, () => invalidateAll(userId))
        .subscribe();
    }

    setup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        didSetup.current = false;
        setup();
      } else if (event === "SIGNED_OUT") {
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
          subscribedUserId = null;
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);
}
