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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getUnitLabel, type ProductUnit } from "@/lib/currency";
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
  User,
  Eye,
  X
} from "lucide-react";

// Validation schemas
const productSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  categoryId: z.number().min(1, "Выберите категорию"),
  price: z.string().min(1, "Цена обязательна"),
  unit: z.enum(["100g", "100ml", "piece", "kg"]).default("100g"),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
  isSpecialOffer: z.boolean().default(false),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.string().optional(),
});

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

// Handle status change with cancellation confirmation
function useStatusChangeHandler() {
  const handleStatusChange = (orderId: number, newStatus: string, onCancel: (id: number) => void, onConfirm: (data: { orderId: number, status: string }) => void) => {
    if (newStatus === 'cancelled') {
      onCancel(orderId);
    } else {
      onConfirm({ orderId, status: newStatus });
    }
  };
  
  return handleStatusChange;
}

// OrderCard component for kanban view
function DraggableOrderCard({ order, onEdit, onStatusChange, onCancelOrder }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("orderId", order.id.toString());
      }}
      className="cursor-move"
    >
      <OrderCard order={order} onEdit={onEdit} onStatusChange={onStatusChange} onCancelOrder={onCancelOrder} />
    </div>
  );
}

function OrderCard({ order, onEdit, onStatusChange, onCancelOrder }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void }) {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'confirmed': return 'Подтвержден';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Готов';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Order Header */}
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm text-orange-600">#{order.id}</div>
            <Badge className={`text-xs px-2 py-1 ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </Badge>
          </div>

          {/* Customer Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3 w-3 text-gray-400" />
              <span className="font-medium">
                {order.user?.firstName && order.user?.lastName 
                  ? `${order.user.firstName} ${order.user.lastName}`
                  : order.user?.email || "—"
                }
              </span>
            </div>
            {order.customerPhone && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="h-3 w-3" />
                {order.customerPhone}
              </div>
            )}
          </div>

          {/* Order Amount */}
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(order.totalAmount)}
          </div>

          {/* Delivery Info */}
          {order.deliveryDate && order.deliveryTime && (
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {order.deliveryDate}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {order.deliveryTime}
              </div>
              {order.deliveryAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{order.deliveryAddress}</span>
                </div>
              )}
            </div>
          )}

          {/* Order Items Count */}
          <div className="text-xs text-gray-500">
            {order.items?.length || 0} товаров
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(order);
              }}
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

// OrderEditForm component
function OrderEditForm({ order, onClose, onSave }: { order: any, onClose: () => void, onSave: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/orders/${order.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Заказ обновлен",
        description: "Изменения сохранены успешно",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить заказ",
        variant: "destructive",
      });
    },
  });

  const [editedOrder, setEditedOrder] = useState({
    customerPhone: order.customerPhone || '',
    deliveryAddress: order.deliveryAddress || '',
    deliveryDate: order.deliveryDate || '',
    deliveryTime: order.deliveryTime || '',
    status: order.status || 'pending',
    notes: order.notes || '',
  });

  const handleSave = () => {
    updateOrderMutation.mutate(editedOrder);
  };

  return (
    <div className="space-y-6">
      {/* Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">Информация о заказе</h3>
          <div className="space-y-2 text-sm">
            <div><strong>№ заказа:</strong> #{order.id}</div>
            <div><strong>Дата создания:</strong> {new Date(order.createdAt).toLocaleString('ru-RU')}</div>
            <div><strong>Сумма:</strong> {formatCurrency(order.totalAmount)}</div>
            <div><strong>Клиент:</strong> {order.user?.firstName && order.user?.lastName 
              ? `${order.user.firstName} ${order.user.lastName}`
              : order.user?.email || "—"}</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Редактирование</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Телефон клиента</label>
              <Input
                value={editedOrder.customerPhone}
                onChange={(e) => setEditedOrder(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="Номер телефона"
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Статус заказа</label>
              <Select
                value={editedOrder.status}
                onValueChange={(value) => setEditedOrder(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="text-sm">
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
        </div>
      </div>

      {/* Delivery Information */}
      <div>
        <h3 className="font-semibold mb-3">Доставка</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Адрес доставки</label>
            <Input
              value={editedOrder.deliveryAddress}
              onChange={(e) => setEditedOrder(prev => ({ ...prev, deliveryAddress: e.target.value }))}
              placeholder="Введите адрес"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Дата</label>
              <Input
                type="date"
                value={editedOrder.deliveryDate}
                onChange={(e) => setEditedOrder(prev => ({ ...prev, deliveryDate: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Время</label>
              <Input
                type="time"
                value={editedOrder.deliveryTime}
                onChange={(e) => setEditedOrder(prev => ({ ...prev, deliveryTime: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div>
        <h3 className="font-semibold mb-3">Товары в заказе</h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Товар</TableHead>
                <TableHead className="text-xs w-20">Кол-во</TableHead>
                <TableHead className="text-xs w-20">Цена</TableHead>
                <TableHead className="text-xs w-24">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="text-sm">
                    <div>
                      <div className="font-medium">{item.product?.name}</div>
                      {item.product?.description && (
                        <div className="text-xs text-gray-500">{item.product.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(item.pricePerUnit)}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">Примечания</label>
        <Textarea
          value={editedOrder.notes}
          onChange={(e) => setEditedOrder(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Дополнительные заметки к заказу..."
          className="text-sm"
          rows={3}
        />
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
  const { user, isLoading, isAuthenticated } = useAuth();
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
  const [activeTab, setActiveTab] = useState("products");

  // Orders management state
  const [ordersViewMode, setOrdersViewMode] = useState<"table" | "kanban">("table");
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("active"); // active, delivered, cancelled, all
  
  // Cancellation dialog state
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);

  // Pagination state
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  // Reset pagination when filters change
  useEffect(() => {
    setProductsPage(1);
  }, [searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  useEffect(() => {
    setOrdersPage(1);
  }, [searchQuery, ordersStatusFilter]);

  useEffect(() => {
    setUsersPage(1);
  }, [searchQuery]);

  // Sorting function
  const handleSort = (field: "name" | "price" | "category") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Check admin access
  useEffect(() => {
    if (user && user.email !== "alexjc55@gmail.com") {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      window.location.href = "/";
      return;
    }
  }, [user, toast]);

  // Data queries with pagination
  const { data: storeSettings, isLoading: storeSettingsLoading } = useQuery<StoreSettings>({
    queryKey: ["/api/settings"]
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"]
  });

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/admin/products", productsPage, searchQuery, selectedCategoryFilter, selectedStatusFilter, sortField, sortDirection, storeSettings?.defaultItemsPerPage],
    queryFn: async () => {
      const limit = storeSettings?.defaultItemsPerPage || 10;
      const params = new URLSearchParams({
        page: productsPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        category: selectedCategoryFilter,
        status: selectedStatusFilter,
        sortField,
        sortDirection
      });
      const response = await fetch(`/api/admin/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!storeSettings,
  });

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/admin/orders", ordersPage, searchQuery, ordersStatusFilter, storeSettings?.defaultItemsPerPage],
    queryFn: async () => {
      const limit = storeSettings?.defaultItemsPerPage || 10;
      
      // Map filter states to API parameters
      let statusParam = "all";
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

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const formData = new FormData();
      Object.keys(productData).forEach(key => {
        if (productData[key] !== undefined && productData[key] !== null) {
          formData.append(key, productData[key]);
        }
      });
      
      // Convert price to pricePerKg for backward compatibility
      if (productData.unit !== "kg") {
        formData.append("pricePerKg", productData.price);
      } else {
        formData.append("pricePerKg", productData.price);
      }
      
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
    mutationFn: async ({ id, ...productData }: any) => {
      // Ensure price and pricePerKg are properly set
      const updateData = {
        ...productData,
        price: productData.price?.toString() || productData.pricePerKg?.toString(),
        pricePerKg: productData.price?.toString() || productData.pricePerKg?.toString(),
        categoryId: parseInt(productData.categoryId),
        isAvailable: Boolean(productData.isAvailable)
      };

      // Remove undefined/null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null) {
          delete updateData[key];
        }
      });
      
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Product update failed:', response.status, errorData);
        throw new Error(`Failed to update product: ${response.status} ${errorData}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setEditingProduct(null);
      setIsProductFormOpen(false);
      toast({ title: "Товар обновлен", description: "Изменения сохранены" });
    },
    onError: (error: any) => {
      console.error("Product update error:", error);
      toast({ 
        title: "Ошибка обновления товара", 
        description: error.message || "Не удалось обновить товар", 
        variant: "destructive" 
      });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete product');
      return await response.json();
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

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: number; isAvailable: boolean }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable }),
      });
      if (!response.ok) throw new Error('Failed to toggle availability');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      console.error("Toggle availability error:", error);
      toast({ title: "Ошибка", description: "Не удалось обновить наличие", variant: "destructive" });
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
    mutationFn: async ({ id, ...categoryData }: any) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
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
    setOrderToCancel(orderId);
    setIsCancellationDialogOpen(true);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== "alexjc55@gmail.com") {
    return null;
  }

  const filteredProducts = (productsData as any[] || [])
    .filter((product: any) => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategoryFilter === "all" || 
        product.categoryId === parseInt(selectedCategoryFilter);
      
      const matchesStatus = selectedStatusFilter === "all" ||
        (selectedStatusFilter === "available" && product.isAvailable) ||
        (selectedStatusFilter === "unavailable" && !product.isAvailable) ||
        (selectedStatusFilter === "with_discount" && (product.isSpecialOffer || (product.discountValue && parseFloat(product.discountValue) > 0)));
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "price":
          aValue = parseFloat(a.price || a.pricePerKg || "0");
          bValue = parseFloat(b.price || b.pricePerKg || "0");
          break;
        case "category":
          aValue = a.category?.name?.toLowerCase() || "";
          bValue = b.category?.name?.toLowerCase() || "";
          break;
        default:
          return 0;
      }
      
      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Админ-панель</h1>
              <p className="text-gray-600 text-sm sm:text-base">Управление товарами, категориями и заказами</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-8">
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden sm:block'}`}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1">
              <TabsTrigger value="products" className="text-xs sm:text-sm">Товары</TabsTrigger>
              <TabsTrigger value="categories" className="text-xs sm:text-sm">Категории</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs sm:text-sm">Заказы</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">Пользователи</TabsTrigger>
              <TabsTrigger value="store" className="text-xs sm:text-sm">Магазин</TabsTrigger>
            </TabsList>
          </div>

          {/* Products Management */}
          <TabsContent value="products" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      Управление Товарами
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Полное управление товарами с поиском и фильтрацией
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingProduct(null);
                      setIsProductFormOpen(true);
                    }}
                    className="bg-orange-500 text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 w-full sm:w-auto"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить товар
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Поиск товаров..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                    <div className="relative min-w-[180px]">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                        <SelectTrigger className="pl-10 text-sm">
                          <SelectValue placeholder="Все категории" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="all">Все категории</SelectItem>
                          {(categories as any[] || []).map((category: any) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative min-w-[160px]">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                        <SelectTrigger className="pl-10 text-sm">
                          <SelectValue placeholder="Статус товара" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="all">Все товары</SelectItem>
                          <SelectItem value="available">Доступные</SelectItem>
                          <SelectItem value="unavailable">Недоступные</SelectItem>
                          <SelectItem value="with_discount">Со скидкой</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                {filteredProducts.length > 0 ? (
                  <div className="border rounded-lg bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm">
                              <button 
                                onClick={() => handleSort("name")}
                                className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                              >
                                Название
                                {sortField === "name" && (
                                  sortDirection === "asc" ? 
                                    <ChevronUp className="h-3 w-3" /> : 
                                    <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm">
                              <button 
                                onClick={() => handleSort("category")}
                                className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                              >
                                Категория
                                {sortField === "category" && (
                                  sortDirection === "asc" ? 
                                    <ChevronUp className="h-3 w-3" /> : 
                                    <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm">
                              <button 
                                onClick={() => handleSort("price")}
                                className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                              >
                                Цена
                                {sortField === "price" && (
                                  sortDirection === "asc" ? 
                                    <ChevronUp className="h-3 w-3" /> : 
                                    <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm">Наличие</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product: any) => (
                            <TableRow key={product.id}>
                              <TableCell className="px-2 sm:px-4 py-2">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setIsProductFormOpen(true);
                                  }}
                                  className="font-medium text-xs sm:text-sm text-left hover:text-orange-600 transition-colors cursor-pointer"
                                >
                                  {product.name}
                                </button>
                              </TableCell>
                              <TableCell className="px-2 sm:px-4 py-2">
                                <Badge variant="outline" className="text-xs">
                                  {product.category?.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-2 sm:px-4 py-2">
                                <div className={`text-xs sm:text-sm p-2 rounded ${product.isSpecialOffer ? 'bg-orange-100 border border-orange-200' : ''}`}>
                                  {product.isSpecialOffer && product.discountType && product.discountValue && !isNaN(parseFloat(product.discountValue)) ? (
                                    <div>
                                      <div className="text-gray-400 line-through text-xs">{formatCurrency(product.price || product.pricePerKg)}</div>
                                      <div className="font-medium text-orange-600">
                                        {formatCurrency(
                                          product.discountType === "percentage"
                                            ? parseFloat(product.price || product.pricePerKg || "0") * (1 - parseFloat(product.discountValue) / 100)
                                            : Math.max(0, parseFloat(product.price || product.pricePerKg || "0") - parseFloat(product.discountValue))
                                        )}
                                      </div>
                                      <div className="text-orange-600 text-xs font-medium">
                                        -{product.discountType === "percentage" ? `${product.discountValue}%` : formatCurrency(parseFloat(product.discountValue))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="font-medium">{formatCurrency(product.price || product.pricePerKg)}</div>
                                  )}
                                  <div className="text-gray-500 text-xs">{getUnitLabel(product.unit || "100g")}</div>
                                </div>
                              </TableCell>
                              <TableCell className="px-2 sm:px-4 py-2">
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
                                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery || selectedCategoryFilter !== "all" ? "Товары не найдены" : "Нет товаров"}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {searchQuery || selectedCategoryFilter !== "all" 
                        ? "Попробуйте изменить критерии поиска или фильтрации"
                        : "Начните с добавления первого товара"
                      }
                    </p>
                  </div>
                )}
                
                {/* Products Pagination */}
                {productsTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span>Показано {((productsPage - 1) * itemsPerPage) + 1}-{Math.min(productsPage * itemsPerPage, productsTotal)} из {productsTotal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductsPage(1)}
                        disabled={productsPage === 1}
                        title="Первая страница"
                      >
                        ⟨⟨
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductsPage(prev => Math.max(1, prev - 1))}
                        disabled={productsPage === 1}
                        title="Предыдущая страница"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium px-3 py-1 bg-white border rounded">
                        {productsPage} из {productsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductsPage(prev => Math.min(productsTotalPages, prev + 1))}
                        disabled={productsPage === productsTotalPages}
                        title="Следующая страница"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductsPage(productsTotalPages)}
                        disabled={productsPage === productsTotalPages}
                        title="Последняя страница"
                      >
                        ⟩⟩
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Management */}
          <TabsContent value="categories" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
                      Управление Категориями
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Простое управление категориями
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingCategory(null);
                      setIsCategoryFormOpen(true);
                    }}
                    className="bg-orange-500 text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 w-full sm:w-auto"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить категорию
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(categories as any[] || []).length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {(categories as any[] || []).map((category: any) => (
                      <Card key={category.id} className="group hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="text-2xl">{category.icon}</div>
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => {
                                    setEditingCategory(category);
                                    setIsCategoryFormOpen(true);
                                  }}
                                  className="font-medium text-sm hover:text-blue-600 cursor-pointer text-left block w-full truncate"
                                >
                                  {category.name}
                                </button>
                                {category.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{category.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-blue-50"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setIsCategoryFormOpen(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3 text-blue-600" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50">
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-sm sm:text-base">Удалить категорию</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs sm:text-sm">
                                      Вы уверены, что хотите удалить категорию "{category.name}"? Все товары этой категории также будут удалены.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="text-xs sm:text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200">Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                                      className="bg-red-600 text-white hover:bg-red-700 border-red-600 hover:border-red-700 focus:bg-red-700 data-[state=open]:bg-red-700 transition-colors duration-200 text-xs sm:text-sm"
                                      style={{ backgroundColor: 'rgb(220 38 38)', borderColor: 'rgb(220 38 38)' }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgb(185 28 28)';
                                        e.currentTarget.style.borderColor = 'rgb(185 28 28)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgb(220 38 38)';
                                        e.currentTarget.style.borderColor = 'rgb(220 38 38)';
                                      }}
                                    >
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCategoryFilter(category.id.toString());
                                setActiveTab("products");
                              }}
                              className="text-xs hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Package className="h-3 w-3 mr-1" />
                              {category.products?.length || 0} товаров
                            </Button>
                            <div className="text-xs text-gray-500">
                              ID: {category.id}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет категорий</h3>
                    <p className="text-gray-500 text-sm">Начните с добавления первой категории</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Management */}
          <TabsContent value="orders" className="space-y-4 sm:space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  Заказы
                </h1>
                <p className="text-gray-600 mt-1">Управление заказами клиентов</p>
              </div>
              
              {/* Controls Row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                  <Button
                    variant={ordersViewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setOrdersViewMode("table")}
                    className="text-xs px-3 py-1 h-8"
                  >
                    <Grid3X3 className="h-3 w-3 mr-1" />
                    Таблица
                  </Button>
                  <Button
                    variant={ordersViewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setOrdersViewMode("kanban")}
                    className="text-xs px-3 py-1 h-8"
                  >
                    <Columns className="h-3 w-3 mr-1" />
                    Канбан
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                  <Select value={ordersStatusFilter} onValueChange={setOrdersStatusFilter}>
                    <SelectTrigger className="w-40 text-xs h-8">
                      <SelectValue placeholder="Фильтр заказов" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активные заказы</SelectItem>
                      <SelectItem value="delivered">Доставленные</SelectItem>
                      <SelectItem value="cancelled">Отмененные</SelectItem>
                      <SelectItem value="all">Все заказы</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                    <Input
                      placeholder="Поиск по заказам..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-8 w-48"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : ordersResponse?.data?.length > 0 ? (
                  <>
                    {/* Table View */}
                    {ordersViewMode === "table" && (
                      <div className="border rounded-lg bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs sm:text-sm w-20">№</TableHead>
                                <TableHead className="text-xs sm:text-sm">Клиент</TableHead>
                                <TableHead className="text-xs sm:text-sm w-24">Статус</TableHead>
                                <TableHead className="text-xs sm:text-sm w-20">Сумма</TableHead>
                                <TableHead className="text-xs sm:text-sm hidden md:table-cell w-24">Дата</TableHead>
                                <TableHead className="text-xs sm:text-sm hidden lg:table-cell w-32">Доставка</TableHead>
                                <TableHead className="text-xs sm:text-sm w-24">Действия</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ordersResponse.data.map((order: any) => (
                                <TableRow key={order.id} className="hover:bg-gray-50">
                                  <TableCell className="font-bold text-xs sm:text-sm text-orange-600">#{order.id}</TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    <div className="space-y-1">
                                      <div className="font-medium flex items-center gap-2">
                                        <User className="h-3 w-3 text-gray-400" />
                                        {order.user?.firstName && order.user?.lastName 
                                          ? `${order.user.firstName} ${order.user.lastName}`
                                          : order.user?.email || "—"
                                        }
                                      </div>
                                      {order.customerPhone && (
                                        <div className="text-gray-500 text-xs flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {order.customerPhone}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
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
                                      <SelectTrigger className="w-full h-8 text-xs">
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
                                  <TableCell className="font-medium text-xs sm:text-sm">
                                    {formatCurrency(order.totalAmount)}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-gray-400" />
                                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs hidden lg:table-cell">
                                    {order.deliveryDate && order.deliveryTime ? (
                                      <div className="space-y-1">
                                        <div className="font-medium flex items-center gap-1">
                                          <Calendar className="h-3 w-3 text-gray-400" />
                                          {order.deliveryDate}
                                        </div>
                                        <div className="text-gray-500 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {order.deliveryTime}
                                        </div>
                                        {order.deliveryAddress && (
                                          <div className="text-gray-500 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {order.deliveryAddress}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">Не указано</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-xs h-8"
                                        onClick={() => {
                                          setEditingOrder(order);
                                          setIsOrderFormOpen(true);
                                        }}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Детали
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Kanban View */}
                    {ordersViewMode === "kanban" && (
                      <div className="overflow-x-auto">
                        <div className="flex gap-4 min-w-max pb-4"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const orderId = e.dataTransfer.getData("orderId");
                            const newStatus = e.dataTransfer.getData("newStatus");
                            if (orderId && newStatus) {
                              if (newStatus === 'cancelled') {
                                handleOrderCancellation(parseInt(orderId));
                              } else {
                                updateOrderStatusMutation.mutate({
                                  orderId: parseInt(orderId),
                                  status: newStatus
                                });
                              }
                            }
                          }}
                        >
                          {/* Pending Column */}
                          <div 
                            className="bg-yellow-50 rounded-lg p-4 min-w-80"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "pending");
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "pending");
                            }}
                          >
                            <h3 className="font-semibold text-sm mb-3 text-yellow-800 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Ожидает ({ordersResponse.data.filter((o: any) => o.status === 'pending').length})
                            </h3>
                            <div className="space-y-3 min-h-24">
                              {ordersResponse.data.filter((order: any) => order.status === 'pending').map((order: any) => (
                                <DraggableOrderCard 
                                  key={order.id} 
                                  order={order} 
                                  onEdit={(order) => {
                                    setEditingOrder(order);
                                    setIsOrderFormOpen(true);
                                  }} 
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Confirmed Column */}
                          <div 
                            className="bg-blue-50 rounded-lg p-4 min-w-80"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "confirmed");
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "confirmed");
                            }}
                          >
                            <h3 className="font-semibold text-sm mb-3 text-blue-800 flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Подтвержден ({ordersResponse.data.filter((o: any) => o.status === 'confirmed').length})
                            </h3>
                            <div className="space-y-3 min-h-24">
                              {ordersResponse.data.filter((order: any) => order.status === 'confirmed').map((order: any) => (
                                <DraggableOrderCard 
                                  key={order.id} 
                                  order={order} 
                                  onEdit={(order) => {
                                    setEditingOrder(order);
                                    setIsOrderFormOpen(true);
                                  }} 
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Preparing Column */}
                          <div 
                            className="bg-orange-50 rounded-lg p-4 min-w-80"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "preparing");
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "preparing");
                            }}
                          >
                            <h3 className="font-semibold text-sm mb-3 text-orange-800 flex items-center gap-2">
                              <Utensils className="h-4 w-4" />
                              Готовится ({ordersResponse.data.filter((o: any) => o.status === 'preparing').length})
                            </h3>
                            <div className="space-y-3 min-h-24">
                              {ordersResponse.data.filter((order: any) => order.status === 'preparing').map((order: any) => (
                                <DraggableOrderCard 
                                  key={order.id} 
                                  order={order} 
                                  onEdit={(order) => {
                                    setEditingOrder(order);
                                    setIsOrderFormOpen(true);
                                  }} 
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Ready Column */}
                          <div 
                            className="bg-green-50 rounded-lg p-4 min-w-80"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "ready");
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.dataTransfer.setData("newStatus", "ready");
                            }}
                          >
                            <h3 className="font-semibold text-sm mb-3 text-green-800 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Готов ({ordersResponse.data.filter((o: any) => o.status === 'ready').length})
                            </h3>
                            <div className="space-y-3 min-h-24">
                              {ordersResponse.data.filter((order: any) => order.status === 'ready').map((order: any) => (
                                <DraggableOrderCard 
                                  key={order.id} 
                                  order={order} 
                                  onEdit={(order) => {
                                    setEditingOrder(order);
                                    setIsOrderFormOpen(true);
                                  }} 
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Delivered Column - only show when filter includes delivered */}
                          {(ordersStatusFilter === "delivered" || ordersStatusFilter === "all") && (
                            <div 
                              className="bg-gray-50 rounded-lg p-4 min-w-80"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.setData("newStatus", "delivered");
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.dataTransfer.setData("newStatus", "delivered");
                              }}
                            >
                              <h3 className="font-semibold text-sm mb-3 text-gray-800 flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                Доставлен ({ordersResponse.data.filter((o: any) => o.status === 'delivered').length})
                              </h3>
                              <div className="space-y-3 min-h-24">
                                {ordersResponse.data.filter((order: any) => order.status === 'delivered').map((order: any) => (
                                  <DraggableOrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onEdit={(order) => {
                                      setEditingOrder(order);
                                      setIsOrderFormOpen(true);
                                    }} 
                                    onStatusChange={updateOrderStatusMutation.mutate} 
                                    onCancelOrder={handleOrderCancellation} 
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cancelled Column - only show when filter includes cancelled */}
                          {(ordersStatusFilter === "cancelled" || ordersStatusFilter === "all") && (
                            <div 
                              className="bg-red-50 rounded-lg p-4 min-w-80"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.setData("newStatus", "cancelled");
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.dataTransfer.setData("newStatus", "cancelled");
                              }}
                            >
                              <h3 className="font-semibold text-sm mb-3 text-red-800 flex items-center gap-2">
                                <X className="h-4 w-4" />
                                Отменен ({ordersResponse.data.filter((o: any) => o.status === 'cancelled').length})
                              </h3>
                              <div className="space-y-3 min-h-24">
                                {ordersResponse.data.filter((order: any) => order.status === 'cancelled').map((order: any) => (
                                  <DraggableOrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onEdit={(order) => {
                                      setEditingOrder(order);
                                      setIsOrderFormOpen(true);
                                    }} 
                                    onStatusChange={updateOrderStatusMutation.mutate} 
                                    onCancelOrder={handleOrderCancellation} 
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Orders Pagination */}
                    {ordersResponse?.totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <span>Показано {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} из {ordersResponse.total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOrdersPage(1)}
                            disabled={ordersResponse.page === 1}
                            title="Первая страница"
                          >
                            ⟨⟨
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                            disabled={ordersResponse.page === 1}
                            title="Предыдущая страница"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-medium px-3 py-1 bg-white border rounded">
                            {ordersResponse.page} из {ordersResponse.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                            disabled={ordersResponse.page === ordersResponse.totalPages}
                            title="Следующая страница"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOrdersPage(ordersResponse.totalPages)}
                            disabled={ordersResponse.page === ordersResponse.totalPages}
                            title="Последняя страница"
                          >
                            ⟩⟩
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет заказов</h3>
                    <p className="text-gray-500 text-sm">
                      {ordersStatusFilter === "active" ? "Активные заказы будут отображаться здесь" :
                       ordersStatusFilter === "delivered" ? "Доставленные заказы будут отображаться здесь" :
                       ordersStatusFilter === "cancelled" ? "Отмененные заказы будут отображаться здесь" :
                       "Заказы будут отображаться здесь"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Details/Edit Dialog */}
            <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">
                    {editingOrder ? `Заказ #${editingOrder.id}` : 'Новый заказ'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingOrder ? 'Просмотр и редактирование заказа' : 'Создание нового заказа'}
                  </DialogDescription>
                </DialogHeader>
                
                {editingOrder && (
                  <OrderEditForm 
                    order={editingOrder}
                    onClose={() => {
                      setIsOrderFormOpen(false);
                      setEditingOrder(null);
                    }}
                    onSave={() => {
                      setIsOrderFormOpen(false);
                      setEditingOrder(null);
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  Пользователи
                </CardTitle>
                <CardDescription className="text-sm">
                  Все зарегистрированные пользователи
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(usersData as any[] || []).length > 0 ? (
                  <div className="border rounded-lg bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Email</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Имя</TableHead>
                            <TableHead className="text-xs sm:text-sm">Роль</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Дата регистрации</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(usersData as any[] || []).map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium text-xs sm:text-sm">{user.email}</TableCell>
                              <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}`
                                  : "—"
                                }
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.email === "alexjc55@gmail.com" ? "default" : "secondary"} className="text-xs">
                                  {user.email === "alexjc55@gmail.com" ? "Admin" : "Customer"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                                {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Нет пользователей</h3>
                    <p className="text-gray-500 text-sm">Пользователи будут отображаться здесь</p>
                  </div>
                )}
                
                {/* Users Pagination */}
                {usersTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span>Показано {((usersPage - 1) * itemsPerPage) + 1}-{Math.min(usersPage * itemsPerPage, usersTotal)} из {usersTotal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsersPage(1)}
                        disabled={usersPage === 1}
                        title="Первая страница"
                      >
                        ⟨⟨
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                        disabled={usersPage === 1}
                        title="Предыдущая страница"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium px-3 py-1 bg-white border rounded">
                        {usersPage} из {usersTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                        disabled={usersPage === usersTotalPages}
                        title="Следующая страница"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUsersPage(usersTotalPages)}
                        disabled={usersPage === usersTotalPages}
                        title="Последняя страница"
                      >
                        ⟩⟩
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Store Management */}
          <TabsContent value="store" className="space-y-4 sm:space-y-6">
            <div className="grid gap-6">
              {/* Basic Store Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                    Настройки магазина
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Управление информацией о магазине
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StoreSettingsForm
                    storeSettings={storeSettings}
                    onSubmit={(data) => updateStoreSettingsMutation.mutate(data)}
                    isLoading={updateStoreSettingsMutation.isPending}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={isProductFormOpen}
        onClose={() => {
          setIsProductFormOpen(false);
          setEditingProduct(null);
        }}
        categories={categories}
        product={editingProduct}
        onSubmit={(data: any) => {
          if (editingProduct) {
            updateProductMutation.mutate({ id: editingProduct.id, ...data });
          } else {
            createProductMutation.mutate(data);
          }
        }}
        onDelete={(productId: number) => {
          deleteProductMutation.mutate(productId);
        }}
      />

      {/* Category Form Dialog */}
      <CategoryFormDialog
        open={isCategoryFormOpen}
        onClose={() => {
          setIsCategoryFormOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSubmit={(data: any) => {
          if (editingCategory) {
            updateCategoryMutation.mutate({ id: editingCategory.id, ...data });
          } else {
            createCategoryMutation.mutate(data);
          }
        }}
      />

      {/* Cancellation Reason Dialog */}
      <CancellationReasonDialog
        open={isCancellationDialogOpen}
        orderId={orderToCancel}
        onClose={() => {
          setIsCancellationDialogOpen(false);
          setOrderToCancel(null);
        }}
        onConfirm={(reason) => {
          if (orderToCancel) {
            updateOrderStatusMutation.mutate({
              orderId: orderToCancel,
              status: 'cancelled',
              cancellationReason: reason
            });
          }
        }}
        cancellationReasons={storeSettings?.cancellationReasons || []}
      />
    </div>
  );
}

// Form Dialog Components
function ProductFormDialog({ open, onClose, categories, product, onSubmit, onDelete }: any) {
  type ProductFormData = z.infer<typeof productSchema>;
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: 0,
      price: "",
      unit: "100g" as ProductUnit,
      imageUrl: "",
      isAvailable: true,
      isSpecialOffer: false,
      discountType: undefined,
      discountValue: "",
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
          price: (product.price || product.pricePerKg)?.toString() || "",
          unit: (product.unit || "100g") as ProductUnit,
          imageUrl: product.imageUrl || "",
          isAvailable: product.isAvailable ?? true,
          isSpecialOffer: product.isSpecialOffer ?? false,
          discountType: product.discountType || undefined,
          discountValue: product.discountValue?.toString() || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          categoryId: 0,
          price: "",
          unit: "100g" as ProductUnit,
          imageUrl: "",
          isAvailable: true,
          isSpecialOffer: false,
          discountType: undefined,
          discountValue: "",
        });
      }
    }
  }, [open, product, form]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {product ? "Редактировать товар" : "Добавить товар"}
          </DialogTitle>
          <DialogDescription className="text-sm">
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
                  <FormLabel className="text-sm">Название товара</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название товара" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Введите описание товара"
                      className="resize-none text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Категория</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()} className="text-sm">
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Цена (₪)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Единица измерения</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Выберите единицу" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="100g" className="text-sm">За 100г</SelectItem>
                        <SelectItem value="100ml" className="text-sm">За 100мл</SelectItem>
                        <SelectItem value="piece" className="text-sm">За штуку</SelectItem>
                        <SelectItem value="kg" className="text-sm">За кг</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Изображение</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Рекомендуемый размер: 400×300 пикселей (соотношение 4:3)
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm sm:text-base">Товар доступен</FormLabel>
                    <div className="text-xs sm:text-sm text-gray-500">
                      Включите, если товар есть в наличии
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSpecialOffer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm sm:text-base">Специальное предложение</FormLabel>
                    <div className="text-xs sm:text-sm text-gray-500">
                      Товар будет отображаться в разделе "Специальные предложения"
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isSpecialOffer") && (
              <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
                <h4 className="text-sm font-medium text-orange-800">Настройки скидки</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Тип скидки</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Выберите тип скидки" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Процент (%)</SelectItem>
                            <SelectItem value="fixed">Фиксированная сумма (₪)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          Размер скидки {form.watch("discountType") === "percentage" ? "(%)" : "(₪)"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder={form.watch("discountType") === "percentage" ? "10" : "5.00"}
                            {...field}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("discountType") === "fixed" && (
                  <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                    Фиксированная скидка применяется за {form.watch("unit") === "piece" ? "штуку" : form.watch("unit") === "kg" ? "кг" : "100г/100мл"}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 pt-4">
              {product ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" className="text-sm text-red-600 hover:text-red-800 transition-colors underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" />
                      Удалить товар
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm sm:text-base">Удалить товар</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs sm:text-sm">
                        Вы уверены, что хотите удалить товар "{product.name}"? Это действие нельзя будет отменить.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="text-xs sm:text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200">Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          // Call delete mutation here - we'll need to pass it as a prop
                          if (onDelete) onDelete(product.id);
                          onClose();
                        }}
                        className="bg-red-600 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 text-xs sm:text-sm"
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div></div>
              )}
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200"
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  className="text-sm bg-orange-500 text-white border-orange-500 hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {product ? "Обновить" : "Создать"}
                </Button>
              </div>
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
      name: "",
      description: "",
      icon: "🍽️",
    },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          name: category.name || "",
          description: category.description || "",
          icon: category.icon || "🍽️",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          icon: "🍽️",
        });
      }
    }
  }, [open, category, form]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {category ? "Редактировать категорию" : "Добавить категорию"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {category ? "Обновите информацию о категории" : "Добавьте новую категорию товаров"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Название категории</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название категории" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Введите описание категории"
                      className="resize-none text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => {
                const commonIcons = [
                  "🥗", "🍖", "🐟", "🥩", "🥕", "🍎", "🍞", "🥛", 
                  "🍽️", "🥘", "🍱", "🥙", "🧀", "🍯", "🥜", "🍲",
                  "🍰", "🥧", "🍚", "🌮", "🍕", "🍝", "🥪", "🌯"
                ];
                
                return (
                  <FormItem>
                    <FormLabel className="text-sm">Иконка категории</FormLabel>
                    <div className="space-y-3">
                      {/* Current selected icon display */}
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                        <span className="text-2xl">{field.value}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Выбранная иконка</div>
                          <div className="text-xs text-gray-500">Нажмите на иконку ниже для выбора</div>
                        </div>
                      </div>
                      
                      {/* Icon grid selector */}
                      <div>
                        <div className="text-xs text-gray-600 mb-2">Популярные иконки:</div>
                        <div className="grid grid-cols-8 gap-2">
                          {commonIcons.map((icon) => (
                            <Button
                              key={icon}
                              type="button"
                              variant={field.value === icon ? "default" : "outline"}
                              className={`h-10 w-10 p-0 text-lg ${
                                field.value === icon 
                                  ? "bg-orange-500 border-orange-500 hover:bg-orange-600" 
                                  : "hover:bg-orange-50 hover:border-orange-300"
                              }`}
                              onClick={() => field.onChange(icon)}
                            >
                              {icon}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Custom icon input */}
                      <div>
                        <div className="text-xs text-gray-600 mb-2">Или введите свою иконку:</div>
                        <FormControl>
                          <Input 
                            placeholder="🍽️ Введите эмодзи"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="text-sm"
                          />
                        </FormControl>
                      </div>
                      
                      {/* Image upload option */}
                      <div>
                        <div className="text-xs text-gray-600 mb-2">Или загрузите изображение:</div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-orange-300 transition-colors">
                          <ImageUpload
                            value=""
                            onChange={(url) => {
                              if (url) {
                                field.onChange(url);
                              }
                            }}
                          />
                          <div className="text-xs text-gray-400 mt-2 text-center">
                            Рекомендуемый размер: 64×64 пикселей
                          </div>
                        </div>
                      </div>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                );
              }}
            />

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button type="button" variant="outline" onClick={onClose} className="text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200">
                Отмена
              </Button>
              <Button type="submit" className="text-sm bg-orange-500 text-white border-orange-500 hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200">
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

// Store Settings Form Component
function StoreSettingsForm({ storeSettings, onSubmit, isLoading }: {
  storeSettings: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const form = useForm({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: storeSettings?.storeName || "eDAHouse",
      welcomeTitle: storeSettings?.welcomeTitle || "",
      storeDescription: storeSettings?.storeDescription || "",
      logoUrl: storeSettings?.logoUrl || "",
      bannerImage: storeSettings?.bannerImage || "",
      contactPhone: storeSettings?.contactPhone || "",
      contactEmail: storeSettings?.contactEmail || "",
      address: storeSettings?.address || "",
      workingHours: {
        monday: storeSettings?.workingHours?.monday || "",
        tuesday: storeSettings?.workingHours?.tuesday || "",
        wednesday: storeSettings?.workingHours?.wednesday || "",
        thursday: storeSettings?.workingHours?.thursday || "",
        friday: storeSettings?.workingHours?.friday || "",
        saturday: storeSettings?.workingHours?.saturday || "",
        sunday: storeSettings?.workingHours?.sunday || "",
      },
      deliveryInfo: storeSettings?.deliveryInfo || "",
      paymentInfo: storeSettings?.paymentInfo || "",
      aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
      deliveryFee: storeSettings?.deliveryFee || "15.00",
      minOrderAmount: storeSettings?.minOrderAmount || "50.00",
      discountBadgeText: storeSettings?.discountBadgeText || "Скидка",
      showBannerImage: storeSettings?.showBannerImage !== false,
      showTitleDescription: storeSettings?.showTitleDescription !== false,
      showInfoBlocks: storeSettings?.showInfoBlocks !== false,
      showSpecialOffers: storeSettings?.showSpecialOffers !== false,
      showCategoryMenu: storeSettings?.showCategoryMenu !== false,
      weekStartDay: storeSettings?.weekStartDay || "monday",
      bottomBanner1Url: storeSettings?.bottomBanner1Url || "",
      bottomBanner1Link: storeSettings?.bottomBanner1Link || "",
      bottomBanner2Url: storeSettings?.bottomBanner2Url || "",
      bottomBanner2Link: storeSettings?.bottomBanner2Link || "",
      showBottomBanners: storeSettings?.showBottomBanners !== false,
      defaultItemsPerPage: storeSettings?.defaultItemsPerPage || 10,
    },
  });

  // Reset form when storeSettings changes
  useEffect(() => {
    if (storeSettings) {
      form.reset({
        storeName: storeSettings?.storeName || "eDAHouse",
        welcomeTitle: storeSettings?.welcomeTitle || "",
        storeDescription: storeSettings?.storeDescription || "",
        logoUrl: storeSettings?.logoUrl || "",
        bannerImage: storeSettings?.bannerImage || "",
        contactPhone: storeSettings?.contactPhone || "",
        contactEmail: storeSettings?.contactEmail || "",
        address: storeSettings?.address || "",
        workingHours: {
          monday: storeSettings?.workingHours?.monday || "",
          tuesday: storeSettings?.workingHours?.tuesday || "",
          wednesday: storeSettings?.workingHours?.wednesday || "",
          thursday: storeSettings?.workingHours?.thursday || "",
          friday: storeSettings?.workingHours?.friday || "",
          saturday: storeSettings?.workingHours?.saturday || "",
          sunday: storeSettings?.workingHours?.sunday || "",
        },
        deliveryInfo: storeSettings?.deliveryInfo || "",
        paymentInfo: storeSettings?.paymentInfo || "",
        aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
        deliveryFee: storeSettings?.deliveryFee || "15.00",
        minOrderAmount: storeSettings?.minOrderAmount || "50.00",
        discountBadgeText: storeSettings?.discountBadgeText || "Скидка",
        showBannerImage: storeSettings?.showBannerImage !== false,
        showTitleDescription: storeSettings?.showTitleDescription !== false,
        showInfoBlocks: storeSettings?.showInfoBlocks !== false,
        showSpecialOffers: storeSettings?.showSpecialOffers !== false,
        showCategoryMenu: storeSettings?.showCategoryMenu !== false,
        weekStartDay: storeSettings?.weekStartDay || "monday",
        bottomBanner1Url: storeSettings?.bottomBanner1Url || "",
        bottomBanner1Link: storeSettings?.bottomBanner1Link || "",
        bottomBanner2Url: storeSettings?.bottomBanner2Url || "",
        bottomBanner2Link: storeSettings?.bottomBanner2Link || "",
        showBottomBanners: storeSettings?.showBottomBanners !== false,
        defaultItemsPerPage: storeSettings?.defaultItemsPerPage || 10,
      });
    }
  }, [storeSettings, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="storeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Название магазина</FormLabel>
                <FormControl>
                  <Input placeholder="eDAHouse" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="welcomeTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Заголовок на главной странице</FormLabel>
                <FormControl>
                  <Input placeholder="Добро пожаловать в наш магазин" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Телефон</FormLabel>
                <FormControl>
                  <Input placeholder="+972-XX-XXX-XXXX" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Email</FormLabel>
                <FormControl>
                  <Input placeholder="info@edahouse.com" type="email" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Стоимость доставки (₪)</FormLabel>
                <FormControl>
                  <Input placeholder="15.00" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minOrderAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Минимальная сумма заказа (₪)</FormLabel>
                <FormControl>
                  <Input placeholder="50.00" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultItemsPerPage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Элементов на странице по умолчанию</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString() || "10"}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Выберите количество" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="10">10 элементов</SelectItem>
                    <SelectItem value="15">15 элементов</SelectItem>
                    <SelectItem value="25">25 элементов</SelectItem>
                    <SelectItem value="50">50 элементов</SelectItem>
                    <SelectItem value="100">100 элементов</SelectItem>
                    <SelectItem value="1000">Все элементы</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-gray-500">
                  Количество товаров, заказов и пользователей отображаемых на одной странице в админ панели
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="storeDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Описание магазина</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Расскажите о вашем магазине готовой еды..."
                  className="resize-none text-sm min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Адрес</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Введите полный адрес магазина"
                  className="resize-none text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Логотип магазина
              </FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription className="text-xs text-gray-500">
                Рекомендуемый размер: 200×60 пикселей (PNG с прозрачным фоном)
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bannerImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Баннер на главной странице
              </FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value || ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription className="text-xs text-gray-500">
                Рекомендуемый размер: 1200×400 пикселей. Изображение будет отображаться под шапкой на всю ширину страницы
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Часы работы
          </h3>
          
          <FormField
            control={form.control}
            name="weekStartDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Первый день недели</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Выберите первый день недели" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monday">Понедельник</SelectItem>
                    <SelectItem value="sunday">Воскресенье</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Выберите с какого дня недели начинается неделя в вашем регионе
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          
          <div className="space-y-4">
            {[
              { key: "monday", label: "Понедельник" },
              { key: "tuesday", label: "Вторник" },
              { key: "wednesday", label: "Среда" },
              { key: "thursday", label: "Четверг" },
              { key: "friday", label: "Пятница" },
              { key: "saturday", label: "Суббота" },
              { key: "sunday", label: "Воскресенье" },
            ].map(({ key, label }) => {
              const currentHours = form.watch(`workingHours.${key}` as any) || "";
              const isWorking = currentHours && currentHours !== "Выходной";
              const [openTime, closeTime] = isWorking ? currentHours.split("-") : ["09:00", "18:00"];

              return (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium">{label}</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isWorking}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            form.setValue(`workingHours.${key}` as any, "09:00-18:00");
                          } else {
                            form.setValue(`workingHours.${key}` as any, "");
                          }
                        }}
                        className="switch-green"
                      />
                      <span className="text-xs text-gray-600">
                        {isWorking ? "Рабочий день" : "Выходной"}
                      </span>
                    </div>
                  </div>
                  
                  {isWorking && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormLabel className="text-xs text-gray-600">Открытие</FormLabel>
                        <Select
                          value={openTime}
                          onValueChange={(value) => {
                            const currentClose = closeTime || "18:00";
                            form.setValue(`workingHours.${key}` as any, `${value}-${currentClose}`);
                          }}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 48 }, (_, i) => {
                              const hour = Math.floor(i / 2);
                              const minute = i % 2 === 0 ? "00" : "30";
                              const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                              return (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <FormLabel className="text-xs text-gray-600">Закрытие</FormLabel>
                        <Select
                          value={closeTime}
                          onValueChange={(value) => {
                            const currentOpen = openTime || "09:00";
                            form.setValue(`workingHours.${key}` as any, `${currentOpen}-${value}`);
                          }}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 48 }, (_, i) => {
                              const hour = Math.floor(i / 2);
                              const minute = i % 2 === 0 ? "00" : "30";
                              const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                              return (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <FormField
          control={form.control}
          name="deliveryInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Информация о доставке
              </FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Условия доставки, время доставки, зоны обслуживания..."
                  className="resize-none text-sm min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Информация об оплате
              </FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Принимаемые способы оплаты, условия оплаты..."
                  className="resize-none text-sm min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discountBadgeText"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Текст на значке скидки</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Скидка"
                  className="text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Этот текст будет отображаться на оранжевом значке товаров со скидкой
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Home Page Display Settings */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-medium">Настройки отображения главной страницы</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="showBannerImage"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Показывать баннер</FormLabel>
                    <FormDescription className="text-xs">
                      Картинка под шапкой сайта
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="switch-green"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showTitleDescription"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Показывать заголовок</FormLabel>
                    <FormDescription className="text-xs">
                      Заголовок и описание магазина
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="switch-green"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showInfoBlocks"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Показывать блоки информации</FormLabel>
                    <FormDescription className="text-xs">
                      Часы работы, контакты, оплата и доставка
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="switch-green"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showSpecialOffers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Показывать спецпредложения</FormLabel>
                    <FormDescription className="text-xs">
                      Секция товаров со скидками
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="switch-green"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showCategoryMenu"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Показывать меню категорий</FormLabel>
                    <FormDescription className="text-xs">
                      Нижнее фиксированное меню категорий на мобильных устройствах
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="switch-green"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Bottom Banners Settings */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-medium">Нижние баннеры</h3>
          
          <FormField
            control={form.control}
            name="showBottomBanners"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-medium">Показывать нижние баннеры</FormLabel>
                  <FormDescription className="text-xs">
                    Два баннера в самом низу главной страницы
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="switch-green"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("showBottomBanners") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Banner 1 */}
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="text-md font-medium">Баннер 1 (левый)</h4>
                
                <FormField
                  control={form.control}
                  name="bottomBanner1Url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Изображение баннера 1
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Рекомендуемый размер: 660×260 пикселей (соотношение 2.5:1)
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bottomBanner1Link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Ссылка при клике на баннер 1</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com"
                          {...field} 
                          className="text-sm" 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Необязательно. Оставьте пустым, если переход не нужен
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Banner 2 */}
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="text-md font-medium">Баннер 2 (правый)</h4>
                
                <FormField
                  control={form.control}
                  name="bottomBanner2Url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Изображение баннера 2
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Рекомендуемый размер: 660×260 пикселей (соотношение 2.5:1)
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bottomBanner2Link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Ссылка при клике на баннер 2</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com"
                          {...field} 
                          className="text-sm" 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Необязательно. Оставьте пустым, если переход не нужен
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-orange-500 text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Cancellation Reason Dialog Component
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
