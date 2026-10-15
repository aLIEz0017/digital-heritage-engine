import apiClient from './client';

export interface FavoriteItem {
  id: string;
  user_id: string;
  message_id: string;
  message_content?: string;
  session_id?: string;
  created_at: string;
}

export interface FavoriteListResponse {
  favorites: FavoriteItem[];
  total: number;
  page: number;
  page_size: number;
}

export const favoritesApi = {
  getFavorites: async (page = 1, pageSize = 20): Promise<FavoriteListResponse> => {
    try {
      const response = await apiClient.get<FavoriteListResponse>('/favorites', {
        params: { page, page_size: pageSize },
      });
      return response;
    } catch (error) {
      console.warn('API unavailable for favorites');
      return {
        favorites: [],
        total: 0,
        page: 1,
        page_size: pageSize,
      };
    }
  },

  addFavorite: async (messageId: string): Promise<FavoriteItem> => {
    const response = await apiClient.post<FavoriteItem>(`/favorites/${messageId}`);
    return response;
  },

  removeFavorite: async (messageId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/favorites/${messageId}`);
    return response;
  },

  checkFavorite: async (messageId: string): Promise<{ is_favorite: boolean }> => {
    try {
      const response = await apiClient.get<{ is_favorite: boolean }>(
        `/favorites/${messageId}/check`
      );
      return response;
    } catch (error) {
      return { is_favorite: false };
    }
  },
};

export default favoritesApi;
