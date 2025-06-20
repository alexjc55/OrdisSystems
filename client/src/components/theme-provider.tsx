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
  
  // Apply theme colors as CSS variables that affect existing Tailwind/shadcn classes
  root.style.setProperty('--primary', hexToHsl(colors.primary));
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

  // Apply custom gradient classes for homepage
  const primaryColor = colors.primary;
  const primaryLightColor = colors.primaryLight;
  const accentColor = colors.accent;
  
  // Update gradient backgrounds
  const style = document.createElement('style');
  style.id = 'theme-gradients';
  
  // Remove existing theme styles
  const existingStyle = document.getElementById('theme-gradients');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  style.textContent = `
    .bg-gradient-primary {
      background: linear-gradient(135deg, ${primaryColor}, ${primaryLightColor}) !important;
    }
    .bg-gradient-to-br {
      background: linear-gradient(to bottom right, ${primaryColor}, ${accentColor}) !important;
    }
    .btn-modern {
      background: linear-gradient(135deg, ${primaryColor}, ${primaryLightColor}) !important;
      color: ${colors.background} !important;
    }
    .btn-modern:hover {
      background: linear-gradient(135deg, ${colors.primaryDark}, ${primaryColor}) !important;
    }
    .text-orange-600, .text-orange-700 {
      color: ${primaryColor} !important;
    }
    .text-orange-500 {
      color: ${primaryLightColor} !important;
    }
    .border-orange-500, .ring-orange-500 {
      border-color: ${primaryColor} !important;
    }
    .bg-orange-500, .hover\\:bg-orange-600:hover {
      background-color: ${primaryColor} !important;
    }
    .bg-orange-100 {
      background-color: ${hexToRgba(primaryColor, 0.1)} !important;
    }
    .text-orange-800 {
      color: ${colors.primaryDark} !important;
    }
    .hero-gradient {
      background: linear-gradient(135deg, ${primaryColor}10, ${accentColor}20, ${primaryLightColor}10) !important;
    }
    .glass-effect {
      background: ${hexToRgba(colors.surface, 0.95)} !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid ${hexToRgba(colors.border, 0.2)} !important;
    }
    .modern-card {
      background: ${colors.surface} !important;
      border: 1px solid ${colors.border} !important;
      color: ${colors.text} !important;
    }
    .modern-card:hover {
      background: ${hexToRgba(colors.primary, 0.05)} !important;
      border-color: ${colors.primary} !important;
    }
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
    console.log('ThemeApplier: activeTheme changed', activeTheme);
    if (activeTheme?.colors) {
      console.log('Applying theme colors:', activeTheme.colors);
      applyThemeColors(activeTheme.colors as ThemeColors);
    }
  }, [activeTheme]);

  return null;
}