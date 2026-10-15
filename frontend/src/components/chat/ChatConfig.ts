export const animationConfig = {
  timing: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
    verySlow: 0.8,
  },
  easing: {
    easeInOut: [0.4, 0, 0.2, 1],
    easeOut: [0, 0, 0.2, 1],
    easeIn: [0.4, 0, 1, 1],
    spring: { type: 'spring', stiffness: 300, damping: 30 },
    springStiff: { type: 'spring', stiffness: 400, damping: 25 },
    springSoft: { type: 'spring', stiffness: 150, damping: 20 },
  },
  scale: {
    hover: 1.05,
    tap: 0.95,
    bounce: 1.1,
  },
  distance: {
    slide: 100,
    lift: 10,
    shake: 10,
  },
  rotation: {
    tilt: 10,
    spin: 360,
    wobble: 15,
  },
  opacity: {
    fadeIn: 1,
    fadeOut: 0,
    semiTransparent: 0.5,
  },
};

export const chatTheme = {
  colors: {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
  },
  gradients: {
    primary: 'var(--gradient-primary)',
    secondary: 'var(--gradient-secondary)',
    accent: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(59, 130, 246, 0.5)',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
};

export const messageConfig = {
  user: {
    alignment: 'right',
    background: chatTheme.gradients.primary,
    color: 'white',
    borderRadius: '1.5rem 1.5rem 0.5rem 1.5rem',
    shadow: '0 4px 16px -4px var(--color-primary)',
  },
  assistant: {
    alignment: 'left',
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    borderRadius: '1.5rem 1.5rem 1.5rem 0.5rem',
    shadow: '0 2px 8px -4px rgba(0, 0, 0, 0.05)',
    border: '1px solid var(--color-border)',
  },
};

export const inputConfig = {
  maxHeight: 200,
  minHeight: 24,
  maxChars: 4000,
  placeholder: '输入您的问题，探索非遗文化...',
  focusShadow: '0 8px 32px rgba(59, 130, 246, 0.2), 0 0 0 2px var(--color-primary)',
  idleShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
};

export const quickCommands = [
  {
    id: 'explain',
    label: '解释概念',
    icon: 'Lightbulb',
    prompt: '请详细解释以下概念：',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
    color: '#f97316',
  },
  {
    id: 'translate',
    label: '翻译内容',
    icon: 'Globe',
    prompt: '请翻译以下内容：',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%)',
    color: '#06b6d4',
  },
  {
    id: 'code',
    label: '代码解释',
    icon: 'Code',
    prompt: '请解释以下代码：',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
    color: '#ec4899',
  },
  {
    id: 'summarize',
    label: '总结要点',
    icon: 'BookOpen',
    prompt: '请总结以下内容的要点：',
    gradient: 'linear-gradient(135deg, #4ade80 0%, #10b981 100%)',
    color: '#10b981',
  },
];

export const loadingMessages = [
  'AI正在思考...',
  '正在生成回复...',
  '正在分析问题...',
  '正在搜索相关信息...',
  '正在整理答案...',
];

export const errorMessages = {
  network: {
    title: '网络连接失败',
    message: '请检查您的网络连接后重试',
    icon: 'WifiOff',
  },
  server: {
    title: '服务器错误',
    message: '服务器暂时无法响应，请稍后再试',
    icon: 'ServerOff',
  },
  timeout: {
    title: '请求超时',
    message: '请求处理时间过长，请重试',
    icon: 'Clock',
  },
  generic: {
    title: '发生错误',
    message: '操作失败，请重试',
    icon: 'AlertCircle',
  },
};

export const successMessages = {
  send: '消息发送成功',
  copy: '已复制到剪贴板',
  favorite: '已添加到收藏',
  delete: '消息已删除',
  edit: '消息已编辑',
};

export const keyboardShortcuts = {
  send: 'Enter',
  newLine: 'Shift + Enter',
  clear: 'Esc',
  search: 'Ctrl + K',
  settings: 'Ctrl + ,',
};

export const animationPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
  rotateIn: {
    initial: { opacity: 0, rotate: -180 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 180 },
  },
  bounceIn: {
    initial: { opacity: 0, scale: 0, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0, y: 50 },
  },
};

export const getAnimationDelay = (index: number, baseDelay: number = 0.05): number => {
  return index * baseDelay;
};

export const getStaggerAnimation = (_itemCount: number, baseDelay: number = 0.05) => {
  return {
    animate: {
      transition: {
        staggerChildren: baseDelay,
        delayChildren: 0.1,
      },
    },
  };
};

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getAnimationDuration = (duration: number): number => {
  return prefersReducedMotion() ? 0 : duration;
};

export const getTransition = (
  type: keyof typeof animationConfig.easing = 'spring',
  duration: number = animationConfig.timing.normal
) => {
  const easing = animationConfig.easing[type];
  
  if (typeof easing === 'object' && 'type' in easing) {
    return easing;
  }
  
  return {
    duration: getAnimationDuration(duration),
    ease: easing,
  };
};
