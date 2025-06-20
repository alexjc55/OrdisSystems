import { useEffect } from "react";
import { useThemes } from "@/hooks/use-themes";
import type { ThemeColors } from "@shared/schema";

function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement;
  
  // Apply theme colors as CSS variables for shadcn/ui components
  root.style.setProperty('--primary', hexToHsl(colors.primary));
  root.style.setProperty('--primary-foreground', hexToHsl(colors.background));
  root.style.setProperty('--background', hexToHsl(colors.background));
  root.style.setProperty('--foreground', hexToHsl(colors.text));
  root.style.setProperty('--card', hexToHsl(colors.surface));
  root.style.setProperty('--card-foreground', hexToHsl(colors.text));
  root.style.setProperty('--popover', hexToHsl(colors.surface));
  root.style.setProperty('--popover-foreground', hexToHsl(colors.text));
  root.style.setProperty('--secondary', hexToHsl(colors.secondary));
  root.style.setProperty('--secondary-foreground', hexToHsl(colors.background));
  root.style.setProperty('--muted', hexToHsl(colors.surface));
  root.style.setProperty('--muted-foreground', hexToHsl(colors.textSecondary));
  root.style.setProperty('--accent', hexToHsl(colors.accent));
  root.style.setProperty('--accent-foreground', hexToHsl(colors.background));
  root.style.setProperty('--destructive', hexToHsl(colors.error));
  root.style.setProperty('--destructive-foreground', hexToHsl(colors.background));
  root.style.setProperty('--border', hexToHsl(colors.border));
  root.style.setProperty('--input', hexToHsl(colors.border));
  root.style.setProperty('--ring', hexToHsl(colors.primary));

  // Create comprehensive theme styles
  const style = document.createElement('style');
  style.id = 'dynamic-theme-styles';
  
  // Remove existing theme styles
  const existingStyle = document.getElementById('dynamic-theme-styles');
  if (existingStyle) {
    existingStyle.remove();
  }

  const isDark = colors.background === '#0f172a' || colors.background === '#1e293b';
  
  style.textContent = `
    /* Modern Design System Variables */
    :root {
      --theme-primary: ${colors.primary};
      --theme-primary-light: ${colors.primaryLight};
      --theme-primary-dark: ${colors.primaryDark};
      --theme-secondary: ${colors.secondary};
      --theme-accent: ${colors.accent};
      --theme-background: ${colors.background};
      --theme-surface: ${colors.surface};
      --theme-text: ${colors.text};
      --theme-text-secondary: ${colors.textSecondary};
      --theme-border: ${colors.border};
      --theme-shadow: ${isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)'};
      --theme-shadow-lg: ${isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.15)'};
    }

    /* Body and Document Styling */
    body {
      background-color: var(--theme-background) !important;
      color: var(--theme-text) !important;
      font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
      line-height: 1.6 !important;
    }

    /* Header and Navigation */
    .header-modern {
      background: ${hexToRgba(colors.surface, 0.95)} !important;
      backdrop-filter: blur(20px) !important;
      border-bottom: 1px solid ${hexToRgba(colors.border, 0.5)} !important;
      box-shadow: 0 1px 20px var(--theme-shadow) !important;
    }

    /* Modern Card Design */
    .modern-card {
      background: var(--theme-surface) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 16px !important;
      box-shadow: 0 4px 20px var(--theme-shadow) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      overflow: hidden !important;
    }

    .modern-card:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 8px 32px var(--theme-shadow-lg) !important;
      border-color: var(--theme-primary) !important;
    }

    /* Product Cards */
    .product-card {
      background: var(--theme-surface) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 20px !important;
      transition: all 0.3s ease !important;
      position: relative !important;
      overflow: hidden !important;
    }

    .product-card::before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 4px !important;
      background: linear-gradient(90deg, var(--theme-primary), var(--theme-accent)) !important;
      opacity: 0 !important;
      transition: opacity 0.3s ease !important;
    }

    .product-card:hover::before {
      opacity: 1 !important;
    }

    .product-card:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 12px 40px var(--theme-shadow-lg) !important;
      border-color: var(--theme-primary) !important;
    }

    /* Buttons - Modern Design */
    .btn-modern {
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-light)) !important;
      color: var(--theme-background) !important;
      border: none !important;
      border-radius: 12px !important;
      padding: 12px 24px !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 4px 16px ${hexToRgba(colors.primary, 0.3)} !important;
      position: relative !important;
      overflow: hidden !important;
    }

    .btn-modern::before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: -100% !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent) !important;
      transition: left 0.5s !important;
    }

    .btn-modern:hover::before {
      left: 100% !important;
    }

    .btn-modern:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 8px 32px ${hexToRgba(colors.primary, 0.4)} !important;
      background: linear-gradient(135deg, var(--theme-primary-dark), var(--theme-primary)) !important;
    }

    .btn-modern:active {
      transform: translateY(0) !important;
    }

    /* Glass Effect Elements */
    .glass-effect {
      background: ${hexToRgba(colors.surface, 0.8)} !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid ${hexToRgba(colors.border, 0.3)} !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 32px var(--theme-shadow) !important;
    }

    /* Hero Section */
    .hero-gradient {
      background: linear-gradient(135deg, 
        ${hexToRgba(colors.primary, 0.1)} 0%, 
        ${hexToRgba(colors.accent, 0.15)} 50%, 
        ${hexToRgba(colors.primaryLight, 0.1)} 100%) !important;
      position: relative !important;
    }

    .hero-gradient::before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: 
        radial-gradient(circle at 20% 20%, ${hexToRgba(colors.primary, 0.1)} 0%, transparent 70%),
        radial-gradient(circle at 80% 80%, ${hexToRgba(colors.accent, 0.1)} 0%, transparent 70%) !important;
      pointer-events: none !important;
    }

    /* Text Colors */
    .text-primary { color: var(--theme-primary) !important; }
    .text-primary-light { color: var(--theme-primary-light) !important; }
    .text-primary-dark { color: var(--theme-primary-dark) !important; }
    .text-secondary { color: var(--theme-text-secondary) !important; }
    .text-accent { color: var(--theme-accent) !important; }

    /* Background Colors */
    .bg-primary { background-color: var(--theme-primary) !important; }
    .bg-surface { background-color: var(--theme-surface) !important; }
    .bg-accent { background-color: var(--theme-accent) !important; }

    /* Border Colors */
    .border-primary { border-color: var(--theme-primary) !important; }
    .border-surface { border-color: var(--theme-border) !important; }

    /* Legacy Orange Classes Override */
    .text-orange-600, .text-orange-700, .text-orange-500 { color: var(--theme-primary) !important; }
    .text-orange-800 { color: var(--theme-primary-dark) !important; }
    .bg-orange-500, .bg-orange-600 { background-color: var(--theme-primary) !important; }
    .bg-orange-100 { background-color: ${hexToRgba(colors.primary, 0.1)} !important; }
    .border-orange-500, .ring-orange-500 { border-color: var(--theme-primary) !important; }
    .hover\\:bg-orange-600:hover { background-color: var(--theme-primary-dark) !important; }

    /* Form Elements */
    .form-input {
      background: var(--theme-surface) !important;
      border: 2px solid var(--theme-border) !important;
      border-radius: 12px !important;
      color: var(--theme-text) !important;
      transition: all 0.3s ease !important;
    }

    .form-input:focus {
      border-color: var(--theme-primary) !important;
      box-shadow: 0 0 0 3px ${hexToRgba(colors.primary, 0.1)} !important;
    }

    /* Enhanced Grid System */
    .products-grid {
      display: grid !important;
      gap: 1rem !important;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
    }

    .categories-grid {
      display: grid !important;
      gap: 0.75rem !important;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)) !important;
    }

    /* Responsive Typography */
    .responsive-title {
      font-size: clamp(1.5rem, 4vw, 3rem) !important;
      line-height: 1.2 !important;
    }

    .responsive-subtitle {
      font-size: clamp(1rem, 2.5vw, 1.25rem) !important;
      line-height: 1.5 !important;
    }

    /* Mobile First Responsive Design */
    @media (max-width: 640px) {
      .modern-card {
        border-radius: 12px !important;
        margin: 0.5rem 0 !important;
      }
      
      .btn-modern {
        padding: 12px 20px !important;
        font-size: 14px !important;
        border-radius: 10px !important;
        width: 100% !important;
      }
      
      .glass-effect {
        border-radius: 12px !important;
        padding: 1rem !important;
      }
      
      .product-card {
        border-radius: 16px !important;
      }

      .products-grid {
        grid-template-columns: 1fr !important;
        gap: 1rem !important;
      }

      .categories-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 0.5rem !important;
      }

      .hero-gradient {
        min-height: 50vh !important;
        padding: 2rem 1rem !important;
      }

      .header-modern {
        padding: 0 1rem !important;
      }
    }

    /* Tablet Portrait */
    @media (min-width: 641px) and (max-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1rem !important;
      }

      .categories-grid {
        grid-template-columns: repeat(3, 1fr) !important;
      }

      .modern-card {
        border-radius: 14px !important;
      }
      
      .product-card {
        border-radius: 18px !important;
      }
    }

    /* Tablet Landscape */
    @media (min-width: 769px) and (max-width: 1024px) {
      .products-grid {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 1.25rem !important;
      }

      .categories-grid {
        grid-template-columns: repeat(4, 1fr) !important;
      }

      .modern-card {
        border-radius: 16px !important;
      }
      
      .product-card {
        border-radius: 20px !important;
      }
    }

    /* Desktop */
    @media (min-width: 1025px) and (max-width: 1440px) {
      .products-grid {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 1.5rem !important;
      }

      .categories-grid {
        grid-template-columns: repeat(6, 1fr) !important;
      }

      .modern-card {
        border-radius: 18px !important;
      }
      
      .product-card {
        border-radius: 22px !important;
      }
      
      .btn-modern {
        padding: 14px 28px !important;
        font-size: 15px !important;
      }
    }

    /* Large Desktop */
    @media (min-width: 1441px) {
      .products-grid {
        grid-template-columns: repeat(5, 1fr) !important;
        gap: 2rem !important;
      }

      .categories-grid {
        grid-template-columns: repeat(8, 1fr) !important;
      }

      .modern-card {
        border-radius: 20px !important;
      }
      
      .product-card {
        border-radius: 24px !important;
      }
      
      .btn-modern {
        padding: 16px 32px !important;
        font-size: 16px !important;
      }
    }

    /* Animation Classes */
    .fade-in {
      animation: fadeIn 0.6s ease-out !important;
    }

    .slide-up {
      animation: slideUp 0.8s ease-out !important;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Dark Theme Specific Adjustments */
    ${isDark ? `
      .modern-card {
        background: ${hexToRgba('#1e293b', 0.95)} !important;
        border-color: ${hexToRgba('#334155', 0.8)} !important;
      }
      
      .glass-effect {
        background: ${hexToRgba('#1e293b', 0.9)} !important;
        border-color: ${hexToRgba('#334155', 0.5)} !important;
      }
      
      .header-modern {
        background: ${hexToRgba('#1e293b', 0.95)} !important;
        border-bottom-color: ${hexToRgba('#334155', 0.5)} !important;
      }
    ` : ''}
  `;
  
  document.head.appendChild(style);
}

function hexToRgba(hex: string, alpha: number): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ThemeApplier() {
  const { activeTheme } = useThemes();

  useEffect(() => {
    if (activeTheme?.colors) {
      applyThemeColors(activeTheme.colors as ThemeColors);
    }
  }, [activeTheme]);

  return null;
}