import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff, ServerOff, Clock, X } from 'lucide-react';
import { AnimatedButton } from '../ChatInteractions';

interface LoadingStateProps {
  type?: 'dots' | 'spinner' | 'pulse' | 'wave' | 'skeleton';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ type = 'dots', message, size = 'md' }: LoadingStateProps) {
  const sizeMap = {
    sm: { container: 'gap-1', dot: 'w-1.5 h-1.5', text: 'text-xs' },
    md: { container: 'gap-2', dot: 'w-2 h-2', text: 'text-sm' },
    lg: { container: 'gap-3', dot: 'w-3 h-3', text: 'text-base' },
  };

  const { container, dot, text } = sizeMap[size];

  const DotsLoader = () => (
    <div className={`flex items-center ${container}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${dot} rounded-full`}
          style={{ background: 'var(--color-primary)' }}
          animate={{
            y: [-8, 0, -8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );

  const SpinnerLoader = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="rounded-full border-2 border-transparent"
      style={{
        borderTopColor: 'var(--color-primary)',
        width: size === 'sm' ? 16 : size === 'md' ? 24 : 32,
        height: size === 'sm' ? 16 : size === 'md' ? 24 : 32,
      }}
    />
  );

  const PulseLoader = () => (
    <motion.div
      className="rounded-full"
      style={{ background: 'var(--color-primary)' }}
      animate={{
        scale: [1, 1.5, 1],
        opacity: [1, 0.5, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );

  const WaveLoader = () => (
    <div className={`flex items-end ${container}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ background: 'var(--color-primary)' }}
          animate={{
            height: ['20%', '100%', '20%'],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );

  const SkeletonLoader = () => (
    <div className="space-y-2">
      <motion.div
        className="h-4 rounded"
        style={{ background: 'var(--color-background-secondary)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.div
        className="h-4 rounded w-3/4"
        style={{ background: 'var(--color-background-secondary)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
      />
    </div>
  );

  const loaders = {
    dots: DotsLoader,
    spinner: SpinnerLoader,
    pulse: PulseLoader,
    wave: WaveLoader,
    skeleton: SkeletonLoader,
  };

  const Loader = loaders[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center justify-center gap-3 p-4"
    >
      <Loader />
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={text}
          style={{ color: 'var(--color-text-muted)' }}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}

interface ErrorStateProps {
  type?: 'network' | 'server' | 'timeout' | 'generic';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorState({
  type = 'generic',
  title,
  message,
  onRetry,
  onDismiss,
}: ErrorStateProps) {
  const errorConfig = {
    network: {
      icon: WifiOff,
      title: '网络连接失败',
      message: '请检查您的网络连接后重试',
      color: 'var(--color-error)',
    },
    server: {
      icon: ServerOff,
      title: '服务器错误',
      message: '服务器暂时无法响应，请稍后再试',
      color: 'var(--color-error)',
    },
    timeout: {
      icon: Clock,
      title: '请求超时',
      message: '请求处理时间过长，请重试',
      color: 'var(--color-warning)',
    },
    generic: {
      icon: AlertCircle,
      title: '发生错误',
      message: '操作失败，请重试',
      color: 'var(--color-error)',
    },
  };

  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl max-w-md mx-auto"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {onDismiss && (
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={16} />
        </motion.button>
      )}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="p-4 rounded-full"
        style={{ background: `color-mix(in srgb, ${config.color} 15%, transparent)` }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Icon size={32} style={{ color: config.color }} />
        </motion.div>
      </motion.div>

      <div className="text-center">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title || config.title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {message || config.message}
        </motion.p>
      </div>

      {onRetry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3"
        >
          <AnimatedButton
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <RefreshCw size={16} />
            重试
          </AnimatedButton>
        </motion.div>
      )}
    </motion.div>
  );
}

interface SuccessStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  duration?: number;
  onComplete?: () => void;
}

export function SuccessState({
  title = '操作成功',
  message,
  icon,
  duration = 2000,
  onComplete,
}: SuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onAnimationComplete={() => {
        if (onComplete) {
          setTimeout(onComplete, duration);
        }
      }}
      className="flex flex-col items-center justify-center gap-3 p-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="p-4 rounded-full"
        style={{ background: 'rgba(34, 197, 94, 0.1)' }}
      >
        {icon || (
          <motion.svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M20 6L9 17l-5-5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </motion.svg>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        {message && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {message}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 p-8"
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, -5, 5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="p-6 rounded-full"
        style={{ background: 'var(--color-background-secondary)' }}
      >
        {icon || (
          <div
            className="w-12 h-12 rounded-full"
            style={{ background: 'var(--color-primary-light)' }}
          />
        )}
      </motion.div>

      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {title || '暂无内容'}
        </h3>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          {message || '这里还没有任何内容'}
        </p>
      </div>

      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

interface ProgressIndicatorProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressIndicator({
  progress,
  label,
  showPercentage = true,
  size = 'md',
}: ProgressIndicatorProps) {
  const sizeMap = {
    sm: { height: 'h-1', text: 'text-xs' },
    md: { height: 'h-2', text: 'text-sm' },
    lg: { height: 'h-3', text: 'text-base' },
  };

  const { height, text } = sizeMap[size];
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between mb-2">
          {label && (
            <span className={text} style={{ color: 'var(--color-text-secondary)' }}>
              {label}
            </span>
          )}
          {showPercentage && (
            <motion.span
              key={clampedProgress}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={text}
              style={{ color: 'var(--color-text-muted)' }}
            >
              {Math.round(clampedProgress)}%
            </motion.span>
          )}
        </div>
      )}

      <div
        className={`w-full ${height} rounded-full overflow-hidden`}
        style={{ background: 'var(--color-background-secondary)' }}
      >
        <motion.div
          className={`${height} rounded-full`}
          style={{ background: 'var(--gradient-primary)' }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
        />
      </div>
    </div>
  );
}
