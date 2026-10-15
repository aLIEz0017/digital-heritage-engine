/**
 * 本地 LLM Mock 服务
 * 
 * 提供大模型服务的本地模拟实现，用于：
 * 1. 开发环境测试
 * 2. 离线模式下的基本功能支持
 * 3. 后端服务不可用时的降级方案
 * 
 * 【后端扩展说明】
 * 当集成真实大模型服务时，需要：
 * 1. 配置 API 密钥和环境变量
 * 2. 实现后端 /api/v1/llm/* 接口
 * 3. 在 featureConfig.ts 中将 mode 改为 'backend-required'
 * 4. 本文件作为 fallback 保留
 * 
 * @author 非遗数字生命互动引擎项目组
 * @version 1.0.0
 */

import type {
  ChatRequest,
  ChatResponse,
  IntentRequest,
  IntentResponse,
  EntityExtractionRequest,
  Entity,
  EntityExtractionResponse,
  KeywordExtractionRequest,
  Keyword,
  KeywordExtractionResponse,
  QuestionRecommendationRequest,
  RecommendedQuestion,
  QuestionRecommendationResponse,
  AnswerEvaluationRequest,
  AnswerEvaluationResponse,
} from '../../api/llm';

const HERITAGE_KNOWLEDGE_BASE = {
  techniques: [
    { name: '景泰蓝制作技艺', region: '北京', period: '明代', type: 'technique' },
    { name: '苏绣', region: '江苏苏州', period: '春秋战国', type: 'technique' },
    { name: '蜀绣', region: '四川成都', period: '汉代', type: 'technique' },
    { name: '宜兴紫砂陶制作技艺', region: '江苏宜兴', period: '宋代', type: 'technique' },
    { name: '龙泉青瓷烧制技艺', region: '浙江龙泉', period: '五代', type: 'technique' },
    { name: '昆曲', region: '江苏苏州', period: '元代', type: 'performance' },
    { name: '川剧', region: '四川成都', period: '清代', type: 'performance' },
    { name: '苏州评弹', region: '江苏苏州', period: '明代', type: 'performance' },
    { name: '桃花坞木版年画', region: '江苏苏州', period: '明代', type: 'art' },
    { name: '蜀锦织造技艺', region: '四川成都', period: '汉代', type: 'technique' },
    { name: '成都银花丝制作技艺', region: '四川成都', period: '明代', type: 'technique' },
  ],
  inheritors: [
    { name: '张同禄', craft: '景泰蓝', region: '北京' },
    { name: '姚建萍', craft: '苏绣', region: '江苏苏州' },
    { name: '顾景舟', craft: '紫砂陶', region: '江苏宜兴' },
    { name: '徐朝兴', craft: '龙泉青瓷', region: '浙江龙泉' },
  ],
  concepts: [
    '非物质文化遗产',
    '传承人',
    '活态传承',
    '匠心精神',
    '传统技艺',
    '文化保护',
    '手工艺术',
    '民俗文化',
  ],
};

const RESPONSE_TEMPLATES = {
  greeting: [
    '您好！我是非遗知识助手，很高兴为您解答关于非物质文化遗产的问题。',
    '欢迎来到非遗知识库！我可以为您介绍各种传统技艺和文化。',
  ],
  technique: [
    '{name}是{region}著名的传统技艺，起源于{period}。{description}',
    '关于{name}，这是一项具有悠久历史的非遗技艺，{description}',
  ],
  inheritor: [
    '{name}是{craft}技艺的代表性传承人，来自{region}，为这项非遗的保护和传承做出了重要贡献。',
  ],
  general: [
    '根据非遗知识库的资料，您询问的内容涉及传统技艺的核心传承。这项技艺已有数百年历史，是中华传统文化的重要组成部分。',
    '关于您的问题，从非遗保护的角度来看，这体现了先民智慧的结晶。传承人在技艺传承中扮演着关键角色，需要长期的学习和实践。',
    '这是一个很好的问题！非遗文化强调"活态传承"，每一代传承人都会在保持核心技艺的同时，融入时代特色。',
    '根据史料记载，这项非遗技艺起源于古代，经过代代相传，形成了独特的艺术风格和工艺特点。',
    '您提到的内容属于非物质文化遗产的重要范畴。保护和传承这些技艺，是我们共同的责任。',
  ],
  unknown: [
    '抱歉，我暂时没有找到关于这个问题的详细信息。您可以尝试换个方式提问，或者浏览我们的知识图谱了解更多非遗知识。',
    '这个问题很有趣！不过我需要更多信息才能给您准确的回答。您可以查看相关知识条目获取更多详情。',
  ],
};

