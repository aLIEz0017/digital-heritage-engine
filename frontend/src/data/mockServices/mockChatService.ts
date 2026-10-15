import { chatRepository } from '../repositories/chatRepository';
import type { Session, Message } from '../../types/chat';

const HERITAGE_RESPONSES = [
  '根据非遗知识库的资料，您询问的内容涉及传统技艺的核心传承。这项技艺已有数百年历史，是中华传统文化的重要组成部分。',
  '关于您的问题，从非遗保护的角度来看，这体现了先民智慧的结晶。传承人在技艺传承中扮演着关键角色，需要长期的学习和实践。',
  '这是一个很好的问题！非遗文化强调"活态传承"，每一代传承人都会在保持核心技艺的同时，融入时代特色。',
  '根据史料记载，这项非遗技艺起源于古代，经过代代相传，形成了独特的艺术风格和工艺特点。',
  '您提到的内容属于非物质文化遗产的重要范畴。保护和传承这些技艺，是我们共同的责任。',
];

const HERITAGE_KEYWORDS = [
  '传承',
  '技艺',
  '非遗',
  '传统',
  '文化',
  '工艺',
  '匠心',
  '民俗',
  '手艺',
  '古老',
  '历史',
  '艺术',
  '民间',
  '国粹',
  '经典',
];

function generateHeritageResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('传承人') || lowerMessage.includes('传人')) {
    return '传承人是非遗保护的核心。他们不仅掌握着精湛的技艺，更承载着文化的记忆。目前我国已建立了完善的传承人认定和保护机制，确保这些珍贵技艺得以延续。';
  }

  if (lowerMessage.includes('历史') || lowerMessage.includes('起源')) {
    return '这项非遗技艺历史悠久，可追溯至数百年前。它凝聚了先民的智慧，在历史长河中不断发展演变，形成了独特的艺术风格。';
  }

  if (lowerMessage.includes('工艺') || lowerMessage.includes('制作')) {
    return '该技艺的制作工艺十分讲究，需要经过多道工序，每一步都需要精心操作。传统工艺强调"慢工出细活"，体现了匠人精神。';
  }

  if (lowerMessage.includes('保护') || lowerMessage.includes('传承')) {
    return '非遗保护工作需要全社会的参与。目前采取了多种保护措施，包括建立传承基地、开展培训课程、数字化记录等，确保技艺得以完整保存和传承。';
  }

  const randomIndex = Math.floor(Math.random() * HERITAGE_RESPONSES.length);
  return HERITAGE_RESPONSES[randomIndex];
}

function extractKeywords(message: string): string[] {
  const keywords: string[] = [];
  HERITAGE_KEYWORDS.forEach((keyword) => {
    if (message.includes(keyword)) {
      keywords.push(keyword);
    }
  });

  if (keywords.length === 0) {
    keywords.push('非遗文化');
  }

  return keywords.slice(0, 5);
}

const RECOMMENDED_QUESTIONS = [
  { id: 'q1', question: '什么是非物质文化遗产？' },
  { id: 'q2', question: '如何成为非遗传承人？' },
  { id: 'q3', question: '非遗保护有哪些重要意义？' },
  { id: 'q4', question: '传统技艺如何与现代生活结合？' },
  { id: 'q5', question: '中国有哪些世界级非遗项目？' },
  { id: 'q6', question: '非遗传承面临哪些挑战？' },
];

class MockChatService {
  async createSession(title: string = '新对话', userId: string = 'guest_user'): Promise<Session> {
    return chatRepository.createSession(userId, title);
  }

  async getSessions(): Promise<Session[]> {
    return chatRepository.getAllSessions();
  }

  async deleteSession(sessionId: string): Promise<void> {
    return chatRepository.deleteSession(sessionId);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    return chatRepository.updateSession(sessionId, updates);
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return chatRepository.getMessagesBySession(sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<Message> {
    await chatRepository.addMessage({
      session_id: sessionId,
      role: 'user',
      content,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const aiContent = generateHeritageResponse(content);
    const keywords = extractKeywords(content);

    const aiMessage = await chatRepository.addMessage({
      session_id: sessionId,
      role: 'assistant',
      content: aiContent,
      keywords,
      entities: [],
      sources: [],
    });

    return aiMessage;
  }

  async sendMessageStream(
    sessionId: string,
    content: string,
    onChunk: (chunk: string) => void,
    onComplete: (message: Message) => void,
    onError?: (error: Error) => void
  ): Promise<() => void> {
    let aborted = false;

    const processStream = async () => {
      try {
        // 注意：用户消息由 UI 层保存，这里不需要重复保存
        // 直接生成 AI 回复

        const aiContent = generateHeritageResponse(content);
        const keywords = extractKeywords(content);

        const words = aiContent.split('');
        for (let i = 0; i < words.length && !aborted; i++) {
          await new Promise((resolve) => setTimeout(resolve, 30));
          onChunk(words[i]);
        }

        if (!aborted) {
          const mockAiMessage: Message = {
            id: `msg_${Date.now()}_assistant`,
            session_id: sessionId,
            role: 'assistant',
            content: aiContent,
            keywords,
            entities: [],
            sources: [],
            created_at: new Date().toISOString(),
          };

          onComplete(mockAiMessage);
        }
      } catch (error) {
        if (onError && !aborted) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    // 启动流式处理
    processStream();

    // 返回同步的 abort 函数
    return () => {
      aborted = true;
    };
  }

  async submitFeedback(messageId: string, feedback: 'helpful' | 'unclear'): Promise<void> {
    await chatRepository.updateMessage(messageId, { feedback });
  }

  async toggleFavorite(messageId: string, currentStatus?: boolean): Promise<boolean> {
    const newStatus = currentStatus === undefined ? true : !currentStatus;
    await chatRepository.updateMessage(messageId, { is_favorite: newStatus });
    return newStatus;
  }

  async getRecommendedQuestions(): Promise<{ id: string; question: string }[]> {
    return RECOMMENDED_QUESTIONS;
  }
}

export const mockChatService = new MockChatService();
export default mockChatService;
