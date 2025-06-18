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
  Mail,
  Eye,
  X,
  AlertCircle,
  CheckCircle,
  FileText
} from "lucide-react";

// Product schema for form validation
const productSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  price: z.string().min(1, "Цена обязательна"),
  categoryId: z.string().min(1, "Категория обязательна"),
  unit: z.enum(["100g", "100ml", "piece", "kg"], {
    errorMap: () => ({ message: "Выберите единицу измерения" })
  }),
  isAvailable: z.boolean().default(true),
  isSpecialOffer: z.boolean().default(false),
  discountValue: z.string().optional(),
  image: z.any().optional(),
});

// Category schema for form validation
const categorySchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  icon: z.string().default("🍽️"),
});

// OrderCard component for kanban view
function OrderCard({ order, onEdit, onStatusChange, onCancelOrder }: { 
  order: any, 
  onEdit: (order: any) => void, 
  onStatusChange: (data: { orderId: number, status: string }) => void,
  onCancelOrder: (orderId: number) => void 
}) {
  const getStatusColor = (status: string) => {
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

  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getStatusColor(order.status)}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="font-semibold">#{order.id}</div>
          <Badge variant="outline" className={getStatusColor(order.status)}>
            {order.status === 'pending' && 'Ожидает'}
            {order.status === 'confirmed' && 'Подтвержден'}
            {order.status === 'preparing' && 'Готовится'}
            {order.status === 'ready' && 'Готов'}
            {order.status === 'delivered' && 'Доставлен'}
            {order.status === 'cancelled' && 'Отменен'}
          </Badge>
        </div>

        <div className="space-y-1 text-sm">
          <div className="font-medium">{order.customerName || order.user?.firstName || 'Гость'}</div>
          <div className="text-gray-600">
            <Phone className="h-3 w-3 inline mr-1" />
            <a href={`tel:${order.customerPhone}`} className="hover:underline">
              {order.customerPhone}
            </a>
          </div>
          <div className="font-semibold text-lg">{formatCurrency(order.totalAmount)}</div>
          <div className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        <div className="flex justify-between items-center mt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Статус <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onStatusChange({ orderId: order.id, status: 'pending' })}>
                Ожидает
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange({ orderId: order.id, status: 'confirmed' })}>
                Подтвержден
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange({ orderId: order.id, status: 'preparing' })}>
                Готовится
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange({ orderId: order.id, status: 'ready' })}>
                Готов
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange({ orderId: order.id, status: 'delivered' })}>
                Доставлен
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => onEdit(order)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button variant="outline" size="sm" onClick={() => onCancelOrder(order.id)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Order edit form with comprehensive editing capabilities
function OrderEditForm({ order, onClose, onSave }: { order: any, onClose: () => void, onSave: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderItems, setOrderItems] = useState(order.items || []);
  const [customerInfo, setCustomerInfo] = useState({
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    customerEmail: order.customerEmail || '',
    deliveryAddress: order.deliveryAddress || '',
    notes: order.notes || ''
  });
  const [discountAmount, setDiscountAmount] = useState(order.discountAmount || 0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(order.discountType || 'fixed');

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/orders/${order.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Заказ обновлен",
        description: "Изменения успешно сохранены",
      });
      onSave();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить заказ",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updatedOrder = {
      ...customerInfo,
      discountAmount,
      discountType,
      totalAmount: calculateTotal(),
      items: orderItems
    };
    updateOrderMutation.mutate(updatedOrder);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percentage') {
      return (subtotal * discountAmount) / 100;
    }
    return discountAmount;
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - calculateDiscount());
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    const updated = [...orderItems];
    updated[index].quantity = Math.max(0, newQuantity);
    setOrderItems(updated);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_: any, i: number) => i !== index));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать заказ #{order.id}</DialogTitle>
          <DialogDescription>
            Изменение деталей заказа, товаров и применение скидок
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Информация о клиенте</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Имя клиента</label>
                <Input
                  value={customerInfo.customerName}
                  onChange={(e) => setCustomerInfo({...customerInfo, customerName: e.target.value})}
                  placeholder="Введите имя"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Телефон</label>
                <Input
                  value={customerInfo.customerPhone}
                  onChange={(e) => setCustomerInfo({...customerInfo, customerPhone: e.target.value})}
                  placeholder="+972-XX-XXX-XXXX"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={customerInfo.customerEmail}
                  onChange={(e) => setCustomerInfo({...customerInfo, customerEmail: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Адрес доставки</label>
                <Textarea
                  value={customerInfo.deliveryAddress}
                  onChange={(e) => setCustomerInfo({...customerInfo, deliveryAddress: e.target.value})}
                  placeholder="Введите адрес доставки"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Заметки</label>
                <Textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                  placeholder="Дополнительные заметки к заказу"
                />
              </div>
            </div>
          </div>

          {/* Order Items and Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Товары в заказе</h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {orderItems.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{item.product?.name || item.name}</div>
                    <div className="text-sm text-gray-600">{formatCurrency(item.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount Section */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Скидка</h4>
              <div className="flex gap-2 mb-3">
                <Select value={discountType} onValueChange={(value: 'fixed' | 'percentage') => setDiscountType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">₪</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  placeholder="Размер скидки"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Подытог:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Скидка:</span>
                <span>-{formatCurrency(calculateDiscount())}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Итого:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={updateOrderMutation.isPending}>
            {updateOrderMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Cancellation reason dialog
function CancellationReasonDialog({ 
  open, 
  onClose, 
  onConfirm, 
  reasons 
}: { 
  open: boolean, 
  onClose: () => void, 
  onConfirm: (reason: string) => void,
  reasons: string[]
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    const reason = selectedReason === "custom" ? customReason : selectedReason;
    if (reason.trim()) {
      onConfirm(reason);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Причина отмены заказа</DialogTitle>
          <DialogDescription>
            Выберите или укажите причину отмены заказа
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите причину" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
              <SelectItem value="custom">Другая причина...</SelectItem>
            </SelectContent>
          </Select>

          {selectedReason === "custom" && (
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Укажите причину отмены"
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === "custom" && !customReason.trim())}
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
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
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

  const cancellationReasons = [
    "Клиент отменил заказ",
    "Товар закончился",
    "Проблемы с доставкой",
    "Технические проблемы",
    "Другое"
  ];

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
  }, [isAuthenticated, isLoading, toast]);

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

  // Status change mutation
  const statusChangeMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      return await apiRequest(`/api/orders/${orderId}/status`, "PATCH", { status });
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

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number, reason: string }) => {
      return await apiRequest(`/api/orders/${orderId}/cancel`, "PATCH", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Заказ отменен",
        description: "Заказ успешно отменен",
      });
      setCancellationDialog({ open: false, orderId: null });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось отменить заказ",
        variant: "destructive",
      });
    },
  });

  // Store settings update mutation
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
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    },
  });

  // Filter orders based on search and status
  const filteredOrders = Array.isArray(orders) ? orders.filter((order: any) => {
    const matchesSearch = !searchTerm || 
      order.id.toString().includes(searchTerm) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(searchTerm)) ||
      (order.user?.firstName && order.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Панель администратора</h1>
          <p className="text-gray-600">Управление заказами, товарами и настройками магазина</p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Управление заказами
                    </CardTitle>
                    <CardDescription>
                      Канбан-доски и детальное редактирование заказов с системой скидок
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'kanban' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('kanban')}
                    >
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Канбан
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                    >
                      <Columns className="h-4 w-4 mr-2" />
                      Таблица
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Поиск по имени клиента, телефону или номеру заказа..."
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
                ) : viewMode === 'kanban' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map((status) => (
                      <div key={status} className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
                        <h3 className="font-semibold mb-3 text-center">
                          {status === 'pending' && 'Ожидает'}
                          {status === 'confirmed' && 'Подтвержден'}
                          {status === 'preparing' && 'Готовится'}
                          {status === 'ready' && 'Готов'}
                          {status === 'delivered' && 'Доставлен'}
                          {status === 'cancelled' && 'Отменен'}
                        </h3>
                        <div className="space-y-3">
                          {filteredOrders
                            .filter((order: any) => order.status === status)
                            .map((order: any) => (
                              <OrderCard
                                key={order.id}
                                order={order}
                                onEdit={setEditingOrder}
                                onStatusChange={statusChangeMutation.mutate}
                                onCancelOrder={(orderId) => setCancellationDialog({ open: true, orderId })}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>№ Заказа</TableHead>
                          <TableHead>Клиент</TableHead>
                          <TableHead>Телефон</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">#{order.id}</TableCell>
                            <TableCell>{order.customerName || order.user?.firstName || 'Гость'}</TableCell>
                            <TableCell>
                              <a href={`tel:${order.customerPhone}`} className="text-blue-600 hover:underline">
                                {order.customerPhone}
                              </a>
                            </TableCell>
                            <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.status === 'delivered' ? 'default' :
                                  order.status === 'cancelled' ? 'destructive' : 'secondary'
                                }
                              >
                                {order.status === 'pending' && 'Ожидает'}
                                {order.status === 'confirmed' && 'Подтвержден'}
                                {order.status === 'preparing' && 'Готовится'}
                                {order.status === 'ready' && 'Готов'}
                                {order.status === 'delivered' && 'Доставлен'}
                                {order.status === 'cancelled' && 'Отменен'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingOrder(order)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCancellationDialog({ open: true, orderId: order.id })}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
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
                        {Array.isArray(products) && products.map((product: any) => (
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
                    {Array.isArray(categories) && categories.map((category: any) => (
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
                  Организованные настройки с HTML/JS интеграцией для аналитики
                </CardDescription>
              </CardHeader>
              <CardContent>
                {storeSettingsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : storeSettings ? (
                  <OrganizedStoreSettings 
                    storeSettings={storeSettings}
                    onSubmit={(data) => updateStoreSettingsMutation.mutate(data)}
                    isLoading={updateStoreSettingsMutation.isPending}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Настройки недоступны</p>
                    <Button 
                      onClick={() => updateStoreSettingsMutation.mutate({})}
                      className="mt-4"
                    >
                      Создать настройки
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Edit Dialog */}
        {editingOrder && (
          <OrderEditForm
            order={editingOrder}
            onClose={() => setEditingOrder(null)}
            onSave={() => {}}
          />
        )}

        {/* Cancellation Dialog */}
        <CancellationReasonDialog
          open={cancellationDialog.open}
          onClose={() => setCancellationDialog({ open: false, orderId: null })}
          onConfirm={(reason) => {
            if (cancellationDialog.orderId) {
              cancelOrderMutation.mutate({
                orderId: cancellationDialog.orderId,
                reason
              });
            }
          }}
          reasons={cancellationReasons}
        />
      </div>
    </div>
  );
}