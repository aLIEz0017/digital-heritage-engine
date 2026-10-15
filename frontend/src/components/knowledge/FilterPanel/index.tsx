import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import useKnowledgeGraphStore from '../../../stores/knowledgeGraphStore';
import { getCategoryColor, getCategoryLabel } from '../../../constants/categories';
import type { Entity } from '../../../api/knowledge';

interface FilterPanelProps {
  entities?: Entity[];
  onFilterChange?: (filters: {
    searchQuery: string;
    categories: string[];
    minImportance: number;
  }) => void;
}

// 颜色映射黑科技，保持和图谱节点颜色完全一致
const getExactHexColor = (categoryName: string | undefined) => {
  const cat = String(categoryName || 'unknown').toLowerCase();
  if (cat.includes('inheritor') || cat.includes('传承人')) return '#a855f7'; 
  if (cat.includes('material') || cat.includes('材料')) return '#22c55e'; 
  if (cat.includes('region') || cat.includes('location') || cat.includes('地域') || cat.includes('地点')) return '#06b6d4'; 
  if (cat.includes('period') || cat.includes('时期') || cat.includes('年代')) return '#3b82f6'; 
  if (cat.includes('technique') || cat.includes('skill') || cat.includes('技艺')) return '#f59e0b'; 
  if (cat.includes('work') || cat.includes('作品')) return '#ef4444'; 
  if (cat.includes('pattern') || cat.includes('图案')) return '#ec4899'; 
  if (cat.includes('organization') || cat.includes('机构')) return '#6366f1'; 
  
  const orig = getCategoryColor(cat);
  return (orig && !orig.includes('var')) ? orig : '#8b5cf6'; 
};

export default function FilterPanel({ entities = [], onFilterChange }: FilterPanelProps) {
  const { toggleFilterPanel, filterPanelCollapsed, filters, setFilters } = useKnowledgeGraphStore();

  // 【黑科技 1：动态提取当前图谱存在的分类】
  const dynamicCategories = useMemo(() => {
    if (!entities) return [];
    const types = new Set<string>();
    entities.forEach(e => {
      const type = e.type || (e as any).category;
      if (type) types.add(type);
    });
    return Array.from(types).map(t => ({
      value: t,
      label: getCategoryLabel(t) || t,
      color: getExactHexColor(t)
    }));
  }, [entities]);

  const updateFilter = (
    key: keyof typeof filters,
    value: string | string[] | number
  ) => {
    const newFilters = { [key]: value };
    setFilters(newFilters);
    onFilterChange?.({ ...filters, ...newFilters });
  };

  const toggleArrayValue = (key: string, value: string) => {
    const currentValues = ((filters as any)[key] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    updateFilter(key, newValues);
  };

  const resetFilters = () => {
    const resetState = {
      searchQuery: '',
      categories: [],
      minImportance: 0,
      regions: [] as string[],
      periods: [] as string[],
    };
    setFilters(resetState);
    onFilterChange?.(resetState);
  };

  const hasActiveFilters = () => {
    return (
      filters.searchQuery !== '' ||
      (filters.categories && filters.categories.length > 0) ||
      filters.minImportance > 0
    );
  };

  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: filterPanelCollapsed ? -320 : 0, opacity: filterPanelCollapsed ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-full backdrop-blur-xl h-full flex flex-col relative overflow-hidden"
      style={{ background: 'transparent' }}
    >
      <div className="relative z-10 flex-1 overflow-y-auto space-y-6">
        
        {/* 1. 关键词搜索 */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
            节点检索
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              placeholder="搜索当前视图中的实体..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:ring-2 focus:ring-primary focus:outline-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        {/* 2. 实体分类多选（动态生成） */}
        {dynamicCategories.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
              <span>包含分类</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('categories', [])}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !filters.categories || filters.categories.length === 0 ? 'ring-2 ring-primary ring-offset-1' : ''
                }`}
                style={{
                  background: !filters.categories || filters.categories.length === 0 ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: !filters.categories || filters.categories.length === 0 ? 'white' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                全部
              </button>
              {dynamicCategories.map((cat) => {
                const isSelected = filters.categories && filters.categories.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => toggleArrayValue('categories', cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected ? 'shadow-md scale-105' : 'hover:bg-opacity-80'
                    }`}
                    style={{
                      background: isSelected ? cat.color : 'var(--color-surface)',
                      color: isSelected ? '#fff' : 'var(--color-text-primary)',
                      border: isSelected ? 'none' : '1px solid var(--color-border)'
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. 重要性滑动条 */}
        <div>
          <label className="text-sm font-medium mb-3 flex items-center justify-between" style={{ color: 'var(--color-text-secondary)' }}>
            <span>权重阀值</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface border text-primary">
              ≥ {(filters.minImportance || 0).toFixed(1)}
            </span>
          </label>
          <div className="px-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={filters.minImportance || 0}
              onChange={(e) => updateFilter('minImportance', parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-primary) ${(filters.minImportance || 0) * 100}%, var(--color-border) ${(filters.minImportance || 0) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* 4. 重置按钮 */}
        {hasActiveFilters() && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={resetFilters}
            className="w-full py-2.5 mt-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white group border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <X size={14} className="group-hover:rotate-90 transition-transform" />
            重置筛选图谱
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}