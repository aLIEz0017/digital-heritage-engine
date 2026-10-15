import { motion } from 'framer-motion';
import { X, Quote, User, Bot } from 'lucide-react';
import {
  CHAT_ASSISTANT_AVATAR_URL,
  CHAT_ASSISTANT_DISPLAY_NAME,
} from '../../../constants/chatAssistant';

interface QuotedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface MessageQuoteProps {
  message: QuotedMessage;
  onRemove: () => void;
}

export function MessageQuote({ message, onRemove }: MessageQuoteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-2 p-3 rounded-xl mb-2"
      style={{
        background: 'var(--color-background-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Quote size={14} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`w-5 h-5 rounded flex items-center justify-center ${
              message.role === 'user' ? 'bg-amber-100' : 'bg-blue-100'
            }`}
          >
            {message.role === 'user' ? (
              <User size={10} className="text-amber-600" />
            ) : CHAT_ASSISTANT_AVATAR_URL ? (
              <img src={CHAT_ASSISTANT_AVATAR_URL} alt="" className="w-3.5 h-3.5 rounded object-cover" />
            ) : (
              <Bot size={10} className="text-blue-600" />
            )}
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {message.role === 'user' ? '我' : CHAT_ASSISTANT_DISPLAY_NAME}
          </span>
        </div>
        <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
          {message.content}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function InlineQuote({ message }: { message: QuotedMessage }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        background: 'var(--color-background-secondary)',
        color: 'var(--color-text-muted)',
      }}
    >
      <Quote size={10} />
      <span className="line-clamp-1 max-w-[150px]">{message.content}</span>
    </div>
  );
}

export function QuotedMessageDisplay({ message }: { message: QuotedMessage }) {
  return (
    <div
      className="relative pl-3 mb-2 py-1"
      style={{
        borderLeft: '3px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {message.role === 'user' ? '引用我的消息' : '引用AI回复'}
        </span>
      </div>
      <p className="text-sm line-clamp-3" style={{ color: 'var(--color-text-secondary)' }}>
        {message.content}
      </p>
    </div>
  );
}
