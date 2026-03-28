import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { queryClient } from "./query-client";
import { useWorkspace } from "@/lib/workspace-context";
import type { RealtimeChannel } from "@supabase/supabase-js";

let channel: RealtimeChannel | null = null;
let teamChannel: RealtimeChannel | null = null;
let subscribedUserId: string | null = null;
let subscribedWorkspaceId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const invalidateAll = (workspaceId: string) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
  }, 500);
};

export const useRealtimeSync = () => {
  const didSetup = useRef(false);
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    if (didSetup.current) return;
    didSetup.current = true;

    let mounted = true;

    async function setup() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || !mounted) return;

      const userId = session.user.id;

      // Team realtime — available for all authenticated users (not Pro-gated)
      if (!teamChannel) {
        teamChannel = supabase
          .channel(`teams-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "team_members",
              filter: `user_id=eq.${userId}`,
            },
            () => {
              queryClient.invalidateQueries({ queryKey: ["teams"] });
              queryClient.invalidateQueries({ queryKey: ["team_members"] });
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "team_invites",
            },
            () => {
              queryClient.invalidateQueries({ queryKey: ["team_invites"] });
              queryClient.invalidateQueries({ queryKey: ["pending_invites"] });
            },
          )
          .subscribe();
      }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .single();

      if (!sub || sub.plan !== "pro" || sub.status !== "active") return;
      if (!mounted) return;
      if (!workspaceId) return;
      if (subscribedUserId === userId && subscribedWorkspaceId === workspaceId && channel) return;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      subscribedUserId = userId;
      subscribedWorkspaceId = workspaceId;

      channel = supabase
        .channel(`sync-${userId}-${workspaceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => invalidateAll(workspaceId),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "projects",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => invalidateAll(workspaceId),
        )
        .subscribe();
    }

    setup();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        didSetup.current = false;
        setup();
      } else if (event === "SIGNED_OUT") {
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
          subscribedUserId = null;
          subscribedWorkspaceId = null;
        }
        if (teamChannel) {
          supabase.removeChannel(teamChannel);
          teamChannel = null;
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  // Re-subscribe Pro channel when workspace changes
  useEffect(() => {
    if (!workspaceId) return;
    if (subscribedWorkspaceId === workspaceId) return;

    async function resubscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .single();

      if (!sub || sub.plan !== "pro" || sub.status !== "active") return;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      subscribedUserId = userId;
      subscribedWorkspaceId = workspaceId;

      channel = supabase
        .channel(`sync-${userId}-${workspaceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => invalidateAll(workspaceId),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "projects",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => invalidateAll(workspaceId),
        )
        .subscribe();
    }

    resubscribe();
  }, [workspaceId]);
};
