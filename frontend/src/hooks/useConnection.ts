import { useState, useEffect, useCallback } from 'react';
import {
  connectionManager,
  ConnectionStatus,
  ConnectionState,
} from '../services/connectionManager';

export function useConnection() {
  const [state, setState] = useState<ConnectionState>(connectionManager.getState());

  useEffect(() => {
    const unsubscribe = connectionManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const forceReconnect = useCallback(async () => {
    return connectionManager.forceReconnect();
  }, []);

  const checkHealth = useCallback(async () => {
    return connectionManager.checkHealth();
  }, []);

  return {
    ...state,
    forceReconnect,
    checkHealth,
    isOnline: state.status === 'online',
    isOffline: state.status === 'offline',
    isReconnecting: state.status === 'reconnecting',
    isDegraded: state.status === 'degraded',
  };
}

export function useConnectionStatus() {
  const { status, latency, lastConnected, reconnectAttempts } = useConnection();

  return {
    status,
    latency,
    lastConnected,
    reconnectAttempts,
    isConnected: status === 'online',
    isConnecting: status === 'reconnecting',
    isDisconnected: status === 'offline',
    isDegraded: status === 'degraded',
  };
}

export function useOfflineQueue() {
  const { queuedRequestsCount } = useConnection();

  const getQueuedRequests = useCallback(() => {
    return connectionManager.getQueuedRequests();
  }, []);

  const clearQueue = useCallback(() => {
    connectionManager.clearQueue();
  }, []);

  return {
    queuedRequestsCount,
    getQueuedRequests,
    clearQueue,
    hasQueuedRequests: queuedRequestsCount > 0,
  };
}

export type { ConnectionStatus, ConnectionState };
