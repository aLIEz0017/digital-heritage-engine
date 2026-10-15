import {
  useState,
  useEffect,
  lazy,
  Suspense,
  useCallback,
  useTransition,
  type MouseEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  List,
  Download,
  Bookmark,
  FolderOpen,
  X,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import useKnowledgeGraphStore from '../../stores/knowledgeGraphStore';
import type { Entity as KnowledgeEntity } from '../../api/knowledge';
import { snapshotService } from '../../api/snapshot';
import type { GraphSnapshot, Relation } from '../../types/chat';
import { GraphSkeleton, ListSkeleton } from '../../components/common/Skeleton';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useToast } from '../../components/common/Toast';
import type { Entity } from '../../types/graph';
import { graphSyncService } from '../../services/graphSyncService';
import {
  useGraphStore,
  sessionBundleHasContent,
  type SessionGraphBundle,
} from '../../stores/graphStore';

const KnowledgeGraph = lazy(() => import('../../components/knowledge/KnowledgeGraph'));
const ListView = lazy(() => import('../../components/knowledge/ListView'));
const FilterPanel = lazy(() => import('../../components/knowledge/FilterPanel'));

/** 知识页图谱仅从快照库导入；展示用本页 state，导入结果同步到 graphStore.knowledgeImportSnapshot 以跨路由持久化 */
interface LockedKnowledgeGraph {
  entities: KnowledgeEntity[];
  relations: Relation[];
  keywords: string[];
}

function snapshotToLockedGraph(snap: SessionGraphBundle): LockedKnowledgeGraph {
  return {
    entities: snap.entities as unknown as KnowledgeEntity[],
    relations: snap.relations,
    keywords: snap.keywords,
  };
}

