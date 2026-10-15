import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Palette, Check, ChevronDown, Sparkles } from 'lucide-react';
import {
  useThemeStore,
  HeritageThemeId,
  ThemeMode,
  heritageThemes,
} from '../../../stores/themeStore';
import { heritageThemeGradients } from '../../../config/themes/heritageThemes';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'panel';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { icon: 16, padding: 'p-2', gap: 'gap-1.5', text: 'text-xs' },
  md: { icon: 18, padding: 'p-2.5', gap: 'gap-2', text: 'text-sm' },
  lg: { icon: 20, padding: 'p-3', gap: 'gap-3', text: 'text-base' },
};

const modeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const modeLabels = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

function IconToggle({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
  const { resolvedMode, toggleMode, currentTheme } = useThemeStore();
  const config = sizeMap[size];
  const isDark = resolvedMode === 'dark';

  return (
    <motion.button
      onClick={toggleMode}
      whileHover={{ scale: 1.1, rotate: 15 }}
      whileTap={{ scale: 0.9 }}
      className={`relative flex items-center justify-center rounded-xl transition-all duration-500 overflow-hidden ${config.padding} ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
          : 'var(--color-surface)',
        border: isDark ? 'none' : '1px solid var(--color-border)',
        boxShadow: isDark
          ? '0 8px 24px -4px var(--color-primary)'
          : '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
      }}
      title={`当前主题: ${currentTheme?.name || '墨韵丹青'} | ${isDark ? '深色' : '浅色'}模式`}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 70% 70%, rgba(0,0,0,0.03) 0%, transparent 50%)',
        }}
      />

      <motion.div
        key={resolvedMode}
        initial={{ rotate: -180, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 180, opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
        className="relative z-10"
        style={{ color: isDark ? 'var(--color-text-inverse)' : 'var(--color-primary)' }}
      >
        {isDark ? <Sparkles size={config.icon} /> : <Palette size={config.icon} />}
      </motion.div>

      {!isDark && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background:
              'radial-gradient(circle at center, var(--color-primary) 0%, transparent 70%)',
            opacity: 0.05,
          }}
        />
      )}
    </motion.button>
  );
}

function DropdownToggle({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
  const { themeId, mode, resolvedMode, setThemeId, setMode, currentTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const config = sizeMap[size];
  const ModeIcon = modeIcons[mode];
  const isDark = resolvedMode === 'dark';

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={`relative flex items-center ${config.gap} ${config.padding} rounded-xl transition-all duration-300 overflow-hidden`}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: isOpen
            ? '0 8px 24px -4px rgba(0, 0, 0, 0.15)'
            : '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)`,
            opacity: isOpen ? 0.05 : 0,
          }}
          animate={{ opacity: isOpen ? 0.05 : 0 }}
        />

        <motion.span
          key={themeId}
          initial={{ scale: 0.8, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          className="text-base relative z-10"
        >
          {currentTheme?.icon || '🎨'}
        </motion.span>
        <ModeIcon
          size={config.icon}
          style={{ color: 'var(--color-text-secondary)' }}
          className="relative z-10"
        />
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-10"
        >
          <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute right-0 mt-2 w-80 p-4 rounded-2xl shadow-2xl z-50 overflow-hidden"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                      boxShadow: '0 4px 12px -2px var(--color-primary)',
                    }}
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Palette size={14} style={{ color: 'var(--color-text-inverse)' }} />
                  </motion.div>
                  <h4
                    className={`font-semibold ${config.text}`}
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    主题风格
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(heritageThemes) as HeritageThemeId[]).map((id, index) => {
                    const theme = heritageThemes[id];
                    const isSelected = themeId === id;
                    const gradient = heritageThemeGradients[id];

                    return (
                      <motion.button
                        key={id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setThemeId(id)}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative flex items-center gap-2 p-3 rounded-xl transition-all overflow-hidden ${
                          isSelected ? 'ring-2 ring-offset-2' : ''
                        }`}
                        style={{
                          background: gradient.preview,
                          boxShadow: isSelected
                            ? `0 0 20px ${theme.colors.light.primary}50`
                            : '0 2px 8px -2px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <span className="text-lg drop-shadow">{theme.icon}</span>
                        <span className={`font-medium text-white drop-shadow ${config.text}`}>
                          {theme.name}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center"
                          >
                            <Check size={12} style={{ color: theme.colors.light.primary }} />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: isDark
                        ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      boxShadow: isDark
                        ? '0 4px 12px -2px rgba(99, 102, 241, 0.4)'
                        : '0 4px 12px -2px rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    {isDark ? (
                      <Moon size={14} style={{ color: 'var(--color-text-inverse)' }} />
                    ) : (
                      <Sun size={14} style={{ color: 'var(--color-text-inverse)' }} />
                    )}
                  </motion.div>
                  <h4
                    className={`font-semibold ${config.text}`}
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    显示模式
                  </h4>
                </div>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((m, index) => {
                    const Icon = modeIcons[m];
                    const isSelected = mode === m;

                    return (
                      <motion.button
                        key={m}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        onClick={() => setMode(m)}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all ${config.text}`}
                        style={{
                          background: isSelected
                            ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                            : 'var(--color-background-secondary)',
                          color: isSelected
                            ? 'var(--color-text-inverse)'
                            : 'var(--color-text-secondary)',
                          boxShadow: isSelected ? '0 4px 12px -2px var(--color-primary)' : 'none',
                        }}
                      >
                        <Icon size={16} />
                        <span className="font-medium">{modeLabels[m]}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelToggle({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
  const { themeId, mode, setThemeId, setMode } = useThemeStore();
  const config = sizeMap[size];

  return (
    <div
      className={`p-6 rounded-2xl ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--gradient-primary)' }}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Palette size={20} style={{ color: 'var(--color-text-inverse)' }} />
        </motion.div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            主题设置
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            个性化你的界面
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h4
          className={`font-medium mb-3 ${config.text}`}
          style={{ color: 'var(--color-text-muted)' }}
        >
          选择主题风格
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(heritageThemes) as HeritageThemeId[]).map((id) => {
            const theme = heritageThemes[id];
            const isSelected = themeId === id;
            const gradient = heritageThemeGradients[id];

            return (
              <motion.button
                key={id}
                onClick={() => setThemeId(id)}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={`relative w-full p-4 rounded-2xl text-left transition-all overflow-hidden ${
                  isSelected ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  background: gradient.preview,
                  boxShadow: isSelected
                    ? `0 0 30px ${theme.colors.light.primary}40`
                    : '0 4px 16px -4px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl drop-shadow">{theme.icon}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"
                    >
                      <Check size={14} style={{ color: theme.colors.light.primary }} />
                    </motion.div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white drop-shadow-md">{theme.name}</h3>
                <p className="text-sm text-white/80 mt-1 line-clamp-2">{theme.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)' }} className="pt-4">
        <h4
          className={`font-medium mb-3 ${config.text}`}
          style={{ color: 'var(--color-text-muted)' }}
        >
          显示模式
        </h4>
        <div className="flex gap-3">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => {
            const Icon = modeIcons[m];
            const isSelected = mode === m;

            return (
              <motion.button
                key={m}
                onClick={() => setMode(m)}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all`}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                    : 'var(--color-background-secondary)',
                  color: isSelected ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                  boxShadow: isSelected ? '0 4px 12px -2px var(--color-primary)' : 'none',
                }}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{modeLabels[m]}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ThemeToggle({
  variant = 'icon',
  size = 'md',
  className = '',
}: ThemeToggleProps) {
  switch (variant) {
    case 'dropdown':
      return <DropdownToggle size={size} className={className} />;
    case 'panel':
      return <PanelToggle size={size} className={className} />;
    case 'icon':
    default:
      return <IconToggle size={size} className={className} />;
  }
}

export { IconToggle, DropdownToggle, PanelToggle };
