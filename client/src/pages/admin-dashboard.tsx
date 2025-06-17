import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/currency";
import { ImageUpload } from "@/components/ui/image-upload";
import { Package, Utensils, ShoppingCart, AlertTriangle, TrendingUp, Users, Edit2, Trash2, Plus, UserPlus, Save } from "lucide-react";
import type { CategoryWithProducts, OrderWithItems, ProductWithCategory, Product, Category, User } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Product filtering and search states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect if not authorized
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Вход в систему...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (!isLoading && user && user.role !== 'admin' && user.role !== 'worker') {
      toast({
        title: "Доступ запрещен",
        description: "Требуются права администратора или работника",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isLoading, isAuthenticated, user, toast]);

  // Fetch data
  const { data: categories } = useQuery<CategoryWithProducts[]>({ queryKey: ["/api/categories"] });
  const { data: allProducts } = useQuery<ProductWithCategory[]>({ queryKey: ["/api/products"] });
  const { data: orders } = useQuery<OrderWithItems[]>({ queryKey: ["/api/orders"] });
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });

  // Mutations for product management
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: number; isAvailable: boolean }) => {
      const response = await apiRequest("PATCH", `/api/products/${id}`, { isAvailable });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Товар обновлен", description: "Статус наличия изменен" });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowAddProduct(false);
      setEditingProduct(null);
      toast({ title: "Успех", description: "Товар создан" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingProduct(null);
      toast({ title: "Успех", description: "Товар обновлен" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Успех", description: "Товар удален" });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowAddCategory(false);
      setEditingCategory(null);
      toast({ title: "Успех", description: "Категория создана" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      toast({ title: "Успех", description: "Категория обновлена" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Успех", description: "Категория удалена" });
    },
  });

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAddUser(false);
      setEditingUser(null);
      toast({ title: "Успех", description: "Пользователь создан" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      toast({ title: "Успех", description: "Пользователь обновлен" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Успех", description: "Пользователь удален" });
    },
  });

  // Order status update mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Заказ обновлен", description: "Статус заказа изменен" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
    return null;
  }

  // Calculate stats
  const totalProducts = allProducts?.length || 0;
  const availableProducts = allProducts?.filter(p => p.isAvailable).length || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Панель Администратора</h1>
          <p className="text-gray-600">Управление товарами, заказами и пользователями</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Товары</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {availableProducts} в наличии
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Заказы</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {pendingOrders} ожидают
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allUsers?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Зарегистрированных
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Выручка</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Общий оборот
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            {user.role === 'admin' && <TabsTrigger value="users">Пользователи</TabsTrigger>}
          </TabsList>

          {/* Enhanced Products Management */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Управление Товарами
                    </CardTitle>
                    <CardDescription>
                      Добавление, редактирование товаров и управление наличием с фильтрацией и поиском
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddProduct(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Поиск товаров..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Все категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Products Table */}
                {(() => {
                  // Filter products based on search query and selected category
                  const filteredProducts = allProducts?.filter(product => {
                    const matchesSearch = searchQuery === "" || 
                      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
                    
                    const matchesCategory = selectedCategoryFilter === "all" ||
                      product.categoryId.toString() === selectedCategoryFilter;
                    
                    return matchesSearch && matchesCategory;
                  }) || [];

                  return filteredProducts.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">Название</TableHead>
                            <TableHead className="min-w-[120px]">Категория</TableHead>
                            <TableHead className="min-w-[120px]">Цена за 100г</TableHead>
                            <TableHead className="min-w-[140px]">Наличие</TableHead>
                            <TableHead className="min-w-[120px]">Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                {product.description && (
                                  <div className="text-sm text-gray-500 max-w-xs truncate">
                                    {product.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {product.category.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(product.pricePerKg)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={product.isAvailable}
                                  onCheckedChange={(checked) => {
                                    toggleAvailabilityMutation.mutate({
                                      id: product.id,
                                      isAvailable: checked
                                    });
                                  }}
                                  disabled={toggleAvailabilityMutation.isPending}
                                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-200"
                                />
                                <span className="text-sm">
                                  {product.isAvailable ? 'Доступен' : 'Нет в наличии'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingProduct(product)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Это действие нельзя отменить. Товар "{product.name}" будет удален навсегда.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteProductMutation.mutate(product.id)}>
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
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchQuery || selectedCategoryFilter !== "all" ? "Товары не найдены" : "Нет товаров"}
                      </h3>
                      <p className="text-gray-500">
                        {searchQuery || selectedCategoryFilter !== "all" 
                          ? "Попробуйте изменить критерии поиска или фильтрации"
                          : "Начните с добавления первого товара"
                        }
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Management */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5" />
                      Управление Категориями
                    </CardTitle>
                    <CardDescription>
                      Добавление, редактирование и удаление категорий товаров
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddCategory(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить категорию
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categories && categories.length > 0 ? (
                  <div className="grid gap-4">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <h3 className="font-semibold">{category.name}</h3>
                            <p className="text-sm text-gray-600">
                              {category.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {category.products.length} товаров
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие нельзя отменить. Категория "{category.name}" будет удалена навсегда.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCategoryMutation.mutate(category.id)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет категорий</h3>
                    <p className="text-gray-500">Начните с добавления первой категории</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Management */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Управление Заказами
                </CardTitle>
                <CardDescription>
                  Просмотр и обновление статуса заказов
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Дата</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{order.user.email}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(order.totalAmount))}</TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(status) => 
                                updateOrderStatusMutation.mutate({ orderId: order.id, status })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Ожидает</SelectItem>
                                <SelectItem value="confirmed">Подтвержден</SelectItem>
                                <SelectItem value="preparing">Готовится</SelectItem>
                                <SelectItem value="ready">Готов</SelectItem>
                                <SelectItem value="delivered">Выдан</SelectItem>
                                <SelectItem value="cancelled">Отменен</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет заказов</h3>
                    <p className="text-gray-500">Заказы будут отображаться здесь</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management (Admin Only) */}
          {user.role === 'admin' && (
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Управление Пользователями
                      </CardTitle>
                      <CardDescription>
                        Управление пользователями и их ролями
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowAddUser(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Добавить пользователя
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {allUsers && allUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Имя</TableHead>
                          <TableHead>Роль</TableHead>
                          <TableHead>Дата регистрации</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell className="font-medium">{userItem.email}</TableCell>
                            <TableCell>
                              {userItem.firstName && userItem.lastName 
                                ? `${userItem.firstName} ${userItem.lastName}`
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={userItem.role === 'admin' ? 'default' : userItem.role === 'worker' ? 'secondary' : 'outline'}>
                                {userItem.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString('ru-RU') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingUser(userItem)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {userItem.id !== user.id && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Это действие нельзя отменить. Пользователь "{userItem.email}" будет удален навсегда.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteUserMutation.mutate(userItem.id)}>
                                          Удалить
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Нет пользователей</h3>
                      <p className="text-gray-500">Пользователи будут отображаться здесь</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Product Form Dialog */}
        <ProductFormDialog 
          open={showAddProduct || editingProduct !== null}
          onClose={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
          }}
          categories={categories || []}
          product={editingProduct}
          onSubmit={(data) => {
            if (editingProduct) {
              updateProductMutation.mutate({ id: editingProduct.id, data });
            } else {
              createProductMutation.mutate(data);
            }
          }}
        />

        {/* Category Form Dialog */}
        <CategoryFormDialog 
          open={showAddCategory || editingCategory !== null}
          onClose={() => {
            setShowAddCategory(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
          onSubmit={(data) => {
            if (editingCategory) {
              updateCategoryMutation.mutate({ id: editingCategory.id, data });
            } else {
              createCategoryMutation.mutate(data);
            }
          }}
        />

        {/* User Form Dialog */}
        {user.role === 'admin' && (
          <UserFormDialog 
            open={showAddUser || editingUser !== null}
            onClose={() => {
              setShowAddUser(false);
              setEditingUser(null);
            }}
            user={editingUser}
            onSubmit={(data) => {
              if (editingUser) {
                updateUserMutation.mutate({ id: editingUser.id, data });
              } else {
                createUserMutation.mutate(data);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// Product schema for validation
const productSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  categoryId: z.number().min(1, "Выберите категорию"),
  pricePerKg: z.string().min(1, "Цена обязательна"),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
});

const categorySchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  icon: z.string().min(1, "Иконка обязательна"),
});

const userSchema = z.object({
  email: z.string().email("Неверный email"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "worker", "customer"]),
});

// Form Dialog Components
function ProductFormDialog({ open, onClose, categories, product, onSubmit }: any) {
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: 0,
      pricePerKg: "",
      imageUrl: "",
      isAvailable: true,
    },
  });

  // Reset form when product or dialog state changes
  useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          name: product.name || "",
          description: product.description || "",
          categoryId: product.categoryId || 0,
          pricePerKg: product.pricePerKg?.toString() || "",
          imageUrl: product.imageUrl || "",
          isAvailable: product.isAvailable ?? true,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          categoryId: 0,
          pricePerKg: "",
          imageUrl: "",
          isAvailable: true,
        });
      }
    }
  }, [open, product, form]);



  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Редактировать товар" : "Добавить товар"}
          </DialogTitle>
          <DialogDescription>
            {product ? "Обновите информацию о товаре" : "Добавьте новый товар в каталог"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название товара</FormLabel>
                  <FormControl>
                    <Input placeholder="Название товара" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Описание товара" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricePerKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Цена за 100г (₪)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Изображение</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {product ? "Обновить" : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormDialog({ open, onClose, category, onSubmit }: any) {
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
      icon: category?.icon || "🍽️",
    },
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {category ? "Редактировать категорию" : "Добавить категорию"}
          </DialogTitle>
          <DialogDescription>
            {category ? "Обновите информацию о категории" : "Создайте новую категорию товаров"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название категории</FormLabel>
                  <FormControl>
                    <Input placeholder="Название категории" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Описание категории" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Иконка (эмодзи)</FormLabel>
                  <FormControl>
                    <Input placeholder="🍽️" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {category ? "Обновить" : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function UserFormDialog({ open, onClose, user, onSubmit }: any) {
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      role: user?.role || "customer",
    },
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {user ? "Редактировать пользователя" : "Добавить пользователя"}
          </DialogTitle>
          <DialogDescription>
            {user ? "Обновите информацию о пользователе" : "Создайте нового пользователя"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input placeholder="Имя" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Фамилия</FormLabel>
                  <FormControl>
                    <Input placeholder="Фамилия" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Роль</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="customer">Клиент</SelectItem>
                      <SelectItem value="worker">Сотрудник</SelectItem>
                      <SelectItem value="admin">Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {user ? "Обновить" : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}