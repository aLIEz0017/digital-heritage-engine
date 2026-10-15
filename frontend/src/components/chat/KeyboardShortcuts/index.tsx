import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    category: '对话操作',
    items: [
      { keys: ['Enter'], description: '发送消息' },
      { keys: ['Shift', 'Enter'], description: '换行' },
      { keys: ['⌘', 'N'], description: '新建对话' },
      { keys: ['⌘', 'E'], description: '导出对话' },
      { keys: ['⌘', 'Shift', 'D'], description: '清空对话' },
    ],
  },
  {
    category: '导航',
    items: [
      { keys: ['⌘', 'K'], description: '打开命令面板' },
      { keys: ['⌘', 'F'], description: '搜索消息' },
      { keys: ['↑'], description: '上一条历史输入' },
      { keys: ['↓'], description: '下一条历史输入' },
      { keys: ['Esc'], description: '关闭弹窗' },
    ],
  },
  {
    category: '消息操作',
    items: [
      { keys: ['⌘', 'C'], description: '复制消息' },
      { keys: ['⌘', 'S'], description: '收藏消息' },
      { keys: ['⌘', 'R'], description: '重新生成' },
    ],
  },
  {
    category: '界面',
    items: [
      { keys: ['⌘', 'D'], description: '切换主题' },
      { keys: ['⌘', '\\'], description: '切换侧边栏' },
      { keys: ['⌘', ','], description: '打开设置' },
      { keys: ['⌘', '/'], description: '显示快捷键' },
    ],
  },
];

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-[10%] -translate-x-1/2 z-[201] w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Keyboard size={20} style={{ color: 'var(--color-accent)' }} />
                <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  快捷键
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                {shortcuts.map((category) => (
                  <div key={category.category}>
                    <h3
                      className="text-xs font-medium mb-3 pb-2 border-b"
                      style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
                    >
                      {category.category}
                    </h3>
                    <div className="space-y-2">
                      {category.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {item.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.keys.map((key, keyIndex) => (
                              <span key={keyIndex}>
                                <kbd
                                  className="px-2 py-0.5 rounded text-xs font-mono"
                                  style={{
                                    background: 'var(--color-background-secondary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border)',
                                  }}
                                >
                                  {key}
                                </kbd>
                                {keyIndex < item.keys.length - 1 && (
                                  <span className="mx-0.5" style={{ color: 'var(--color-text-muted)' }}>+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t text-center text-xs" style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}>
              按 <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 mx-1">Esc</kbd> 关闭
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
