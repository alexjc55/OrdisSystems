import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Palette, Eye, Trash2, Plus, Save, Paintbrush, Settings, RotateCcw, Info, Briefcase, AlertCircle, Layers, Upload, EyeOff } from "lucide-react";
import { applyTheme, defaultTheme, type Theme } from "@/lib/theme-system";
import { ModernStyleSettings } from "./modern-style-settings";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTranslation } from 'react-i18next';


// Visual Toggle Button Component
function VisualToggleButton({ 
  isEnabled, 
  onToggle, 
  label, 
  description,
  fieldName 
}: { 
  isEnabled: boolean;
  onToggle: () => void;
  label: string;
  description: string;
  fieldName: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={`p-2 h-8 w-8 ${isEnabled ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-500'}`}
      >
        {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
      <input type="hidden" name={fieldName} value={isEnabled ? "true" : "false"} />
    </div>
  );
}

// Helper function to convert HEX to HSL
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  // Convert to HSL format with proper rounding
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`;
}

// Helper function to convert HSL to HEX
function hslToHex(hslString: string): string {
  // If it's already a hex color, return as is
  if (hslString.startsWith('#')) {
    return hslString;
  }
  
  // Parse HSL string like "hsl(24.6, 95%, 53.1%)"
  const match = hslString.match(/hsl\((\d*\.?\d+),\s*(\d*\.?\d+)%,\s*(\d*\.?\d+)%\)/);
  if (!match) {
    return '#000000'; // fallback
  }
  
  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  
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
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface ThemeData {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  primaryColor: string;
  primaryTextColor: string;
  primaryDarkColor: string;
  primaryLightColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  successLightColor: string;
  warningColor: string;
  warningLightColor: string;
  errorColor: string;
  errorLightColor: string;
  infoColor: string;
  infoLightColor: string;
  tomorrowColor: string;
  tomorrowDarkColor: string;
  tomorrowLightColor: string;
  outOfStockColor: string;
  workingHoursIconColor: string;
  contactsIconColor: string;
  paymentDeliveryIconColor: string;
  headerStyle: string;
  bannerButtonText?: string;
  bannerButtonLink?: string;
  logoUrl?: string;
  bannerImageUrl?: string;
  
  // Cart banner settings
  showCartBanner?: boolean;
  cartBannerType?: string;
  cartBannerImage?: string;
  cartBannerText?: string;
  cartBannerBgColor?: string;
  cartBannerTextColor?: string;
  
  // Bottom banners settings
  showBottomBanners?: boolean;
  bottomBanner1Url?: string;
  bottomBanner1Link?: string;
  bottomBanner2Url?: string;
  bottomBanner2Link?: string;
  
  modernBlock1Icon?: string;
  modernBlock1Text?: string;
  modernBlock2Icon?: string;
  modernBlock2Text?: string;
  modernBlock3Icon?: string;
  modernBlock3Text?: string;
  whiteColor: string;
  gray50Color: string;
  gray100Color: string;
  gray200Color: string;
  gray300Color: string;
  gray400Color: string;
  gray500Color: string;
  gray600Color: string;
  gray700Color: string;
  gray800Color: string;
  gray900Color: string;
  fontFamilyPrimary: string;
  fontFamilySecondary: string;
  primaryShadow: string;
  successShadow: string;
  warningShadow: string;
  errorShadow: string;
  infoShadow: string;
  tomorrowShadow: string;
  grayShadow: string;
  
  // Visual display settings
  showBannerImage?: boolean;
  showTitleDescription?: boolean;
  showInfoBlocks?: boolean;
  infoBlocksPosition?: string;
  showSpecialOffers?: boolean;
  showCategoryMenu?: boolean;
  showWhatsAppChat?: boolean;
  
  // WhatsApp settings
  whatsappPhone?: string;
  whatsappMessage?: string;
}

export default function ThemeManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeData | null>(null);
  const [previewTheme, setPreviewTheme] = useState<ThemeData | null>(null);
  const [visualSettings, setVisualSettings] = useState({
    showBannerImage: true,
    showTitleDescription: true,
    showInfoBlocks: true,
    infoBlocksPosition: 'top',
    showSpecialOffers: true,
    showCategoryMenu: true,
    showWhatsAppChat: true,
    showCartBanner: false,
    showBottomBanners: false
  });
  const [editVisualSettings, setEditVisualSettings] = useState({
    showBannerImage: true,
    showTitleDescription: true,
    showInfoBlocks: true,
    infoBlocksPosition: 'top',
    showSpecialOffers: true,
    showCategoryMenu: true,
    showWhatsAppChat: true,
    showCartBanner: false,
    showBottomBanners: false
  });
  const [editCartBannerType, setEditCartBannerType] = useState('text');
  const [createCartBannerType, setCreateCartBannerType] = useState('text');
  
  // States for image URLs
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editBannerImageUrl, setEditBannerImageUrl] = useState('');
  const [editCartBannerImage, setEditCartBannerImage] = useState('');
  const [editBottomBanner1Url, setEditBottomBanner1Url] = useState('');
  const [editBottomBanner2Url, setEditBottomBanner2Url] = useState('');
  const [createLogoUrl, setCreateLogoUrl] = useState('');
  const [createBannerImageUrl, setCreateBannerImageUrl] = useState('');
  const [createCartBannerImage, setCreateCartBannerImage] = useState('');
  const [createBottomBanner1Url, setCreateBottomBanner1Url] = useState('');
  const [createBottomBanner2Url, setCreateBottomBanner2Url] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t: adminT } = useTranslation('admin');

  // Initialize edit visual settings when editing theme changes
  useEffect(() => {
    if (editingTheme) {
      setEditVisualSettings({
        showBannerImage: editingTheme.showBannerImage ?? true,
        showTitleDescription: editingTheme.showTitleDescription ?? true,
        showInfoBlocks: editingTheme.showInfoBlocks ?? true,
        infoBlocksPosition: editingTheme.infoBlocksPosition || 'top',
        showSpecialOffers: editingTheme.showSpecialOffers ?? true,
        showCategoryMenu: editingTheme.showCategoryMenu ?? true,
        showWhatsAppChat: editingTheme.showWhatsAppChat ?? true,
        showCartBanner: editingTheme.showCartBanner ?? false,
        showBottomBanners: editingTheme.showBottomBanners ?? false
      });
      setEditCartBannerType(editingTheme.cartBannerType || 'text');
      setEditLogoUrl(editingTheme.logoUrl || '');
      setEditBannerImageUrl(editingTheme.bannerImageUrl || '');
      setEditCartBannerImage(editingTheme.cartBannerImage || '');
      setEditBottomBanner1Url(editingTheme.bottomBanner1Url || '');
      setEditBottomBanner2Url(editingTheme.bottomBanner2Url || '');
    }
  }, [editingTheme]);

  const { data: themes, isLoading } = useQuery<ThemeData[]>({
    queryKey: ["/api/admin/themes"],
  });

  const createThemeMutation = useMutation({
    mutationFn: async (themeData: Omit<ThemeData, "id" | "isActive">) => {
      const res = await apiRequest("POST", "/api/admin/themes", themeData);
      return await res.json();
    },
    onSuccess: (newTheme) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/themes"] });
      
      // Automatically activate the newly created theme
      if (newTheme && newTheme.id) {
        activateThemeMutation.mutate(newTheme.id);
      }
      
      setIsCreateDialogOpen(false);
      toast({
        title: adminT("themes.success"),
        description: adminT("themes.createSuccess"),
      });
    },
    onError: (error: any) => {
      console.error("Theme creation error:", error);
      toast({
        title: adminT("themes.error"),
        description: error?.message || adminT("themes.createError"),
        variant: "destructive",
      });
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({ id, ...themeData }: Partial<ThemeData> & { id: string }) => {
      const res = await apiRequest("PUT", `/api/admin/themes/${id}`, themeData);
      return await res.json();
    },
    onSuccess: (updatedTheme) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/themes"] });
      // Invalidate store settings to refresh header style for all users
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setEditingTheme(null);
      
      // Apply theme immediately if it's the active theme
      if (updatedTheme.isActive) {
        // Get the full theme data from cache or fetch it
        const cachedThemes = queryClient.getQueryData<ThemeData[]>(["/api/admin/themes"]);
        const fullTheme = cachedThemes?.find(t => t.id === updatedTheme.id);
        const themeToApply = fullTheme || updatedTheme;
        // Apply colors directly to CSS custom properties
        const root = document.documentElement;
        
        // Update primary colors which are most commonly used
        const convertColorToHsl = (color: string) => {
          return color.startsWith('#') ? hexToHsl(color) : color;
        };
        
        root.style.setProperty('--color-primary', convertColorToHsl(themeToApply.primaryColor));
        root.style.setProperty('--color-primary-dark', convertColorToHsl(themeToApply.primaryDarkColor));
        root.style.setProperty('--color-primary-light', convertColorToHsl(themeToApply.primaryLightColor));
        root.style.setProperty('--color-secondary', convertColorToHsl(themeToApply.secondaryColor));
        root.style.setProperty('--color-accent', convertColorToHsl(themeToApply.accentColor));
        
        // Auto-determine contrasting text color for primary background
        const isLightPrimary = (() => {
          const color = updatedTheme.primaryColor;
          if (color.includes('hsl')) {
            const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (hslMatch) {
              const l = parseInt(hslMatch[3]);
              return l > 60;
            }
          }
          if (color.includes('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance > 0.6;
          }
          return false;
        })();
        
        // Use the custom primary text color from theme settings
        root.style.setProperty('--color-primary-foreground', convertColorToHsl(themeToApply.primaryTextColor));
        
        // Update status colors
        root.style.setProperty('--color-success', convertColorToHsl(themeToApply.successColor));
        root.style.setProperty('--color-success-light', convertColorToHsl(themeToApply.successLightColor));
        root.style.setProperty('--color-warning', convertColorToHsl(themeToApply.warningColor));
        root.style.setProperty('--color-warning-light', convertColorToHsl(themeToApply.warningLightColor));
        root.style.setProperty('--color-error', convertColorToHsl(themeToApply.errorColor));
        root.style.setProperty('--color-error-light', convertColorToHsl(themeToApply.errorLightColor));
        root.style.setProperty('--color-info', convertColorToHsl(themeToApply.infoColor));
        root.style.setProperty('--color-info-light', convertColorToHsl(themeToApply.infoLightColor));
        
        // Update special colors
        if (themeToApply.tomorrowColor) {
          root.style.setProperty('--color-tomorrow', convertColorToHsl(themeToApply.tomorrowColor));
        }
        if (themeToApply.tomorrowDarkColor) {
          root.style.setProperty('--color-tomorrow-dark', convertColorToHsl(themeToApply.tomorrowDarkColor));
          console.log('Applied --color-tomorrow-dark:', convertColorToHsl(themeToApply.tomorrowDarkColor));
        }
        if (themeToApply.tomorrowLightColor) {
          root.style.setProperty('--color-tomorrow-light', convertColorToHsl(themeToApply.tomorrowLightColor));
        }
        if (themeToApply.outOfStockColor) {
          root.style.setProperty('--color-out-of-stock', convertColorToHsl(themeToApply.outOfStockColor));
        }
        
        // Update shadows for special colors
        const tomorrowRgb = (() => {
          const color = updatedTheme.tomorrowColor;
          if (color.includes('hsl')) {
            const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (hslMatch) {
              const h = parseInt(hslMatch[1]) / 360;
              const s = parseInt(hslMatch[2]) / 100;
              const l = parseInt(hslMatch[3]) / 100;
              
              const c = (1 - Math.abs(2 * l - 1)) * s;
              const x = c * (1 - Math.abs((h * 6) % 2 - 1));
              const m = l - c / 2;
              
              let r = 0, g = 0, b = 0;
              if (h >= 0 && h < 1/6) { r = c; g = x; b = 0; }
              else if (h >= 1/6 && h < 2/6) { r = x; g = c; b = 0; }
              else if (h >= 2/6 && h < 3/6) { r = 0; g = c; b = x; }
              else if (h >= 3/6 && h < 4/6) { r = 0; g = x; b = c; }
              else if (h >= 4/6 && h < 5/6) { r = x; g = 0; b = c; }
              else if (h >= 5/6 && h < 1) { r = c; g = 0; b = x; }
              
              return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
            }
          }
          if (color.includes('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return [r, g, b];
          }
          return [239, 68, 68]; // fallback red
        })();
        
        root.style.setProperty('--shadow-tomorrow', `0 4px 14px 0 rgba(${tomorrowRgb[0]}, ${tomorrowRgb[1]}, ${tomorrowRgb[2]}, 0.3)`);
        
        // Update neutral colors
        root.style.setProperty('--color-white', convertColorToHsl(updatedTheme.whiteColor));
        root.style.setProperty('--color-gray-50', convertColorToHsl(updatedTheme.gray50Color));
        root.style.setProperty('--color-gray-100', convertColorToHsl(updatedTheme.gray100Color));
        root.style.setProperty('--color-gray-200', convertColorToHsl(updatedTheme.gray200Color));
        root.style.setProperty('--color-gray-300', convertColorToHsl(updatedTheme.gray300Color));
        root.style.setProperty('--color-gray-400', convertColorToHsl(updatedTheme.gray400Color));
        root.style.setProperty('--color-gray-500', convertColorToHsl(updatedTheme.gray500Color));
        root.style.setProperty('--color-gray-600', convertColorToHsl(updatedTheme.gray600Color));
        root.style.setProperty('--color-gray-700', convertColorToHsl(updatedTheme.gray700Color));
        root.style.setProperty('--color-gray-800', convertColorToHsl(updatedTheme.gray800Color));
        root.style.setProperty('--color-gray-900', convertColorToHsl(updatedTheme.gray900Color));
        
        // Update Tailwind CSS variables for hover:text-primary and other Tailwind classes
        root.style.setProperty('--primary', convertColorToHsl(updatedTheme.primaryColor));
        root.style.setProperty('--primary-foreground', convertColorToHsl(updatedTheme.primaryTextColor));
        
        // Update info block icon colors
        if (updatedTheme.workingHoursIconColor) {
          root.style.setProperty('--color-working-hours-icon', convertColorToHsl(updatedTheme.workingHoursIconColor));
        }
        if (updatedTheme.contactsIconColor) {
          root.style.setProperty('--color-contacts-icon', convertColorToHsl(updatedTheme.contactsIconColor));
        }
        if (updatedTheme.paymentDeliveryIconColor) {
          root.style.setProperty('--color-payment-delivery-icon', convertColorToHsl(updatedTheme.paymentDeliveryIconColor));
        }
        
        console.log('Applied theme colors to CSS variables');
      }

      // Automatically activate the theme if it's the current active theme
      const currentActiveTheme = themes?.find(theme => theme.isActive);
      if (currentActiveTheme && currentActiveTheme.id === updatedTheme.id) {
        // Trigger theme activation to sync with store settings
        activateThemeMutation.mutate(updatedTheme.id);
      }
      
      // Force refresh of store settings to show logo and banner changes immediately
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      toast({
        title: adminT("themes.success"),
        description: adminT("themes.updateSuccess"),
      });
    },
    onError: () => {
      toast({
        title: adminT("themes.error"),
        description: adminT("themes.updateError"),
        variant: "destructive",
      });
    },
  });

  const activateThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const res = await apiRequest("POST", `/api/admin/themes/${themeId}/activate`);
      return await res.json();
    },
    onSuccess: (activatedTheme) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/themes"] });
      // Invalidate store settings to refresh header style for all users
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      // Apply the theme immediately to the UI
      const theme: Theme = {
        id: activatedTheme.id,
        name: activatedTheme.name,
        description: activatedTheme.description,
        colors: {
          primary: activatedTheme.primaryColor,
          primaryText: activatedTheme.primaryTextColor,
          primaryDark: activatedTheme.primaryDarkColor,
          primaryLight: activatedTheme.primaryLightColor,
          secondary: activatedTheme.secondaryColor,
          accent: activatedTheme.accentColor,
          success: activatedTheme.successColor,
          successLight: activatedTheme.successLightColor,
          warning: activatedTheme.warningColor,
          warningLight: activatedTheme.warningLightColor,
          error: activatedTheme.errorColor,
          errorLight: activatedTheme.errorLightColor,
          info: activatedTheme.infoColor,
          infoLight: activatedTheme.infoLightColor,
          tomorrow: activatedTheme.tomorrowColor,
          tomorrowLight: activatedTheme.tomorrowLightColor,
          outOfStock: activatedTheme.outOfStockColor,
          white: activatedTheme.whiteColor,
          gray50: activatedTheme.gray50Color,
          gray100: activatedTheme.gray100Color,
          gray200: activatedTheme.gray200Color,
          gray300: activatedTheme.gray300Color,
          gray400: activatedTheme.gray400Color,
          gray500: activatedTheme.gray500Color,
          gray600: activatedTheme.gray600Color,
          gray700: activatedTheme.gray700Color,
          gray800: activatedTheme.gray800Color,
          gray900: activatedTheme.gray900Color,
        },
        typography: {
          fontFamilyPrimary: activatedTheme.fontFamilyPrimary,
          fontFamilySecondary: activatedTheme.fontFamilySecondary,
          fontSizeXs: defaultTheme.typography.fontSizeXs,
          fontSizeSm: defaultTheme.typography.fontSizeSm,
          fontSizeBase: defaultTheme.typography.fontSizeBase,
          fontSizeLg: defaultTheme.typography.fontSizeLg,
          fontSizeXl: defaultTheme.typography.fontSizeXl,
          fontSize2xl: defaultTheme.typography.fontSize2xl,
          fontSize3xl: defaultTheme.typography.fontSize3xl,
          fontSize4xl: defaultTheme.typography.fontSize4xl,
          fontSize5xl: defaultTheme.typography.fontSize5xl,
          fontSize6xl: defaultTheme.typography.fontSize6xl,
          fontWeightLight: defaultTheme.typography.fontWeightLight,
          fontWeightNormal: defaultTheme.typography.fontWeightNormal,
          fontWeightMedium: defaultTheme.typography.fontWeightMedium,
          fontWeightSemibold: defaultTheme.typography.fontWeightSemibold,
          fontWeightBold: defaultTheme.typography.fontWeightBold,
        },
        spacing: defaultTheme.spacing,
        borderRadius: defaultTheme.borderRadius,
        shadows: {
          sm: defaultTheme.shadows.sm,
          md: defaultTheme.shadows.md,
          lg: defaultTheme.shadows.lg,
          xl: defaultTheme.shadows.xl,
          primary: activatedTheme.primaryShadow,
          success: activatedTheme.successShadow,
          warning: activatedTheme.warningShadow,
          error: activatedTheme.errorShadow,
          info: activatedTheme.infoShadow,
          tomorrow: activatedTheme.tomorrowShadow,
          gray: activatedTheme.grayShadow,
        },
      };
      
      applyTheme(theme);
      
      toast({
        title: adminT("themes.success"),
        description: adminT("themes.activateSuccess"),
      });
    },
    onError: () => {
      toast({
        title: adminT("themes.error"),
        description: adminT("themes.activateError"),
        variant: "destructive",
      });
    },
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      await apiRequest("DELETE", `/api/admin/themes/${themeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/themes"] });
      toast({
        title: adminT("themes.success"),
        description: adminT("themes.deleteSuccess"),
      });
    },
    onError: () => {
      toast({
        title: adminT("themes.error"),
        description: adminT("themes.deleteError"),
        variant: "destructive",
      });
    },
  });

  const handleCreateTheme = (formData: FormData) => {
    const convertColorToHsl = (color: string | null) => {
      if (!color) return '';
      return color.startsWith('#') ? hexToHsl(color) : color;
    };

    const themeData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      primaryColor: convertColorToHsl(formData.get("primaryColor") as string),
      primaryTextColor: convertColorToHsl(formData.get("primaryTextColor") as string),
      primaryDarkColor: convertColorToHsl(formData.get("primaryDarkColor") as string),
      primaryLightColor: formData.get("primaryLightColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
      accentColor: formData.get("accentColor") as string,
      successColor: formData.get("successColor") as string,
      successLightColor: formData.get("successLightColor") as string,
      warningColor: formData.get("warningColor") as string,
      warningLightColor: formData.get("warningLightColor") as string,
      errorColor: formData.get("errorColor") as string,
      errorLightColor: formData.get("errorLightColor") as string,
      infoColor: formData.get("infoColor") as string,
      infoLightColor: formData.get("infoLightColor") as string,
      tomorrowColor: formData.get("tomorrowColor") as string,
      tomorrowDarkColor: formData.get("tomorrowDarkColor") as string,
      tomorrowLightColor: formData.get("tomorrowLightColor") as string,
      outOfStockColor: formData.get("outOfStockColor") as string,
      workingHoursIconColor: formData.get("workingHoursIconColor") as string,
      contactsIconColor: formData.get("contactsIconColor") as string,
      paymentDeliveryIconColor: formData.get("paymentDeliveryIconColor") as string,
      headerStyle: formData.get("headerStyle") as string,
      bannerButtonText: formData.get("bannerButtonText") as string || "Смотреть каталог",
      bannerButtonLink: formData.get("bannerButtonLink") as string || "#categories",
      logoUrl: createLogoUrl,
      bannerImageUrl: createBannerImageUrl,
      // Cart banner settings
      showCartBanner: formData.get("showCartBanner") === "true",
      cartBannerType: formData.get("cartBannerType") as string || "text",
      cartBannerImage: createCartBannerImage,
      cartBannerText: formData.get("cartBannerText") as string || "",
      cartBannerBgColor: formData.get("cartBannerBgColor") as string || "#f97316",
      cartBannerTextColor: formData.get("cartBannerTextColor") as string || "#ffffff",
      // Bottom banners settings
      showBottomBanners: formData.get("showBottomBanners") === "true",
      bottomBanner1Url: createBottomBanner1Url,
      bottomBanner1Link: formData.get("bottomBanner1Link") as string || "",
      bottomBanner2Url: createBottomBanner2Url,
      bottomBanner2Link: formData.get("bottomBanner2Link") as string || "",
      modernBlock1Icon: formData.get("modernBlock1Icon") as string || "",
      modernBlock1Text: formData.get("modernBlock1Text") as string || "",
      modernBlock2Icon: formData.get("modernBlock2Icon") as string || "",
      modernBlock2Text: formData.get("modernBlock2Text") as string || "",
      modernBlock3Icon: formData.get("modernBlock3Icon") as string || "",
      modernBlock3Text: formData.get("modernBlock3Text") as string || "",
      // Visual display settings
      showBannerImage: formData.get("showBannerImage") === "true",
      showTitleDescription: formData.get("showTitleDescription") === "true",
      showInfoBlocks: formData.get("showInfoBlocks") === "true",
      infoBlocksPosition: formData.get("infoBlocksPosition") as string || "top",
      showSpecialOffers: formData.get("showSpecialOffers") === "true",
      showCategoryMenu: formData.get("showCategoryMenu") === "true",
      showWhatsAppChat: formData.get("showWhatsAppChat") === "true",
      whiteColor: formData.get("whiteColor") as string,
      gray50Color: formData.get("gray50Color") as string,
      gray100Color: formData.get("gray100Color") as string,
      gray200Color: formData.get("gray200Color") as string,
      gray300Color: formData.get("gray300Color") as string,
      gray400Color: formData.get("gray400Color") as string,
      gray500Color: formData.get("gray500Color") as string,
      gray600Color: formData.get("gray600Color") as string,
      gray700Color: formData.get("gray700Color") as string,
      gray800Color: formData.get("gray800Color") as string,
      gray900Color: formData.get("gray900Color") as string,
      fontFamilyPrimary: formData.get("fontFamilyPrimary") as string,
      fontFamilySecondary: formData.get("fontFamilySecondary") as string,
      primaryShadow: formData.get("primaryShadow") as string,
      successShadow: formData.get("successShadow") as string,
      warningShadow: formData.get("warningShadow") as string,
      errorShadow: formData.get("errorShadow") as string,
      infoShadow: formData.get("infoShadow") as string,
      tomorrowShadow: formData.get("tomorrowShadow") as string || "0 4px 14px 0 rgba(147, 51, 234, 0.3)",
      grayShadow: formData.get("grayShadow") as string,
    };

    createThemeMutation.mutate(themeData);
  };

  const handleUpdateTheme = (formData: FormData, themeId: string) => {
    const convertColorToHsl = (color: string | null) => {
      if (!color) return '';
      return color.startsWith('#') ? hexToHsl(color) : color;
    };

    const themeData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      primaryColor: convertColorToHsl(formData.get("primaryColor") as string),
      primaryTextColor: convertColorToHsl(formData.get("primaryTextColor") as string),
      primaryDarkColor: convertColorToHsl(formData.get("primaryDarkColor") as string),
      primaryLightColor: convertColorToHsl(formData.get("primaryLightColor") as string),
      secondaryColor: convertColorToHsl(formData.get("secondaryColor") as string),
      accentColor: convertColorToHsl(formData.get("accentColor") as string),
      successColor: convertColorToHsl(formData.get("successColor") as string),
      successLightColor: convertColorToHsl(formData.get("successLightColor") as string),
      warningColor: convertColorToHsl(formData.get("warningColor") as string),
      warningLightColor: convertColorToHsl(formData.get("warningLightColor") as string),
      errorColor: convertColorToHsl(formData.get("errorColor") as string),
      errorLightColor: convertColorToHsl(formData.get("errorLightColor") as string),
      infoColor: convertColorToHsl(formData.get("infoColor") as string),
      infoLightColor: convertColorToHsl(formData.get("infoLightColor") as string),
      tomorrowColor: convertColorToHsl(formData.get("tomorrowColor") as string),
      tomorrowDarkColor: convertColorToHsl(formData.get("tomorrowDarkColor") as string),
      tomorrowLightColor: convertColorToHsl(formData.get("tomorrowLightColor") as string),
      outOfStockColor: convertColorToHsl(formData.get("outOfStockColor") as string),
      workingHoursIconColor: convertColorToHsl(formData.get("workingHoursIconColor") as string),
      contactsIconColor: convertColorToHsl(formData.get("contactsIconColor") as string),
      paymentDeliveryIconColor: convertColorToHsl(formData.get("paymentDeliveryIconColor") as string),
      headerStyle: formData.get("headerStyle") as string,
      bannerButtonText: formData.get("bannerButtonText") as string || "Смотреть каталог",
      bannerButtonLink: formData.get("bannerButtonLink") as string || "#categories",
      logoUrl: editLogoUrl,
      bannerImageUrl: editBannerImageUrl,
      // Cart banner settings
      showCartBanner: editVisualSettings.showCartBanner,
      cartBannerType: formData.get("cartBannerType") as string || "text",
      cartBannerImage: editCartBannerImage,
      cartBannerText: formData.get("cartBannerText") as string || "",
      cartBannerBgColor: formData.get("cartBannerBgColor") as string || "#f97316",
      cartBannerTextColor: formData.get("cartBannerTextColor") as string || "#ffffff",
      // Bottom banners settings
      showBottomBanners: editVisualSettings.showBottomBanners,
      bottomBanner1Url: editBottomBanner1Url,
      bottomBanner1Link: formData.get("bottomBanner1Link") as string || "",
      bottomBanner2Url: editBottomBanner2Url,
      bottomBanner2Link: formData.get("bottomBanner2Link") as string || "",
      modernBlock1Icon: formData.get("modernBlock1Icon") as string || "",
      modernBlock1Text: formData.get("modernBlock1Text") as string || "",
      modernBlock2Icon: formData.get("modernBlock2Icon") as string || "",
      modernBlock2Text: formData.get("modernBlock2Text") as string || "",
      modernBlock3Icon: formData.get("modernBlock3Icon") as string || "",
      modernBlock3Text: formData.get("modernBlock3Text") as string || "",
      // Visual display settings - use current React state instead of form data
      showBannerImage: editVisualSettings.showBannerImage,
      showTitleDescription: editVisualSettings.showTitleDescription,
      showInfoBlocks: editVisualSettings.showInfoBlocks,
      infoBlocksPosition: editVisualSettings.infoBlocksPosition,
      showSpecialOffers: editVisualSettings.showSpecialOffers,
      showCategoryMenu: editVisualSettings.showCategoryMenu,
      showWhatsAppChat: editVisualSettings.showWhatsAppChat,
      whatsappPhone: formData.get("whatsappPhone") as string || "",
      whatsappMessage: formData.get("whatsappMessage") as string || "Здравствуйте! У меня есть вопрос по заказу.",
      whiteColor: convertColorToHsl(formData.get("whiteColor") as string),
      gray50Color: convertColorToHsl(formData.get("gray50Color") as string),
      gray100Color: convertColorToHsl(formData.get("gray100Color") as string),
      gray200Color: convertColorToHsl(formData.get("gray200Color") as string),
      gray300Color: convertColorToHsl(formData.get("gray300Color") as string),
      gray400Color: convertColorToHsl(formData.get("gray400Color") as string),
      gray500Color: convertColorToHsl(formData.get("gray500Color") as string),
      gray600Color: convertColorToHsl(formData.get("gray600Color") as string),
      gray700Color: convertColorToHsl(formData.get("gray700Color") as string),
      gray800Color: convertColorToHsl(formData.get("gray800Color") as string),
      gray900Color: convertColorToHsl(formData.get("gray900Color") as string),
      fontFamilyPrimary: formData.get("fontFamilyPrimary") as string,
      fontFamilySecondary: formData.get("fontFamilySecondary") as string,
      primaryShadow: formData.get("primaryShadow") as string,
      successShadow: formData.get("successShadow") as string,
      warningShadow: formData.get("warningShadow") as string,
      errorShadow: formData.get("errorShadow") as string,
      infoShadow: formData.get("infoShadow") as string,
      tomorrowShadow: formData.get("tomorrowShadow") as string || "0 4px 14px 0 rgba(147, 51, 234, 0.3)",
      grayShadow: formData.get("grayShadow") as string,
    };

    updateThemeMutation.mutate({ id: themeId, ...themeData });
  };

  const handleResetToDefault = (themeId: string) => {
    const defaultColors = {
      primaryColor: "hsl(24.6, 95%, 53.1%)",
      primaryTextColor: "hsl(0, 0%, 100%)",
      primaryDarkColor: "hsl(20.5, 90%, 48%)",
      primaryLightColor: "hsl(24.6, 95%, 96%)",
      secondaryColor: "hsl(210, 40%, 98%)",
      accentColor: "hsl(210, 40%, 85%)",
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
      workingHoursIconColor: "hsl(220, 91%, 54%)",
      contactsIconColor: "hsl(142, 76%, 36%)",
      paymentDeliveryIconColor: "hsl(262, 83%, 58%)",
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
      gray900Color: "hsl(222, 84%, 5%)",
      fontFamilyPrimary: "system-ui, -apple-system, sans-serif",
      fontFamilySecondary: "Georgia, serif",
      primaryShadow: "0 4px 14px 0 rgba(251, 146, 60, 0.3)",
      successShadow: "0 4px 14px 0 rgba(34, 197, 94, 0.3)",
      warningShadow: "0 4px 14px 0 rgba(251, 191, 36, 0.3)",
      errorShadow: "0 4px 14px 0 rgba(239, 68, 68, 0.3)",
      infoShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
      tomorrowShadow: "0 4px 14px 0 rgba(147, 51, 234, 0.3)",
      grayShadow: "0 4px 14px 0 rgba(107, 114, 128, 0.3)"
    };

    updateThemeMutation.mutate({ id: themeId, ...defaultColors });
  };

  const ColorInput = ({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) => {
    const hexValue = hslToHex(defaultValue);
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            id={name + "_color"}
            defaultValue={hexValue}
            className="w-16 h-10 rounded cursor-pointer"
            onChange={(e) => {
              // Update the text input when color picker changes
              const textInput = e.target.parentElement?.querySelector('input[type="text"]') as HTMLInputElement;
              if (textInput) {
                textInput.value = e.target.value;
              }
            }}
          />
          <Input
            type="text"
            name={name}
            defaultValue={hexValue}
            className="flex-1"
            placeholder="#ff6600"
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{adminT("themes.title")}</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>{adminT("loading")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTheme = themes?.find(theme => theme.isActive);
  const inactiveThemes = themes?.filter(theme => !theme.isActive) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            {adminT("themes.title")}
          </h2>
          <p className="text-muted-foreground">
            {adminT("themes.description")}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {adminT("themes.createTheme")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{adminT("themes.createNew")}</DialogTitle>
              <DialogDescription>
                {adminT("themes.createDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateTheme(formData);
            }}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="flex w-full">
                  <TabsTrigger value="basic" className="flex items-center gap-1 flex-1" title="Основное">
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">Основное</span>
                  </TabsTrigger>
                  <TabsTrigger value="colors" className="flex items-center gap-1 flex-1" title="Цвета">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Цвета</span>
                  </TabsTrigger>
                  <TabsTrigger value="visuals" className="flex items-center gap-1 flex-1" title="Визуалы">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Визуалы</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Название темы</Label>
                      <Input id="name" name="name" placeholder="Моя тема" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Описание</Label>
                      <Textarea id="description" name="description" placeholder="Описание темы..." />
                    </div>
                    
                    {/* Изображения */}
                    <div className="space-y-6">
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Upload className="h-4 w-4" />
                          Логотип магазина
                        </Label>
                        <ImageUpload
                          value={createLogoUrl}
                          onChange={(url) => {
                            setCreateLogoUrl(url);
                          }}
                        />
                        <input type="hidden" name="logoUrl" value={createLogoUrl} />
                        <div className="text-xs text-gray-500 mt-2">
                          Логотип для отображения в шапке сайта
                        </div>
                      </div>
                      
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Upload className="h-4 w-4" />
                          Картинка баннера
                        </Label>
                        <ImageUpload
                          value={createBannerImageUrl}
                          onChange={(url) => {
                            setCreateBannerImageUrl(url);
                          }}
                        />
                        <input type="hidden" name="bannerImageUrl" value={createBannerImageUrl} />
                        <div className="text-xs text-gray-500 mt-2">
                          Фоновое изображение для баннера на главной странице
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fontFamilyPrimary">Основной шрифт</Label>
                        <Input id="fontFamilyPrimary" name="fontFamilyPrimary" defaultValue="Poppins, sans-serif" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fontFamilySecondary">Вторичный шрифт</Label>
                        <Input id="fontFamilySecondary" name="fontFamilySecondary" defaultValue="Inter, sans-serif" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="headerStyleCreate">Стиль шапки сайта</Label>
                      <select
                        name="headerStyle"
                        id="headerStyleCreate"
                        defaultValue="classic"
                        className="w-full px-3 py-2 border rounded-md bg-white"
                        onChange={(e) => {
                          const headerControls = document.getElementById('headerControlsCreate');
                          const modernControls = document.getElementById('modernControlsCreate');
                          if (headerControls) {
                            headerControls.style.display = e.target.value === 'minimal' ? 'block' : 'none';
                          }
                          if (modernControls) {
                            modernControls.style.display = e.target.value === 'modern' ? 'block' : 'none';
                          }
                        }}
                      >
                        <option value="classic">{adminT("themes.classic")}</option>
                        <option value="modern">{adminT("themes.modern")}</option>
                        <option value="minimal">{adminT("themes.minimal")}</option>
                      </select>
                      <div className="text-sm text-gray-500">
                        {adminT("themes.headerStyleDescription")}
                      </div>
                    </div>
                    
                    <div id="headerControlsCreate" className="space-y-4" style={{ display: 'none' }}>
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">{adminT("themes.minimalButtonSettings")}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bannerButtonTextCreate">{adminT("themes.buttonText")}</Label>
                            <input
                              type="text"
                              name="bannerButtonText"
                              id="bannerButtonTextCreate"
                              defaultValue="Смотреть каталог"
                              placeholder="Смотреть каталог"
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500">
                              {adminT("themes.buttonTextDescription")}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="bannerButtonLinkCreate">{adminT("themes.buttonLink")}</Label>
                            <input
                              type="text"
                              name="bannerButtonLink"
                              id="bannerButtonLinkCreate"
                              defaultValue="#categories"
                              placeholder="#categories"
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500">
                              {adminT("themes.buttonLinkDescription")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <ModernStyleSettings id="modernControlsCreate" />
                  </div>
                </TabsContent>

                <TabsContent value="colors" className="space-y-6">
                  {/* Brand */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">{adminT("themes.brandColors")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ColorInput label={adminT("colorLabels.primaryColor")} name="primaryColor" defaultValue="#ff6600" />
                      <ColorInput label={adminT("colorLabels.primaryTextColor")} name="primaryTextColor" defaultValue="#ffffff" />
                      <ColorInput label={adminT("colorLabels.primaryDarkColor")} name="primaryDarkColor" defaultValue="#e55a00" />
                      <ColorInput label={adminT("colorLabels.primaryLightColor")} name="primaryLightColor" defaultValue="#fff3f0" />
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      ℹ️ {adminT("themes.brandColorsDescription")}
                    </div>
                    {/* Keep secondary/accent for API compatibility but hide from UI */}
                    <input type="hidden" name="secondaryColor" defaultValue="#f8fafc" />
                    <input type="hidden" name="accentColor" defaultValue="#e2e8f0" />
                  </div>

                  {/* Status */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">{adminT("themes.statusColors")}</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium mb-2">{adminT("statusLabels.mainStatusColors")}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorInput label={adminT("colorLabels.successColor")} name="successColor" defaultValue="#22c55e" />
                          <ColorInput label={adminT("colorLabels.warningColor")} name="warningColor" defaultValue="#f59e0b" />
                          <ColorInput label={adminT("colorLabels.errorColor")} name="errorColor" defaultValue="#ef4444" />
                          <ColorInput label={adminT("colorLabels.infoColor")} name="infoColor" defaultValue="#3b82f6" />
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          ℹ️ {adminT("themes.statusColorsDescription")}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium mb-2">{adminT("themes.specialButtons")}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorInput label={adminT("colorLabels.tomorrowColor")} name="tomorrowColor" defaultValue="#a855f7" />
                          <ColorInput label={adminT("colorLabels.tomorrowDarkColor")} name="tomorrowDarkColor" defaultValue="#9333ea" />
                          <ColorInput label={adminT("colorLabels.outOfStockColor")} name="outOfStockColor" defaultValue="#ef4444" />
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          ℹ️ {adminT("statusLabels.specialButtonsDescription")}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium mb-2">{adminT("statusLabels.iconColors")}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <ColorInput label={adminT("colorLabels.workingHoursIconColor")} name="workingHoursIconColor" defaultValue="#3b82f6" />
                          <ColorInput label={adminT("colorLabels.contactsIconColor")} name="contactsIconColor" defaultValue="#22c55e" />
                          <ColorInput label={adminT("colorLabels.paymentDeliveryIconColor")} name="paymentDeliveryIconColor" defaultValue="#a855f7" />
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          ℹ️ {adminT("statusLabels.iconColorsDescription")}
                        </div>
                      </div>
                    </div>
                    
                    {/* Keep light variants for API compatibility but hide from UI */}
                    <input type="hidden" name="successLightColor" defaultValue="#f0fdf4" />
                    <input type="hidden" name="warningLightColor" defaultValue="#fffbeb" />
                    <input type="hidden" name="errorLightColor" defaultValue="#fef2f2" />
                    <input type="hidden" name="infoLightColor" defaultValue="#eff6ff" />
                    <input type="hidden" name="tomorrowLightColor" defaultValue="#faf5ff" />
                  </div>

                  {/* Neutral */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">{adminT("themes.neutralColors")}</h4>
                    <div>
                      <h5 className="text-sm font-medium mb-2">{adminT("neutralLabels.mainNeutralColors")}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ColorInput label={adminT("neutralLabels.white")} name="whiteColor" defaultValue="#ffffff" />
                        <ColorInput label={adminT("neutralLabels.gray100")} name="gray100Color" defaultValue="#f1f5f9" />
                        <ColorInput label={adminT("neutralLabels.gray700")} name="gray700Color" defaultValue="#334155" />
                        <ColorInput label={adminT("neutralLabels.gray900")} name="gray900Color" defaultValue="#0f172a" />
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        ℹ️ {adminT("themes.neutralColorsDescription")}
                      </div>
                    </div>
                    
                    {/* Keep all gray variants for API compatibility but hide unused ones from UI */}
                    <input type="hidden" name="gray50Color" defaultValue="#f8fafc" />
                    <input type="hidden" name="gray200Color" defaultValue="#e2e8f0" />
                    <input type="hidden" name="gray300Color" defaultValue="#cbd5e1" />
                    <input type="hidden" name="gray400Color" defaultValue="#94a3b8" />
                    <input type="hidden" name="gray500Color" defaultValue="#64748b" />
                    <input type="hidden" name="gray600Color" defaultValue="#475569" />
                    <input type="hidden" name="gray800Color" defaultValue="#1e293b" />
                  </div>
                </TabsContent>

                <TabsContent value="visuals" className="space-y-6">
                  {/* Main Display Elements */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">{adminT("visualLabels.mainInterfaceElements")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <VisualToggleButton 
                        isEnabled={visualSettings.showBannerImage}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showBannerImage: !prev.showBannerImage }))}
                        label={adminT("visualLabels.showBanner")}
                        description={adminT("visualLabels.showBannerDescription")}
                        fieldName="showBannerImage"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showTitleDescription}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showTitleDescription: !prev.showTitleDescription }))}
                        label={adminT("visualLabels.titleDescription")}
                        description={adminT("visualLabels.titleDescriptionDesc")}
                        fieldName="showTitleDescription"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showInfoBlocks}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showInfoBlocks: !prev.showInfoBlocks }))}
                        label={adminT("visualLabels.infoBlocks")}
                        description={adminT("visualLabels.infoBlocksDescription")}
                        fieldName="showInfoBlocks"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showCategoryMenu}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showCategoryMenu: !prev.showCategoryMenu }))}
                        label={adminT("visualLabels.categoryMenu")}
                        description={adminT("visualLabels.categoryMenuDescription")}
                        fieldName="showCategoryMenu"
                      />
                    </div>
                    
                    {/* Info Blocks Position - shows only if info blocks are enabled */}
                    {visualSettings.showInfoBlocks && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="infoBlocksPositionCreate" className="text-sm font-medium">{adminT("visualLabels.infoBlocksPosition")}</Label>
                        <select
                          name="infoBlocksPosition"
                          id="infoBlocksPositionCreate"
                          value={visualSettings.infoBlocksPosition}
                          onChange={(e) => setVisualSettings(prev => ({ ...prev, infoBlocksPosition: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                        >
                          <option value="top">{adminT("visualLabels.beforeCategories")}</option>
                          <option value="bottom">{adminT("visualLabels.afterCategories")}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Additional Features */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">{adminT("visualLabels.additionalFeatures")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <VisualToggleButton 
                        isEnabled={visualSettings.showSpecialOffers}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showSpecialOffers: !prev.showSpecialOffers }))}
                        label={adminT("visualLabels.specialOffers")}
                        description={adminT("visualLabels.specialOffersDescription")}
                        fieldName="showSpecialOffers"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showWhatsAppChat}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showWhatsAppChat: !prev.showWhatsAppChat }))}
                        label={adminT("visualLabels.whatsappChat")}
                        description={adminT("visualLabels.whatsappChatDescription")}
                        fieldName="showWhatsAppChat"
                      />
                    </div>

                    {/* WhatsApp Settings */}
                    {visualSettings.showWhatsAppChat && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                        <h5 className="text-sm font-medium text-gray-800">{adminT("visualLabels.whatsappSettings")}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="whatsappPhoneCreate" className="text-sm">{adminT("visualLabels.phoneNumber")}</Label>
                            <input
                              type="text"
                              name="whatsappPhone"
                              id="whatsappPhoneCreate"
                              defaultValue=""
                              placeholder={adminT("visualLabels.phoneNumberPlaceholder")}
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {adminT("visualLabels.phoneFormat")}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="whatsappMessageCreate" className="text-sm">{adminT("visualLabels.defaultMessage")}</Label>
                            <textarea
                              name="whatsappMessage"
                              id="whatsappMessageCreate"
                              defaultValue={adminT("visualLabels.defaultMessageValue")}
                              placeholder={adminT("visualLabels.defaultMessagePlaceholder")}
                              rows={2}
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cart Banners */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">{adminT("visualLabels.cartBanner")}</h4>
                    <div className="space-y-4">
                      <VisualToggleButton 
                        isEnabled={visualSettings.showCartBanner}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showCartBanner: !prev.showCartBanner }))}
                        label={adminT("visualLabels.showCartBanner")}
                        description={adminT("visualLabels.showCartBannerDescription")}
                        fieldName="showCartBanner"
                      />

                      {visualSettings.showCartBanner && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                          <h5 className="text-sm font-medium text-gray-800">{adminT("visualLabels.cartBannerSettings")}</h5>
                          
                          <div>
                            <Label htmlFor="cartBannerTypeCreate" className="text-sm">{adminT("visualLabels.bannerType")}</Label>
                            <select
                              name="cartBannerType"
                              id="cartBannerTypeCreate"
                              value={createCartBannerType}
                              onChange={(e) => setCreateCartBannerType(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            >
                              <option value="text">{adminT("visualLabels.textBanner")}</option>
                              <option value="image">{adminT("visualLabels.imageBanner")}</option>
                            </select>
                          </div>

                          {createCartBannerType === 'text' && (
                            <>
                              <div>
                                <Label htmlFor="cartBannerTextCreate" className="text-sm">{adminT("visualLabels.bannerText")}</Label>
                                <input
                                  type="text"
                                  name="cartBannerText"
                                  id="cartBannerTextCreate"
                                  defaultValue=""
                                  placeholder={adminT("visualLabels.bannerTextPlaceholder")}
                                  className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="cartBannerBgColorCreate" className="text-sm">{adminT("visualLabels.backgroundColor")}</Label>
                                  <Input
                                    type="color"
                                    name="cartBannerBgColor"
                                    id="cartBannerBgColorCreate"
                                    defaultValue="#f97316"
                                    className="w-full h-10"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="cartBannerTextColorCreate" className="text-sm">{adminT("visualLabels.textColor")}</Label>
                                  <Input
                                    type="color"
                                    name="cartBannerTextColor"
                                    id="cartBannerTextColorCreate"
                                    defaultValue="#ffffff"
                                    className="w-full h-10"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {createCartBannerType === 'image' && (
                            <div>
                              <Label htmlFor="cartBannerImageCreate" className="text-sm font-medium">{adminT("visualLabels.bannerImage")}</Label>
                              <ImageUpload
                                value={createCartBannerImage}
                                onChange={(url: string) => {
                                  setCreateCartBannerImage(url);
                                }}
                              />
                              <input type="hidden" name="cartBannerImage" value={createCartBannerImage} />
                              <div className="text-xs text-gray-500 mt-1">
                                {adminT("visualLabels.recommendedSize")}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Banners */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">{adminT("visualLabels.bottomBanners")}</h4>
                    <div className="space-y-4">
                      <VisualToggleButton 
                        isEnabled={visualSettings.showBottomBanners}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showBottomBanners: !prev.showBottomBanners }))}
                        label={adminT("visualLabels.showBottomBanners")}
                        description={adminT("visualLabels.showBottomBannersDescription")}
                        fieldName="showBottomBanners"
                      />

                      {visualSettings.showBottomBanners && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                          <h5 className="text-sm font-medium text-gray-800">{adminT("visualLabels.bottomBannerSettings")}</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Banner */}
                            <div className="space-y-3">
                              <h6 className="text-sm font-medium text-gray-700">{adminT("visualLabels.firstBanner")}</h6>
                              <div>
                                <Label htmlFor="bottomBanner1UrlCreate" className="text-sm">{adminT("visualLabels.bannerImage")}</Label>
                                <ImageUpload
                                  value={createBottomBanner1Url}
                                  onChange={(url: string) => {
                                    setCreateBottomBanner1Url(url);
                                  }}
                                />
                                <input type="hidden" name="bottomBanner1Url" value={createBottomBanner1Url} />
                              </div>
                              <div>
                                <Label htmlFor="bottomBanner1LinkCreate" className="text-sm">{adminT("visualLabels.link")}</Label>
                                <input
                                  type="url"
                                  name="bottomBanner1Link"
                                  id="bottomBanner1LinkCreate"
                                  defaultValue=""
                                  placeholder={adminT("visualLabels.linkPlaceholder")}
                                  className="w-full px-3 py-2 border rounded-md bg-white text-sm mt-1"
                                />
                              </div>
                            </div>

                            {/* Second Banner */}
                            <div className="space-y-3">
                              <h6 className="text-sm font-medium text-gray-700">{adminT("visualLabels.secondBanner")}</h6>
                              <div>
                                <Label htmlFor="bottomBanner2UrlCreate" className="text-sm">{adminT("visualLabels.bannerImage")}</Label>
                                <ImageUpload
                                  value={createBottomBanner2Url}
                                  onChange={(url: string) => {
                                    setCreateBottomBanner2Url(url);
                                  }}
                                />
                                <input type="hidden" name="bottomBanner2Url" value={createBottomBanner2Url} />
                              </div>
                              <div>
                                <Label htmlFor="bottomBanner2LinkCreate" className="text-sm">{adminT("visualLabels.link")}</Label>
                                <input
                                  type="url"
                                  name="bottomBanner2Link"
                                  id="bottomBanner2LinkCreate"
                                  defaultValue=""
                                  placeholder={adminT("visualLabels.linkPlaceholder")}
                                  className="w-full px-3 py-2 border rounded-md bg-white text-sm mt-1"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Рекомендуемый размер изображений: 600x300 пикселей
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>


              </Tabs>

              {/* Hidden shadow inputs with defaults */}
              <input type="hidden" name="primaryShadow" defaultValue="0 4px 14px 0 rgba(255, 102, 0, 0.3)" />
              <input type="hidden" name="successShadow" defaultValue="0 4px 14px 0 rgba(34, 197, 94, 0.3)" />
              <input type="hidden" name="warningShadow" defaultValue="0 4px 14px 0 rgba(245, 158, 11, 0.3)" />
              <input type="hidden" name="errorShadow" defaultValue="0 4px 14px 0 rgba(239, 68, 68, 0.3)" />
              <input type="hidden" name="infoShadow" defaultValue="0 4px 14px 0 rgba(59, 130, 246, 0.3)" />
              <input type="hidden" name="grayShadow" defaultValue="0 4px 14px 0 rgba(107, 114, 128, 0.3)" />

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {adminT("cancel")}
                </Button>
                <Button type="submit" className="btn-primary" disabled={createThemeMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createThemeMutation.isPending ? adminT("creating") : adminT("themes.createTheme")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Themes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes?.map((theme) => (
          <Card key={theme.id} className={`relative ${theme.isActive ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{theme.name}</CardTitle>
                {theme.isActive && (
                  <Badge variant="default" className="bg-primary text-white">
                    Активная
                  </Badge>
                )}
              </div>
              <CardDescription>{theme.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Color Preview */}
              <div className="space-y-3">
                <div className="text-sm font-medium">Цветовая палитра:</div>
                <div className="grid grid-cols-6 gap-2">
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: theme.primaryColor }}
                    title="Основной"
                  />
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: theme.successColor }}
                    title="Успех"
                  />
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: theme.warningColor }}
                    title="Предупреждение"
                  />
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: theme.errorColor }}
                    title="Ошибка"
                  />
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: theme.infoColor }}
                    title="Информация"
                  />
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: theme.gray500Color }}
                    title="Нейтральный"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              {/* Actions */}
              <div className="flex gap-2">
                {!theme.isActive && (
                  <Button
                    size="sm"
                    className="btn-primary"
                    onClick={() => activateThemeMutation.mutate(theme.id)}
                    disabled={activateThemeMutation.isPending}
                    title="Активировать тему"
                  >
                    <Paintbrush className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingTheme(theme)}
                  title="Настроить тему"
                >
                  <Settings className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResetToDefault(theme.id)}
                  disabled={updateThemeMutation.isPending}
                  title="Сбросить все цвета к значениям по умолчанию"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                {!theme.isActive && !theme.id.includes('default_theme') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{adminT("themes.deleteTheme")}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {adminT("deleteConfirmation")} "{theme.name}" {adminT("deleteForever")}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{adminT("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteThemeMutation.mutate(theme.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {adminT("delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {themes?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{adminT("themes.noThemes")}</h3>
            <p className="text-muted-foreground mb-4">
              {adminT("themes.createFirstTheme")}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              {adminT("themes.createTheme")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Theme Dialog */}
      {editingTheme && (
        <Dialog open={!!editingTheme} onOpenChange={() => setEditingTheme(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{adminT("themes.editTheme")}: {editingTheme.name}</DialogTitle>
              <DialogDescription>
                {adminT("themes.createDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateTheme(formData, editingTheme.id);
            }}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="flex w-full">
                  <TabsTrigger value="basic" className="flex items-center gap-1 flex-1" title="Основное">
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">Основное</span>
                  </TabsTrigger>
                  <TabsTrigger value="colors" className="flex items-center gap-1 flex-1" title="Цвета">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Цвета</span>
                  </TabsTrigger>
                  <TabsTrigger value="visuals" className="flex items-center gap-1 flex-1" title="Визуалы">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Визуалы</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">{adminT("name")}</Label>
                      <Input id="edit-name" name="name" defaultValue={editingTheme.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">{adminT("description")}</Label>
                      <Textarea id="edit-description" name="description" defaultValue={editingTheme.description || ""} />
                    </div>
                    
                    {/* Изображения */}
                    <div className="space-y-6">
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Upload className="h-4 w-4" />
                          Логотип магазина
                        </Label>
                        <ImageUpload
                          value={editLogoUrl}
                          onChange={(url) => {
                            setEditLogoUrl(url);
                          }}
                        />
                        <input type="hidden" name="logoUrl" value={editLogoUrl} />
                        <div className="text-xs text-gray-500 mt-2">
                          Логотип для отображения в шапке сайта
                        </div>
                      </div>
                      
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Upload className="h-4 w-4" />
                          Картинка баннера
                        </Label>
                        <ImageUpload
                          value={editBannerImageUrl}
                          onChange={(url) => {
                            setEditBannerImageUrl(url);
                          }}
                        />
                        <input type="hidden" name="bannerImageUrl" value={editBannerImageUrl} />
                        <div className="text-xs text-gray-500 mt-2">
                          Фоновое изображение для баннера на главной странице
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="headerStyleEdit">Стиль шапки сайта</Label>
                      <select
                        name="headerStyle"
                        id="headerStyleEdit"
                        defaultValue={editingTheme.headerStyle || "classic"}
                        className="w-full px-3 py-2 border rounded-md bg-white"
                        onChange={(e) => {
                          const headerControls = document.getElementById('headerControlsEdit');
                          const modernControls = document.getElementById('modernControlsEdit');
                          if (headerControls) {
                            headerControls.style.display = e.target.value === 'minimal' ? 'block' : 'none';
                          }
                          if (modernControls) {
                            modernControls.style.display = e.target.value === 'modern' ? 'block' : 'none';
                          }
                        }}
                      >
                        <option value="classic">Классический (текущий дизайн)</option>
                        <option value="modern">Современный</option>
                        <option value="minimal">Минималистичный</option>
                      </select>
                      <div className="text-sm text-gray-500">
                        Влияет на отображение баннера и информационных блоков
                      </div>
                    </div>
                    
                    <div id="headerControlsEdit" className="space-y-4" style={{ display: editingTheme.headerStyle === 'minimal' ? 'block' : 'none' }}>
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <h4 className="text-sm font-medium mb-3">Настройки кнопки для минималистичного стиля</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bannerButtonTextEdit">Текст кнопки</Label>
                            <input
                              type="text"
                              name="bannerButtonText"
                              id="bannerButtonTextEdit"
                              defaultValue={editingTheme.bannerButtonText || "Смотреть каталог"}
                              placeholder="Смотреть каталог"
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500">
                              Текст, который будет отображаться на кнопке
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="bannerButtonLinkEdit">Ссылка кнопки</Label>
                            <input
                              type="text"
                              name="bannerButtonLink"
                              id="bannerButtonLinkEdit"
                              defaultValue={editingTheme.bannerButtonLink || "#categories"}
                              placeholder="#categories"
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500">
                              Ссылка или якорь (#categories для блока категорий)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div id="modernControlsEdit" className="space-y-4" style={{ display: editingTheme.headerStyle === 'modern' ? 'block' : 'none' }}>
                      <ModernStyleSettings 
                        id="modernControlsEditInner" 
                        defaultValues={{
                          modernBlock1Icon: editingTheme.modernBlock1Icon,
                          modernBlock1Text: editingTheme.modernBlock1Text,
                          modernBlock2Icon: editingTheme.modernBlock2Icon,
                          modernBlock2Text: editingTheme.modernBlock2Text,
                          modernBlock3Icon: editingTheme.modernBlock3Icon,
                          modernBlock3Text: editingTheme.modernBlock3Text,
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="colors" className="space-y-6">
                  {/* Бренд */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Бренд</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ColorInput label="Основной цвет" name="primaryColor" defaultValue={editingTheme.primaryColor} />
                      <ColorInput label="Цвет текста кнопок" name="primaryTextColor" defaultValue={editingTheme.primaryTextColor} />
                      <ColorInput label="Основной темный" name="primaryDarkColor" defaultValue={editingTheme.primaryDarkColor} />
                      <ColorInput label="Основной светлый" name="primaryLightColor" defaultValue={editingTheme.primaryLightColor} />
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      ℹ️ Основные цвета влияют на кнопки "В корзину", ссылки и главные элементы интерфейса
                    </div>
                    {/* Keep secondary/accent for API compatibility but hide from UI */}
                    <input type="hidden" name="secondaryColor" defaultValue={editingTheme.secondaryColor} />
                    <input type="hidden" name="accentColor" defaultValue={editingTheme.accentColor} />
                  </div>

                  {/* Статусы */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Статусы</h4>
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium mb-2">Основные статусные цвета</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorInput label="Успех" name="successColor" defaultValue={editingTheme.successColor} />
                          <ColorInput label="Предупреждение" name="warningColor" defaultValue={editingTheme.warningColor} />
                          <ColorInput label="Ошибка" name="errorColor" defaultValue={editingTheme.errorColor} />
                          <ColorInput label="Информация" name="infoColor" defaultValue={editingTheme.infoColor} />
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          ℹ️ Используются в уведомлениях и статусных кнопках
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium mb-2">Специальные кнопки</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ColorInput label="Кнопка 'Завтра'" name="tomorrowColor" defaultValue={editingTheme.tomorrowColor} />
                          <ColorInput label="Кнопка 'Завтра' (при наведении)" name="tomorrowDarkColor" defaultValue={editingTheme.tomorrowDarkColor} />
                          <ColorInput label="Цвет 'Закончился'" name="outOfStockColor" defaultValue={editingTheme.outOfStockColor} />
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          ℹ️ "Завтра" - для недоступных сегодня товаров, "Закончился" - для бейджей
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium mb-2">Иконки информационных блоков</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <ColorInput label="Часы работы" name="workingHoursIconColor" defaultValue={editingTheme.workingHoursIconColor} />
                          <ColorInput label="Контакты" name="contactsIconColor" defaultValue={editingTheme.contactsIconColor} />
                          <ColorInput label="Оплата и доставка" name="paymentDeliveryIconColor" defaultValue={editingTheme.paymentDeliveryIconColor} />
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          ℹ️ Цвета круглых иконок в блоках "Часы работы", "Контакты" и "Оплата и доставка" на главной странице
                        </div>
                      </div>
                    </div>
                    
                    {/* Keep light variants for API compatibility but hide from UI */}
                    <input type="hidden" name="successLightColor" defaultValue={editingTheme.successLightColor} />
                    <input type="hidden" name="warningLightColor" defaultValue={editingTheme.warningLightColor} />
                    <input type="hidden" name="errorLightColor" defaultValue={editingTheme.errorLightColor} />
                    <input type="hidden" name="infoLightColor" defaultValue={editingTheme.infoLightColor} />
                    <input type="hidden" name="tomorrowLightColor" defaultValue={editingTheme.tomorrowLightColor} />
                  </div>

                  {/* Нейтральные */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Нейтральные</h4>
                    <div>
                      <h5 className="text-sm font-medium mb-2">Основные нейтральные цвета</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ColorInput label="Белый" name="whiteColor" defaultValue={editingTheme.whiteColor} />
                        <ColorInput label="Серый 100 (фон)" name="gray100Color" defaultValue={editingTheme.gray100Color} />
                        <ColorInput label="Серый 700 (текст)" name="gray700Color" defaultValue={editingTheme.gray700Color} />
                        <ColorInput label="Серый 900 (заголовки)" name="gray900Color" defaultValue={editingTheme.gray900Color} />
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        ℹ️ Нейтральные цвета для фонов, текста и базовых элементов интерфейса
                      </div>
                    </div>
                    
                    {/* Keep all gray variants for API compatibility but hide unused ones from UI */}
                    <input type="hidden" name="gray50Color" defaultValue={editingTheme.gray50Color} />
                    <input type="hidden" name="gray200Color" defaultValue={editingTheme.gray200Color} />
                    <input type="hidden" name="gray300Color" defaultValue={editingTheme.gray300Color} />
                    <input type="hidden" name="gray400Color" defaultValue={editingTheme.gray400Color} />
                    <input type="hidden" name="gray500Color" defaultValue={editingTheme.gray500Color} />
                    <input type="hidden" name="gray600Color" defaultValue={editingTheme.gray600Color} />
                    <input type="hidden" name="gray800Color" defaultValue={editingTheme.gray800Color} />
                  </div>
                </TabsContent>

                <TabsContent value="visuals" className="space-y-6">
                  {/* Основные элементы отображения */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Основные элементы интерфейса</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showBannerImage}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showBannerImage: !prev.showBannerImage }))}
                        label="Показывать баннер"
                        description="Главное изображение в шапке сайта"
                        fieldName="showBannerImage"
                      />

                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showTitleDescription}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showTitleDescription: !prev.showTitleDescription }))}
                        label="Заголовок и описание"
                        description="Текстовая информация о магазине"
                        fieldName="showTitleDescription"
                      />

                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showCategoryMenu}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showCategoryMenu: !prev.showCategoryMenu }))}
                        label="Меню категорий"
                        description="Навигационное меню категорий"
                        fieldName="showCategoryMenu"
                      />

                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showInfoBlocks}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showInfoBlocks: !prev.showInfoBlocks }))}
                        label="Информационные блоки"
                        description="Часы работы, контакты, доставка"
                        fieldName="showInfoBlocks"
                      />
                    </div>
                    
                    {/* Позиция информационных блоков - показывается только если включены инфо блоки */}
                    {editVisualSettings.showInfoBlocks && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="infoBlocksPositionEdit" className="text-sm font-medium">Позиция информационных блоков</Label>
                        <select
                          name="infoBlocksPosition"
                          id="infoBlocksPositionEdit"
                          value={editVisualSettings.infoBlocksPosition}
                          onChange={(e) => setEditVisualSettings(prev => ({ ...prev, infoBlocksPosition: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                        >
                          <option value="top">Сверху от товаров</option>
                          <option value="bottom">Снизу от товаров</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Дополнительные функции */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Дополнительные функции</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showSpecialOffers}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showSpecialOffers: !prev.showSpecialOffers }))}
                        label="Особые предложения"
                        description="Блок с особыми предложениями"
                        fieldName="showSpecialOffers"
                      />

                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showWhatsAppChat}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showWhatsAppChat: !prev.showWhatsAppChat }))}
                        label="WhatsApp чат"
                        description="Кнопка связи через WhatsApp"
                        fieldName="showWhatsAppChat"
                      />
                    </div>

                    {/* WhatsApp настройки */}
                    {editVisualSettings.showWhatsAppChat && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                        <h5 className="text-sm font-medium text-gray-800">Настройки WhatsApp</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="whatsappPhone" className="text-sm">Номер телефона</Label>
                            <input
                              type="text"
                              name="whatsappPhone"
                              id="whatsappPhone"
                              defaultValue={editingTheme?.whatsappPhone || ""}
                              placeholder="+972501234567"
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Формат: +код_страны номер (например, +972501234567)
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="whatsappMessage" className="text-sm">Сообщение по умолчанию</Label>
                            <textarea
                              name="whatsappMessage"
                              id="whatsappMessage"
                              defaultValue={editingTheme?.whatsappMessage || "Здравствуйте! У меня есть вопрос по заказу."}
                              placeholder="Здравствуйте! У меня есть вопрос по заказу."
                              rows={2}
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Баннеры корзины */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Баннер в корзине</h4>
                    <div className="space-y-4">
                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showCartBanner}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showCartBanner: !prev.showCartBanner }))}
                        label="Показывать баннер в корзине"
                        description="Рекламный баннер для привлечения внимания"
                        fieldName="showCartBanner"
                      />

                      {editVisualSettings.showCartBanner && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                          <h5 className="text-sm font-medium text-gray-800">Настройки баннера корзины</h5>
                          
                          <div>
                            <Label htmlFor="cartBannerType" className="text-sm">Тип баннера</Label>
                            <select
                              name="cartBannerType"
                              id="cartBannerType"
                              value={editCartBannerType}
                              onChange={(e) => setEditCartBannerType(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            >
                              <option value="text">Текстовый</option>
                              <option value="image">Изображение</option>
                            </select>
                          </div>

                          {editCartBannerType === 'text' && (
                            <>
                              <div>
                                <Label htmlFor="cartBannerText" className="text-sm">Текст баннера</Label>
                                <input
                                  type="text"
                                  name="cartBannerText"
                                  id="cartBannerText"
                                  defaultValue={editingTheme?.cartBannerText || ""}
                                  placeholder="Специальное предложение!"
                                  className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="cartBannerBgColor" className="text-sm">Цвет фона</Label>
                                  <Input
                                    type="color"
                                    name="cartBannerBgColor"
                                    id="cartBannerBgColor"
                                    defaultValue={editingTheme?.cartBannerBgColor || "#f97316"}
                                    className="w-full h-10"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="cartBannerTextColor" className="text-sm">Цвет текста</Label>
                                  <Input
                                    type="color"
                                    name="cartBannerTextColor"
                                    id="cartBannerTextColor"
                                    defaultValue={editingTheme?.cartBannerTextColor || "#ffffff"}
                                    className="w-full h-10"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {editCartBannerType === 'image' && (
                            <div>
                              <Label htmlFor="cartBannerImage" className="text-sm font-medium">Изображение баннера</Label>
                              <ImageUpload
                                value={editCartBannerImage}
                                onChange={(url: string) => {
                                  setEditCartBannerImage(url);
                                }}
                              />
                              <input type="hidden" name="cartBannerImage" value={editCartBannerImage} />
                              <div className="text-xs text-gray-500 mt-1">
                                Рекомендуемый размер: 800x200 пикселей
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Нижние баннеры */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Нижние баннеры</h4>
                    <div className="space-y-4">
                      <VisualToggleButton 
                        isEnabled={editVisualSettings.showBottomBanners}
                        onToggle={() => setEditVisualSettings(prev => ({ ...prev, showBottomBanners: !prev.showBottomBanners }))}
                        label="Показывать нижние баннеры"
                        description="Рекламные баннеры внизу страницы"
                        fieldName="showBottomBanners"
                      />

                      {editVisualSettings.showBottomBanners && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                          <h5 className="text-sm font-medium text-gray-800">Настройки нижних баннеров</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Первый баннер */}
                            <div className="space-y-3">
                              <h6 className="text-sm font-medium text-gray-700">Первый баннер</h6>
                              <div>
                                <Label htmlFor="bottomBanner1Url" className="text-sm">Изображение</Label>
                                <ImageUpload
                                  value={editBottomBanner1Url}
                                  onChange={(url: string) => {
                                    setEditBottomBanner1Url(url);
                                  }}
                                />
                                <input type="hidden" name="bottomBanner1Url" value={editBottomBanner1Url} />
                              </div>
                              <div>
                                <Label htmlFor="bottomBanner1Link" className="text-sm">Ссылка</Label>
                                <input
                                  type="url"
                                  name="bottomBanner1Link"
                                  id="bottomBanner1Link"
                                  defaultValue={editingTheme?.bottomBanner1Link || ""}
                                  placeholder="https://example.com"
                                  className="w-full px-3 py-2 border rounded-md bg-white text-sm mt-1"
                                />
                              </div>
                            </div>

                            {/* Второй баннер */}
                            <div className="space-y-3">
                              <h6 className="text-sm font-medium text-gray-700">Второй баннер</h6>
                              <div>
                                <Label htmlFor="bottomBanner2Url" className="text-sm">Изображение</Label>
                                <ImageUpload
                                  value={editBottomBanner2Url}
                                  onChange={(url: string) => {
                                    setEditBottomBanner2Url(url);
                                  }}
                                />
                                <input type="hidden" name="bottomBanner2Url" value={editBottomBanner2Url} />
                              </div>
                              <div>
                                <Label htmlFor="bottomBanner2Link" className="text-sm">Ссылка</Label>
                                <input
                                  type="url"
                                  name="bottomBanner2Link"
                                  id="bottomBanner2Link"
                                  defaultValue={editingTheme?.bottomBanner2Link || ""}
                                  placeholder="https://example.com"
                                  className="w-full px-3 py-2 border rounded-md bg-white text-sm mt-1"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Рекомендуемый размер изображений: 600x300 пикселей
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>


              </Tabs>

              {/* Hidden inputs to ensure all theme data is submitted */}
              <input type="hidden" name="fontFamilyPrimary" defaultValue="Poppins, sans-serif" />
              <input type="hidden" name="fontFamilySecondary" defaultValue="Inter, sans-serif" />
              <input type="hidden" name="primaryShadow" defaultValue="0 4px 14px 0 rgba(255, 102, 0, 0.3)" />
              <input type="hidden" name="successShadow" defaultValue="0 4px 14px 0 rgba(34, 197, 94, 0.3)" />
              <input type="hidden" name="warningShadow" defaultValue="0 4px 14px 0 rgba(245, 158, 11, 0.3)" />
              <input type="hidden" name="errorShadow" defaultValue="0 4px 14px 0 rgba(239, 68, 68, 0.3)" />
              <input type="hidden" name="infoShadow" defaultValue="0 4px 14px 0 rgba(59, 130, 246, 0.3)" />
              <input type="hidden" name="grayShadow" defaultValue="0 4px 14px 0 rgba(107, 114, 128, 0.3)" />
              <input type="hidden" name="tomorrowShadow" defaultValue="0 4px 14px 0 rgba(147, 51, 234, 0.3)" />
              
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingTheme(null)}>
                  Отмена
                </Button>
                <Button type="submit" className="btn-primary">
                  Сохранить изменения
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}