function findRelatedEntity(message: string): { name: string; region?: string; period?: string; type?: string } | null {
  const lowerMessage = message.toLowerCase();
  
  for (const entity of HERITAGE_KNOWLEDGE_BASE.techniques) {
    if (lowerMessage.includes(entity.name.toLowerCase()) || 
        lowerMessage.includes(entity.name)) {
      return entity;
    }
  }
  
  for (const inheritor of HERITAGE_KNOWLEDGE_BASE.inheritors) {
    if (lowerMessage.includes(inheritor.name.toLowerCase()) ||
        lowerMessage.includes(inheritor.name)) {
      return { ...inheritor, type: 'inheritor' };
    }
  }
  
  return null;
}

function generateResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('你好') || lowerMessage.includes('您好') || lowerMessage.includes('hello')) {
    return RESPONSE_TEMPLATES.greeting[Math.floor(Math.random() * RESPONSE_TEMPLATES.greeting.length)];
  }
  
  const entity = findRelatedEntity(message);
  if (entity) {
    if (entity.type === 'inheritor') {
      const template = RESPONSE_TEMPLATES.inheritor[0];
      return template
        .replace('{name}', entity.name)
        .replace('{craft}', 'craft' in entity ? String((entity as { craft?: string }).craft || '') : '')
        .replace('{region}', entity.region || '');
    } else {
      const template = RESPONSE_TEMPLATES.technique[Math.floor(Math.random() * RESPONSE_TEMPLATES.technique.length)];
      return template
        .replace('{name}', entity.name)
        .replace('{region}', entity.region || '')
        .replace('{period}', entity.period || '')
        .replace('{description}', '体现了中华民族的智慧和创造力。');
    }
  }
  
  for (const concept of HERITAGE_KNOWLEDGE_BASE.concepts) {
    if (message.includes(concept)) {
      return RESPONSE_TEMPLATES.general[Math.floor(Math.random() * RESPONSE_TEMPLATES.general.length)];
    }
  }
  
  return RESPONSE_TEMPLATES.unknown[Math.floor(Math.random() * RESPONSE_TEMPLATES.unknown.length)];
}

class MockLLMService {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    await this.simulateDelay(300, 800);
    
    const response = generateResponse(request.message);
    
