import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Entity, Relation } from '../types/chat';

const GRAPH_STORAGE_VERSION = 8;

export interface SessionGraphBundle {
  entities: Entity[];
  relations: Relation[];
  keywords: string[];
  messageId?: string | null;
  lastUpdated: number;
}

function entityCanonKey(e: Entity): string {
  return `${(e.name || '').trim().toLowerCase()}|${e.type}`;
}

/** 按名称+类型合并节点，并把关系端点 id 映射到保留的规范 id（跨轮、跨消息 id 不一致时仍能连边） */
function mergeBundles(
  prev: SessionGraphBundle,
  newEntities: Entity[],
  newRelations: Relation[],
  newKeywords: string[] | undefined,
  messageId?: string | null
): SessionGraphBundle {
  const idRemap = new Map<string, string>();
  const entityByCanon = new Map<string, Entity>();
  const usedIds = new Set<string>();

  const allocateUniqueId = (preferredId: string, canonKey: string): string => {
    const basePreferred = String(preferredId || '').trim();
    const baseCanon = `canon:${canonKey}`;
    const seed = basePreferred || baseCanon;

    if (!usedIds.has(seed)) {
      usedIds.add(seed);
      return seed;
    }

    let i = 1;
    let candidate = `${baseCanon}#${i}`;
    while (usedIds.has(candidate)) {
      i += 1;
      candidate = `${baseCanon}#${i}`;
    }
    usedIds.add(candidate);
    return candidate;
  };

  const absorb = (e: Entity) => {
    const key = entityCanonKey(e);
    const existing = entityByCanon.get(key);
    const incomingId = String(e.id);
    if (!existing) {
      const preferredTaken = incomingId ? usedIds.has(incomingId) : false;
      const normalizedId = allocateUniqueId(incomingId, key);
      const normalized: Entity = { ...e, id: normalizedId };
      entityByCanon.set(key, normalized);
      if (incomingId !== normalizedId && !preferredTaken && !idRemap.has(incomingId)) {
        idRemap.set(incomingId, normalizedId);
      }
      return;
    }

    if (incomingId !== existing.id && !idRemap.has(incomingId)) {
      idRemap.set(incomingId, String(existing.id));
    }
    if (e.description && !existing.description) {
      existing.description = e.description;
    }
    const er = e.relevance ?? 0;
    const ex = existing.relevance ?? 0;
    if (er > ex) {
      existing.relevance = e.relevance;
    }
    const ei = e.importance ?? 0;
    const exi = existing.importance ?? 0;
    if (ei > exi) {
      existing.importance = e.importance;
    }
    if (e.metadata && Object.keys(e.metadata).length > 0) {
      existing.metadata = { ...existing.metadata, ...e.metadata };
    }
  };

  prev.entities.forEach(absorb);
  newEntities.forEach(absorb);

  const resolveId = (id: string): string => {
    let cur = String(id);
    const seen = new Set<string>();
    while (idRemap.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = idRemap.get(cur)!;
    }
    return cur;
  };

  const remapRelation = (r: Relation): Relation => ({
    ...r,
    source: resolveId(String(r.source)),
    target: resolveId(String(r.target)),
  });

  const mergedEntities = Array.from(entityByCanon.values());

  const relationMap = new Map<string, Relation>();
  prev.relations.forEach((r) => {
    const rr = remapRelation(r);
    relationMap.set(`${rr.source}-${rr.target}-${rr.type}`, rr);
  });
  newRelations.forEach((r) => {
    const rr = remapRelation(r);
    relationMap.set(`${rr.source}-${rr.target}-${rr.type}`, rr);
  });
  const mergedRelations = Array.from(relationMap.values());

  const keywordSet = new Set([...prev.keywords, ...(newKeywords ?? [])]);
  const mergedKeywords = Array.from(keywordSet);

  return {
    entities: mergedEntities,
    relations: mergedRelations,
    keywords: mergedKeywords,
    messageId: messageId ?? prev.messageId,
    lastUpdated: Date.now(),
  };
}

