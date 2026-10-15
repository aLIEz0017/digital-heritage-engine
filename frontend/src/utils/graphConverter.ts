/**
 * 统一的图谱数据转换工具
 * 为 Chat 和 Knowledge 模块提供一致的图谱数据转换功能
 */

import type {
  Entity,
  Relation,
  EntityType,
  RelationType,
  GraphData,
  GraphNode,
  GraphEdge,
} from '../types/graph';
import { CATEGORY_COLORS } from '../constants/categories';

/**
 * 获取实体颜色（统一使用 CSS 变量）
 */
export function getEntityColor(type: EntityType): string {
  return CATEGORY_COLORS[type] || 'var(--color-text-muted)';
}

/**
 * 获取关系颜色（基于关系类型）
 */
export function getRelationColor(type: RelationType | string): string {
  const colors: Record<string, string> = {
    inherits: 'var(--color-primary)',
    origin: 'var(--color-secondary)',
    creates: 'var(--color-accent)',
    flourished_in: 'var(--color-info)',
    located_in: 'var(--color-success)',
    uses_material: 'var(--color-warning)',
    has_pattern: 'var(--color-error)',
    related_to: 'var(--color-text-muted)',
    influenced_by: 'var(--color-primary-hover)',
    contains: 'var(--color-secondary-hover)',
  };
  return colors[type] || 'var(--color-border)';
}

/**
 * 计算节点大小（基于重要性/相关性）
 */
export function calculateNodeSize(relevance: number, minSize = 20, maxSize = 50): number {
  return minSize + (maxSize - minSize) * Math.min(1, Math.max(0, relevance));
}

/**
 * 实体去重和合并
 * 基于名称和类型合并相同实体，保留最高的 relevance/importance
 */
function deduplicateEntitiesWithRemap(entities: Entity[]): {
  entities: Entity[];
  idRemap: Map<string, string>;
} {
  const entityMap = new Map<string, Entity>();
  const idRemap = new Map<string, string>();

  entities.forEach((entity) => {
    const key = `${entity.name.toLowerCase().trim()}_${entity.type}`;
    const existing = entityMap.get(key);

    if (!existing) {
      const normalized = { ...entity, id: String(entity.id) };
      entityMap.set(key, normalized);
    } else {
      const curId = String(entity.id);
      const keptId = String(existing.id);
      if (curId !== keptId) {
        idRemap.set(curId, keptId);
      }
      // 合并：保留更高的 relevance/importance
      if (entity.description && !existing.description) {
        existing.description = entity.description;
      }
      if (entity.relevance && (!existing.relevance || entity.relevance > existing.relevance)) {
        existing.relevance = entity.relevance;
      }
      if (entity.importance && (!existing.importance || entity.importance > existing.importance)) {
        existing.importance = entity.importance;
      }
      // 合并 metadata
      if (entity.metadata) {
        existing.metadata = { ...existing.metadata, ...entity.metadata };
      }
    }
  });

  return {
    entities: Array.from(entityMap.values()),
    idRemap,
  };
}

/**
 * 关系去重和合并
 * 基于 source-target-type 合并相同关系
 */
