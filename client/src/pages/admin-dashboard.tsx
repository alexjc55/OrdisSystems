import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/currency";
import { Package, Utensils, ShoppingCart, AlertTriangle, TrendingUp, Users, Edit2, Trash2, Plus, UserPlus, ChevronDown, ChevronRight } from "lucide-react";
import type { CategoryWithProducts, OrderWithItems, ProductWithCategory, Product, Category, User } from "@shared/schema";

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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());

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
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Data queries
  const { data: categories } = useQuery<CategoryWithProducts[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: allProducts } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: orders } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: user?.role === 'admin',
  });

  // Product availability toggle mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ productId, isAvailable }: { productId: number; isAvailable: boolean }) => {
      const response = await apiRequest("PATCH", `/api/products/${productId}`, { isAvailable });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Обновлено",
        description: "Наличие товара изменено",
      });
    },
  });

  // Product CRUD mutations
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await apiRequest("POST", "/api/products", productData);
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

  // Category CRUD mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await apiRequest("POST", "/api/categories", categoryData);
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

  // User CRUD mutations (admin only)
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
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

  const toggleCategoryCollapse = (categoryId: number) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
    return null;
  }

  // Calculate statistics
  const totalProducts = allProducts?.length || 0;
  const availableProducts = allProducts?.filter(p => p.isAvailable).length || 0;
  const outOfStockProducts = totalProducts - availableProducts;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
  const totalRevenue = orders?.reduce((acc, order) => acc + parseFloat(order.totalAmount), 0) || 0;
  const totalUsers = allUsers?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-gray-900 mb-2">
            Панель Управления eDAHouse
          </h1>
          <p className="text-gray-600">
            Полное управление рестораном готовой еды на развес
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего Блюд</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Нет в Наличии</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{outOfStockProducts}</div>
              <p className="text-xs text-muted-foreground">
                Требует внимания
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Заказы</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {pendingOrders} в ожидании
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

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="inventory">Товары</TabsTrigger>
            <TabsTrigger value="products">Управление</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            {user.role === 'admin' && <TabsTrigger value="users">Пользователи</TabsTrigger>}
          </TabsList>

          {/* Compact Product Inventory */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Быстрое Управление Товарами
                </CardTitle>
                <CardDescription>
                  Управление наличием товаров по категориям. Нажмите на категорию для сворачивания
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories?.map((category) => (
                    <Collapsible
                      key={category.id}
                      open={!collapsedCategories.has(category.id)}
                      onOpenChange={() => toggleCategoryCollapse(category.id)}
                    >
                      <div className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{category.icon}</span>
                            <div>
                              <h3 className="font-semibold text-lg">{category.name}</h3>
                              <p className="text-sm text-gray-600">
                                {category.products.length} товаров
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {category.products.filter(p => {
                                const productDetails = allProducts?.find(ap => ap.id === p.id);
                                return productDetails?.isAvailable;
                              }).length} доступно
                            </Badge>
                            {collapsedCategories.has(category.id) ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="border-t p-4">
                            <div className="grid gap-2">
                              {category.products.map((product) => {
                                const productDetails = allProducts?.find(p => p.id === product.id);
                                if (!productDetails) return null;
                                
                                return (
                                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3">
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-gray-600">
                                          {formatCurrency(parseFloat(product.pricePerKg))} за кг
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`available-${product.id}`} className="text-sm font-medium">
                                          {productDetails.isAvailable ? "В наличии" : "Нет в наличии"}
                                        </Label>
                                        <Switch
                                          id={`available-${product.id}`}
                                          checked={productDetails.isAvailable}
                                          onCheckedChange={(checked) => toggleAvailabilityMutation.mutate({
                                            productId: product.id,
                                            isAvailable: checked
                                          })}
                                          disabled={toggleAvailabilityMutation.isPending}
                                          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-200"
                                        />
                                      </div>
                                      
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingProduct(productDetails)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Management */}
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
                      Добавление, редактирование и удаление товаров
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddProduct(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allProducts && allProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Цена/кг</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category.name}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(product.pricePerKg))}</TableCell>
                          <TableCell>
                            <Badge variant={product.isAvailable ? "default" : "destructive"}>
                              {product.isAvailable ? "Доступен" : "Недоступен"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}>
                                <Edit2 className="h-4 w-4" />
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
                                      Вы уверены, что хотите удалить "{product.name}"? Это действие нельзя отменить.
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
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет товаров</h3>
                    <p className="text-gray-500">Начните с добавления первого товара</p>
                  </div>
                )}
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
                      Добавление, редактирование и удаление категорий
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
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <h3 className="font-semibold">{category.name}</h3>
                            <p className="text-sm text-gray-600">{category.description}</p>
                            <Badge variant="secondary">{category.products.length} товаров</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingCategory(category)}>
                            <Edit2 className="h-4 w-4" />
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
                                  Все товары в этой категории также будут удалены.
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
                  Обработка и отслеживание заказов клиентов
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Заказ</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>
                            {order.user?.firstName} {order.user?.lastName}
                            <div className="text-sm text-gray-500">{order.user?.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'pending' ? 'destructive' :
                              order.status === 'confirmed' ? 'default' :
                              order.status === 'preparing' ? 'secondary' :
                              order.status === 'ready' ? 'outline' :
                              order.status === 'delivered' ? 'default' : 'destructive'
                            }>
                              {order.status === 'pending' ? 'Ожидает' :
                               order.status === 'confirmed' ? 'Подтвержден' :
                               order.status === 'preparing' ? 'Готовится' :
                               order.status === 'ready' ? 'Готов' :
                               order.status === 'delivered' ? 'Выдан' : 'Отменен'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(parseFloat(order.totalAmount))}</TableCell>
                          <TableCell>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(newStatus) => 
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: newStatus
                                })
                              }
                            >
                              <SelectTrigger className="w-[140px]">
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
                        Управление учетными записями и ролями пользователей
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
                          <TableHead>Имя</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Роль</TableHead>
                          <TableHead>Дата регистрации</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell className="font-medium">
                              {userItem.firstName} {userItem.lastName}
                            </TableCell>
                            <TableCell>{userItem.email}</TableCell>
                            <TableCell>
                              <Badge variant={
                                userItem.role === 'admin' ? 'default' :
                                userItem.role === 'worker' ? 'secondary' : 'outline'
                              }>
                                {userItem.role === 'admin' ? 'Администратор' :
                                 userItem.role === 'worker' ? 'Работник' : 'Клиент'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingUser(userItem)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {userItem.id !== user.id && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Удалить пользователя</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Вы уверены, что хотите удалить пользователя "{userItem.firstName} {userItem.lastName}"?
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
      </div>

      {/* Add/Edit Product Dialog */}
      <ProductFormDialog
        open={showAddProduct || !!editingProduct}
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

      {/* Add/Edit Category Dialog */}
      <CategoryFormDialog
        open={showAddCategory || !!editingCategory}
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

      {/* Add/Edit User Dialog */}
      {user.role === 'admin' && (
        <UserFormDialog
          open={showAddUser || !!editingUser}
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
  );
}

// Product Form Dialog Component
function ProductFormDialog({ 
  open, 
  onClose, 
  categories, 
  product, 
  onSubmit 
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryWithProducts[];
  product?: Product | null;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricePerKg: '',
    categoryId: '',
    imageUrl: '',
    isAvailable: true,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        pricePerKg: product.pricePerKg,
        categoryId: product.categoryId.toString(),
        imageUrl: product.imageUrl || '',
        isAvailable: product.isAvailable,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        pricePerKg: '',
        categoryId: '',
        imageUrl: '',
        isAvailable: true,
      });
    }
  }, [product, open]);

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      categoryId: parseInt(formData.categoryId),
      pricePerKg: formData.pricePerKg,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? 'Редактировать товар' : 'Добавить товар'}</DialogTitle>
          <DialogDescription>
            {product ? 'Изменить информацию о товаре' : 'Создать новый товар в меню'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Название блюда"
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание блюда"
            />
          </div>
          <div>
            <Label htmlFor="categoryId">Категория</Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="pricePerKg">Цена за кг (₪)</Label>
            <Input
              id="pricePerKg"
              type="number"
              step="0.01"
              value={formData.pricePerKg}
              onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="imageUrl">URL изображения</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isAvailable"
              checked={formData.isAvailable}
              onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
            />
            <Label htmlFor="isAvailable">Доступен в меню</Label>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.pricePerKg || !formData.categoryId}
          >
            {product ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Category Form Dialog Component
function CategoryFormDialog({ 
  open, 
  onClose, 
  category, 
  onSubmit 
}: {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🍽️',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon || '🍽️',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '🍽️',
      });
    }
  }, [category, open]);

  const iconOptions = ['🥗', '🍖', '🍚', '🍲', '🥧', '🍰', '🍽️', '🥘', '🍱', '🥙'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Редактировать категорию' : 'Добавить категорию'}</DialogTitle>
          <DialogDescription>
            {category ? 'Изменить информацию о категории' : 'Создать новую категорию меню'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Название категории"
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание категории"
            />
          </div>
          <div>
            <Label>Иконка</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {iconOptions.map((icon) => (
                <Button
                  key={icon}
                  variant={formData.icon === icon ? "default" : "outline"}
                  className="h-12 text-2xl"
                  onClick={() => setFormData({ ...formData, icon })}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={() => onSubmit(formData)}
            disabled={!formData.name}
          >
            {category ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// User Form Dialog Component
function UserFormDialog({ 
  open, 
  onClose, 
  user, 
  onSubmit 
}: {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'customer' as 'admin' | 'worker' | 'customer',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role as 'admin' | 'worker' | 'customer',
      });
    } else {
      setFormData({
        id: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'customer',
      });
    }
  }, [user, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Редактировать пользователя' : 'Добавить пользователя'}</DialogTitle>
          <DialogDescription>
            {user ? 'Изменить информацию о пользователе' : 'Создать новую учетную запись'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!user && (
            <div>
              <Label htmlFor="id">ID пользователя</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="Уникальный ID"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <Label htmlFor="firstName">Имя</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Имя"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Фамилия</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Фамилия"
            />
          </div>
          <div>
            <Label htmlFor="role">Роль</Label>
            <Select value={formData.role} onValueChange={(value: 'admin' | 'worker' | 'customer') => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Клиент</SelectItem>
                <SelectItem value="worker">Работник</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={() => onSubmit(formData)}
            disabled={!formData.email || (!user && !formData.id)}
          >
            {user ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}