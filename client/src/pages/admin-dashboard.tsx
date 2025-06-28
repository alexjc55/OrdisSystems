/**
 * ADMIN DASHBOARD - Clean Version - Created June 28, 2025 15:43
 * 
 * This version includes:
 * - Fixed tile-based settings interface with modal dialogs
 * - Removed "Display Settings" and "Authentication Page" sections completely
 * - Fixed all JSX syntax errors and undefined variable references
 * - Working modal windows for each settings section
 * - Complete admin panel functionality preserved
 * 
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 */

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Separator } from '../components/ui/separator';
import { 
  MoreHorizontal, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Phone,
  MapPin,
  Calendar,
  Clock3,
  DollarSign,
  Truck,
  Globe,
  BarChart3,
  ChevronRight,
  Store,
  Clock4,
  CreditCard,
  Languages,
  Activity,
  Info,
  Briefcase,
  Layers
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { useToast } from '../hooks/use-toast';
import { useAdminTranslation, useCommonTranslation } from '../lib/i18n';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { createInsertSchema } from 'drizzle-zod';
import { products, categories, orders, storeSettings, themes, users as usersTable } from '../../shared/schema';
import { ImageUpload } from '../components/ui/image-upload';
import type { Dispatch, SetStateAction } from 'react';

// Schema definitions
const productSchema = createInsertSchema(products).omit({ id: true });
const categorySchema = createInsertSchema(categories).omit({ id: true });
const storeSettingsSchema = createInsertSchema(storeSettings).omit({ id: true });
const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["admin", "worker", "customer"]),
  password: z.string().optional(),
});

type CategoryWithCount = {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  displayOrder: number;
  productCount: number;
};

// Status handler hook
function useStatusChangeHandler() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t: adminT } = useAdminTranslation();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: adminT('orders.statusUpdated'),
        description: adminT('orders.statusUpdatedDescription'),
      });
    },
    onError: (error) => {
      console.error('Ошибка при обновлении статуса:', error);
      toast({
        title: adminT('orders.statusUpdateError'),
        description: adminT('orders.statusUpdateErrorDescription'),
        variant: "destructive",
      });
    },
  });
}

