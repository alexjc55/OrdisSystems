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
import { formatCurrency, formatWeight } from "@/lib/currency";
import { Package, Utensils, ShoppingCart, AlertTriangle, CheckCircle, Clock, X, Edit2, Trash2, Plus, TrendingUp, Users } from "lucide-react";
import type { CategoryWithProducts, OrderWithItems, ProductWithCategory, Product, Category } from "@shared/schema";

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Redirect to home if not authenticated or not admin
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const totalProducts = categories?.reduce((acc, cat) => acc + cat.products.length, 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((acc, order) => acc + parseFloat(order.totalAmount), 0) || 0;
  const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-gray-900 mb-2">
            Панель Администратора
          </h1>
          <p className="text-gray-600">
            Управление магазином и мониторинг активности
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего Товаров</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Активных товаров в каталоге
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего Заказов</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {pendingOrders} ожидают
                </Badge>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Выручка</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Общая сумма заказов
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Категории</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Активных категорий
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-poppins font-semibold">Управление Товарами</h2>
              <Button onClick={() => setShowProductForm(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Добавить Товар
              </Button>
            </div>
            
            <div className="grid gap-4">
              {categories?.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </span>
                      <Badge variant="secondary">
                        {category.products.length} товаров
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.products.length === 0 ? (
                        <p className="text-gray-500 text-sm">Товары отсутствуют</p>
                      ) : (
                        category.products.map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{product.name}</span>
                              <div className="text-sm text-gray-600">
                                {formatCurrency(parseFloat(product.pricePerKg))} за кг
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={product.stockStatus === 'in_stock' ? 'default' : 
                                        product.stockStatus === 'low_stock' ? 'destructive' : 'secondary'}
                              >
                                {product.stockStatus === 'in_stock' ? 'В наличии' : 
                                 product.stockStatus === 'low_stock' ? 'Мало' : 'Нет в наличии'}
                              </Badge>
                              <Button size="sm" variant="outline">
                                Изменить
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-poppins font-semibold">Управление Категориями</h2>
              <Button onClick={() => setShowCategoryForm(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Добавить Категорию
              </Button>
            </div>
            
            <div className="grid gap-4">
              {categories?.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{category.icon}</div>
                        <div>
                          <h3 className="font-poppins font-semibold">{category.name}</h3>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {category.products.length} товаров
                        </Badge>
                        <Button size="sm" variant="outline">
                          Изменить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-6">
            <h2 className="text-2xl font-poppins font-semibold">Управление Заказами</h2>
            
            <div className="space-y-4">
              {orders?.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">Заказы отсутствуют</p>
                  </CardContent>
                </Card>
              ) : (
                orders?.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Заказ #{order.id}</CardTitle>
                        <Badge 
                          variant={
                            order.status === 'pending' ? 'destructive' :
                            order.status === 'confirmed' ? 'default' :
                            order.status === 'delivered' ? 'default' : 'secondary'
                          }
                        >
                          {order.status === 'pending' ? 'Ожидает' :
                           order.status === 'confirmed' ? 'Подтвержден' :
                           order.status === 'preparing' ? 'Готовится' :
                           order.status === 'ready' ? 'Готов' :
                           order.status === 'delivered' ? 'Доставлен' : 'Отменен'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {order.user.firstName} {order.user.lastName} • {new Date(order.createdAt!).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product.name} × {parseFloat(item.quantity)} кг</span>
                            <span>{formatCurrency(parseFloat(item.totalPrice))}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Итого:</span>
                          <span>{formatCurrency(parseFloat(order.totalAmount))}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <Button size="sm" variant="outline">
                          Подтвердить
                        </Button>
                        <Button size="sm" variant="outline">
                          Отменить
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-poppins font-semibold">Настройки Магазина</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Общие Настройки</CardTitle>
                <CardDescription>
                  Основная информация о магазине
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Название магазина</label>
                    <p className="text-sm text-gray-600">{settings?.storeName || "Не задано"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Стоимость доставки</label>
                    <p className="text-sm text-gray-600">{formatCurrency(parseFloat(settings?.deliveryFee || "0"))}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Минимальная сумма заказа</label>
                    <p className="text-sm text-gray-600">{formatCurrency(parseFloat(settings?.minOrderAmount || "0"))}</p>
                  </div>
                  <Button variant="outline">
                    Изменить Настройки
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Forms */}
      {showProductForm && (
        <ProductForm 
          categories={categories || []}
          onClose={() => setShowProductForm(false)}
        />
      )}
      
      {showCategoryForm && (
        <CategoryForm 
          onClose={() => setShowCategoryForm(false)}
        />
      )}
    </div>
  );
}
