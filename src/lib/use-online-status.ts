import { useEffect, useRef, useState } from "react";
import { useIsMutating, useIsFetching } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";

export type SyncStatus = "synced" | "syncing" | "offline";

export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
  }, []);

  return isOnline;
}

export function useSyncStatus(): SyncStatus {
  const isOnline = useIsOnline();
  const mutating = useIsMutating();
  const fetching = useIsFetching();
  const isBusy = mutating > 0 || fetching > 0;

  const [display, setDisplay] = useState<SyncStatus>("synced");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOnline) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setDisplay("offline");
      return;
    }

    if (isBusy) {
      // Busy — cancel any pending settle, show syncing
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setDisplay("syncing");
    } else {
      // Not busy — if we were showing syncing, wait before going to synced
      // This prevents flicker from mutation→refetch gaps
      setDisplay((prev) => {
        if (prev === "syncing") {
          // Schedule transition to synced after settle period
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setDisplay("synced");
          }, 800);
          // Stay on syncing until timer fires
          return "syncing";
        }
        return prev;
      });
    }
  }, [isOnline, isBusy]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return display;
}
