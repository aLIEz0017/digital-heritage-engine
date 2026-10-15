import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Square, ChevronUp } from 'lucide-react';
import { inputHistoryService, type HistoryItem } from '../../../services/inputHistoryService';

const MAX_CHARS = 4000;

interface UnifiedInputAreaProps {
  onSend: (content: string, options?: { command?: string }) => void | Promise<void>;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
  sessionId?: string;
}

export default function UnifiedInputArea({
  onSend,
  isLoading = false,
  isStreaming = false,
  placeholder = '输入您的问题，探索非遗文化...',
  disabled = false,
  onStop,
  autoFocus = false,
  sessionId,
}: UnifiedInputAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // 输入历史功能
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showHistoryHint, setShowHistoryHint] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const sessionIdRef = useRef<string | undefined>(sessionId);

  // 更新 sessionIdRef 并在切换会话时重置历史索引
  useEffect(() => {
    sessionIdRef.current = sessionId;
    // 切换会话时重置历史索引，防止访问错误的历史记录
    setHistoryIndex(-1);
    setShowHistoryHint(false);
  }, [sessionId]);

  // 加载输入历史
  useEffect(() => {
    const loadHistory = () => {
      const items = inputHistoryService.getRecentHistory(50);
      setHistoryItems(items);
    };
    loadHistory();

    const unsubscribe = inputHistoryService.subscribe(loadHistory);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSend = useCallback(() => {
    const finalContent = inputValue.trim();
    if (!finalContent || disabled || isLoading || isSendingRef.current) return;

    isSendingRef.current = true;

    // 保存到输入历史
    inputHistoryService.addInput(finalContent, sessionIdRef.current);

    const result = onSend(finalContent);

    if (result instanceof Promise) {
      result.finally(() => {
        isSendingRef.current = false;
      });
    } else {
      setTimeout(() => {
        isSendingRef.current = false;
      }, 100);
    }

    setInputValue('');
    setCharCount(0);
    setHistoryIndex(-1); // 重置历史索引
  }, [inputValue, disabled, isLoading, onSend]);

  // 处理键盘导航（输入历史）- 简化的导航逻辑
  const handleNavigateHistory = useCallback(
    (direction: 'up' | 'down') => {
      if (historyItems.length === 0) return;

      setHistoryIndex((prevIndex) => {
        let newIndex = prevIndex;

        if (direction === 'up') {
          // 向上导航：显示更早的历史记录
          newIndex = prevIndex < historyItems.length - 1 ? prevIndex + 1 : prevIndex;
        } else {
          // 向下导航：显示更新的历史记录
          if (prevIndex > 0) {
            newIndex = prevIndex - 1;
          } else if (prevIndex === 0) {
            // 回到当前输入（清空）
            setInputValue('');
            setShowHistoryHint(false);
            return -1;
          }
        }

        if (newIndex >= 0 && newIndex < historyItems.length) {
          const item = historyItems[newIndex];
          setInputValue(item.text);
          setShowHistoryHint(true);
          // 延长提示显示时间
          setTimeout(() => setShowHistoryHint(false), 3000);
        }

        return newIndex;
      });
    },
    [historyItems]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 🌟 拦截中文输入法回车误触
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }

    // 输入历史导航 - 简化的触发条件
    if (e.key === 'ArrowUp' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      // 当输入框为空或光标在开头时，向上导航历史
      if (!inputValue.trim() || (textareaRef.current && textareaRef.current.selectionStart === 0)) {
        e.preventDefault();
        handleNavigateHistory('up');
      }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      // 当正在浏览历史时，向下导航
      if (historyIndex >= 0) {
        e.preventDefault();
        handleNavigateHistory('down');
      }
    }

    // ESC 清除历史导航
    if (e.key === 'Escape') {
      setHistoryIndex(-1);
      setInputValue('');
      textareaRef.current?.blur();
    }
  };

  const charCountColor = useMemo(() => {
    if (charCount > MAX_CHARS * 0.9) return 'var(--color-error)';
    if (charCount > MAX_CHARS * 0.7) return 'var(--color-warning)';
    return 'var(--color-text-muted)';
  }, [charCount]);

  return (
    <div className="relative w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        ref={inputRef}
        className="relative rounded-2xl overflow-hidden transition-shadow duration-300"
        style={{
          boxShadow: isFocused
            ? '0 8px 32px rgba(59, 130, 246, 0.2), 0 0 0 2px var(--color-primary)'
            : '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          className={`relative p-3 transition-all duration-300 ${isFocused ? 'ring-2 ring-blue-500/20' : ''}`}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              {showHistoryHint && historyIndex >= 0 && (
                <div className="absolute -top-8 left-0 flex items-center gap-2 px-2 py-1 rounded bg-blue-500 text-white text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <ChevronUp size={12} />
                  <span>
                    历史记录 {historyIndex + 1}/{historyItems.length}
                  </span>
                  <ChevronUp size={12} />
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setCharCount(e.target.value.length);
                  // 用户手动编辑时清除历史导航
                  if (historyIndex !== -1) {
                    setHistoryIndex(-1);
                  }
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled || isLoading || isStreaming}
                rows={1}
                className="w-full px-3 py-2 bg-transparent outline-none resize-none disabled:opacity-50"
                style={{
                  color: 'var(--color-text-primary)',
                  minHeight: '44px',
                  maxHeight: '200px',
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              {charCount > 0 && (
                <span
                  className="text-xs animate-in fade-in duration-200"
                  style={{ color: charCountColor }}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              )}

              {isLoading || isStreaming ? (
                <button
                  onClick={onStop}
                  className="p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: 'var(--color-error)', color: 'white' }}
                  title="停止生成"
                >
                  <Square size={18} fill="white" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={disabled || !inputValue.trim() || charCount > MAX_CHARS}
                  className="p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background:
                      disabled || !inputValue.trim() || charCount > MAX_CHARS
                        ? 'var(--color-background-secondary)'
                        : 'var(--color-primary)',
                    color:
                      disabled || !inputValue.trim() || charCount > MAX_CHARS
                        ? 'var(--color-text-muted)'
                        : 'white',
                  }}
                  title="发送"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-4 mt-3 text-xs animate-in fade-in duration-500 delay-300"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>Enter 发送</span>
        <span>Shift + Enter 换行</span>
        <span>↑↓ 浏览历史</span>
        <span>ESC 清除</span>
      </div>
    </div>
  );
}
