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
import { formatCurrency, formatWeight } from "@/lib/currency";
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
    queryKey: ["/api/orders", "my"],
    queryFn: async () => {
      const res = await fetch("/api/orders/my", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
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
    const variants = {
      pending: { variant: "destructive" as const, label: "Ожидает" },
      confirmed: { variant: "default" as const, label: "Подтвержден" },
      preparing: { variant: "secondary" as const, label: "Готовится" },
      ready: { variant: "outline" as const, label: "Готов" },
      delivered: { variant: "default" as const, label: "Выдан" },
      cancelled: { variant: "destructive" as const, label: "Отменен" },
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="addresses">Адреса</TabsTrigger>
            <TabsTrigger value="orders">История Заказов</TabsTrigger>
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
                              {order.items.slice(0, 2).map((item, index) => (
                                <div key={index} className="text-sm">
                                  {item.product.name} ({formatWeight(parseFloat(item.quantity))})
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{order.items.length - 2} еще...
                                </div>
                              )}
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
      </div>
    </div>
  );
}