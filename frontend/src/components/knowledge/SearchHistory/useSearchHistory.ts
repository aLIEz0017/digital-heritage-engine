import { useCallback } from 'react';
import { knowledgeApi } from '../../../api/knowledge';
import { SearchHistoryItem } from './index';

export function useSearchHistory(userId?: string) {
  const saveHistory = useCallback(
    async (keyword: string, filters: SearchHistoryItem['filters'], resultCount: number) => {
      try {
        await knowledgeApi.saveSearchHistory(userId, keyword, filters, resultCount);
      } catch (error) {
        console.error('保存搜索历史失败:', error);
      }
    },
    [userId]
  );

  return { saveHistory };
}
