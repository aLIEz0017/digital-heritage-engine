import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../../stores/themeStore';
import { getThemeVisual } from '../../../config/themes/heritageThemes';

interface ThemeBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showParticles?: boolean;
  showGlow?: boolean;
  showPattern?: boolean;
  variant?: 'full' | 'section' | 'card';
}

interface ParticleConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export default function ThemeBackground({
  children,
  className = '',
  showParticles = true,
  showGlow = true,
  showPattern = true,
  variant = 'full',
}: ThemeBackgroundProps) {
  const { currentTheme } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const visual = useMemo(() => {
    const themeId = currentTheme?.id || 'ink-wash';
    return getThemeVisual(themeId);
  }, [currentTheme]);

  const particles = useMemo<ParticleConfig[]>(() => {
    if (!visual.particles.enabled || !showParticles) return [];

    return Array.from({ length: visual.particles.count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: visual.particles.size + Math.random() * 2,
      delay: i * 0.5,
      duration: visual.particles.speed + Math.random() * 4,
    }));
  }, [visual, showParticles]);

  useEffect(() => {
    if (!containerRef.current) return;

    const root = document.documentElement;
    root.style.setProperty('--particle-color', visual.particles.color);
    root.style.setProperty('--particle-size', `${visual.particles.size}px`);
    root.style.setProperty('--particle-speed', `${visual.particles.speed}s`);
    root.style.setProperty('--glow-primary', visual.glow.primary);
    root.style.setProperty('--glow-secondary', visual.glow.secondary);
    root.style.setProperty('--glow-accent', visual.glow.accent);
    root.style.setProperty('--heritage-image-gradient', visual.heritageImage.gradient);

    if (showPattern) {
      root.style.setProperty('--pattern-bg', visual.patterns.background.svgPattern);
      root.style.setProperty('--pattern-border', visual.patterns.border.svgPattern);
      root.style.setProperty('--pattern-decoration', visual.patterns.decoration.svgPattern);
    }
  }, [visual, showPattern]);

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  };

  const particleVariants = {
    initial: { opacity: 0, scale: 0 },
    animate: {
      opacity: [0.6, 1, 0.8, 0.4, 0.6],
      scale: [1, 1.2, 0.8, 1.1, 1],
      y: [0, -50, -100, -50, 0],
      x: [0, 20, -10, -30, 0],
      transition: {
        duration: visual.particles.speed,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const glowVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
      opacity: [0.3, 0.5, 0.3],
      scale: [1, 1.2, 1],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'section':
        return 'theme-section-overlay';
      case 'card':
        return 'theme-card-with-pattern';
      default:
        return 'theme-visual-container';
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={containerRef}
        key={currentTheme?.id || 'default'}
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`relative ${getVariantClasses()} ${className}`}
        style={{
          background: variant === 'full' ? 'var(--gradient-background)' : undefined,
        }}
      >
        {showPattern && variant === 'full' && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: 'var(--pattern-bg)',
              backgroundSize: '60px 60px',
              opacity: 0.4,
            }}
          />
        )}

        {showGlow && variant === 'full' && (
          <div className="theme-glow-overlay">
            <motion.div
              variants={glowVariants}
              initial="initial"
              animate="animate"
              className="theme-glow-primary"
              style={{
                top: '20%',
                left: '20%',
              }}
            />
            <motion.div
              variants={glowVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: 2 }}
              className="theme-glow-secondary"
              style={{
                bottom: '25%',
                right: '25%',
              }}
            />
            <motion.div
              variants={glowVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: 4 }}
              className="theme-glow-accent"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        )}

        {showParticles && particles.length > 0 && variant === 'full' && (
          <div className="theme-particles-container">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                variants={particleVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: particle.delay }}
                className="absolute rounded-full"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                  background: `radial-gradient(circle, ${visual.particles.color} 0%, transparent 70%)`,
                  boxShadow: `0 0 8px ${visual.particles.color}`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10">{children}</div>
      </motion.div>
    </AnimatePresence>
  );
}