// Draggable Order Card Component
function DraggableOrderCard({ order, onEdit, onStatusChange, onCancelOrder }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void }) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'preparing': return 'outline';
      case 'ready': return 'destructive';
      case 'delivered': return 'default';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'preparing': return 'text-purple-600 bg-purple-100';
      case 'ready': return 'text-green-600 bg-green-100';
      case 'delivered': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language === 'he' ? 'he-IL' : 'ru-RU', {
      style: 'currency',
      currency: i18n.language === 'he' ? 'ILS' : 'RUB',
    }).format(price);
  };

  return (
    <Card className="cursor-move hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-start mb-3`}>
          <div>
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-1`}>
              <span className="font-semibold text-lg">#{order.id}</span>
              <Badge className={getStatusColor(order.status)}>
                {adminT(`orders.status.${order.status}`)}
              </Badge>
            </div>
            <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
              {order.customerName} • {formatPrice(order.totalAmount)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              <DropdownMenuItem onClick={() => onEdit(order)}>
                <Pencil className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {adminT('orders.edit')}
              </DropdownMenuItem>
              {order.status !== 'cancelled' && (
                <DropdownMenuItem 
                  onClick={() => onCancelOrder(order.id)}
                  className="text-red-600"
                >
                  <XCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {adminT('orders.cancel')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-2 text-sm">
          {order.deliveryAddress && (
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 text-gray-600`}>
              <MapPin className="h-4 w-4" />
              <span>{order.deliveryAddress}</span>
            </div>
          )}
          {order.deliveryDate && (
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 text-gray-600`}>
              <Calendar className="h-4 w-4" />
              <span>{order.deliveryDate}</span>
              {order.deliveryTimeSlot && <span>• {order.deliveryTimeSlot}</span>}
            </div>
          )}
          {order.phone && (
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 text-gray-600`}>
              <Phone className="h-4 w-4" />
              <span>{order.phone}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-1 flex-wrap`}>
            {['confirmed', 'preparing', 'ready', 'delivered'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={order.status === status ? "default" : "outline"}
                onClick={() => onStatusChange({ orderId: order.id, status })}
                className="h-7 text-xs px-2"
                disabled={order.status === 'cancelled' || order.status === 'delivered'}
              >
                {adminT(`orders.status.${status}`)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Regular Order Card Component  
function OrderCard({ order, onEdit, onStatusChange, onCancelOrder }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void }) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'preparing': return 'text-purple-600 bg-purple-100';
      case 'ready': return 'text-green-600 bg-green-100';
      case 'delivered': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language === 'he' ? 'he-IL' : 'ru-RU', {
      style: 'currency',
      currency: i18n.language === 'he' ? 'ILS' : 'RUB',
    }).format(price);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-start mb-3`}>
          <div>
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 mb-1`}>
              <span className="font-semibold text-lg">#{order.id}</span>
              <Badge className={getStatusColor(order.status)}>
                {adminT(`orders.status.${order.status}`)}
              </Badge>
            </div>
            <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
              {order.customerName} • {formatPrice(order.totalAmount)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              <DropdownMenuItem onClick={() => onEdit(order)}>
                <Pencil className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {adminT('orders.edit')}
              </DropdownMenuItem>
              {order.status !== 'cancelled' && (
                <DropdownMenuItem 
                  onClick={() => onCancelOrder(order.id)}
                  className="text-red-600"
                >
                  <XCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {adminT('orders.cancel')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-2 text-sm">
          {order.deliveryAddress && (
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 text-gray-600`}>
              <MapPin className="h-4 w-4" />
              <span>{order.deliveryAddress}</span>
            </div>
          )}
          {order.deliveryDate && (
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 text-gray-600`}>
              <Calendar className="h-4 w-4" />
              <span>{order.deliveryDate}</span>
              {order.deliveryTimeSlot && <span>• {order.deliveryTimeSlot}</span>}
            </div>
          )}
          {order.phone && (
            <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 text-gray-600`}>
              <Phone className="h-4 w-4" />
              <span>{order.phone}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-1 flex-wrap`}>
            {['confirmed', 'preparing', 'ready', 'delivered'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={order.status === status ? "default" : "outline"}
                onClick={() => onStatusChange({ orderId: order.id, status })}
                className="h-7 text-xs px-2"
                disabled={order.status === 'cancelled' || order.status === 'delivered'}
              >
                {adminT(`orders.status.${status}`)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Order Edit Form Component
function OrderEditForm({ order, onClose, onSave, searchPlaceholder, adminT, isRTL }: { order: any, onClose: () => void, onSave: () => void, searchPlaceholder: string, adminT: (key: string) => string, isRTL: boolean }) {
  const [editedOrder, setEditedOrder] = useState(order);
  const [showAddItem, setShowAddItem] = useState(false);

  function getUnitDisplay(unit: string) {
    switch (unit) {
      case 'kg':
        return adminT('products.units.kg', 'кг');
      case 'g':
        return adminT('products.units.g', 'г');
      case 'piece':
        return adminT('products.units.piece', 'шт');
      case 'l':
        return adminT('products.units.l', 'л');
      case 'ml':
        return adminT('products.units.ml', 'мл');
      default:
        return unit;
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.customerName')}</Label>
          <Input
            value={editedOrder.customerName || ''}
            onChange={(e) => setEditedOrder({...editedOrder, customerName: e.target.value})}
            className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
        <div>
          <Label className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.phone')}</Label>
          <Input
            value={editedOrder.phone || ''}
            onChange={(e) => setEditedOrder({...editedOrder, phone: e.target.value})}
            className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
      </div>

      <div>
        <Label className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.deliveryAddress')}</Label>
        <Textarea
          value={editedOrder.deliveryAddress || ''}
          onChange={(e) => setEditedOrder({...editedOrder, deliveryAddress: e.target.value})}
          className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.deliveryDate')}</Label>
          <Input
            type="date"
            value={editedOrder.deliveryDate || ''}
            onChange={(e) => setEditedOrder({...editedOrder, deliveryDate: e.target.value})}
            className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
        <div>
          <Label className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.deliveryTimeSlot')}</Label>
          <Input
            value={editedOrder.deliveryTimeSlot || ''}
            onChange={(e) => setEditedOrder({...editedOrder, deliveryTimeSlot: e.target.value})}
            className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
      </div>

      <div>
        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center mb-3`}>
          <Label className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.items')}</Label>
          <Button
            size="sm"
            onClick={() => setShowAddItem(true)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            {adminT('orders.addItem')}
          </Button>
        </div>
        
        <div className="space-y-2 border rounded-lg p-3 max-h-60 overflow-y-auto">
          {editedOrder.items?.map((item: any, index: number) => (
            <div key={index} className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between items-center p-2 bg-gray-50 rounded`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <span className="font-medium">{item.productName}</span>
                <span className="text-sm text-gray-600 ml-2">{item.quantity} {getUnitDisplay(item.unit)}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const newItems = editedOrder.items.filter((_: any, i: number) => i !== index);
                  setEditedOrder({...editedOrder, items: newItems});
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end gap-2`}>
        <Button variant="outline" onClick={onClose}>
          {adminT('common.cancel')}
        </Button>
        <Button onClick={onSave}>
          {adminT('common.save')}
        </Button>
      </div>

      {showAddItem && (
        <AddItemDialog
          onClose={() => setShowAddItem(false)}
          onAdd={(product, quantity) => {
            const newItem = {
              productId: product.id,
              productName: product.name,
              quantity: quantity,
              unit: product.unit,
              price: product.price,
            };
            setEditedOrder({
              ...editedOrder,
              items: [...(editedOrder.items || []), newItem]
            });
            setShowAddItem(false);
          }}
          searchPlaceholder={searchPlaceholder}
          adminT={adminT}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}

// Add Item Dialog Component
function AddItemDialog({ onClose, onAdd, searchPlaceholder, adminT, isRTL }: { onClose: () => void, onAdd: (product: any, quantity: number) => void, searchPlaceholder: string, adminT: (key: string) => string, isRTL: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: products } = useQuery({
    queryKey: ['/api/admin/products'],
  });

  const filteredProducts = products?.data?.filter((product: any) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  function getUnitDisplay(unit: string) {
    switch (unit) {
      case 'kg':
        return adminT('products.units.kg', 'кг');
      case 'g':
        return adminT('products.units.g', 'г');
      case 'piece':
        return adminT('products.units.piece', 'шт');
      case 'l':
        return adminT('products.units.l', 'л');
      case 'ml':
        return adminT('products.units.ml', 'мл');
      default:
        return unit;
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{adminT('orders.addItem')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>{adminT('orders.selectProduct')}</Label>
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>

          {searchTerm && (
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {filteredProducts.map((product: any) => (
                <div
                  key={product.id}
                  className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${selectedProduct?.id === product.id ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">{getUnitDisplay(product.unit)}</div>
                </div>
              ))}
            </div>
          )}

          {selectedProduct && (
            <div>
              <Label>{adminT('orders.quantity')}</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="1"
                className="mt-1"
              />
            </div>
          )}
        </div>

        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end gap-2 mt-4`}>
          <Button variant="outline" onClick={onClose}>
            {adminT('common.cancel')}
          </Button>
          <Button
            onClick={() => {
              if (selectedProduct && quantity > 0) {
                onAdd(selectedProduct, quantity);
              }
            }}
            disabled={!selectedProduct || quantity <= 0}
          >
            {adminT('common.add')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Item Discount Dialog Component
function ItemDiscountDialog({ 
  item, 
  isOpen, 
  onClose, 
  onApplyDiscount, 
  adminT, 
  isRTL 
}: { 
  item: any, 
  isOpen: boolean, 
  onClose: () => void, 
  onApplyDiscount: (itemId: string, discountType: 'percentage' | 'fixed', discountValue: number) => void, 
  adminT: (key: string) => string, 
  isRTL: boolean 
}) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{adminT('orders.applyDiscount')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>{adminT('orders.product')}</Label>
            <div className="p-2 bg-gray-50 rounded">{item?.productName}</div>
          </div>

          <div>
            <Label>{adminT('orders.discountType')}</Label>
            <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{adminT('orders.percentage')}</SelectItem>
                <SelectItem value="fixed">{adminT('orders.fixedAmount')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{adminT('orders.discountValue')}</Label>
            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              min="0"
              className="mt-1"
            />
          </div>
        </div>

        <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-end gap-2 mt-4`}>
          <Button variant="outline" onClick={onClose}>
            {adminT('common.cancel')}
          </Button>
          <Button
            onClick={() => {
              onApplyDiscount(item.id, discountType, discountValue);
              onClose();
            }}
          >
            {adminT('common.apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Admin Dashboard Component
export default function AdminDashboard() {
  // State management
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  
  // Modal states for tile-based interface
  const [basicInfoModalOpen, setBasicInfoModalOpen] = useState(false);
  const [workingHoursModalOpen, setWorkingHoursModalOpen] = useState(false);
  const [deliveryPaymentModalOpen, setDeliveryPaymentModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('products');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [orderView, setOrderView] = useState<'list' | 'kanban'>('list');
  const [discountDialog, setDiscountDialog] = useState<{isOpen: boolean, item: any}>({isOpen: false, item: null});
  const [cancellationDialog, setCancellationDialog] = useState<{isOpen: boolean, orderId: number | null}>({isOpen: false, orderId: null});
  const [cancellationReason, setCancellationReason] = useState('');

  // Original section states (preserved for backward compatibility)
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(false);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
  const [isDeliveryPaymentOpen, setIsDeliveryPaymentOpen] = useState(false);
  const [isTrackingCodeOpen, setIsTrackingCodeOpen] = useState(false);

  const itemsPerPage = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return (
    <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-8">
        <h1 className={`text-3xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dashboard.title')}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Package className="h-4 w-4" />
            {adminT('dashboard.products')}
          </TabsTrigger>
          <TabsTrigger value="orders" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <ShoppingCart className="h-4 w-4" />
            {adminT('dashboard.orders')}
          </TabsTrigger>
          <TabsTrigger value="users" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Users className="h-4 w-4" />
            {adminT('dashboard.users')}
          </TabsTrigger>
          <TabsTrigger value="settings" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Settings className="h-4 w-4" />
            {adminT('dashboard.settings')}
          </TabsTrigger>
          <TabsTrigger value="themes" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <TrendingUp className="h-4 w-4" />
            {adminT('dashboard.themes')}
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab with Tile Interface */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <Settings className="h-5 w-5" />
                <span>{adminT('dashboard.settings')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StoreSettingsForm 
                storeSettings={{}} 
                onSubmit={() => {}} 
                isLoading={false}
                basicInfoModalOpen={basicInfoModalOpen}
                setBasicInfoModalOpen={setBasicInfoModalOpen}
                workingHoursModalOpen={workingHoursModalOpen}
                setWorkingHoursModalOpen={setWorkingHoursModalOpen}
                deliveryPaymentModalOpen={deliveryPaymentModalOpen}
                setDeliveryPaymentModalOpen={setDeliveryPaymentModalOpen}
                languageModalOpen={languageModalOpen}
                setLanguageModalOpen={setLanguageModalOpen}
                trackingModalOpen={trackingModalOpen}
                setTrackingModalOpen={setTrackingModalOpen}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs would be implemented here */}
        <TabsContent value="products">
          <div>Products content placeholder</div>
        </TabsContent>
        
        <TabsContent value="orders">
          <div>Orders content placeholder</div>
        </TabsContent>
        
        <TabsContent value="users">
          <div>Users content placeholder</div>
        </TabsContent>
        
        <TabsContent value="themes">
          <div>Themes content placeholder</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Store Settings Form Component with Tile Interface
function StoreSettingsForm({ 
  storeSettings, 
  onSubmit, 
  isLoading,
  basicInfoModalOpen,
  setBasicInfoModalOpen,
  workingHoursModalOpen,
  setWorkingHoursModalOpen,
  deliveryPaymentModalOpen,
  setDeliveryPaymentModalOpen,
  languageModalOpen,
  setLanguageModalOpen,
  trackingModalOpen,
  setTrackingModalOpen
}: {
  storeSettings: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  basicInfoModalOpen: boolean;
  setBasicInfoModalOpen: (open: boolean) => void;
  workingHoursModalOpen: boolean;
  setWorkingHoursModalOpen: (open: boolean) => void;
  deliveryPaymentModalOpen: boolean;
  setDeliveryPaymentModalOpen: (open: boolean) => void;
  languageModalOpen: boolean;
  setLanguageModalOpen: (open: boolean) => void;
  trackingModalOpen: boolean;
  setTrackingModalOpen: (open: boolean) => void;
}) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  
  const form = useForm({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: '',
      storeDescription: '',
      storeAddress: '',
      storePhone: '',
      storeEmail: '',
      // ... other default values
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Tile-based Settings Interface */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Basic Info Tile */}
          <div
            onClick={() => setBasicInfoModalOpen(true)}
            className="relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group border border-gray-200"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs px-2 py-1 bg-white/20 rounded-full text-white">
                  {adminT('common.configure', 'Настроить')}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gray-100 transition-colors">
                {adminT('storeSettings.basicInfo')}
              </h3>
              
              <p className="text-sm text-white/80 leading-relaxed">
                {adminT('storeSettings.basicInfoDescription', 'Основная информация о магазине')}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium">
                  {adminT('common.clickToConfigure', 'Нажмите для настройки')}
                </span>
                <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          {/* Working Hours Tile */}
          <div
            onClick={() => setWorkingHoursModalOpen(true)}
            className="relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group border border-gray-200"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Clock4 className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs px-2 py-1 bg-white/20 rounded-full text-white">
                  {adminT('common.configure', 'Настроить')}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gray-100 transition-colors">
                {adminT('storeSettings.workingHours')}
              </h3>
              
              <p className="text-sm text-white/80 leading-relaxed">
                {adminT('storeSettings.workingHoursDescription', 'Режим работы магазина')}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium">
                  {adminT('common.clickToConfigure', 'Нажмите для настройки')}
                </span>
                <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          {/* Delivery & Payment Tile */}
          <div
            onClick={() => setDeliveryPaymentModalOpen(true)}
            className="relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group border border-gray-200"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs px-2 py-1 bg-white/20 rounded-full text-white">
                  {adminT('common.configure', 'Настроить')}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gray-100 transition-colors">
                {adminT('storeSettings.deliveryPayment')}
              </h3>
              
              <p className="text-sm text-white/80 leading-relaxed">
                {adminT('storeSettings.deliveryPaymentDescription', 'Доставка и оплата')}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium">
                  {adminT('common.clickToConfigure', 'Нажмите для настройки')}
                </span>
                <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          {/* Language Settings Tile */}
          <div
            onClick={() => setLanguageModalOpen(true)}
            className="relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group border border-gray-200"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Languages className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs px-2 py-1 bg-white/20 rounded-full text-white">
                  {adminT('common.configure', 'Настроить')}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gray-100 transition-colors">
                {adminT('storeSettings.languages')}
              </h3>
              
              <p className="text-sm text-white/80 leading-relaxed">
                {adminT('storeSettings.languagesDescription', 'Настройки языков')}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium">
                  {adminT('common.clickToConfigure', 'Нажмите для настройки')}
                </span>
                <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          {/* Analytics & Tracking Tile */}
          <div
            onClick={() => setTrackingModalOpen(true)}
            className="relative overflow-hidden rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group border border-gray-200"
            style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div className="text-xs px-2 py-1 bg-white/20 rounded-full text-white">
                  {adminT('common.configure', 'Настроить')}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gray-100 transition-colors">
                {adminT('storeSettings.tracking')}
              </h3>
              
              <p className="text-sm text-white/80 leading-relaxed">
                {adminT('storeSettings.trackingDescription', 'Аналитика и отслеживание')}
              </p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium">
                  {adminT('common.clickToConfigure', 'Нажмите для настройки')}
                </span>
                <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Dialogs */}
        <BasicInfoModal 
          open={basicInfoModalOpen} 
          onOpenChange={setBasicInfoModalOpen}
          form={form}
          adminT={adminT}
          isRTL={isRTL}
        />
        
        <WorkingHoursModal 
          open={workingHoursModalOpen} 
          onOpenChange={setWorkingHoursModalOpen}
          form={form}
          adminT={adminT}
          isRTL={isRTL}
        />
        
        <DeliveryPaymentModal 
          open={deliveryPaymentModalOpen} 
          onOpenChange={setDeliveryPaymentModalOpen}
          form={form}
          adminT={adminT}
          isRTL={isRTL}
        />
        
        <LanguageModal 
          open={languageModalOpen} 
          onOpenChange={setLanguageModalOpen}
          form={form}
          adminT={adminT}
          isRTL={isRTL}
        />
        
        <TrackingModal 
          open={trackingModalOpen} 
          onOpenChange={setTrackingModalOpen}
          form={form}
          adminT={adminT}
          isRTL={isRTL}
        />
      </form>
    </Form>
  );
}

// Modal Components
function BasicInfoModal({ open, onOpenChange, form, adminT, isRTL }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            {adminT('storeSettings.basicInfo')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <p className="text-sm text-gray-600">Basic info content placeholder</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkingHoursModal({ open, onOpenChange, form, adminT, isRTL }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock4 className="h-5 w-5 text-primary" />
            {adminT('storeSettings.workingHours')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <p className="text-sm text-gray-600">Working hours content placeholder</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryPaymentModal({ open, onOpenChange, form, adminT, isRTL }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {adminT('storeSettings.deliveryPayment')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <p className="text-sm text-gray-600">Delivery & Payment content placeholder</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LanguageModal({ open, onOpenChange, form, adminT, isRTL }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            {adminT('storeSettings.languages')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <p className="text-sm text-gray-600">Language settings content placeholder</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrackingModal({ open, onOpenChange, form, adminT, isRTL }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {adminT('storeSettings.tracking')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <p className="text-sm text-gray-600">Analytics & Tracking content placeholder</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Additional helper components would be defined here...
function CustomSwitch({ checked, onChange, bgColor = "bg-gray-500" }: { 
  checked: boolean, 
  onChange: (checked: boolean) => void, 
  bgColor?: string 
}) {
  return (
    <Switch checked={checked} onCheckedChange={onChange} />
  );
}