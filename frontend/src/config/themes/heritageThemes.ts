export type HeritageThemeId = 'ink-wash' | 'blue-porcelain' | 'dunhuang' | 'jiangnan' | 'brocade';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface HeritageThemeColors {
  name: string;
  nameEn: string;
  description: string;
  inspiration: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  accentHover: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderFocus: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
  shadowGlow: string;
  gradientPrimary: string;
  gradientSecondary: string;
  gradientAccent: string;
  gradientBackground: string;
  gradientCard: string;
}

export interface ThemePattern {
  id: string;
  name: string;
  description: string;
  svgPattern: string;
  backgroundColor: string;
  patternColor: string;
  patternOpacity: number;
}

export interface ThemeVisual {
  heritageImage: {
    id: number;
    name: string;
    gradient: string;
    keywords: string[];
  };
  patterns: {
    background: ThemePattern;
    border: ThemePattern;
    decoration: ThemePattern;
  };
  particles: {
    enabled: boolean;
    color: string;
    count: number;
    size: number;
    speed: number;
  };
  glow: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface HeritageTheme {
  id: HeritageThemeId;
  name: string;
  nameEn: string;
  description: string;
  inspiration: string;
  icon: string;
  colors: {
    light: HeritageThemeColors;
    dark: HeritageThemeColors;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
  };
  effects: {
    borderRadius: 'sharp' | 'soft' | 'rounded' | 'organic';
    shadowStyle: 'flat' | 'subtle' | 'elevated' | 'glowing';
    animationStyle: 'minimal' | 'smooth' | 'fluid' | 'dynamic';
  };
  metadata: {
    category: 'traditional' | 'regional' | 'artistic' | 'craft';
    era: string;
    region: string;
    heritageItems: string[];
  };
  visual: ThemeVisual;
}

const createInkWashPattern = (color: string, opacity: number): string => {
  return `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='blur'%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='30' cy='30' r='8' fill='${encodeURIComponent(color)}' fill-opacity='${opacity}' filter='url(%23blur)'/%3E%3Ccircle cx='10' cy='10' r='4' fill='${encodeURIComponent(color)}' fill-opacity='${opacity * 0.5}'/%3E%3Ccircle cx='50' cy='50' r='5' fill='${encodeURIComponent(color)}' fill-opacity='${opacity * 0.6}'/%3E%3C/svg%3E")`;
};

const createPorcelainPattern = (color: string, opacity: number): string => {
  return `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 10 Q50 20 60 15 Q70 25 65 40 Q75 50 65 60 Q55 70 40 65 Q25 75 15 60 Q5 50 15 40 Q10 25 20 15 Q30 5 40 10' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity}' stroke-width='1.5'/%3E%3Ccircle cx='40' cy='40' r='8' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity * 0.8}' stroke-width='1'/%3E%3C/svg%3E")`;
};

const createDunhuangPattern = (color: string, opacity: number): string => {
  return `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 Q60 30 80 30 Q60 50 70 70 Q50 60 30 70 Q40 50 20 30 Q40 30 50 10' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity}' stroke-width='1.5'/%3E%3Ccircle cx='50' cy='50' r='15' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity * 0.6}' stroke-width='1'/%3E%3Ccircle cx='50' cy='50' r='25' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity * 0.4}' stroke-width='0.5' stroke-dasharray='4 2'/%3E%3C/svg%3E")`;
};

const createJiangnanPattern = (color: string, opacity: number): string => {
  return `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q15 20 30 30 Q45 40 60 30' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity}' stroke-width='1'/%3E%3Cpath d='M0 45 Q15 35 30 45 Q45 55 60 45' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity * 0.5}' stroke-width='0.5'/%3E%3Crect x='20' y='20' width='20' height='20' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity * 0.3}' stroke-width='0.5'/%3E%3C/svg%3E")`;
};

const createBrocadePattern = (color: string, opacity: number): string => {
  return `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='20' height='20' fill='${encodeURIComponent(color)}' fill-opacity='${opacity * 0.3}'/%3E%3Crect x='20' y='20' width='20' height='20' fill='${encodeURIComponent(color)}' fill-opacity='${opacity * 0.3}'/%3E%3Cpath d='M0 0 L40 40 M40 0 L0 40' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity * 0.5}' stroke-width='0.5'/%3E%3Ccircle cx='20' cy='20' r='5' fill='none' stroke='${encodeURIComponent(color)}' stroke-opacity='${opacity}' stroke-width='1'/%3E%3C/svg%3E")`;
};

export const heritageThemes: Record<HeritageThemeId, HeritageTheme> = {
  'ink-wash': {
    id: 'ink-wash',
    name: '墨韵丹青',
    nameEn: 'Ink Wash',
    description:
      '水墨氤氲，虚实相生。以传统水墨画为灵感，黑白灰为主调，点缀丹青之色，尽显文人雅士之风骨。',
    inspiration: '中国水墨画',
    icon: '🖌️',
    colors: {
      light: {
        name: '墨韵丹青',
        nameEn: 'Ink Wash',
        description: '水墨氤氲，虚实相生',
        inspiration: '中国水墨画',
        primary: '#2c2c2c',
        primaryHover: '#1a1a1a',
        primaryLight: '#f5f5f5',
        primaryDark: '#0a0a0a',
        secondary: '#8b4513',
        secondaryHover: '#6b3410',
        accent: '#c41e3a',
        accentHover: '#a01830',
        background: '#faf9f6',
        backgroundSecondary: '#f0ede8',
        backgroundTertiary: '#e8e4de',
        surface: '#ffffff',
        surfaceHover: '#faf9f6',
        textPrimary: '#1a1a1a',
        textSecondary: '#4a4a4a',
        textMuted: '#8a8a8a',
        textInverse: '#faf9f6',
        border: '#d4d0c8',
        borderLight: '#e8e4de',
        borderFocus: '#2c2c2c',
        success: '#2d5a3d',
        warning: '#8b6914',
        error: '#8b3a3a',
        info: '#3a5a8b',
        shadow: 'rgba(0, 0, 0, 0.08)',
        shadowGlow: 'rgba(44, 44, 44, 0.15)',
        gradientPrimary: 'linear-gradient(135deg, #2c2c2c 0%, #4a4a4a 100%)',
        gradientSecondary: 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)',
        gradientAccent: 'linear-gradient(135deg, #c41e3a 0%, #dc3545 100%)',
        gradientBackground: 'linear-gradient(180deg, #faf9f6 0%, #f0ede8 50%, #e8e4de 100%)',
        gradientCard: 'linear-gradient(135deg, #ffffff 0%, #faf9f6 100%)',
      },
      dark: {
        name: '墨韵丹青',
        nameEn: 'Ink Wash',
        description: '水墨氤氲，虚实相生',
        inspiration: '中国水墨画',
        primary: '#e8e4de',
        primaryHover: '#faf9f6',
        primaryLight: '#2a2826',
        primaryDark: '#1a1816',
        secondary: '#cd853f',
        secondaryHover: '#deb887',
        accent: '#e85a71',
        accentHover: '#f07088',
        background: '#1a1816',
        backgroundSecondary: '#242220',
        backgroundTertiary: '#2e2c2a',
        surface: '#2a2826',
        surfaceHover: '#343230',
        textPrimary: '#e8e4de',
        textSecondary: '#b8b4ae',
        textMuted: '#888480',
        textInverse: '#1a1816',
        border: '#3a3836',
        borderLight: '#2e2c2a',
        borderFocus: '#e8e4de',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
        shadow: 'rgba(0, 0, 0, 0.4)',
        shadowGlow: 'rgba(232, 228, 222, 0.1)',
        gradientPrimary: 'linear-gradient(135deg, #e8e4de 0%, #c8c4be 100%)',
        gradientSecondary: 'linear-gradient(135deg, #cd853f 0%, #deb887 100%)',
        gradientAccent: 'linear-gradient(135deg, #e85a71 0%, #f07088 100%)',
        gradientBackground: 'linear-gradient(180deg, #1a1816 0%, #242220 50%, #2e2c2a 100%)',
        gradientCard: 'linear-gradient(135deg, #2a2826 0%, #242220 100%)',
      },
    },
    typography: {
      headingFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      bodyFont: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      monoFont: '"Fira Code", "SF Mono", Monaco, monospace',
    },
    effects: {
      borderRadius: 'soft',
      shadowStyle: 'subtle',
      animationStyle: 'smooth',
    },
    metadata: {
      category: 'artistic',
      era: '唐宋至今',
      region: '全国',
      heritageItems: ['中国画', '书法', '文房四宝'],
    },
    visual: {
      heritageImage: {
        id: 1,
        name: '昆曲',
        gradient: 'linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #CD853F 100%)',
        keywords: ['戏曲', '水墨', '脸谱', '云纹'],
      },
      patterns: {
        background: {
          id: 'ink-wash-bg',
          name: '水墨晕染',
          description: '水墨画风格的晕染纹理',
          svgPattern: createInkWashPattern('#2c2c2c', 0.08),
          backgroundColor: '#faf9f6',
          patternColor: '#2c2c2c',
          patternOpacity: 0.08,
        },
        border: {
          id: 'ink-wash-border',
          name: '水墨边框',
          description: '淡雅的水墨风格边框',
          svgPattern: createInkWashPattern('#8b4513', 0.15),
          backgroundColor: 'transparent',
          patternColor: '#8b4513',
          patternOpacity: 0.15,
        },
        decoration: {
          id: 'ink-wash-deco',
          name: '水墨装饰',
          description: '水墨风格的装饰元素',
          svgPattern: createInkWashPattern('#c41e3a', 0.2),
          backgroundColor: 'transparent',
          patternColor: '#c41e3a',
          patternOpacity: 0.2,
        },
      },
      particles: {
        enabled: true,
        color: '#daa520',
        count: 12,
        size: 4,
        speed: 8,
      },
      glow: {
        primary: 'rgba(44, 44, 44, 0.3)',
        secondary: 'rgba(139, 69, 19, 0.25)',
        accent: 'rgba(196, 30, 58, 0.35)',
      },
    },
  },

