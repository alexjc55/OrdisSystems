/**
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAdminTranslation } from "@/hooks/use-language";
import { LANGUAGES } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
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
import { CustomSelect, CustomSelectItem } from "@/components/ui/custom-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getUnitLabel, formatDeliveryTimeRange, type ProductUnit } from "@/lib/currency";
import { insertStoreSettingsSchema, type StoreSettings } from "@shared/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import ThemeManager from "@/components/admin/theme-manager";
import { 
  Package, 
  Plus, 
  Edit2, 
  Edit,
  Trash2, 
  Users, 
  ShoppingCart, 
  Settings, 
  Eye, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  ChevronDown,
  ChevronUp,
  Store,
  Palette,
  Calendar,
  Truck,
  CreditCard,
  MoreHorizontal,
  Save,
  Upload,
  X
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useAdminTranslation();
  const queryClient = useQueryClient();

  // State for collapsible sections
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);

  // Query for orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
    enabled: !!user
  });

  // Query for products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/admin/products'],
    enabled: !!user
  });

  // Query for users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user
  });

  // Query for categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
    enabled: !!user
  });

  // Order status update mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Статус обновлен",
        description: "Статус заказа успешно изменен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Админ-панель</h1>
            <p className="text-gray-600">Управление магазином</p>
          </div>
          <LanguageSwitcher />
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
            <TabsTrigger value="themes">Темы</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Управление заказами
                </CardTitle>
                <CardDescription>
                  Просмотр и управление заказами клиентов
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div>Загрузка заказов...</div>
                ) : orders?.data && orders.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>№ заказа</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead>Сумма</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.data.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell>#{order.id}</TableCell>
                          <TableCell>{order.user?.email || 'Гость'}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(order.totalAmount))}</TableCell>
                          <TableCell>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}
                          </TableCell>
                          <TableCell>
                            <CustomSelect
                              value={order.status}
                              onValueChange={(newStatus: string) => 
                                updateOrderStatusMutation.mutate({
                                  orderId: order.id,
                                  status: newStatus
                                })
                              }
                              className="w-[140px]"
                            >
                              <CustomSelectItem value="pending">Ожидает</CustomSelectItem>
                              <CustomSelectItem value="confirmed">Подтвержден</CustomSelectItem>
                              <CustomSelectItem value="preparing">Готовится</CustomSelectItem>
                              <CustomSelectItem value="ready">Готов</CustomSelectItem>
                              <CustomSelectItem value="delivered">Выдан</CustomSelectItem>
                              <CustomSelectItem value="cancelled">Отменен</CustomSelectItem>
                            </CustomSelect>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
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

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Управление товарами
                </CardTitle>
                <CardDescription>
                  Добавление, редактирование и удаление товаров
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div>Загрузка товаров...</div>
                ) : products?.data && products.data.length > 0 ? (
                  <div className="space-y-4">
                    {products.data.map((product: any) => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover rounded" />
                          )}
                          <div>
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-sm text-gray-600">{product.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{product.category?.name}</Badge>
                              <span className="text-sm font-medium">{formatCurrency(parseFloat(product.pricePerKg))}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
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

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Управление пользователями
                </CardTitle>
                <CardDescription>
                  Просмотр и управление пользователями системы
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div>Загрузка пользователей...</div>
                ) : users?.data && users.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Заказов</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.data.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.username || user.firstName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? 'Администратор' : 
                               user.role === 'worker' ? 'Работник' : 'Клиент'}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.orderCount || 0}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
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

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Настройки магазина
                </CardTitle>
                <CardDescription>
                  Основные настройки и конфигурация магазина
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Основная информация</h3>
                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Название магазина</label>
                        <Input placeholder="Название вашего магазина" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Описание</label>
                        <Textarea placeholder="Описание магазина" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Контактная информация</h3>
                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Телефон</label>
                        <Input placeholder="+972-xx-xxx-xxxx" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <Input type="email" placeholder="info@example.com" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Управление темами
                </CardTitle>
                <CardDescription>
                  Настройка внешнего вида магазина
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}