import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton width="30%" height={16} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="80%" height={14} />
      </div>
    </div>
  );
}

export function EntityCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={14} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton width="100%" height={12} />
        <Skeleton width="90%" height={12} />
      </div>
    </motion.div>
  );
}

export function GraphSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 border-4 border-purple-500/30 border-b-purple-500 rounded-full"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 border-4 border-cyan-500/30 border-l-cyan-500 rounded-full"
          />
        </div>
        <p className="text-gray-400 text-sm">正在加载知识图谱...</p>
      </motion.div>
    </div>
  );
}

export function SessionListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <Skeleton width="70%" height={14} className="mb-2" />
          <Skeleton width="50%" height={12} />
        </motion.div>
      ))}
    </div>
  );
}

export function DetailPanelSkeleton() {
  return (
    <div className="w-96 bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-l border-slate-700/50 h-full flex flex-col p-6">
      <div className="flex items-start gap-4 mb-6">
        <Skeleton variant="rounded" width={80} height={28} />
        <Skeleton variant="rounded" width={60} height={28} />
      </div>

      <Skeleton width="60%" height={28} className="mb-4" />

      <div className="flex gap-2 mb-6">
        <Skeleton variant="rounded" width={60} height={32} />
        <Skeleton variant="rounded" width={60} height={32} />
      </div>

      <div className="space-y-4">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <Skeleton width="30%" height={14} className="mb-2" />
          <Skeleton width="100%" height={12} />
          <Skeleton width="90%" height={12} className="mt-1" />
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4">
          <Skeleton width="40%" height={14} className="mb-2" />
          <Skeleton width="100%" height={12} />
        </div>

        <div className="space-y-2">
          <Skeleton width="30%" height={14} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4">
              <Skeleton width="50%" height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start gap-4">
            <Skeleton variant="rounded" width={60} height={60} />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height={18} />
              <Skeleton width="80%" height={14} />
              <Skeleton width="40%" height={12} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="relative w-48 h-48 mx-auto mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-2 border-green-500/30 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 border-2 border-cyan-500/30 rounded-full"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-8 border-2 border-blue-500/30 rounded-full"
          />
        </div>
        <p className="text-gray-400 text-sm">正在加载地图...</p>
      </motion.div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex gap-4"
        >
          <div className="flex flex-col items-center">
            <Skeleton variant="circular" width={16} height={16} />
            {i < 5 && <div className="w-0.5 h-16 bg-gray-200 dark:bg-gray-700 mt-2" />}
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Skeleton width="30%" height={16} className="mb-2" />
            <Skeleton width="100%" height={14} />
            <Skeleton width="90%" height={14} className="mt-1" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function SearchPanelSkeleton() {
  return (
    <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" width="100%" height={48} />
      </div>
    </div>
  );
}

export function FilterPanelSkeleton() {
  return (
    <div className="w-64 bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-r border-slate-700/50 h-full flex flex-col p-4">
      <Skeleton width="60%" height={20} className="mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-3">
            <Skeleton width="80%" height={14} className="mb-2" />
            <Skeleton width="60%" height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
