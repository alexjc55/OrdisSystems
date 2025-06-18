import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatQuantity, getUnitShortLabel, type ProductUnit } from "@/lib/currency";
import { User, ShoppingCart, Clock, Package, CheckCircle, Plus, Edit, Trash2, MapPin } from "lucide-react";
import type { OrderWithItems, UserAddress } from "@shared/schema";

export default function Profile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    address: "",
    isDefault: false
  });
  const [phoneForm, setPhoneForm] = useState({
    phone: user?.phone || ""
  });
  const [isPhoneEditing, setIsPhoneEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Вход в систему для просмотра профиля...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: orders } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/my"],
    enabled: !!user,
  });

  const { data: userAddresses = [] } = useQuery<UserAddress[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  // Address mutations
  const createAddressMutation = useMutation({
    mutationFn: async (addressData: typeof addressForm) => {
      await apiRequest("POST", "/api/addresses", addressData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setIsAddressDialogOpen(false);
      setAddressForm({ label: "", address: "", isDefault: false });
      toast({
        title: "Успешно",
        description: "Адрес добавлен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить адрес",
        variant: "destructive",
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof addressForm }) => {
      await apiRequest("PATCH", `/api/addresses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setIsAddressDialogOpen(false);
      setEditingAddress(null);
      setAddressForm({ label: "", address: "", isDefault: false });
      toast({
        title: "Успешно",
        description: "Адрес обновлен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить адрес",
        variant: "destructive",
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({
        title: "Успешно",
        description: "Адрес удален",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить адрес",
        variant: "destructive",
      });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/addresses/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({
        title: "Успешно",
        description: "Адрес по умолчанию изменен",
      });
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      await apiRequest("PATCH", "/api/profile", { phone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsPhoneEditing(false);
      toast({
        title: "Успешно",
        description: "Телефон обновлен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить телефон",
        variant: "destructive",
      });
    },
  });

  const handleEditAddress = (address: UserAddress) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      address: address.address,
      isDefault: Boolean(address.isDefault),
    });
    setIsAddressDialogOpen(true);
  };

  const handleSaveAddress = () => {
    if (editingAddress) {
      updateAddressMutation.mutate({ id: editingAddress.id, data: addressForm });
    } else {
      createAddressMutation.mutate(addressForm);
    }
  };

  const handleViewOrderDetails = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  const parseOrderDiscounts = (customerNotes: string) => {
    try {
      const discountMatch = customerNotes.match(/\[DISCOUNTS:(.*?)\]/);
      if (discountMatch) {
        return JSON.parse(discountMatch[1]);
      }
    } catch (error) {
      console.error('Error parsing discounts:', error);
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'ready': return 'bg-green-100 text-green-800 border-green-200';
        case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'pending': return 'Ожидает';
        case 'confirmed': return 'Подтвержден';
        case 'preparing': return 'Готовится';
        case 'ready': return 'Готов';
        case 'delivered': return 'Выдан';
        case 'cancelled': return 'Отменен';
        default: return status;
      }
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((acc, order) => acc + parseFloat(order.totalAmount), 0) || 0;
  const activeOrders = orders?.filter(order => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  ).length || 0;



  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-gray-900 mb-2">
            Мой Профиль
          </h1>
          <p className="text-gray-600">
            Управление профилем и история заказов
          </p>
        </div>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего Заказов</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {activeOrders} активных
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Потрачено</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
              <p className="text-xs text-muted-foreground">
                За все время
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Статус</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">Постоянный клиент</div>
              <p className="text-xs text-muted-foreground">
                Член с {new Date(user.createdAt || '').toLocaleDateString('ru-RU')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-fit">
            <TabsTrigger value="profile" className="whitespace-nowrap px-4 py-1.5 text-sm font-medium">Профиль</TabsTrigger>
            <TabsTrigger value="addresses" className="whitespace-nowrap px-4 py-1.5 text-sm font-medium">Адреса</TabsTrigger>
            <TabsTrigger value="orders" className="whitespace-nowrap px-4 py-1.5 text-sm font-medium">История Заказов</TabsTrigger>
          </TabsList>

          {/* Profile Information */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Информация о профиле
                </CardTitle>
                <CardDescription>
                  Ваши личные данные и контактная информация
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Имя</label>
                      <div className="mt-1 text-sm text-gray-900">{user.firstName || 'Не указано'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Фамилия</label>
                      <div className="mt-1 text-sm text-gray-900">{user.lastName || 'Не указано'}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 text-sm text-gray-900">{user.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Телефон</label>
                      <div className="mt-1 flex items-center gap-2">
                        {isPhoneEditing ? (
                          <>
                            <Input
                              type="tel"
                              placeholder="+972-XX-XXX-XXXX"
                              value={phoneForm.phone}
                              onChange={(e) => setPhoneForm({ phone: e.target.value })}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => updatePhoneMutation.mutate(phoneForm.phone)}
                              disabled={updatePhoneMutation.isPending}
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                              Сохранить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsPhoneEditing(false);
                                setPhoneForm({ phone: user?.phone || "" });
                              }}
                            >
                              Отмена
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-900 flex-1">
                              {user.phone || 'Не указан'}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPhoneForm({ phone: user?.phone || "" });
                                setIsPhoneEditing(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Изменить
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Дата регистрации</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {new Date(user.createdAt || '').toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Быстрые действия</h3>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => window.location.href = '/'}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      style={{ backgroundColor: 'hsl(16, 100%, 60%)' }}
                    >
                      Перейти к меню
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/api/logout'}>
                      Выйти из аккаунта
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Management */}
          <TabsContent value="addresses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Управление Адресами
                </CardTitle>
                <CardDescription>
                  Добавляйте и управляйте адресами доставки
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => {
                          setEditingAddress(null);
                          setAddressForm({ label: "", address: "", isDefault: false });
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить адрес
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingAddress ? "Редактировать адрес" : "Добавить новый адрес"}
                        </DialogTitle>
                        <DialogDescription>
                          Введите информацию об адресе доставки
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="label">Название адреса</Label>
                          <Input
                            id="label"
                            placeholder="Дом, Работа, Офис..."
                            value={addressForm.label}
                            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="address">Полный адрес</Label>
                          <Textarea
                            id="address"
                            placeholder="Улица, дом, квартира, этаж..."
                            value={addressForm.address}
                            onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                            className="min-h-[80px]"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="default"
                            checked={addressForm.isDefault}
                            onCheckedChange={(checked) => setAddressForm({ ...addressForm, isDefault: checked })}
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                          />
                          <Label htmlFor="default">Сделать адресом по умолчанию</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddressDialogOpen(false)}>
                          Отмена
                        </Button>
                        <Button 
                          onClick={handleSaveAddress}
                          disabled={!addressForm.label.trim() || !addressForm.address.trim()}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          {editingAddress ? "Сохранить" : "Добавить"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {userAddresses.length > 0 ? (
                  <div className="space-y-4">
                    {userAddresses.map((address) => (
                      <Card key={address.id} className={`${address.isDefault ? 'border-orange-200 bg-orange-50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900">{address.label}</h4>
                                {address.isDefault && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    По умолчанию
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{address.address}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {!address.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDefaultAddressMutation.mutate(address.id)}
                                  disabled={setDefaultAddressMutation.isPending}
                                >
                                  Сделать основным
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAddress(address)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAddressMutation.mutate(address.id)}
                                disabled={deleteAddressMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет сохраненных адресов</h3>
                    <p className="text-gray-600 mb-4">Добавьте адрес доставки для быстрого оформления заказов</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order History */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  История Заказов
                </CardTitle>
                <CardDescription>
                  Все ваши заказы и их статусы
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Заказ</TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Товары</TableHead>
                        <TableHead>Сумма</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '—'}
                            <div className="text-xs text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('ru-RU', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '—'}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <button
                                onClick={() => handleViewOrderDetails(order)}
                                className="text-left hover:text-orange-600 transition-colors"
                              >
                                {order.items.slice(0, 2).map((item, index) => (
                                  <div key={index} className="text-sm">
                                    {item.product.name} ({formatQuantity(parseFloat(item.quantity), (item.product.unit || "100g") as ProductUnit)})
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{order.items.length - 2} еще...
                                  </div>
                                )}
                                <div className="text-xs text-orange-600 mt-1">
                                  Подробнее →
                                </div>
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(parseFloat(order.totalAmount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет заказов</h3>
                    <p className="text-gray-500 mb-4">Вы еще не делали заказов</p>
                    <Button 
                      onClick={() => window.location.href = '/'}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      style={{ backgroundColor: 'hsl(16, 100%, 60%)' }}
                    >
                      Начать покупки
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Modal */}
        <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Детали заказа #{selectedOrder?.id}</DialogTitle>
              <DialogDescription>
                Полная информация о заказе от {selectedOrder?.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Status and Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Информация о заказе</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Статус:</span>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Дата создания:</span>
                        <span className="text-sm">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU') : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Способ оплаты:</span>
                        <span className="text-sm">{selectedOrder.paymentMethod === 'cash' ? 'Наличные' : 'Карта'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Доставка</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Телефон:</span>
                        <span className="text-sm">{selectedOrder.customerPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Адрес:</span>
                        <span className="text-sm max-w-48 text-right">{selectedOrder.deliveryAddress}</span>
                      </div>
                      {selectedOrder.deliveryDate && selectedOrder.deliveryTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Время доставки:</span>
                          <span className="text-sm">{selectedOrder.deliveryDate} {selectedOrder.deliveryTime}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Товары в заказе</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Товар</TableHead>
                          <TableHead>Количество</TableHead>
                          <TableHead>Цена за единицу</TableHead>
                          <TableHead>Скидка</TableHead>
                          <TableHead className="text-right">Итого</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => {
                          const discounts = parseOrderDiscounts(selectedOrder.customerNotes || '');
                          const itemDiscount = discounts?.itemDiscounts?.[String(index + 1)];
                          const originalPrice = parseFloat(item.totalPrice);
                          let finalPrice = originalPrice;
                          
                          if (itemDiscount) {
                            if (itemDiscount.type === 'percentage') {
                              finalPrice = originalPrice * (1 - itemDiscount.value / 100);
                            } else if (itemDiscount.type === 'amount') {
                              finalPrice = Math.max(0, originalPrice - itemDiscount.value);
                            }
                          }

                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.product.name}</div>
                                  <div className="text-sm text-gray-500">{item.product.description}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatQuantity(parseFloat(item.quantity), (item.product.unit || "100g") as ProductUnit)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(item.product.price)} {getUnitShortLabel((item.product.unit || "100g") as ProductUnit)}
                              </TableCell>
                              <TableCell>
                                {itemDiscount ? (
                                  <span className="text-red-600">
                                    -{itemDiscount.type === 'percentage' ? `${itemDiscount.value}%` : formatCurrency(itemDiscount.value)}
                                  </span>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end">
                                  {itemDiscount && (
                                    <span className="text-xs text-gray-500 line-through">
                                      {formatCurrency(originalPrice)}
                                    </span>
                                  )}
                                  <span className={itemDiscount ? 'text-red-600 font-medium' : ''}>
                                    {formatCurrency(finalPrice)}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Order Total */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      {(() => {
                        const discounts = parseOrderDiscounts(selectedOrder.customerNotes || '');
                        const subtotal = selectedOrder.items.reduce((sum, item, index) => {
                          let itemPrice = parseFloat(item.totalPrice);
                          const itemDiscount = discounts?.itemDiscounts?.[String(index + 1)];
                          
                          if (itemDiscount) {
                            if (itemDiscount.type === 'percentage') {
                              itemPrice = itemPrice * (1 - itemDiscount.value / 100);
                            } else if (itemDiscount.type === 'amount') {
                              itemPrice = Math.max(0, itemPrice - itemDiscount.value);
                            }
                          }
                          return sum + itemPrice;
                        }, 0);
                        
                        const deliveryFee = parseFloat(selectedOrder.deliveryFee);
                        const orderDiscount = discounts?.orderDiscount;
                        let finalSubtotal = subtotal;
                        
                        if (orderDiscount) {
                          if (orderDiscount.type === 'percentage') {
                            finalSubtotal = subtotal * (1 - orderDiscount.value / 100);
                          } else if (orderDiscount.type === 'amount') {
                            finalSubtotal = Math.max(0, subtotal - orderDiscount.value);
                          }
                        }

                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Подытог:</span>
                              <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {orderDiscount && (
                              <div className="flex justify-between text-red-600">
                                <span>Скидка на заказ:</span>
                                <span>
                                  -{orderDiscount.type === 'percentage' ? `${orderDiscount.value}%` : formatCurrency(orderDiscount.value)}
                                  {orderDiscount.type === 'percentage' && ` (${formatCurrency(subtotal - finalSubtotal)})`}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>Доставка:</span>
                              <span>{formatCurrency(deliveryFee)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                              <span>Итого:</span>
                              <span>{formatCurrency(parseFloat(selectedOrder.totalAmount))}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Notes */}
                {selectedOrder.customerNotes && !selectedOrder.customerNotes.includes('[DISCOUNTS:') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Комментарии к заказу</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedOrder.customerNotes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}