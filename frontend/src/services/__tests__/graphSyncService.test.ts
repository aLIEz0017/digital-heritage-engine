import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GraphSyncService, SyncEventType, SyncSource } from '../graphSyncService';
import { graphDataHub } from '../graphDataHub';
import { useGraphStore } from '../../stores/graphStore';

async function flushGraphSyncDebounce(): Promise<void> {
  await vi.advanceTimersByTimeAsync(200);
}

describe('GraphSyncService', () => {
  let service: GraphSyncService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = GraphSyncService.getInstance();
    graphDataHub.clear();
    useGraphStore.getState().clearGraphData();
    (service as unknown as { listeners: Map<string, Set<() => void>> }).listeners.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GraphSyncService.getInstance();
      const instance2 = GraphSyncService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Listener Management', () => {
    it('should add and remove listeners', async () => {
      const mockListener = vi.fn();
      const cleanup = service.addListener('test-module', mockListener);

      service.updateFromChat([], [], []);
      await flushGraphSyncDebounce();

      cleanup();

      service.updateFromChat([], [], []);
      await flushGraphSyncDebounce();

      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should notify all listeners for a module', async () => {
      const mockListener1 = vi.fn();
      const mockListener2 = vi.fn();

      service.addListener('test-module', mockListener1);
      service.addListener('test-module', mockListener2);

      service.updateFromChat([], [], []);
      await flushGraphSyncDebounce();

      expect(mockListener1).toHaveBeenCalled();
      expect(mockListener2).toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = () => {
        throw new Error('Test error');
      };

      service.addListener('test-module', errorListener);

      service.updateFromChat([], [], []);
      await flushGraphSyncDebounce();
    });
  });

  describe('updateFromChat', () => {
    it('should update graphStore for a session bucket and mirror display', () => {
      const entities = [{ id: '1', name: 'Entity1', type: 'inheritor' as const }];
      const relations: { id: string; source: string; target: string; type: string }[] = [];
      const keywords = ['keyword1'];

      service.updateFromChat(entities, relations, keywords, 'session-1', 'message-1');

      const gs = useGraphStore.getState();
      expect(gs.graphsBySessionId['session-1']?.entities).toEqual(entities);
      expect(gs.entities).toEqual(entities);
      expect(gs.sessionId).toBe('session-1');
      expect(gs.source).toBe('chat');
    });

    it('should keep session A graph when updating session B while A is active', () => {
      const aEntity = { id: 'a', name: 'A', type: 'inheritor' as const };
      const bEntity = { id: 'b', name: 'B', type: 'heritage' as const };

      service.updateFromChat([aEntity], [], [], 'session-a', 'm1');
      useGraphStore.getState().setActiveChatSession('session-a');

      service.updateFromChat([bEntity], [], [], 'session-b', 'm2');

      expect(useGraphStore.getState().graphsBySessionId['session-a']?.entities).toEqual([
        aEntity,
      ]);
      expect(useGraphStore.getState().graphsBySessionId['session-b']?.entities).toEqual([
        bEntity,
      ]);
      const top = useGraphStore.getState().entities;
      expect(top.some((e) => e.id === 'a')).toBe(true);
      expect(top.some((e) => e.id === 'b')).toBe(false);
    });
  });

  describe('updateFromKnowledge', () => {
    it('should replace displayed graph with knowledge source', () => {
      const entities = [{ id: '1', name: 'Entity1', type: 'inheritor' as const }];
      const relations: { id: string; source: string; target: string; type: string }[] = [];
      const keywords = ['keyword1'];

      service.updateFromKnowledge(entities, relations, keywords);

      const gs = useGraphStore.getState();
      expect(gs.entities).toEqual(entities);
      expect(gs.source).toBe('knowledge');
    });
  });

  describe('updateFromSnapshot', () => {
    it('should replace session bucket when sessionId is set', () => {
      const entities = [{ id: '1', name: 'Entity1', type: 'inheritor' as const }];
      const relations: { id: string; source: string; target: string; type: string }[] = [];
      const keywords = ['keyword1'];

      service.updateFromSnapshot(entities, relations, keywords, 'session-1', 'message-1');

      const gs = useGraphStore.getState();
      expect(gs.graphsBySessionId['session-1']?.entities).toEqual(entities);
      expect(gs.graphsBySessionId['session-1']?.keywords).toEqual(keywords);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to graph updates', async () => {
      const mockCallback = vi.fn();

      const unsubscribe = service.subscribe('test-module', mockCallback);

      service.updateFromChat([{ id: '1', name: 'Entity1', type: 'inheritor' as const }], [], []);
      await flushGraphSyncDebounce();

      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0].entities.length).toBe(1);

      unsubscribe();
    });

    it('should filter out updates from the same module', async () => {
      const mockCallback = vi.fn();

      const unsubscribe = service.subscribe('chat', mockCallback);

      service.updateFromChat([], [], []);
      await flushGraphSyncDebounce();

      expect(mockCallback).not.toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('getCurrentState', () => {
    it('should return current graph state', () => {
      const entities = [{ id: '1', name: 'Entity1', type: 'inheritor' as const }];

      service.updateFromChat(entities, [], [], 's1', 'm1');

      const state = service.getCurrentState();
      expect(state).toBeTruthy();
      expect(state?.entities).toEqual(entities);
    });

    it('should return null when no state', () => {
      useGraphStore.getState().clearGraphData();
      const state = service.getCurrentState();
      expect(state).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear graph data', () => {
      service.updateFromChat([{ id: '1', name: 'Entity1', type: 'inheritor' as const }], [], [], 's1');

      service.clear();

      const state = service.getCurrentState();
      expect(state).toBeNull();
      expect(Object.keys(useGraphStore.getState().graphsBySessionId)).toHaveLength(0);
    });

    it('should notify listeners of clear event', () => {
      const mockListener = vi.fn();
      service.addListener('test-module', mockListener);

      service.clear();

      expect(mockListener).toHaveBeenCalled();
      expect(mockListener.mock.calls[0][0].type).toBe(SyncEventType.CLEAR);
    });
  });

  describe('Event Types', () => {
    it('should use correct event types', () => {
      expect(SyncEventType.UPDATE).toBe('UPDATE');
      expect(SyncEventType.SNAPSHOT).toBe('SNAPSHOT');
      expect(SyncEventType.CLEAR).toBe('CLEAR');
      expect(SyncEventType.MERGE).toBe('MERGE');
    });
  });

  describe('Sync Sources', () => {
    it('should use correct sync sources', () => {
      expect(SyncSource.CHAT).toBe('chat');
      expect(SyncSource.KNOWLEDGE).toBe('knowledge');
      expect(SyncSource.SNAPSHOT).toBe('snapshot');
    });
  });
});
