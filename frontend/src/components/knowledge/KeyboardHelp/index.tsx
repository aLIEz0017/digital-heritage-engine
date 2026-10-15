import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutItem {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
}

interface KeyboardHelpProps {
  visible: boolean;
  onClose: () => void;
  shortcuts: ShortcutItem[];
}

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center min-w-[28px] px-2 py-1 border rounded text-xs font-mono"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {children}
    </span>
  );
}

export default function KeyboardHelp({ visible, onClose, shortcuts }: KeyboardHelpProps) {
  const groupedShortcuts = shortcuts.reduce<Record<string, ShortcutItem[]>>((acc, shortcut) => {
    const group = shortcut.ctrl ? '组合键' : '单键';
    if (!acc[group]) acc[group] = [];
    acc[group].push(shortcut);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: 'var(--gradient-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Keyboard size={20} style={{ color: 'var(--color-text-inverse)' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    键盘快捷键
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    使用快捷键提升操作效率
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </motion.button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {Object.entries(groupedShortcuts).map(([group, items]) => (
                <div key={group}>
                  <h4
                    className="text-sm font-medium mb-3"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {group}
                  </h4>
                  <div className="space-y-2">
                    {items.map((shortcut, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-lg transition-colors"
                        style={{ background: 'var(--color-surface)' }}
                      >
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.ctrl && (
                            <>
                              <KeyBadge>Ctrl</KeyBadge>
                              <span style={{ color: 'var(--color-text-muted)' }}>+</span>
                            </>
                          )}
                          {shortcut.shift && (
                            <>
                              <KeyBadge>Shift</KeyBadge>
                              <span style={{ color: 'var(--color-text-muted)' }}>+</span>
                            </>
                          )}
                          {shortcut.alt && (
                            <>
                              <KeyBadge>Alt</KeyBadge>
                              <span style={{ color: 'var(--color-text-muted)' }}>+</span>
                            </>
                          )}
                          <KeyBadge>
                            {shortcut.key === ' '
                              ? 'Space'
                              : shortcut.key === 'Escape'
                                ? 'Esc'
                                : shortcut.key.toUpperCase()}
                          </KeyBadge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="px-6 py-4"
              style={{
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                按 <KeyBadge>Esc</KeyBadge> 或 <KeyBadge>?</KeyBadge> 关闭此面板
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
