import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Moon,
  Download,
  Trash2,
  Pin,
  Star,
  Keyboard,
  FileText,
  Code,
  Lightbulb,
  Globe,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  category: 'navigation' | 'action' | 'input' | 'settings';
  action?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat?: () => void;
  onToggleTheme?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onInsertTemplate?: (template: string) => void;
}

const defaultCommands: CommandItem[] = [
  {
    id: 'new-chat',
    label: '新建对话',
    icon: MessageSquare,
    shortcut: '⌘N',
    category: 'navigation',
  },
  { id: 'search-history', label: '搜索历史', icon: Search, shortcut: '⌘K', category: 'navigation' },
  { id: 'toggle-theme', label: '切换主题', icon: Moon, shortcut: '⌘D', category: 'settings' },
  { id: 'export-chat', label: '导出对话', icon: Download, shortcut: '⌘E', category: 'action' },
  { id: 'clear-chat', label: '清空对话', icon: Trash2, shortcut: '⌘⇧D', category: 'action' },
  { id: 'pin-chat', label: '置顶对话', icon: Pin, category: 'action' },
  { id: 'star-message', label: '收藏消息', icon: Star, category: 'action' },
  {
    id: 'keyboard-shortcuts',
    label: '快捷键',
    icon: Keyboard,
    shortcut: '⌘/',
    category: 'settings',
  },
];

const inputTemplates = [
  { id: 'explain', label: '解释概念', icon: Lightbulb, template: '请详细解释以下概念：' },
  { id: 'translate', label: '翻译内容', icon: Globe, template: '请翻译以下内容：' },
  { id: 'code', label: '代码解释', icon: Code, template: '请解释以下代码：' },
  { id: 'summarize', label: '总结要点', icon: BookOpen, template: '请总结以下内容的要点：' },
  { id: 'expand', label: '展开论述', icon: FileText, template: '请展开论述以下内容：' },
];

export default function CommandPalette({
  isOpen,
  onClose,
  onNewChat,
  onToggleTheme,
  onExport,
  onSettings,
  onHelp,
  onInsertTemplate,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'commands' | 'templates'>('commands');
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = defaultCommands.map((cmd) => ({
    ...cmd,
    action: () => {
      switch (cmd.id) {
        case 'new-chat':
          onNewChat?.();
          break;
        case 'toggle-theme':
          onToggleTheme?.();
          break;
        case 'export-chat':
          onExport?.();
          break;
        case 'settings':
          onSettings?.();
          break;
        case 'help':
          onHelp?.();
          break;
      }
      onClose();
    },
  }));

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = inputTemplates.filter((t) =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allItems = activeTab === 'commands' ? filteredCommands : filteredTemplates;
  const categories = ['navigation', 'action', 'settings'] as const;

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeTab]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (allItems[selectedIndex]) {
            if (activeTab === 'commands') {
              (allItems[selectedIndex] as CommandItem).action?.();
            } else {
              onInsertTemplate?.((allItems[selectedIndex] as (typeof inputTemplates)[0]).template);
              onClose();
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          setActiveTab((prev) => (prev === 'commands' ? 'templates' : 'commands'));
          break;
      }
    },
    [allItems, selectedIndex, activeTab, onClose, onInsertTemplate]
  );

  const handleCommandClick = (item: CommandItem | (typeof inputTemplates)[0]) => {
    if (activeTab === 'commands') {
      (item as CommandItem).action?.();
    } else {
      onInsertTemplate?.((item as (typeof inputTemplates)[0]).template);
      onClose();
    }
  };

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
            className="fixed left-1/2 top-[20%] -translate-x-1/2 z-[201] w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Search size={18} style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索命令或输入模板..."
                className="flex-1 bg-transparent outline-none text-base"
                style={{ color: 'var(--color-text-primary)' }}
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('commands')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'commands' ? 'bg-amber-100 text-amber-700' : ''
                  }`}
                  style={activeTab !== 'commands' ? { color: 'var(--color-text-muted)' } : {}}
                >
                  命令
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'templates' ? 'bg-amber-100 text-amber-700' : ''
                  }`}
                  style={activeTab !== 'templates' ? { color: 'var(--color-text-muted)' } : {}}
                >
                  模板
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {activeTab === 'commands' ? (
                <div className="py-2">
                  {categories.map((category) => {
                    const categoryItems = filteredCommands.filter(
                      (cmd) => cmd.category === category
                    );
                    if (categoryItems.length === 0) return null;

                    const categoryLabels = {
                      navigation: '导航',
                      action: '操作',
                      settings: '设置',
                    };

                    return (
                      <div key={category}>
                        <div
                          className="px-4 py-1.5 text-xs font-medium"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {categoryLabels[category]}
                        </div>
                        {categoryItems.map((cmd) => {
                          const globalIndex = filteredCommands.indexOf(cmd);
                          const Icon = cmd.icon;
                          return (
                            <motion.button
                              key={cmd.id}
                              whileHover={{ backgroundColor: 'var(--color-background-secondary)' }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${
                                globalIndex === selectedIndex
                                  ? 'bg-amber-50 dark:bg-amber-900/20'
                                  : ''
                              }`}
                              onClick={() => handleCommandClick(cmd)}
                            >
                              <div className="flex items-center gap-3">
                                <Icon size={18} style={{ color: 'var(--color-text-muted)' }} />
                                <div className="text-left">
                                  <div
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--color-text-primary)' }}
                                  >
                                    {cmd.label}
                                  </div>
                                  {cmd.description && (
                                    <div
                                      className="text-xs"
                                      style={{ color: 'var(--color-text-muted)' }}
                                    >
                                      {cmd.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {cmd.shortcut && (
                                <kbd
                                  className="px-2 py-0.5 rounded text-xs font-mono"
                                  style={{
                                    background: 'var(--color-background-secondary)',
                                    color: 'var(--color-text-muted)',
                                  }}
                                >
                                  {cmd.shortcut}
                                </kbd>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2">
                  {filteredTemplates.map((template, index) => {
                    const Icon = template.icon;
                    return (
                      <motion.button
                        key={template.id}
                        whileHover={{ backgroundColor: 'var(--color-background-secondary)' }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          index === selectedIndex ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                        }`}
                        onClick={() => handleCommandClick(template)}
                      >
                        <Icon size={18} style={{ color: 'var(--color-accent)' }} />
                        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {template.label}
                        </span>
                        <ArrowRight
                          size={14}
                          className="ml-auto"
                          style={{ color: 'var(--color-text-muted)' }}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {allItems.length === 0 && (
                <div className="py-8 text-center">
                  <Search
                    size={40}
                    className="mx-auto mb-2"
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    未找到匹配的{activeTab === 'commands' ? '命令' : '模板'}
                  </p>
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-between px-4 py-2 border-t text-xs"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">↑↓</kbd>
                  选择
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Enter</kbd>
                  确认
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Tab</kbd>
                  切换
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Esc</kbd>
                关闭
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
