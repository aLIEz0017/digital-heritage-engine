import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../../stores/themeStore';
import { getThemeVisual } from '../../../config/themes/heritageThemes';

interface ThemeDecorationProps {
  type: 'border' | 'corner' | 'divider' | 'badge' | 'ornament';
  className?: string;
  animated?: boolean;
  children?: React.ReactNode;
}

const decorationVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const shimmerVariants = {
  animate: {
    backgroundPosition: ['0% 0%', '100% 100%'],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export default function ThemeDecoration({
  type,
  className = '',
  animated = true,
  children,
}: ThemeDecorationProps) {
  const { currentTheme } = useThemeStore();
  const visual = useMemo(() => {
    const themeId = currentTheme?.id || 'ink-wash';
    return getThemeVisual(themeId);
  }, [currentTheme]);

  const renderBorder = () => (
    <motion.div
      variants={decorationVariants}
      initial="initial"
      animate="animate"
      className={`theme-border-pattern ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: visual.patterns.border.svgPattern,
          backgroundSize: '80px 80px',
          opacity: 0.3,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );

  const renderCorner = () => {
    const cornerPattern = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z" fill="${visual.patterns.border.patternColor}" fill-opacity="0.3"/>
        <circle cx="20" cy="20" r="3" fill="${visual.patterns.decoration.patternColor}" fill-opacity="0.5"/>
      </svg>
    `;

    return (
      <motion.div
        variants={decorationVariants}
        initial="initial"
        animate="animate"
        className={`absolute pointer-events-none ${className}`}
        style={{
          width: 40,
          height: 40,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(cornerPattern)}")`,
        }}
      />
    );
  };

  const renderDivider = () => (
    <motion.div
      variants={decorationVariants}
      initial="initial"
      animate="animate"
      className={`relative h-px ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, var(--color-primary), transparent)`,
        }}
      />
      {animated && (
        <motion.div
          variants={shimmerVariants}
          animate="animate"
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${visual.glow.primary}, transparent)`,
            backgroundSize: '200% 100%',
          }}
        />
      )}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
        style={{
          background: `radial-gradient(circle, ${visual.particles.color} 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );

  const renderBadge = () => (
    <motion.div
      variants={decorationVariants}
      initial="initial"
      animate="animate"
      className={`relative inline-flex items-center gap-2 px-3 py-1 rounded-full ${className}`}
      style={{
        background: 'var(--gradient-primary)',
        boxShadow: `0 0 12px ${visual.glow.primary}`,
      }}
    >
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          backgroundImage: visual.patterns.decoration.svgPattern,
          backgroundSize: '30px 30px',
          opacity: 0.3,
        }}
      />
      <span
        className="relative z-10 text-sm font-medium"
        style={{ color: 'var(--color-text-inverse)' }}
      >
        {children}
      </span>
    </motion.div>
  );

  const renderOrnament = () => {
    const ornamentSvg = `
      <svg width="60" height="20" viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 10 Q15 0 30 10 Q45 20 60 10" fill="none" stroke="${visual.patterns.decoration.patternColor}" stroke-opacity="0.5" stroke-width="1.5"/>
        <circle cx="30" cy="10" r="3" fill="${visual.particles.color}" fill-opacity="0.6"/>
      </svg>
    `;

    return (
      <motion.div
        variants={decorationVariants}
        initial="initial"
        animate="animate"
        className={`inline-block ${className}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(ornamentSvg)}")`,
          width: 60,
          height: 20,
        }}
      />
    );
  };

  switch (type) {
    case 'border':
      return renderBorder();
    case 'corner':
      return renderCorner();
    case 'divider':
      return renderDivider();
    case 'badge':
      return renderBadge();
    case 'ornament':
      return renderOrnament();
    default:
      return null;
  }
}

interface ThemeCardProps {
  children: React.ReactNode;
  className?: string;
  showPattern?: boolean;
  hoverable?: boolean;
}

export function ThemeCard({
  children,
  className = '',
  showPattern = true,
  hoverable = true,
}: ThemeCardProps) {
  const { currentTheme } = useThemeStore();
  const visual = useMemo(() => {
    const themeId = currentTheme?.id || 'ink-wash';
    return getThemeVisual(themeId);
  }, [currentTheme]);

  return (
    <motion.div
      variants={decorationVariants}
      initial="initial"
      animate="animate"
      whileHover={
        hoverable ? { y: -4, boxShadow: `0 12px 40px ${visual.glow.primary}` } : undefined
      }
      className={`theme-card-with-pattern ${className}`}
    >
      {showPattern && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: visual.patterns.background.svgPattern,
            backgroundSize: '50px 50px',
            opacity: 0.25,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

interface ThemeSectionProps {
  children: React.ReactNode;
  className?: string;
  showOverlay?: boolean;
}

export function ThemeSection({ children, className = '', showOverlay = true }: ThemeSectionProps) {
  const { currentTheme } = useThemeStore();
  const visual = useMemo(() => {
    const themeId = currentTheme?.id || 'ink-wash';
    return getThemeVisual(themeId);
  }, [currentTheme]);

  return (
    <motion.section
      variants={decorationVariants}
      initial="initial"
      animate="animate"
      className={`relative ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: visual.patterns.background.svgPattern,
          backgroundSize: '100px 100px',
          opacity: 0.15,
        }}
      />
      {showOverlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, var(--color-background) 0%, transparent 15%, transparent 85%, var(--color-background) 100%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}
