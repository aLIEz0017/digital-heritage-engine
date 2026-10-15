import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, pruneVersions } from '../../stores/chatStore';
import {
  useGraphStore,
  sessionBundleHasContent,
  rebuildSessionGraphBundleFromMessages,
} from '../../stores/graphStore';
import { useUIStore } from '../../stores/uiStore';
import { chatDataService } from '../../services/chat';
import { graphSyncService } from '../../services/graphSyncService';
import { categorizeError } from '../../services/errorHandler';
import { useToast } from '../../components/common/Toast';
import type {
  Entity,
  Source,
  Message,
  Relation,
  GraphSnapshot,
  MessageVersion,
} from '../../types/chat';

import Sidebar from '../../components/chat/Sidebar';
import RightPanel from '../../components/chat/RightPanel';
import UnifiedInputArea from '../../components/chat/UnifiedInputArea';
import ChatToolbar from '../../components/chat/ChatToolbar';
import CommandPalette from '../../components/chat/CommandPalette';
import WelcomeScreen from '../../components/chat/WelcomeScreen';
import MessageSearch from '../../components/chat/MessageSearch';
import SessionSettings from '../../components/chat/SessionSettings';
import KeyboardShortcuts from '../../components/chat/KeyboardShortcuts';
import { MessageQuote } from '../../components/chat/MessageQuote';
import { VirtualMessageList } from '../../components/common/VirtualMessageList';
import { useThemeStore } from '../../stores/themeStore';
import { streamingLockManager } from '../../services/streamingLockManager';
import { CHAT_ASSISTANT_DISPLAY_NAME } from '../../constants/chatAssistant';
import { useAuthStore } from '../../stores/authStore';
import { addHeritageGraphProduction } from '../../services/heritageExplorationStats';

