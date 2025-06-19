import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, ShoppingCart, Users, Settings, Plus, Edit, Trash2, Eye } from "lucide-react";
import type { Product, Category, Order, User as SelectUser } from "@shared/schema";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("products");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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

  // Data queries
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user && (user.role === 'admin' || user.role === 'worker')
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    enabled: !!user && (user.role === 'admin' || user.role === 'worker')
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders'],
    enabled: !!user && (user.role === 'admin' || user.role === 'worker')
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'admin'
  });

  // Mutations
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/products/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: "Товар удален", description: "Товар успешно удален из каталога" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/categories/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: "Категория удалена", description: "Категория успешно удалена" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: "Статус обновлен", description: "Статус заказа успешно обновлен" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

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
          <p className="text-gray-600">Добро пожаловать, {user.firstName || user.username} ({user.role})</p>
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