    return {
      response,
      model: 'mock-llm-v1',
      cached: false,
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<string> {
    const response = generateResponse(request.message);
    const words = response.split('');
    
    for (const word of words) {
      await this.simulateDelay(20, 50);
      yield word;
    }
  }

  async recognizeIntent(request: IntentRequest): Promise<IntentResponse> {
    await this.simulateDelay(100, 300);
    
    const query = request.query.toLowerCase();
    let primaryIntent = 'inquiry';
    let queryType = 'general';
    
    if (query.includes('什么是') || query.includes('介绍')) {
      primaryIntent = 'definition';
      queryType = 'informational';
    } else if (query.includes('如何') || query.includes('怎么')) {
      primaryIntent = 'howto';
      queryType = 'procedural';
    } else if (query.includes('哪里') || query.includes('在哪')) {
      primaryIntent = 'location';
      queryType = 'informational';
    } else if (query.includes('谁') || query.includes('传承人')) {
      primaryIntent = 'person';
      queryType = 'informational';
    } else if (query.includes('历史') || query.includes('起源')) {
      primaryIntent = 'history';
      queryType = 'informational';
    }
    
    const entities = this.extractEntitiesFromText(request.query);
    
    return {
      primary_intent: primaryIntent,
      confidence: 0.85,
      secondary_intents: [],
      entities: entities.map(e => e.name),
      keywords: entities.map(e => e.name).slice(0, 3),
      query_type: queryType,
      suggested_response_type: 'text',
      clarification_needed: false,
    };
  }

  async extractEntities(request: EntityExtractionRequest): Promise<EntityExtractionResponse> {
    await this.simulateDelay(100, 300);
    
    const entities = this.extractEntitiesFromText(request.text);
    
    return {
      entities,
      keywords: entities.map(e => e.name),
      summary: `从文本中识别出 ${entities.length} 个非遗相关实体。`,
      main_topic: entities.length > 0 ? entities[0].name : undefined,
    };
  }

  private extractEntitiesFromText(text: string): Entity[] {
    const entities: Entity[] = [];
    const lowerText = text.toLowerCase();
    
    for (const technique of HERITAGE_KNOWLEDGE_BASE.techniques) {
      if (lowerText.includes(technique.name.toLowerCase()) || text.includes(technique.name)) {
        entities.push({
          name: technique.name,
          type: technique.type,
          confidence: 0.9,
          attributes: {
            region: technique.region,
            period: technique.period,
          },
          relations: [],
        });
      }
    }
    
    for (const inheritor of HERITAGE_KNOWLEDGE_BASE.inheritors) {
      if (lowerText.includes(inheritor.name.toLowerCase()) || text.includes(inheritor.name)) {
        entities.push({
          name: inheritor.name,
          type: 'inheritor',
          confidence: 0.9,
          attributes: {
            craft: inheritor.craft,
            region: inheritor.region,
          },
          relations: [],
        });
      }
    }
    
    return entities;
  }

  async extractKeywords(request: KeywordExtractionRequest): Promise<KeywordExtractionResponse> {
    await this.simulateDelay(50, 150);
    
    const keywords: Keyword[] = [];
    const text = request.text.toLowerCase();
    
    for (const concept of HERITAGE_KNOWLEDGE_BASE.concepts) {
      if (text.includes(concept.toLowerCase())) {
        keywords.push({
          word: concept,
          category: 'heritage',
          weight: 0.8,
          synonyms: [],
          related: [],
        });
      }
    }
    
    const entities = this.extractEntitiesFromText(request.text);
    for (const entity of entities) {
      keywords.push({
        word: entity.name,
        category: entity.type,
        weight: 0.9,
        synonyms: [],
        related: [],
      });
    }
    
    return {
      keywords: keywords.slice(0, request.max_keywords || 10),
      expanded_keywords: keywords.map(k => k.word),
      main_topic: keywords.length > 0 ? keywords[0].word : undefined,
      sentiment: 'neutral',
      domain: 'heritage',
    };
  }

  async recommendQuestions(request: QuestionRecommendationRequest): Promise<QuestionRecommendationResponse> {
    await this.simulateDelay(100, 300);
    
    const questions: RecommendedQuestion[] = [];
    const entities = request.entities.length > 0 ? request.entities : ['非遗'];
    
    const templates = [
      { q: `${entities[0]}的历史起源是什么？`, type: 'history', reason: '了解历史背景' },
      { q: `${entities[0]}有哪些代表性传承人？`, type: 'person', reason: '探索传承人物' },
      { q: `${entities[0]}的制作工艺有什么特点？`, type: 'technique', reason: '深入了解技艺' },
      { q: `如何保护和传承${entities[0]}？`, type: 'protection', reason: '关注保护措施' },
      { q: `${entities[0]}与现代生活如何结合？`, type: 'modern', reason: '探索现代价值' },
    ];
    
    for (let i = 0; i < Math.min(3, templates.length); i++) {
      questions.push({
        question: templates[i].q,
        type: templates[i].type,
        reason: templates[i].reason,
        related_entities: entities,
        priority: i + 1,
      });
    }
    
    return {
      questions,
      context_summary: `基于您对${entities.join('、')}的关注，推荐以下问题。`,
      suggested_direction: '深入了解相关技艺的历史和传承',
    };
  }

  async evaluateAnswer(request: AnswerEvaluationRequest): Promise<AnswerEvaluationResponse> {
    await this.simulateDelay(100, 300);
    
    const answerLength = request.answer.length;
    const hasRelevantContent = HERITAGE_KNOWLEDGE_BASE.concepts.some(c => 
      request.answer.includes(c)
    );
    
    const baseScore = hasRelevantContent ? 0.75 : 0.5;
    const lengthBonus = Math.min(answerLength / 500, 0.15);
    const overallScore = Math.min(baseScore + lengthBonus, 1);
    
    return {
      scores: [
        { dimension: '相关性', score: hasRelevantContent ? 0.85 : 0.6, comment: '答案与问题的相关程度' },
        { dimension: '完整性', score: answerLength > 100 ? 0.8 : 0.5, comment: '答案信息的完整程度' },
        { dimension: '准确性', score: 0.75, comment: '答案内容的准确程度' },
      ],
      overall_score: overallScore,
      strengths: hasRelevantContent ? ['包含相关非遗知识'] : ['回答简洁'],
      weaknesses: answerLength < 50 ? ['回答过于简短'] : [],
      suggestions: ['可以补充更多历史背景', '建议添加具体案例'],
      should_regenerate: overallScore < 0.6,
    };
  }

  private async simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const mockLLMService = new MockLLMService();
export default mockLLMService;