  'blue-porcelain': {
    id: 'blue-porcelain',
    name: '青花瓷韵',
    nameEn: 'Blue Porcelain',
    description:
      '素胚勾勒，青花绽放。以景德镇青花瓷为灵感，钴蓝与瓷白交织，展现千年窑火的永恒魅力。',
    inspiration: '景德镇青花瓷',
    icon: '🏺',
    colors: {
      light: {
        name: '青花瓷韵',
        nameEn: 'Blue Porcelain',
        description: '素胚勾勒，青花绽放',
        inspiration: '景德镇青花瓷',
        primary: '#1e4d8c',
        primaryHover: '#153a6e',
        primaryLight: '#e8f4fc',
        primaryDark: '#0d2847',
        secondary: '#4a90c2',
        secondaryHover: '#3a7ab2',
        accent: '#d4a574',
        accentHover: '#c49564',
        background: '#fafcfe',
        backgroundSecondary: '#f0f6fc',
        backgroundTertiary: '#e4eef8',
        surface: '#ffffff',
        surfaceHover: '#fafcfe',
        textPrimary: '#1a3a5c',
        textSecondary: '#3a5a7c',
        textMuted: '#6a8aa8',
        textInverse: '#fafcfe',
        border: '#c8daf0',
        borderLight: '#e4eef8',
        borderFocus: '#1e4d8c',
        success: '#2d7d46',
        warning: '#c4841a',
        error: '#c43a3a',
        info: '#1e6d8c',
        shadow: 'rgba(30, 77, 140, 0.08)',
        shadowGlow: 'rgba(30, 77, 140, 0.2)',
        gradientPrimary: 'linear-gradient(135deg, #1e4d8c 0%, #2a5fa0 100%)',
        gradientSecondary: 'linear-gradient(135deg, #4a90c2 0%, #5aa0d2 100%)',
        gradientAccent: 'linear-gradient(135deg, #d4a574 0%, #e4b584 100%)',
        gradientBackground: 'linear-gradient(180deg, #fafcfe 0%, #f0f6fc 50%, #e4eef8 100%)',
        gradientCard: 'linear-gradient(135deg, #ffffff 0%, #fafcfe 100%)',
      },
      dark: {
        name: '青花瓷韵',
        nameEn: 'Blue Porcelain',
        description: '素胚勾勒，青花绽放',
        inspiration: '景德镇青花瓷',
        primary: '#60a5fa',
        primaryHover: '#93c5fd',
        primaryLight: '#1a2a3c',
        primaryDark: '#0d1828',
        secondary: '#38bdf8',
        secondaryHover: '#7dd3fc',
        accent: '#f4c484',
        accentHover: '#f4d4a4',
        background: '#0d1828',
        backgroundSecondary: '#152238',
        backgroundTertiary: '#1d2e48',
        surface: '#1a2a3c',
        surfaceHover: '#24344c',
        textPrimary: '#e8f4fc',
        textSecondary: '#a8c8e8',
        textMuted: '#6888a8',
        textInverse: '#0d1828',
        border: '#2a4a6c',
        borderLight: '#1d2e48',
        borderFocus: '#60a5fa',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#38bdf8',
        shadow: 'rgba(0, 0, 0, 0.4)',
        shadowGlow: 'rgba(96, 165, 250, 0.2)',
        gradientPrimary: 'linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)',
        gradientSecondary: 'linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)',
        gradientAccent: 'linear-gradient(135deg, #f4c484 0%, #f4d4a4 100%)',
        gradientBackground: 'linear-gradient(180deg, #0d1828 0%, #152238 50%, #1d2e48 100%)',
        gradientCard: 'linear-gradient(135deg, #1a2a3c 0%, #152238 100%)',
      },
    },
    typography: {
      headingFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      bodyFont: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      monoFont: '"Fira Code", "SF Mono", Monaco, monospace',
    },
    effects: {
      borderRadius: 'rounded',
      shadowStyle: 'elevated',
      animationStyle: 'fluid',
    },
    metadata: {
      category: 'craft',
      era: '元代至今',
      region: '江西景德镇',
      heritageItems: ['青花瓷烧制技艺', '景德镇手工制瓷技艺'],
    },
    visual: {
      heritageImage: {
        id: 3,
        name: '蜀锦',
        gradient: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #93C5FD 100%)',
        keywords: ['织锦', '几何纹样', '蓝色', '织物'],
      },
      patterns: {
        background: {
          id: 'porcelain-bg',
          name: '青花缠枝',
          description: '青花瓷风格的缠枝花纹',
          svgPattern: createPorcelainPattern('#1e4d8c', 0.1),
          backgroundColor: '#fafcfe',
          patternColor: '#1e4d8c',
          patternOpacity: 0.1,
        },
        border: {
          id: 'porcelain-border',
          name: '青花边框',
          description: '青花瓷风格的边框纹样',
          svgPattern: createPorcelainPattern('#4a90c2', 0.2),
          backgroundColor: 'transparent',
          patternColor: '#4a90c2',
          patternOpacity: 0.2,
        },
        decoration: {
          id: 'porcelain-deco',
          name: '青花装饰',
          description: '青花瓷风格的装饰元素',
          svgPattern: createPorcelainPattern('#d4a574', 0.25),
          backgroundColor: 'transparent',
          patternColor: '#d4a574',
          patternOpacity: 0.25,
        },
      },
      particles: {
        enabled: true,
        color: '#60a5fa',
        count: 15,
        size: 3,
        speed: 6,
      },
      glow: {
        primary: 'rgba(30, 77, 140, 0.35)',
        secondary: 'rgba(74, 144, 194, 0.3)',
        accent: 'rgba(212, 165, 116, 0.4)',
      },
    },
  },