function normalizeEntityLabel(s: string): string {
  return String(s ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const RELATION_ENDPOINT_STRIP_CHARS = new Set(
  (' \t\r\n"\'`「」《》『』【】[]\u201c\u201d\u2018\u2019').split('')
);

function stripRelationEndpointWrappers(s: string): string {
  const t0 = String(s ?? '').trim();
  if (!t0) return '';
  let i = 0;
  let j = t0.length - 1;
  while (i <= j && RELATION_ENDPOINT_STRIP_CHARS.has(t0[i])) i += 1;
  while (j >= i && RELATION_ENDPOINT_STRIP_CHARS.has(t0[j])) j -= 1;
  return i <= j ? t0.slice(i, j + 1).trim() : '';
}

function relationRawNameVariants(s0: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (x: string) => {
    const t = x.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  add(s0);
  const noParen = s0.replace(/[（(][^）)]{0,64}[）)]\s*$/u, '').trim();
  add(noParen);
  if (noParen.length > 2 && noParen.startsWith('《') && noParen.endsWith('》')) {
    add(noParen.slice(1, -1).trim());
  }
  return out;
}

/**
 * 将关系边的 source/target 解析为当前实体列表中的 id。
 * 与后端 `_resolve_relation_entity_ref` 一致：优先 id / 规范化精确名称；
 * 否则仅当「列表中某完整名称」作为子串命中且最长名称唯一时落边，避免子串误接。
 */
function buildEntityRefResolver(entities: Entity[]) {
  const idSet = new Set(entities.map((e) => String(e.id)));
  const exactNormToId = new Map<string, string>();
  entities.forEach((e) => {
    const id = String(e.id);
    const raw = (e.name || '').trim();
    if (!raw) return;
    const k = normalizeEntityLabel(raw);
    if (!exactNormToId.has(k)) {
      exactNormToId.set(k, id);
    }
  });

  return (ref: string): string | null => {
    const s0 = stripRelationEndpointWrappers(String(ref ?? '').trim());
    if (!s0) return null;
    if (idSet.has(s0)) return s0;

    for (const cand of relationRawNameVariants(s0)) {
      const nc = normalizeEntityLabel(cand);
      if (!nc) continue;
      const byExact = exactNormToId.get(nc);
      if (byExact) return byExact;
    }

    const normRaw = normalizeEntityLabel(s0);
    if (normRaw.length < 2) return null;

    const hits: { len: number; id: string }[] = [];
    for (const e of entities) {
      const en = (e.name || '').trim();
      if (en.length < 2) continue;
      const nen = normalizeEntityLabel(en);
      if (nen.length < 2) continue;
      if (normRaw.includes(nen)) {
        hits.push({ len: nen.length, id: String(e.id) });
      }
    }
    if (hits.length === 0) return null;
    const mx = Math.max(...hits.map((h) => h.len));
    const atMax = hits.filter((h) => h.len === mx);
    if (atMax.length !== 1) return null;
    const resolved = atMax[0].id;
    return idSet.has(resolved) ? resolved : null;
  };
}

function deduplicateRelations(relations: Relation[]): Relation[] {
  const relationMap = new Map<string, Relation>();

  relations.forEach((relation) => {
    const key = `${relation.source}_${relation.target}_${relation.type}`;
    const existing = relationMap.get(key);

    if (!existing) {
      relationMap.set(key, relation);
    } else {
      // 合并：保留更高的 confidence
      if (
        relation.confidence &&
        (!existing.confidence || relation.confidence > existing.confidence)
      ) {
        existing.confidence = relation.confidence;
      }
    }
  });

  return Array.from(relationMap.values());
}

/**
 * 将 Entity 和 Relation 转换为统一的 GraphData
 * 这是主函数，两个模块都应该使用这个函数
 */
export function entitiesToGraphData(
  entities: Entity[],
  relations: Relation[] = [],
  options?: {
    maxNodes?: number;
    minRelevance?: number;
  }
): GraphData {
  // 先去重
  const { entities: uniqueEntities, idRemap } = deduplicateEntitiesWithRemap(entities);

  const resolveId = (id: string): string => {
    let cur = String(id);
    const seen = new Set<string>();
    while (idRemap.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = idRemap.get(cur)!;
    }
    return cur;
  };

  const remappedRelations = relations.map((relation) => ({
    ...relation,
    source: resolveId(String(relation.source)),
    target: resolveId(String(relation.target)),
  }));
  const uniqueRelations = deduplicateRelations(remappedRelations);

  // 过滤实体
  let filteredEntities = uniqueEntities;

  if (options?.minRelevance) {
    filteredEntities = uniqueEntities.filter((e) => (e.relevance || 1) >= options.minRelevance!);
  }

  if (options?.maxNodes && filteredEntities.length > options.maxNodes) {
    filteredEntities = filteredEntities
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, options.maxNodes);
  }

  // 转换节点
  const nodes: GraphNode[] = filteredEntities.map((entity) => {
    // 优先使用 importance 字段（Knowledge 模块），否则使用 relevance（Chat 模块）
    const relevance = entity.importance ?? entity.relevance ?? 0.5;
    const node: GraphNode = {
      id: String(entity.id),
      name: entity.name,
      category: entity.type,
      symbolSize: calculateNodeSize(relevance),
      value: relevance,
      description: entity.description,
      metadata: entity.metadata,
      itemStyle: {
        color: getEntityColor(entity.type),
        borderColor: 'var(--color-border)',
        borderWidth: 2,
      },
    };

    // 合并 Knowledge 模块的额外字段到 metadata
    const metadataUpdates: Record<string, unknown> = {};
    if (entity.region) {
      metadataUpdates.region = entity.region;
    }
    if (entity.period) {
      metadataUpdates.period = entity.period;
    }
    if (entity.coordinates) {
      metadataUpdates.coordinates = entity.coordinates;
    }
    if (Object.keys(metadataUpdates).length > 0) {
      node.metadata = { ...node.metadata, ...metadataUpdates };
    }

    return node;
  });

  // 转换关系（端点支持 id 或实体名称，与知识页 tooltip 行为一致）
  const edges: GraphEdge[] = [];
  const entityIds = new Set(filteredEntities.map((e) => String(e.id)));
  const resolveEndpoint = buildEntityRefResolver(filteredEntities);

  uniqueRelations.forEach((relation, index) => {
    const sourceId = resolveEndpoint(String(relation.source));
    const targetId = resolveEndpoint(String(relation.target));
    if (
      sourceId &&
      targetId &&
      entityIds.has(sourceId) &&
      entityIds.has(targetId) &&
      sourceId !== targetId
    ) {
      edges.push({
        id: relation.id || `edge_${index}`,
        source: sourceId,
        target: targetId,
        relationType: relation.type,
        value: relation.confidence || 0.5,
        lineStyle: {
          color: getRelationColor(relation.type),
          width: Math.max(1, (relation.confidence || 0.5) * 3),
          curveness: 0.3,
          opacity: 0.6,
        },
      });
    }
  });

  // 生成分类
  const categories = getCategories(filteredEntities);

  return { nodes, edges, categories };
}

/**
 * 获取分类信息
 */
function getCategories(entities: Entity[]): GraphData['categories'] {
  const typeSet = new Set<EntityType>(entities.map((e) => e.type));
  return Array.from(typeSet).map((type) => ({
    name: type,
    baseColor: getEntityColor(type),
    itemStyle: {
      color: getEntityColor(type),
    },
  }));
}

/**
 * 过滤图谱数据
 */
export function filterGraphData(
  data: GraphData,
  filter: {
    entityTypes?: EntityType[];
    relationTypes?: (RelationType | string)[];
    minConfidence?: number;
    searchQuery?: string;
  }
): GraphData {
  let filteredNodes = [...data.nodes];
  let filteredEdges = [...data.edges];

  // 按实体类型过滤
  if (filter.entityTypes && filter.entityTypes.length > 0) {
    filteredNodes = filteredNodes.filter((n) => filter.entityTypes!.includes(n.category));
  }

  // 按搜索查询过滤
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    filteredNodes = filteredNodes.filter(
      (n) => n.name.toLowerCase().includes(query) || n.description?.toLowerCase().includes(query)
    );
  }

  // 确保边的节点都在过滤后的节点中
  const nodeIds = new Set(filteredNodes.map((n) => n.id));
  filteredEdges = filteredEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  // 按关系类型过滤
  if (filter.relationTypes && filter.relationTypes.length > 0) {
    filteredEdges = filteredEdges.filter((e) => filter.relationTypes!.includes(e.relationType!));
  }

  // 按置信度过滤
  if (filter.minConfidence) {
    filteredEdges = filteredEdges.filter((e) => (e.value || 1) >= filter.minConfidence!);
  }

  // 重新生成分类
  const categories = getCategories(
    filteredNodes.map(
      (n) =>
        ({
          id: n.id,
          name: n.name,
          type: n.category,
          description: n.description,
          relevance: n.value,
          metadata: n.metadata,
        }) as Entity
    )
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    categories,
  };
}

