import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Download,
  Save,
  Share2,
  Info,
  X,
} from 'lucide-react';
import { graphService } from '../../../api/graph';
import { snapshotService } from '../../../api/snapshot';
import { useToast } from '../../common/Toast';
import { useThemeStore } from '../../../stores/themeStore';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../../constants/categories';
import { formatRelationTypeLabel } from '../../../config';
import type {
  Entity,
  Relation,
  GraphNode,
  EntityType,
  GraphCategory,
  GraphData,
} from '../../../types/graph';

const ENTITY_LABELS: Record<EntityType, string> = CATEGORY_LABELS;

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
  
  const orig = CATEGORY_COLORS[cat as EntityType];
  return (orig && !orig.includes('var')) ? orig : '#8b5cf6'; 
};

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resizeChartNextFrames(chart: echarts.ECharts | null) {
  if (!chart) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      chart.resize();
    });
  });
}

interface DynamicGraphPanelProps {
  entities?: Entity[];
  relations?: Relation[];
  keywords?: string[];
  sessionId?: string;
  messageId?: string;
  onSaveSnapshot?: () => void;
  onNodeClick?: (entity: Entity) => void;
  height?: number | string;
  showControls?: boolean;
  showSaveButton?: boolean;
}

export default function DynamicGraphPanel({
  entities: propEntities,
  relations: propRelations,
  keywords: propKeywords,
  sessionId,
  messageId,
  onSaveSnapshot,
  onNodeClick,
  height = 280,
  showControls = true,
  showSaveButton = true,
}: DynamicGraphPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  const { resolvedMode } = useThemeStore();

  const entities = useMemo(() => propEntities || [], [propEntities]);
  const relations = useMemo(() => propRelations || [], [propRelations]);
  const keywords = useMemo(() => propKeywords || [], [propKeywords]);

  const toast = useToast();

  const graphData: GraphData = useMemo(() => {
    if (entities.length === 0) {
      return { nodes: [], edges: [], categories: [] };
    }
    // Chat 场景不过滤 relevance（后端常为 undefined 或较低，0.3 会导致「根本没图」）
    return graphService.entitiesToGraphData(entities, relations);
  }, [entities, relations]);

  /** ECharts graph 必须用 categories + 数值 category；缺少时邻接聚焦会写坏 dataIndex */
  const categoriesForSeries: GraphCategory[] = useMemo(() => {
    if (graphData.categories && graphData.categories.length > 0) {
      return graphData.categories;
    }
    const types = [...new Set(graphData.nodes.map((n) => n.category))];
    return types.map((name) => ({
      name,
      itemStyle: { color: getExactHexColor(String(name)) },
    }));
  }, [graphData.categories, graphData.nodes]);

  const categoryIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    categoriesForSeries.forEach((c, i) => m.set(String(c.name), i));
    return m;
  }, [categoriesForSeries]);

  /**
   * 防御性清洗：关系里若引用了当前节点集不存在的端点，ECharts graph 在构建
   * dataIndex 时可能报 `Cannot set properties of undefined`。
   */
  /** 不含选中态，避免依赖 selectedNode 触发整表 notMerge 重置 roam（与知识页行为对齐） */
  const baseSeriesData = useMemo(
    () =>
      graphData.nodes.map((node) => {
        const color = getExactHexColor(String(node.category));
        const catIdx = categoryIndexMap.get(String(node.category)) ?? 0;

        return {
          id: String(node.id),
          name: node.name?.trim() || '未命名',
          category: catIdx,
          entityType: node.category,
          value: node.value ?? 0.5,
          symbolSize: node.symbolSize || 30,
          description: node.description,
          itemStyle: {
            color,
            borderColor: 'transparent',
            borderWidth: 0,
            shadowBlur: 15,
            shadowColor: color,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          label: {
            show: true,
            position: 'bottom',
            distance: 8,
            formatter: '{b}',
            fontSize: 13,
            color: resolvedMode === 'dark' ? '#e2e8f0' : '#1e293b',
            fontWeight: 500 as const,
            textShadowColor:
              resolvedMode === 'dark'
                ? 'rgba(0, 0, 0, 0.8)'
                : 'rgba(255, 255, 255, 0.8)',
            textShadowBlur: 6,
          },
        };
      }),
    [graphData.nodes, categoryIndexMap, resolvedMode]
  );

  const safeSeriesLinks = useMemo(() => {
    const nodeIdSet = new Set(baseSeriesData.map((n) => String(n.id)));
    return graphData.edges
      .filter((edge) => {
        const source = String(edge.source);
        const target = String(edge.target);
        return nodeIdSet.has(source) && nodeIdSet.has(target);
      })
      .map((edge) => ({
        source: String(edge.source),
        target: String(edge.target),
        relationType: edge.relationType,
        lineStyle: {
          color: edge.lineStyle?.color || '#94a3b8',
          width: edge.lineStyle?.width || 2,
          curveness: edge.lineStyle?.curveness ?? 0.3,
          opacity: edge.lineStyle?.opacity ?? 0.5,
        },
      }));
  }, [graphData.edges, baseSeriesData]);

  const stats = useMemo(() => {
    return graphService.calculateGraphStats(graphData);
  }, [graphData]);

  /** 同步更新图表（避免 RAF 被取消导致永远不画、以及与力导向/layout 异步更新打架） */
  const applyChartOption = useCallback((layoutMode: 'force' | 'circular' = 'force') => {
    const el = chartRef.current;
    if (!el || graphData.nodes.length === 0) return;

    const isDark = resolvedMode === 'dark';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';
    const bgColor = 'transparent';
    const borderColor = isDark ? '#334155' : '#e2e8f0';

    let chart = chartInstance.current;
    if (!chart) {
      chart = echarts.init(el, undefined, { renderer: 'canvas', useDirtyRect: false });
      chartInstance.current = chart;
    }

    const option: echarts.EChartsOption = {
      backgroundColor: bgColor,
      tooltip: {
        trigger: 'item',
        appendToBody: true,
        confine: true,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: borderColor,
        borderWidth: 2,
        textStyle: {
          color: textColor,
          fontSize: 14,
        },
        formatter: (params: unknown) => {
          const param = params as Record<string, unknown>;
          if (param.dataType === 'node' && param.data) {
            const data = param.data as Record<string, unknown>;
            const category = String(data.entityType ?? data.category ?? 'technique') as EntityType;
            const color = getExactHexColor(category);
            const value = (data.value as number) ?? 0.5;
            const name = escapeHtml(String(data.name || ''));
            const description = data.description as string | undefined;
            return `
              <div style="padding: 12px; min-width: 200px; max-width: 320px; white-space: normal; word-wrap: break-word;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; box-shadow: 0 0 10px ${color}"></div>
                  <strong style="color: var(--color-primary); font-size: 16px;">${name}</strong>
                </div>
                <div style="color: var(--color-text-muted); font-size: 13px; margin-bottom: 4px;">
                  <span style="color: var(--color-text-secondary);">类型:</span> ${ENTITY_LABELS[category] || category}
                </div>
                <div style="color: var(--color-text-muted); font-size: 13px;">
                  <span style="color: var(--color-text-secondary);">重要性:</span>
                  <span style="color: var(--color-warning); font-weight: bold;">${(value * 100).toFixed(0)}%</span>
                </div>
                ${description ? `<div style="color: var(--color-text-secondary); font-size: 13px; margin-top: 8px; line-height: 1.5; border-top: 1px solid var(--color-border); padding-top: 8px;">${escapeHtml(description)}</div>` : ''}
              </div>
            `;
          }
          const data = param.data as Record<string, unknown> | undefined;
          const sid = String(data?.source ?? '');
          const tid = String(data?.target ?? '');
          const srcEntity = entities.find((e) => e.id === sid);
          const tgtEntity = entities.find((e) => e.id === tid);
          const source = escapeHtml(srcEntity?.name || sid || '');
          const target = escapeHtml(tgtEntity?.name || tid || '');
          const relationLabel = escapeHtml(formatRelationTypeLabel(String(data?.relationType ?? '')));
          return `
            <div style="padding: 12px; min-width: 150px; max-width: 300px; white-space: normal;">
              <div style="color: var(--color-primary); font-size: 14px; margin-bottom: 8px;">
                ${source} → ${target}
              </div>
              <div style="color: var(--color-text-muted); font-size: 13px;">
                <span style="color: var(--color-text-secondary);">关系类型：</span>
                <span style="color: var(--color-success); font-weight: bold;">${relationLabel}</span>
              </div>
            </div>
          `;
        },
      },
      animation: true,
      animationDuration: layoutMode === 'force' ? 400 : 0,
      animationDurationUpdate: layoutMode === 'force' ? 450 : 0,
      series: [
        {
          type: 'graph',
          layout: layoutMode,
          progressive: 0,
          coordinateSystem: 'view' as const,
          categories: categoriesForSeries.map((c) => ({
            name: String(c.name),
            itemStyle: {
              color: getExactHexColor(String(c.name)),
            },
          })),
          data: baseSeriesData,
          links: safeSeriesLinks,
          roam: true,
          draggable: true,
          focusNodeAdjacency: false,
          force:
            layoutMode === 'force'
              ? {
                  repulsion: 2400,
                  edgeLength: [130, 280],
                  gravity: 0.1,
                  friction: 0.55,
                  layoutAnimation: true,
                }
              : undefined,
          emphasis: {
            focus: 'none',
            itemStyle: {
              shadowBlur: 28,
              shadowColor: 'rgba(251, 191, 36, 0.45)',
            },
            lineStyle: {
              width: 4,
              opacity: 0.85,
            },
            label: {
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          lineStyle: {
            color: '#94a3b8',
            curveness: 0.3,
            opacity: 0.5,
          },
        },
      ],
    };

    chart.resize();
    // merge：保留 roam 缩放平移与力导稳定后的节点坐标，避免整表替换导致拖拽发涩、边与节点错位
    chart.setOption(option, false);
    resizeChartNextFrames(chart);

    chart.off('click');
    chart.on('click', (params: Record<string, unknown>) => {
      if (params.dataType === 'node') {
        const data = params.data as Record<string, unknown>;
        const entityType = String(data.entityType ?? 'technique') as EntityType;
        const entity = entities.find((e) => e.id === String(data.id));
        if (entity && onNodeClick) {
          onNodeClick(entity);
        }
        setSelectedNode({
          id: String(data.id || ''),
          name: String(data.name || ''),
          category: entityType,
          value: Number(data.value || 0.5),
          description: data.description as string | undefined,
        });
      }
    });

    chart.off('mouseover');
    chart.on('mouseover', (params: Record<string, unknown>) => {
      if (params.dataType === 'node') {
        const data = params.data as Record<string, unknown> | undefined;
        if (data) {
          const entityType = String(data.entityType ?? 'technique') as EntityType;
          setHoveredNode({
            id: String(data.id || ''),
            name: String(data.name || ''),
            category: entityType,
            value: Number(data.value || 0.5),
            description: data.description as string | undefined,
          });
        } else {
          setHoveredNode(null);
        }
      }
    });

    chart.off('mouseout');
    chart.on('mouseout', () => {
      setHoveredNode(null);
    });
  }, [
    graphData,
    resolvedMode,
    entities,
    onNodeClick,
    categoriesForSeries,
    baseSeriesData,
    safeSeriesLinks,
  ]);

  /** 选中描边增量更新，不触发整图 replace，避免打断 roam / 力导 */
  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || graphData.nodes.length === 0) return;
    const data = baseSeriesData.map((n) => ({
      ...n,
      itemStyle: {
        ...n.itemStyle,
        borderColor: selectedNode?.id === n.id ? '#fbbf24' : 'transparent',
        borderWidth: selectedNode?.id === n.id ? 3 : 0,
      },
    }));
    chart.setOption({ series: [{ data }] }, false);
  }, [selectedNode, baseSeriesData, graphData.nodes.length]);

  useLayoutEffect(() => {
    if (graphData.nodes.length === 0) {
      if (chartInstance.current) {
        try {
          chartInstance.current.dispose();
        } catch {
          /* disposed */
        }
        chartInstance.current = null;
      }
      return;
    }

    try {
      applyChartOption();
    } catch (err) {
      console.warn('DynamicGraphPanel: ECharts 更新失败', err);
      try {
        chartInstance.current?.dispose();
      } catch {
        /* ignore */
      }
      chartInstance.current = null;
      // 兜底：若力导布局在某些数据组合下异常，自动降级到 circular，避免首条/第二条直接白屏
      try {
        applyChartOption('circular');
      } catch (fallbackErr) {
        console.warn('DynamicGraphPanel: fallback circular 布局也失败', fallbackErr);
      }
    }
  }, [graphData, applyChartOption]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setSelectedNode((prev) => {
      if (!prev) return null;
      return graphData.nodes.some((n) => n.id === prev.id) ? prev : null;
    });
    setHoveredNode((prev) => {
      if (!prev) return null;
      return graphData.nodes.some((n) => n.id === prev.id) ? prev : null;
    });
  }, [graphData]);

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      resizeChartNextFrames(chartInstance.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [graphData.nodes.length]);

  const handleZoomIn = () => {
    if (!chartInstance.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const option = chartInstance.current.getOption() as any;
    const s0 = option?.series?.[0] as Record<string, unknown> | undefined;
    const zoom = Number(s0?.zoom ?? 1) * 1.2;
    chartInstance.current.setOption({ series: [{ zoom }] }, false, true);
  };

  const handleZoomOut = () => {
    if (!chartInstance.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const option = chartInstance.current.getOption() as any;
    const s0 = option?.series?.[0] as Record<string, unknown> | undefined;
    const zoom = Math.max(Number(s0?.zoom ?? 1) / 1.2, 0.3);
    chartInstance.current.setOption({ series: [{ zoom }] }, false, true);
  };

  const handleReset = () => {
    if (!chartInstance.current) return;
    chartInstance.current.setOption({ series: [{ zoom: 1, center: undefined }] }, false, true);
    setSelectedNode(null);
  };

  const handleFullscreen = () => {
    if (chartRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartRef.current.requestFullscreen();
      }
    }
  };

  const handleExport = () => {
    if (chartInstance.current) {
      const isDark = resolvedMode === 'dark';
      const bgColor = isDark ? '#0f172a' : '#ffffff';
      const url = chartInstance.current.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: bgColor,
      });
      const link = document.createElement('a');
      link.download = `knowledge-graph-${Date.now()}.png`;
      link.href = url;
      link.click();
      toast.success('导出成功', '图谱已保存为图片');
    }
  };

  const handleSaveSnapshot = async () => {
    if (!sessionId || !messageId) {
      return;
    }

    setIsSaving(true);
    try {
      await snapshotService.createSnapshot({
        session_id: sessionId,
        message_id: messageId,
        graph_data: graphData,
        keywords: keywords.length > 0 ? keywords : [],
        entities,
        relations: relations || [],
      });
      onSaveSnapshot?.();
      
      toast.success('快照保存成功', '请前往顶部导航栏的【智能图谱】界面的“快照”中导入查看');
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      toast.error('保存失败', '保存图谱快照时发生错误');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!sessionId || !messageId) {
      return;
    }

    try {
      let snapshotId = messageId;
      let snapshot = await snapshotService.getSnapshot(snapshotId);
      if (!snapshot) {
        snapshot = await snapshotService.createSnapshot({
          session_id: sessionId,
          message_id: messageId,
          graph_data: graphData,
          keywords: keywords.length > 0 ? keywords : [],
          entities,
          relations: relations || [],
        });
        snapshotId = snapshot.id;
      }

      const result = await snapshotService.shareSnapshot(snapshotId, 7);

      if (result && result.share_url) {
        await navigator.clipboard.writeText(result.share_url);
      }
    } catch (error) {
      console.error('Failed to share snapshot:', error);
    }
  };

  if (graphData.nodes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ height, background: 'var(--color-background-secondary)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'var(--color-background-tertiary)' }}
        >
          <Info size={24} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          暂无知识图谱数据
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
          发送消息后将自动生成
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-0 flex-1" style={{ height }}>
      <div
        ref={chartRef}
        className="w-full h-full min-h-[200px]"
        style={{ touchAction: 'none' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs pointer-events-none"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-light)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span className="font-medium">{stats.nodeCount}</span> 节点 ·{' '}
        <span className="font-medium">{stats.edgeCount}</span> 关系
      </motion.div>

      {showControls && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none"
        >
          {[
            { icon: ZoomIn, label: '放大', onClick: handleZoomIn },
            { icon: ZoomOut, label: '缩小', onClick: handleZoomOut },
            { icon: RotateCcw, label: '重置', onClick: handleReset },
            {
              icon: Maximize2,
              label: isFullscreen ? '退出全屏' : '全屏',
              onClick: handleFullscreen,
            },
            { icon: Download, label: '导出', onClick: handleExport },
          ].map((item) => (
            <motion.button
              key={item.label}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={item.onClick}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all z-10 pointer-events-auto"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-secondary)',
              }}
              title={item.label}
            >
              <item.icon size={14} />
            </motion.button>
          ))}
        </motion.div>
      )}

      {showSaveButton && sessionId && messageId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 right-2 flex gap-1 z-10 pointer-events-none"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="px-2 py-1 rounded-lg text-xs flex items-center gap-1 pointer-events-auto"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Share2 size={12} />
            分享
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveSnapshot}
            disabled={isSaving}
            className="px-2 py-1 rounded-lg text-xs flex items-center gap-1 pointer-events-auto"
            style={{
              background: 'var(--gradient-primary)',
              color: 'var(--color-text-inverse)',
            }}
          >
            <Save size={12} />
            {isSaving ? '保存中...' : '保存快照'}
          </motion.button>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 left-2 right-2 p-3 rounded-lg z-20"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-light)',
              boxShadow: 'var(--color-shadow)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: getExactHexColor(selectedNode.category) }}
                  />
                  <span
                    className="font-medium text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {selectedNode.name}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {ENTITY_LABELS[selectedNode.category]}
                </p>
                {selectedNode.description && (
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {selectedNode.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredNode && !selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // 【保护】：给左上角的纯名字标签也加上防超框处理
            className="absolute top-2 left-2 px-2 py-1 rounded text-xs pointer-events-none z-50 max-w-[80%] truncate"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          >
            {hoveredNode.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}