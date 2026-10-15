/**
 * 用户中心「累计生成」节点 / 关系统计。
 * 按用户 id 存 localStorage；每轮问答完成后由聊天页在收到助手 entities、relations 时累加。
 */

const STORAGE_KEY = 'heritage_exploration_graph_stats';

export type HeritageGraphStats = {
  totalEntitiesProduced: number;
  totalRelationsProduced: number;
};

function storageKeyForUser(userId: string | undefined | null): string {
  return userId != null && String(userId).length > 0 ? String(userId) : 'guest';
}

export function loadHeritageGraphStats(userId: string | undefined | null): HeritageGraphStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, HeritageGraphStats> = raw ? JSON.parse(raw) : {};
    const u = all[storageKeyForUser(userId)];
    return {
      totalEntitiesProduced: u?.totalEntitiesProduced ?? 0,
      totalRelationsProduced: u?.totalRelationsProduced ?? 0,
    };
  } catch {
    return { totalEntitiesProduced: 0, totalRelationsProduced: 0 };
  }
}

/** 本轮助手消息产出的节点数、关系数（按接口返回条数）累加到当前用户 */
export function addHeritageGraphProduction(
  userId: string | undefined | null,
  entityCount: number,
  relationCount: number
): HeritageGraphStats {
  const ec = Math.max(0, Math.floor(entityCount));
  const rc = Math.max(0, Math.floor(relationCount));
  if (ec === 0 && rc === 0) {
    return loadHeritageGraphStats(userId);
  }

  const cur = loadHeritageGraphStats(userId);
  const next: HeritageGraphStats = {
    totalEntitiesProduced: cur.totalEntitiesProduced + ec,
    totalRelationsProduced: cur.totalRelationsProduced + rc,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, HeritageGraphStats> = raw ? JSON.parse(raw) : {};
    all[storageKeyForUser(userId)] = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('heritage-graph-stats-updated', { detail: next }));
  }

  return next;
}
