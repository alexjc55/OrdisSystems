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
import { Palette, Eye, Trash2, Plus, Save, Paintbrush, Settings, RotateCcw, Info, EyeOff, MessageCircle } from "lucide-react";
import { applyTheme, defaultTheme, type Theme } from "@/lib/theme-system";
import { ModernStyleSettings } from "./modern-style-settings";

// Visual Toggle Button Component
function VisualToggleButton({ 
  isEnabled, 
  onToggle, 
  label, 
  description,
  fieldName 
}: { 
  isEnabled: boolean;
  onToggle?: () => void;
  label: string;
  description: string;
  fieldName: string;
}) {
  const [enabled, setEnabled] = useState(isEnabled);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    if (onToggle) onToggle();
  };

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
        onClick={handleToggle}
        className={`p-2 h-8 w-8 ${enabled ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-500'}`}
      >
        {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
      <input type="hidden" name={fieldName} value={enabled ? "true" : "false"} />
    </div>
  );
}

// Color Input Component
function ColorInput({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          name={name}
          id={name}
          defaultValue={defaultValue}
          className="w-12 h-8 border rounded cursor-pointer"
        />
        <Input
          type="text"
          defaultValue={defaultValue}
          className="flex-1 text-sm"
          onChange={(e) => {
            const colorInput = document.getElementById(name) as HTMLInputElement;
            if (colorInput) colorInput.value = e.target.value;
          }}
        />
      </div>
    </div>
  );
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
  modernBlock1Icon?: string;
  modernBlock1Text?: string;
  modernBlock2Icon?: string;
  modernBlock2Text?: string;
  modernBlock3Icon?: string;
  modernBlock3Text?: string;
  showBannerImage?: boolean;
  showTitleDescription?: boolean;
  showInfoBlocks?: boolean;
  infoBlocksPosition?: string;
  showSpecialOffers?: boolean;
  showCategoryMenu?: boolean;
  showWhatsAppChat?: boolean;
  whatsappPhone?: string;
  whatsappMessage?: string;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeData | null>(null);

  // Visual settings state for create form
  const [visualSettings, setVisualSettings] = useState({
    showBannerImage: true,
    showTitleDescription: true,
    showInfoBlocks: true,
    infoBlocksPosition: "top",
    showSpecialOffers: true,
    showCategoryMenu: true,
    showWhatsAppChat: false
  });

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['/api/admin/themes'],
  });

  const createThemeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest('/api/admin/themes', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/themes'] });
      setShowCreateDialog(false);
      toast({
        title: "Тема создана",
        description: "Новая тема успешно создана",
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
    mutationFn: async ({ formData, themeId }: { formData: FormData; themeId: string }) => {
      return apiRequest(`/api/admin/themes/${themeId}`, {
        method: 'PUT',
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/themes'] });
      setEditingTheme(null);
      toast({
        title: "Тема обновлена",
        description: "Изменения сохранены",
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

  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      return apiRequest(`/api/admin/themes/${themeId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/themes'] });
      toast({
        title: "Тема удалена",
        description: "Тема была удалена",
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

  const activateThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      return apiRequest(`/api/admin/themes/${themeId}/activate`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/themes'] });
      if (data?.theme) {
        applyTheme(data.theme);
      }
      toast({
        title: "Тема активирована",
        description: "Тема применена к сайту",
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

  const handleCreateTheme = (formData: FormData) => {
    createThemeMutation.mutate(formData);
  };

  const handleUpdateTheme = (formData: FormData, themeId: string) => {
    updateThemeMutation.mutate({ formData, themeId });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление темами</h2>
          <p className="text-gray-600">Создавайте и настраивайте темы оформления для вашего магазина</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
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
                <TabsList className="flex w-full">
                  <TabsTrigger value="basic" className="flex items-center gap-1 flex-1">
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">Основное</span>
                  </TabsTrigger>
                  <TabsTrigger value="colors" className="flex items-center gap-1 flex-1">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">Цвета</span>
                  </TabsTrigger>
                  <TabsTrigger value="visuals" className="flex items-center gap-1 flex-1">
                    <Eye className="h-4 w-4" />
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
                      <Textarea id="description" name="description" placeholder="Описание темы" rows={3} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="headerStyleCreate">Стиль заголовка</Label>
                      <select
                        name="headerStyle"
                        id="headerStyleCreate"
                        defaultValue="classic"
                        className="w-full px-3 py-2 border rounded-md bg-white"
                      >
                        <option value="classic">Классический</option>
                        <option value="modern">Современный</option>
                        <option value="minimal">Минималистичный</option>
                      </select>
                    </div>
                    
                    <ModernStyleSettings id="modernControlsCreate" />
                  </div>
                </TabsContent>

                <TabsContent value="colors" className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Основные цвета бренда</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ColorInput label="Основной цвет" name="primaryColor" defaultValue="#ff6600" />
                      <ColorInput label="Текст основного цвета" name="primaryTextColor" defaultValue="#ffffff" />
                      <ColorInput label="Темный основной" name="primaryDarkColor" defaultValue="#e55a00" />
                      <ColorInput label="Светлый основной" name="primaryLightColor" defaultValue="#ff8533" />
                      <ColorInput label="Вторичный цвет" name="secondaryColor" defaultValue="#f8f9fa" />
                      <ColorInput label="Акцентный цвет" name="accentColor" defaultValue="#17a2b8" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Цвета статусов</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ColorInput label="Успех" name="successColor" defaultValue="#22c55e" />
                      <ColorInput label="Предупреждение" name="warningColor" defaultValue="#f59e0b" />
                      <ColorInput label="Ошибка" name="errorColor" defaultValue="#ef4444" />
                      <ColorInput label="Информация" name="infoColor" defaultValue="#3b82f6" />
                      <ColorInput label="Завтра" name="tomorrowColor" defaultValue="#a855f7" />
                      <ColorInput label="Нет в наличии" name="outOfStockColor" defaultValue="#ef4444" />
                    </div>
                  </div>

                  {/* Hidden inputs for all other settings */}
                  <input type="hidden" name="workingHoursIconColor" defaultValue="#3b82f6" />
                  <input type="hidden" name="contactsIconColor" defaultValue="#22c55e" />
                  <input type="hidden" name="paymentDeliveryIconColor" defaultValue="#a855f7" />
                  <input type="hidden" name="tomorrowDarkColor" defaultValue="#9333ea" />
                  <input type="hidden" name="successLightColor" defaultValue="#f0fdf4" />
                  <input type="hidden" name="warningLightColor" defaultValue="#fffbeb" />
                  <input type="hidden" name="errorLightColor" defaultValue="#fef2f2" />
                  <input type="hidden" name="infoLightColor" defaultValue="#eff6ff" />
                  <input type="hidden" name="tomorrowLightColor" defaultValue="#faf5ff" />
                  <input type="hidden" name="whiteColor" defaultValue="#ffffff" />
                  <input type="hidden" name="gray50Color" defaultValue="#f8fafc" />
                  <input type="hidden" name="gray100Color" defaultValue="#f1f5f9" />
                  <input type="hidden" name="gray200Color" defaultValue="#e2e8f0" />
                  <input type="hidden" name="gray300Color" defaultValue="#cbd5e1" />
                  <input type="hidden" name="gray400Color" defaultValue="#94a3b8" />
                  <input type="hidden" name="gray500Color" defaultValue="#64748b" />
                  <input type="hidden" name="gray600Color" defaultValue="#475569" />
                  <input type="hidden" name="gray700Color" defaultValue="#334155" />
                  <input type="hidden" name="gray800Color" defaultValue="#1e293b" />
                  <input type="hidden" name="gray900Color" defaultValue="#0f172a" />
                  <input type="hidden" name="fontFamilyPrimary" defaultValue="Assistant, system-ui, sans-serif" />
                  <input type="hidden" name="fontFamilySecondary" defaultValue="Inter, sans-serif" />
                  <input type="hidden" name="primaryShadow" defaultValue="0 4px 14px 0 rgba(255, 102, 0, 0.3)" />
                  <input type="hidden" name="successShadow" defaultValue="0 4px 14px 0 rgba(34, 197, 94, 0.3)" />
                  <input type="hidden" name="warningShadow" defaultValue="0 4px 14px 0 rgba(245, 158, 11, 0.3)" />
                  <input type="hidden" name="errorShadow" defaultValue="0 4px 14px 0 rgba(239, 68, 68, 0.3)" />
                  <input type="hidden" name="infoShadow" defaultValue="0 4px 14px 0 rgba(59, 130, 246, 0.3)" />
                  <input type="hidden" name="tomorrowShadow" defaultValue="0 4px 14px 0 rgba(147, 51, 234, 0.3)" />
                  <input type="hidden" name="grayShadow" defaultValue="0 4px 14px 0 rgba(107, 114, 128, 0.3)" />
                </TabsContent>

                <TabsContent value="visuals" className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Основные элементы интерфейса</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <VisualToggleButton 
                        isEnabled={visualSettings.showBannerImage}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showBannerImage: !prev.showBannerImage }))}
                        label="Показывать баннер"
                        description="Главное изображение в шапке сайта"
                        fieldName="showBannerImage"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showTitleDescription}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showTitleDescription: !prev.showTitleDescription }))}
                        label="Заголовок и описание"
                        description="Текстовая информация о магазине"
                        fieldName="showTitleDescription"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showCategoryMenu}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showCategoryMenu: !prev.showCategoryMenu }))}
                        label="Меню категорий"
                        description="Навигационное меню категорий"
                        fieldName="showCategoryMenu"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showInfoBlocks}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showInfoBlocks: !prev.showInfoBlocks }))}
                        label="Информационные блоки"
                        description="Часы работы, контакты, доставка"
                        fieldName="showInfoBlocks"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b">Дополнительные функции</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <VisualToggleButton 
                        isEnabled={visualSettings.showSpecialOffers}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showSpecialOffers: !prev.showSpecialOffers }))}
                        label="Особые предложения"
                        description="Блок с особыми предложениями"
                        fieldName="showSpecialOffers"
                      />

                      <VisualToggleButton 
                        isEnabled={visualSettings.showWhatsAppChat}
                        onToggle={() => setVisualSettings(prev => ({ ...prev, showWhatsAppChat: !prev.showWhatsAppChat }))}
                        label="WhatsApp чат"
                        description="Кнопка связи через WhatsApp"
                        fieldName="showWhatsAppChat"
                      />
                    </div>
                    
                    {visualSettings.showWhatsAppChat && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="text-sm font-medium text-green-800 mb-3 flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Настройки WhatsApp
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="whatsappPhoneCreate" className="text-sm font-medium">Номер телефона</Label>
                            <input
                              type="text"
                              name="whatsappPhone"
                              id="whatsappPhoneCreate"
                              placeholder="+972501234567"
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500">
                              Номер в международном формате с кодом страны
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="whatsappMessageCreate" className="text-sm font-medium">Сообщение по умолчанию</Label>
                            <input
                              type="text"
                              name="whatsappMessage"
                              id="whatsappMessageCreate"
                              placeholder="Здравствуйте! Хочу сделать заказ"
                              className="w-full px-3 py-2 border rounded-md bg-white text-sm"
                            />
                            <div className="text-xs text-gray-500">
                              Текст, который будет отправлен автоматически
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={createThemeMutation.isPending}>
                    {createThemeMutation.isPending ? "Создание..." : "Создать тему"}
                  </Button>
                </div>
              </Tabs>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Themes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme: ThemeData) => (
            <Card key={theme.id} className={`relative ${theme.isActive ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{theme.name}</CardTitle>
                  {theme.isActive && (
                    <Badge variant="default">Активная</Badge>
                  )}
                </div>
                <CardDescription>{theme.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2 items-center">
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: theme.primaryColor }}
                    ></div>
                    <span className="text-sm text-gray-600">Основной</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={theme.isActive ? "secondary" : "default"}
                      onClick={() => activateThemeMutation.mutate(theme.id)}
                      disabled={theme.isActive || activateThemeMutation.isPending}
                    >
                      {theme.isActive ? "Активна" : "Применить"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTheme(theme)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    {!theme.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить тему?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие нельзя отменить. Тема будет удалена навсегда.
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
      )}
    </div>
  );
}