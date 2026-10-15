import { localDatabase } from './localDatabase';
import { apiAdapterManager } from './apiAdapter';

interface InitializationStatus {
  database: boolean;
  apiConnection: boolean;
  initialized: boolean;
  timestamp: number | null;
}

type InitializationListener = (status: InitializationStatus) => void;

class DataInitializer {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private status: InitializationStatus = {
    database: false,
    apiConnection: false,
    initialized: false,
    timestamp: null,
  };
  private listeners: Set<InitializationListener> = new Set();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.checkApiConnection();

      this.initialized = true;
      this.status.initialized = true;
      this.status.timestamp = Date.now();
      this.notifyListeners();

      console.log('DataInitializer: All systems initialized');
    } catch (error) {
      console.error('DataInitializer: Initialization failed', error);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await localDatabase.init();
      this.status.database = true;
      this.notifyListeners();
      console.log('DataInitializer: Database initialized');
    } catch (error) {
      console.error('DataInitializer: Database initialization failed', error);
      throw error;
    }
  }

  private async checkApiConnection(): Promise<void> {
    try {
      const isOnline = await apiAdapterManager.checkOnlineStatus();
      this.status.apiConnection = isOnline;
      this.notifyListeners();
      console.log('DataInitializer: API connection checked, online:', isOnline);
    } catch (error) {
      console.warn('DataInitializer: API connection check failed', error);
      this.status.apiConnection = false;
      this.notifyListeners();
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStatus(): InitializationStatus {
    return { ...this.status };
  }

  subscribe(listener: InitializationListener): () => void {
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

  async reset(): Promise<void> {
    this.initialized = false;
    this.initPromise = null;
    this.status = {
      database: false,
      apiConnection: false,
      initialized: false,
      timestamp: null,
    };

    await localDatabase.clearAll();
    console.log('DataInitializer: Reset complete');
  }

  async reinitialize(): Promise<void> {
    await this.reset();
    await this.initialize();
  }
}

export const dataInitializer = new DataInitializer();
export default dataInitializer;
