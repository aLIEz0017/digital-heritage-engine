import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts';
import type { GraphData as KnowledgeGraphData } from '../../../api/knowledge';
import useKnowledgeGraphStore from '../../../stores/knowledgeGraphStore';
import { useThemeStore } from '../../../stores/themeStore';
import { Activity, Minimize2, Bookmark } from 'lucide-react';
import { getCategoryColor, getCategoryLabel } from '../../../constants/categories';
import { formatRelationTypeLabel } from '../../../config';
import type { Entity } from '../../../types/graph';
import type { Relation } from '../../../types/chat';

function escapeKgTooltip(unsafe: string): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveNodeDisplayName(nodes: Array<{ id?: string; name?: string }>, ref: string): string {
  const s = String(ref ?? '').trim();
  if (!s) return '';
  const byId = nodes.find((n) => String(n.id) === s);
  if (byId?.name) return byId.name;
  const byName = nodes.find((n) => n.name === s);
  if (byName?.name) return byName.name;
  return s;
}

export interface KnowledgeGraphProps {
  /** 仅来自快照库导入；不使用 mock、不读取全局 graphStore，避免与聊天图谱互相覆盖 */
  entities: Entity[];
  relations: Relation[];
}

export default function KnowledgeGraph({ entities, relations }: KnowledgeGraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [rawGraphData, setRawGraphData] = useState<KnowledgeGraphData | null>(null);
  const [, setRetryCount] = useState(0);
  const [isMobile] = useState(false);

  const { selectedNode, highlightedNodes, layoutType, setSelectedNode, setHighlightedNodes, filters } =
    useKnowledgeGraphStore();

  const { resolvedMode } = useThemeStore();
  const [performanceStats, setPerformanceStats] = useState<{
    fps: number;
    nodeCount: number;
    lodLevel: number;
  } | null>(null);

  useEffect(() => {
    if (!entities.length) {
      setRawGraphData(null);
      return;
    }
    const knowledgeGraphData: KnowledgeGraphData = {
      nodes: entities.map((e) => ({
        id: String(e.id || ''),
        name: e.name || '未知',
        category: (e as { type?: string; category?: string }).type || (e as { category?: string }).category || 'unknown',
        description: e.description || (e.metadata as { description?: string } | undefined)?.description || '',
        region: (e as { region?: string }).region || (e.metadata as { region?: string } | undefined)?.region || '',
        period: (e as { period?: string }).period || (e.metadata as { period?: string } | undefined)?.period || '',
        value: e.relevance ?? (e as { importance?: number }).importance ?? (e as { value?: number }).value ?? 0.5,
        itemStyle: {
          color: getCategoryColor(
            String((e as { type?: string; category?: string }).type || (e as { category?: string }).category || 'unknown')
          ),
        },
      })),
      edges: relations.map((r, index) => ({
        source: String(r.source),
        target: String(r.target),
        relationType: (r as { type?: string }).type || (r as { relationType?: string }).relationType || '关联',
        value: r.confidence ?? (r as { weight?: number }).weight ?? 0.5,
        id: r.id || `edge_${index}`,
      })),
      categories: Array.from(
        new Set(
          entities.map(
            (e) => String((e as { type?: string; category?: string }).type || (e as { category?: string }).category || 'unknown')
          )
        )
      ).map((c) => ({
        name: String(c),
        itemStyle: { color: getCategoryColor(String(c)) },
      })),
    };
    setRawGraphData(knowledgeGraphData);
    setRetryCount(0);
  }, [entities, relations]);

  const graphData = useMemo(() => {
    if (!rawGraphData) return null;
    return rawGraphData;
  }, [rawGraphData]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNode || !graphData) return null;
    return graphData.nodes.find((n) => String(n.id) === String(selectedNode));
  }, [selectedNode, graphData]);

  useEffect(() => {
    if (graphData) {
      setPerformanceStats({
        fps: 60,
        nodeCount: graphData.nodes.length,
        lodLevel: 1,
      });
    }
  }, [graphData]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  const renderGraph = useCallback(() => {
    if (!chartInstance.current || !graphData) return;

    const getExactHexColor = (categoryName: string | undefined) => {
      const cat = String(categoryName || 'unknown').toLowerCase();
      if (cat.includes('inheritor') || cat.includes('传承人')) return '#a855f7';
      if (cat.includes('material') || cat.includes('材料')) return '#22c55e';
      if (cat.includes('region') || cat.includes('location') || cat.includes('地域') || cat.includes('地点'))
        return '#06b6d4';
      if (cat.includes('period') || cat.includes('时期') || cat.includes('年代')) return '#3b82f6';
      if (cat.includes('technique') || cat.includes('skill') || cat.includes('技艺')) return '#f59e0b';
      if (cat.includes('work') || cat.includes('作品')) return '#ef4444';
      if (cat.includes('pattern') || cat.includes('图案')) return '#ec4899';
      if (cat.includes('organization') || cat.includes('机构')) return '#6366f1';

      const orig = getCategoryColor(cat);
      return orig && !orig.includes('var') ? orig : '#8b5cf6';
    };

    const hasActiveFilters = () => {
      return (
        filters.searchQuery !== '' ||
        (filters.categories && filters.categories.length > 0) ||
        (filters.minImportance || 0) > 0
      );
    };

    const isNodeMatch = (n: Record<string, unknown>) => {
      const query = filters.searchQuery?.toLowerCase() || '';
      const matchesSearch =
        query === '' ||
        String(n.name ?? '')
          .toLowerCase()
          .includes(query) ||
        (n.description && String(n.description).toLowerCase().includes(query));

      const matchesCategory =
        !filters.categories || filters.categories.length === 0 || filters.categories.includes(String(n.category));

      const matchesImportance = Number(n.value ?? 0) >= (filters.minImportance || 0);

      return matchesSearch && matchesCategory && matchesImportance;
    };

    const isFilterActive = hasActiveFilters();
    const textBorderColor = resolvedMode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';

    const validNodes = graphData.nodes.map((n) => {
      const finalColor = getExactHexColor(n.category);
      const match = !isFilterActive || isNodeMatch(n as Record<string, unknown>);
      const opacity = isFilterActive ? (match ? 1 : 0.15) : 1;
      const labelOpacity = isFilterActive ? (match ? 1 : 0) : 1;
      const shadowBlur = isFilterActive ? (match ? 15 : 0) : 10;

      return {
        ...n,
        id: String(n.id),
        name: n.name || '未命名',
        symbolSize: 25 + (Number(n.value) || 0.5) * 30,
        itemStyle: {
          ...n.itemStyle,
          color: finalColor,
          opacity,
          borderColor: `rgba(255,255,255,${match ? 0.8 : 0})`,
          borderWidth: 1.5,
          shadowBlur,
          shadowColor: finalColor,
        },
        label: {
          show: true,
          color: finalColor,
          opacity: labelOpacity,
          position: 'right',
          formatter: '{b}',
          fontSize: 12,
          fontWeight: 'bold' as const,
          textBorderColor,
          textBorderWidth: 1,
        },
      };
    });

    const validEdges = graphData.edges
      .filter(
        (e) =>
          validNodes.some((n) => n.id === String(e.source)) && validNodes.some((n) => n.id === String(e.target))
      )
      .map((e) => {
        const edgeOpacity = isFilterActive ? 0.15 : 0.5;
        const ex = e as { relationType?: string; relation_type?: string; type?: string };
        const relType = ex.relationType ?? ex.relation_type ?? ex.type;
        return {
          ...e,
          source: String(e.source),
          target: String(e.target),
          relationType: relType,
          lineStyle: {
            color: '#9ca3af',
            width: 1.5,
            curveness: 0.2,
            opacity: edgeOpacity,
          },
        };
      });

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        show: true,
        trigger: 'item',
        confine: true,
        formatter: (params: unknown) => {
          const p = params as {
            dataType?: string;
            data?: Record<string, unknown>;
          };
          if (p.dataType === 'node' && p.data) {
            const d = p.data;
            const cat = String(d.category ?? 'unknown');
            const typeLabel = getCategoryLabel(cat);
            const name = escapeKgTooltip(String(d.name ?? ''));
            const val = typeof d.value === 'number' ? (d.value as number).toFixed(2) : '';
            return `
              <div style="padding:10px;min-width:160px;">
                <div style="font-weight:bold;font-size:14px;">${name}</div>
                <div style="font-size:12px;margin-top:6px;opacity:.9;">类型：${escapeKgTooltip(typeLabel)}</div>
                ${val ? `<div style="font-size:12px;margin-top:4px;opacity:.85;">关联度：${val}</div>` : ''}
              </div>`;
          }
          if (p.dataType === 'edge' && p.data) {
            const d = p.data;
            const sid = String(d.source ?? '');
            const tid = String(d.target ?? '');
            const sName = escapeKgTooltip(resolveNodeDisplayName(graphData.nodes, sid));
            const tName = escapeKgTooltip(resolveNodeDisplayName(graphData.nodes, tid));
            const relRaw =
              (d.relationType as string | undefined) ??
              (d.type as string | undefined) ??
              '';
            const relLabel = escapeKgTooltip(formatRelationTypeLabel(relRaw));
            return `
              <div style="padding:10px;min-width:180px;">
                <div style="font-weight:bold;margin-bottom:8px;font-size:14px;">${sName} → ${tName}</div>
                <div style="font-size:12px;opacity:.9;">关系类型：${relLabel}</div>
              </div>`;
          }
          return '';
        },
      },
      animation: true,
      animationDurationUpdate: 500,
      series: [
        {
          type: 'graph',
          layout: layoutType || 'force',
          progressive: 0,
          coordinateSystem: 'view',
          data: validNodes,
          links: validEdges,
          categories: (graphData.categories || []).map((c) => ({
            name: getCategoryLabel(c.name),
            itemStyle: { color: getExactHexColor(c.name) },
          })),
          roam: true,
          draggable: true,
          force: {
            repulsion: 2500,
            gravity: 0.1,
            edgeLength: [150, 300],
            layoutAnimation: true,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              color: '#000000',
              width: 4,
              opacity: 1,
            },
          },
          blur: {
            itemStyle: { opacity: 0.15 },
            lineStyle: { opacity: 0.1 },
          },
        },
      ],
    };

    chartInstance.current.setOption(option, false);

    if (chartInstance.current) {
      chartInstance.current.off('click');
      chartInstance.current.on('click', (params: { dataType?: string; data?: { id?: string } }) => {
        if (params.dataType === 'node' && params.data?.id) {
          setSelectedNode(String(params.data.id));
        } else {
          setSelectedNode(null);
          setHighlightedNodes([]);
        }
      });
    }
  }, [graphData, layoutType, selectedNode, highlightedNodes, resolvedMode, filters, setSelectedNode, setHighlightedNodes]);

  useEffect(() => {
    if (graphData && chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      renderGraph();
    }
  }, [graphData, layoutType, selectedNode, highlightedNodes, filters, renderGraph]);

  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver(() => {
      if (chartInstance.current) chartInstance.current.resize();
    });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [graphData]);

  if (!entities.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full px-6 text-center mt-16">
        <Bookmark size={56} className="mb-4 opacity-40" style={{ color: 'var(--color-primary)' }} />
        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          尚未加载图谱
        </p>
        <p className="text-sm max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
          请点击顶部「快照库」，从列表中选择快照导入。
        </p>
      </div>
    );
  }

  if (!graphData) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      <div ref={chartRef} className="w-full h-full" style={{ minHeight: '400px' }} />

      {performanceStats && !isMobile && (
        <div
          className="absolute top-4 right-4 z-10 px-3 py-2 rounded-lg shadow-lg text-xs"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-1">
            <Activity size={12} style={{ color: 'var(--color-primary)' }} />
            <span>{performanceStats.fps} FPS</span>
          </div>
          <div className="mt-1 opacity-70">{performanceStats.nodeCount} 节点</div>
        </div>
      )}

      <AnimatePresence>
        {selectedNodeData && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-lg overflow-hidden backdrop-blur-xl rounded-2xl shadow-2xl border"
            style={{
              background: 'var(--gradient-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(selectedNodeData.category),
                      boxShadow: `0 0 10px ${getCategoryColor(selectedNodeData.category)}`,
                    }}
                  />
                  <h3 className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                    {selectedNodeData.name}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full border"
                    style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                  >
                    {getCategoryLabel(selectedNodeData.category)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Minimize2 size={18} />
                </button>
              </div>

              <p
                className="text-sm leading-relaxed overflow-y-auto max-h-32 pr-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {((selectedNodeData as { description?: string }).description as string) || '暂无详细描述...'}
              </p>
            </div>

            <div className="h-1 w-full" style={{ background: getCategoryColor(selectedNodeData.category) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