export function sessionBundleHasContent(bundle?: SessionGraphBundle): boolean {
  if (!bundle) return false;
  return (
    bundle.entities.length > 0 ||
    bundle.relations.length > 0 ||
    bundle.keywords.length > 0
  );
}

/** 单条消息上用于从会话列表合并图谱的最小字段 */
export type MessageGraphSlice = {
  id: string;
  role: string;
  created_at: string;
  entities?: Entity[];
  relations?: Relation[];
  keywords?: string[];
};

/**
 * 按时间顺序合并会话内所有「带实体的助手消息」的图谱。
 * 用于切回会话 / 无 zustand 缓存时从消息列表恢复完整累积图（避免只用最后一条 AI 消息）。
 */
export function rebuildSessionGraphBundleFromMessages(
  messages: MessageGraphSlice[]
): SessionGraphBundle {
  const slices = [...messages]
    .filter((m) => {
      if (m.role !== 'assistant') return false;
      if ((m as { isStreaming?: boolean }).isStreaming) return false;
      const ne = m.entities?.length ?? 0;
      const nr = m.relations?.length ?? 0;
      const nk = m.keywords?.length ?? 0;
      return ne > 0 || nr > 0 || nk > 0;
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let acc: SessionGraphBundle = {
    entities: [],
    relations: [],
    keywords: [],
    lastUpdated: Date.now(),
  };
  for (const m of slices) {
    acc = mergeBundles(
      acc,
      m.entities || [],
      m.relations || [],
      m.keywords,
      m.id
    );
  }
  return acc;
}

interface GraphState {
  entities: Entity[];
  relations: Relation[];
  keywords: string[];
  sessionId: string | null;
  messageId: string | null;
  lastUpdated: number;
  source: 'chat' | 'knowledge' | 'snapshot' | null;

  /** 问答：每个对话独立的累积图谱快照 */
  graphsBySessionId: Record<string, SessionGraphBundle>;
  /** 当前展示哪条对话的侧边栏图谱（通常为当前激活会话） */
  activeChatSessionId: string | null;

  /** 知识库导入的图谱：持久化，仅在新一次 knowledge 导入时被覆盖；切页/进聊天不因会话桶为空而清空 */
  knowledgeImportSnapshot: SessionGraphBundle | null;

  setEntities: (entities: Entity[]) => void;
  setRelations: (relations: Relation[]) => void;
  setKeywords: (keywords: string[]) => void;

  /** 挂载某条会话的侧边栏图谱到全局展示字段 */
  setActiveChatSession: (sessionId: string | null) => void;
  removeChatSessionGraph: (sessionId: string) => void;

  updateGraphData: (
    entities?: Entity[],
    relations?: Relation[],
    keywords?: string[],
    sessionId?: string,
    messageId?: string,
    source?: 'chat' | 'knowledge' | 'snapshot'
  ) => void;
  clearGraphData: () => void;
  mergeGraphData: (entities: Entity[], relations: Relation[], keywords?: string[]) => void;

  mergeChatSessionGraph: (
    sessionId: string,
    entities: Entity[],
    relations: Relation[],
    keywords?: string[],
    messageId?: string | null
  ) => void;
  replaceChatSessionGraph: (
    sessionId: string,
    entities: Entity[],
    relations: Relation[],
    keywords?: string[],
    messageId?: string | null
  ) => void;

  refreshDisplayedChatGraph: () => void;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      entities: [],
      relations: [],
      keywords: [],
      sessionId: null,
      messageId: null,
      lastUpdated: 0,
      source: null,
      graphsBySessionId: {},
      activeChatSessionId: null,
      knowledgeImportSnapshot: null,

      setEntities: (entities) => {
        set({ entities, lastUpdated: Date.now() });
      },

      setRelations: (relations) => {
        set({ relations, lastUpdated: Date.now() });
      },

      setKeywords: (keywords) => {
        set({ keywords, lastUpdated: Date.now() });
      },

      refreshDisplayedChatGraph: () => {
        const { activeChatSessionId } = get();
        if (!activeChatSessionId) return;
        get().setActiveChatSession(activeChatSessionId);
      },

      setActiveChatSession: (sessionId) => {
        if (!sessionId) {
          set({
            entities: [],
            relations: [],
            keywords: [],
            sessionId: null,
            messageId: null,
            lastUpdated: Date.now(),
            source: null,
            activeChatSessionId: null,
          });
          return;
        }

        const bundle = get().graphsBySessionId[sessionId];
        const now = Date.now();
        if (!sessionBundleHasContent(bundle)) {
          const k = get().knowledgeImportSnapshot;
          if (k && sessionBundleHasContent(k)) {
            set({
              entities: k.entities,
              relations: k.relations,
              keywords: k.keywords,
              sessionId,
              messageId: null,
              lastUpdated: now,
              source: 'knowledge',
              activeChatSessionId: sessionId,
            });
            return;
          }
          set({
            entities: [],
            relations: [],
            keywords: [],
            sessionId,
            messageId: null,
            lastUpdated: now,
            source: 'chat',
            activeChatSessionId: sessionId,
          });
          return;
        }

        const b = bundle!;
        set({
          entities: b.entities,
          relations: b.relations,
          keywords: b.keywords,
          sessionId,
          messageId: b.messageId ?? null,
          lastUpdated: now,
          source: 'chat',
          activeChatSessionId: sessionId,
        });
      },

      removeChatSessionGraph: (removedSessionId) => {
        set((s) => {
          const graphsBySessionId = { ...s.graphsBySessionId };
          delete graphsBySessionId[removedSessionId];
          let nextDisplayed = {};
          if (s.activeChatSessionId === removedSessionId) {
            nextDisplayed = {
              entities: [],
              relations: [],
              keywords: [],
              sessionId: null,
              messageId: null,
              lastUpdated: Date.now(),
              source: null,
              activeChatSessionId: null,
            };
          }
          return {
            graphsBySessionId,
            ...nextDisplayed,
          };
        });
      },

      replaceChatSessionGraph: (sessionId, entities, relations, keywords, messageId) => {
        const bundle: SessionGraphBundle = {
          entities: entities ?? [],
          relations: relations ?? [],
          keywords: keywords ?? [],
          messageId: messageId ?? null,
          lastUpdated: Date.now(),
        };
        const now = Date.now();
        set((s) => {
          const next: Partial<GraphState> = {
            graphsBySessionId: { ...s.graphsBySessionId, [sessionId]: bundle },
            lastUpdated: now,
          };
          const shouldMirror =
            !s.activeChatSessionId || s.activeChatSessionId === sessionId;
          if (shouldMirror) {
            next.entities = bundle.entities;
            next.relations = bundle.relations;
            next.keywords = bundle.keywords;
            next.sessionId = sessionId;
            next.messageId = bundle.messageId ?? null;
            next.source = 'chat';
          }
          return next;
        });
      },

      mergeChatSessionGraph: (sessionId, newEntities, newRelations, newKeywords, messageId) => {
        const state = get();
        const prev = state.graphsBySessionId[sessionId];
        const base: SessionGraphBundle = prev ?? {
          entities: [],
          relations: [],
          keywords: [],
          lastUpdated: Date.now(),
        };
        const merged = mergeBundles(base, newEntities, newRelations, newKeywords, messageId);
        const now = Date.now();
        set((s) => {
          const next: Partial<GraphState> = {
            graphsBySessionId: { ...s.graphsBySessionId, [sessionId]: merged },
            lastUpdated: now,
          };
          const shouldMirror =
            !s.activeChatSessionId || s.activeChatSessionId === sessionId;
          if (shouldMirror) {
            next.entities = merged.entities;
            next.relations = merged.relations;
            next.keywords = merged.keywords;
            next.sessionId = sessionId;
            next.messageId = merged.messageId ?? null;
            next.source = 'chat';
          }
          return next;
        });
      },

      updateGraphData: (entities, relations, keywords, sessionId, messageId, source) => {
        if (source === 'knowledge') {
          const now = Date.now();
          const nextEntities = entities !== undefined ? entities : get().entities;
          const nextRelations = relations !== undefined ? relations : get().relations;
          const nextKeywords = keywords !== undefined ? keywords : get().keywords;
          const snapshot: SessionGraphBundle = {
            entities: nextEntities,
            relations: nextRelations,
            keywords: nextKeywords,
            messageId: null,
            lastUpdated: now,
          };
          set({
            lastUpdated: now,
            sessionId: null,
            messageId: null,
            source: 'knowledge',
            entities: nextEntities,
            relations: nextRelations,
            keywords: nextKeywords,
            knowledgeImportSnapshot: snapshot,
          });
          return;
        }

        if (source === 'snapshot' && sessionId) {
          get().replaceChatSessionGraph(sessionId, entities ?? [], relations ?? [], keywords, messageId);
          return;
        }

        const updates: Partial<GraphState> = {
          lastUpdated: Date.now(),
        };
        if (entities !== undefined) updates.entities = entities;
        if (relations !== undefined) updates.relations = relations;
        if (keywords !== undefined) updates.keywords = keywords;
        if (sessionId !== undefined) updates.sessionId = sessionId;
        if (messageId !== undefined) updates.messageId = messageId;
        if (source !== undefined) updates.source = source;
        set(updates);
      },

      clearGraphData: () => {
        set({
          entities: [],
          relations: [],
          keywords: [],
          sessionId: null,
          messageId: null,
          lastUpdated: Date.now(),
          source: null,
          graphsBySessionId: {},
          activeChatSessionId: null,
          knowledgeImportSnapshot: null,
        });
      },

      mergeGraphData: (newEntities, newRelations, newKeywords) => {
        const active = get().activeChatSessionId;
        if (active) {
          get().mergeChatSessionGraph(active, newEntities, newRelations, newKeywords, undefined);
          return;
        }
        const state = get();
        const merged = mergeBundles(
          {
            entities: state.entities,
            relations: state.relations,
            keywords: state.keywords,
            lastUpdated: state.lastUpdated,
          },
          newEntities,
          newRelations,
          newKeywords,
          state.messageId
        );
        set({
          entities: merged.entities,
          relations: merged.relations,
          keywords: merged.keywords,
          messageId: merged.messageId ?? null,
          lastUpdated: merged.lastUpdated,
        });
      },
    }),
    {
      name: 'graph-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        graphsBySessionId: state.graphsBySessionId,
        activeChatSessionId: state.activeChatSessionId,
        knowledgeImportSnapshot: state.knowledgeImportSnapshot,
      }),
      version: GRAPH_STORAGE_VERSION,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 6) {
          try {
            localStorage.removeItem('graph-storage');
          } catch {
            /* ignore */
          }
          return {
            graphsBySessionId: {},
            activeChatSessionId: null,
            knowledgeImportSnapshot: null,
          };
        }
        if (version < 8 && persistedState && typeof persistedState === 'object') {
          const p = persistedState as Record<string, unknown>;
          if (!('knowledgeImportSnapshot' in p)) {
            return { ...p, knowledgeImportSnapshot: null };
          }
        }
        return persistedState;
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('图谱数据恢复失败:', error);
            try {
              localStorage.removeItem('graph-storage');
            } catch {
              /* ignore */
            }
          } else if (state) {
            queueMicrotask(() => {
              const s = useGraphStore.getState();
              if (s.activeChatSessionId) {
                s.setActiveChatSession(s.activeChatSessionId);
              } else {
                const k = s.knowledgeImportSnapshot;
                if (k && sessionBundleHasContent(k)) {
                  useGraphStore.setState({
                    entities: k.entities,
                    relations: k.relations,
                    keywords: k.keywords,
                    source: 'knowledge',
                    sessionId: null,
                    messageId: null,
                    lastUpdated: k.lastUpdated,
                  });
                }
              }
            });
          }
          if (import.meta.env.DEV && state?.graphsBySessionId) {
            console.log('图谱会话缓存已加载:', Object.keys(state.graphsBySessionId).length, 'sessions');
          }
        };
      },
    }
  )
);
