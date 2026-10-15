import { chatRepository } from '../data/repositories/chatRepository';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'completed';

interface SyncResult {
  success: boolean;
  syncedOperations: number;
  failedOperations: number;
  errors: string[];
}

type SyncStatusListener = (status: SyncStatus, result?: SyncResult) => void;

class DataSyncService {
  private status: SyncStatus = 'idle';
  private listeners = new Set<SyncStatusListener>();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 30000;

  constructor() {
    this.init();
  }

  private init() {
    this.startPeriodicSync();
  }

  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.checkDataIntegrity();
    }, this.SYNC_INTERVAL);
  }

  private async checkDataIntegrity() {
    console.log('Data integrity check - local mode');
  }

  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(result?: SyncResult) {
    this.listeners.forEach((listener) => {
      try {
        listener(this.status, result);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  async syncPendingOperations(): Promise<SyncResult> {
    this.status = 'syncing';
    this.notifyListeners();

    const result: SyncResult = {
      success: true,
      syncedOperations: 0,
      failedOperations: 0,
      errors: [],
    };

    this.status = 'completed';
    this.notifyListeners(result);

    return result;
  }

  async saveSessionLocally(): Promise<void> {
    console.log('Session saved locally');
  }

  async saveMessageLocally(): Promise<void> {
    console.log('Message saved locally');
  }

  async deleteSessionLocally(): Promise<void> {
    console.log('Session deleted locally');
  }

  async updateMessageFeedbackLocally(): Promise<void> {
    console.log('Message feedback updated locally');
  }

  async loadSessionsFromLocal() {
    return chatRepository.getAllSessions();
  }

  async loadMessagesFromLocal(sessionId: string) {
    return chatRepository.getMessagesBySession(sessionId);
  }

  async syncFromServer(): Promise<void> {
    console.log('Sync from server - local mode only');
  }

  async syncMessagesFromServer(sessionId: string) {
    return chatRepository.getMessagesBySession(sessionId);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  async getPendingOperationsCount(): Promise<number> {
    return 0;
  }

  async clearPendingOperations(): Promise<void> {
    console.log('Clear pending operations - local mode only');
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
  }
}

export const dataSyncService = new DataSyncService();
export type { SyncStatus, SyncResult };
