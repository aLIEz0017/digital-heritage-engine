import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HeritageThemeId,
  ThemeMode,
  HeritageTheme,
  HeritageThemeColors,
  heritageThemes,
  applyHeritageTheme,
  defaultThemeId,
} from '../config/themes/heritageThemes';

interface ThemeState {
  themeId: HeritageThemeId;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  isInitialized: boolean;
  currentTheme: HeritageTheme | null;
  currentColors: HeritageThemeColors | null;

  setThemeId: (id: HeritageThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  initialize: () => void;
  syncWithSystem: () => void;
  getTheme: (id: HeritageThemeId) => HeritageTheme;
  getColors: (id: HeritageThemeId, mode: 'light' | 'dark') => HeritageThemeColors;
}

const getSystemPreference = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveMode = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemPreference();
  }
  return mode;
};

const applyThemeToDOM = (themeId: HeritageThemeId, resolvedMode: 'light' | 'dark') => {
  document.documentElement.classList.add('theme-transition');

  applyHeritageTheme(themeId, resolvedMode);

  setTimeout(() => {
    document.documentElement.classList.remove('theme-transition');
  }, 400);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: defaultThemeId,
      mode: 'system',
      resolvedMode: 'light',
      isInitialized: false,
      currentTheme: null,
      currentColors: null,

      setThemeId: (id: HeritageThemeId) => {
        const theme = heritageThemes[id];
        const resolvedMode = resolveMode(get().mode);
        const colors = theme.colors[resolvedMode];

        applyThemeToDOM(id, resolvedMode);

        set({
          themeId: id,
          currentTheme: theme,
          currentColors: colors,
        });
      },

      setMode: (mode: ThemeMode) => {
        const resolvedMode = resolveMode(mode);
        const { themeId } = get();
        const theme = heritageThemes[themeId];
        const colors = theme.colors[resolvedMode];

        applyThemeToDOM(themeId, resolvedMode);

        set({
          mode,
          resolvedMode,
          currentColors: colors,
        });
      },

      toggleMode: () => {
        const { mode } = get();
        const newMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
        get().setMode(newMode);
      },

      initialize: () => {
        const { themeId, mode } = get();
        const resolvedMode = resolveMode(mode);
        const theme = heritageThemes[themeId];
        const colors = theme.colors[resolvedMode];

        applyThemeToDOM(themeId, resolvedMode);

        set({
          resolvedMode,
          currentTheme: theme,
          currentColors: colors,
          isInitialized: true,
        });

        if (mode === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handler = () => {
            const newResolvedMode = getSystemPreference();
            const currentMode = get().mode;
            if (currentMode === 'system') {
              const currentThemeId = get().themeId;
              const currentTheme = heritageThemes[currentThemeId];
              const newColors = currentTheme.colors[newResolvedMode];

              applyThemeToDOM(currentThemeId, newResolvedMode);

              set({
                resolvedMode: newResolvedMode,
                currentColors: newColors,
              });
            }
          };
          mediaQuery.addEventListener('change', handler);
        }
      },

      syncWithSystem: () => {
        const pref = getSystemPreference();
        const { mode, themeId } = get();
        if (mode === 'system') {
          const theme = heritageThemes[themeId];
          const colors = theme.colors[pref];

          applyThemeToDOM(themeId, pref);

          set({
            resolvedMode: pref,
            currentColors: colors,
          });
        }
      },

      getTheme: (id: HeritageThemeId) => {
        return heritageThemes[id];
      },

      getColors: (id: HeritageThemeId, mode: 'light' | 'dark') => {
        return heritageThemes[id].colors[mode];
      },
    }),
    {
      name: 'heritage-theme-store',
      partialize: (state) => ({
        themeId: state.themeId,
        mode: state.mode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initialize();
        }
      },
    }
  )
);

export type { HeritageThemeId, ThemeMode, HeritageTheme, HeritageThemeColors };
export { heritageThemes, defaultThemeId };

/**
 * 获取解析后的模式（将 system 转换为实际的 light 或 dark）
 */
export const getResolvedMode = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemPreference();
  }
  return mode;
};

/**
 * 获取当前主题
 */
export const getCurrentTheme = (themeId: HeritageThemeId): HeritageTheme => {
  return heritageThemes[themeId];
};

/**
 * 获取所有主题列表
 */
export const getAllThemes = (): HeritageTheme[] => {
  return Object.values(heritageThemes);
};
