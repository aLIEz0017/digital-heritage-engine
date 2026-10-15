import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

export type ConfirmDialogType = 'warning' | 'info' | 'success' | 'danger';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: ConfirmDialogType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  showCloseButton?: boolean;
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    iconColor: 'var(--color-warning)',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'var(--color-warning)',
  },
  info: {
    icon: Info,
    iconColor: 'var(--color-primary)',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'var(--color-primary)',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'var(--color-success)',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'var(--color-success)',
  },
  danger: {
    icon: XCircle,
    iconColor: 'var(--color-error)',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'var(--color-error)',
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  showCloseButton = true,
}: ConfirmDialogProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        } else if (e.key === 'Enter') {
          onConfirm();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      confirmButtonRef.current?.focus();

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onConfirm, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-xl overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 flex items-start gap-4"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: config.bgColor,
                  border: `1px solid ${config.borderColor}`,
                }}
              >
                <Icon size={20} style={{ color: config.iconColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {title}
                </h3>
                <p
                  className="text-xs mt-1.5 leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {message}
                </p>
              </div>

              {showCloseButton && (
                <button
                  onClick={onCancel}
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0"
                  style={{
                    color: 'var(--color-text-muted)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-background-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="px-5 py-4 flex items-center justify-end gap-3">
              <motion.button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {cancelText}
              </motion.button>

              <motion.button
                ref={confirmButtonRef}
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: type === 'danger' ? 'var(--color-error)' : 'var(--color-primary)',
                  color: 'var(--color-text-inverse)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