export default function KnowledgePage() {
  const { viewMode, setViewMode, setSelectedNode, toggleFilterPanel, filterPanelCollapsed } =
    useKnowledgeGraphStore();
  const [isPending, startTransitionFn] = useTransition();
  const [lockedGraph, setLockedGraph] = useState<LockedKnowledgeGraph | null>(() => {
    const snap = useGraphStore.getState().knowledgeImportSnapshot;
    if (snap && sessionBundleHasContent(snap)) {
      return snapshotToLockedGraph(snap);
    }
    return null;
  });
  const [exporting, setExporting] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [snapshots, setSnapshots] = useState<GraphSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  /** 当前页从快照库导入的快照 id，用于删除时判断是否清空画布 */
  const [importedSnapshotId, setImportedSnapshotId] = useState<string | null>(null);
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);
  const toast = useToast();

  /** 从 graphStore 持久化的知识库导入快照恢复本页（路由切换 / localStorage 重载后） */
  useEffect(() => {
    const sync = () => {
      const snap = useGraphStore.getState().knowledgeImportSnapshot;
      if (snap && sessionBundleHasContent(snap)) {
        setLockedGraph(snapshotToLockedGraph(snap));
      } else if (useGraphStore.persist.hasHydrated()) {
        setLockedGraph(null);
      }
    };
    sync();
    return useGraphStore.persist.onFinishHydration(() => {
      sync();
    });
  }, []);

  const listEntities = lockedGraph?.entities ?? [];
  const graphEntities: Entity[] = (lockedGraph?.entities ?? []) as unknown as Entity[];
  const graphRelations = lockedGraph?.relations ?? [];

  const handleFilterChange = useCallback((filters: unknown) => {
    console.log('Filter changed:', filters);
  }, []);

  const viewButtons = [
    { mode: 'graph' as const, icon: Network, label: '图谱视图' },
    { mode: 'list' as const, icon: List, label: '列表视图' },
  ];

  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      if (!lockedGraph || lockedGraph.entities.length === 0) {
        toast.warning('无法导出', '请先从快照库导入包含实体的图谱');
        return;
      }
      try {
        setExporting(true);
        if (format === 'json') {
          const payload = {
            entities: lockedGraph.entities,
            relations: lockedGraph.relations,
            keywords: lockedGraph.keywords,
            exported_at: new Date().toISOString(),
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `knowledge_graph_snapshot_export.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('导出完成', '已下载 JSON 文件');
        } else {
          toast.info('未提供 CSV', '当前仅从快照导入图谱，请使用 JSON 导出完整结构。');
        }
      } catch (error) {
        console.error('导出失败:', error);
        toast.error('导出失败');
      } finally {
        setExporting(false);
      }
    },
    [lockedGraph, toast]
  );

  const loadSnapshots = useCallback(async () => {
    setIsLoadingSnapshots(true);
    try {
      const response = await snapshotService.listSnapshots(undefined, 1, 50);
      setSnapshots(response.snapshots);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, []);

  const handleLoadSnapshot = useCallback(
    async (snapshot: GraphSnapshot) => {
      try {
        const fullSnapshot = await snapshotService.getSnapshot(snapshot.id);
        if (!fullSnapshot) {
          return;
        }

        const mappedEntities = (fullSnapshot.entities || []).map((e) => ({
          ...e,
          importance: (e as { importance?: number }).importance ?? e.relevance ?? 0.5,
        })) as KnowledgeEntity[];

        const next: LockedKnowledgeGraph = {
          entities: mappedEntities,
          relations: fullSnapshot.relations || [],
          keywords: fullSnapshot.keywords || [],
        };
        setLockedGraph(next);
        setImportedSnapshotId(fullSnapshot.id);
        graphSyncService.updateFromKnowledge(
          mappedEntities as unknown as Entity[],
          next.relations,
          next.keywords
        );
        setSelectedNode(null);
        setShowSnapshots(false);
      } catch (error) {
        console.error('Failed to load snapshot:', error);
        toast.error('导入失败');
      }
    },
    [toast, setSelectedNode]
  );

  const handleDeleteSnapshot = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, snapshot: GraphSnapshot) => {
      e.stopPropagation();
      e.preventDefault();
      setDeletingSnapshotId(snapshot.id);
      try {
        const ok = await snapshotService.deleteSnapshot(snapshot.id);
        if (!ok) {
          toast.error('删除失败', '请稍后重试');
          return;
        }
        if (importedSnapshotId === snapshot.id) {
          setLockedGraph(null);
          setImportedSnapshotId(null);
          graphSyncService.updateFromKnowledge([], [], []);
        }
        setSnapshots((prev) => prev.filter((s) => s.id !== snapshot.id));
        toast.success('已删除', '快照已从库中移除');
      } finally {
        setDeletingSnapshotId(null);
      }
    },
    [importedSnapshotId, toast]
  );

  useEffect(() => {
    if (showSnapshots) {
      loadSnapshots();
    }
  }, [showSnapshots, loadSnapshots]);

  const handleEntityClick = (entityId: string) => {
    setSelectedNode(entityId);
  };

  return (
    <div
      data-testid="knowledge-page-root"
      className="h-[calc(100vh-4rem)] w-full relative overflow-hidden flex"
      style={{ background: 'var(--gradient-background)' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: 'var(--color-primary)', opacity: 0.08 }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: 'var(--color-secondary)', opacity: 0.08, animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: 'var(--color-accent)', opacity: 0.05, animationDelay: '2s' }}
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(var(--color-border-light)_1px,transparent_1px),linear-gradient(90deg,var(--color-border-light)_1px,transparent_1px)] bg-[size:50px_50px]"
          style={{ opacity: 0.3 }}
        />
      </div>

      <aside
        className={`relative z-20 border-r transition-all duration-300 ease-in-out flex flex-col shadow-xl
          ${filterPanelCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-80 opacity-100'}
        `}
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="p-4 border-b flex-shrink-0 flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            数据筛选
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Suspense fallback={<ListSkeleton />}>
            <FilterPanel entities={listEntities} onFilterChange={handleFilterChange} />
          </Suspense>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative z-10 h-full">
        <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFilterPanel}
            className="p-2.5 rounded-xl shadow-lg backdrop-blur-md border transition-all"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
            }}
            title={filterPanelCollapsed ? '展开筛选' : '收起筛选'}
          >
            <SlidersHorizontal size={18} />
          </motion.button>

          <div
            className="flex backdrop-blur-md rounded-xl p-1 shadow-lg border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {viewButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => startTransitionFn(() => setViewMode(mode))}
                className="p-2.5 rounded-lg transition-colors flex items-center gap-2"
                style={{
                  background: viewMode === mode ? 'var(--gradient-primary)' : 'transparent',
                  color: viewMode === mode ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                }}
                title={label}
              >
                <Icon size={16} />
                {viewMode === mode && <span className="text-sm font-medium px-1">{label}</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <motion.button
              onClick={() => setShowSnapshots(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-lg"
              style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-inverse)', border: 'none' }}
            >
              <Bookmark size={16} />
              <span className="text-sm font-medium">快照库</span>
            </motion.button>

            <motion.button
              onClick={() => handleExport('json')}
              disabled={exporting || !lockedGraph || lockedGraph.entities.length === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-50 border"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <Download size={16} />
              <span className="text-sm font-medium">{exporting ? '处理中...' : '导出'}</span>
            </motion.button>
          </div>
        </div>

        <div className="flex-1 w-full h-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 flex flex-col ${isPending ? 'opacity-50' : ''}`}
            >
              {viewMode === 'graph' ? (
                <ErrorBoundary>
                  <Suspense fallback={<GraphSkeleton />}>
                    <div className="flex-1 w-full h-full pt-24">
                      <KnowledgeGraph entities={graphEntities} relations={graphRelations} />
                    </div>
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <ErrorBoundary>
                  <Suspense fallback={<ListSkeleton />}>
                    <div className="flex-1 w-full h-full p-8 mt-16 overflow-hidden">
                      <ListView
                        entities={listEntities}
                        onEntityClick={handleEntityClick}
                        loading={false}
                        awaitingSnapshotImport={lockedGraph === null}
                      />
                    </div>
                  </Suspense>
                </ErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showSnapshots && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSnapshots(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl max-h-[80vh] mx-4 rounded-2xl overflow-hidden"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--color-shadow)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-var(--color-border)">
                <div className="flex items-center gap-3">
                  <Bookmark size={24} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    我的图谱快照
                  </h2>
                </div>
                <button
                  onClick={() => setShowSnapshots(false)}
                  className="p-2 rounded-lg transition-colors hover:bg-var(--color-surface)"
                >
                  <X size={20} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                {isLoadingSnapshots ? (
                  <div className="flex items-center justify-center py-12">
                    <div
                      className="w-8 h-8 border-4 border-var(--color-primary) border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                    />
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FolderOpen size={48} style={{ color: 'var(--color-text-muted)' }} />
                    <p className="mt-4 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                      暂无快照
                    </p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      在聊天页面保存图谱后可在此导入
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {snapshots.map((snapshot) => (
                      <motion.div
                        key={snapshot.id}
                        role="button"
                        tabIndex={0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleLoadSnapshot(snapshot)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            handleLoadSnapshot(snapshot);
                          }
                        }}
                        className="p-4 rounded-xl text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary)]"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <Bookmark size={18} style={{ color: 'var(--color-primary)' }} />
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {new Date(snapshot.created_at).toLocaleDateString('zh-CN')}
                            </span>
                            <button
                              type="button"
                              title="删除快照"
                              disabled={deletingSnapshotId === snapshot.id}
                              onClick={(ev) => handleDeleteSnapshot(ev, snapshot)}
                              className="p-1.5 rounded-lg transition-colors disabled:opacity-50 hover:bg-[var(--color-error-alpha)]"
                              style={{ color: 'var(--color-error)' }}
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </div>
                        </div>
                        <h3
                          className="font-semibold mb-1 truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {snapshot.title || '未命名快照'}
                        </h3>
                        <p
                          className="text-xs mb-3 line-clamp-2"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {snapshot.description ||
                            `${snapshot.entities?.length || 0} 个实体 · ${snapshot.relations?.length || 0} 条关系`}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              background: 'var(--color-primary)',
                              color: 'var(--color-text-inverse)',
                            }}
                          >
                            {snapshot.entities?.length || 0} 实体
                          </span>
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              background: 'var(--color-secondary)',
                              color: 'var(--color-text-inverse)',
                            }}
                          >
                            {snapshot.relations?.length || 0} 关系
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
