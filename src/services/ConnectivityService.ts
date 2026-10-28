/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SyncState = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'PENDING_CHANGES' | 'ERROR';

class ConnectivityService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncState: SyncState = 'SYNCED';
  private pendingQueueCount: number = 0;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleStatusChange(true));
      window.addEventListener('offline', () => this.handleStatusChange(false));
    }
  }

  private handleStatusChange(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.syncPendingData();
    } else {
      this.syncState = 'OFFLINE';
      this.notify();
    }
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      syncState: this.syncState,
      pendingCount: this.pendingQueueCount
    };
  }

  public enqueueOfflineMutation() {
    this.pendingQueueCount++;
    this.syncState = 'PENDING_CHANGES';
    this.notify();
  }

  public async syncPendingData(): Promise<void> {
    if (!this.isOnline) return;
    this.syncState = 'SYNCING';
    this.notify();

    await new Promise(resolve => setTimeout(resolve, 800));

    this.pendingQueueCount = 0;
    this.syncState = 'SYNCED';
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const connectivityService = new ConnectivityService();
