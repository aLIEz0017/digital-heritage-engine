export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  accent: string;
  accentHover: string;
  cardBackground: string;
  cardBorder: string;
  inputBackground: string;
  inputBorder: string;
  inputFocusBorder: string;
  codeBackground: string;
  codeText: string;
  link: string;
  linkHover: string;
  shadow: string;
  overlay: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeBase: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2xl: string;
  fontSize3xl: string;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  fontWeightBold: number;
  lineHeightTight: number;
  lineHeightNormal: number;
  lineHeightRelaxed: number;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ThemeBorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
}

export const lightTheme: ThemeColors = {
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  backgroundTertiary: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#eff6ff',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
  accent: '#7c3aed',
  accentHover: '#6d28d9',
  cardBackground: '#ffffff',
  cardBorder: '#e2e8f0',
  inputBackground: '#ffffff',
  inputBorder: '#d1d5db',
  inputFocusBorder: '#2563eb',
  codeBackground: '#f1f5f9',
  codeText: '#1e293b',
  link: '#2563eb',
  linkHover: '#1d4ed8',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkTheme: ThemeColors = {
  background: '#0c1222',
  backgroundSecondary: '#131c31',
  backgroundTertiary: '#1a2744',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  border: '#2d3a52',
  borderLight: '#1e293b',
  primary: '#60a5fa',
  primaryHover: '#93c5fd',
  primaryLight: '#1e3a5f',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#38bdf8',
  accent: '#a78bfa',
  accentHover: '#c4b5fd',
  cardBackground: '#131c31',
  cardBorder: '#2d3a52',
  inputBackground: '#1a2744',
  inputBorder: '#3d4f6f',
  inputFocusBorder: '#60a5fa',
  codeBackground: '#1a2744',
  codeText: '#e2e8f0',
  link: '#60a5fa',
  linkHover: '#93c5fd',
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const typography: ThemeTypography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSizeXs: '0.75rem',
  fontSizeSm: '0.875rem',
  fontSizeBase: '1rem',
  fontSizeLg: '1.125rem',
  fontSizeXl: '1.25rem',
  fontSize2xl: '1.5rem',
  fontSize3xl: '1.875rem',
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightSemibold: 600,
  fontWeightBold: 700,
  lineHeightTight: 1.25,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

export const spacing: ThemeSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

export const borderRadius: ThemeBorderRadius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
};

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const getThemeColors = (theme: 'light' | 'dark'): ThemeColors => {
  return theme === 'dark' ? darkTheme : lightTheme;
};

export const getThemeConfig = (theme: 'light' | 'dark'): ThemeConfig => {
  return {
    colors: getThemeColors(theme),
    typography,
    spacing,
    borderRadius,
  };
};

export const cssVariables = (colors: ThemeColors): Record<string, string> => {
  return {
    '--color-background': colors.background,
    '--color-background-secondary': colors.backgroundSecondary,
    '--color-background-tertiary': colors.backgroundTertiary,
    '--color-text-primary': colors.textPrimary,
    '--color-text-secondary': colors.textSecondary,
    '--color-text-muted': colors.textMuted,
    '--color-border': colors.border,
    '--color-border-light': colors.borderLight,
    '--color-primary': colors.primary,
    '--color-primary-hover': colors.primaryHover,
    '--color-primary-light': colors.primaryLight,
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-error': colors.error,
    '--color-info': colors.info,
    '--color-accent': colors.accent,
    '--color-accent-hover': colors.accentHover,
    '--color-card-background': colors.cardBackground,
    '--color-card-border': colors.cardBorder,
    '--color-input-background': colors.inputBackground,
    '--color-input-border': colors.inputBorder,
    '--color-input-focus-border': colors.inputFocusBorder,
    '--color-code-background': colors.codeBackground,
    '--color-code-text': colors.codeText,
    '--color-link': colors.link,
    '--color-link-hover': colors.linkHover,
    '--color-shadow': colors.shadow,
    '--color-overlay': colors.overlay,
  };
};

export const applyTheme = (theme: 'light' | 'dark') => {
  const colors = getThemeColors(theme);
  const variables = cssVariables(colors);
  
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
};

export const contrastRatios = {
  light: {
    textPrimaryOnBackground: 15.5,
    textSecondaryOnBackground: 9.5,
    textMutedOnBackground: 4.8,
    primaryOnBackground: 4.5,
  },
  dark: {
    textPrimaryOnBackground: 15.8,
    textSecondaryOnBackground: 12.5,
    textMutedOnBackground: 6.2,
    primaryOnBackground: 5.2,
  },
};

export const wcagCompliance = {
  aa: {
    normalText: 4.5,
    largeText: 3,
  },
  aaa: {
    normalText: 7,
    largeText: 4.5,
  },
};
