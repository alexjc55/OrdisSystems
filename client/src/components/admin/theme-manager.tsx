import { useState } from "react";
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
import { Palette, Eye, Trash2, Plus, Save, Paintbrush, Settings, RotateCcw } from "lucide-react";
import { applyTheme, defaultTheme, type Theme } from "@/lib/theme-system";

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
  tomorrowLightColor: string;
  outOfStockColor: string;
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
}

export default function ThemeManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeData | null>(null);
  const [previewTheme, setPreviewTheme] = useState<ThemeData | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = useQuery<ThemeData[]>({
    queryKey: ["/api/admin/themes"],
  });

  const createThemeMutation = useMutation({
    mutationFn: async (themeData: Omit<ThemeData, "id" | "isActive">) => {
      const res = await apiRequest("POST", "/api/admin/themes", themeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/themes"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Успешно",
        description: "Тема создана успешно",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать тему",
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
      setEditingTheme(null);
      
      // Apply theme immediately if it's the active theme
      if (updatedTheme.isActive) {
        // Apply colors directly to CSS custom properties
        const root = document.documentElement;
        
        // Update primary colors which are most commonly used
        root.style.setProperty('--color-primary', updatedTheme.primaryColor);
        root.style.setProperty('--color-primary-dark', updatedTheme.primaryDarkColor);
        root.style.setProperty('--color-primary-light', updatedTheme.primaryLightColor);
        root.style.setProperty('--color-secondary', updatedTheme.secondaryColor);
        root.style.setProperty('--color-accent', updatedTheme.accentColor);
        
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
        
        const foregroundColor = isLightPrimary ? 'hsl(0, 0%, 0%)' : 'hsl(0, 0%, 100%)';
        root.style.setProperty('--color-primary-foreground', foregroundColor);
        
        // Update status colors
        root.style.setProperty('--color-success', updatedTheme.successColor);
        root.style.setProperty('--color-success-light', updatedTheme.successLightColor);
        root.style.setProperty('--color-warning', updatedTheme.warningColor);
        root.style.setProperty('--color-warning-light', updatedTheme.warningLightColor);
        root.style.setProperty('--color-error', updatedTheme.errorColor);
        root.style.setProperty('--color-error-light', updatedTheme.errorLightColor);
        root.style.setProperty('--color-info', updatedTheme.infoColor);
        root.style.setProperty('--color-info-light', updatedTheme.infoLightColor);
        
        // Update neutral colors
        root.style.setProperty('--color-white', updatedTheme.whiteColor);
        root.style.setProperty('--color-gray-50', updatedTheme.gray50Color);
        root.style.setProperty('--color-gray-100', updatedTheme.gray100Color);
        root.style.setProperty('--color-gray-200', updatedTheme.gray200Color);
        root.style.setProperty('--color-gray-300', updatedTheme.gray300Color);
        root.style.setProperty('--color-gray-400', updatedTheme.gray400Color);
        root.style.setProperty('--color-gray-500', updatedTheme.gray500Color);
        root.style.setProperty('--color-gray-600', updatedTheme.gray600Color);
        root.style.setProperty('--color-gray-700', updatedTheme.gray700Color);
        root.style.setProperty('--color-gray-800', updatedTheme.gray800Color);
        root.style.setProperty('--color-gray-900', updatedTheme.gray900Color);
        
        console.log('Applied theme colors to CSS variables');
      }
      
      toast({
        title: "Успешно",
        description: "Тема обновлена успешно",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить тему",
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
        title: "Успешно",
        description: "Тема активирована успешно",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось активировать тему",
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
        title: "Успешно",
        description: "Тема удалена успешно",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить тему",
        variant: "destructive",
      });
    },
  });

  const handleCreateTheme = (formData: FormData) => {
    const themeData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      primaryColor: formData.get("primaryColor") as string,
      primaryTextColor: formData.get("primaryTextColor") as string,
      primaryDarkColor: formData.get("primaryDarkColor") as string,
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
      tomorrowLightColor: formData.get("tomorrowLightColor") as string,
      outOfStockColor: formData.get("outOfStockColor") as string,
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
    const themeData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      primaryColor: formData.get("primaryColor") as string,
      primaryTextColor: formData.get("primaryTextColor") as string,
      primaryDarkColor: formData.get("primaryDarkColor") as string,
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
      tomorrowLightColor: formData.get("tomorrowLightColor") as string,
      outOfStockColor: formData.get("outOfStockColor") as string,
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
            defaultValue={defaultValue}
            className="flex-1"
            placeholder="hsl(24.6, 95%, 53.1%)"
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Управление темами</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Загрузка тем...</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            Управление темами
          </h2>
          <p className="text-muted-foreground">
            Управляйте цветовыми схемами и темами оформления сайта
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Создать тему
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создание новой темы</DialogTitle>
              <DialogDescription>
                Настройте цвета и параметры для новой темы оформления
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateTheme(formData);
            }}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Основное</TabsTrigger>
                  <TabsTrigger value="brand">Бренд</TabsTrigger>
                  <TabsTrigger value="status">Статусы</TabsTrigger>
                  <TabsTrigger value="neutral">Нейтральные</TabsTrigger>
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
                  </div>
                </TabsContent>

                <TabsContent value="brand" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput label="Основной цвет" name="primaryColor" defaultValue="#ff6600" />
                    <ColorInput label="Цвет текста кнопок" name="primaryTextColor" defaultValue="#ffffff" />
                    <ColorInput label="Основной (темный)" name="primaryDarkColor" defaultValue="#e55a00" />
                    <ColorInput label="Основной (светлый)" name="primaryLightColor" defaultValue="#fff3f0" />
                    <ColorInput label="Вторичный цвет" name="secondaryColor" defaultValue="#f8fafc" />
                    <ColorInput label="Акцентный цвет" name="accentColor" defaultValue="#e2e8f0" />
                  </div>
                </TabsContent>

                <TabsContent value="status" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput label="Успех" name="successColor" defaultValue="#22c55e" />
                    <ColorInput label="Успех (светлый)" name="successLightColor" defaultValue="#f0fdf4" />
                    <ColorInput label="Предупреждение" name="warningColor" defaultValue="#f59e0b" />
                    <ColorInput label="Предупреждение (светлый)" name="warningLightColor" defaultValue="#fffbeb" />
                    <ColorInput label="Ошибка" name="errorColor" defaultValue="#ef4444" />
                    <ColorInput label="Ошибка (светлый)" name="errorLightColor" defaultValue="#fef2f2" />
                    <ColorInput label="Информация" name="infoColor" defaultValue="#3b82f6" />
                    <ColorInput label="Информация (светлый)" name="infoLightColor" defaultValue="#eff6ff" />
                    <ColorInput label="Кнопка 'Завтра'" name="tomorrowColor" defaultValue="#a855f7" />
                    <ColorInput label="Кнопка 'Завтра' (светлый)" name="tomorrowLightColor" defaultValue="#faf5ff" />
                    <ColorInput label="Цвет 'Закончился'" name="outOfStockColor" defaultValue="#ef4444" />
                  </div>
                </TabsContent>

                <TabsContent value="neutral" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput label="Белый" name="whiteColor" defaultValue="#ffffff" />
                    <ColorInput label="Серый 50" name="gray50Color" defaultValue="#f8fafc" />
                    <ColorInput label="Серый 100" name="gray100Color" defaultValue="#f1f5f9" />
                    <ColorInput label="Серый 200" name="gray200Color" defaultValue="#e2e8f0" />
                    <ColorInput label="Серый 300" name="gray300Color" defaultValue="#cbd5e1" />
                    <ColorInput label="Серый 400" name="gray400Color" defaultValue="#94a3b8" />
                    <ColorInput label="Серый 500" name="gray500Color" defaultValue="#64748b" />
                    <ColorInput label="Серый 600" name="gray600Color" defaultValue="#475569" />
                    <ColorInput label="Серый 700" name="gray700Color" defaultValue="#334155" />
                    <ColorInput label="Серый 800" name="gray800Color" defaultValue="#1e293b" />
                    <ColorInput label="Серый 900" name="gray900Color" defaultValue="#0f172a" />
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
                  Отмена
                </Button>
                <Button type="submit" className="btn-primary" disabled={createThemeMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createThemeMutation.isPending ? "Создание..." : "Создать тему"}
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
                  >
                    <Paintbrush className="h-4 w-4 mr-1" />
                    Активировать
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingTheme(theme)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Настроить
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResetToDefault(theme.id)}
                  disabled={updateThemeMutation.isPending}
                  title="Сбросить все цвета к значениям по умолчанию"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Сброс
                </Button>

                {!theme.isActive && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить тему?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Тема "{theme.name}" будет удалена навсегда.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteThemeMutation.mutate(theme.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Удалить
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
            <h3 className="text-lg font-semibold mb-2">Нет тем</h3>
            <p className="text-muted-foreground mb-4">
              Создайте свою первую тему оформления для сайта
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Создать тему
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Theme Dialog */}
      {editingTheme && (
        <Dialog open={!!editingTheme} onOpenChange={() => setEditingTheme(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактирование темы: {editingTheme.name}</DialogTitle>
              <DialogDescription>
                Настройте цвета и параметры темы оформления
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateTheme(formData, editingTheme.id);
            }}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Основное</TabsTrigger>
                  <TabsTrigger value="brand">Бренд</TabsTrigger>
                  <TabsTrigger value="status">Статусы</TabsTrigger>
                  <TabsTrigger value="neutral">Нейтральные</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Название темы</Label>
                      <Input id="edit-name" name="name" defaultValue={editingTheme.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Описание</Label>
                      <Textarea id="edit-description" name="description" defaultValue={editingTheme.description || ""} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="brand" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput label="Основной цвет" name="primaryColor" defaultValue={editingTheme.primaryColor} />
                    <ColorInput label="Цвет текста кнопок" name="primaryTextColor" defaultValue={editingTheme.primaryTextColor} />
                    <ColorInput label="Основной темный" name="primaryDarkColor" defaultValue={editingTheme.primaryDarkColor} />
                    <ColorInput label="Основной светлый" name="primaryLightColor" defaultValue={editingTheme.primaryLightColor} />
                    <ColorInput label="Вторичный цвет" name="secondaryColor" defaultValue={editingTheme.secondaryColor} />
                    <ColorInput label="Акцентный цвет" name="accentColor" defaultValue={editingTheme.accentColor} />
                  </div>
                </TabsContent>

                <TabsContent value="status" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput label="Успех" name="successColor" defaultValue={editingTheme.successColor} />
                    <ColorInput label="Успех светлый" name="successLightColor" defaultValue={editingTheme.successLightColor} />
                    <ColorInput label="Предупреждение" name="warningColor" defaultValue={editingTheme.warningColor} />
                    <ColorInput label="Предупреждение светлое" name="warningLightColor" defaultValue={editingTheme.warningLightColor} />
                    <ColorInput label="Ошибка" name="errorColor" defaultValue={editingTheme.errorColor} />
                    <ColorInput label="Ошибка светлая" name="errorLightColor" defaultValue={editingTheme.errorLightColor} />
                    <ColorInput label="Информация" name="infoColor" defaultValue={editingTheme.infoColor} />
                    <ColorInput label="Информация светлая" name="infoLightColor" defaultValue={editingTheme.infoLightColor} />
                    <ColorInput label="Кнопка 'Завтра'" name="tomorrowColor" defaultValue={editingTheme.tomorrowColor} />
                    <ColorInput label="Кнопка 'Завтра' (светлый)" name="tomorrowLightColor" defaultValue={editingTheme.tomorrowLightColor} />
                    <ColorInput label="Цвет 'Закончился'" name="outOfStockColor" defaultValue={editingTheme.outOfStockColor} />
                  </div>
                </TabsContent>

                <TabsContent value="neutral" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput label="Белый" name="whiteColor" defaultValue={editingTheme.whiteColor} />
                    <ColorInput label="Серый 50" name="gray50Color" defaultValue={editingTheme.gray50Color} />
                    <ColorInput label="Серый 100" name="gray100Color" defaultValue={editingTheme.gray100Color} />
                    <ColorInput label="Серый 200" name="gray200Color" defaultValue={editingTheme.gray200Color} />
                    <ColorInput label="Серый 300" name="gray300Color" defaultValue={editingTheme.gray300Color} />
                    <ColorInput label="Серый 400" name="gray400Color" defaultValue={editingTheme.gray400Color} />
                    <ColorInput label="Серый 500" name="gray500Color" defaultValue={editingTheme.gray500Color} />
                    <ColorInput label="Серый 600" name="gray600Color" defaultValue={editingTheme.gray600Color} />
                    <ColorInput label="Серый 700" name="gray700Color" defaultValue={editingTheme.gray700Color} />
                    <ColorInput label="Серый 800" name="gray800Color" defaultValue={editingTheme.gray800Color} />
                    <ColorInput label="Серый 900" name="gray900Color" defaultValue={editingTheme.gray900Color} />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Hidden inputs to ensure all theme data is submitted */}
              <input type="hidden" name="fontFamilyPrimary" defaultValue={editingTheme.fontFamilyPrimary || "Poppins, sans-serif"} />
              <input type="hidden" name="fontFamilySecondary" defaultValue={editingTheme.fontFamilySecondary || "Inter, sans-serif"} />
              <input type="hidden" name="primaryShadow" defaultValue={editingTheme.primaryShadow || "0 4px 14px 0 rgba(255, 102, 0, 0.3)"} />
              <input type="hidden" name="successShadow" defaultValue={editingTheme.successShadow || "0 4px 14px 0 rgba(34, 197, 94, 0.3)"} />
              <input type="hidden" name="warningShadow" defaultValue={editingTheme.warningShadow || "0 4px 14px 0 rgba(245, 158, 11, 0.3)"} />
              <input type="hidden" name="errorShadow" defaultValue={editingTheme.errorShadow || "0 4px 14px 0 rgba(239, 68, 68, 0.3)"} />
              <input type="hidden" name="infoShadow" defaultValue={editingTheme.infoShadow || "0 4px 14px 0 rgba(59, 130, 246, 0.3)"} />
              <input type="hidden" name="grayShadow" defaultValue={editingTheme.grayShadow || "0 4px 14px 0 rgba(107, 114, 128, 0.3)"} />
              
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