  dunhuang: {
    id: 'dunhuang',
    name: '敦煌飞天',
    nameEn: 'Dunhuang',
    description:
      '丝路明珠，飞天曼舞。以敦煌莫高窟壁画为灵感，矿石色彩璀璨夺目，重现千年丝路的盛世华彩。',
    inspiration: '敦煌莫高窟壁画',
    icon: '🪷',
    colors: {
      light: {
        name: '敦煌飞天',
        nameEn: 'Dunhuang',
        description: '丝路明珠，飞天曼舞',
        inspiration: '敦煌莫高窟壁画',
        primary: '#b8860b',
        primaryHover: '#9a7209',
        primaryLight: '#fef8e8',
        primaryDark: '#7a5a07',
        secondary: '#c54b3c',
        secondaryHover: '#a53b2c',
        accent: '#2e8b57',
        accentHover: '#246b47',
        background: '#fdf8f0',
        backgroundSecondary: '#f8f0e0',
        backgroundTertiary: '#f0e8d0',
        surface: '#fffaf0',
        surfaceHover: '#fdf8f0',
        textPrimary: '#3d2914',
        textSecondary: '#5d4934',
        textMuted: '#8d7964',
        textInverse: '#fdf8f0',
        border: '#e0d0b8',
        borderLight: '#f0e8d0',
        borderFocus: '#b8860b',
        success: '#2e8b57',
        warning: '#d4841a',
        error: '#c43a3a',
        info: '#3a7a9a',
        shadow: 'rgba(184, 134, 11, 0.1)',
        shadowGlow: 'rgba(184, 134, 11, 0.25)',
        gradientPrimary: 'linear-gradient(135deg, #b8860b 0%, #daa520 100%)',
        gradientSecondary: 'linear-gradient(135deg, #c54b3c 0%, #d56b5c 100%)',
        gradientAccent: 'linear-gradient(135deg, #2e8b57 0%, #3eab67 100%)',
        gradientBackground: 'linear-gradient(180deg, #fdf8f0 0%, #f8f0e0 50%, #f0e8d0 100%)',
        gradientCard: 'linear-gradient(135deg, #fffaf0 0%, #fdf8f0 100%)',
      },
      dark: {
        name: '敦煌飞天',
        nameEn: 'Dunhuang',
        description: '丝路明珠，飞天曼舞',
        inspiration: '敦煌莫高窟壁画',
        primary: '#f4c430',
        primaryHover: '#f4d460',
        primaryLight: '#2a2010',
        primaryDark: '#1a1408',
        secondary: '#e86b5c',
        secondaryHover: '#f08b7c',
        accent: '#4eab77',
        accentHover: '#6ecb97',
        background: '#1a1408',
        backgroundSecondary: '#262010',
        backgroundTertiary: '#322c18',
        surface: '#2a2010',
        surfaceHover: '#342a18',
        textPrimary: '#f8f0e0',
        textSecondary: '#c8b8a0',
        textMuted: '#988870',
        textInverse: '#1a1408',
        border: '#4a4030',
        borderLight: '#322c18',
        borderFocus: '#f4c430',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
        shadow: 'rgba(0, 0, 0, 0.4)',
        shadowGlow: 'rgba(244, 196, 48, 0.2)',
        gradientPrimary: 'linear-gradient(135deg, #f4c430 0%, #f4d460 100%)',
        gradientSecondary: 'linear-gradient(135deg, #e86b5c 0%, #f08b7c 100%)',
        gradientAccent: 'linear-gradient(135deg, #4eab77 0%, #6ecb97 100%)',
        gradientBackground: 'linear-gradient(180deg, #1a1408 0%, #262010 50%, #322c18 100%)',
        gradientCard: 'linear-gradient(135deg, #2a2010 0%, #262010 100%)',
      },
    },
    typography: {
      headingFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      bodyFont: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      monoFont: '"Fira Code", "SF Mono", Monaco, monospace',
    },
    effects: {
      borderRadius: 'organic',
      shadowStyle: 'glowing',
      animationStyle: 'dynamic',
    },
    metadata: {
      category: 'artistic',
      era: '十六国至元代',
      region: '甘肃敦煌',
      heritageItems: ['敦煌壁画', '敦煌彩塑', '敦煌飞天'],
    },
    visual: {
      heritageImage: {
        id: 5,
        name: '川剧',
        gradient: 'linear-gradient(135deg, #DC143C 0%, #FF4500 50%, #FFD700 100%)',
        keywords: ['变脸', '戏曲', '金红', '火焰'],
      },
      patterns: {
        background: {
          id: 'dunhuang-bg',
          name: '飞天藻井',
          description: '敦煌藻井风格的飞天纹样',
          svgPattern: createDunhuangPattern('#b8860b', 0.12),
          backgroundColor: '#fdf8f0',
          patternColor: '#b8860b',
          patternOpacity: 0.12,
        },
        border: {
          id: 'dunhuang-border',
          name: '敦煌边框',
          description: '敦煌风格的边框纹样',
          svgPattern: createDunhuangPattern('#c54b3c', 0.2),
          backgroundColor: 'transparent',
          patternColor: '#c54b3c',
          patternOpacity: 0.2,
        },
        decoration: {
          id: 'dunhuang-deco',
          name: '飞天装饰',
          description: '飞天风格的装饰元素',
          svgPattern: createDunhuangPattern('#2e8b57', 0.25),
          backgroundColor: 'transparent',
          patternColor: '#2e8b57',
          patternOpacity: 0.25,
        },
      },
      particles: {
        enabled: true,
        color: '#f4c430',
        count: 18,
        size: 5,
        speed: 5,
      },
      glow: {
        primary: 'rgba(184, 134, 11, 0.4)',
        secondary: 'rgba(197, 75, 60, 0.35)',
        accent: 'rgba(46, 139, 87, 0.45)',
      },
    },
  },