/**
 * 合并多个图谱数据
 */
export function mergeGraphData(...graphs: GraphData[]): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const mergedEdges: GraphEdge[] = [];

  graphs.forEach((graph) => {
    graph.nodes.forEach((node) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    });

    graph.edges.forEach((edge) => {
      const edgeKey = `${edge.source}-${edge.target}-${edge.relationType}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        mergedEdges.push(edge);
      }
    });
  });

  const allCategories = graphs
    .flatMap((g) => g.categories || [])
    .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i);

  return {
    nodes: Array.from(nodeMap.values()),
    edges: mergedEdges,
    categories: allCategories,
  };
}

/**
 * 计算图谱统计信息
 */
export function calculateGraphStats(data: GraphData): {
  nodeCount: number;
  edgeCount: number;
  categoryCount: number;
  avgNodeDegree: number;
  density: number;
} {
  const nodeCount = data.nodes.length;
  const edgeCount = data.edges.length;
  const categoryCount = (data.categories || []).length;

  // 计算节点度数
  const degrees = new Map<string, number>();
  data.nodes.forEach((node) => {
    degrees.set(node.id, 0);
  });

  data.edges.forEach((edge) => {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  });

  const avgNodeDegree =
    degrees.size > 0 ? Array.from(degrees.values()).reduce((a, b) => a + b, 0) / degrees.size : 0;

  // 计算图密度
  const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

  return {
    nodeCount,
    edgeCount,
    categoryCount,
    avgNodeDegree,
    density,
  };
}

/**
 * 获取与指定节点相连的节点（指定深度）
 */
export function getConnectedNodes(data: GraphData, nodeId: string, depth: number = 1): GraphData {
  const connectedNodeIds = new Set<string>([nodeId]);
  const connectedEdges: GraphEdge[] = [];

  // BFS 查找连接的节点
  let currentDepth = 0;
  let frontier = [nodeId];

  while (currentDepth < depth && frontier.length > 0) {
    const nextFrontier: string[] = [];

    data.edges.forEach((edge) => {
      if (frontier.includes(edge.source) && !connectedNodeIds.has(edge.target)) {
        connectedNodeIds.add(edge.target);
        nextFrontier.push(edge.target);
        connectedEdges.push(edge);
      } else if (frontier.includes(edge.target) && !connectedNodeIds.has(edge.source)) {
        connectedNodeIds.add(edge.source);
        nextFrontier.push(edge.source);
        connectedEdges.push(edge);
      } else if (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)) {
        if (!connectedEdges.includes(edge)) {
          connectedEdges.push(edge);
        }
      }
    });

    frontier = nextFrontier;
    currentDepth++;
  }

  const connectedNodes = data.nodes.filter((n) => connectedNodeIds.has(n.id));
  const categories = getCategories(
    connectedNodes.map(
      (n) =>
        ({
          id: n.id,
          name: n.name,
          type: n.category,
          description: n.description,
          relevance: n.value,
          metadata: n.metadata,
        }) as Entity
    )
  );

  return {
    nodes: connectedNodes,
    edges: connectedEdges,
    categories,
  };
}

/**
 * 获取 Top K 个重要节点
 */
export function getTopKNodes(data: GraphData, k: number): GraphData {
  if (data.nodes.length <= k) {
    return data;
  }

  // 计算节点重要性分数（结合 value 和度数）
  const degrees = new Map<string, number>();
  data.nodes.forEach((node) => {
    degrees.set(node.id, 0);
  });

  data.edges.forEach((edge) => {
    degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
  });

  const scoredNodes = data.nodes.map((node) => ({
    node,
    score:
      (node.value || 0.5) * 0.6 +
      ((degrees.get(node.id) || 0) / Math.max(1, data.edges.length)) * 0.4,
  }));

  scoredNodes.sort((a, b) => b.score - a.score);

  const topKNodes = scoredNodes.slice(0, k).map((item) => item.node);
  const topKNodeIds = new Set(topKNodes.map((n) => n.id));

  const topKEdges = data.edges.filter(
    (edge) => topKNodeIds.has(edge.source) && topKNodeIds.has(edge.target)
  );

  const categories = getCategories(
    topKNodes.map(
      (n) =>
        ({
          id: n.id,
          name: n.name,
          type: n.category,
          description: n.description,
          relevance: n.value,
          metadata: n.metadata,
        }) as Entity
    )
  );

  return {
    nodes: topKNodes,
    edges: topKEdges,
    categories,
  };
}
