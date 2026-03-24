import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { User } from "../types/user";

let globalUser: User | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function mapSupabaseUser(supaUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    displayName:
      (supaUser.user_metadata?.full_name as string) ??
      (supaUser.user_metadata?.name as string) ??
      supaUser.email?.split("@")[0] ??
      "User",
    avatarUrl:
      (supaUser.user_metadata?.avatar_url as string) ??
      (supaUser.user_metadata?.picture as string) ??
      undefined,
    createdAt: new Date().toISOString(),
  };
}

export function useAuth() {
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listenerRef.current = listener;
    listeners.add(listener);

    if (!initialized) {
      initialized = true;
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          globalUser = mapSupabaseUser(data.session.user);
        }
        notify();
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        globalUser = mapSupabaseUser(session.user);
      } else {
        globalUser = null;
      }
      notify();
    });

    return () => {
      if (listenerRef.current) listeners.delete(listenerRef.current);
      subscription.unsubscribe();
    };
  }, []);

  return {
    user: globalUser,
    isAuthenticated: globalUser !== null,

    signUp: async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Supabase returns a user with empty identities if the email already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { success: false, error: "An account with this email already exists. Please sign in instead." };
      }

      if (data.user) {
        globalUser = mapSupabaseUser(data.user);
        notify();
      }

      return { success: true, error: null };
    },

    signIn: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        globalUser = mapSupabaseUser(data.user);
        notify();
      }

      return { success: true, error: null };
    },

    signOut: async () => {
      await supabase.auth.signOut();
      globalUser = null;
      notify();
    },

    updateProfile: async (updates: Partial<Pick<User, "displayName">>) => {
      if (!globalUser) return;

      const { error } = await supabase.auth.updateUser({
        data: { full_name: updates.displayName },
      });

      if (!error && updates.displayName) {
        globalUser = { ...globalUser, displayName: updates.displayName };
        notify();
      }
    },
  };
}
