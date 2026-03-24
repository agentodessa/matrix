import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types/user";

const AUTH_KEY = "@executive_auth";
const CREDENTIALS_KEY = "@executive_credentials";

interface StoredCredential {
  email: string;
  passwordHash: string;
  userId: string;
}

// Simple hash for mock — NOT secure, replace with real auth
function mockHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

let globalUser: User | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function loadAuth(): Promise<User | null> {
  try {
    const json = await AsyncStorage.getItem(AUTH_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

async function saveAuth(user: User | null) {
  try {
    if (user) {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(AUTH_KEY);
    }
  } catch {}
}

async function loadCredentials(): Promise<StoredCredential[]> {
  try {
    const json = await AsyncStorage.getItem(CREDENTIALS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

async function saveCredentials(creds: StoredCredential[]) {
  try {
    await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch {}
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
      loadAuth().then((loaded) => {
        globalUser = loaded;
        notify();
      });
    }

    return () => {
      if (listenerRef.current) listeners.delete(listenerRef.current);
    };
  }, []);

  return {
    user: globalUser,
    isAuthenticated: globalUser !== null,

    signUp: async (email: string, password: string, displayName: string) => {
      const creds = await loadCredentials();
      if (creds.some((c) => c.email === email.toLowerCase())) {
        return { success: false, error: "Email already registered" };
      }

      const user: User = {
        id: Date.now().toString(),
        email: email.toLowerCase(),
        displayName,
        createdAt: new Date().toISOString(),
      };

      creds.push({
        email: email.toLowerCase(),
        passwordHash: mockHash(password),
        userId: user.id,
      });

      await saveCredentials(creds);
      globalUser = user;
      await saveAuth(user);
      notify();
      return { success: true, error: null };
    },

    signIn: async (email: string, password: string) => {
      const creds = await loadCredentials();
      const match = creds.find(
        (c) =>
          c.email === email.toLowerCase() &&
          c.passwordHash === mockHash(password)
      );

      if (!match) {
        return { success: false, error: "Invalid email or password" };
      }

      const user: User = {
        id: match.userId,
        email: match.email,
        displayName: match.email.split("@")[0],
        createdAt: new Date().toISOString(),
      };

      globalUser = user;
      await saveAuth(user);
      notify();
      return { success: true, error: null };
    },

    signOut: async () => {
      globalUser = null;
      await saveAuth(null);
      notify();
    },

    updateProfile: async (updates: Partial<Pick<User, "displayName">>) => {
      if (!globalUser) return;
      globalUser = { ...globalUser, ...updates };
      await saveAuth(globalUser);
      notify();
    },
  };
}