  jiangnan: {
    id: 'jiangnan',
    name: '江南烟雨',
    nameEn: 'Jiangnan',
    description:
      '小桥流水，烟雨朦胧。以江南水乡为灵感，黛瓦粉墙，青石板路，尽显诗意栖居的温婉之美。',
    inspiration: '江南水乡建筑',
    icon: '🏮',
    colors: {
      light: {
        name: '江南烟雨',
        nameEn: 'Jiangnan',
        description: '小桥流水，烟雨朦胧',
        inspiration: '江南水乡建筑',
        primary: '#4a6741',
        primaryHover: '#3a5731',
        primaryLight: '#f0f8f0',
        primaryDark: '#2a4721',
        secondary: '#6b8e7b',
        secondaryHover: '#5b7e6b',
        accent: '#8b7355',
        accentHover: '#7b6345',
        background: '#f8faf8',
        backgroundSecondary: '#f0f4f0',
        backgroundTertiary: '#e4eae4',
        surface: '#ffffff',
        surfaceHover: '#f8faf8',
        textPrimary: '#2a3a2a',
        textSecondary: '#4a5a4a',
        textMuted: '#7a8a7a',
        textInverse: '#f8faf8',
        border: '#c8d4c8',
        borderLight: '#e4eae4',
        borderFocus: '#4a6741',
        success: '#3a7a4a',
        warning: '#a08030',
        error: '#a04040',
        info: '#4070a0',
        shadow: 'rgba(74, 103, 65, 0.08)',
        shadowGlow: 'rgba(74, 103, 65, 0.15)',
        gradientPrimary: 'linear-gradient(135deg, #4a6741 0%, #5a7751 100%)',
        gradientSecondary: 'linear-gradient(135deg, #6b8e7b 0%, #7b9e8b 100%)',
        gradientAccent: 'linear-gradient(135deg, #8b7355 0%, #9b8365 100%)',
        gradientBackground: 'linear-gradient(180deg, #f8faf8 0%, #f0f4f0 50%, #e4eae4 100%)',
        gradientCard: 'linear-gradient(135deg, #ffffff 0%, #f8faf8 100%)',
      },
      dark: {
        name: '江南烟雨',
        nameEn: 'Jiangnan',
        description: '小桥流水，烟雨朦胧',
        inspiration: '江南水乡建筑',
        primary: '#7ab07a',
        primaryHover: '#8ac08a',
        primaryLight: '#1a241a',
        primaryDark: '#101810',
        secondary: '#8ab08a',
        secondaryHover: '#9ac09a',
        accent: '#b09070',
        accentHover: '#c0a080',
        background: '#101810',
        backgroundSecondary: '#181e18',
        backgroundTertiary: '#202820',
        surface: '#1a241a',
        surfaceHover: '#242e24',
        textPrimary: '#e8f0e8',
        textSecondary: '#a8c0a8',
        textMuted: '#789078',
        textInverse: '#101810',
        border: '#304030',
        borderLight: '#202820',
        borderFocus: '#7ab07a',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
        shadow: 'rgba(0, 0, 0, 0.4)',
        shadowGlow: 'rgba(122, 176, 122, 0.15)',
        gradientPrimary: 'linear-gradient(135deg, #7ab07a 0%, #8ac08a 100%)',
        gradientSecondary: 'linear-gradient(135deg, #8ab08a 0%, #9ac09a 100%)',
        gradientAccent: 'linear-gradient(135deg, #b09070 0%, #c0a080 100%)',
        gradientBackground: 'linear-gradient(180deg, #101810 0%, #181e18 50%, #202820 100%)',
        gradientCard: 'linear-gradient(135deg, #1a241a 0%, #181e18 100%)',
      },
    },
    typography: {
      headingFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      bodyFont: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      monoFont: '"Fira Code", "SF Mono", Monaco, monospace',
    },
    effects: {
      borderRadius: 'soft',
      shadowStyle: 'subtle',
      animationStyle: 'smooth',
    },
    metadata: {
      category: 'regional',
      era: '宋元明清',
      region: '江南地区',
      heritageItems: ['苏州园林', '江南丝竹', '昆曲'],
    },
    visual: {
      heritageImage: {
        id: 2,
        name: '苏绣',
        gradient: 'linear-gradient(135deg, #C41E3A 0%, #DC143C 50%, #FF69B4 100%)',
        keywords: ['刺绣', '牡丹', '精致', '柔美'],
      },
      patterns: {
        background: {
          id: 'jiangnan-bg',
          name: '烟雨朦胧',
          description: '江南水乡的烟雨纹理',
          svgPattern: createJiangnanPattern('#4a6741', 0.08),
          backgroundColor: '#f8faf8',
          patternColor: '#4a6741',
          patternOpacity: 0.08,
        },
        border: {
          id: 'jiangnan-border',
          name: '江南边框',
          description: '江南风格的边框纹样',
          svgPattern: createJiangnanPattern('#6b8e7b', 0.15),
          backgroundColor: 'transparent',
          patternColor: '#6b8e7b',
          patternOpacity: 0.15,
        },
        decoration: {
          id: 'jiangnan-deco',
          name: '江南装饰',
          description: '江南风格的装饰元素',
          svgPattern: createJiangnanPattern('#8b7355', 0.2),
          backgroundColor: 'transparent',
          patternColor: '#8b7355',
          patternOpacity: 0.2,
        },
      },
      particles: {
        enabled: true,
        color: '#7ab07a',
        count: 10,
        size: 3,
        speed: 10,
      },
      glow: {
        primary: 'rgba(74, 103, 65, 0.3)',
        secondary: 'rgba(107, 142, 123, 0.25)',
        accent: 'rgba(139, 115, 85, 0.35)',
      },
    },
  },

