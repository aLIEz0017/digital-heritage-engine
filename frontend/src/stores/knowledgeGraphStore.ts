import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { knowledgeRepository } from '../data/repositories/knowledgeRepository';
import { dataInitializer } from '../data/dataInitializer';
import { apiAdapterManager } from '../data/apiAdapter';
import { syncManager } from '../data/syncManager';
import type { FavoriteItem, FeedbackItem } from '../data/models';

type ViewMode = 'graph' | 'list';
type LayoutType = 'force' | 'circular' | 'hierarchical' | 'radial' | 'grid';
type SortBy = 'relevance' | 'name' | 'date';

interface GraphState {
  viewMode: ViewMode;
  selectedNode: string | null;
  highlightedNodes: string[];
  layoutType: LayoutType;
  zoomLevel: number;
  filterPanelCollapsed: boolean;
  detailPanelCollapsed: boolean;
}

// 【安全修改】：保留老的属性防止其他组件报错，新增 filters 嵌套对象
interface FilterState {
  category: string;
  keyword: string;
  sortBy: SortBy;
  filters: {
    searchQuery: string;
    categories: string[];
    minImportance: number;
    regions: string[];
    periods: string[];
  };
}

interface UserInteractionState {
  favorites: FavoriteItem[];
  favoriteEntities: Set<string>;
  feedbacks: FeedbackItem[];
  isLoadingFavorites: boolean;
  isLoadingFeedbacks: boolean;
}

interface KnowledgeGraphStore extends GraphState, FilterState, UserInteractionState {
  setViewMode: (mode: ViewMode) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setHighlightedNodes: (nodeIds: string[]) => void;
  setLayoutType: (type: LayoutType) => void;
  setZoomLevel: (level: number) => void;
  toggleFilterPanel: () => void;
  toggleDetailPanel: () => void;

