import { useState, useEffect, useCallback } from 'react';

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  filters?: {
    types?: string[];
    regions?: string[];
    periods?: string[];
  };
}

const STORAGE_KEY = 'heritage_search_history';
const MAX_HISTORY_ITEMS = 20;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const saveToStorage = useCallback((items: SearchHistoryItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
  }, []);

  const addSearch = useCallback((query: string, filters?: SearchHistoryItem['filters']) => {
    if (!query.trim()) return;

    setHistory(prev => {
      const existing = prev.findIndex(item => item.query === query);
      
      let newHistory: SearchHistoryItem[];
      
      if (existing !== -1) {
        newHistory = [
          { ...prev[existing], timestamp: Date.now() },
          ...prev.slice(0, existing),
          ...prev.slice(existing + 1),
        ];
      } else {
        const newItem: SearchHistoryItem = {
          id: `search-${Date.now()}`,
          query: query.trim(),
          timestamp: Date.now(),
          filters,
        };
        newHistory = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      }
      
      saveToStorage(newHistory);
      return newHistory;
    });
  }, [saveToStorage]);

  const removeSearch = useCallback((id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== id);
      saveToStorage(newHistory);
      return newHistory;
    });
  }, [saveToStorage]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getRecentSearches = useCallback((limit: number = 5) => {
    return history.slice(0, limit);
  }, [history]);

  return {
    history,
    addSearch,
    removeSearch,
    clearHistory,
    getRecentSearches,
  };
}
