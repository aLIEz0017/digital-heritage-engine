/**
 * 服务路由器
 * 
 * 根据功能配置自动选择本地或远程服务实现：
 * - backend-required: 必须使用后端服务，离线时使用 mock 降级
 * - local-first: 优先本地实现，后端可选
 * - local-only: 仅使用本地实现
 * 
 * 【后端扩展说明】
 * 当添加新的后端服务时：
 * 1. 在 featureConfig.ts 中配置功能模块
 * 2. 在本文件中添加对应的服务路由逻辑
 * 3. 实现后端 API 接口
 * 
 * @author 非遗数字生命互动引擎项目组
 * @version 1.0.0
 */

import { apiAdapterManager } from './apiAdapter';
import { FEATURE_CONFIG, type FeatureMode } from '../config/featureConfig';
import { mockLLMService } from './mockServices/mockLLMService';
import { mockChatService } from './mockServices/mockChatService';
import { mockKnowledgeService } from './mockServices/mockKnowledgeService';
import { chatRepository } from './repositories/chatRepository';
import { knowledgeRepository } from './repositories/knowledgeRepository';
import { localAuthService } from '../services/localAuthService';
import { syncManager } from './syncManager';

export type ServiceStatus = 'online' | 'offline' | 'degraded' | 'mock';

export interface ServiceInfo {
  feature: string;
  mode: FeatureMode;
  status: ServiceStatus;
  backendAvailable: boolean;
  localAvailable: boolean;
  lastChecked: number;
}

type ServiceListener = (info: ServiceInfo) => void;

class ServiceRouter {
  private serviceStatus: Map<string, ServiceInfo> = new Map();
  private listeners: Set<ServiceListener> = new Set();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.checkAllServices();
    this.initialized = true;
  }

  async checkAllServices(): Promise<void> {
    const backendAvailable = apiAdapterManager.isBackendAvailable();

    for (const [featureName, config] of Object.entries(FEATURE_CONFIG)) {
      const status = this.determineServiceStatus(config.mode, backendAvailable);
      
      this.serviceStatus.set(featureName, {
        feature: featureName,
        mode: config.mode,
        status,
        backendAvailable,
        localAvailable: true,
        lastChecked: Date.now(),
      });
    }

    this.notifyListeners();
  }

  private determineServiceStatus(mode: FeatureMode, backendAvailable: boolean): ServiceStatus {
    switch (mode) {
      case 'backend-required':
        return backendAvailable ? 'online' : 'mock';
      case 'local-first':
        return backendAvailable ? 'online' : 'offline';
      case 'local-only':
        return 'online';
      default:
        return 'offline';
    }
  }

  getServiceStatus(featureName: string): ServiceInfo | undefined {
    return this.serviceStatus.get(featureName);
  }

  getAllServiceStatus(): ServiceInfo[] {
    return Array.from(this.serviceStatus.values());
  }

  shouldUseBackend(featureName: string): boolean {
    const info = this.serviceStatus.get(featureName);
    if (!info) return false;

    if (info.mode === 'local-only') return false;
    if (info.mode === 'backend-required') return info.status === 'online';
    
    return info.backendAvailable && info.status === 'online';
  }

  shouldUseLocal(featureName: string): boolean {
    const info = this.serviceStatus.get(featureName);
    if (!info) return true;

    return !this.shouldUseBackend(featureName);
  }

  subscribe(listener: ServiceListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const statuses = this.getAllServiceStatus();
    for (const listener of this.listeners) {
      for (const status of statuses) {
        listener(status);
      }
    }
  }

  getChatService() {
    if (this.shouldUseBackend('chatMessage')) {
      return {
        type: 'degraded' as const,
        service: mockChatService,
        repository: chatRepository,
      };
    }
    return {
      type: 'local' as const,
      service: mockChatService,
      repository: chatRepository,
    };
  }

  getKnowledgeService() {
    if (this.shouldUseBackend('knowledgeEntity')) {
      return {
        type: 'remote' as const,
        // 【后端扩展点】返回后端 API 调用方法
      };
    }
    return {
      type: 'local' as const,
      service: mockKnowledgeService,
      repository: knowledgeRepository,
    };
  }

  getLLMService() {
    if (this.shouldUseBackend('llmChat')) {
      return {
        type: 'mock' as const,
        service: mockLLMService,
      };
    }
    return {
      type: 'mock' as const,
      service: mockLLMService,
    };
  }

  getAuthService() {
    if (this.shouldUseBackend('auth')) {
      return {
        type: 'remote' as const,
        // 【后端扩展点】返回后端认证 API
      };
    }
    return {
      type: 'local' as const,
      service: localAuthService,
    };
  }

  getSyncService() {
    return {
      type: 'local' as const,
      service: syncManager,
    };
  }

  async executeWithFallback<T>(
    featureName: string,
    remoteFn: () => Promise<T>,
    localFn: () => Promise<T>,
    mockFn?: () => Promise<T>
  ): Promise<T> {
    const config = FEATURE_CONFIG[featureName];
    if (!config) {
      console.warn(`Unknown feature: ${featureName}, using local fallback`);
      return localFn();
    }

    if (config.mode === 'local-only') {
      return localFn();
    }

    if (config.mode === 'backend-required') {
      if (apiAdapterManager.isBackendAvailable()) {
        try {
          return await remoteFn();
        } catch (error) {
          console.warn(`Remote service failed for ${featureName}, using mock:`, error);
          if (mockFn) {
            return mockFn();
          }
          throw error;
        }
      } else if (mockFn) {
        return mockFn();
      }
      console.warn(`Backend required for ${featureName} but unavailable, using local fallback`);
      return localFn();
    }

    if (config.mode === 'local-first') {
      if (apiAdapterManager.isBackendAvailable()) {
        try {
          return await remoteFn();
        } catch (error) {
          console.warn(`Remote service failed for ${featureName}, falling back to local:`, error);
          return localFn();
        }
      }
      return localFn();
    }

    return localFn();
  }

  getFeatureReport(): {
    total: number;
    online: number;
    offline: number;
    mock: number;
    degraded: number;
    details: ServiceInfo[];
  } {
    const statuses = this.getAllServiceStatus();
    
    return {
      total: statuses.length,
      online: statuses.filter(s => s.status === 'online').length,
      offline: statuses.filter(s => s.status === 'offline').length,
      mock: statuses.filter(s => s.status === 'mock').length,
      degraded: statuses.filter(s => s.status === 'degraded').length,
      details: statuses,
    };
  }
}

export const serviceRouter = new ServiceRouter();
export default serviceRouter;
