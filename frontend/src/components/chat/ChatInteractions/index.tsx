/* eslint-disable react-refresh/only-export-components */
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ChatInteractionConfig {
  messageAnimation: {
    initial: { opacity: number; y: number; scale: number };
    animate: { opacity: number; y: number; scale: number };
    exit: { opacity: number; y: number; scale: number };
    transition: { duration: number; ease: string | number[] };
  };
  typingAnimation: {
    duration: number;
    delay: number;
  };
  rippleEffect: {
    duration: number;
    scale: number;
  };
}

export const chatInteractionConfig: ChatInteractionConfig = {
  messageAnimation: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
  typingAnimation: {
    duration: 0.8,
    delay: 0.02,
  },
  rippleEffect: {
    duration: 0.6,
    scale: 2,
  },
};

export const messageVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.9,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    filter: 'blur(5px)',
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

export const userMessageVariants = {
  hidden: {
    opacity: 0,
    x: 50,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: 50,
    scale: 0.8,
    transition: {
      duration: 0.2,
    },
  },
};

export const aiMessageVariants = {
  hidden: {
    opacity: 0,
    x: -50,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    scale: 0.8,
    transition: {
      duration: 0.2,
    },
  },
};

export const buttonVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
};

export const iconVariants = {
  initial: { rotate: 0 },
  hover: {
    rotate: 15,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 10,
    },
  },
  tap: {
    rotate: -15,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 10,
    },
  },
};

export const pulseVariants = {
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.8, 0.4, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmerVariants = {
  initial: { backgroundPosition: '200% 0' },
  animate: {
    backgroundPosition: '-200% 0',
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [-5, 5, -5],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const glowVariants = {
  initial: {
    boxShadow: '0 0 0px rgba(59, 130, 246, 0)',
  },
  animate: {
    boxShadow: [
      '0 0 10px rgba(59, 130, 246, 0.3)',
      '0 0 20px rgba(59, 130, 246, 0.5)',
      '0 0 10px rgba(59, 130, 246, 0.3)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const typingIndicatorVariants = {
  container: {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  },
  dot: {
    initial: { y: 0 },
    animate: {
      y: [-8, 0, -8],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
};

export const sendButtonVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    background: 'var(--gradient-primary)',
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    background: 'var(--gradient-secondary)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
    },
  },
  tap: {
    scale: 0.9,
    rotate: -5,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
  sending: {
    scale: [1, 1.2, 1],
    rotate: [0, 360],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
    },
  },
};

export const inputAreaVariants = {
  idle: {
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    borderColor: 'var(--color-border)',
  },
  focus: {
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
    borderColor: 'var(--color-primary)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  error: {
    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
    borderColor: 'var(--color-error)',
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
};

export const successCheckVariants = {
  initial: {
    scale: 0,
    opacity: 0,
    pathLength: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    pathLength: 1,
    transition: {
      scale: { duration: 0.3, ease: 'easeOut' },
      opacity: { duration: 0.3 },
      pathLength: { duration: 0.5, ease: 'easeInOut' },
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export const rippleVariants = {
  initial: {
    scale: 0,
    opacity: 0.5,
  },
  animate: {
    scale: 4,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const slideInVariants = {
  fromLeft: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
  },
  fromRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
  },
  fromTop: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -100, opacity: 0 },
  },
  fromBottom: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
  },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

export const TypingIndicator = () => {
  return (
    <motion.div
      variants={typingIndicatorVariants.container}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center gap-1.5 px-4 py-2 rounded-2xl"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          variants={typingIndicatorVariants.dot}
          initial="initial"
          animate="animate"
          transition={{ delay: i * 0.15 }}
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--color-primary)' }}
        />
      ))}
    </motion.div>
  );
};

export const RippleEffect = ({
  x,
  y,
  color = 'var(--color-primary)',
}: {
  x: number;
  y: number;
  color?: string;
}) => {
  return (
    <motion.div
      variants={rippleVariants}
      initial="initial"
      animate="animate"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: color,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
};

export const GlowEffect = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      variants={glowVariants}
      initial="initial"
      animate="animate"
      style={{
        borderRadius: 'inherit',
      }}
    >
      {children}
    </motion.div>
  );
};

export const FloatingElement = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div variants={floatVariants} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
};

export const ShimmerText = ({ children }: { children: ReactNode }) => {
  return (
    <motion.span
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
      style={{
        background:
          'linear-gradient(90deg, var(--color-text-primary) 0%, var(--color-primary) 50%, var(--color-text-primary) 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </motion.span>
  );
};

export const AnimatedButton = ({
  children,
  onClick,
  disabled,
  className,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <motion.button
      variants={buttonVariants}
      initial="initial"
      whileHover={disabled ? undefined : 'hover'}
      whileTap={disabled ? undefined : 'tap'}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={style}
    >
      {children}
    </motion.button>
  );
};

export const AnimatedContainer = ({
  children,
  className,
  style,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) => {
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

export const StaggerContainer = ({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <motion.div variants={staggerItem} className={className} style={style}>
      {children}
    </motion.div>
  );
};
