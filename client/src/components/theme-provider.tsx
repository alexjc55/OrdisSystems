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
  
  // Apply theme colors as CSS variables
  root.style.setProperty('--color-primary', hexToHsl(colors.primary));
  root.style.setProperty('--color-primary-light', hexToHsl(colors.primaryLight));
  root.style.setProperty('--color-primary-dark', hexToHsl(colors.primaryDark));
  root.style.setProperty('--color-secondary', hexToHsl(colors.secondary));
  root.style.setProperty('--color-accent', hexToHsl(colors.accent));
  root.style.setProperty('--color-background', hexToHsl(colors.background));
  root.style.setProperty('--color-surface', hexToHsl(colors.surface));
  root.style.setProperty('--color-text', hexToHsl(colors.text));
  root.style.setProperty('--color-text-secondary', hexToHsl(colors.textSecondary));
  root.style.setProperty('--color-border', hexToHsl(colors.border));
  root.style.setProperty('--color-success', hexToHsl(colors.success));
  root.style.setProperty('--color-warning', hexToHsl(colors.warning));
  root.style.setProperty('--color-error', hexToHsl(colors.error));
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