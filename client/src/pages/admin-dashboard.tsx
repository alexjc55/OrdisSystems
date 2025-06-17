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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, formatWeight } from "@/lib/currency";
import { Package, Utensils, ShoppingCart, AlertTriangle, CheckCircle, Clock, X, Edit2, Trash2, Plus, TrendingUp, Users, Eye, EyeOff } from "lucide-react";
import type { CategoryWithProducts, OrderWithItems, ProductWithCategory, Product, Category } from "@shared/schema";

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить наличие товара",
        variant: "destructive",
      });
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
      toast({
        title: "Заказ обновлен",
        description: "Статус заказа изменен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус заказа",
        variant: "destructive",
      });
    },
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-gray-900 mb-2">
            Панель Управления eDAHouse
          </h1>
          <p className="text-gray-600">
            Управление меню, контроль наличия и обработка заказов
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

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Управление Меню</TabsTrigger>
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          </TabsList>

          {/* Products Management */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Контроль Наличия Блюд
                </CardTitle>
                <CardDescription>
                  Управляйте доступностью блюд в меню. Недоступные блюда скрыты от клиентов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories?.map((category) => (
                    <div key={category.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <span className="text-2xl">{category.icon}</span>
                        {category.name}
                        <Badge variant="secondary">{category.products.length} блюд</Badge>
                      </h3>
                      
                      <div className="grid gap-3">
                        {category.products.map((product) => {
                          const productDetails = allProducts?.find(p => p.id === product.id);
                          if (!productDetails) return null;
                          
                          return (
                            <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="font-medium">{product.name}</div>
                                  <Badge variant={productDetails.isAvailable ? "default" : "destructive"}>
                                    {productDetails.isAvailable ? "В наличии" : "Нет в наличии"}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {formatCurrency(parseFloat(product.pricePerKg))} за кг
                                </div>
                                {product.description && (
                                  <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                                    {product.description}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  variant={productDetails.isAvailable ? "outline" : "default"}
                                  size="sm"
                                  onClick={() => toggleAvailabilityMutation.mutate({
                                    productId: product.id,
                                    isAvailable: !productDetails.isAvailable
                                  })}
                                  disabled={toggleAvailabilityMutation.isPending}
                                >
                                  {productDetails.isAvailable ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-1" />
                                      Скрыть
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Показать
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
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
                          <TableCell>{new Date(order.createdAt).toLocaleDateString('ru-RU')}</TableCell>
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

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Популярные Категории</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories?.map((category) => (
                      <div key={category.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                        <Badge variant="secondary">
                          {category.products.filter(p => allProducts?.find(ap => ap.id === p.id)?.isAvailable).length} доступно
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Статистика Заказов</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Всего заказов:</span>
                      <span className="font-semibold">{totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>В ожидании:</span>
                      <span className="font-semibold text-orange-600">{pendingOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Общая выручка:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Средний чек:</span>
                      <span className="font-semibold">
                        {totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : formatCurrency(0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}