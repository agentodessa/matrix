import AsyncStorage from "@react-native-async-storage/async-storage";
import { Task } from "../types/task";

// TODO: Replace with real Supabase client
// import { createClient } from "@supabase/supabase-js";

const CLOUD_KEY = "@executive_cloud_tasks";
const LAST_SYNCED_KEY = "@executive_last_synced";

export interface SyncService {
  push(tasks: Task[]): Promise<void>;
  pull(): Promise<Task[]>;
  isConnected(): boolean;
}

class MockSyncService implements SyncService {
  private connected = true;

  async push(tasks: Task[]): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    await AsyncStorage.setItem(CLOUD_KEY, JSON.stringify(tasks));
    await AsyncStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  }

  async pull(): Promise<Task[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const json = await AsyncStorage.getItem(CLOUD_KEY);
    return json ? JSON.parse(json) : [];
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton
let syncService: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncService) {
    syncService = new MockSyncService();
  }
  return syncService;
}

export async function getLastSynced(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNCED_KEY);
}
