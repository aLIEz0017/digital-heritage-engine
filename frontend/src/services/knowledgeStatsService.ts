import { useState, useEffect, useCallback, useRef } from 'react';
import { knowledgeApi, Entity, Relationship } from '../api/knowledge';

export interface KnowledgeStats {
  totalEntities: number;
  totalRelationships: number;
  entitiesByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  recentAdditions: number;
  avgConnectivity: number;
  lastUpdated: number;
}

interface EntityEvent {
  id: string;
  name?: string;
  type?: string;
}

interface RelationshipEvent {
  id: string;
  source_id?: string;
  target_id?: string;
  relation_type?: string;
}

interface StatsUpdateEvent {
  type:
    | 'entity_created'
    | 'entity_updated'
    | 'entity_deleted'
    | 'relationship_created'
    | 'relationship_deleted'
    | 'stats_updated';
  data: EntityEvent | RelationshipEvent | KnowledgeStats;
}

type StatsListener = (event: StatsUpdateEvent) => void;

class KnowledgeStatsService {
  private stats: KnowledgeStats | null = null;
  private listeners: Set<StatsListener> = new Set();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pollingInterval: NodeJS.Timeout | null = null;
  private usePolling = false;

  async getStats(forceRefresh = false): Promise<KnowledgeStats> {
    if (this.stats && !forceRefresh) {
      return this.stats;
    }

    try {
      const response = await knowledgeApi.getStats();
      this.stats = {
        totalEntities: response.total_entities || 0,
        totalRelationships: response.total_relationships || 0,
        entitiesByType: response.entities_by_type || {},
        relationshipsByType: response.relationships_by_type || {},
        recentAdditions: 0,
        avgConnectivity: 0,
        lastUpdated: Date.now(),
      };
      return this.stats;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return this.getDefaultStats();
    }
  }

  getDefaultStats(): KnowledgeStats {
    return {
      totalEntities: 0,
      totalRelationships: 0,
      entitiesByType: {},
      relationshipsByType: {},
      recentAdditions: 0,
      avgConnectivity: 0,
      lastUpdated: Date.now(),
    };
  }

  subscribe(listener: StatsListener): () => void {
    this.listeners.add(listener);

    if (this.listeners.size === 1) {
      this.connect();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  private connect() {
    if (this.usePolling) {
      this.startPolling();
      return;
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Stats WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleUpdate(data);
        } catch (error) {
          console.error('Failed to parse stats update:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Stats WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Stats WebSocket closed');
        this.ws = null;
        this.handleReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.usePolling = true;
      this.startPolling();
    }
  }

  private disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopPolling();
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.log('Max reconnect attempts reached, switching to polling');
      this.usePolling = true;
      this.startPolling();
    }
  }

  private startPolling() {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      try {
        const newStats = await this.getStats(true);
        if (this.stats && JSON.stringify(newStats) !== JSON.stringify(this.stats)) {
          this.notifyListeners({
            type: 'stats_updated',
            data: newStats,
          });
        }
        this.stats = newStats;
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private handleUpdate(event: StatsUpdateEvent) {
    this.notifyListeners(event);
    this.getStats(true);
  }

  private notifyListeners(event: StatsUpdateEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/v1/knowledge/stats/ws`;
  }

  async notifyEntityCreated(entity: Entity) {
    this.notifyListeners({ type: 'entity_created', data: entity });
    await this.getStats(true);
  }

  async notifyEntityUpdated(entity: Entity) {
    this.notifyListeners({ type: 'entity_updated', data: entity });
    await this.getStats(true);
  }

  async notifyEntityDeleted(entityId: string) {
    this.notifyListeners({ type: 'entity_deleted', data: { id: entityId } });
    await this.getStats(true);
  }

  async notifyRelationshipCreated(relationship: Relationship) {
    this.notifyListeners({ type: 'relationship_created', data: relationship });
    await this.getStats(true);
  }

  async notifyRelationshipDeleted(relationshipId: string) {
    this.notifyListeners({ type: 'relationship_deleted', data: { id: relationshipId } });
    await this.getStats(true);
  }
}

export const knowledgeStatsService = new KnowledgeStatsService();

export function useKnowledgeStats(autoRefresh = true, refreshInterval = 30000) {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const newStats = await knowledgeStatsService.getStats(true);
      setStats(newStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchStats, refreshInterval);
    }

    const unsubscribe = knowledgeStatsService.subscribe(() => {
      fetchStats();
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      unsubscribe();
    };
  }, [fetchStats, autoRefresh, refreshInterval]);

  const refresh = useCallback(() => {
    setLoading(true);
    return fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh };
}

export function useStatsUpdate() {
  const handleEntityCreated = useCallback(async (entity: Entity) => {
    await knowledgeStatsService.notifyEntityCreated(entity);
  }, []);

  const handleEntityUpdated = useCallback(async (entity: Entity) => {
    await knowledgeStatsService.notifyEntityUpdated(entity);
  }, []);

  const handleEntityDeleted = useCallback(async (entityId: string) => {
    await knowledgeStatsService.notifyEntityDeleted(entityId);
  }, []);

  const handleRelationshipCreated = useCallback(async (relationship: Relationship) => {
    await knowledgeStatsService.notifyRelationshipCreated(relationship);
  }, []);

  const handleRelationshipDeleted = useCallback(async (relationshipId: string) => {
    await knowledgeStatsService.notifyRelationshipDeleted(relationshipId);
  }, []);

  return {
    handleEntityCreated,
    handleEntityUpdated,
    handleEntityDeleted,
    handleRelationshipCreated,
    handleRelationshipDeleted,
  };
}
