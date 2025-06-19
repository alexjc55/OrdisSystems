import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { formatCurrency } from "@/lib/currency";
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  ShoppingCart, 
  Utensils,
  Settings,
  Menu
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { storeSettings } = useStoreSettings();

  // Permission checking function for workers
  const checkWorkerPermission = (permission: string) => {
    if (user?.role === 'admin') return true;
    if (user?.role !== 'worker') return false;
    const permissions = storeSettings?.workerPermissions as any;
    return permissions?.[permission] || false;
  };

  // Check which tabs should be visible based on permissions
  const canViewProducts = user?.role === 'admin' || checkWorkerPermission('canManageProducts');
  const canViewCategories = user?.role === 'admin' || checkWorkerPermission('canManageCategories');
  const canViewOrders = user?.role === 'admin' || checkWorkerPermission('canManageOrders');
  const canViewUsers = user?.role === 'admin' || checkWorkerPermission('canViewUsers');
  const canViewStoreSettings = user?.role === 'admin' || checkWorkerPermission('canViewSettings') || checkWorkerPermission('canManageSettings');
  const canManageStoreSettings = user?.role === 'admin' || checkWorkerPermission('canManageSettings');
  const canViewSystemSettings = user?.role === 'admin'; // Only admins can see worker permissions

  // Store settings mutation
  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const response = await apiRequest('PUT', '/api/settings', settingsData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: "Настройки сохранены", description: "Настройки магазина успешно обновлены" });
    },
    onError: (error: any) => {
      console.error("Store settings update error:", error);
      toast({ title: "Ошибка", description: "Не удалось обновить настройки", variant: "destructive" });
    }
  });

  if (!user || (user.role !== "admin" && user.role !== "worker")) {
    return null;
  }

  // Set default tab based on permissions
  useEffect(() => {
    if (!canViewProducts && canViewCategories) {
      setActiveTab("categories");
    } else if (!canViewProducts && !canViewCategories && canViewOrders) {
      setActiveTab("orders");
    } else if (!canViewProducts && !canViewCategories && !canViewOrders && canViewUsers) {
      setActiveTab("users");
    } else if (!canViewProducts && !canViewCategories && !canViewOrders && !canViewUsers && canViewStoreSettings) {
      setActiveTab("store");
    }
  }, [canViewProducts, canViewCategories, canViewOrders, canViewUsers, canViewStoreSettings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        {/* Mobile menu toggle */}
        <div className="sm:hidden flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Админ панель</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-8">
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden sm:block'}`}>
            <TabsList className="grid w-full gap-1 grid-cols-2 sm:grid-cols-4">
              {canViewProducts && <TabsTrigger value="products" className="text-xs sm:text-sm">Товары</TabsTrigger>}
              {canViewCategories && <TabsTrigger value="categories" className="text-xs sm:text-sm">Категории</TabsTrigger>}
              {canViewOrders && <TabsTrigger value="orders" className="text-xs sm:text-sm">Заказы</TabsTrigger>}
              {canViewUsers && <TabsTrigger value="users" className="text-xs sm:text-sm">Пользователи</TabsTrigger>}
              {canViewStoreSettings && <TabsTrigger value="store" className="text-xs sm:text-sm">Магазин</TabsTrigger>}
              {canViewSystemSettings && <TabsTrigger value="settings" className="text-xs sm:text-sm">Настройки</TabsTrigger>}
            </TabsList>
          </div>

          {/* Products Tab */}
          {canViewProducts && (
            <TabsContent value="products" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Управление товарами
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Добавление, редактирование и управление товарами
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Управление товарами</h3>
                    <p className="text-gray-500">Функционал управления товарами доступен</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Categories Tab */}
          {canViewCategories && (
            <TabsContent value="categories" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Utensils className="h-5 w-5" />
                    Управление категориями
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Добавление, редактирование и управление категориями
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Управление категориями</h3>
                    <p className="text-gray-500">Функционал управления категориями доступен</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Orders Tab */}
          {canViewOrders && (
            <TabsContent value="orders" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Управление заказами
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Просмотр и управление заказами клиентов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Управление заказами</h3>
                    <p className="text-gray-500">Функционал управления заказами доступен</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Users Tab */}
          {canViewUsers && (
            <TabsContent value="users" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Управление пользователями
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {user?.role === 'admin' ? 'Полное управление пользователями' : 'Просмотр списка пользователей'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {user?.role === 'admin' ? 'Управление пользователями' : 'Просмотр пользователей'}
                    </h3>
                    <p className="text-gray-500">
                      {user?.role === 'admin' 
                        ? 'Функционал управления пользователями доступен' 
                        : 'Доступен только просмотр списка пользователей'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Store Settings Tab */}
          {canViewStoreSettings && (
            <TabsContent value="store" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Настройки магазина
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {canManageStoreSettings ? 'Управление настройками магазина' : 'Просмотр настроек магазина'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {canManageStoreSettings ? 'Управление настройками' : 'Просмотр настроек'}
                    </h3>
                    <p className="text-gray-500">
                      {canManageStoreSettings 
                        ? 'Полный доступ к настройкам магазина' 
                        : 'Доступен только просмотр настроек магазина'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* System Settings Tab - Admin Only */}
          {canViewSystemSettings && (
            <TabsContent value="settings" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Настройки системы
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Управление правами доступа для сотрудников
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
                            onCheckedChange={(checked) => 
                              updateStoreSettingsMutation.mutate({
                                workerPermissions: {
                                  ...(storeSettings?.workerPermissions || {}),
                                  canManageProducts: checked
                                }
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Управление категориями</label>
                            <p className="text-xs text-gray-500">Добавление, редактирование и удаление категорий</p>
                          </div>
                          <Switch
                            checked={(storeSettings?.workerPermissions as any)?.canManageCategories || false}
                            onCheckedChange={(checked) => 
                              updateStoreSettingsMutation.mutate({
                                workerPermissions: {
                                  ...(storeSettings?.workerPermissions || {}),
                                  canManageCategories: checked
                                }
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Управление заказами</label>
                            <p className="text-xs text-gray-500">Просмотр и изменение статуса заказов</p>
                          </div>
                          <Switch
                            checked={(storeSettings?.workerPermissions as any)?.canManageOrders || false}
                            onCheckedChange={(checked) => 
                              updateStoreSettingsMutation.mutate({
                                workerPermissions: {
                                  ...(storeSettings?.workerPermissions || {}),
                                  canManageOrders: checked
                                }
                              })
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Просмотр пользователей</label>
                            <p className="text-xs text-gray-500">Просмотр списка клиентов</p>
                          </div>
                          <Switch
                            checked={(storeSettings?.workerPermissions as any)?.canViewUsers || false}
                            onCheckedChange={(checked) => 
                              updateStoreSettingsMutation.mutate({
                                workerPermissions: {
                                  ...(storeSettings?.workerPermissions || {}),
                                  canViewUsers: checked
                                }
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Управление пользователями</label>
                            <p className="text-xs text-gray-500">Редактирование и удаление пользователей</p>
                          </div>
                          <Switch
                            checked={(storeSettings?.workerPermissions as any)?.canManageUsers || false}
                            onCheckedChange={(checked) => 
                              updateStoreSettingsMutation.mutate({
                                workerPermissions: {
                                  ...(storeSettings?.workerPermissions || {}),
                                  canManageUsers: checked
                                }
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Просмотр настроек</label>
                            <p className="text-xs text-gray-500">Доступ к настройкам магазина (только чтение)</p>
                          </div>
                          <Switch
                            checked={(storeSettings?.workerPermissions as any)?.canViewSettings || false}
                            onCheckedChange={(checked) => 
                              updateStoreSettingsMutation.mutate({
                                workerPermissions: {
                                  ...(storeSettings?.workerPermissions || {}),
                                  canViewSettings: checked
                                }
                              })
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Управление настройками</label>
                            <p className="text-xs text-gray-500">Полный доступ к настройкам магазина</p>
                          </div>
                          <Switch
                            checked={(storeSettings?.workerPermissions as any)?.canManageSettings || false}
                            onCheckedChange={(checked) => 
                              updateStoreSettingsMutation.mutate({
                                workerPermissions: {
                                  ...(storeSettings?.workerPermissions || {}),
                                  canManageSettings: checked
                                }
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Объяснение разрешений:</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li><strong>Просмотр настроек:</strong> Включает доступ к разделу "Магазин" (только просмотр)</li>
                        <li><strong>Управление настройками:</strong> Включает полный доступ к разделу "Магазин" с возможностью редактирования</li>
                        <li><strong>Раздел "Настройки":</strong> Доступен только администраторам для управления правами работников</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}