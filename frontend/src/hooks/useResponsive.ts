import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const getBreakpoint = useCallback((width: number): Breakpoint => {
    if (width < breakpoints.sm) return 'xs';
    if (width < breakpoints.md) return 'sm';
    if (width < breakpoints.lg) return 'md';
    if (width < breakpoints.xl) return 'lg';
    if (width < breakpoints['2xl']) return 'xl';
    return '2xl';
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      setCurrentBreakpoint(getBreakpoint(width));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [getBreakpoint]);

  const isMobile = currentBreakpoint === 'xs' || currentBreakpoint === 'sm';
  const isTablet = currentBreakpoint === 'md';
  const isDesktop = currentBreakpoint === 'lg' || currentBreakpoint === 'xl' || currentBreakpoint === '2xl';

  const isAtLeast = (breakpoint: Breakpoint): boolean => {
    return windowSize.width >= breakpoints[breakpoint];
  };

  const isAtMost = (breakpoint: Breakpoint): boolean => {
    return windowSize.width < breakpoints[breakpoint];
  };

  return {
    currentBreakpoint,
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isAtLeast,
    isAtMost,
  };
};

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

export const useResponsiveLayout = () => {
  const { isMobile, isTablet, isDesktop, currentBreakpoint } = useBreakpoint();
  
  const sidebarCollapsed = isMobile || isTablet;
  const showFloatingButton = isMobile;
  const messageMaxWidth = isMobile ? '100%' : isTablet ? '85%' : '70%';
  const fontSize = isMobile ? 'text-sm' : isTablet ? 'text-base' : 'text-base';
  const padding = isMobile ? 'p-2' : isTablet ? 'p-3' : 'p-4';
  const gap = isMobile ? 'gap-2' : isTablet ? 'gap-3' : 'gap-4';

  return {
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint,
    sidebarCollapsed,
    showFloatingButton,
    messageMaxWidth,
    fontSize,
    padding,
    gap,
  };
};

export default useBreakpoint;
