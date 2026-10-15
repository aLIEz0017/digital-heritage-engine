import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  MessageSquare,
  User,
  Bot,
  Clock,
  Filter,
  Star,
  ThumbsUp,
  Hash,
} from 'lucide-react';
import {
  CHAT_ASSISTANT_AVATAR_URL,
  CHAT_ASSISTANT_DISPLAY_NAME,
} from '../../../constants/chatAssistant';

interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  feedback?: 'helpful' | 'unclear' | null;
  is_favorite?: boolean;
}

interface MessageSearchProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onMessageClick: (message: Message) => void;
}

type FilterType = 'all' | 'user' | 'assistant' | 'favorite' | 'helpful';
type SortType = 'relevance' | 'newest' | 'oldest';

export default function MessageSearch({
  isOpen,
  onClose,
  messages,
  onMessageClick,
}: MessageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const filtered = messages.filter((msg) => {
      const matchesQuery = msg.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      switch (filter) {
        case 'user':
          return matchesQuery && msg.role === 'user';
        case 'assistant':
          return matchesQuery && msg.role === 'assistant';
        case 'favorite':
          return matchesQuery && msg.is_favorite;
        case 'helpful':
          return matchesQuery && msg.feedback === 'helpful';
        default:
          return matchesQuery;
      }
    });

    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      filtered.sort((a, b) => {
        const aIndex = a.content.toLowerCase().indexOf(searchQuery.toLowerCase());
        const bIndex = b.content.toLowerCase().indexOf(searchQuery.toLowerCase());
        return aIndex - bIndex;
      });
    }

    setResults(filtered);
  }, [searchQuery, messages, filter, sort]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-amber-200 dark:bg-amber-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: '全部', icon: Hash },
    { value: 'user', label: '我的消息', icon: User },
    { value: 'assistant', label: `${CHAT_ASSISTANT_DISPLAY_NAME}回复`, icon: Bot },
    { value: 'favorite', label: '已收藏', icon: Star },
    { value: 'helpful', label: '有帮助', icon: ThumbsUp },
  ];

  const sortOptions: { value: SortType; label: string }[] = [
    { value: 'relevance', label: '相关度' },
    { value: 'newest', label: '最新' },
    { value: 'oldest', label: '最早' },
  ];

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
            className="fixed left-1/2 top-[15%] -translate-x-1/2 z-[201] w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <Search size={18} style={{ color: 'var(--color-text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索对话内容..."
                className="flex-1 bg-transparent outline-none text-base"
                style={{ color: 'var(--color-text-primary)' }}
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-amber-100 text-amber-600' : ''}`}
                style={!showFilters ? { color: 'var(--color-text-muted)' } : {}}
              >
                <Filter size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>筛选:</span>
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFilter(option.value)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                            filter === option.value ? 'bg-amber-100 text-amber-700' : ''
                          }`}
                          style={filter !== option.value ? { background: 'var(--color-background-secondary)' } : {}}
                        >
                          <option.icon size={12} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>排序:</span>
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSort(option.value)}
                          className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                            sort === option.value ? 'bg-amber-100 text-amber-700' : ''
                          }`}
                          style={sort !== option.value ? { background: 'var(--color-background-secondary)' } : {}}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="max-h-96 overflow-y-auto">
              {searchQuery.trim() === '' ? (
                <div className="py-12 text-center">
                  <Search size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    输入关键词搜索对话内容
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    未找到匹配的消息
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    找到 {results.length} 条结果
                  </div>
                  {results.map((message, index) => (
                    <motion.button
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => {
                        onMessageClick(message);
                        onClose();
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                          message.role === 'user' ? 'bg-amber-100' : 'bg-blue-100'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User size={14} className="text-amber-600" />
                        ) : CHAT_ASSISTANT_AVATAR_URL ? (
                          <img
                            src={CHAT_ASSISTANT_AVATAR_URL}
                            alt=""
                            className="w-5 h-5 rounded object-cover"
                          />
                        ) : (
                          <Bot size={14} className="text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {message.role === 'user' ? '我' : CHAT_ASSISTANT_DISPLAY_NAME}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                            <Clock size={10} />
                            {formatDate(message.created_at)}
                          </span>
                          {message.is_favorite && (
                            <Star size={10} className="text-amber-500" fill="currentColor" />
                          )}
                          {message.feedback === 'helpful' && (
                            <ThumbsUp size={10} className="text-green-500" />
                          )}
                        </div>
                        <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                          {highlightText(message.content.slice(0, 200), searchQuery)}
                          {message.content.length > 200 && '...'}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t text-xs" style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}>
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
