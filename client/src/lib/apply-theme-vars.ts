function hexToHsl(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16) / 255;
  const g = parseInt(h.substr(2, 2), 16) / 255;
  const b = parseInt(h.substr(4, 2), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(hue * 360)}, ${Math.round(sat * 100)}%, ${Math.round(l * 100)}%)`;
}

function toHsl(color: string | null | undefined): string | null {
  if (!color) return null;
  return color.startsWith('#') ? hexToHsl(color) : color;
}

export function applyThemeVars(theme: Record<string, any>): void {
  const root = document.documentElement;
  const set = (varName: string, value: string | null | undefined) => {
    const v = toHsl(value);
    if (v) root.style.setProperty(varName, v);
  };

  // Primary colors
  set('--color-primary', theme.primaryColor);
  set('--color-primary-dark', theme.primaryDarkColor);
  set('--color-primary-light', theme.primaryLightColor);
  set('--color-primary-foreground', theme.primaryTextColor);
  set('--color-secondary', theme.secondaryColor);
  set('--color-accent', theme.accentColor);

  // Tailwind shadcn primary
  if (theme.primaryColor) root.style.setProperty('--primary', toHsl(theme.primaryColor)!);
  if (theme.primaryTextColor) root.style.setProperty('--primary-foreground', toHsl(theme.primaryTextColor)!);

  // Status colors
  set('--color-success', theme.successColor);
  set('--color-success-light', theme.successLightColor);
  set('--color-warning', theme.warningColor);
  set('--color-warning-light', theme.warningLightColor);
  set('--color-error', theme.errorColor);
  set('--color-error-light', theme.errorLightColor);
  set('--color-info', theme.infoColor);
  set('--color-info-light', theme.infoLightColor);
  set('--color-tomorrow', theme.tomorrowColor);
  set('--color-tomorrow-dark', theme.tomorrowDarkColor || theme.tomorrowColor);
  set('--color-tomorrow-light', theme.tomorrowLightColor);
  set('--color-out-of-stock', theme.outOfStockColor);

  // Icon colors
  set('--color-working-hours-icon', theme.workingHoursIconColor);
  set('--color-contacts-icon', theme.contactsIconColor);
  set('--color-payment-delivery-icon', theme.paymentDeliveryIconColor);

  // Neutral gray scale
  set('--color-white', theme.whiteColor);
  set('--color-gray-50', theme.gray50Color);
  set('--color-gray-100', theme.gray100Color);
  set('--color-gray-200', theme.gray200Color);
  set('--color-gray-300', theme.gray300Color);
  set('--color-gray-400', theme.gray400Color);
  set('--color-gray-500', theme.gray500Color);
  set('--color-gray-600', theme.gray600Color);
  set('--color-gray-700', theme.gray700Color);
  set('--color-gray-800', theme.gray800Color);
  set('--color-gray-900', theme.gray900Color);

  // Shadows
  if (theme.primaryShadow) root.style.setProperty('--shadow-primary', theme.primaryShadow);
  if (theme.successShadow) root.style.setProperty('--shadow-success', theme.successShadow);
  if (theme.warningShadow) root.style.setProperty('--shadow-warning', theme.warningShadow);
  if (theme.errorShadow) root.style.setProperty('--shadow-error', theme.errorShadow);
  if (theme.infoShadow) root.style.setProperty('--shadow-info', theme.infoShadow);
  if (theme.tomorrowShadow) root.style.setProperty('--shadow-tomorrow', theme.tomorrowShadow);
  if (theme.grayShadow) root.style.setProperty('--shadow-gray', theme.grayShadow);

  // Typography
  if (theme.fontFamilyPrimary) root.style.setProperty('--font-family-primary', theme.fontFamilyPrimary);
  if (theme.fontFamilySecondary) root.style.setProperty('--font-family-secondary', theme.fontFamilySecondary);

  // Layout / background / card / text
  set('--color-background', theme.backgroundColor);
  set('--color-card', theme.cardBackgroundColor);
  set('--color-text-primary', theme.textPrimaryColor);
  set('--color-text-secondary', theme.textSecondaryColor);

  // Also update shadcn --background and --card if dark theme
  if (theme.backgroundColor) root.style.setProperty('--background', toHsl(theme.backgroundColor)!);
  if (theme.cardBackgroundColor) root.style.setProperty('--card', toHsl(theme.cardBackgroundColor)!);
  if (theme.textPrimaryColor) {
    root.style.setProperty('--foreground', toHsl(theme.textPrimaryColor)!);
    root.style.setProperty('--card-foreground', toHsl(theme.textPrimaryColor)!);
  }
}