export default function EnhancedChatPage() {
  const { sessionId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<(() => void) | null>(null);
  /** 用户点「停止」时用于落库/清 UI：当前流式助手消息 id 与已收到的正文片段 */
  const streamingAssistantMsgIdRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState(new Set<string>());
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [assistantGraphSync, setAssistantGraphSync] = useState<{
    messageId: string;
    phase: 'drawing';
  } | null>(null);
  const streamFlushRafRef = useRef<number | null>(null);
  const graphSyncClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  const {
    sessions,
    currentSessionId,
    messagesBySession,
    isLoading,
    isStreaming,
    switchSession,
    addMessage,
    updateMessage,
    deleteMessage,
    setLoading,
    setStreaming,
    setError,
    pinSession,
    updateSessionTitle,
    deleteSession,
    createSession,
    addMessageVersion,
    switchMessageVersion,
    editAndRegenerate,
    archiveSession,
    addTagToSession,
    removeTagFromSession,
  } = useChatStore();

  const messages = useMemo(
    () => (currentSessionId ? messagesBySession[currentSessionId] || [] : []),
    [currentSessionId, messagesBySession]
  );

  const { toggleSidebar } = useUIStore();
  const { toggleMode } = useThemeStore();

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const graphEntities = useGraphStore((state) => state.entities);
  const graphRelations = useGraphStore((state) => state.relations);
  const graphKeywords = useGraphStore((state) => state.keywords);
  const graphSnapshotMessageId = useGraphStore((state) => state.messageId);

  /** 按会话消息合并整图并写入 graphStore（每轮助手完成后与切换会话兜底用） */
  const reconcileChatSessionGraphFromMessages = useCallback((sid: string) => {
    const msgs = useChatStore.getState().messagesBySession[sid] || [];
    const bundle = rebuildSessionGraphBundleFromMessages(msgs);
    if (!sessionBundleHasContent(bundle)) {
      const cached = useGraphStore.getState().graphsBySessionId[sid];
      if (sessionBundleHasContent(cached)) {
        useGraphStore.getState().setActiveChatSession(sid);
      }
      return;
    }
    graphSyncService.updateFromSnapshot(
      bundle.entities,
      bundle.relations,
      bundle.keywords,
      sid,
      bundle.messageId ?? undefined
    );
  }, []);

  useEffect(() => {
    if (!currentSessionId) return;

    // 先同步激活会话，确保后续 merge 能镜像到当前侧边栏展示
    useGraphStore.getState().setActiveChatSession(currentSessionId);

    const cached = useGraphStore.getState().graphsBySessionId[currentSessionId];
    if (sessionBundleHasContent(cached)) {
      return;
    }

    reconcileChatSessionGraphFromMessages(currentSessionId);
  }, [currentSessionId, reconcileChatSessionGraphFromMessages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowMessageSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleMode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowMessageSearch(false);
        setShowSessionSettings(false);
        setShowKeyboardShortcuts(false);
        setQuotedMessage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleMode, toggleSidebar]);

  // 图谱状态恢复函数
  const restoreGraphState = useCallback(async (targetSessionId: string) => {
    try {
      const savedGraphState = sessionStorage.getItem(`graphState_${targetSessionId}`);
      if (!savedGraphState) {
        const messages = useChatStore.getState().messagesBySession[targetSessionId] || [];
        const bundle = rebuildSessionGraphBundleFromMessages(messages);
        if (sessionBundleHasContent(bundle)) {
          graphSyncService.updateFromSnapshot(
            bundle.entities,
            bundle.relations,
            bundle.keywords,
            targetSessionId,
            bundle.messageId ?? undefined
          );
          if (import.meta.env.DEV) {
            console.log('Restored graph state from merged assistant messages', {
              entities: bundle.entities.length,
              relations: bundle.relations.length,
            });
          }
        }
        return;
      }

      const { entities, relations, keywords, filters } = JSON.parse(savedGraphState);

      if (!entities || !Array.isArray(entities) || entities.length === 0) {
        if (import.meta.env.DEV) {
          console.warn('Invalid graph state data');
        }
        return;
      }

      const isValid = entities.every((e) => {
        const entity = e as Record<string, unknown>;
        return entity.id && entity.name && entity.type;
      });
      if (!isValid) {
        if (import.meta.env.DEV) {
          console.warn('Graph state entities have invalid structure');
        }
        return;
      }

      const uniqueEntities = entities.filter(
        (e: Record<string, unknown>, index: number, self: Array<Record<string, unknown>>) =>
          index === self.findIndex((t) => t.id === e.id)
      );

      const uniqueRelations = (relations || []).filter(
        (r: Record<string, unknown>, index: number, self: Array<Record<string, unknown>>) =>
          index ===
          self.findIndex(
            (t) => `${t.source}-${t.target}-${t.type}` === `${r.source}-${r.target}-${r.type}`
          )
      );

      graphSyncService.updateFromSnapshot(
        uniqueEntities,
        uniqueRelations,
        keywords || [],
        targetSessionId,
        undefined
      );

      const event = new CustomEvent('restoreGraphState', {
        detail: {
          entities: uniqueEntities,
          relations: uniqueRelations,
          keywords,
          filters,
        },
      });
      window.dispatchEvent(event);

      if (import.meta.env.DEV) {
        console.log('Restored graph state from sessionStorage');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to restore graph state:', error);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let initTimeoutId: NodeJS.Timeout | null = null;

    const initChat = async () => {
      try {
        setLoading(true);

        const {
          initializeData,
          createSession,
          switchSession: switchSess,
        } = useChatStore.getState();

        await initializeData();

        if (!isMounted) return;

        const { sessions: fetchedSessions, currentSessionId: storeCurrentSessionId } =
          useChatStore.getState();

        let targetSessionId = sessionId;

        if (!targetSessionId) {
          if (
            storeCurrentSessionId &&
            fetchedSessions.some((s) => s.id === storeCurrentSessionId)
          ) {
            targetSessionId = storeCurrentSessionId;
          } else if (fetchedSessions.length > 0) {
            targetSessionId = fetchedSessions[0].id;
          } else {
            const newSession = await createSession();
            targetSessionId = newSession.id;
          }
        }

        if (!isMounted) return;

        if (targetSessionId) {
          await switchSess(targetSessionId);

          if (!isMounted) return;

          useGraphStore.getState().setActiveChatSession(targetSessionId);

          await restoreGraphState(targetSessionId);
        }

        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        if (isMounted) {
          const errorInfo = categorizeError(error);
          toast.error('初始化失败', errorInfo.userMessage);
          setIsInitialized(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initTimeoutId = setTimeout(() => {
      initChat();
    }, 0);

    return () => {
      isMounted = false;
      if (initTimeoutId) {
        clearTimeout(initTimeoutId);
      }
      streamingLockManager.clear();
    };
  }, [sessionId, setLoading, toast, restoreGraphState]);

  // 自动滚动逻辑已移至 VirtualMessageList 组件中统一处理
  // 避免双重滚动控制导致的冲突和性能问题

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleMockFallback = () => {
      toast.warning('服务降级', 'AI 服务暂时不可用，当前使用本地模拟数据');
    };

    window.addEventListener('chat:mockFallback', handleMockFallback);
    return () => window.removeEventListener('chat:mockFallback', handleMockFallback);
  }, [toast]);

  const handleCreateSession = useCallback(async () => {
    try {
      const newSession = await createSession();
      return newSession;
    } catch (error) {
      const errorInfo = categorizeError(error);
      toast.error('创建失败', errorInfo.userMessage);
      return null;
    }
  }, [createSession, toast]);

  // ========== 辅助函数：确保活跃会话 ==========
  const ensureActiveSession = useCallback(async (): Promise<string> => {
    let activeSessionId = currentSessionId;

    if (!activeSessionId) {
      if (sessions.length > 0 && sessions[0]?.id) {
        activeSessionId = sessions[0].id;
        await switchSession(activeSessionId);
      } else {
        const newSession = await handleCreateSession();
        if (!newSession || !newSession.id) {
          throw new Error('无法创建新会话');
        }
        activeSessionId = newSession.id;
      }
    }

    return activeSessionId;
  }, [currentSessionId, sessions, switchSession, handleCreateSession]);

  // ========== 辅助函数：构建用户消息 ==========
  const buildUserMessage = useCallback(
    (sessionId: string, content: string): Message => {
      const messageContent = quotedMessage ? `> ${quotedMessage.content}\n\n${content}` : content;

      // 创建初始版本（V1）
      const initialVersion: MessageVersion = {
        id: `version_${Date.now()}`,
        content: messageContent,
        created_at: new Date().toISOString(),
        is_current: true,
      };

      return {
        id: `msg_${Date.now()}_user`,
        session_id: sessionId,
        role: 'user',
        content: messageContent,
        created_at: new Date().toISOString(),
        parent_message_id: quotedMessage?.id,
        versions: [initialVersion],
      };
    },
    [quotedMessage]
  );

  // ========== 辅助函数：创建流式消息 ==========
  const createStreamingMessage = useCallback(
    (sessionId: string): Message => ({
      id: `msg_${Date.now()}_assistant_streaming`,
      session_id: sessionId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
    }),
    []
  );

  // ========== 辅助函数：加载快照 ==========
  const handleLoadSnapshot = useCallback((snapshot: GraphSnapshot) => {
    graphSyncService.updateFromSnapshot(
      snapshot.entities || [],
      snapshot.relations || [],
      snapshot.keywords || [],
      snapshot.session_id,
      snapshot.message_id
    );

    const event = new CustomEvent('loadSnapshot', {
      detail: {
        entities: snapshot.entities,
        relations: snapshot.relations,
        keywords: snapshot.keywords,
      },
    });
    window.dispatchEvent(event);
  }, []);

  const cancelPendingStreamFlush = useCallback(() => {
    if (streamFlushRafRef.current != null) {
      cancelAnimationFrame(streamFlushRafRef.current);
      streamFlushRafRef.current = null;
    }
  }, []);

  // ========== 核心函数：流式响应处理 ==========
  const startStreamingResponse = useCallback(
    async (sessionId: string, userContent: string, streamingMsgId: string) => {
      if (!streamingLockManager.acquire(streamingMsgId)) {
        streamingAssistantMsgIdRef.current = null;
        return () => {};
      }

      streamingAssistantMsgIdRef.current = streamingMsgId;

      cancelPendingStreamFlush();
      if (graphSyncClearTimerRef.current) {
        clearTimeout(graphSyncClearTimerRef.current);
        graphSyncClearTimerRef.current = null;
      }
      setAssistantGraphSync(null);

      try {
        setLoading(true);
        setStreaming(true);
        setIsThinking(true);
        setStreamingContent('');

        // 初始状态：显示思考中，内容为空
        await updateMessage(streamingMsgId, {
          content: '',
          isStreaming: true,
        });

        let fullContent = '';
        let receivedAnyChunk = false;

        const abort = await chatDataService.sendMessageStream(
          sessionId,
          userContent,
          (chunk) => {
            fullContent += chunk;
            if (!receivedAnyChunk) {
              receivedAnyChunk = true;
              setIsThinking(false);
            }
            if (streamFlushRafRef.current == null) {
              streamFlushRafRef.current = requestAnimationFrame(() => {
                streamFlushRafRef.current = null;
                setStreamingContent(fullContent);
              });
            }
          },
          async (aiMessage) => {
            streamingAssistantMsgIdRef.current = null;
            cancelPendingStreamFlush();
            setIsThinking(false);

            const finalText = fullContent || aiMessage.content || '';

            setStreamingContent(finalText);

            const currentMsg = useChatStore
              .getState()
              .messagesBySession[sessionId]?.find((m) => m.id === streamingMsgId);
            const existingVersions = currentMsg?.versions || [];

            let versions = existingVersions;
            if (finalText && finalText.trim()) {
              if (existingVersions.length === 0) {
                const initialVersion: MessageVersion = {
                  id: `version_${Date.now()}`,
                  content: finalText,
                  created_at: new Date().toISOString(),
                  is_current: true,
                };
                versions = [initialVersion];
              } else {
                const newVersion: MessageVersion = {
                  id: `version_${Date.now()}`,
                  content: finalText,
                  created_at: new Date().toISOString(),
                  is_current: true,
                };
                versions = pruneVersions([
                  ...existingVersions.map((v) => ({ ...v, is_current: false })),
                  newVersion,
                ]);
              }
            }

            await updateMessage(streamingMsgId, {
              content: finalText,
              sources: [],
              entities: aiMessage.entities || [],
              keywords: aiMessage.keywords || [],
              relations: aiMessage.relations || [],
              versions,
              isStreaming: false,
            });
            setStreamingContent('');
            setNewMessageIds((prev) => new Set([...prev, streamingMsgId]));

            if (import.meta.env.DEV) {
              console.log('🔵 助手消息图谱：本轮增量合并', {
                sessionId,
                entities: (aiMessage.entities || []).length,
                relations: (aiMessage.relations || []).length,
                keywords: (aiMessage.keywords || []).length,
              });
            }
            // 按轮次增量合并，避免仅靠「从内存消息全量重建」时漏消息/重复 id 导致图谱停在前面几轮
            graphSyncService.updateFromChat(
              aiMessage.entities ?? [],
              aiMessage.relations ?? [],
              aiMessage.keywords ?? [],
              sessionId,
              streamingMsgId
            );

            const uid = useAuthStore.getState().user?.id;
            addHeritageGraphProduction(
              uid,
              (aiMessage.entities ?? []).length,
              (aiMessage.relations ?? []).length
            );

            setAssistantGraphSync({ messageId: streamingMsgId, phase: 'drawing' });
            if (graphSyncClearTimerRef.current) {
              clearTimeout(graphSyncClearTimerRef.current);
            }
            graphSyncClearTimerRef.current = setTimeout(() => {
              setAssistantGraphSync(null);
              graphSyncClearTimerRef.current = null;
            }, 600);

            setLoading(false);
            setStreaming(false);
            setIsThinking(false);
            streamingLockManager.release(streamingMsgId);
          },
          async (error) => {
            streamingAssistantMsgIdRef.current = null;
            cancelPendingStreamFlush();
            setStreamingContent('');
            setLoading(false);
            setStreaming(false);
            setIsThinking(false);
            setAssistantGraphSync(null);
            if (graphSyncClearTimerRef.current) {
              clearTimeout(graphSyncClearTimerRef.current);
              graphSyncClearTimerRef.current = null;
            }

            await updateMessage(streamingMsgId, {
              content: '抱歉，生成回复时出现错误。请重试。',
              isStreaming: false,
            });
            toast.error('发送失败', error.message || 'AI 回复生成失败');
            streamingLockManager.release(streamingMsgId);
          },
          () => {
            setAssistantGraphSync({ messageId: streamingMsgId, phase: 'drawing' });
          }
        );

        return () => {
          cancelPendingStreamFlush();
          abort();
        };
      } catch (error) {
        streamingAssistantMsgIdRef.current = null;
        cancelPendingStreamFlush();
        setIsThinking(false);
        streamingLockManager.release(streamingMsgId);
        throw error;
      }
    },
    [
      updateMessage,
      setLoading,
      setStreaming,
      setStreamingContent,
      setNewMessageIds,
      toast,
      cancelPendingStreamFlush,
    ]
  );

  // ========== 主函数：发送消息 ==========
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content || !content.trim()) {
        return;
      }

      try {
        // 1. 确保有活跃会话
        const activeSessionId = await ensureActiveSession();

        // 2. 构建用户消息
        const userMessage = buildUserMessage(activeSessionId, content);
        await addMessage(userMessage);
        setNewMessageIds((prev) => new Set([...prev, userMessage.id]));
        setQuotedMessage(null);

        // 3. 创建流式消息
        const streamingMsgId = createStreamingMessage(activeSessionId).id!;
        const streamingMessage = { ...createStreamingMessage(activeSessionId), id: streamingMsgId };
        await addMessage(streamingMessage);

        // 4. 启动流式响应
        const abort = await startStreamingResponse(
          activeSessionId,
          content,
          streamingMsgId
        );
        abortControllerRef.current = abort;
      } catch (error) {
        setLoading(false);
        setStreaming(false);
        const errorInfo = categorizeError(error);
        toast.error('发送失败', errorInfo.userMessage);
        throw error;
      }
    },
    [
      ensureActiveSession,
      buildUserMessage,
      createStreamingMessage,
      addMessage,
      startStreamingResponse,
      toast,
      setLoading,
      setStreaming,
    ]
  );

  const handleStopStreaming = useCallback(() => {
    cancelPendingStreamFlush();
    if (graphSyncClearTimerRef.current) {
      clearTimeout(graphSyncClearTimerRef.current);
      graphSyncClearTimerRef.current = null;
    }
    setAssistantGraphSync(null);

    const mid = streamingAssistantMsgIdRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }

    setStreamingContent('');
    setStreaming(false);
    setLoading(false);
    setIsThinking(false);

    streamingAssistantMsgIdRef.current = null;

    if (mid && currentSessionId) {
      void updateMessage(mid, { content: '已停止回答', isStreaming: false });
      streamingLockManager.release(mid);
    }

    toast.info('已停止', '已停止生成回复');
  }, [
    setStreaming,
    setLoading,
    toast,
    cancelPendingStreamFlush,
    currentSessionId,
    updateMessage,
  ]);

  useEffect(() => {
    return () => {
      if (graphSyncClearTimerRef.current) {
        clearTimeout(graphSyncClearTimerRef.current);
        graphSyncClearTimerRef.current = null;
      }
    };
  }, []);

  const handleFeedback = useCallback(
    async (messageId: string, feedback: 'helpful' | 'unclear') => {
      try {
        await updateMessage(messageId, { feedback });
        toast.success('感谢反馈', '您的反馈将帮助我们改进');
      } catch (error) {
        const errorInfo = categorizeError(error);
        toast.error('反馈失败', errorInfo.userMessage);
      }
    },
    [updateMessage, toast]
  );

  const handleFavorite = useCallback(
    async (messageId: string, currentStatus: boolean) => {
      try {
        const newStatus = !currentStatus;
        await updateMessage(messageId, { is_favorite: newStatus });
        toast.success(newStatus ? '已收藏' : '已取消收藏');
        window.dispatchEvent(new CustomEvent('favoriteChanged'));
      } catch (error) {
        const errorInfo = categorizeError(error);
        toast.error('操作失败', errorInfo.userMessage);
      }
    },
    [updateMessage, toast]
  );

  const handleCopy = useCallback((content: string) => {
    if (content?.trim()) {
      toast.success('已复制', '内容已复制到剪贴板');
    }
  }, [toast]);

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex > 0 && currentSessionId) {
        const userMessage = messages[messageIndex - 1];
        if (userMessage.role === 'user') {
          const aiMessage = messages[messageIndex];

          // 将所有现有版本的 is_current 设置为 false，准备接收新版本
          const existingVersions = aiMessage.versions || [];
          const versions = existingVersions.map((v) => ({ ...v, is_current: false }));

          await updateMessage(aiMessage.id, {
            content: '',
            sources: [],
            entities: [],
            keywords: [],
            versions,
            isStreaming: true,
          });

          const abort = await startStreamingResponse(
            currentSessionId,
            userMessage.content,
            aiMessage.id
          );
          abortControllerRef.current = abort;
        }
      }
    },
    [messages, currentSessionId, updateMessage, startStreamingResponse]
  );

  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        // 获取消息的 version_group_id（如果有）
        const message = messages.find((m) => m.id === messageId);
        const versionGroupId = message?.version_group_id;

        // 使用 addMessageVersion 并传递 versionGroupId，确保版本组功能正常工作
        addMessageVersion(messageId, newContent, versionGroupId);
        toast.success('已修改', '消息内容已更新，版本已保存');
      } catch (error) {
        toast.error('修改失败', '无法修改消息内容');
      }
    },
    [addMessageVersion, toast, messages]
  );

  const handleSwitchVersion = useCallback(
    async (messageId: string, versionId: string) => {
      try {
        switchMessageVersion(messageId, versionId);
        // 移除成功提示，界面变化本身就是反馈
      } catch (error) {
        toast.error('切换失败', '无法切换消息版本');
      }
    },
    [switchMessageVersion, toast]
  );

  const handleEditAndRegenerate = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        // 使用 chatStore 的 editAndRegenerate 方法
        // 该方法会创建新版本、更新消息内容、设置 version_group_id
        editAndRegenerate(messageId, newContent);

        // 等待状态更新完成（Zustand 的 set 是同步的，但我们需要重新获取最新状态）
        const updatedMessages = useChatStore.getState().messagesBySession[currentSessionId!] || [];
        const messageIndex = updatedMessages.findIndex((m) => m.id === messageId);

        if (messageIndex >= 0 && currentSessionId) {
          const nextMessage = updatedMessages[messageIndex + 1];
          if (nextMessage && nextMessage.role === 'assistant') {
            // 将所有现有版本的 is_current 设置为 false，准备接收新版本
            const existingVersions = nextMessage.versions || [];
            const versions = existingVersions.map((v) => ({ ...v, is_current: false }));

            await updateMessage(nextMessage.id, {
              content: '',
              sources: [],
              entities: [],
              keywords: [],
              versions,
              isStreaming: true,
            });

            const abort = await startStreamingResponse(
              currentSessionId,
              newContent,
              nextMessage.id
            );
            abortControllerRef.current = abort;
          } else {
            const streamingMsgId = `msg_${Date.now()}_assistant_streaming`;
            const streamingMessage: Message = {
              id: streamingMsgId,
              session_id: currentSessionId,
              role: 'assistant',
              content: '',
              created_at: new Date().toISOString(),
              isStreaming: true,
            };
            await addMessage(streamingMessage);

            const abort = await startStreamingResponse(
              currentSessionId,
              newContent,
              streamingMsgId
            );
            abortControllerRef.current = abort;
          }
          toast.success('已重新生成', '答案已根据修改后的问题重新生成');
        }
      } catch (error) {
        toast.error('操作失败', '无法编辑并重新生成');
      }
    },
    [updateMessage, addMessage, editAndRegenerate, toast, currentSessionId, startStreamingResponse]
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage(messageId);
        toast.success('已删除', '消息已删除');
      } catch (error) {
        toast.error('删除失败', '无法删除消息');
      }
    },
    [deleteMessage, toast]
  );

  const handleSyncVersionForGroup = useCallback(
    (versionGroupId: string, versionIndex: number) => {
      try {
        const { syncVersionForGroup } = useChatStore.getState();
        syncVersionForGroup(versionGroupId, versionIndex);
      } catch (error) {
        toast.error('同步失败', '无法同步版本组');
      }
    },
    [toast]
  );

  const handleQuestionClick = useCallback(
    (question: string) => {
      handleSendMessage(question).catch((error) => {
        const errorInfo = categorizeError(error);
        toast.error('发送失败', errorInfo.userMessage);
      });
    },
    [handleSendMessage, toast]
  );

  const handleKeywordClick = useCallback(
    (keyword: string) => {
      handleSendMessage(`${keyword}是什么？`).catch((error) => {
        const errorInfo = categorizeError(error);
        toast.error('发送失败', errorInfo.userMessage);
      });
    },
    [handleSendMessage, toast]
  );

  const handleNewChat = useCallback(async () => {
    await handleCreateSession();
  }, [handleCreateSession]);

  const handleSwitchSession = useCallback(
    async (sid: string) => {
      if (sid === currentSessionId) return;

      await switchSession(sid);
      useGraphStore.getState().setActiveChatSession(sid);

      const cachedBundle = useGraphStore.getState().graphsBySessionId[sid];
      if (sessionBundleHasContent(cachedBundle)) {
        if (import.meta.env.DEV) {
          console.log('✅ 切换会话：使用本会话缓存的图谱', {
            entities: cachedBundle.entities.length,
            relations: cachedBundle.relations.length,
          });
        }
        return;
      }

      const newMessages = useChatStore.getState().messagesBySession[sid] || [];
      const bundle = rebuildSessionGraphBundleFromMessages(newMessages);
      if (sessionBundleHasContent(bundle)) {
        graphSyncService.updateFromSnapshot(
          bundle.entities,
          bundle.relations,
          bundle.keywords,
          sid,
          bundle.messageId ?? undefined
        );
        if (import.meta.env.DEV) {
          console.log('✅ 切换会话：从历史消息合并回填图谱', {
            entities: bundle.entities.length,
            relations: bundle.relations.length,
          });
        }
      }
    },
    [currentSessionId, switchSession]
  );

  const handleDeleteSession = useCallback(
    async (sid: string) => {
      try {
        await deleteSession(sid);
        useGraphStore.getState().removeChatSessionGraph(sid);
        toast.success('已删除', '对话已删除');
      } catch (error) {
        const errorInfo = categorizeError(error);
        setError(errorInfo.userMessage);
      }
    },
    [deleteSession, setError, toast]
  );

  const handleExport = useCallback(
    (format: 'json' | 'txt' | 'md') => {
      if (!messages.length) {
        toast.warning('无法导出', '对话为空');
        return;
      }

      let content = '';
      const title = currentSession?.title || '对话导出';
      const timestamp = new Date()
        .toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        .replace(/\//g, '-')
        .replace(/:/g, '');
      const filename = `${title}_${timestamp}`;

      if (format === 'json') {
        const exportData = {
          title,
          exportedAt: new Date().toISOString(),
          metadata: {
            sessionId: currentSession?.id,
            messageCount: messages.length,
            createdAt: currentSession?.created_at,
          },
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
            isFavorite: m.is_favorite || false,
            feedback: m.feedback || null,
            entities: m.entities || [],
            sources: m.sources || [],
          })),
        };
        content = JSON.stringify(exportData, null, 2);
      } else if (format === 'md') {
        content = `# ${title}\n\n`;
        content += `**导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `**消息数量**: ${messages.length}\n\n`;
        content += `---\n\n`;

        messages.forEach((m) => {
          const role = m.role === 'user' ? '🧑 我' : `🤖 ${CHAT_ASSISTANT_DISPLAY_NAME}`;
          const time = new Date(m.created_at).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          content += `## ${role} · ${time}\n\n`;
          content += `${m.content}\n\n`;

          if (m.entities && m.entities.length > 0) {
            content += `**实体**: ${m.entities.map((e) => e.name).join(', ')}\n\n`;
          }

          content += `---\n\n`;
        });

        content += `\n*此文档由智能问答系统自动生成*\n`;
      } else {
        content = `${'='.repeat(60)}\n`;
        content += `${title}\n`;
        content += `${'='.repeat(60)}\n\n`;
        content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
        content += `消息数量：${messages.length}\n\n`;
        content += `${'='.repeat(60)}\n\n`;

        messages.forEach((m) => {
          const time = new Date(m.created_at).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const role = m.role === 'user' ? '我' : CHAT_ASSISTANT_DISPLAY_NAME;

          content += `[${time}] ${role}:\n`;
          content += `${m.content}\n\n`;

          if (m.is_favorite) {
            content += `⭐ 已收藏\n\n`;
          }
          if (m.feedback === 'helpful') {
            content += `👍 有帮助\n\n`;
          }
          if (m.feedback === 'unclear') {
            content += `👎 需改进\n\n`;
          }

          content += `${'-'.repeat(40)}\n\n`;
        });

        content += `\n${'='.repeat(60)}\n`;
        content += `*此文档由智能问答系统自动生成*\n`;
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功', `对话已导出为${format.toUpperCase()}格式`);
    },
    [messages, currentSession, toast]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--color-primary)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-[calc(100vh-4rem)] min-h-0 overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      <Sidebar
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
        onPinSession={(id) => pinSession(id)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <ChatToolbar
          sessionId={currentSessionId}
          sessionTitle={currentSession?.title}
          messageCount={messages.length}
          isPinned={currentSession?.is_pinned}
          onPin={() => {
            if (currentSessionId) {
              pinSession(currentSessionId);
            }
          }}
          onExport={handleExport}
          onShare={() => toast.info('分享功能', '分享链接已复制')}
          onDelete={() => {
            if (currentSessionId) {
              handleDeleteSession(currentSessionId);
            }
          }}
          onSettings={() => setShowSessionSettings(true)}
        />

        <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <WelcomeScreen
              onQuestionClick={handleQuestionClick}
              sessionId={currentSessionId || undefined}
            />
          ) : (
            <VirtualMessageList
              messages={messages}
              isLoading={isLoading}
              isThinking={isThinking}
              streamingContent={streamingContent}
              assistantGraphSync={assistantGraphSync}
              newMessageIds={newMessageIds}
              onFeedback={handleFeedback}
              onFavorite={handleFavorite}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSwitchVersion={handleSwitchVersion}
              onEditAndRegenerate={handleEditAndRegenerate}
              onSyncVersionForGroup={handleSyncVersionForGroup}
              onQuote={setQuotedMessage}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>

        <div
          className="flex-shrink-0 border-t"
          style={{
            borderColor: 'var(--color-border-light)',
            background: 'var(--color-surface)',
          }}
        >
          <div className="max-w-2xl mx-auto px-3 py-3">
            {quotedMessage && (
              <div className="mb-2">
                <MessageQuote message={quotedMessage} onRemove={() => setQuotedMessage(null)} />
              </div>
            )}
            <UnifiedInputArea
              sessionId={currentSessionId || undefined}
              onSend={handleSendMessage}
              isLoading={isLoading}
              isStreaming={isStreaming}
              onStop={handleStopStreaming}
            />
          </div>
        </div>

        {!autoScroll && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToBottom}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 p-3 rounded-full shadow-lg z-20"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </motion.button>
        )}
      </div>

      <RightPanel
        keywords={graphKeywords}
        entities={graphEntities}
        relations={graphRelations}
        sessionId={currentSessionId ?? undefined}
        messageId={graphSnapshotMessageId ?? undefined}
        onKeywordClick={handleKeywordClick}
        onLoadSnapshot={handleLoadSnapshot}
      />

      <AnimatePresence>
        {showCommandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onNewChat={handleNewChat}
            onToggleTheme={toggleMode}
          />
        )}

        {showMessageSearch && (
          <MessageSearch
            isOpen={showMessageSearch}
            messages={messages}
            onClose={() => setShowMessageSearch(false)}
            onMessageClick={(message) => {
              const element = document.getElementById(`message-${message.id}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-amber-500');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-amber-500');
                }, 2000);
              }
              setShowMessageSearch(false);
            }}
          />
        )}

        {showSessionSettings && currentSession && (
          <SessionSettings
            isOpen={showSessionSettings}
            session={currentSession}
            onClose={() => setShowSessionSettings(false)}
            onUpdateTitle={(title) => {
              if (currentSessionId) {
                updateSessionTitle(currentSessionId, title);
              }
            }}
            onPin={() => {
              if (currentSessionId) {
                pinSession(currentSessionId);
              }
            }}
            onArchive={() => {
              if (currentSessionId) {
                archiveSession(currentSessionId);
                toast.success(
                  currentSession?.is_archived ? '取消归档' : '已归档',
                  currentSession?.is_archived ? '对话已取消归档' : '对话已归档'
                );
                setShowSessionSettings(false);
              }
            }}
            onDelete={() => {
              handleDeleteSession(currentSessionId!);
              setShowSessionSettings(false);
            }}
            onAddTag={(tag: string) => {
              if (currentSessionId && tag.trim()) {
                addTagToSession(currentSessionId, tag.trim());
                toast.success('添加标签', `已添加标签 "${tag.trim()}"`);
              }
            }}
            onRemoveTag={(tag: string) => {
              if (currentSessionId) {
                removeTagFromSession(currentSessionId, tag);
                toast.success('移除标签', `已移除标签 "${tag}"`);
              }
            }}
          />
        )}

        {showKeyboardShortcuts && (
          <KeyboardShortcuts
            isOpen={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
