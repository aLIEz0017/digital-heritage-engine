import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Loader2, 
  Sparkles, 
  Mic, 
  Image, 
  FileText,
  X
} from 'lucide-react';
import llmApi from '../../api/llm';

interface SmartInputProps {
  onSend: (message: string, metadata?: {
    intent?: string;
    entities?: string[];
    keywords?: string[];
  }) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const SmartInput: React.FC<SmartInputProps> = ({
  onSend,
  disabled = false,
  placeholder = '输入您的问题...',
  className = '',
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [intentHint, setIntentHint] = useState<string>('');
  const [detectedEntities, setDetectedEntities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (input.length > 5) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        analyzeInput(input);
      }, 500);
    } else {
      setIntentHint('');
      setDetectedEntities([]);
    }
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input]);

  const analyzeInput = async (text: string) => {
    try {
      const result = await llmApi.recognizeIntent({ query: text });
      
      setIntentHint(result.primary_intent);
      setDetectedEntities(result.entities);
      
      if (result.clarification_needed && result.clarification_question) {
        setIntentHint(`${result.primary_intent} - ${result.clarification_question}`);
      }
    } catch (error) {
      console.error('Intent analysis failed:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || disabled || loading) return;
    
    setLoading(true);
    
    try {
      const intentResult = await llmApi.recognizeIntent({ query: input });
      
      onSend(input, {
        intent: intentResult.primary_intent,
        entities: intentResult.entities,
        keywords: intentResult.keywords,
      });
      
      setInput('');
      setIntentHint('');
      setDetectedEntities([]);
    } catch (error) {
      console.error('Failed to analyze input:', error);
      onSend(input);
      setInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    '什么是苏绣？',
    '如何学习刺绣？',
    '推荐一些非遗技艺',
    '非遗传承的现状如何？',
  ];

  return (
    <div className={`smart-input ${className}`}>
      <div className="relative">
        <div className="flex items-end gap-2 p-3 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <div className="flex gap-1">
            <button
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
              title="语音输入"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
              title="上传图片"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
              title="上传文档"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || loading}
              rows={1}
              className="w-full bg-transparent text-gray-200 placeholder-gray-500 resize-none outline-none text-sm leading-relaxed"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
            
            <AnimatePresence>
              {intentHint && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute -top-8 left-0 flex items-center gap-2"
                >
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    {intentHint}
                  </span>
                  
                  {detectedEntities.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {detectedEntities.slice(0, 2).join(', ')}
                      {detectedEntities.length > 2 && ` +${detectedEntities.length - 2}`}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled || loading}
            className={`
              p-2 rounded-lg transition-all duration-200
              ${input.trim() && !disabled && !loading
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <AnimatePresence>
          {showSuggestions && input.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 p-2 bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">快捷问题</span>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      setShowSuggestions(false);
                      inputRef.current?.focus();
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {input.length === 0 && !showSuggestions && (
        <button
          onClick={() => setShowSuggestions(true)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          不知道问什么？点击查看推荐问题
        </button>
      )}
    </div>
  );
};

export default SmartInput;
