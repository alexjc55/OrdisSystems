import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminSelect } from "@/components/admin/admin-select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getUnitLabel, formatDeliveryTimeRange, type ProductUnit } from "@/lib/currency";
import { insertStoreSettingsSchema, type StoreSettings } from "@shared/schema";
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  ShoppingCart, 
  Utensils,
  Save,
  Search,
  Filter,
  Menu,
  ChevronUp,
  ChevronDown,
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

// Use the imported store settings schema with extended validation
const storeSettingsSchema = insertStoreSettingsSchema.extend({
  contactEmail: z.string().email("Неверный формат email").optional().or(z.literal("")),
  bottomBanner1Link: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  bottomBanner2Link: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  cancellationReasons: z.array(z.string()).optional(),
});

// Generate time slots based on store working hours
const getTimeSlots = (selectedDate = '', workingHours: any = {}, weekStartDay = 'monday') => {
  if (!selectedDate) return [];
  
  const date = new Date(selectedDate + 'T00:00:00');
  const dayNames = weekStartDay === 'sunday' 
    ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const dayName = dayNames[date.getDay()];
  const daySchedule = workingHours[dayName];
  
  if (!daySchedule || daySchedule.trim() === '' || 
      daySchedule.toLowerCase().includes('закрыто') || 
      daySchedule.toLowerCase().includes('closed') ||
      daySchedule.toLowerCase().includes('выходной')) {
    return [{
      value: 'closed',
      label: 'Выходной день'
    }];
  }
  
  // Parse working hours (e.g., "09:00-18:00" or "09:00-14:00, 16:00-20:00")
  const timeSlots: { value: string; label: string }[] = [];
  const scheduleRanges = daySchedule.split(',').map((range: string) => range.trim());
  
  scheduleRanges.forEach((range: string) => {
    const [start, end] = range.split('-').map((time: string) => time.trim());
    if (start && end) {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      // Generate 2-hour intervals
      for (let hour = startHour; hour < endHour; hour += 2) {
        const nextHour = Math.min(hour + 2, endHour);
        
        // Skip if the interval would be less than 2 hours and we're not at the start
        if (nextHour - hour < 2 && hour !== startHour) continue;
        
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        const endTimeStr = `${nextHour.toString().padStart(2, '0')}:00`;
        
        timeSlots.push({
          value: timeStr,
          label: `${timeStr} - ${endTimeStr}`
        });
      }
    }
  });
  
  return timeSlots;
};

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
    <Card className="w-full">
      <CardContent className="p-3">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-sm">Заказ #{order.id}</h4>
              <p className="text-xs text-gray-500">{order.user?.email || 'Гость'}</p>
            </div>
            <Badge className={`text-xs ${getStatusColor(order.status)}`}>
              {order.status === 'pending' && 'Ожидает'}
              {order.status === 'confirmed' && 'Подтвержден'}
              {order.status === 'preparing' && 'Готовится'}
              {order.status === 'ready' && 'Готов'}
              {order.status === 'delivered' && 'Доставлен'}
              {order.status === 'cancelled' && 'Отменен'}
            </Badge>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Сумма:</span>
              <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Время:</span>
              <span>{new Date(order.createdAt).toLocaleString('ru-RU')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs flex-1"
              onClick={() => onEdit(order)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Детали
            </Button>
            <Select
              value={order.status}
              onValueChange={(newStatus) => {
                if (newStatus === 'cancelled') {
                  onCancelOrder(order.id);
                } else {
                  onStatusChange({ orderId: order.id, status: newStatus });
                }
              }}
            >
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="confirmed">Подтвержден</SelectItem>
                <SelectItem value="preparing">Готовится</SelectItem>
                <SelectItem value="ready">Готов</SelectItem>
                <SelectItem value="delivered">Доставлен</SelectItem>
                <SelectItem value="cancelled">Отменен</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Order edit form component
function OrderEditForm({ order, onClose, onSave }: { order: any, onClose: () => void, onSave: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: storeSettings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings');
      return await response.json();
    }
  });
  const [editedOrder, setEditedOrder] = useState({
    deliveryType: order.deliveryType || 'pickup',
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    deliveryAddress: order.deliveryAddress || '',
    deliveryDate: order.deliveryDate || '',
    deliveryTime: order.deliveryTime || '',
    notes: order.notes || '',
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updateData: any) => {
      return await apiRequest("PUT", `/api/orders/${order.id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Заказ обновлен",
        description: "Изменения сохранены успешно",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить заказ",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateOrderMutation.mutate(editedOrder);
  };

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Информация о заказе</h3>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Номер заказа:</span>
            <span>#{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Сумма:</span>
            <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Создан:</span>
            <span>{new Date(order.createdAt).toLocaleString('ru-RU')}</span>
          </div>
          {order.deliveryDate && (
            <div className="flex justify-between">
              <span>Дата доставки:</span>
              <span>{new Date(order.deliveryDate).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          {order.deliveryTime && (
            <div className="flex justify-between">
              <span>Время доставки:</span>
              <span>{formatDeliveryTimeRange(order.deliveryTime)}</span>
            </div>
          )}
          {order.paymentMethod && (
            <div className="flex justify-between">
              <span>Способ оплаты:</span>
              <span>{order.paymentMethod}</span>
            </div>
          )}
          {order.deliveryAddress && (
            <div className="flex justify-between">
              <span>Адрес доставки:</span>
              <span className="text-right max-w-48 truncate">{order.deliveryAddress}</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div>
        <h3 className="font-medium mb-3">Состав заказа</h3>
        <div className="space-y-2">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{item.product.name}</span>
                <div className="text-sm text-gray-500">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </div>
              </div>
              <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Information */}
      <div className="space-y-4">
        <h3 className="font-medium">Информация о доставке</h3>
        
        <div>
          <label className="text-sm font-medium">Тип получения</label>
          <Select 
            value={editedOrder.deliveryType} 
            onValueChange={(value) => setEditedOrder({...editedOrder, deliveryType: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pickup">Самовывоз</SelectItem>
              <SelectItem value="delivery">Доставка</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Имя клиента</label>
          <Input
            value={editedOrder.customerName}
            onChange={(e) => setEditedOrder({...editedOrder, customerName: e.target.value})}
            placeholder="Введите имя"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Телефон</label>
          <Input
            value={editedOrder.customerPhone}
            onChange={(e) => setEditedOrder({...editedOrder, customerPhone: e.target.value})}
            placeholder="Введите телефон"
          />
        </div>

        {editedOrder.deliveryType === 'delivery' && (
          <div>
            <label className="text-sm font-medium">Адрес доставки</label>
            <Textarea
              value={editedOrder.deliveryAddress}
              onChange={(e) => setEditedOrder({...editedOrder, deliveryAddress: e.target.value})}
              placeholder="Введите адрес доставки"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Дата {editedOrder.deliveryType === 'delivery' ? 'доставки' : 'получения'}</label>
            <Input
              type="date"
              value={editedOrder.deliveryDate || ''}
              onChange={(e) => setEditedOrder({...editedOrder, deliveryDate: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Время</label>
            <Select
              value={formatDeliveryTimeRange(editedOrder.deliveryTime || "")}
              onValueChange={(value) => setEditedOrder({...editedOrder, deliveryTime: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите время" />
              </SelectTrigger>
              <SelectContent>
                {getTimeSlots(editedOrder.deliveryDate, storeSettings?.workingHours || {}, storeSettings?.weekStartDay || 'monday').map((slot) => (
                  <SelectItem key={slot.value} value={slot.label}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Примечания</label>
          <Textarea
            value={editedOrder.notes}
            onChange={(e) => setEditedOrder({...editedOrder, notes: e.target.value})}
            placeholder="Дополнительные заметки"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button 
          onClick={handleSave}
          disabled={updateOrderMutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {updateOrderMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for forms and filters
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<"name" | "price" | "category">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState("orders");

  // Orders management state
  const [ordersViewMode, setOrdersViewMode] = useState<"table" | "kanban">("table");
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("active"); // active, delivered, cancelled, all
  
  // Cancellation dialog state
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [orderToCancelId, setOrderToCancelId] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [customCancellationReason, setCustomCancellationReason] = useState("");

  // Pagination state
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  // Fetch store settings
  const { data: storeSettings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  // Fetch products with pagination
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/admin/products", productsPage, searchQuery, selectedCategoryFilter, selectedStatusFilter, sortField, sortDirection, storeSettings?.defaultItemsPerPage],
    queryFn: async () => {
      const limit = storeSettings?.defaultItemsPerPage || 10;
      const params = new URLSearchParams({
        page: productsPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        categoryId: selectedCategoryFilter !== "all" ? selectedCategoryFilter : "",
        sortField,
        sortDirection
      });
      const response = await fetch(`/api/admin/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!storeSettings,
  });

  // Fetch orders with pagination and filtering
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/admin/orders", ordersPage, searchQuery, ordersStatusFilter, storeSettings?.defaultItemsPerPage],
    queryFn: async () => {
      const limit = storeSettings?.defaultItemsPerPage || 10;
      let statusParam = "";
      
      if (ordersStatusFilter === "active") {
        statusParam = "pending,confirmed,preparing,ready";
      } else if (ordersStatusFilter === "delivered") {
        statusParam = "delivered";
      } else if (ordersStatusFilter === "cancelled") {
        statusParam = "cancelled";
      }
      
      const params = new URLSearchParams({
        page: ordersPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusParam,
        sortField: 'createdAt',
        sortDirection: 'desc'
      });
      const response = await fetch(`/api/admin/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: !!storeSettings,
  });

  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", usersPage, searchQuery, storeSettings?.defaultItemsPerPage],
    queryFn: async () => {
      const limit = storeSettings?.defaultItemsPerPage || 10;
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: limit.toString(),
        search: searchQuery
      });
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!storeSettings,
  });

  // Pagination configuration
  const itemsPerPage = storeSettings?.defaultItemsPerPage || 10;

  // Extract data and pagination info
  const productsData = productsResponse?.data || [];
  const productsTotalPages = productsResponse?.totalPages || 0;
  const productsTotal = productsResponse?.total || 0;

  const ordersData = ordersResponse?.data || [];
  const ordersTotalPages = ordersResponse?.totalPages || 0;
  const ordersTotal = ordersResponse?.total || 0;

  const usersData = usersResponse?.data || [];
  const usersTotalPages = usersResponse?.totalPages || 0;
  const usersTotal = usersResponse?.total || 0;

  // Order status update mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, cancellationReason }: { orderId: number, status: string, cancellationReason?: string }) => {
      const payload = status === 'cancelled' && cancellationReason 
        ? { status, cancellationReason }
        : { status };
      return await apiRequest("PUT", `/api/orders/${orderId}/status`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Статус заказа обновлен",
        description: "Изменения сохранены успешно",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус заказа",
        variant: "destructive",
      });
    },
  });

  // Handle order cancellation with reason selection
  const handleOrderCancellation = (orderId: number) => {
    setOrderToCancelId(orderId);
    setCancellationReason("");
    setCustomCancellationReason("");
    setIsCancellationDialogOpen(true);
  };

  // Confirm order cancellation with reason
  const confirmOrderCancellation = () => {
    if (!orderToCancelId) return;
    
    const finalReason = cancellationReason === "other" ? customCancellationReason : cancellationReason;
    updateOrderStatusMutation.mutate({ 
      orderId: orderToCancelId, 
      status: "cancelled", 
      cancellationReason: finalReason 
    });
    
    setIsCancellationDialogOpen(false);
    setOrderToCancelId(null);
    setCancellationReason("");
    setCustomCancellationReason("");
  };

  // Get default cancellation reasons
  const defaultCancellationReasons = storeSettings?.cancellationReasons || [
    "Товар недоступен",
    "Клиент отменил заказ",
    "Проблемы с доставкой",
    "Ошибка в заказе",
    "Технические проблемы"
  ];

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const formData = new FormData();
      Object.keys(productData).forEach(key => {
        if (productData[key] !== undefined && productData[key] !== null) {
          formData.append(key, productData[key]);
        }
      });
      
      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to create product');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsProductFormOpen(false);
      setEditingProduct(null);
      toast({ title: "Товар создан", description: "Товар успешно добавлен" });
    },
    onError: (error: any) => {
      console.error("Product creation error:", error);
      toast({ title: "Ошибка", description: "Не удалось создать товар", variant: "destructive" });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to update product');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsProductFormOpen(false);
      setEditingProduct(null);
      toast({ title: "Товар обновлен", description: "Изменения сохранены" });
    },
    onError: (error: any) => {
      console.error("Product update error:", error);
      toast({ title: "Ошибка", description: "Не удалось обновить товар", variant: "destructive" });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest('DELETE', `/api/products/${productId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: "Товар удален", description: "Товар успешно удален" });
    },
    onError: (error: any) => {
      console.error("Product deletion error:", error);
      toast({ title: "Ошибка", description: "Не удалось удалить товар", variant: "destructive" });
    }
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error('Failed to create category');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCategoryFormOpen(false);
      setEditingCategory(null);
      toast({ title: "Категория создана", description: "Категория успешно добавлена" });
    },
    onError: (error: any) => {
      console.error("Category creation error:", error);
      toast({ title: "Ошибка", description: "Не удалось создать категорию", variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update category');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setEditingCategory(null);
      setIsCategoryFormOpen(false);
      toast({ title: "Категория обновлена", description: "Изменения сохранены" });
    },
    onError: (error: any) => {
      console.error("Category update error:", error);
      toast({ title: "Ошибка", description: "Не удалось обновить категорию", variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await apiRequest('DELETE', `/api/categories/${categoryId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: "Категория удалена", description: "Категория успешно удалена" });
    },
    onError: (error: any) => {
      console.error("Category deletion error:", error);
      toast({ title: "Ошибка", description: "Не удалось удалить категорию", variant: "destructive" });
    }
  });

  // Store settings mutation
  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      if (!response.ok) throw new Error('Failed to update store settings');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: "Настройки сохранены", description: "Настройки магазина успешно обновлены" });
    },
    onError: (error: any) => {
      console.error("Store settings update error:", error);
      toast({ title: "Ошибка", description: "Не удалось обновить настройки", variant: "destructive" });
    }
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin")) {
    return null;
  }

  // Helper functions for permission checks
  const isAdmin = user.role === "admin" || user.email === "alexjc55@gmail.com" || user.username === "admin";
  const workerPermissions = (storeSettings?.workerPermissions as any) || {};
  
  const canManageProducts = isAdmin || workerPermissions.canManageProducts;
  const canManageCategories = isAdmin || workerPermissions.canManageCategories;
  const canManageOrders = isAdmin || workerPermissions.canManageOrders;
  const canViewUsers = isAdmin || workerPermissions.canViewUsers;
  const canManageUsers = isAdmin || workerPermissions.canManageUsers;
  const canViewSettings = isAdmin || workerPermissions.canViewSettings;
  const canManageSettings = isAdmin || workerPermissions.canManageSettings;

  // Determine available tabs and set default
  const availableTabs = [];
  if (canManageProducts || canManageCategories) availableTabs.push('products');
  if (canManageOrders) availableTabs.push('orders');
  if (canViewUsers) availableTabs.push('users');
  if (canViewSettings) availableTabs.push('settings');
  
  // Set default tab to first available tab for workers
  const defaultTab = availableTabs.length > 0 ? availableTabs[0] : 'orders';
  
  // Update active tab if current tab is not available for worker
  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [availableTabs, activeTab, defaultTab]);

  return (
    <div className="min-h-screen bg-gray-50 admin-dashboard">
      <Header onResetView={() => {}} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Панель администратора</h1>
          <p className="text-gray-600">Управление магазином eDAHouse</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-2 gap-2">
            {(canManageProducts || canManageCategories) && (
              <TabsTrigger value="products" className="flex-1 h-12">
                <Package className="h-4 w-4 mr-2" />
                Товары
              </TabsTrigger>
            )}
            {canManageOrders && (
              <TabsTrigger value="orders" className="flex-1 h-12">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Заказы
              </TabsTrigger>
            )}
            {canViewUsers && (
              <TabsTrigger value="users" className="flex-1 h-12">
                <Users className="h-4 w-4 mr-2" />
                Пользователи
              </TabsTrigger>
            )}
            {canViewSettings && (
              <TabsTrigger value="settings" className="col-span-2 md:col-span-1 flex-1 h-12">
                <Store className="h-4 w-4 mr-2" />
                Настройки
              </TabsTrigger>
            )}
          </TabsList>

          {/* Orders Tab Content */}
          {canManageOrders && (
            <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Управление заказами клиентов
                    </CardTitle>
                    <CardDescription>
                      Просмотр и управление всеми заказами ({ordersTotal} всего)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={ordersViewMode === "table" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setOrdersViewMode("table")}
                        className="h-8"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={ordersViewMode === "kanban" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setOrdersViewMode("kanban")}
                        className="h-8"
                      >
                        <Columns className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Orders Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Поиск заказов..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={ordersStatusFilter} onValueChange={setOrdersStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Фильтр по статусу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все заказы</SelectItem>
                      <SelectItem value="active">Активные</SelectItem>
                      <SelectItem value="delivered">Доставленные</SelectItem>
                      <SelectItem value="cancelled">Отмененные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                ) : ordersViewMode === "table" ? (
                  <div className="rounded-md border overflow-visible">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Заказ</TableHead>
                          <TableHead>Клиент</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Время создания</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordersData.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">#{order.id}</TableCell>
                            <TableCell>{order.user?.email || 'Гость'}</TableCell>
                            <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell>
                              <Select
                                value={order.status}
                                onValueChange={(newStatus) => {
                                  if (newStatus === 'cancelled') {
                                    handleOrderCancellation(order.id);
                                  } else {
                                    updateOrderStatusMutation.mutate({ orderId: order.id, status: newStatus });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Ожидает</SelectItem>
                                  <SelectItem value="confirmed">Подтвержден</SelectItem>
                                  <SelectItem value="preparing">Готовится</SelectItem>
                                  <SelectItem value="ready">Готов</SelectItem>
                                  <SelectItem value="delivered">Доставлен</SelectItem>
                                  <SelectItem value="cancelled">Отменен</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleString('ru-RU')}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingOrder(order);
                                  setIsOrderFormOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Детали
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  // Kanban view with horizontal scrolling
                  <div className="overflow-x-auto">
                    <div className="flex gap-6 pb-4" style={{ minWidth: '1200px' }}>
                      {/* Pending Column */}
                      <div className="bg-yellow-50 rounded-lg p-4 min-w-80">
                        <h3 className="font-semibold text-sm mb-3 text-yellow-800 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Ожидает ({ordersResponse.data.filter((o: any) => o.status === 'pending').length})
                        </h3>
                        <div className="space-y-3">
                          {ordersResponse.data.filter((order: any) => order.status === 'pending').map((order: any) => (
                            <OrderCard key={order.id} order={order} onEdit={(order) => {
                              setEditingOrder(order);
                              setIsOrderFormOpen(true);
                            }} onStatusChange={updateOrderStatusMutation.mutate} onCancelOrder={handleOrderCancellation} />
                          ))}
                        </div>
                      </div>

                      {/* Confirmed Column */}
                      <div className="bg-blue-50 rounded-lg p-4 min-w-80">
                        <h3 className="font-semibold text-sm mb-3 text-blue-800 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Подтвержден ({ordersResponse.data.filter((o: any) => o.status === 'confirmed').length})
                        </h3>
                        <div className="space-y-3">
                          {ordersResponse.data.filter((order: any) => order.status === 'confirmed').map((order: any) => (
                            <OrderCard key={order.id} order={order} onEdit={(order) => {
                              setEditingOrder(order);
                              setIsOrderFormOpen(true);
                            }} onStatusChange={updateOrderStatusMutation.mutate} onCancelOrder={handleOrderCancellation} />
                          ))}
                        </div>
                      </div>

                      {/* Preparing Column */}
                      <div className="bg-orange-50 rounded-lg p-4 min-w-80">
                        <h3 className="font-semibold text-sm mb-3 text-orange-800 flex items-center gap-2">
                          <Utensils className="h-4 w-4" />
                          Готовится ({ordersResponse.data.filter((o: any) => o.status === 'preparing').length})
                        </h3>
                        <div className="space-y-3">
                          {ordersResponse.data.filter((order: any) => order.status === 'preparing').map((order: any) => (
                            <OrderCard key={order.id} order={order} onEdit={(order) => {
                              setEditingOrder(order);
                              setIsOrderFormOpen(true);
                            }} onStatusChange={updateOrderStatusMutation.mutate} onCancelOrder={handleOrderCancellation} />
                          ))}
                        </div>
                      </div>

                      {/* Ready Column */}
                      <div className="bg-green-50 rounded-lg p-4 min-w-80">
                        <h3 className="font-semibold text-sm mb-3 text-green-800 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Готов ({ordersResponse.data.filter((o: any) => o.status === 'ready').length})
                        </h3>
                        <div className="space-y-3">
                          {ordersResponse.data.filter((order: any) => order.status === 'ready').map((order: any) => (
                            <OrderCard key={order.id} order={order} onEdit={(order) => {
                              setEditingOrder(order);
                              setIsOrderFormOpen(true);
                            }} onStatusChange={updateOrderStatusMutation.mutate} onCancelOrder={handleOrderCancellation} />
                          ))}
                        </div>
                      </div>

                      {/* Delivered Column */}
                      <div className="bg-gray-50 rounded-lg p-4 min-w-80">
                        <h3 className="font-semibold text-sm mb-3 text-gray-800 flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Доставлен ({ordersResponse.data.filter((o: any) => o.status === 'delivered').length})
                        </h3>
                        <div className="space-y-3">
                          {ordersResponse.data.filter((order: any) => order.status === 'delivered').map((order: any) => (
                            <OrderCard key={order.id} order={order} onEdit={(order) => {
                              setEditingOrder(order);
                              setIsOrderFormOpen(true);
                            }} onStatusChange={updateOrderStatusMutation.mutate} onCancelOrder={handleOrderCancellation} />
                          ))}
                        </div>
                      </div>

                      {/* Cancelled Column */}
                      <div className="bg-red-50 rounded-lg p-4 min-w-80">
                        <h3 className="font-semibold text-sm mb-3 text-red-800 flex items-center gap-2">
                          <X className="h-4 w-4" />
                          Отменен ({ordersResponse.data.filter((o: any) => o.status === 'cancelled').length})
                        </h3>
                        <div className="space-y-3">
                          {ordersResponse.data.filter((order: any) => order.status === 'cancelled').map((order: any) => (
                            <OrderCard key={order.id} order={order} onEdit={(order) => {
                              setEditingOrder(order);
                              setIsOrderFormOpen(true);
                            }} onStatusChange={updateOrderStatusMutation.mutate} onCancelOrder={handleOrderCancellation} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Orders Pagination */}
                {ordersTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t bg-gray-50 mt-4 gap-3">
                    <div className="flex items-center text-sm text-gray-500 order-2 sm:order-1">
                      Показано {((ordersPage - 1) * itemsPerPage) + 1}-{Math.min(ordersPage * itemsPerPage, ordersTotal)} из {ordersTotal}
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-end order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                        disabled={ordersPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </Button>
                      <span className="text-sm font-medium">
                        {ordersPage} из {ordersTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOrdersPage(Math.min(ordersTotalPages, ordersPage + 1))}
                        disabled={ordersPage === ordersTotalPages}
                      >
                        Вперед
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Products Tab Content */}
          {(canManageProducts || canManageCategories) && (
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
                      Добавление, редактирование и удаление товаров ({productsTotal} всего)
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsProductFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Products Filters */}
                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Поиск товаров..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Category Filter Tabs */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Категории</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      <Button
                        variant={selectedCategoryFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategoryFilter("all")}
                        className="text-xs h-8"
                      >
                        Все категории
                      </Button>
                      {categories.map((category: any) => (
                        <Button
                          key={category.id}
                          variant={selectedCategoryFilter === category.id.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategoryFilter(category.id.toString())}
                          className="text-xs h-8"
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter Tabs */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Статус</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        variant={selectedStatusFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatusFilter("all")}
                        className="text-xs h-8"
                      >
                        Все статусы
                      </Button>
                      <Button
                        variant={selectedStatusFilter === "available" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatusFilter("available")}
                        className="text-xs h-8"
                      >
                        Доступные
                      </Button>
                      <Button
                        variant={selectedStatusFilter === "unavailable" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatusFilter("unavailable")}
                        className="text-xs h-8"
                      >
                        Недоступные
                      </Button>
                      <Button
                        variant={selectedStatusFilter === "with_discount" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatusFilter("with_discount")}
                        className="text-xs h-8"
                      >
                        Со скидкой
                      </Button>
                    </div>
                  </div>
                </div>

                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-visible">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Товар</TableHead>
                          <TableHead>Категория</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Единица</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsData.map((product: any) => (
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
                                  <div className="text-sm text-gray-500">{product.description}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{product.category?.name}</TableCell>
                            <TableCell>{formatCurrency(product.price)}</TableCell>
                            <TableCell>{getUnitLabel(product.unit)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={product.isAvailable}
                                  onCheckedChange={(checked) => {
                                    updateProductMutation.mutate({
                                      id: product.id,
                                      data: { isAvailable: checked }
                                    });
                                  }}
                                />
                                <span className="text-sm">
                                  {product.isAvailable ? 'Доступен' : 'Недоступен'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setIsProductFormOpen(true);
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
                                      <AlertDialogTitle>Удалить товар</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Вы уверены, что хотите удалить товар "{product.name}"? Это действие нельзя отменить.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteProductMutation.mutate(product.id)}
                                        className="bg-red-600 hover:bg-red-700"
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

                {/* Products Pagination */}
                {productsTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t bg-gray-50 mt-4 gap-3">
                    <div className="flex items-center text-sm text-gray-500 order-2 sm:order-1">
                      Показано {((productsPage - 1) * itemsPerPage) + 1}-{Math.min(productsPage * itemsPerPage, productsTotal)} из {productsTotal}
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-end order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductsPage(Math.max(1, productsPage - 1))}
                        disabled={productsPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </Button>
                      <span className="text-sm font-medium">
                        {productsPage} из {productsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductsPage(Math.min(productsTotalPages, productsPage + 1))}
                        disabled={productsPage === productsTotalPages}
                      >
                        Вперед
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
          
          {/* Users Tab Content */}
          {canViewUsers && (
            <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Управление пользователями
                </CardTitle>
                <CardDescription>
                  Просмотр и управление пользователями системы ({usersTotal} всего)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Users Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск пользователей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Пользователь</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Роль</TableHead>
                          <TableHead>Дата регистрации</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {user.profileImageUrl && (
                                  <img 
                                    src={user.profileImageUrl} 
                                    alt={user.firstName || user.email}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}`
                                      : user.email || user.username || 'Пользователь'
                                    }
                                  </div>
                                  {user.firstName && (
                                    <div className="text-sm text-gray-500">{user.email || ''}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.email || user.username || 'Не указан'}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? 'Администратор' : 
                                 user.role === 'worker' ? 'Сотрудник' : 'Клиент'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.createdAt 
                                ? new Date(user.createdAt).toLocaleDateString('ru-RU')
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Users Pagination */}
                {usersTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t bg-gray-50 mt-4 gap-3">
                    <div className="flex items-center text-sm text-gray-500 order-2 sm:order-1">
                      Показано {((usersPage - 1) * itemsPerPage) + 1}-{Math.min(usersPage * itemsPerPage, usersTotal)} из {usersTotal}
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-end order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                        disabled={usersPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </Button>
                      <span className="text-sm font-medium">
                        {usersPage} из {usersTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsersPage(Math.min(usersTotalPages, usersPage + 1))}
                        disabled={usersPage === usersTotalPages}
                      >
                        Вперед
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
          
          {/* Settings Tab Content */}
          {canViewSettings && (
            <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Настройки магазина
                </CardTitle>
                <CardDescription>
                  Управление настройками магазина и причинами отмены заказов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500">Настройки магазина (реализация продолжается)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Детали заказа #{editingOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Просмотр и редактирование информации о заказе
            </DialogDescription>
          </DialogHeader>
          {editingOrder && (
            <OrderEditForm 
              order={editingOrder} 
              onClose={() => setIsOrderFormOpen(false)}
              onSave={() => {}}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cancellation Reason Dialog */}
      <Dialog open={isCancellationDialogOpen} onOpenChange={setIsCancellationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отмена заказа</DialogTitle>
            <DialogDescription>
              Выберите причину отмены заказа #{orderToCancelId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Причина отмены</label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите причину" />
                </SelectTrigger>
                <SelectContent>
                  {defaultCancellationReasons.map((reason: string) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                  <SelectItem value="other">Другая причина</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cancellationReason === "other" && (
              <div>
                <label className="text-sm font-medium">Укажите причину</label>
                <Textarea
                  value={customCancellationReason}
                  onChange={(e) => setCustomCancellationReason(e.target.value)}
                  placeholder="Введите причину отмены"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCancellationDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={confirmOrderCancellation}
              disabled={!cancellationReason || (cancellationReason === "other" && !customCancellationReason.trim())}
              className="bg-red-600 hover:bg-red-700"
            >
              Отменить заказ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}