  brocade: {
    id: 'brocade',
    name: '锦绣华章',
    nameEn: 'Brocade',
    description: '经纬交织，锦绣华章。以苏绣蜀锦为灵感，霁红藤黄孔雀绿，展现匠心独运的锦绣之美。',
    inspiration: '苏绣蜀锦',
    icon: '🧵',
    colors: {
      light: {
        name: '锦绣华章',
        nameEn: 'Brocade',
        description: '经纬交织，锦绣华章',
        inspiration: '苏绣蜀锦',
        primary: '#c41e3a',
        primaryHover: '#a41830',
        primaryLight: '#fef0f2',
        primaryDark: '#84142a',
        secondary: '#f4a460',
        secondaryHover: '#e49450',
        accent: '#2e8b57',
        accentHover: '#2e7b47',
        background: '#fefcfa',
        backgroundSecondary: '#faf4f0',
        backgroundTertiary: '#f4ece6',
        surface: '#ffffff',
        surfaceHover: '#fefcfa',
        textPrimary: '#3a1a1a',
        textSecondary: '#5a3a3a',
        textMuted: '#8a6a6a',
        textInverse: '#fefcfa',
        border: '#e8d0c8',
        borderLight: '#f4ece6',
        borderFocus: '#c41e3a',
        success: '#2e8b57',
        warning: '#d4841a',
        error: '#c43a3a',
        info: '#3a7a9a',
        shadow: 'rgba(196, 30, 58, 0.08)',
        shadowGlow: 'rgba(196, 30, 58, 0.2)',
        gradientPrimary: 'linear-gradient(135deg, #c41e3a 0%, #e43e5a 100%)',
        gradientSecondary: 'linear-gradient(135deg, #f4a460 0%, #f4b470 100%)',
        gradientAccent: 'linear-gradient(135deg, #2e8b57 0%, #3e9b67 100%)',
        gradientBackground: 'linear-gradient(180deg, #fefcfa 0%, #faf4f0 50%, #f4ece6 100%)',
        gradientCard: 'linear-gradient(135deg, #ffffff 0%, #fefcfa 100%)',
      },
      dark: {
        name: '锦绣华章',
        nameEn: 'Brocade',
        description: '经纬交织，锦绣华章',
        inspiration: '苏绣蜀锦',
        primary: '#f06078',
        primaryHover: '#f08098',
        primaryLight: '#2a1418',
        primaryDark: '#180a0c',
        secondary: '#f4b470',
        secondaryHover: '#f4c490',
        accent: '#4eab77',
        accentHover: '#6ecb97',
        background: '#180a0c',
        backgroundSecondary: '#241416',
        backgroundTertiary: '#301e20',
        surface: '#2a1418',
        surfaceHover: '#341e22',
        textPrimary: '#f8e8ea',
        textSecondary: '#c8a8aa',
        textMuted: '#98787a',
        textInverse: '#180a0c',
        border: '#4a2a2e',
        borderLight: '#301e20',
        borderFocus: '#f06078',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
        shadow: 'rgba(0, 0, 0, 0.4)',
        shadowGlow: 'rgba(240, 96, 120, 0.2)',
        gradientPrimary: 'linear-gradient(135deg, #f06078 0%, #f08098 100%)',
        gradientSecondary: 'linear-gradient(135deg, #f4b470 0%, #f4c490 100%)',
        gradientAccent: 'linear-gradient(135deg, #4eab77 0%, #6ecb97 100%)',
        gradientBackground: 'linear-gradient(180deg, #180a0c 0%, #241416 50%, #301e20 100%)',
        gradientCard: 'linear-gradient(135deg, #2a1418 0%, #241416 100%)',
      },
    },
    typography: {
      headingFont: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      bodyFont: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      monoFont: '"Fira Code", "SF Mono", Monaco, monospace',
    },
    effects: {
      borderRadius: 'rounded',
      shadowStyle: 'elevated',
      animationStyle: 'fluid',
    },
    metadata: {
      category: 'craft',
      era: '春秋至今',
      region: '苏州、成都',
      heritageItems: ['苏绣', '蜀锦织造技艺', '云锦'],
    },
    visual: {
      heritageImage: {
        id: 4,
        name: '银花丝',
        gradient: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 50%, #FFD700 100%)',
        keywords: ['银饰', '编织', '金银', '华贵'],
      },
      patterns: {
        background: {
          id: 'brocade-bg',
          name: '织锦纹样',
          description: '织锦风格的几何纹样',
          svgPattern: createBrocadePattern('#c41e3a', 0.1),
          backgroundColor: '#fefcfa',
          patternColor: '#c41e3a',
          patternOpacity: 0.1,
        },
        border: {
          id: 'brocade-border',
          name: '锦绣边框',
          description: '锦绣风格的边框纹样',
          svgPattern: createBrocadePattern('#f4a460', 0.2),
          backgroundColor: 'transparent',
          patternColor: '#f4a460',
          patternOpacity: 0.2,
        },
        decoration: {
          id: 'brocade-deco',
          name: '锦绣装饰',
          description: '锦绣风格的装饰元素',
          svgPattern: createBrocadePattern('#2e8b57', 0.25),
          backgroundColor: 'transparent',
          patternColor: '#2e8b57',
          patternOpacity: 0.25,
        },
      },
      particles: {
        enabled: true,
        color: '#f06078',
        count: 14,
        size: 4,
        speed: 7,
      },
      glow: {
        primary: 'rgba(196, 30, 58, 0.35)',
        secondary: 'rgba(244, 164, 96, 0.3)',
        accent: 'rgba(46, 139, 87, 0.4)',
      },
    },
  },
};

