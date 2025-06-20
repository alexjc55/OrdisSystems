// Centralized Theme Configuration
// All styling decisions are managed from this single file

export const themeConfig = {
  // Brand Identity
  brand: {
    name: "eDAHouse",
    primaryColor: "hsl(24.6, 95%, 53.1%)", // Orange
    primaryColorDark: "hsl(20.5, 90%, 48%)",
    primaryColorLight: "hsl(24.6, 95%, 96%)",
    secondaryColor: "hsl(210, 40%, 98%)",
    accentColor: "hsl(210, 40%, 85%)",
  },

  // Color Palette
  colors: {
    primary: "var(--brand-primary)",
    secondary: "var(--color-gray-100)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    error: "var(--color-error)",
    info: "var(--color-info)",
    white: "var(--color-white)",
    black: "var(--color-gray-900)",
    gray: {
      50: "var(--color-gray-50)",
      100: "var(--color-gray-100)",
      200: "var(--color-gray-200)",
      300: "var(--color-gray-300)",
      400: "var(--color-gray-400)",
      500: "var(--color-gray-500)",
      600: "var(--color-gray-600)",
      700: "var(--color-gray-700)",
      800: "var(--color-gray-800)",
      900: "var(--color-gray-900)",
    }
  },

  // Typography System
  typography: {
    fontFamily: {
      primary: "var(--font-family-primary)",
      secondary: "var(--font-family-secondary)",
    },
    fontSize: {
      xs: "var(--font-size-xs)",
      sm: "var(--font-size-sm)",
      base: "var(--font-size-base)",
      lg: "var(--font-size-lg)",
      xl: "var(--font-size-xl)",
      "2xl": "var(--font-size-2xl)",
      "3xl": "var(--font-size-3xl)",
      "4xl": "var(--font-size-4xl)",
      "5xl": "var(--font-size-5xl)",
      "6xl": "var(--font-size-6xl)",
    },
    fontWeight: {
      light: "var(--font-weight-light)",
      normal: "var(--font-weight-normal)",
      medium: "var(--font-weight-medium)",
      semibold: "var(--font-weight-semibold)",
      bold: "var(--font-weight-bold)",
    },
    lineHeight: {
      tight: "var(--line-height-tight)",
      normal: "var(--line-height-normal)",
      relaxed: "var(--line-height-relaxed)",
    }
  },

  // Spacing Scale
  spacing: {
    1: "var(--spacing-1)",
    2: "var(--spacing-2)",
    3: "var(--spacing-3)",
    4: "var(--spacing-4)",
    5: "var(--spacing-5)",
    6: "var(--spacing-6)",
    8: "var(--spacing-8)",
    10: "var(--spacing-10)",
    12: "var(--spacing-12)",
    16: "var(--spacing-16)",
    20: "var(--spacing-20)",
    24: "var(--spacing-24)",
  },

  // Border Radius
  borderRadius: {
    sm: "var(--radius-sm)",
    base: "var(--radius-base)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
    full: "var(--radius-full)",
  },

  // Shadow System
  shadows: {
    sm: "var(--shadow-sm)",
    base: "var(--shadow-base)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    xl: "var(--shadow-xl)",
    primary: "var(--shadow-primary)",
    success: "var(--shadow-success)",
    warning: "var(--shadow-warning)",
    error: "var(--shadow-error)",
    info: "var(--shadow-info)",
    gray: "var(--shadow-gray)",
  },

  // Transitions
  transitions: {
    fast: "var(--transition-fast)",
    base: "var(--transition-base)",
    slow: "var(--transition-slow)",
  },

  // Z-Index Scale
  zIndex: {
    dropdown: "var(--z-dropdown)",
    sticky: "var(--z-sticky)",
    fixed: "var(--z-fixed)",
    modalBackdrop: "var(--z-modal-backdrop)",
    modal: "var(--z-modal)",
    popover: "var(--z-popover)",
    tooltip: "var(--z-tooltip)",
    toast: "var(--z-toast)",
  },

  // Component Configurations
  components: {
    button: {
      variants: {
        primary: {
          backgroundColor: "var(--brand-primary)",
          color: "var(--color-white)",
          hoverShadow: "var(--shadow-primary)",
        },
        secondary: {
          backgroundColor: "var(--color-gray-100)",
          color: "var(--color-gray-700)",
          hoverShadow: "var(--shadow-gray)",
        },
        success: {
          backgroundColor: "var(--color-success)",
          color: "var(--color-white)",
          hoverShadow: "var(--shadow-success)",
        },
        warning: {
          backgroundColor: "var(--color-warning)",
          color: "var(--color-white)",
          hoverShadow: "var(--shadow-warning)",
        },
        error: {
          backgroundColor: "var(--color-error)",
          color: "var(--color-white)",
          hoverShadow: "var(--shadow-error)",
        },
        info: {
          backgroundColor: "var(--color-info)",
          color: "var(--color-white)",
          hoverShadow: "var(--shadow-info)",
        },
        outline: {
          backgroundColor: "transparent",
          border: "1px solid var(--color-gray-300)",
          color: "var(--color-gray-700)",
          hoverShadow: "var(--shadow-base)",
        },
        ghost: {
          backgroundColor: "transparent",
          color: "var(--color-gray-700)",
          hoverBackgroundColor: "var(--color-gray-100)",
          hoverColor: "var(--color-gray-900)",
        },
        link: {
          backgroundColor: "transparent",
          color: "var(--brand-primary)",
          textDecoration: "underline",
          textUnderlineOffset: "4px",
        },
      },
      sizes: {
        sm: {
          height: "2.25rem",
          padding: "0 var(--spacing-3)",
          fontSize: "var(--font-size-xs)",
        },
        base: {
          height: "2.5rem",
          padding: "0 var(--spacing-4)",
          fontSize: "var(--font-size-sm)",
        },
        lg: {
          height: "2.75rem",
          padding: "0 var(--spacing-8)",
          fontSize: "var(--font-size-base)",
        },
        icon: {
          height: "2.5rem",
          width: "2.5rem",
          padding: "0",
        },
      },
    },
    card: {
      backgroundColor: "var(--color-white)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-base)",
      border: "1px solid var(--color-gray-200)",
      padding: "var(--spacing-6)",
    },
    input: {
      backgroundColor: "var(--color-white)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--color-gray-300)",
      padding: "var(--spacing-2) var(--spacing-3)",
      fontSize: "var(--font-size-sm)",
      focusBorderColor: "var(--brand-primary)",
      focusBoxShadow: "0 0 0 3px rgb(249 115 22 / 0.1)",
    },
  },

  // Layout Configuration
  layout: {
    container: {
      maxWidth: "1200px",
      padding: "0 var(--spacing-4)",
    },
    header: {
      height: "4rem",
      backgroundColor: "var(--color-white)",
      borderBottom: "1px solid var(--color-gray-200)",
      zIndex: "var(--z-sticky)",
    },
    sidebar: {
      width: "16rem",
      backgroundColor: "var(--color-white)",
      borderRight: "1px solid var(--color-gray-200)",
    },
    main: {
      backgroundColor: "var(--color-gray-50)",
      minHeight: "100vh",
      paddingTop: "4rem",
    },
    footer: {
      backgroundColor: "var(--color-white)",
      borderTop: "1px solid var(--color-gray-200)",
      padding: "var(--spacing-8) 0",
    },
  },

  // Animation and Interaction
  animations: {
    fadeIn: "fadeIn 0.3s ease-in-out",
    slideUp: "slideUp 0.3s ease-out",
    scaleIn: "scaleIn 0.2s ease-out",
    hover: {
      scale: "1.02",
      transition: "var(--transition-base)",
    },
  },

  // Responsive Breakpoints
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
} as const;

// Type definitions for TypeScript support
export type ThemeConfig = typeof themeConfig;
export type ButtonVariant = keyof typeof themeConfig.components.button.variants;
export type ButtonSize = keyof typeof themeConfig.components.button.sizes;
export type ColorKey = keyof typeof themeConfig.colors;
export type SpacingKey = keyof typeof themeConfig.spacing;

// Utility functions for accessing theme values
export const getThemeValue = (path: string) => {
  return path.split('.').reduce((obj, key) => obj?.[key], themeConfig as any);
};

export const getButtonStyles = (variant: ButtonVariant, size: ButtonSize) => {
  const variantStyles = themeConfig.components.button.variants[variant];
  const sizeStyles = themeConfig.components.button.sizes[size];
  
  return {
    ...variantStyles,
    ...sizeStyles,
  };
};

// CSS Custom Properties Generator
export const generateCSSCustomProperties = () => {
  const properties: Record<string, string> = {};
  
  // Brand colors
  properties['--brand-primary'] = themeConfig.brand.primaryColor;
  properties['--brand-primary-dark'] = themeConfig.brand.primaryColorDark;
  properties['--brand-primary-light'] = themeConfig.brand.primaryColorLight;
  
  return properties;
};