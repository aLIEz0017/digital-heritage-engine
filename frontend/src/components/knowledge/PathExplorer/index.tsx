import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Route,
  ChevronRight,
  Search,
  X,
  Loader2,
  GitBranch,
  Layers,
  Star,
  ArrowRight,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Entity, Relationship } from '../../../api/knowledge';
import { getCategoryColor, getCategoryLabel, RELATION_LABELS } from '../../../constants/categories';

interface PathExplorerProps {
  entities: Entity[];
  relationships: Relationship[];
  onEntityClick: (entityId: string) => void;
  onPathSelect?: (path: string[]) => void;
  loading?: boolean;
}

interface PathNode {
  entity: Entity;
  depth: number;
  relationship?: Relationship;
}

interface ExplorationPath {
  id: string;
  nodes: PathNode[];
  totalDepth: number;
  score: number;
}

export default function PathExplorer({
  entities,
  relationships,
  onEntityClick,
  onPathSelect,
  loading,
}: PathExplorerProps) {
  const [startEntity, setStartEntity] = useState<Entity | null>(null);
  const [endEntity, setEndEntity] = useState<Entity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entity[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<'start' | 'end' | null>(null);
  const [paths, setPaths] = useState<ExplorationPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<ExplorationPath | null>(null);
  const [maxDepth, setMaxDepth] = useState(3);
  const [isExploring, setIsExploring] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() && activeSearchField) {
      const results = entities
        .filter(
          (e) =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 5);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, entities, activeSearchField]);

  const buildGraph = () => {
    const graph = new Map<string, Set<{ neighbor: string; relationship: Relationship }>>();

    entities.forEach((entity) => {
      graph.set(entity.id, new Set());
    });

    relationships.forEach((rel) => {
      if (graph.has(rel.source_id)) {
        graph.get(rel.source_id)!.add({ neighbor: rel.target_id, relationship: rel });
      }
      if (graph.has(rel.target_id)) {
        graph.get(rel.target_id)!.add({ neighbor: rel.source_id, relationship: rel });
      }
    });

    return graph;
  };

  const findPaths = (startId: string, endId: string, maxDepth: number): ExplorationPath[] => {
    const graph = buildGraph();
    const foundPaths: ExplorationPath[] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, targetId: string, path: PathNode[], depth: number) => {
      if (depth > maxDepth) return;
      if (currentId === targetId) {
        const entity = entities.find((e) => e.id === currentId);
        if (entity) {
          foundPaths.push({
            id: `path-${foundPaths.length}`,
            nodes: [...path, { entity, depth }],
            totalDepth: depth,
            score: calculatePathScore(path),
          });
        }
        return;
      }

      visited.add(currentId);
      const neighbors = graph.get(currentId);

      if (neighbors) {
        neighbors.forEach(({ neighbor, relationship }) => {
          if (!visited.has(neighbor)) {
            const entity = entities.find((e) => e.id === neighbor);
            if (entity) {
              dfs(
                neighbor,
                targetId,
                [...path, { entity, depth: depth + 1, relationship }],
                depth + 1
              );
            }
          }
        });
      }

      visited.delete(currentId);
    };

    const startEntity = entities.find((e) => e.id === startId);
    if (startEntity) {
      dfs(startId, endId, [{ entity: startEntity, depth: 0 }], 0);
    }

    return foundPaths.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  const calculatePathScore = (path: PathNode[]): number => {
    let score = 0;
    path.forEach((node) => {
      score += node.entity.importance * 10;
      if (node.relationship) {
        score += 5;
      }
    });
    score += (maxDepth - path.length) * 2;
    return score;
  };

  const handleExplore = async () => {
    if (!startEntity || !endEntity) return;

    setIsExploring(true);
    setSelectedPath(null);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const foundPaths = findPaths(startEntity.id, endEntity.id, maxDepth);
    setPaths(foundPaths);
    setIsExploring(false);
  };

  const handlePathClick = (path: ExplorationPath) => {
    setSelectedPath(path);
    if (onPathSelect) {
      onPathSelect(path.nodes.map((n) => n.entity.id));
    }
  };

  const handleExport = () => {
    if (!selectedPath) return;

    const data = {
      path: selectedPath.nodes.map((n) => ({
        name: n.entity.name,
        type: n.entity.type,
        relationship: n.relationship?.relation_type,
      })),
      score: selectedPath.score,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `path-${startEntity?.name}-to-${endEntity?.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStartEntity(null);
    setEndEntity(null);
    setPaths([]);
    setSelectedPath(null);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 rounded-full"
          style={{
            borderColor: 'var(--color-primary)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div
        className="w-80 backdrop-blur-xl border-r overflow-y-auto"
        style={{
          background: 'var(--gradient-card)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Route size={20} style={{ color: 'var(--color-info)' }} />
            <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
              路径探索
            </h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            选择起点和终点实体，探索知识图谱中的关联路径
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              起点实体
            </label>
            <div className="relative">
              {startEntity ? (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(startEntity.type),
                    }}
                  />
                  <span style={{ color: 'var(--color-text-primary)' }}>{startEntity.name}</span>
                  <button
                    onClick={() => setStartEntity(null)}
                    className="ml-auto"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="搜索起点..."
                    value={activeSearchField === 'start' ? searchQuery : ''}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveSearchField('start');
                    }}
                    onFocus={() => setActiveSearchField('start')}
                    className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              )}

              <AnimatePresence>
                {activeSearchField === 'start' && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-2 border rounded-lg shadow-xl overflow-hidden"
                    style={{
                      background: 'var(--gradient-card)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {searchResults.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => {
                          setStartEntity(entity);
                          setSearchQuery('');
                          setActiveSearchField(null);
                        }}
                        className="w-full flex items-center gap-2 p-3 transition-colors text-left"
                        style={{ background: 'var(--color-surface)' }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: getCategoryColor(entity.type),
                          }}
                        />
                        <span style={{ color: 'var(--color-text-primary)' }}>{entity.name}</span>
                        <span
                          className="text-xs ml-auto"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {getCategoryLabel(entity.type)}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight size={20} style={{ color: 'var(--color-text-muted)' }} />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              终点实体
            </label>
            <div className="relative">
              {endEntity ? (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(endEntity.type),
                    }}
                  />
                  <span style={{ color: 'var(--color-text-primary)' }}>{endEntity.name}</span>
                  <button
                    onClick={() => setEndEntity(null)}
                    className="ml-auto"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="搜索终点..."
                    value={activeSearchField === 'end' ? searchQuery : ''}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveSearchField('end');
                    }}
                    onFocus={() => setActiveSearchField('end')}
                    className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              )}

              <AnimatePresence>
                {activeSearchField === 'end' && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-2 border rounded-lg shadow-xl overflow-hidden"
                    style={{
                      background: 'var(--gradient-card)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {searchResults.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => {
                          setEndEntity(entity);
                          setSearchQuery('');
                          setActiveSearchField(null);
                        }}
                        className="w-full flex items-center gap-2 p-3 transition-colors text-left"
                        style={{ background: 'var(--color-surface)' }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: getCategoryColor(entity.type),
                          }}
                        />
                        <span style={{ color: 'var(--color-text-primary)' }}>{entity.name}</span>
                        <span
                          className="text-xs ml-auto"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {getCategoryLabel(entity.type)}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              最大探索深度: {maxDepth}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--color-info)' }}
            />
            <div
              className="flex justify-between text-xs mt-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span>1层</span>
              <span>5层</span>
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExplore}
              disabled={!startEntity || !endEntity || isExploring}
              className="flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              style={{
                background:
                  startEntity && endEntity && !isExploring
                    ? 'var(--gradient-primary)'
                    : 'var(--color-surface)',
                color:
                  startEntity && endEntity && !isExploring
                    ? 'var(--color-text-inverse)'
                    : 'var(--color-text-muted)',
              }}
            >
              {isExploring ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  探索中...
                </>
              ) : (
                <>
                  <Route size={18} />
                  开始探索
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="p-3 rounded-lg transition-colors"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <RefreshCw size={18} />
            </motion.button>
          </div>
        </div>

        {paths.length > 0 && (
          <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                发现路径 ({paths.length})
              </h4>
              {selectedPath && (
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <Download size={16} />
                </motion.button>
              )}
            </div>
            <div className="space-y-2">
              {paths.map((path, index) => (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handlePathClick(path)}
                  className="p-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background:
                      selectedPath?.id === path.id
                        ? 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))'
                        : 'var(--color-surface)',
                    opacity: selectedPath?.id === path.id ? 0.2 : 1,
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      路径 {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        深度: {path.totalDepth}
                      </span>
                      <div
                        className="flex items-center gap-1"
                        style={{ color: 'var(--color-warning)' }}
                      >
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs">{path.score.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs overflow-x-auto"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {path.nodes.slice(0, 4).map((node, i) => (
                      <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {node.entity.name}
                        </span>
                        {i < path.nodes.length - 1 && i < 3 && <ChevronRight size={12} />}
                      </span>
                    ))}
                    {path.nodes.length > 4 && (
                      <span style={{ color: 'var(--color-text-muted)' }}>...</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {selectedPath ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full p-8 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  路径详情
                </h3>
                <div className="flex items-center gap-2">
                  <div
                    className="px-3 py-1 rounded-full text-sm"
                    style={{
                      background: 'var(--color-info)',
                      color: 'var(--color-text-inverse)',
                      opacity: 0.2,
                    }}
                  >
                    深度: {selectedPath.totalDepth}
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-sm flex items-center gap-1"
                    style={{
                      background: 'var(--color-warning)',
                      color: 'var(--color-text-inverse)',
                      opacity: 0.2,
                    }}
                  >
                    <Star size={14} fill="currentColor" />
                    得分: {selectedPath.score.toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {selectedPath.nodes.map((node, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {node.relationship && (
                      <div className="flex items-center justify-center py-2">
                        <div
                          className="flex items-center gap-2 px-4 py-2 rounded-full"
                          style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <GitBranch size={14} style={{ color: 'var(--color-text-muted)' }} />
                          <span
                            className="text-sm"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {RELATION_LABELS[node.relationship.relation_type] ||
                              node.relationship.relation_type}
                          </span>
                        </div>
                      </div>
                    )}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onEntityClick(node.entity.id)}
                      className="p-4 backdrop-blur-xl rounded-xl cursor-pointer transition-all"
                      style={{
                        background: 'var(--gradient-card)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--color-shadow)',
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: `${getCategoryColor(node.entity.type)}20`,
                            border: `2px solid ${getCategoryColor(node.entity.type)}40`,
                          }}
                        >
                          <Layers
                            size={24}
                            style={{
                              color: getCategoryColor(node.entity.type),
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4
                              className="font-semibold"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {node.entity.name}
                            </h4>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor: `${getCategoryColor(node.entity.type)}20`,
                                color: getCategoryColor(node.entity.type),
                              }}
                            >
                              {getCategoryLabel(node.entity.type)}
                            </span>
                          </div>
                          {node.entity.description && (
                            <p
                              className="text-sm line-clamp-2"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {node.entity.description}
                            </p>
                          )}
                          <div
                            className="flex items-center gap-4 mt-2 text-xs"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {node.entity.region && <span>地域: {node.entity.region}</span>}
                            {node.entity.period && <span>时期: {node.entity.period}</span>}
                            <div
                              className="flex items-center gap-1 ml-auto"
                              style={{ color: 'var(--color-warning)' }}
                            >
                              <Star size={12} fill="currentColor" />
                              <span>{(node.entity.importance * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-surface)' }}
              >
                <Route size={40} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p
                className="text-xl font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                选择起点和终点
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                探索知识图谱中的关联路径
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
