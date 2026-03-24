import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { useEffect } from "react";

// Persist query cache to AsyncStorage
const CACHE_KEY = "@executive_query_cache";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s — data is "fresh" for 30s
      gcTime: 1000 * 60 * 60, // 1h — keep unused cache for 1h
      retry: 2,
      refetchOnWindowFocus: Platform.OS === "web",
    },
  },
});

// Persist cache on changes (debounced)
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistCache() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    try {
      const cache = queryClient.getQueryCache().getAll();
      const serializable = cache
        .filter((q) => q.state.status === "success" && q.state.data !== undefined)
        .map((q) => ({
          queryKey: q.queryKey,
          data: q.state.data,
          dataUpdatedAt: q.state.dataUpdatedAt,
        }));
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serializable));
    } catch {}
  }, 1000);
}

// Restore cache on startup
async function restoreCache() {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);
    if (!json) return;
    const entries = JSON.parse(json) as Array<{
      queryKey: unknown[];
      data: unknown;
      dataUpdatedAt: number;
    }>;
    for (const entry of entries) {
      queryClient.setQueryData(entry.queryKey, entry.data, {
        updatedAt: entry.dataUpdatedAt,
      });
    }
  } catch {}
}

// Subscribe to cache changes for persistence
queryClient.getQueryCache().subscribe(persistCache);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Restore cache on mount
  useEffect(() => {
    restoreCache();
  }, []);

  // Refetch on app focus (mobile)
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        queryClient.invalidateQueries();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