export const themeList = Object.values(heritageThemes);

export const getTheme = (id: HeritageThemeId): HeritageTheme => {
  return heritageThemes[id];
};

export const getThemeColors = (
  id: HeritageThemeId,
  mode: 'light' | 'dark'
): HeritageThemeColors => {
  return heritageThemes[id].colors[mode];
};

export const getThemeVisual = (id: HeritageThemeId): ThemeVisual => {
  return heritageThemes[id].visual;
};

export const defaultThemeId: HeritageThemeId = 'ink-wash';

export const applyHeritageTheme = (themeId: HeritageThemeId, mode: 'light' | 'dark') => {
  const theme = heritageThemes[themeId];
  const colors = theme.colors[mode];
  const root = document.documentElement;

  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-mode', mode);

  root.style.setProperty('--theme-name', theme.name);

  Object.entries(colors).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--color-${cssKey}`, value);
  });

  root.style.setProperty('--font-heading', theme.typography.headingFont);
  root.style.setProperty('--font-body', theme.typography.bodyFont);
  root.style.setProperty('--font-mono', theme.typography.monoFont);

  const visual = theme.visual;
  root.style.setProperty('--pattern-bg', visual.patterns.background.svgPattern);
  root.style.setProperty('--pattern-border', visual.patterns.border.svgPattern);
  root.style.setProperty('--pattern-decoration', visual.patterns.decoration.svgPattern);
  root.style.setProperty('--particle-color', visual.particles.color);
  root.style.setProperty('--glow-primary', visual.glow.primary);
  root.style.setProperty('--glow-secondary', visual.glow.secondary);
  root.style.setProperty('--glow-accent', visual.glow.accent);
};

export const heritageThemeGradients: Record<HeritageThemeId, { preview: string }> = {
  'ink-wash': {
    preview: 'linear-gradient(135deg, #2c2c2c 0%, #8b4513 50%, #c41e3a 100%)',
  },
  'blue-porcelain': {
    preview: 'linear-gradient(135deg, #1e4d8c 0%, #4a90c2 50%, #d4a574 100%)',
  },
  dunhuang: {
    preview: 'linear-gradient(135deg, #b8860b 0%, #c54b3c 50%, #2e8b57 100%)',
  },
  jiangnan: {
    preview: 'linear-gradient(135deg, #4a6741 0%, #6b8e7b 50%, #8b7355 100%)',
  },
  brocade: {
    preview: 'linear-gradient(135deg, #c41e3a 0%, #f4a460 50%, #2e8b57 100%)',
  },
};
