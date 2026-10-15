/**
 * Mock 服务统一导出
 * 
 * 本地模拟服务集合，用于：
 * 1. 开发环境测试
 * 2. 离线模式支持
 * 3. 后端服务不可用时的降级方案
 * 
 * 【后端扩展说明】
 * 当后端服务可用时，这些服务将作为 fallback 使用。
 * 在 featureConfig.ts 中配置各功能模块的运行模式。
 * 
 * @author 非遗数字生命互动引擎项目组
 * @version 1.0.0
 */

export { mockChatService } from './mockChatService';
export { mockKnowledgeService } from './mockKnowledgeService';
export { mockLLMService } from './mockLLMService';
