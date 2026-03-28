import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { User } from "@/types/user";

const USER_CACHE_KEY = "@executive_cached_user";

let globalUser: User | null = null;
let initialized = false;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((l) => l());
};

async function persistUser(user: User | null) {
  try {
    if (user) {
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {}
}

async function restoreCachedUser(): Promise<User | null> {
  try {
    const json = await AsyncStorage.getItem(USER_CACHE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

const mapSupabaseUser = (supaUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): User => {
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
};

export const useAuth = () => {
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listenerRef.current = listener;
    listeners.add(listener);

    if (!initialized) {
      initialized = true;
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data.session?.user) {
            globalUser = mapSupabaseUser(data.session.user);
            persistUser(globalUser);
          }
          notify();
        })
        .catch(async () => {
          // Offline — restore cached user so app doesn't appear logged out
          const cached = await restoreCachedUser();
          if (cached) {
            globalUser = cached;
          }
          notify();
        });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        globalUser = mapSupabaseUser(session.user);
        persistUser(globalUser);
      } else {
        globalUser = null;
        persistUser(null);
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
        return {
          success: false,
          error: "An account with this email already exists. Please sign in instead.",
        };
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
};
