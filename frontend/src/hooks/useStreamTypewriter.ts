import { useState, useCallback, useRef, useEffect } from 'react';

interface StreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  speed?: number;
  enabled?: boolean;
}

interface StreamState {
  text: string;
  isStreaming: boolean;
  isTyping: boolean;
  error: Error | null;
}

export function useStreamTypewriter(options: StreamOptions = {}) {
  const { onChunk, onComplete, onError, speed = 25, enabled = true } = options;

  const [state, setState] = useState<StreamState>({
    text: '',
    isStreaming: false,
    isTyping: false,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<string[]>([]);
  const fullTextRef = useRef('');
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (!enabled || isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setState((prev) => ({ ...prev, isTyping: true }));

    const processNext = () => {
      if (queueRef.current.length === 0) {
        isProcessingRef.current = false;
        setState((prev) => ({ ...prev, isTyping: false }));
        if (fullTextRef.current) {
          onComplete?.(fullTextRef.current);
        }
        return;
      }

      const chunk = queueRef.current.shift()!;

      setState((prev) => {
        const newText = prev.text + chunk;
        fullTextRef.current = newText;
        return { ...prev, text: newText };
      });

      const lastChar = chunk[chunk.length - 1];
      let delay = speed;

      if (lastChar === '。' || lastChar === '！' || lastChar === '？') {
        delay = speed * 4;
      } else if (lastChar === '，' || lastChar === '；' || lastChar === '：') {
        delay = speed * 2;
      } else if (lastChar === '\n') {
        delay = speed * 3;
      } else if (lastChar === ' ' || lastChar === '  ') {
        delay = speed * 0.5;
      }

      timeoutRef.current = setTimeout(processNext, delay);
    };

    processNext();
  }, [enabled, speed, onComplete]);

  const appendChunk = useCallback(
    (chunk: string) => {
      if (!enabled) return;

      queueRef.current.push(chunk);
      onChunk?.(chunk);

      if (!isProcessingRef.current) {
        processQueue();
      }
    },
    [enabled, onChunk, processQueue]
  );

  const startStream = useCallback(() => {
    queueRef.current = [];
    fullTextRef.current = '';
    isProcessingRef.current = false;
    setState({
      text: '',
      isStreaming: true,
      isTyping: false,
      error: null,
    });
  }, []);

  const endStream = useCallback(() => {
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const setError = useCallback((error: Error) => {
    setState((prev) => ({ ...prev, error, isStreaming: false, isTyping: false }));
    onError?.(error);
  }, [onError]);

  const skip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const remainingText = queueRef.current.join('');
    queueRef.current = [];

    setState((prev) => {
      const newText = prev.text + remainingText;
      fullTextRef.current = newText;
      return {
        ...prev,
        text: newText,
        isTyping: false,
        isStreaming: false,
      };
    });

    isProcessingRef.current = false;
    onComplete?.(fullTextRef.current);
  }, [onComplete]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    queueRef.current = [];
    fullTextRef.current = '';
    isProcessingRef.current = false;
    setState({
      text: '',
      isStreaming: false,
      isTyping: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    appendChunk,
    startStream,
    endStream,
    setError,
    skip,
    reset,
  };
}

export function useTypewriterCursor(isTyping: boolean, isStreaming: boolean) {
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (isTyping || isStreaming) {
      setShowCursor(true);
      const interval = setInterval(() => {
        setShowCursor((prev) => !prev);
      }, 530);
      return () => clearInterval(interval);
    } else {
      setShowCursor(false);
    }
  }, [isTyping, isStreaming]);

  return showCursor;
}

export function useMessageAnimation() {
  const [animationState, setAnimationState] = useState<'idle' | 'appearing' | 'typing' | 'complete'>(
    'idle'
  );

  const startAppearing = useCallback(() => {
    setAnimationState('appearing');
  }, []);

  const startTyping = useCallback(() => {
    setAnimationState('typing');
  }, []);

  const complete = useCallback(() => {
    setAnimationState('complete');
  }, []);

  const reset = useCallback(() => {
    setAnimationState('idle');
  }, []);

  return {
    animationState,
    isIdle: animationState === 'idle',
    isAppearing: animationState === 'appearing',
    isTyping: animationState === 'typing',
    isComplete: animationState === 'complete',
    startAppearing,
    startTyping,
    complete,
    reset,
  };
}
