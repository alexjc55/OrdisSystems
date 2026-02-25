import { storage } from "./storage";

const DEFAULTS = {
  primaryTextColor: "hsl(0, 0%, 100%)",
  successColor: "hsl(142, 76%, 36%)",
  successLightColor: "hsl(142, 76%, 96%)",
  warningColor: "hsl(38, 92%, 50%)",
  warningLightColor: "hsl(38, 92%, 96%)",
  errorColor: "hsl(0, 84%, 60%)",
  errorLightColor: "hsl(0, 84%, 96%)",
  infoColor: "hsl(221, 83%, 53%)",
  infoLightColor: "hsl(221, 83%, 96%)",
  tomorrowColor: "hsl(262, 83%, 58%)",
  tomorrowDarkColor: "hsl(262, 83%, 48%)",
  tomorrowLightColor: "hsl(262, 83%, 96%)",
  outOfStockColor: "hsl(0, 84%, 60%)",
  whiteColor: "hsl(0, 0%, 100%)",
  gray50Color: "hsl(210, 40%, 98%)",
  gray100Color: "hsl(210, 40%, 96%)",
  gray200Color: "hsl(214, 32%, 91%)",
  gray300Color: "hsl(213, 27%, 84%)",
  gray400Color: "hsl(215, 20%, 65%)",
  gray500Color: "hsl(215, 16%, 47%)",
  gray600Color: "hsl(215, 19%, 35%)",
  gray700Color: "hsl(215, 25%, 27%)",
  gray800Color: "hsl(217, 33%, 17%)",
  gray900Color: "hsl(222, 47%, 11%)",
  fontFamilySecondary: "Inter, sans-serif",
  primaryShadow: "0 4px 14px 0 rgba(255, 102, 0, 0.3)",
  successShadow: "0 4px 14px 0 rgba(34, 197, 94, 0.3)",
  warningShadow: "0 4px 14px 0 rgba(245, 158, 11, 0.3)",
  errorShadow: "0 4px 14px 0 rgba(239, 68, 68, 0.3)",
  infoShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
  tomorrowShadow: "0 4px 14px 0 rgba(147, 51, 234, 0.3)",
  grayShadow: "0 4px 14px 0 rgba(107, 114, 128, 0.3)",
  whatsappPhone: "",
  whatsappMessage: "Здравствуйте! У меня есть вопрос по заказу.",
  isActive: false,
};

const PRESET_THEMES = [
  {
    id: "preset_modern",
    name: "Современный",
    name_en: "Modern",
    name_he: "מודרני",
    name_ar: "عصري",
    description: "Wolt-стиль: зелёные акценты, таблетки категорий, современные карточки",
    primaryColor: "hsl(142, 72%, 39%)",
    primaryDarkColor: "hsl(142, 72%, 32%)",
    primaryLightColor: "hsl(142, 72%, 95%)",
    secondaryColor: "hsl(0, 0%, 96%)",
    accentColor: "hsl(142, 30%, 85%)",
    backgroundColor: "hsl(0, 0%, 100%)",
    cardBackgroundColor: "hsl(210, 40%, 98%)",
    textPrimaryColor: "hsl(222, 47%, 11%)",
    textSecondaryColor: "hsl(215, 16%, 47%)",
    headerStyle: "modern",
    cardStyle: "modern",
    categoryGridStyle: "pills",
    fontFamilyPrimary: "Inter, sans-serif",
    ...DEFAULTS,
  },
  {
    id: "preset_dark",
    name: "Тёмный",
    name_en: "Dark",
    name_he: "כהה",
    name_ar: "داكن",
    description: "Тёмная тема с оранжевыми акцентами",
    primaryColor: "hsl(24.6, 95%, 53.1%)",
    primaryDarkColor: "hsl(20.5, 90%, 48%)",
    primaryLightColor: "hsl(24.6, 95%, 20%)",
    secondaryColor: "hsl(220, 15%, 20%)",
    accentColor: "hsl(220, 15%, 25%)",
    backgroundColor: "hsl(220, 15%, 10%)",
    cardBackgroundColor: "hsl(220, 15%, 16%)",
    textPrimaryColor: "hsl(210, 40%, 98%)",
    textSecondaryColor: "hsl(215, 20%, 65%)",
    headerStyle: "minimal",
    cardStyle: "modern",
    categoryGridStyle: "cards",
    fontFamilyPrimary: "Inter, sans-serif",
    ...DEFAULTS,
  },
  {
    id: "preset_warm",
    name: "Тёплый",
    name_en: "Warm",
    name_he: "חמים",
    name_ar: "دافئ",
    description: "Терракотовые тона, классические карточки и сетка категорий",
    primaryColor: "hsl(16, 70%, 50%)",
    primaryDarkColor: "hsl(16, 70%, 42%)",
    primaryLightColor: "hsl(16, 70%, 95%)",
    secondaryColor: "hsl(30, 20%, 90%)",
    accentColor: "hsl(30, 30%, 80%)",
    backgroundColor: "hsl(30, 30%, 96%)",
    cardBackgroundColor: "hsl(0, 0%, 100%)",
    textPrimaryColor: "hsl(20, 30%, 15%)",
    textSecondaryColor: "hsl(20, 15%, 40%)",
    headerStyle: "classic",
    cardStyle: "classic",
    categoryGridStyle: "cards",
    fontFamilyPrimary: "Poppins, sans-serif",
    ...DEFAULTS,
  },
];

export async function ensurePresetThemes(): Promise<void> {
  for (const preset of PRESET_THEMES) {
    try {
      const existing = await storage.getThemeById(preset.id);
      if (!existing) {
        await storage.createTheme(preset as any);
        console.log(`[preset-themes] Created preset theme: ${preset.id}`);
      }
    } catch (err) {
      console.error(`[preset-themes] Failed to ensure preset theme ${preset.id}:`, err);
    }
  }
}
