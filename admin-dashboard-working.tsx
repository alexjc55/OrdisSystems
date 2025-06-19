/**
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 * 
 * Правила для разработчика:
 * - НЕ изменять существующий дизайн и компоновку интерфейса
 * - НЕ заменять на "более удобные" решения без запроса
 * - НЕ менять стили, цвета, расположение элементов
 * - ТОЛЬКО добавлять новый функционал или исправлять то, что конкретно просят
 * - Сохранять все существующие UI паттерны и структуру
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getUnitLabel, formatDeliveryTimeRange, type ProductUnit } from "@/lib/currency";
import { insertStoreSettingsSchema, type StoreSettings } from "@shared/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { 
  Package, 
  Plus, 
  Edit2, 
  Edit,
  Trash2, 
  Users, 
  ShoppingCart, 
  Utensils,
  Save,
  Search,
  Filter,
  Store,
  Settings,
  Eye,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  CreditCard,
  Menu,
  X,
  Calendar,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Simple admin dashboard access control without complex conditional rendering
export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Store settings data for worker permissions
  const { data: storeSettings } = useQuery({
    queryKey: ["/api/settings"],
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Allow both admin and worker access, but check permissions later for individual sections
  if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
    return null;
  }

  // Get worker permissions for conditional access
  const workerPermissions = storeSettings?.workerPermissions as any;
  const isAdmin = user.role === "admin" || user.email === "alexjc55@gmail.com" || user.username === "admin";
  const isWorker = user.role === "worker";

  // Helper function to check if user can access a specific section
  const canAccess = (permission: string) => {
    if (isAdmin) return true;
    if (isWorker && workerPermissions) {
      return workerPermissions[permission] || false;
    }
    return false;
  };

  // Dynamic tabs based on permissions
  const availableTabs = [];
  if (canAccess('canManageProducts')) availableTabs.push({ value: 'products', label: 'Товары' });
  if (canAccess('canManageCategories')) availableTabs.push({ value: 'categories', label: 'Категории' });
  if (canAccess('canManageOrders')) availableTabs.push({ value: 'orders', label: 'Заказы' });
  if (canAccess('canManageUsers')) availableTabs.push({ value: 'users', label: 'Пользователи' });
  if (isAdmin) {
    availableTabs.push({ value: 'store', label: 'Магазин' });
    availableTabs.push({ value: 'settings', label: 'Настройки' });
  }

  // Set default active tab to first available tab
  const [activeTab, setActiveTab] = useState(availableTabs.length > 0 ? availableTabs[0].value : 'products');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Административная панель
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Управление магазином и заказами
          </p>
        </div>

        {availableTabs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет доступа</h3>
              <p className="text-gray-600">
                У вас нет прав доступа ни к одному разделу административной панели.
                Обратитесь к администратору для настройки прав доступа.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-8">
            <TabsList className="flex w-full overflow-x-auto gap-1 justify-start">
              {availableTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Products Management */}
            {canAccess('canManageProducts') && (
              <TabsContent value="products" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      Управление Товарами
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Добавление, редактирование и управление товарами магазина
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-gray-600">Раздел управления товарами будет здесь</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Categories Management */}
            {canAccess('canManageCategories') && (
              <TabsContent value="categories" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
                      Управление Категориями
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Создание и редактирование категорий товаров
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-gray-600">Раздел управления категориями будет здесь</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Orders Management */}
            {canAccess('canManageOrders') && (
              <TabsContent value="orders" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                      Управление Заказами
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Просмотр и обработка заказов клиентов
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-gray-600">Раздел управления заказами будет здесь</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Users Management */}
            {canAccess('canManageUsers') && (
              <TabsContent value="users" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                      Управление Пользователями
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Управление учетными записями пользователей
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-gray-600">Раздел управления пользователями будет здесь</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Store Management - Admin Only */}
            {isAdmin && (
              <TabsContent value="store" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                      Настройки магазина
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Управление информацией о магазине
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-gray-600">Раздел настроек магазина будет здесь</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Settings Management - Admin Only */}
            {isAdmin && (
              <TabsContent value="settings" className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Настройки системы
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Управление правами сотрудников
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Worker Permissions Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Права доступа сотрудников</h3>
                      <p className="text-sm text-gray-600">
                        Настройте, к каким разделам админ-панели имеют доступ пользователи с ролью "Работник"
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium">Управление товарами</label>
                              <p className="text-xs text-gray-500">Добавление, редактирование и удаление товаров</p>
                            </div>
                            <Switch
                              checked={(storeSettings?.workerPermissions as any)?.canManageProducts || false}
                              onCheckedChange={(checked) => {
                                // Permission update logic will be added here
                                console.log('Permission update:', { canManageProducts: checked });
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium">Управление категориями</label>
                              <p className="text-xs text-gray-500">Добавление, редактирование и удаление категорий</p>
                            </div>
                            <Switch
                              checked={(storeSettings?.workerPermissions as any)?.canManageCategories || false}
                              onCheckedChange={(checked) => {
                                console.log('Permission update:', { canManageCategories: checked });
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium">Управление заказами</label>
                              <p className="text-xs text-gray-500">Просмотр и изменение статуса заказов</p>
                            </div>
                            <Switch
                              checked={(storeSettings?.workerPermissions as any)?.canManageOrders || false}
                              onCheckedChange={(checked) => {
                                console.log('Permission update:', { canManageOrders: checked });
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium">Управление пользователями</label>
                              <p className="text-xs text-gray-500">Просмотр и редактирование пользователей</p>
                            </div>
                            <Switch
                              checked={(storeSettings?.workerPermissions as any)?.canManageUsers || false}
                              onCheckedChange={(checked) => {
                                console.log('Permission update:', { canManageUsers: checked });
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium">Просмотр настроек</label>
                              <p className="text-xs text-gray-500">Доступ к просмотру настроек магазина</p>
                            </div>
                            <Switch
                              checked={(storeSettings?.workerPermissions as any)?.canViewSettings || false}
                              onCheckedChange={(checked) => {
                                console.log('Permission update:', { canViewSettings: checked });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}