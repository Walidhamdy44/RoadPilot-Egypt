'use client';

import { create } from 'zustand';

/**
 * Sync Zustand store interface.
 *
 * Tracks connectivity status, sync progress, pending record count,
 * and last successful sync timestamp. Used by the sync engine to
 * communicate state and by UI components to display sync indicators.
 */
export interface SyncStore {
  /** Whether the device currently has network connectivity */
  isOnline: boolean;
  /** Whether a sync operation is currently in progress */
  isSyncing: boolean;
  /** Number of trip records pending synchronization */
  pendingCount: number;
  /** Timestamp of last successful sync (Unix epoch ms), null if never synced */
  lastSyncTimestamp: number | null;

  /** Update online/offline status */
  setOnline: (online: boolean) => void;
  /** Update syncing state */
  setSyncing: (syncing: boolean) => void;
  /** Update the count of pending sync records */
  updatePendingCount: (count: number) => void;
  /** Record the timestamp of a successful sync */
  setLastSync: (timestamp: number) => void;
}

const initialState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTimestamp: null as number | null,
};

export const useSyncStore = create<SyncStore>((set) => ({
  ...initialState,

  setOnline: (online: boolean) => set({ isOnline: online }),

  setSyncing: (syncing: boolean) => set({ isSyncing: syncing }),

  updatePendingCount: (count: number) => set({ pendingCount: count }),

  setLastSync: (timestamp: number) => set({ lastSyncTimestamp: timestamp }),
}));
