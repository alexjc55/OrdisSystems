// Theme System - Centralized theme management
export interface ThemeColors {
  // Brand colors
  primary: string;
  primaryText: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;

  // Status colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  tomorrow: string;
  tomorrowLight: string;
  outOfStock: string;

  // Neutral colors
  white: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
}

export interface ThemeTypography {
  fontFamilyPrimary: string;
  fontFamilySecondary: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeBase: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2xl: string;
  fontSize3xl: string;
  fontSize4xl: string;
  fontSize5xl: string;
  fontSize6xl: string;
  fontWeightLight: number;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  fontWeightBold: number;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  primary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  tomorrow: string;
  gray: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
}

// Default eDAHouse theme
export const defaultTheme: Theme = {
  id: 'edahouse-default',
  name: 'eDAHouse Оригинальная',
  description: 'Стандартная тема оформления eDAHouse с оранжевыми акцентами',
  colors: {
    primary: 'hsl(24.6, 95%, 53.1%)',
    primaryText: 'hsl(0, 0%, 100%)',
    primaryDark: 'hsl(20.5, 90%, 48%)',
    primaryLight: 'hsl(24.6, 95%, 96%)',
    secondary: 'hsl(210, 40%, 98%)',
    accent: 'hsl(210, 40%, 85%)',
    success: 'hsl(142, 76%, 36%)',
    successLight: 'hsl(142, 76%, 96%)',
    warning: 'hsl(38, 92%, 50%)',
    warningLight: 'hsl(38, 92%, 96%)',
    error: 'hsl(0, 84%, 60%)',
    errorLight: 'hsl(0, 84%, 96%)',
    info: 'hsl(221, 83%, 53%)',
    infoLight: 'hsl(221, 83%, 96%)',
    tomorrow: 'hsl(262, 83%, 58%)',
    tomorrowLight: 'hsl(262, 83%, 96%)',
    outOfStock: 'hsl(0, 84%, 60%)',
    white: 'hsl(0, 0%, 100%)',
    gray50: 'hsl(210, 40%, 98%)',
    gray100: 'hsl(210, 40%, 96%)',
    gray200: 'hsl(214, 32%, 91%)',
    gray300: 'hsl(213, 27%, 84%)',
    gray400: 'hsl(215, 20%, 65%)',
    gray500: 'hsl(215, 16%, 47%)',
    gray600: 'hsl(215, 19%, 35%)',
    gray700: 'hsl(215, 25%, 27%)',
    gray800: 'hsl(217, 33%, 17%)',
    gray900: 'hsl(222, 47%, 11%)',
  },
  typography: {
    fontFamilyPrimary: 'Poppins, sans-serif',
    fontFamilySecondary: 'Inter, sans-serif',
    fontSizeXs: '0.75rem',
    fontSizeSm: '0.875rem',
    fontSizeBase: '1rem',
    fontSizeLg: '1.125rem',
    fontSizeXl: '1.25rem',
    fontSize2xl: '1.5rem',
    fontSize3xl: '1.875rem',
    fontSize4xl: '2.25rem',
    fontSize5xl: '3rem',
    fontSize6xl: '4rem',
    fontWeightLight: 300,
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    xxl: '4rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    primary: '0 4px 14px 0 rgba(0, 0, 0, 0.15)',
    success: '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
    warning: '0 4px 14px 0 rgba(245, 158, 11, 0.3)',
    error: '0 4px 14px 0 rgba(239, 68, 68, 0.3)',
    info: '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
    tomorrow: '0 4px 14px 0 rgba(147, 51, 234, 0.3)',
    gray: '0 4px 14px 0 rgba(107, 114, 128, 0.3)',
  },
};

// Helper function to convert color to RGB
function colorToRgb(color: string): [number, number, number] {
  if (color.includes('hsl')) {
    const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
      const h = parseInt(hslMatch[1]) / 360;
      const s = parseInt(hslMatch[2]) / 100;
      const l = parseInt(hslMatch[3]) / 100;
      
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
  }
  
  if (color.includes('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return [r, g, b];
  }
  
  // Default to black
  return [0, 0, 0];
}

// Helper function to calculate luminance and determine contrast color
function getContrastColor(backgroundColor: string): string {
  const [r, g, b] = colorToRgb(backgroundColor);
  
  // Calculate relative luminance using WCAG formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? 'hsl(0, 0%, 0%)' : 'hsl(0, 0%, 100%)';
}

// Theme application utilities
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
    
    // Debug log for tomorrow and outOfStock colors
    if (key === 'tomorrow' || key === 'outOfStock') {
      console.log(`Applied ${cssVarName}: ${value}`);
    }
  });
  
  // Set the configured text color for primary elements
  root.style.setProperty('--color-primary-foreground', theme.colors.primaryText);

  // Apply typography variables
  Object.entries(theme.typography).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, String(value));
  });

  // Apply spacing variables
  Object.entries(theme.spacing).forEach(([key, value]) => {
    const cssVarName = `--spacing-${key}`;
    root.style.setProperty(cssVarName, value);
  });

  // Apply border radius variables
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    const cssVarName = `--border-radius-${key}`;
    root.style.setProperty(cssVarName, value);
  });

  // Apply shadow variables
  Object.entries(theme.shadows).forEach(([key, value]) => {
    const cssVarName = `--shadow-${key}`;
    root.style.setProperty(cssVarName, value);
  });

  // Store current theme
  localStorage.setItem('currentTheme', theme.id);
}

export function getCurrentThemeId(): string {
  return localStorage.getItem('currentTheme') || defaultTheme.id;
}

export function initializeTheme(): void {
  applyTheme(defaultTheme);
}

// Force apply orange theme colors immediately
export function forceApplyOrangeTheme(): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', 'hsl(24.6, 95%, 53.1%)');
  root.style.setProperty('--color-primary-dark', 'hsl(20.5, 90%, 48%)');
  root.style.setProperty('--color-primary-light', 'hsl(24.6, 95%, 96%)');
  root.style.setProperty('--color-secondary', 'hsl(210, 40%, 98%)');
  root.style.setProperty('--color-accent', 'hsl(210, 40%, 85%)');
}

// Button variant mappings
export const buttonVariants = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-white)',
    hover: {
      background: 'var(--color-primary)',
      shadow: 'var(--shadow-primary)',
    },
  },
  secondary: {
    background: 'var(--color-gray-100)',
    color: 'var(--color-gray-700)',
    hover: {
      background: 'var(--color-gray-100)',
      shadow: 'var(--shadow-gray)',
    },
  },
  success: {
    background: 'var(--color-success)',
    color: 'var(--color-white)',
    hover: {
      background: 'var(--color-success)',
      shadow: 'var(--shadow-success)',
    },
  },
  warning: {
    background: 'var(--color-warning)',
    color: 'var(--color-white)',
    hover: {
      background: 'var(--color-warning)',
      shadow: 'var(--shadow-warning)',
    },
  },
  error: {
    background: 'var(--color-error)',
    color: 'var(--color-white)',
    hover: {
      background: 'var(--color-error)',
      shadow: 'var(--shadow-error)',
    },
  },
  info: {
    background: 'var(--color-info)',
    color: 'var(--color-white)',
    hover: {
      background: 'var(--color-info)',
      shadow: 'var(--shadow-info)',
    },
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    hover: {
      background: 'var(--color-primary-light)',
      shadow: 'var(--shadow-primary)',
    },
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-gray-700)',
    hover: {
      background: 'var(--color-gray-100)',
      shadow: 'none',
    },
  },
};