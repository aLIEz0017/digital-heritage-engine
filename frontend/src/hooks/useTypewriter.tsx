import { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
  enabled?: boolean;
  onComplete?: () => void;
}

export function useTypewriter({
  text,
  speed = 25,
  delay = 0,
  enabled = true,
  onComplete,
}: TypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const previousTextRef = useRef('');
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    if (!hasStarted) {
      setDisplayedText('');
      indexRef.current = 0;
    }

    const isNewText = text !== previousTextRef.current;
    const isAppend = text.startsWith(previousTextRef.current) && previousTextRef.current.length > 0;

    if (isNewText) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (isAppend) {
        const startIndex = previousTextRef.current.length;
        indexRef.current = startIndex;
        setDisplayedText(previousTextRef.current);
      } else {
        indexRef.current = 0;
        setDisplayedText('');
      }
    }

    previousTextRef.current = text;

    const startTyping = () => {
      if (delay > 0 && !hasStarted) {
        timeoutRef.current = setTimeout(() => {
          setHasStarted(true);
          setIsTyping(true);
          typeNextChar();
        }, delay);
      } else {
        setIsTyping(true);
        typeNextChar();
      }
    };

    const typeNextChar = () => {
      if (indexRef.current < text.length) {
        const nextIndex = indexRef.current + 1;
        const currentText = text.slice(0, nextIndex);
        setDisplayedText(currentText);
        indexRef.current = nextIndex;

        const currentChar = text[nextIndex - 1];
        let nextSpeed = speed;

        if (currentChar === '。' || currentChar === '！' || currentChar === '？') {
          nextSpeed = speed * 4;
        } else if (currentChar === '，' || currentChar === '；' || currentChar === '：') {
          nextSpeed = speed * 2;
        } else if (currentChar === '\n') {
          nextSpeed = speed * 3;
        }

        timeoutRef.current = setTimeout(typeNextChar, nextSpeed);
      } else {
        setIsTyping(false);
        onCompleteRef.current?.();
      }
    };

    if (indexRef.current < text.length) {
      startTyping();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, delay, enabled, hasStarted]);

  const skip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText(text);
    setIsTyping(false);
    indexRef.current = text.length;
    onCompleteRef.current?.();
  }, [text]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText('');
    setIsTyping(false);
    setHasStarted(false);
    indexRef.current = 0;
    previousTextRef.current = '';
  }, []);

  return {
    displayedText,
    isTyping,
    hasStarted,
    skip,
    reset,
  };
}

export function useStreamingText() {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingRef = useRef(false);

  const startStreaming = useCallback(() => {
    setDisplayedText('');
    setIsStreaming(true);
    streamingRef.current = true;
  }, []);

  const appendText = useCallback((chunk: string) => {
    if (streamingRef.current) {
      setDisplayedText((prev) => prev + chunk);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    streamingRef.current = false;
  }, []);

  const reset = useCallback(() => {
    setDisplayedText('');
    setIsStreaming(false);
    streamingRef.current = false;
  }, []);

  return {
    displayedText,
    isStreaming,
    startStreaming,
    appendText,
    stopStreaming,
    reset,
  };
}
