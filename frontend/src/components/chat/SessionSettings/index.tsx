import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Pin, Archive, Info, ChevronRight, Edit3, Check } from 'lucide-react';

interface SessionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: string;
    title: string;
    created_at: string;
    message_count: number;
    is_pinned?: boolean;
    is_archived?: boolean;
    tags?: string[];
  } | null;
  onUpdateTitle: (title: string) => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

const presetTags = ['技艺', '历史', '传承人', '地域', '材料', '重要', '待整理'];

export default function SessionSettings({
  isOpen,
  onClose,
  session,
  onUpdateTitle,
  onPin,
  onArchive,
  onDelete,
  onAddTag,
  onRemoveTag,
}: SessionSettingsProps) {
  const [activeSection, setActiveSection] = useState<'general' | 'tags' | 'advanced'>('general');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(session?.title || '');
  const [tags, setTags] = useState<string[]>(session?.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== session?.title) {
      onUpdateTitle(editTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
      onAddTag(tag);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    onRemoveTag(tag);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 z-[201] shadow-xl overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              borderLeft: '1px solid var(--color-border)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                对话设置
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
              {[
                { id: 'general', label: '基本' },
                // { id: 'tags', label: '标签' }, // 暂时隐藏标签功能，作为后续扩展
                { id: 'advanced', label: '高级' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as typeof activeSection)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                    activeSection === tab.id ? 'text-amber-600' : ''
                  }`}
                  style={activeSection !== tab.id ? { color: 'var(--color-text-muted)' } : {}}
                >
                  {tab.label}
                  {activeSection === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto" style={{ height: 'calc(100% - 120px)' }}>
              {activeSection === 'general' && (
                <div className="p-4 space-y-4">
                  <div>
                    <label
                      className="text-xs font-medium mb-2 block"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      对话标题
                    </label>
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: 'var(--color-background-secondary)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveTitle}
                          className="p-2 rounded-lg bg-amber-500 text-white"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer"
                        style={{ background: 'var(--color-background-secondary)' }}
                        onClick={() => {
                          setEditTitle(session?.title || '');
                          setIsEditingTitle(true);
                        }}
                      >
                        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {session?.title || '未命名对话'}
                        </span>
                        <Edit3 size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      className="text-xs font-medium mb-2 block"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      对话信息
                    </label>
                    <div className="space-y-2">
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: 'var(--color-background-secondary)' }}
                      >
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          创建时间
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                          {session?.created_at ? formatDate(session.created_at) : '-'}
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: 'var(--color-background-secondary)' }}
                      >
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          消息数量
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
                          {session?.message_count || 0} 条
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      className="text-xs font-medium mb-2 block"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      快捷操作
                    </label>
                    <div className="space-y-1">
                      <button
                        onClick={onPin}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <Pin size={16} style={{ color: 'var(--color-text-muted)' }} />
                          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {session?.is_pinned ? '取消置顶' : '置顶对话'}
                          </span>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                      <button
                        onClick={onArchive}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <Archive size={16} style={{ color: 'var(--color-text-muted)' }} />
                          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            归档对话
                          </span>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'tags' && (
                <div className="p-4 space-y-4">
                  <div>
                    <label
                      className="text-xs font-medium mb-2 block"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      已添加标签
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.length === 0 ? (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          暂无标签
                        </span>
                      ) : (
                        tags.map((tag) => (
                          <motion.span
                            key={tag}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                            style={{
                              background: 'var(--color-background-secondary)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </motion.span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      className="text-xs font-medium mb-2 block"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      添加标签
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="输入新标签..."
                        className="flex-1 px-3 py-2 rounded-lg text-sm"
                        style={{
                          background: 'var(--color-background-secondary)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTag.trim()) {
                            handleAddTag(newTag.trim());
                            setNewTag('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newTag.trim()) {
                            handleAddTag(newTag.trim());
                            setNewTag('');
                          }
                        }}
                        className="px-3 py-2 rounded-lg text-sm text-white bg-amber-500"
                      >
                        添加
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {presetTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleAddTag(tag)}
                          disabled={tags.includes(tag)}
                          className={`px-2 py-1 rounded-full text-xs transition-colors ${
                            tags.includes(tag)
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-amber-100 hover:text-amber-700'
                          }`}
                          style={{
                            background: tags.includes(tag)
                              ? 'var(--color-background-secondary)'
                              : 'transparent',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'advanced' && (
                <div className="p-4 space-y-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ background: 'var(--color-background-secondary)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        危险操作
                      </span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                      删除对话后将无法恢复，所有消息将被永久删除。
                    </p>
                    <button
                      onClick={onDelete}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                      删除对话
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
