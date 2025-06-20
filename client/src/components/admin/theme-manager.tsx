import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useThemes } from "@/hooks/use-themes";
import { useForm } from "react-hook-form";
import { Palette, Plus, Edit, Trash2, Check, Eye } from "lucide-react";
import type { ThemeColors } from "@shared/schema";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}

function ThemePreview({ colors }: { colors: ThemeColors }) {
  return (
    <div className="border rounded-lg p-4 space-y-3" style={{ backgroundColor: colors.background }}>
      <div className="flex items-center gap-2">
        <div 
          className="w-4 h-4 rounded"
          style={{ backgroundColor: colors.primary }}
        />
        <span className="text-sm font-medium" style={{ color: colors.text }}>
          Предварительный просмотр
        </span>
      </div>
      
      <div className="space-y-2">
        <div 
          className="px-3 py-2 rounded text-sm"
          style={{ 
            backgroundColor: colors.primary,
            color: colors.background
          }}
        >
          Основная кнопка
        </div>
        
        <div 
          className="px-3 py-2 rounded border text-sm"
          style={{ 
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text
          }}
        >
          Карточка товара
        </div>
        
        <div className="flex gap-2">
          <div 
            className="px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: colors.success,
              color: colors.background
            }}
          >
            Успех
          </div>
          <div 
            className="px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: colors.warning,
              color: colors.background
            }}
          >
            Предупреждение
          </div>
          <div 
            className="px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: colors.error,
              color: colors.background
            }}
          >
            Ошибка
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateThemeDialog({ onClose }: { onClose: () => void }) {
  const { createThemeMutation } = useThemes();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      colors: {
        primary: "#f97316",
        primaryLight: "#fb923c",
        primaryDark: "#ea580c",
        secondary: "#64748b",
        accent: "#f59e0b",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#0f172a",
        textSecondary: "#64748b",
        border: "#e2e8f0",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444"
      }
    }
  });

  const colors = watch("colors");

  const onSubmit = (data: any) => {
    createThemeMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Создать новую тему
        </DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Системное имя темы</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                placeholder="my-custom-theme"
              />
            </div>
            
            <div>
              <Label htmlFor="displayName">Отображаемое имя</Label>
              <Input
                id="displayName"
                {...register("displayName", { required: true })}
                placeholder="Моя кастомная тема"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Описание темы..."
              />
            </div>
            
            <ThemePreview colors={colors} />
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Цветовая схема</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <ColorPicker
                label="Основной цвет"
                value={colors.primary}
                onChange={(value) => setValue("colors.primary", value)}
              />
              
              <ColorPicker
                label="Светлый основной"
                value={colors.primaryLight}
                onChange={(value) => setValue("colors.primaryLight", value)}
              />
              
              <ColorPicker
                label="Темный основной"
                value={colors.primaryDark}
                onChange={(value) => setValue("colors.primaryDark", value)}
              />
              
              <ColorPicker
                label="Вторичный цвет"
                value={colors.secondary}
                onChange={(value) => setValue("colors.secondary", value)}
              />
              
              <ColorPicker
                label="Акцентный цвет"
                value={colors.accent}
                onChange={(value) => setValue("colors.accent", value)}
              />
              
              <ColorPicker
                label="Фон"
                value={colors.background}
                onChange={(value) => setValue("colors.background", value)}
              />
              
              <ColorPicker
                label="Поверхность"
                value={colors.surface}
                onChange={(value) => setValue("colors.surface", value)}
              />
              
              <ColorPicker
                label="Текст"
                value={colors.text}
                onChange={(value) => setValue("colors.text", value)}
              />
              
              <ColorPicker
                label="Вторичный текст"
                value={colors.textSecondary}
                onChange={(value) => setValue("colors.textSecondary", value)}
              />
              
              <ColorPicker
                label="Границы"
                value={colors.border}
                onChange={(value) => setValue("colors.border", value)}
              />
              
              <ColorPicker
                label="Успех"
                value={colors.success}
                onChange={(value) => setValue("colors.success", value)}
              />
              
              <ColorPicker
                label="Предупреждение"
                value={colors.warning}
                onChange={(value) => setValue("colors.warning", value)}
              />
              
              <ColorPicker
                label="Ошибка"
                value={colors.error}
                onChange={(value) => setValue("colors.error", value)}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={createThemeMutation.isPending}
            className="bg-gradient-primary"
          >
            {createThemeMutation.isPending ? "Создание..." : "Создать тему"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export default function ThemeManager() {
  const { themes, activeTheme, activateThemeMutation, deleteThemeMutation } = useThemes();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление темами</h2>
          <p className="text-gray-600">Настройте внешний вид вашего магазина</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-modern">
              <Plus className="h-4 w-4 mr-2" />
              Создать тему
            </Button>
          </DialogTrigger>
          <CreateThemeDialog onClose={() => setCreateDialogOpen(false)} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <Card key={theme.id} className={`relative overflow-hidden transition-all duration-200 ${
            theme.name === activeTheme?.name 
              ? "ring-2 ring-orange-500 shadow-lg" 
              : "hover:shadow-md"
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{theme.displayName}</CardTitle>
                <div className="flex items-center gap-2">
                  {theme.name === activeTheme?.name && (
                    <Badge className="bg-green-500 text-white">
                      <Check className="h-3 w-3 mr-1" />
                      Активна
                    </Badge>
                  )}
                  {theme.isBuiltIn && (
                    <Badge variant="secondary">Встроенная</Badge>
                  )}
                </div>
              </div>
              {theme.description && (
                <p className="text-sm text-gray-600">{theme.description}</p>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <ThemePreview colors={theme.colors as ThemeColors} />
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {theme.name !== activeTheme?.name && (
                      <Button
                        size="sm"
                        onClick={() => activateThemeMutation.mutate(theme.name)}
                        disabled={activateThemeMutation.isPending}
                        className="btn-modern"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Применить
                      </Button>
                    )}
                    
                    {!theme.isBuiltIn && (
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {!theme.isBuiltIn && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить тему</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить тему "{theme.displayName}"? 
                            Это действие нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteThemeMutation.mutate(theme.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}