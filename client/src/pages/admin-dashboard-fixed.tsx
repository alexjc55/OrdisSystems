import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShoppingCart, Users, Settings } from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("products");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Требуется авторизация</h2>
          <p className="text-gray-600">Пожалуйста, войдите в систему</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'worker') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Доступ запрещен</h2>
          <p className="text-gray-600">Роль: {user.role}</p>
          <p className="text-gray-600">Недостаточно прав для доступа к админ-панели</p>
        </div>
      </div>
    );
  }

  // Store settings for worker permissions  
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      return response.json();
    }
  });

  // Check worker permissions
  const checkWorkerPermission = (permission: string) => {
    if (user?.role === 'admin') return true;
    if (user?.role !== 'worker') return false;
    const permissions = storeSettings?.workerPermissions as any;
    return permissions?.[permission] || false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Админ-панель</h1>
          <p className="text-gray-600">Добро пожаловать, {user.username} ({user.role})</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${[
            checkWorkerPermission('canManageProducts') && 'products',
            checkWorkerPermission('canManageCategories') && 'categories', 
            checkWorkerPermission('canManageOrders') && 'orders',
            checkWorkerPermission('canViewUsers') && 'users',
            (user?.role === 'admin') && 'settings'
          ].filter(Boolean).length}, 1fr)` }}>
            {checkWorkerPermission('canManageProducts') && (
              <TabsTrigger value="products">Товары</TabsTrigger>
            )}
            {checkWorkerPermission('canManageCategories') && (
              <TabsTrigger value="categories">Категории</TabsTrigger>
            )}
            {checkWorkerPermission('canManageOrders') && (
              <TabsTrigger value="orders">Заказы</TabsTrigger>
            )}
            {checkWorkerPermission('canViewUsers') && (
              <TabsTrigger value="users">Пользователи</TabsTrigger>
            )}
            {user?.role === 'admin' && (
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            )}
          </TabsList>

          {checkWorkerPermission('canManageProducts') && (
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Товары
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Управление товарами доступно для вашей роли: {user.role}</p>
                  <p className="text-sm text-gray-500 mt-2">Полная функциональность будет восстановлена в следующих обновлениях</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {checkWorkerPermission('canManageCategories') && (
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Категории</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Управление категориями доступно для вашей роли: {user.role}</p>
                  <p className="text-sm text-gray-500 mt-2">Полная функциональность будет восстановлена в следующих обновлениях</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {checkWorkerPermission('canManageOrders') && (
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Заказы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Управление заказами доступно для вашей роли: {user.role}</p>
                  <p className="text-sm text-gray-500 mt-2">Полная функциональность будет восстановлена в следующих обновлениях</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {checkWorkerPermission('canViewUsers') && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Пользователи
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Просмотр пользователей доступен для вашей роли: {user.role}</p>
                  <p className="text-sm text-gray-500 mt-2">Полная функциональность будет восстановлена в следующих обновлениях</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {user?.role === 'admin' && (
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Настройки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Настройки системы доступны только для администраторов</p>
                  <div className="mt-4">
                    <h3 className="font-semibold">Текущие разрешения worker:</h3>
                    <pre className="bg-gray-100 p-2 rounded mt-2 text-xs">
                      {JSON.stringify(storeSettings?.workerPermissions || {}, null, 2)}
                    </pre>
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