  setCategory: (category: string) => void;
  setKeyword: (keyword: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  
  // 【新增】：暴露 setFilters 方法
  setFilters: (filters: Partial<FilterState['filters']>) => void;

  resetFilter: () => void;

  loadFavorites: (userId: string) => Promise<void>;
  addFavorite: (userId: string, entityId: string) => Promise<boolean>;
  removeFavorite: (userId: string, entityId: string) => Promise<boolean>;
  checkFavorite: (userId: string, entityId: string) => Promise<boolean>;
  isFavorite: (entityId: string) => boolean;

  loadFeedbacks: (entityId: string) => Promise<void>;
  loadUserFeedbacks: (userId: string) => Promise<void>;
  addFeedback: (
    userId: string,
    entityId: string,
    feedbackType: string,
    content?: string,
    rating?: number
  ) => Promise<boolean>;
}

const useKnowledgeGraphStore = create<KnowledgeGraphStore>()(
  persist(
    (set) => ({
      viewMode: 'graph',
      selectedNode: null,
      highlightedNodes: [],
      layoutType: 'force',
      zoomLevel: 1,
      filterPanelCollapsed: false,
      detailPanelCollapsed: false,
      category: 'all',
      keyword: '',
      sortBy: 'relevance',

      // 【新增】：初始化 filters 默认状态
      filters: {
        searchQuery: '',
        categories: [],
        minImportance: 0,
        regions: [],
        periods: [],
      },

      setViewMode: (mode) => set({ viewMode: mode }),

      setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),

      setHighlightedNodes: (nodeIds) => set({ highlightedNodes: nodeIds }),

      setLayoutType: (type) => set({ layoutType: type }),

      setZoomLevel: (level) => set({ zoomLevel: level }),

      toggleFilterPanel: () =>
        set((state) => ({
          filterPanelCollapsed: !state.filterPanelCollapsed,
        })),

      toggleDetailPanel: () =>
        set((state) => ({
          detailPanelCollapsed: !state.detailPanelCollapsed,
        })),

      setCategory: (category) => set({ category }),

      setKeyword: (keyword) => set({ keyword }),

      setSortBy: (sortBy) => set({ sortBy }),

      // 【新增】：实现 setFilters
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilter: () =>
        set({
          category: 'all',
          keyword: '',
          sortBy: 'relevance',
          // 重置时把新筛选器也归零
          filters: {
            searchQuery: '',
            categories: [],
            minImportance: 0,
            regions: [],
            periods: [],
          },
        }),

      favorites: [],
      favoriteEntities: new Set<string>(),
      feedbacks: [],
      isLoadingFavorites: false,
      isLoadingFeedbacks: false,

      loadFavorites: async (userId: string) => {
        set({ isLoadingFavorites: true });
        try {
          const favorites = await knowledgeRepository.getFavorites(userId);
          const favoriteEntities = new Set(favorites.map((f) => f.entity_id));
          set({ favorites, favoriteEntities, isLoadingFavorites: false });
        } catch (error) {
          console.warn('Failed to load favorites:', error);
          set({ isLoadingFavorites: false });
        }
      },

      addFavorite: async (userId: string, entityId: string) => {
        try {
          const entity = await knowledgeRepository.getEntity(entityId);
          const entityType = entity?.type || 'unknown';
          const entityName = entity?.name || 'Unknown';

          await knowledgeRepository.addFavorite(userId, entityId, entityType, entityName);

          const newFavorite: FavoriteItem = {
            id: `fav_${Date.now()}`,
            user_id: userId,
            entity_id: entityId,
            entity_type: entityType,
            entity_name: entityName,
            created_at: new Date().toISOString(),
          };
          set((state) => ({
            favorites: [...state.favorites, newFavorite],
            favoriteEntities: new Set([...state.favoriteEntities, entityId]),
          }));

          if (apiAdapterManager.shouldUseRemote()) {
            syncManager.addOperation('add_favorite', { userId, entityId }).catch(() => {});
          }

          return true;
        } catch (error) {
          console.warn('Failed to add favorite:', error);
          return false;
        }
      },

      removeFavorite: async (userId: string, entityId: string) => {
        try {
          await knowledgeRepository.removeFavorite(userId, entityId);

          set((state) => {
            const newFavorites = state.favorites.filter((f) => f.entity_id !== entityId);
            const newFavoriteEntities = new Set(state.favoriteEntities);
            newFavoriteEntities.delete(entityId);
            return { favorites: newFavorites, favoriteEntities: newFavoriteEntities };
          });

          if (apiAdapterManager.shouldUseRemote()) {
            syncManager.addOperation('remove_favorite', { userId, entityId }).catch(() => {});
          }

          return true;
        } catch (error) {
          console.warn('Failed to remove favorite:', error);
          return false;
        }
      },

      checkFavorite: async (userId: string, entityId: string) => {
        try {
          const isFav = await knowledgeRepository.isFavorite(userId, entityId);
          if (isFav) {
            set((state) => ({
              favoriteEntities: new Set([...state.favoriteEntities, entityId]),
            }));
          }
          return isFav;
        } catch (error) {
          console.warn('Failed to check favorite:', error);
          return false;
        }
      },

      isFavorite: (entityId: string): boolean => {
        const state = useKnowledgeGraphStore.getState() as KnowledgeGraphStore;
        return state.favoriteEntities.has(entityId);
      },

      loadFeedbacks: async (entityId: string) => {
        set({ isLoadingFeedbacks: true });
        try {
          const feedbacks = await knowledgeRepository.getFeedbacks(entityId);
          set({ feedbacks, isLoadingFeedbacks: false });
        } catch (error) {
          console.warn('Failed to load feedbacks:', error);
          set({ isLoadingFeedbacks: false });
        }
      },

      loadUserFeedbacks: async (userId: string) => {
        set({ isLoadingFeedbacks: true });
        try {
          const feedbacks = await knowledgeRepository.getUserFeedbacks(userId);
          set({ feedbacks, isLoadingFeedbacks: false });
        } catch (error) {
          console.warn('Failed to load user feedbacks:', error);
          set({ isLoadingFeedbacks: false });
        }
      },

      addFeedback: async (
        userId: string,
        entityId: string,
        feedbackType: string,
        content?: string,
        rating?: number
      ) => {
        try {
          await knowledgeRepository.addFeedback(userId, entityId, feedbackType, content, rating);

          const newFeedback: FeedbackItem = {
            id: `fb_${Date.now()}`,
            user_id: userId,
            entity_id: entityId,
            feedback_type: feedbackType,
            content,
            rating,
            created_at: new Date().toISOString(),
          };
          set((state) => ({
            feedbacks: [...state.feedbacks, newFeedback],
          }));

          if (apiAdapterManager.shouldUseRemote()) {
            syncManager
              .addOperation('add_feedback', { userId, entityId, feedbackType, content, rating })
              .catch(() => {});
          }

          return true;
        } catch (error) {
          console.warn('Failed to add feedback:', error);
          return false;
        }
      },
    }),
    {
      name: 'knowledge-graph-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        layoutType: state.layoutType,
        filterPanelCollapsed: state.filterPanelCollapsed,
        detailPanelCollapsed: state.detailPanelCollapsed,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  dataInitializer.initialize().catch((e) => {
    console.error('Failed to initialize knowledge data:', e);
  });
}

export default useKnowledgeGraphStore;