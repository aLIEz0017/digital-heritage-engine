/**
 * 主题适配器工具函数
 * 用于主题系统的颜色计算和阴影生成
 */

import type { HeritageThemeColors } from '../config/themes/heritageThemes';

/**
 * 从主题颜色创建阴影
 */
export function createShadowFromColors(
  colors: HeritageThemeColors,
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md'
): string {
  const shadowOpacity = {
    sm: '0.1',
    md: '0.15',
    lg: '0.2',
    xl: '0.25',
  };

  const primaryColor = colors.primary;
  const opacity = shadowOpacity[size];

  return `0 4px 12px ${primaryColor}${opacity}`;
}

/**
 * 从主题颜色创建渐变
 */
export function createGradientFromColors(
  colors: HeritageThemeColors,
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'horizontal'
): string {
  const { gradientPrimary, gradientSecondary } = colors;
  
  return `linear-gradient(${
    direction === 'horizontal' ? '90deg' : 
    direction === 'vertical' ? '180deg' : '135deg'
  }, ${gradientPrimary}, ${gradientSecondary})`;
}

/**
 * 从主题颜色创建图案
 */
export function createPatternFromColors(
  colors: HeritageThemeColors,
  pattern: 'dots' | 'lines' | 'grid' = 'dots'
): string {
  const { primary } = colors;
  
  switch (pattern) {
    case 'dots':
      return `radial-gradient(${primary}22 1px, transparent 1px)`;
    case 'lines':
      return `linear-gradient(90deg, ${primary}22 1px, transparent 1px)`;
    case 'grid':
      return `
        linear-gradient(90deg, ${primary}22 1px, transparent 1px),
        linear-gradient(0deg, ${primary}22 1px, transparent 1px)
      `;
    default:
      return '';
  }
}

/**
 * 调整颜色透明度
 */
export function adjustAlpha(color: string, alpha: number): string {
  // 处理十六进制颜色
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // 处理 rgb/rgba 颜色
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
  }
  
  return color;
}

/**
 * 混合两种颜色
 */
export function blendColors(color1: string, color2: string, ratio: number = 0.5): string {
  const parseColor = (color: string) => {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
      };
    }
    return { r: 0, g: 0, b: 0 };
  };

  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
  const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
  const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}
