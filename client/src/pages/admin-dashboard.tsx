import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getUnitLabel, type ProductUnit } from "@/lib/currency";
import { insertStoreSettingsSchema, type StoreSettings } from "@shared/schema";
import OrganizedStoreSettings from "@/components/admin/organized-store-settings";
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2,
  ChevronDown,
  Users, 
  ShoppingCart, 
  Utensils,
  Save,
  Search,
  Filter,
  Menu,
  ChevronUp,
  Store,
  Upload,
  Clock,
  CreditCard,
  Truck,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Columns,
  Calendar,
  MapPin,
  Phone,
  User,
  Mail,
  MoreVertical,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";

interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  categoryId?: number;
  status?: string;
  sortField?: string;
  sortDirection?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function useStatusChangeHandler() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Статус обновлен",
        description: "Статус заказа успешно изменен",
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
}

function OrderCard({ order, onEdit, onStatusChange, onCancelOrder }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void }) {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Ожидает", color: "bg-yellow-100 text-yellow-800" },
      confirmed: { label: "Подтвержден", color: "bg-blue-100 text-blue-800" },
      preparing: { label: "Готовится", color: "bg-orange-100 text-orange-800" },
      ready: { label: "Готов", color: "bg-green-100 text-green-800" },
      delivered: { label: "Доставлен", color: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Отменен", color: "bg-red-100 text-red-800" },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: "bg-gray-100 text-gray-800" };
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: "confirmed",
      confirmed: "preparing", 
      preparing: "ready",
      ready: "delivered"
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const statusLabels = {
      pending: "Подтвердить",
      confirmed: "В работу",
      preparing: "Готов",
      ready: "Доставлен"
    };
    return statusLabels[currentStatus as keyof typeof statusLabels];
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('972')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
      return `+972${cleaned.slice(1)}`;
    }
    return `+972${cleaned}`;
  };

  const handlePhoneClick = (phone: string) => {
    const formattedPhone = formatPhoneNumber(phone);
    window.open(`tel:${formattedPhone}`, '_self');
  };

  const totalPrice = order.items?.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0;
  const nextStatus = getNextStatus(order.status);
  const nextStatusLabel = getNextStatusLabel(order.status);

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Заказ #{order.id}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {new Date(order.createdAt).toLocaleString('ru-RU')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(order)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <DropdownMenuItem 
                    onClick={() => onCancelOrder(order.id)}
                    className="text-red-600"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Отменить заказ
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(totalPrice)}
            </div>
          </div>
          
          {order.customerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <button
                onClick={() => handlePhoneClick(order.customerPhone)}
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {formatPhoneNumber(order.customerPhone)}
              </button>
            </div>
          )}
          
          {order.deliveryAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{order.deliveryAddress}</span>
            </div>
          )}

          <div className="border-t pt-3">
            <h4 className="font-medium mb-2">Товары:</h4>
            <div className="space-y-1">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.product.name} x {item.quantity}{getUnitLabel(item.product.unit)}</span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {nextStatus && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => onStatusChange({ orderId: order.id, status: nextStatus })}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {nextStatusLabel}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderEditForm({ order, onClose, onSave }: { order: any, onClose: () => void, onSave: () => void }) {
  const [editedOrder, setEditedOrder] = useState({
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    deliveryAddress: order.deliveryAddress || '',
    items: order.items || []
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Заказ обновлен",
        description: "Изменения успешно сохранены",
      });
      onSave();
      onClose();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить заказ",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateOrderMutation.mutate(editedOrder);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать заказ #{order.id}</DialogTitle>
          <DialogDescription>
            Внесите необходимые изменения в заказ
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Имя клиента</label>
              <Input
                value={editedOrder.customerName}
                onChange={(e) => setEditedOrder({ ...editedOrder, customerName: e.target.value })}
                placeholder="Имя клиента"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Телефон</label>
              <Input
                value={editedOrder.customerPhone}
                onChange={(e) => setEditedOrder({ ...editedOrder, customerPhone: e.target.value })}
                placeholder="Телефон"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Адрес доставки</label>
            <Textarea
              value={editedOrder.deliveryAddress}
              onChange={(e) => setEditedOrder({ ...editedOrder, deliveryAddress: e.target.value })}
              placeholder="Адрес доставки"
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">Товары в заказе</h4>
            <div className="space-y-2">
              {editedOrder.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <span className="flex-1">{item.product.name}</span>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...editedOrder.items];
                      newItems[index].quantity = parseFloat(e.target.value);
                      setEditedOrder({ ...editedOrder, items: newItems });
                    }}
                    className="w-20"
                    min="0"
                    step="0.1"
                  />
                  <span>{getUnitLabel(item.product.unit)}</span>
                  <span className="w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateOrderMutation.isPending}
          >
            {updateOrderMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancellationReasonDialog({ 
  open, 
  orderId, 
  onClose, 
  onConfirm, 
  cancellationReasons 
}: {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  cancellationReasons: string[];
}) {
  const [selectedReason, setSelectedReason] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelectedReason("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg">Причина отмены заказа</DialogTitle>
          <DialogDescription className="text-sm">
            Выберите причину отмены заказа #{orderId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {cancellationReasons.map((reason, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`reason-${index}`}
                name="cancellation-reason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor={`reason-${index}`} className="text-sm cursor-pointer">
                {reason}
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose} className="text-sm">
            Отмена
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedReason}
            className="text-sm bg-red-600 text-white hover:bg-red-700"
          >
            Отменить заказ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [cancellationDialog, setCancellationDialog] = useState<{
    open: boolean;
    orderId: number | null;
  }>({ open: false, orderId: null });

  // Product and category management states
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  
  // View mode for orders (kanban or table)
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const cancellationReasons = [
    "Клиент отменил заказ",
    "Товар закончился",
    "Проблемы с доставкой",
    "Технические проблемы",
    "Другое"
  ];

  // Orders data
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Products data
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Categories data
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Store settings data
  const { data: storeSettings, isLoading: storeSettingsLoading, error: storeSettingsError } = useQuery({
    queryKey: ["/api/store-settings"],
  });



  const statusChangeMutation = useStatusChangeHandler();

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason: string }) => {
      return await apiRequest(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Заказ отменен",
        description: "Заказ успешно отменен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отменить заказ",
        variant: "destructive",
      });
    },
  });

  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/store-settings", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
      toast({
        title: "Настройки сохранены",
        description: "Настройки магазина успешно обновлены",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (data: { orderId: number; status: string }) => {
    statusChangeMutation.mutate(data);
  };

  const handleCancelOrder = (orderId: number) => {
    setCancellationDialog({ open: true, orderId });
  };

  const handleConfirmCancellation = (reason: string) => {
    if (cancellationDialog.orderId) {
      cancelOrderMutation.mutate({ orderId: cancellationDialog.orderId, reason });
    }
  };

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>
              Вы должны войти в систему для доступа к панели администратора
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/api/login">Войти</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Панель администратора</h1>
          <p className="text-gray-600">Управление заказами и настройками магазина</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Управление заказами
                </CardTitle>
                <CardDescription>
                  Просмотр и управление всеми заказами магазина
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Поиск по имени клиента или номеру заказа..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Фильтр по статусу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="pending">Ожидает</SelectItem>
                      <SelectItem value="confirmed">Подтвержден</SelectItem>
                      <SelectItem value="preparing">Готовится</SelectItem>
                      <SelectItem value="ready">Готов</SelectItem>
                      <SelectItem value="delivered">Доставлен</SelectItem>
                      <SelectItem value="cancelled">Отменен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Заказы не найдены
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order: any) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onEdit={setEditingOrder}
                        onStatusChange={handleStatusChange}
                        onCancelOrder={handleCancelOrder}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Управление товарами
                    </CardTitle>
                    <CardDescription>
                      Добавление, редактирование и удаление товаров
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingProduct(null);
                    setShowProductDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Название</TableHead>
                          <TableHead>Категория</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Единица</TableHead>
                          <TableHead>Доступность</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product: any) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.category?.name || 'Без категории'}</TableCell>
                            <TableCell>{formatCurrency(product.price)}</TableCell>
                            <TableCell>{getUnitLabel(product.unit)}</TableCell>
                            <TableCell>
                              <Badge variant={product.isAvailable ? "default" : "secondary"}>
                                {product.isAvailable ? "Доступен" : "Недоступен"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setShowProductDialog(true);
                                  }}
                                >
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
                                      <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Это действие нельзя отменить. Товар будет удален навсегда.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          // Delete product logic here
                                        }}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5" />
                      Управление категориями
                    </CardTitle>
                    <CardDescription>
                      Добавление, редактирование и удаление категорий товаров
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingCategory(null);
                    setShowCategoryDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить категорию
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category: any) => (
                      <Card key={category.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setShowCategoryDialog(true);
                                }}
                              >
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
                                    <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Это действие нельзя отменить. Категория и все товары в ней будут удалены.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        // Delete category logic here
                                      }}
                                    >
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <CardDescription>{category.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-600">
                            Товаров: {category.products?.length || 0}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Настройки магазина
                </CardTitle>
                <CardDescription>
                  Управление информацией о магазине
                </CardDescription>
              </CardHeader>
              <CardContent>
                {storeSettingsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : storeSettingsError ? (
                  <div className="text-center py-8 text-red-500">
                    Ошибка загрузки настроек: {storeSettingsError.message}
                  </div>
                ) : storeSettings ? (
                  <OrganizedStoreSettings
                    storeSettings={storeSettings}
                    onSubmit={(data) => updateStoreSettingsMutation.mutate(data)}
                    isLoading={updateStoreSettingsMutation.isPending}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Настройки магазина не найдены
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {editingOrder && (
        <OrderEditForm
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={() => {}}
        />
      )}

      <CancellationReasonDialog
        open={cancellationDialog.open}
        orderId={cancellationDialog.orderId}
        onClose={() => setCancellationDialog({ open: false, orderId: null })}
        onConfirm={handleConfirmCancellation}
        cancellationReasons={cancellationReasons}
      />
    </div>
  );
}