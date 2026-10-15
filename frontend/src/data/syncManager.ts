import { apiAdapterManager } from './apiAdapter';
import { localDatabase, STORES } from './localDatabase';
import type { PendingOperation, SyncStatus } from './models';

type SyncStatusListener = (status: SyncStatus) => void;

class SyncManager {
  private status: SyncStatus = {
    lastSync: null,
    pendingOperations: 0,
    isSyncing: false,
    errors: [],
  };
  private listeners: Set<SyncStatusListener> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 60000;

  constructor() {
    this.init();
  }

  private init(): void {
    apiAdapterManager.subscribe((networkStatus) => {
      if (networkStatus.isOnline) {
        this.sync();
      }
    });

    this.startPeriodicSync();
    this.updatePendingCount();
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (apiAdapterManager.getOnlineStatus()) {
        this.sync();
      }
    }, this.SYNC_INTERVAL);
  }

  private async updatePendingCount(): Promise<void> {
    const count = await localDatabase.count(STORES.PENDING_OPERATIONS);
    this.status.pendingOperations = count;
    this.notifyListeners();
  }

  async addPendingOperation(
    type: string,
    data: Record<string, unknown>
  ): Promise<PendingOperation> {
    const operation: PendingOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    };

    await localDatabase.put(STORES.PENDING_OPERATIONS, operation);
    await this.updatePendingCount();

    return operation;
  }

  async addOperation(
    type: string,
    data: Record<string, unknown>
  ): Promise<PendingOperation> {
    return this.addPendingOperation(type, data);
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const operations = await localDatabase.getAll<PendingOperation>(
      STORES.PENDING_OPERATIONS
    );
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  async removePendingOperation(operationId: string): Promise<void> {
    await localDatabase.delete(STORES.PENDING_OPERATIONS, operationId);
    await this.updatePendingCount();
  }

  async sync(): Promise<void> {
    if (this.status.isSyncing) return;
    if (!apiAdapterManager.getOnlineStatus()) return;

    this.status.isSyncing = true;
    this.status.errors = [];
    this.notifyListeners();

    try {
      const operations = await this.getPendingOperations();

      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          await this.removePendingOperation(operation.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.status.errors.push(`Operation ${operation.id} failed: ${errorMessage}`);

          if (operation.retryCount < (operation.maxRetries ?? 3)) {
            operation.retryCount++;
            await localDatabase.put(STORES.PENDING_OPERATIONS, operation);
          } else {
            await this.removePendingOperation(operation.id);
            console.error(`Operation ${operation.id} exceeded max retries, removed`);
          }
        }
      }

      this.status.lastSync = Date.now();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.errors.push(`Sync failed: ${errorMessage}`);
    } finally {
      this.status.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async processOperation(operation: PendingOperation): Promise<void> {
    const { type, data } = operation;
    const id = String(data?.id ?? '');
    const isTempSessionId = id.startsWith('session_');
    const isTempMessageId = id.startsWith('msg_');

    switch (type) {
      case 'create_session':
        // 本地临时会话 ID 不应直接同步到远端，避免 404 噪音
        if (isTempSessionId) return;
        await apiAdapterManager.post('/session', data);
        break;
      case 'update_session':
        if (isTempSessionId) return;
        await apiAdapterManager.put(`/session/${data.id}`, data);
        break;
      case 'delete_session':
        if (isTempSessionId) return;
        await apiAdapterManager.delete(`/session/${data.id}`);
        break;
      case 'create_message':
        // 流式过程中会产生本地占位消息，跳过远端同步
        if (isTempMessageId || String(data?.session_id ?? '').startsWith('session_')) return;
        await apiAdapterManager.post('/chat/message', data);
        break;
      case 'update_message':
        if (isTempMessageId) return;
        await apiAdapterManager.put(`/chat/message/${data.id}`, data);
        break;
      case 'delete_message':
        if (isTempMessageId) return;
        await apiAdapterManager.delete(`/chat/message/${data.id}`);
        break;
      case 'create_entity':
        await apiAdapterManager.post('/knowledge/entity', data);
        break;
      case 'update_entity':
        await apiAdapterManager.put(`/knowledge/entity/${data.id}`, data);
        break;
      case 'delete_entity':
        await apiAdapterManager.delete(`/knowledge/entity/${data.id}`);
        break;
      case 'create_relationship':
        await apiAdapterManager.post('/knowledge/relationship', data);
        break;
      case 'delete_relationship':
        await apiAdapterManager.delete(`/knowledge/relationship/${data.id}`);
        break;
      default:
        console.warn(`Unknown operation type: ${type}`);
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  async forceSync(): Promise<void> {
    await this.sync();
  }

  async clearPendingOperations(): Promise<void> {
    await localDatabase.clear(STORES.PENDING_OPERATIONS);
    await this.updatePendingCount();
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
  }
}

export const syncManager = new SyncManager();
export default syncManager;
