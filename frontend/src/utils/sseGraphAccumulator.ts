/**
 * SSE complete 事件里常带空数组 []。用 `data.entities || latest` 会保留 [] 而丢掉
 * entities/keywords/relations 分片事件累积的数据（[] 在 JS 中为 truthy）。
 */
export function ssePreferNonEmptyList<T>(
  fromComplete: T[] | undefined | null,
  accumulated: T[]
): T[] {
  if (Array.isArray(fromComplete) && fromComplete.length > 0) return fromComplete;
  if (accumulated.length > 0) return accumulated;
  return Array.isArray(fromComplete) ? fromComplete : [];
}
