/**
 * 数据层统一导出
 * 
 * 提供数据访问、存储、同步和模拟服务的统一入口
 * 
 * @author 非遗数字生命互动引擎项目组
 * @version 2.0.0
 */

// 数据模型
export * from './models';

// 本地数据库
export { localDatabase, STORES } from './localDatabase';

// API 适配器
export { apiAdapterManager } from './apiAdapter';

// 数据初始化器
export { dataInitializer } from './dataInitializer';

// 数据仓库
export { chatRepository } from './repositories/chatRepository';
export { knowledgeRepository } from './repositories/knowledgeRepository';

// Mock 服务
export { mockChatService } from './mockServices/mockChatService';
export { mockKnowledgeService } from './mockServices/mockKnowledgeService';
export { mockLLMService } from './mockServices/mockLLMService';

// 数据同步
export { syncManager } from './syncManager';

// 服务路由器
export { serviceRouter } from './serviceRouter';
export type { ServiceStatus, ServiceInfo } from './serviceRouter';
