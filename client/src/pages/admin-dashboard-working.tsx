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
import { formatCurrency } from "@/lib/currency";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("products");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    const permissions = storeSettings?.workerPermissions;
    console.log('Worker permissions check:', { permission, permissions, result: permissions?.[permission] });
    if (!permissions) return false;
    return permissions[permission] === true;
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'preparing': return 'default';
      case 'ready': return 'default';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'В ожидании';
      case 'confirmed': return 'Подтвержден';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Готов';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
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

          {/* Товары */}
          {checkWorkerPermission('canManageProducts') && (
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Товары ({products.length})
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить товар
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Товары не найдены
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Название</TableHead>
                          <TableHead>Категория</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product: any) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.imageUrl && (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500 line-clamp-1">
                                    {product.description}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{product.category?.name || 'Без категории'}</TableCell>
                            <TableCell>{formatCurrency(product.priceRub)}</TableCell>
                            <TableCell>
                              <Badge variant={product.isAvailable ? "default" : "secondary"}>
                                {product.isAvailable ? "Доступен" : "Недоступен"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Удалить товар</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Вы уверены, что хотите удалить товар "{product.name}"? 
                                        Это действие нельзя отменить.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deleteProductMutation.mutate(product.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Удалить
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Категории */}
          {checkWorkerPermission('canManageCategories') && (
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Категории ({categories.length})
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить категорию
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoriesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Категории не найдены
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Название</TableHead>
                          <TableHead>Описание</TableHead>
                          <TableHead>Товаров</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category: any) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description || 'Без описания'}</TableCell>
                            <TableCell>{category.products?.length || 0}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Удалить категорию</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Вы уверены, что хотите удалить категорию "{category.name}"? 
                                        Все товары в этой категории будут перемещены в "Без категории".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Удалить
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Заказы */}
          {checkWorkerPermission('canManageOrders') && (
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Заказы ({orders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Заказы не найдены
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Клиент</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell>#{order.id}</TableCell>
                            <TableCell>
                              {order.user ? (
                                <div>
                                  <div className="font-medium">
                                    {order.user.firstName} {order.user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {order.user.email}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500">Гость</span>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(order.status)}>
                                {getStatusText(order.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => 
                                    updateOrderStatusMutation.mutate({ id: order.id, status: value })
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">В ожидании</SelectItem>
                                    <SelectItem value="confirmed">Подтвержден</SelectItem>
                                    <SelectItem value="preparing">Готовится</SelectItem>
                                    <SelectItem value="ready">Готов</SelectItem>
                                    <SelectItem value="delivered">Доставлен</SelectItem>
                                    <SelectItem value="cancelled">Отменен</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Пользователи */}
          {checkWorkerPermission('canViewUsers') && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Пользователи ({users.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Пользователи не найдены
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Имя</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Роль</TableHead>
                          <TableHead>Дата регистрации</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  @{user.username}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={
                                user.role === 'admin' ? 'default' : 
                                user.role === 'worker' ? 'secondary' : 'outline'
                              }>
                                {user.role === 'admin' ? 'Админ' : 
                                 user.role === 'worker' ? 'Работник' : 'Клиент'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Настройки */}
          {user?.role === 'admin' && (
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Настройки системы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Разрешения для работников</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Управление товарами</Label>
                          <p className="text-sm text-gray-500">
                            Статус: {storeSettings?.workerPermissions?.canManageProducts ? 'Разрешено' : 'Запрещено'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Управление категориями</Label>
                          <p className="text-sm text-gray-500">
                            Статус: {storeSettings?.workerPermissions?.canManageCategories ? 'Разрешено' : 'Запрещено'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Управление заказами</Label>
                          <p className="text-sm text-gray-500">
                            Статус: {storeSettings?.workerPermissions?.canManageOrders ? 'Разрешено' : 'Запрещено'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Просмотр пользователей</Label>
                          <p className="text-sm text-gray-500">
                            Статус: {storeSettings?.workerPermissions?.canViewUsers ? 'Разрешено' : 'Запрещено'}
                          </p>
                        </div>
                      </div>
                      <Button className="mt-4">
                        Редактировать разрешения
                      </Button>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Настройки магазина</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>Название магазина</Label>
                          <p className="text-sm text-gray-500 mt-1">
                            {storeSettings?.storeName || 'Не указано'}
                          </p>
                        </div>
                        <div>
                          <Label>Приветственное сообщение</Label>
                          <p className="text-sm text-gray-500 mt-1">
                            {storeSettings?.welcomeTitle || 'Не указано'}
                          </p>
                        </div>
                      </div>
                      <Button className="mt-4">
                        Редактировать настройки
                      </Button>
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