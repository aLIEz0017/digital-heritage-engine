import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNetworkStore } from '../../../stores/networkStore';
import { useToast } from '../Toast';

interface NetworkNotificationProviderProps {
  children: React.ReactNode;
}

export default function NetworkNotificationProvider({
  children,
}: NetworkNotificationProviderProps) {
  const { status, queuedRequestsCount, latency } = useNetworkStore();
  const { success, error, warning, info, addToast, removeToast } = useToast();
  const prevStatusRef = useRef(status);
  const prevQueueCountRef = useRef(queuedRequestsCount);
  const reconnectToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (reconnectToastIdRef.current) {
        removeToast(reconnectToastIdRef.current);
        reconnectToastIdRef.current = null;
      }

      switch (status) {
        case 'offline':
          error('网络连接已断开', '请检查您的网络连接，部分功能将暂时不可用');
          break;
        case 'online':
          if (prevStatusRef.current === 'offline' || prevStatusRef.current === 'reconnecting') {
            success('网络已恢复', latency ? `连接延迟: ${Math.round(latency)}ms` : '连接正常');
          }
          break;
        case 'reconnecting': {
          const toastId = `reconnect_${Date.now()}`;
          addToast({
            type: 'info',
            title: '正在重新连接',
            message: '正在尝试恢复网络连接...',
            duration: 0,
          });
          reconnectToastIdRef.current = toastId;
          break;
        }
        case 'degraded':
          warning('网络连接不稳定', '部分服务可能暂时不可用');
          break;
      }
      prevStatusRef.current = status;
    }
  }, [status, success, error, warning, info, addToast, removeToast, latency]);

  useEffect(() => {
    if (prevQueueCountRef.current > 0 && queuedRequestsCount === 0 && status === 'online') {
      success('离线请求已同步', '所有待发送请求已成功处理');
    }

    if (queuedRequestsCount > prevQueueCountRef.current && status === 'offline') {
      info('请求已加入队列', `当前有 ${queuedRequestsCount} 个请求等待发送`);
    }

    prevQueueCountRef.current = queuedRequestsCount;
  }, [queuedRequestsCount, status, success, info]);

  return <>{children}</>;
}

export function NetworkStatusToast() {
  const { status, latency, reconnectAttempts, forceReconnect, isManualReconnect } =
    useNetworkStore();

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />,
          title: '网络连接正常',
          message: latency ? `延迟: ${Math.round(latency)}ms` : '连接稳定',
          type: 'success' as const,
        };
      case 'offline':
        return {
          icon: <WifiOff size={20} style={{ color: 'var(--color-error)' }} />,
          title: '网络已断开',
          message: '请检查网络连接',
          type: 'error' as const,
          action: {
            label: '重新连接',
            onClick: forceReconnect,
          },
        };
      case 'reconnecting':
        return {
          icon: (
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-info)' }} />
          ),
          title: '正在重连',
          message: `尝试 ${reconnectAttempts} 次`,
          type: 'info' as const,
        };
      case 'degraded':
        return {
          icon: <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />,
          title: '连接不稳定',
          message: '部分服务可能受影响',
          type: 'warning' as const,
          action: {
            label: '重新连接',
            onClick: forceReconnect,
          },
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-4 right-4 z-[200] p-4 rounded-xl shadow-lg max-w-sm"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {config.title}
          </h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {config.message}
          </p>
        </div>
        {config.action && (
          <button
            onClick={config.action.onClick}
            disabled={isManualReconnect}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-text-inverse)',
            }}
          >
            {config.action.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function ConnectionQualityIndicator() {
  const { latency, status } = useNetworkStore();

  if (status !== 'online' || latency === null) return null;

  const getQuality = () => {
    if (latency < 100) return { label: '优秀', color: 'var(--color-success)', width: '100%' };
    if (latency < 200) return { label: '良好', color: 'var(--color-info)', width: '75%' };
    if (latency < 400) return { label: '一般', color: 'var(--color-warning)', width: '50%' };
    return { label: '较差', color: 'var(--color-error)', width: '25%' };
  };

  const quality = getQuality();

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--color-background-tertiary)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: quality.width }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ background: quality.color }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {quality.label}
      </span>
    </div>
  );
}
