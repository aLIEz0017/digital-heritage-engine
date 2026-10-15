import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, GitBranch } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MessageUpdateIndicatorProps {
  show: boolean;
  type: 'edit' | 'version' | 'regenerate';
  message?: string;
}

export function MessageUpdateIndicator({ show, type, message }: MessageUpdateIndicatorProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const config = {
    edit: {
      icon: CheckCircle2,
      color: 'var(--color-success)',
      bg: 'var(--color-success-alpha)',
      text: '已更新',
    },
    version: {
      icon: GitBranch,
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-alpha)',
      text: '版本已切换',
    },
    regenerate: {
      icon: GitBranch,
      color: 'var(--color-secondary)',
      bg: 'var(--color-secondary-alpha)',
      text: '重新生成中',
    },
  };

  const currentConfig = config[type];
  const Icon = currentConfig.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-2 right-2 z-10"
          style={{
            background: currentConfig.bg,
            border: `1px solid ${currentConfig.color}`,
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <Icon size={14} style={{ color: currentConfig.color }} />
          <span
            className="text-xs font-medium"
            style={{ color: currentConfig.color }}
          >
            {message || currentConfig.text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MessageUpdateIndicator;
