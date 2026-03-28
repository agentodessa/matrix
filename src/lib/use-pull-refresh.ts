import { useState, useCallback } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Pull-to-refresh hook.
 * Invalidates all React Query caches, triggering refetch.
 */
export const usePullRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  const onRefresh = useCallback(async () => {
    if (Platform.OS === "web") return;
    setRefreshing(true);

    try {
      await qc.invalidateQueries();
    } catch {}

    await new Promise((r) => setTimeout(r, 300));
    setRefreshing(false);
  }, [qc]);

  return { refreshing, onRefresh };
};
