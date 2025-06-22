/**
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 * 
 * Правила для разработчика:
 * - НЕ изменять существующий дизайн и компоновку интерфейса
 * - НЕ заменять на "более удобные" решения без запроса
 * - НЕ менять стили, цвета, расположение элементов
 * - ТОЛЬКО добавлять новый функционал или исправлять то, что конкретно просят
 * - Сохранять все существующие UI паттерны и структуру
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAdminTranslation, useCommonTranslation } from "@/hooks/use-language";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Define updateCategoryMutation outside components for proper scope
let updateCategoryMutation: any;

// Sortable Category Item Component
function SortableCategoryItem({ category, onEdit, onDelete, adminT, isRTL, setActiveTab, setSelectedCategory }: { 
  category: any, 
  onEdit: (category: any) => void, 
  onDelete: (id: number) => void, 
  adminT: (key: string) => string,
  isRTL: boolean,
  setActiveTab: (tab: string) => void,
  setSelectedCategory: (category: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: transform ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-[160px] flex flex-col"
    >
      {/* Header with drag handle and actions */}
      <div className="flex items-center justify-between p-2 pb-0">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -m-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          <GripVertical className="h-3 w-3" />
        </div>
        
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              updateCategoryMutation.mutate({ id: category.id, isActive: !category.isActive });
            }}
            className={`h-6 w-6 p-0 ${category.isActive ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            title={category.isActive ? 'Скрыть категорию' : 'Показать категорию'}
          >
            {category.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(category)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(category.id)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Category content - grows to fill available space */}
      <div className="flex-1 px-2 pt-1 pb-2 flex flex-col">
        {/* Category name */}
        <div className="mb-4">
          <h3 className="font-semibold text-base text-gray-900 truncate group-hover:text-blue-600 transition-colors leading-tight">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-4 max-h-8 overflow-hidden">
              {category.description}
            </p>
          )}
        </div>

        {/* Icon in center */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-6xl transform group-hover:scale-110 transition-transform duration-200">
            {category.icon || '📦'}
          </div>
        </div>

        {/* Bottom section - always at bottom */}
        <div className="mt-auto pt-2">
          {/* Product count */}
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('products');
                setSelectedCategory(category.id.toString());
              }}
              className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-orange-500 text-white border border-orange-600 shadow-sm hover:bg-orange-600 transition-colors duration-200"
            >
              <span className="truncate">
                {(() => {
                  const productCount = category.products?.length || 0;
                  console.log(`Category ${category.name}: ${productCount} products`, category.products);
                  return `${productCount} товаров`;
                })()}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { 
  Package,
  Plus, 
  Edit2, 
  Edit,
  Trash2, 
  Users,
  GripVertical, 
  ShoppingCart, 
  Utensils,
  Save,
  Search,
  Filter,

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
  EyeOff,
  X,
  MessageCircle,
  Code,
  Layers,
  Type,
  Palette,
  Settings,
  Languages,
  Layers3,
  UserCheck
} from "lucide-react";

// Validation schemas
const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.number().min(1),
  price: z.string().min(1),
  unit: z.enum(["100g", "100ml", "piece", "kg"]).default("100g"),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
  availabilityStatus: z.enum(["available", "out_of_stock_today", "completely_unavailable"]).default("available"),
  isSpecialOffer: z.boolean().default(false),
  discountType: z.string().optional(),
  discountValue: z.string().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().default("🍽️"),
});

// Use the imported store settings schema with extended validation
const storeSettingsSchema = insertStoreSettingsSchema.extend({
  contactEmail: z.string().email().optional().or(z.literal("")),
  bottomBanner1Link: z.string().url().optional().or(z.literal("")),
  bottomBanner2Link: z.string().url().optional().or(z.literal("")),
  cancellationReasons: z.array(z.string()).optional(),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
  showWhatsAppChat: z.boolean().default(false),
  whatsappPhoneNumber: z.string().optional(),
  whatsappDefaultMessage: z.string().optional(),
  showCartBanner: z.boolean().default(false),
  cartBannerType: z.enum(["image", "text"]).default("text"),
  cartBannerImage: z.string().optional(),
  cartBannerText: z.string().optional(),
  cartBannerBgColor: z.string().default("#f97316"),
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

// Function to generate delivery times for admin dashboard (same logic as checkout)
const generateAdminDeliveryTimes = (workingHours: any, selectedDate: string, weekStartDay: string = 'monday') => {
  if (!workingHours || !selectedDate) return [];
  
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
      label: 'Closed'
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

  const { t: adminT } = useAdminTranslation();
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return adminT('orders.status.pending');
      case 'confirmed': return adminT('orders.status.confirmed');
      case 'preparing': return adminT('orders.status.preparing');
      case 'ready': return adminT('orders.status.ready');
      case 'delivered': return adminT('orders.status.delivered');
      case 'cancelled': return adminT('orders.status.cancelled');
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-blue-600 text-xs hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                    <Phone className="h-3 w-3" />
                    {order.customerPhone}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem 
                    onClick={() => window.location.href = `tel:${order.customerPhone}`}
                    className="cursor-pointer hover:!text-orange-600 hover:!bg-orange-50 focus:!text-orange-600 focus:!bg-orange-50"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {adminT('orders.call')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      const cleanPhone = order.customerPhone.replace(/[^\d+]/g, '');
                      window.open(`https://wa.me/${cleanPhone}`, '_blank');
                    }}
                    className="cursor-pointer hover:!text-orange-600 hover:!bg-orange-50 focus:!text-orange-600 focus:!bg-orange-50"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Order Amount */}
          <div className="space-y-1">
            {(() => {
              // Extract discount information from order notes
              const extractDiscounts = (notes: string) => {
                const discountMatch = notes?.match(/\[DISCOUNTS:(.*?)\]/);
                if (discountMatch) {
                  try {
                    return JSON.parse(discountMatch[1]);
                  } catch (e) {
                    return { orderDiscount: null, itemDiscounts: null };
                  }
                }
                return { orderDiscount: null, itemDiscounts: null };
              };

              const discounts = extractDiscounts(order.customerNotes || '');
              const hasOrderDiscount = discounts.orderDiscount && discounts.orderDiscount.value > 0;
              const hasItemDiscounts = discounts.itemDiscounts && Object.keys(discounts.itemDiscounts).length > 0;
              
              if (hasOrderDiscount || hasItemDiscounts) {
                // Calculate original total before discounts
                let originalTotal = parseFloat(order.totalAmount);
                
                // Apply reverse order discount calculation
                if (hasOrderDiscount) {
                  if (discounts.orderDiscount.type === 'percentage') {
                    originalTotal = originalTotal / (1 - discounts.orderDiscount.value / 100);
                  } else {
                    originalTotal = originalTotal + discounts.orderDiscount.value;
                  }
                }
                
                return (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 line-through">
                        {formatCurrency(originalTotal)}
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <div className="text-xs text-red-600 font-medium">
                      {adminT('orders.discountApplied')}
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(order.totalAmount)}
                </div>
              );
            })()}
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
                {formatDeliveryTimeRange(order.deliveryTime)}
              </div>
              {order.deliveryAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{order.deliveryAddress}</span>
                </div>
              )}
              {order.paymentMethod && (
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  <span>{order.paymentMethod}</span>
                </div>
              )}
            </div>
          )}



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
              {adminT('orders.orderDetails')}
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
                <SelectItem value="pending">{getStatusLabel('pending')}</SelectItem>
                <SelectItem value="confirmed">{getStatusLabel('confirmed')}</SelectItem>
                <SelectItem value="preparing">{getStatusLabel('preparing')}</SelectItem>
                <SelectItem value="ready">{getStatusLabel('ready')}</SelectItem>
                <SelectItem value="delivered">{getStatusLabel('delivered')}</SelectItem>
                <SelectItem value="cancelled">{getStatusLabel('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// OrderEditForm component
function OrderEditForm({ order, onClose, onSave, searchPlaceholder, adminT, isRTL }: { order: any, onClose: () => void, onSave: () => void, searchPlaceholder: string, adminT: (key: string) => string, isRTL: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: storeSettingsData } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings');
      return await response.json();
    }
  });

  // Generate time slots based on store working hours for this component
  const getFormTimeSlots = (selectedDate = '', workingHours: any = {}, weekStartDay = 'monday') => {
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
        label: 'Closed'
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
  const storeSettings = storeSettingsData;
  const [showAddItem, setShowAddItem] = useState(false);
  const [editedOrderItems, setEditedOrderItems] = useState(order.items || []);
  const [showDiscountDialog, setShowDiscountDialog] = useState<number | null>(null);

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/orders/${order.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: adminT('orders.updated'),
        description: adminT('orders.updateSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: adminT('common.error'),
        description: error.message || adminT('orders.updateError'),
        variant: "destructive",
      });
    },
  });

  // Clean notes from metadata for display
  const cleanNotes = (notes: string) => {
    return notes.replace(/\[ORDER_DATA:.*?\]/g, '').replace(/\[DISCOUNTS:.*?\]/g, '').trim();
  };

  const [editedOrder, setEditedOrder] = useState({
    customerPhone: order.customerPhone || '',
    deliveryAddress: order.deliveryAddress || '',
    deliveryDate: order.deliveryDate || '',
    deliveryTime: order.deliveryTime || '',
    status: order.status || 'pending',
    notes: cleanNotes(order.customerNotes || ''),
  });

  // Extract order metadata (discounts and manual price override) from order notes
  const extractOrderMetadata = (notes: string) => {
    // Try new format first
    const orderDataMatch = notes.match(/\[ORDER_DATA:(.*?)\]/);
    if (orderDataMatch) {
      try {
        const parsed = JSON.parse(orderDataMatch[1]);
        console.log('Extracted order metadata from notes:', parsed);
        return {
          orderDiscount: parsed.orderDiscount || null,
          itemDiscounts: parsed.itemDiscounts || null,
          manualPriceOverride: parsed.manualPriceOverride || null
        };
      } catch (e) {
        console.log('Failed to parse order metadata:', e);
      }
    }
    
    // Fallback to old discount format
    const discountMatch = notes.match(/\[DISCOUNTS:(.*?)\]/);
    if (discountMatch) {
      try {
        const parsed = JSON.parse(discountMatch[1]);
        console.log('Extracted discounts from notes (legacy format):', parsed);
        return {
          orderDiscount: parsed.orderDiscount || null,
          itemDiscounts: parsed.itemDiscounts || null,
          manualPriceOverride: null
        };
      } catch (e) {
        console.log('Failed to parse discount data:', e);
      }
    }
    
    console.log('No order metadata found in notes');
    return { orderDiscount: null, itemDiscounts: null, manualPriceOverride: null };
  };

  const savedOrderData = extractOrderMetadata(order.customerNotes || '');
  console.log('Order customerNotes:', order.customerNotes);
  console.log('Saved order data:', savedOrderData);

  // Discount state
  const [orderDiscount, setOrderDiscount] = useState({
    type: (savedOrderData.orderDiscount?.type || 'percentage') as 'percentage' | 'amount',
    value: savedOrderData.orderDiscount?.value || 0,
    reason: savedOrderData.orderDiscount?.reason || ''
  });

  const [itemDiscounts, setItemDiscounts] = useState<{[key: number]: {type: 'percentage' | 'amount', value: number, reason: string}}>(
    savedOrderData.itemDiscounts || {}
  );

  // Manual price override state
  const [manualPriceOverride, setManualPriceOverride] = useState<{enabled: boolean, value: number}>({
    enabled: savedOrderData.manualPriceOverride?.enabled || false,
    value: savedOrderData.manualPriceOverride?.value || 0
  });

  // Apply saved discounts to order items when order data is loaded
  useEffect(() => {
    if (order.items && Object.keys(savedOrderData.itemDiscounts || {}).length > 0) {
      const updatedItems = editedOrderItems.map((item: any, index: number) => {
        const discount = savedOrderData.itemDiscounts[index];
        if (discount) {
          const quantity = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.pricePerUnit || item.pricePerKg || 0);
          const basePrice = quantity * unitPrice;
          let finalPrice = basePrice;
          
          if (discount.type === 'percentage') {
            finalPrice = basePrice * (1 - discount.value / 100);
          } else {
            finalPrice = Math.max(0, basePrice - discount.value);
          }
          
          return { ...item, totalPrice: finalPrice };
        }
        return item;
      });
      setEditedOrderItems(updatedItems);
    }
  }, [order.items, savedOrderData.itemDiscounts]); // Run when order items are loaded

  // Helper functions for order items editing
  const getUnitDisplay = (unit: string, quantity: number) => {
    const qty = Math.round(quantity * 10) / 10; // Round to 1 decimal place
    switch (unit) {
      case 'piece': return `${qty} шт.`;
      case 'kg': return `${qty} кг`;
      case '100g': 
        if (qty >= 1000) {
          return `${(qty / 1000).toFixed(1)} кг`;
        }
        return `${qty} г`;
      case '100ml': return `${qty} мл`;
      default: return `${qty}`;
    }
  };

  const getUnitPrice = (product: any) => {
    switch (product.unit) {
      case 'piece': return `${formatCurrency(product.price)} за шт.`;
      case 'kg': return `${formatCurrency(product.price)} за кг`;
      case '100g': return `${formatCurrency(product.price)} {adminT('products.per100g')}`;
      case '100ml': return `${formatCurrency(product.price)} за 100мл`;
      default: return formatCurrency(product.price);
    }
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    const updatedItems = [...editedOrderItems];
    const item = updatedItems[index];
    const unitPrice = parseFloat(item.pricePerUnit || item.pricePerKg || 0);
    
    // Calculate base price based on product unit
    let basePrice;
    const unit = item.product?.unit;
    if (unit === '100g' || unit === '100ml') {
      // For 100g/100ml products, price is per 100 units, quantity is in actual units (grams/ml)
      basePrice = unitPrice * (newQuantity / 100);
    } else {
      // For piece and kg products, direct multiplication
      basePrice = newQuantity * unitPrice;
    }
    
    const discount = itemDiscounts[index];
    let finalPrice = basePrice;
    
    if (discount) {
      if (discount.type === 'percentage') {
        finalPrice = basePrice * (1 - discount.value / 100);
      } else {
        finalPrice = Math.max(0, basePrice - discount.value);
      }
    }
    
    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      totalPrice: finalPrice
    };
    setEditedOrderItems(updatedItems);
  };

  const applyItemDiscount = (index: number, discountType: 'percentage' | 'amount', discountValue: number, reason: string) => {
    const updatedDiscounts = { ...itemDiscounts };
    
    // If discount value is 0, remove the discount
    if (discountValue === 0) {
      delete updatedDiscounts[index];
    } else {
      updatedDiscounts[index] = { type: discountType, value: discountValue, reason };
    }
    setItemDiscounts(updatedDiscounts);
    
    // Recalculate item price
    const updatedItems = [...editedOrderItems];
    const item = updatedItems[index];
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.pricePerUnit || item.pricePerKg || 0);
    
    // Calculate base price based on product unit
    let basePrice;
    const unit = item.product?.unit;
    if (unit === '100g' || unit === '100ml') {
      // For 100g/100ml products, price is per 100 units, quantity is in actual units (grams/ml)
      basePrice = unitPrice * (quantity / 100);
    } else {
      // For piece and kg products, direct multiplication
      basePrice = quantity * unitPrice;
    }
    
    let finalPrice = basePrice;
    
    console.log('Discount calculation:', {
      index,
      quantity,
      unitPrice,
      basePrice,
      discountType,
      discountValue
    });
    
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        finalPrice = basePrice * (1 - discountValue / 100);
      } else {
        finalPrice = Math.max(0, basePrice - discountValue);
      }
    }
    
    console.log('Final price after discount:', finalPrice);
    
    updatedItems[index] = { ...item, totalPrice: finalPrice };
    setEditedOrderItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return editedOrderItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  };

  const calculateOrderDiscount = (subtotal: number) => {
    if (orderDiscount.value === 0) return 0;
    
    if (orderDiscount.type === 'percentage') {
      return subtotal * (orderDiscount.value / 100);
    } else {
      return Math.min(orderDiscount.value, subtotal);
    }
  };

  const calculateFinalTotal = () => {
    let subtotal;
    
    // Use manual price override if enabled, otherwise calculate from items
    if (manualPriceOverride.enabled && manualPriceOverride.value > 0) {
      subtotal = manualPriceOverride.value;
    } else {
      subtotal = calculateSubtotal();
      const discount = calculateOrderDiscount(subtotal);
      subtotal = subtotal - discount;
    }
    
    const deliveryFee = parseFloat(order.deliveryFee || "0");
    return subtotal + deliveryFee;
  };

  const removeItem = (index: number) => {
    const updatedItems = editedOrderItems.filter((_: any, i: number) => i !== index);
    setEditedOrderItems(updatedItems);
  };

  const addItem = (product: any, quantity: number) => {
    const unitPrice = product.price || product.pricePerKg || 0;
    const newItem = {
      product,
      productId: product.id,
      quantity,
      pricePerUnit: unitPrice,
      pricePerKg: unitPrice,
      totalPrice: quantity * unitPrice
    };
    setEditedOrderItems([...editedOrderItems, newItem]);
    setShowAddItem(false);
  };

  const handleSave = () => {
    const finalTotal = calculateFinalTotal();
    
    // Store discount and manual price adjustment information in notes
    const orderMetadata = {
      orderDiscount: orderDiscount.value > 0 ? orderDiscount : null,
      itemDiscounts: Object.keys(itemDiscounts).length > 0 ? itemDiscounts : null,
      manualPriceOverride: manualPriceOverride.enabled && manualPriceOverride.value > 0 ? manualPriceOverride : null
    };
    
    const baseNotes = editedOrder.notes || '';
    const notesWithMetadata = baseNotes + 
      (orderMetadata.orderDiscount || orderMetadata.itemDiscounts || orderMetadata.manualPriceOverride ? 
        `\n[ORDER_DATA:${JSON.stringify(orderMetadata)}]` : '');
    
    console.log('Saving order with metadata:', orderMetadata);
    console.log('Notes with metadata:', notesWithMetadata);
    
    updateOrderMutation.mutate({
      ...editedOrder,
      customerNotes: notesWithMetadata,
      items: editedOrderItems,
      totalAmount: finalTotal
    });
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
            <div><strong>{adminT('orders.subtotal')}:</strong> {formatCurrency(parseFloat(order.totalAmount) - parseFloat(order.deliveryFee || "0"))}</div>
            <div><strong>{adminT('orders.deliveryFee')}:</strong> {
              parseFloat(order.deliveryFee || "0") === 0 ? 
                <span className="text-green-600 font-medium">{adminT('common.free')}</span> : 
                formatCurrency(order.deliveryFee || "0")
            }</div>
            <div><strong>{adminT('orders.orderTotal')}:</strong> {formatCurrency(order.totalAmount)}</div>
            <div><strong>{adminT('orders.customer')}:</strong> {order.user?.firstName && order.user?.lastName 
              ? `${order.user.firstName} ${order.user.lastName}`
              : order.user?.email || "—"}</div>
            {order.deliveryDate && (
              <div><strong>Дата доставки:</strong> {new Date(order.deliveryDate).toLocaleDateString('ru-RU')}</div>
            )}
            {order.deliveryTime && (
              <div><strong>Время доставки:</strong> {formatDeliveryTimeRange(order.deliveryTime)}</div>
            )}
            {order.paymentMethod && (
              <div><strong>Способ оплаты:</strong> {order.paymentMethod}</div>
            )}
            {order.deliveryAddress && (
              <div><strong>Адрес доставки:</strong> {order.deliveryAddress}</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Редактирование</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Телефон клиента</label>
              <div className="flex gap-2">
                <Input
                  value={editedOrder.customerPhone}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="Номер телефона"
                  className="text-sm flex-1"
                />
                {editedOrder.customerPhone && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem 
                        onClick={() => window.location.href = `tel:${editedOrder.customerPhone}`}
                        className="cursor-pointer hover:!text-orange-600 hover:!bg-orange-50 focus:!text-orange-600 focus:!bg-orange-50"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Позвонить
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          const cleanPhone = editedOrder.customerPhone.replace(/[^\d+]/g, '');
                          window.open(`https://wa.me/${cleanPhone}`, '_blank');
                        }}
                        className="cursor-pointer hover:!text-orange-600 hover:!bg-orange-50 focus:!text-orange-600 focus:!bg-orange-50"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
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
              <Select
                value={formatDeliveryTimeRange(editedOrder.deliveryTime || "")}
                onValueChange={(value) => setEditedOrder(prev => ({ ...prev, deliveryTime: value }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Выберите время" />
                </SelectTrigger>
                <SelectContent>
                  {getFormTimeSlots(editedOrder.deliveryDate, storeSettingsData?.workingHours, storeSettingsData?.weekStartDay).map((slot: any) => (
                    <SelectItem key={slot.value} value={slot.label}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Товары в заказе</h3>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowAddItem(true)}
            className="text-xs"
          >
            <Plus className={`h-3 w-3 ${isRTL ? 'mr-4' : 'mr-4'}`} />
            {adminT('orders.addProduct')}
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Товар</TableHead>
                <TableHead className="text-xs w-32">Количество</TableHead>
                <TableHead className="text-xs w-20">Цена</TableHead>
                <TableHead className="text-xs w-24">Сумма</TableHead>
                <TableHead className="text-xs w-20">{adminT('orders.discount')}</TableHead>
                <TableHead className="text-xs w-16">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedOrderItems.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="text-sm">
                    <div>
                      <div className="font-medium">{item.product?.name}</div>
                      {item.product?.description && (
                        <div className="text-xs text-gray-500">{item.product.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0.1)}
                        className="w-16 h-7 text-xs"
                      />
                      <span className="text-xs text-gray-500">
                        {getUnitDisplay(item.product?.unit, item.quantity)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{getUnitPrice(item.product)}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      {itemDiscounts[index] ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDiscountDialog(index)}
                          className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {itemDiscounts[index].type === 'percentage' 
                            ? `${itemDiscounts[index].value}%` 
                            : `₪${itemDiscounts[index].value}`}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDiscountDialog(index)}
                          className="h-6 px-2 text-xs"
                        >
                          Скидка
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeItem(index)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Order Total Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">{adminT('orders.orderSummary')}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{adminT('orders.subtotal')}:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            
            <div className="flex justify-between">
              <span>{adminT('orders.deliveryFee')}:</span>
              <span>
                {parseFloat(order.deliveryFee || "0") === 0 ? (
                  <span className="text-green-600 font-medium">{adminT('common.free')}</span>
                ) : (
                  formatCurrency(order.deliveryFee || "0")
                )}
              </span>
            </div>
            
            {/* Order-level discount */}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Общая скидка на заказ:</span>
                <span className="text-red-600">-{formatCurrency(calculateOrderDiscount(calculateSubtotal()))}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={orderDiscount.type}
                  onValueChange={(value: 'percentage' | 'amount') => 
                    setOrderDiscount(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="amount">₪</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0"
                  value={orderDiscount.value}
                  onChange={(e) => setOrderDiscount(prev => ({ 
                    ...prev, 
                    value: parseFloat(e.target.value) || 0 
                  }))}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Причина"
                  value={orderDiscount.reason}
                  onChange={(e) => setOrderDiscount(prev => ({ 
                    ...prev, 
                    reason: e.target.value 
                  }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            
            {/* Manual Price Adjustment */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ручная корректировка цены:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualPriceOverride.enabled}
                    onChange={(e) => setManualPriceOverride(prev => ({ 
                      ...prev, 
                      enabled: e.target.checked 
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              
              {manualPriceOverride.enabled && (
                <div className="space-y-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Введите новую сумму заказа"
                    value={manualPriceOverride.value || ''}
                    onChange={(e) => setManualPriceOverride(prev => ({ 
                      ...prev, 
                      value: parseFloat(e.target.value) || 0 
                    }))}
                    className="h-8 text-xs"
                  />
                  <p className="text-xs text-orange-600">
                    * Указанная сумма заменит расчетную стоимость товаров
                  </p>
                  {!manualPriceOverride.enabled && (
                    <p className="text-xs text-gray-500">
                      Расчетная стоимость: {formatCurrency(calculateSubtotal() - calculateOrderDiscount(calculateSubtotal()))}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>К доплате:</span>
              <span>{formatCurrency(calculateFinalTotal())}</span>
            </div>
          </div>
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

      {/* Add Item Dialog */}
      {showAddItem && (
        <AddItemDialog 
          onClose={() => setShowAddItem(false)}
          onAdd={addItem}
          searchPlaceholder={searchPlaceholder}
          adminT={adminT}
          isRTL={isRTL}
        />
      )}

      {/* Item Discount Dialog */}
      {showDiscountDialog !== null && (
        <ItemDiscountDialog
          itemIndex={showDiscountDialog}
          item={editedOrderItems[showDiscountDialog]}
          currentDiscount={itemDiscounts[showDiscountDialog]}
          onClose={() => setShowDiscountDialog(null)}
          onApply={applyItemDiscount}
          adminT={adminT}
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          {adminT('common.cancel')}
        </Button>
        <Button 
          onClick={handleSave}
          disabled={updateOrderMutation.isPending}
          variant="success"
        >
          {updateOrderMutation.isPending ? adminT('common.saving') : adminT('common.saveChanges')}
        </Button>
      </div>
    </div>
  );
}

// Add Item Dialog Component
function AddItemDialog({ onClose, onAdd, searchPlaceholder, adminT, isRTL }: { onClose: () => void, onAdd: (product: any, quantity: number) => void, searchPlaceholder: string, adminT: (key: string) => string, isRTL: boolean }) {
  
  function getUnitDisplay(unit: string) {
    switch (unit) {
      case 'piece': return adminT('products.units.piece');
      case 'kg': return adminT('products.units.kg');
      case '100g': return adminT('products.units.per100g');
      case '100ml': return adminT('products.units.per100ml');
      default: return '';
    }
  }
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: productsResponse } = useQuery({
    queryKey: ["/api/products"],
    select: (data: any) => data?.filter((product: any) => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  });

  const handleAdd = () => {
    if (selectedProduct && quantity > 0) {
      onAdd(selectedProduct, quantity);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Добавить товар</h3>
        
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-3"
          />
        </div>

        {/* Product List */}
        <div className="mb-4 max-h-60 overflow-y-auto border rounded">
          {productsResponse?.map((product: any) => (
            <div
              key={product.id}
              className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                selectedProduct?.id === product.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedProduct(product)}
            >
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-gray-500">
                {formatCurrency(product.price || product.pricePerKg)} за {getUnitDisplay(product.unit)}
              </div>
            </div>
          ))}
        </div>

        {/* Quantity */}
        {selectedProduct && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Количество ({getUnitDisplay(selectedProduct.unit)})
            </label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0.1)}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={!selectedProduct || quantity <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Добавить
          </Button>
        </div>
      </div>
    </div>
  );
}

// Item Discount Dialog Component
function ItemDiscountDialog({ 
  itemIndex, 
  item, 
  currentDiscount, 
  onClose, 
  onApply,
  adminT 
}: { 
  itemIndex: number;
  item: any;
  currentDiscount?: {type: 'percentage' | 'amount', value: number, reason: string};
  onClose: () => void;
  onApply: (index: number, type: 'percentage' | 'amount', value: number, reason: string) => void;
  adminT: (key: string) => string;
}) {
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(currentDiscount?.type || 'percentage');
  const [discountValue, setDiscountValue] = useState(currentDiscount?.value || 0);
  const [discountReason, setDiscountReason] = useState(currentDiscount?.reason || '');

  const handleApply = () => {
    if (discountValue > 0) {
      onApply(itemIndex, discountType, discountValue, discountReason);
    }
    onClose();
  };

  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.pricePerUnit || item.pricePerKg || 0);
  const basePrice = quantity * unitPrice;
  const discountAmount = discountType === 'percentage' 
    ? basePrice * (discountValue / 100) 
    : Math.min(discountValue, basePrice);
  const finalPrice = basePrice - discountAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Скидка на товар</h3>
        
        <div className="mb-4">
          <div className="font-medium">{item.product?.name}</div>
          <div className="text-sm text-gray-500">
            Базовая стоимость: {formatCurrency(basePrice)}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Тип скидки</label>
            <Select
              value={discountType}
              onValueChange={(value: 'percentage' | 'amount') => setDiscountType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Процент (%)</SelectItem>
                <SelectItem value="amount">Сумма (₪)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Размер скидки {discountType === 'percentage' ? '(%)' : '(₪)'}
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={discountType === 'percentage' ? "100" : basePrice.toString()}
              value={discountValue}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Причина скидки</label>
            <Input
              placeholder="Укажите причину скидки..."
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />
          </div>

          {discountValue > 0 && (
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>{adminT('orders.discount')}:</span>
                  <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{adminT('orders.orderTotal')}:</span>
                  <span>{formatCurrency(finalPrice)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          {currentDiscount && (
            <Button 
              variant="outline" 
              onClick={() => {
                onApply(itemIndex, 'percentage', 0, '');
                onClose();
              }}
              className="text-red-600 hover:text-red-800"
            >
              {adminT('orders.removeDiscount')}
            </Button>
          )}
          <Button 
            onClick={handleApply}
            className="bg-green-600 hover:bg-green-700"
          >
            {adminT('actions.apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { t: adminT } = useAdminTranslation();
  const { t: commonT, i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  const queryClient = useQueryClient();

  // Data queries with pagination  
  const { data: storeSettings, isLoading: storeSettingsLoading } = useQuery<StoreSettings>({
    queryKey: ["/api/settings"]
  });

  // Helper function to check worker permissions
  const hasPermission = (permission: string) => {
    if (user?.role === "admin") return true;
    if (user?.role !== "worker") return false;
    
    const workerPermissions = (storeSettings?.workerPermissions as any) || {};
    return workerPermissions[permission] === true;
  };

  // State for forms and filters
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  const [sortField, setSortField] = useState<"name" | "price" | "category">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState("products");

  // Set default tab based on worker permissions
  useEffect(() => {
    if (user?.role === "worker" && storeSettings) {
      const workerPermissions = (storeSettings?.workerPermissions as any) || {};
      let defaultTab = "products";
      
      if (workerPermissions.canManageProducts) {
        defaultTab = "products";
      } else if (workerPermissions.canManageCategories) {
        defaultTab = "categories";
      } else if (workerPermissions.canManageOrders) {
        defaultTab = "orders";
      } else if (workerPermissions.canViewUsers) {
        defaultTab = "users";
      } else if (workerPermissions.canViewSettings) {
        defaultTab = "store";
      } else if (workerPermissions.canManageSettings) {
        defaultTab = "settings";
      }
      
      setActiveTab(defaultTab);
    }
  }, [user, storeSettings]);

  // Orders management state
  const [ordersViewMode, setOrdersViewMode] = useState<"table" | "kanban">("table");
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("active"); // active, delivered, cancelled, all
  
  // Cancellation dialog state
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);

  // Availability confirmation dialog state
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [productToToggle, setProductToToggle] = useState<{ id: number; currentStatus: boolean } | null>(null);

  // Pagination state
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  // User management state
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [usersRoleFilter, setUsersRoleFilter] = useState("all");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle category drag end
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const categoriesArray = categories as any[];
      const oldIndex = categoriesArray.findIndex((category: any) => category.id === active.id);
      const newIndex = categoriesArray.findIndex((category: any) => category.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCategories = arrayMove(categoriesArray, oldIndex, newIndex);
        
        // Create category orders array with new sort order
        const categoryOrders = newCategories.map((category: any, index: number) => ({
          id: category.id,
          sortOrder: index + 1
        }));

        // Execute mutation to update database
        reorderCategoriesMutation.mutate(categoryOrders);
      }
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setProductsPage(1);
  }, [searchQuery, selectedCategoryFilter, selectedCategory, selectedStatusFilter]);

  // Update category filter when selectedCategory changes
  useEffect(() => {
    if (selectedCategory !== "all") {
      setSelectedCategoryFilter(selectedCategory);
    }
  }, [selectedCategory]);

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
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  // Check admin access - allow admin and worker roles
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "worker" && user.email !== "alexjc55@gmail.com" && user.username !== "admin") {
      toast({
        title: "Доступ запрещен",
        description: "У вас нет прав администратора или работника",
        variant: "destructive",
      });
      window.location.href = "/";
      return;
    }
  }, [user, toast]);

  // Status color helper function
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

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories", "includeInactive"],
    queryFn: async () => {
      const response = await fetch('/api/categories?includeInactive=true');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    }
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

  // Category mutations
  updateCategoryMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'includeInactive'] });
      setEditingCategory(null);
      setIsCategoryFormOpen(false);
      toast({ title: adminT('categories.notifications.categoryUpdated'), description: adminT('categories.notifications.categoryUpdatedDesc') });
    },
    onError: (error: any) => {
      console.error("Category update error:", error);
      toast({ title: adminT('common.error'), description: adminT('categories.notifications.updateError'), variant: "destructive" });
    }
  });

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
      toast({ title: adminT('products.notifications.productCreated'), description: adminT('products.notifications.productCreatedDesc') });
    },
    onError: (error: any) => {
      console.error("Product creation error:", error);
      toast({ title: adminT('common.error'), description: adminT('products.notifications.createError'), variant: "destructive" });
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
      toast({ title: adminT('products.notifications.productUpdated'), description: adminT('products.notifications.productUpdatedDesc') });
    },
    onError: (error: any) => {
      console.error("Product update error:", error);
      toast({ 
        title: adminT('common.error'), 
        description: error.message || adminT('products.notifications.updateError'), 
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
      toast({ title: adminT('products.notifications.productDeleted'), description: adminT('products.notifications.productDeletedDesc') });
    },
    onError: (error: any) => {
      console.error("Product deletion error:", error);
      toast({ title: adminT('common.error'), description: adminT('products.notifications.deleteError'), variant: "destructive" });
    }
  });

  const updateAvailabilityStatusMutation = useMutation({
    mutationFn: async ({ id, availabilityStatus }: { id: number; availabilityStatus: string }) => {
      const response = await fetch(`/api/products/${id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityStatus }),
      });
      if (!response.ok) throw new Error('Failed to update availability status');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsAvailabilityDialogOpen(false);
      setProductToToggle(null);
      toast({ title: adminT('products.notifications.statusUpdated'), description: adminT('products.notifications.statusUpdatedDesc') });
    },
    onError: (error: any) => {
      console.error("Update availability status error:", error);
      toast({ title: adminT('common.error'), description: adminT('products.notifications.statusError'), variant: "destructive" });
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
      toast({ title: adminT('common.error'), description: adminT('products.notifications.availabilityError'), variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'includeInactive'] });
      setIsCategoryFormOpen(false);
      setEditingCategory(null);
      toast({ title: adminT('categories.notifications.categoryCreated'), description: adminT('categories.notifications.categoryCreatedDesc') });
    },
    onError: (error: any) => {
      console.error("Category creation error:", error);
      toast({ title: adminT('common.error'), description: adminT('categories.notifications.createError'), variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await apiRequest('DELETE', `/api/categories/${categoryId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'includeInactive'] });
      toast({ title: adminT('categories.notifications.categoryDeleted'), description: adminT('categories.notifications.categoryDeletedDesc') });
    },
    onError: (error: any) => {
      console.error("Category deletion error:", error);
      toast({ title: adminT('common.error'), description: adminT('categories.notifications.deleteError'), variant: "destructive" });
    }
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async (categoryOrders: { id: number; sortOrder: number }[]) => {
      const response = await fetch('/api/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryOrders }),
      });
      if (!response.ok) throw new Error('Failed to reorder categories');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'includeInactive'] });
      toast({ title: adminT('categories.notifications.orderUpdated'), description: adminT('categories.notifications.orderUpdatedDesc') });
    },
    onError: (error: any) => {
      console.error("Category reordering error:", error);
      toast({ title: adminT('common.error'), description: adminT('categories.notifications.reorderError'), variant: "destructive" });
    }
  });

  // Store settings mutation
  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      // Clean up empty numeric fields to prevent database errors
      const cleanedData = { ...settingsData };
      
      // Convert empty strings to null for numeric fields
      if (cleanedData.deliveryFee === '') {
        cleanedData.deliveryFee = null;
      }
      if (cleanedData.freeDeliveryFrom === '') {
        cleanedData.freeDeliveryFrom = null;
      }
      if (cleanedData.minimumOrderAmount === '') {
        cleanedData.minimumOrderAmount = null;
      }
      
      const response = await apiRequest('PUT', '/api/settings', cleanedData);
      return await response.json();
    },
    onSuccess: () => {
      // Update cache data directly instead of invalidating to prevent tab switching
      queryClient.setQueryData(['/api/settings'], (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData };
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: adminT('settings.saved'), description: adminT('settings.saveSuccess') });
    },
    onError: (error: any) => {
      console.error("Store settings update error:", error);
      toast({ title: adminT('common.error'), description: adminT('settings.saveError'), variant: "destructive" });
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
        title: adminT('orders.notifications.statusUpdated'),
        description: adminT('orders.notifications.statusUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: commonT("errors.error"),
        description: error.message || adminT("orders.updateError"),
        variant: "destructive",
      });
    },
  });

  // User management mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to create user');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsUserFormOpen(false);
      setEditingUser(null);
      toast({ title: adminT("users.created"), description: adminT("users.createSuccess") });
    },
    onError: (error: any) => {
      console.error("User creation error:", error);
      toast({ title: commonT("errors.error"), description: adminT("users.createError"), variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: any) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
      setIsUserFormOpen(false);
      toast({ title: adminT("users.updated"), description: adminT("users.updateSuccess") });
    },
    onError: (error: any) => {
      console.error("User update error:", error);
      toast({ title: commonT("errors.error"), description: adminT("users.updateError"), variant: "destructive" });
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: "admin" | "worker" | "customer" }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error('Failed to update user role');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: adminT('users.notifications.roleUpdated'), description: adminT('users.notifications.roleUpdatedDesc') });
    },
    onError: (error: any) => {
      console.error("User role update error:", error);
      toast({ title: adminT('common.error'), description: adminT('users.notifications.roleUpdateError'), variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: adminT('users.notifications.userDeleted'), description: adminT('users.notifications.userDeletedDesc') });
    },
    onError: (error: any) => {
      console.error("User deletion error:", error);
      toast({ title: adminT('common.error'), description: adminT('users.notifications.deleteError'), variant: "destructive" });
    }
  });

  // Password management mutations
  const setUserPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string, password: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set password');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: adminT('users.notifications.passwordSet'), description: adminT('users.notifications.passwordSetDesc') });
    },
    onError: (error: any) => {
      console.error("Set password error:", error);
      toast({ title: adminT('common.error'), description: error.message || adminT('users.notifications.passwordSetError'), variant: "destructive" });
    }
  });

  // Handle order cancellation with reason selection
  const handleOrderCancellation = (orderId: number) => {
    setOrderToCancel(orderId);
    setIsCancellationDialogOpen(true);
  };

  // RTL table scroll fix - scroll to show leftmost content first for RTL tables on mobile
  useEffect(() => {
    const handleTableScroll = () => {
      if (isRTL) {
        const tableContainers = document.querySelectorAll('.table-container');
        tableContainers.forEach((container) => {
          const element = container as HTMLElement;
          
          // Check if we're on mobile (screen width <= 768px)
          const isMobile = window.innerWidth <= 768;
          
          if (isMobile && element.classList.contains('rtl-scroll-container')) {
            // For RTL scroll containers on mobile, scroll to start (0) to show first column
            element.scrollLeft = 0;
          } else if (isMobile) {
            // On mobile RTL, scroll to the leftmost position to show the first column (product name)
            // In RTL direction, the leftmost content requires scrolling to the right edge
            const maxScrollLeft = element.scrollWidth - element.clientWidth;
            element.scrollLeft = maxScrollLeft;
          } else {
            // On desktop, keep the default RTL behavior
            element.scrollLeft = 0;
          }
        });
      }
    };

    // Initial scroll positioning
    setTimeout(handleTableScroll, 100);

    // Add resize listener for orientation changes
    window.addEventListener('resize', handleTableScroll);
    
    return () => {
      window.removeEventListener('resize', handleTableScroll);
    };
  }, [isRTL, activeTab, productsData, usersData, ordersResponse]);

  // Reset scroll position for RTL tables
  useEffect(() => {
    if (isRTL && (productsData || usersData || ordersResponse)) {
      const resetScrollPosition = () => {
        const rtlContainers = document.querySelectorAll('.rtl-scroll-container');
        rtlContainers.forEach((container) => {
          const element = container as HTMLElement;
          element.scrollLeft = 0;
        });
      };
      
      setTimeout(resetScrollPosition, 100);
    }
  }, [isRTL, productsData, usersData, ordersResponse, activeTab]);

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

  function getUnitDisplay(unit: string) {
    switch (unit) {
      case 'piece': return adminT('products.units.piece');
      case 'kg': return adminT('products.units.kg');
      case '100g': return adminT('products.units.per100g');
      case '100ml': return adminT('products.units.per100ml');
      default: return '';
    }
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
    <div className={`min-h-screen bg-gray-50 pt-16`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <div className={`flex flex-col sm:flex-row sm:items-center ${isRTL ? 'sm:flex-row-reverse' : ''} justify-between gap-4`}>
            <div className={`${isRTL ? 'text-right ml-auto' : 'text-left mr-auto'} w-full sm:w-auto`}>
              <h1 className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dashboard.title')}</h1>
              <p className={`text-gray-600 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dashboard.overview')}</p>
            </div>

          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-8">
          <div>
            {/* Mobile Dropdown Menu */}
            <div className="block sm:hidden mb-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-white border-gray-200 h-12">
                  <SelectValue>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {!isRTL && (
                        <>
                          {activeTab === 'products' && <Package className="w-5 h-5" />}
                          {activeTab === 'categories' && <Layers3 className="w-5 h-5" />}
                          {activeTab === 'orders' && <ShoppingCart className="w-5 h-5" />}
                          {activeTab === 'users' && <Users className="w-5 h-5" />}
                          {activeTab === 'store' && <Settings className="w-5 h-5" />}
                          {activeTab === 'settings' && <UserCheck className="w-5 h-5" />}
                          {activeTab === 'themes' && <Palette className="w-5 h-5" />}
                        </>
                      )}
                      <span className="text-lg font-medium">
                        {activeTab === 'products' && adminT('tabs.products')}
                        {activeTab === 'categories' && adminT('tabs.categories')}
                        {activeTab === 'orders' && adminT('tabs.orders')}
                        {activeTab === 'users' && adminT('tabs.users')}
                        {activeTab === 'store' && adminT('tabs.settings')}
                        {activeTab === 'settings' && adminT('tabs.permissions')}
                        {activeTab === 'themes' && adminT('tabs.themes')}
                      </span>
                      {isRTL && (
                        <>
                          {activeTab === 'products' && <Package className="w-5 h-5" />}
                          {activeTab === 'categories' && <Layers3 className="w-5 h-5" />}
                          {activeTab === 'orders' && <ShoppingCart className="w-5 h-5" />}
                          {activeTab === 'users' && <Users className="w-5 h-5" />}
                          {activeTab === 'store' && <Settings className="w-5 h-5" />}
                          {activeTab === 'settings' && <UserCheck className="w-5 h-5" />}
                          {activeTab === 'themes' && <Palette className="w-5 h-5" />}
                        </>
                      )}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {hasPermission("canManageProducts") && (
                    <SelectItem value="products" className="py-3">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isRTL && <Package className="w-5 h-5" />}
                        <span className="text-lg">{adminT('tabs.products')}</span>
                        {isRTL && <Package className="w-5 h-5" />}
                      </div>
                    </SelectItem>
                  )}
                  {hasPermission("canManageCategories") && (
                    <SelectItem value="categories" className="py-3">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isRTL && <Layers3 className="w-5 h-5" />}
                        <span className="text-lg">{adminT('tabs.categories')}</span>
                        {isRTL && <Layers3 className="w-5 h-5" />}
                      </div>
                    </SelectItem>
                  )}
                  {hasPermission("canManageOrders") && (
                    <SelectItem value="orders" className="py-3">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isRTL && <ShoppingCart className="w-5 h-5" />}
                        <span className="text-lg">{adminT('tabs.orders')}</span>
                        {isRTL && <ShoppingCart className="w-5 h-5" />}
                      </div>
                    </SelectItem>
                  )}
                  {hasPermission("canViewUsers") && (
                    <SelectItem value="users" className="py-3">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isRTL && <Users className="w-5 h-5" />}
                        <span className="text-lg">{adminT('tabs.users')}</span>
                        {isRTL && <Users className="w-5 h-5" />}
                      </div>
                    </SelectItem>
                  )}
                  {hasPermission("canViewSettings") && (
                    <SelectItem value="store" className="py-3">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isRTL && <Settings className="w-5 h-5" />}
                        <span className="text-lg">{adminT('tabs.settings')}</span>
                        {isRTL && <Settings className="w-5 h-5" />}
                      </div>
                    </SelectItem>
                  )}
                  {hasPermission("canManageSettings") && (
                    <SelectItem value="settings" className="py-3">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isRTL && <UserCheck className="w-5 h-5" />}
                        <span className="text-lg">{adminT('tabs.permissions')}</span>
                        {isRTL && <UserCheck className="w-5 h-5" />}
                      </div>
                    </SelectItem>
                  )}
                  {hasPermission("canManageSettings") && (
                    <SelectItem value="themes" className="py-3">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {!isRTL && <Palette className="w-5 h-5" />}
                        <span className="text-lg">{adminT('tabs.themes')}</span>
                        {isRTL && <Palette className="w-5 h-5" />}
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Desktop Tabs - hidden on mobile screens */}
            <div className="hidden sm:block">
              <TabsList className={`admin-tabs-list ${isRTL ? 'rtl-tabs-reverse' : ''} flex w-full overflow-x-auto gap-1`}>
              {isRTL ? (
                // RTL order: reverse the tab order
                <>
                  {hasPermission("canManageSettings") && (
                    <TabsTrigger value="themes" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.themes')}>
                      <Palette className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.themes')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageSettings") && (
                    <TabsTrigger value="settings" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.permissions')}>
                      <UserCheck className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.permissions')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canViewSettings") && (
                    <TabsTrigger value="store" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.settings')}>
                      <Settings className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.settings')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canViewUsers") && (
                    <TabsTrigger value="users" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.users')}>
                      <Users className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.users')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageOrders") && (
                    <TabsTrigger value="orders" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.orders')}>
                      <ShoppingCart className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.orders')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageCategories") && (
                    <TabsTrigger value="categories" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.categories')}>
                      <Layers3 className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.categories')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageProducts") && (
                    <TabsTrigger value="products" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.products')}>
                      <Package className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.products')}</span>
                    </TabsTrigger>
                  )}
                </>
              ) : (
                // LTR order: normal order
                <>
                  {hasPermission("canManageProducts") && (
                    <TabsTrigger value="products" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.products')}>
                      <Package className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.products')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageCategories") && (
                    <TabsTrigger value="categories" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.categories')}>
                      <Layers3 className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.categories')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageOrders") && (
                    <TabsTrigger value="orders" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.orders')}>
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.orders')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canViewUsers") && (
                    <TabsTrigger value="users" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.users')}>
                      <Users className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.users')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canViewSettings") && (
                    <TabsTrigger value="store" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.settings')}>
                      <Settings className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.settings')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageSettings") && (
                    <TabsTrigger value="settings" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.permissions')}>
                      <UserCheck className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.permissions')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageSettings") && (
                    <TabsTrigger value="themes" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.themes')}>
                      <Palette className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.themes')}</span>
                    </TabsTrigger>
                  )}
                </>
              )}
              </TabsList>
            </div>
          </div>

          {/* Products Management */}
          {hasPermission("canManageProducts") && (
            <TabsContent value="products" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                  <div className={`${isRTL ? 'text-right sm:order-2' : 'text-left sm:order-1'}`}>
                    <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      {adminT('products.title')}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {adminT('products.description', 'Полное управление товарами с поиском и фильтрацией')}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingProduct(null);
                      setIsProductFormOpen(true);
                    }}
                    className={`bg-orange-500 text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 w-full sm:w-auto ${isRTL ? 'sm:order-1' : 'sm:order-2'}`}
                    size="sm"
                  >
                    <Plus className={`h-4 w-4 ${isRTL ? 'mr-4' : 'mr-4'}`} />
                    {adminT('actions.add')} {adminT('products.title')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter Controls */}
                <div className={`flex flex-col gap-3 ${isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
                  <div className="relative flex-1">
                    <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                      placeholder={adminT('products.searchProducts', 'Поиск товаров...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'}`}
                    />
                  </div>
                  <div className={`flex flex-col gap-3 lg:flex-shrink-0 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
                    <div className="relative min-w-[180px]">
                      <Filter className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                        <SelectTrigger className={`text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'}`}>
                          <SelectValue placeholder={adminT('products.allCategories', 'Все категории')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{adminT('products.allCategories', 'Все категории')}</SelectItem>
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
                      <Filter className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                        <SelectTrigger className={`text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'}`}>
                          <SelectValue placeholder={adminT('products.productStatus', 'Статус товара')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                          <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">{adminT('products.allProducts', 'Все товары')}</SelectItem>
                          <SelectItem value="available" className="text-gray-900 hover:bg-gray-100">{adminT('products.availableProducts', 'Доступные товары')}</SelectItem>
                          <SelectItem value="unavailable" className="text-gray-900 hover:bg-gray-100">{adminT('products.unavailableProducts', 'Недоступные товары')}</SelectItem>
                          <SelectItem value="with_discount" className="text-gray-900 hover:bg-gray-100">{adminT('products.productsWithDiscount', 'Товары со скидкой')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                {filteredProducts.length > 0 ? (
                  <div className="border rounded-lg bg-white overflow-hidden">
                    <div className={`overflow-x-auto table-container ${isRTL ? 'rtl-scroll-container' : ''}`}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {/* Dynamically order columns for RTL */}
                            {isRTL ? (
                              // RTL order: Status, Price, Category, Name (reversed)
                              <>
                                <TableHead className={`min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm text-right`}>{adminT('products.productStatus')}</TableHead>
                                <TableHead className={`min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm text-right`}>
                                  <button 
                                    onClick={() => handleSort("price")}
                                    className="flex items-center gap-1 hover:text-orange-600 transition-colors flex-row-reverse"
                                  >
                                    {adminT('products.productPrice')}
                                    {sortField === "price" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className={`min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm text-right`}>
                                  <button 
                                    onClick={() => handleSort("category")}
                                    className="flex items-center gap-1 hover:text-orange-600 transition-colors flex-row-reverse"
                                  >
                                    {adminT('products.productCategory')}
                                    {sortField === "category" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className={`min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm text-right`}>
                                  <button 
                                    onClick={() => handleSort("name")}
                                    className="flex items-center gap-1 hover:text-orange-600 transition-colors flex-row-reverse"
                                  >
                                    {adminT('products.productName')}
                                    {sortField === "name" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                              </>
                            ) : (
                              // LTR order: Name, Category, Price, Status (normal)
                              <>
                                <TableHead className={`min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm text-left`}>
                                  <button 
                                    onClick={() => handleSort("name")}
                                    className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                                  >
                                    {adminT('products.productName')}
                                    {sortField === "name" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className={`min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm text-left`}>
                                  <button 
                                    onClick={() => handleSort("category")}
                                    className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                                  >
                                    {adminT('products.productCategory')}
                                    {sortField === "category" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className={`min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm text-left`}>
                                  <button 
                                    onClick={() => handleSort("price")}
                                    className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                                  >
                                    {adminT('products.productPrice')}
                                    {sortField === "price" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className={`min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm text-left`}>{adminT('products.productStatus')}</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product: any) => (
                            <TableRow key={product.id}>
                              {/* Dynamically order columns for RTL */}
                              {isRTL ? (
                                // RTL order: Status, Price, Category, Name (reversed)
                                <>
                                  <TableCell className="px-2 sm:px-4 py-2 text-right">
                                    <div className="flex flex-col gap-1 items-end">
                                      <CustomSwitch
                                        checked={product.isAvailable && (product.availabilityStatus === "available")}
                                        onChange={(checked) => {
                                          if (!checked) {
                                            setProductToToggle({ id: product.id, currentStatus: product.isAvailable });
                                            setIsAvailabilityDialogOpen(true);
                                          } else {
                                            updateAvailabilityStatusMutation.mutate({
                                              id: product.id,
                                              availabilityStatus: "available"
                                            });
                                          }
                                        }}
                                        bgColor="bg-green-500"
                                      />
                                      {product.availabilityStatus === "out_of_stock_today" && (
                                        <div className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md mt-1">
                                          {adminT('products.preorder')}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-right">
                                    <div className={`text-xs sm:text-sm p-2 rounded ${product.isSpecialOffer && product.discountType && product.discountValue ? 'bg-yellow-50 border border-yellow-200' : ''}`}>
                                      {product.isSpecialOffer && product.discountType && product.discountValue && !isNaN(parseFloat(product.discountValue)) ? (
                                        <div className="space-y-1">
                                          <div className="text-gray-400 line-through text-xs" dir="ltr">{formatCurrency(product.price || product.pricePerKg)}</div>
                                          <div className="font-semibold text-gray-900" dir="ltr">
                                            {formatCurrency(
                                              product.discountType === "percentage"
                                                ? parseFloat(product.price || product.pricePerKg || "0") * (1 - parseFloat(product.discountValue) / 100)
                                                : Math.max(0, parseFloat(product.price || product.pricePerKg || "0") - parseFloat(product.discountValue))
                                            )}
                                          </div>
                                          <div className="text-orange-600 text-xs font-medium" dir="ltr">
                                            -{product.discountType === "percentage" ? `${product.discountValue}%` : formatCurrency(parseFloat(product.discountValue))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="font-semibold text-gray-900" dir="ltr">{formatCurrency(product.price || product.pricePerKg)}</div>
                                      )}
                                      <div className="text-gray-500 text-xs mt-1">{getUnitDisplay(product.unit || "100g")}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-right">
                                    <Badge variant="outline" className="text-xs">
                                      {product.category?.name}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-right">
                                    <button
                                      onClick={() => {
                                        setEditingProduct(product);
                                        setIsProductFormOpen(true);
                                      }}
                                      className="font-medium text-xs sm:text-sm hover:text-orange-600 transition-colors cursor-pointer text-right"
                                    >
                                      {product.name}
                                    </button>
                                  </TableCell>
                                </>
                              ) : (
                                // LTR order: Name, Category, Price, Status (normal)
                                <>
                                  <TableCell className="px-2 sm:px-4 py-2 text-left">
                                    <button
                                      onClick={() => {
                                        setEditingProduct(product);
                                        setIsProductFormOpen(true);
                                      }}
                                      className="font-medium text-xs sm:text-sm hover:text-orange-600 transition-colors cursor-pointer text-left"
                                    >
                                      {product.name}
                                    </button>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-left">
                                    <Badge variant="outline" className="text-xs">
                                      {product.category?.name}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-left">
                                    <div className={`text-xs sm:text-sm p-2 rounded ${product.isSpecialOffer && product.discountType && product.discountValue ? 'bg-yellow-50 border border-yellow-200' : ''}`}>
                                      {product.isSpecialOffer && product.discountType && product.discountValue && !isNaN(parseFloat(product.discountValue)) ? (
                                        <div className="space-y-1">
                                          <div className="text-gray-400 line-through text-xs" dir="ltr">{formatCurrency(product.price || product.pricePerKg)}</div>
                                          <div className="font-semibold text-gray-900" dir="ltr">
                                            {formatCurrency(
                                              product.discountType === "percentage"
                                                ? parseFloat(product.price || product.pricePerKg || "0") * (1 - parseFloat(product.discountValue) / 100)
                                                : Math.max(0, parseFloat(product.price || product.pricePerKg || "0") - parseFloat(product.discountValue))
                                            )}
                                          </div>
                                          <div className="text-orange-600 text-xs font-medium" dir="ltr">
                                            -{product.discountType === "percentage" ? `${product.discountValue}%` : formatCurrency(parseFloat(product.discountValue))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="font-semibold text-gray-900" dir="ltr">{formatCurrency(product.price || product.pricePerKg)}</div>
                                      )}
                                      <div className="text-gray-500 text-xs mt-1">{getUnitDisplay(product.unit || "100g")}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-left">
                                    <div className="flex flex-col gap-1 items-start">
                                      <CustomSwitch
                                        checked={product.isAvailable && (product.availabilityStatus === "available")}
                                        onChange={(checked) => {
                                          if (!checked) {
                                            setProductToToggle({ id: product.id, currentStatus: product.isAvailable });
                                            setIsAvailabilityDialogOpen(true);
                                          } else {
                                            updateAvailabilityStatusMutation.mutate({
                                              id: product.id,
                                              availabilityStatus: "available"
                                            });
                                          }
                                        }}
                                        bgColor="bg-green-500"
                                      />
                                      {product.availabilityStatus === "out_of_stock_today" && (
                                        <div className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md mt-1">
                                          {adminT('products.preorder')}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </>
                              )}
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
                      {searchQuery || selectedCategoryFilter !== "all" ? adminT('common.noResults', 'Товары не найдены') : adminT('products.noProducts', 'Нет товаров')}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {searchQuery || selectedCategoryFilter !== "all" 
                        ? adminT('common.tryDifferentSearch', 'Попробуйте изменить критерии поиска или фильтрации')
                        : adminT('products.addFirstProduct', 'Начните с добавления первого товара')
                      }
                    </p>
                  </div>
                )}
                
                {/* Products Pagination */}
                {productsTotalPages > 1 && (
                  <div className="px-4 py-3 border-t bg-gray-50">
                    {/* Mobile: Stack info and controls */}
                    <div className="sm:hidden space-y-2">
                      <div className="text-center text-xs text-gray-600">
                        {adminT('common.showing', 'Показано')} {((productsPage - 1) * itemsPerPage) + 1}-{Math.min(productsPage * itemsPerPage, productsTotal)} {adminT('common.of', 'из')} {productsTotal}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(1)}
                          disabled={productsPage === 1}
                          title="Первая страница"
                          className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.max(1, prev - 1))}
                          disabled={productsPage === 1}
                          title="Предыдущая страница"
                          className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-4 bg-white border border-orange-500 rounded h-9 flex items-center justify-center min-w-[60px]">
                          {productsPage}/{productsTotalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.min(productsTotalPages, prev + 1))}
                          disabled={productsPage === productsTotalPages}
                          title="Следующая страница"
                          className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(productsTotalPages)}
                          disabled={productsPage === productsTotalPages}
                          title="Последняя страница"
                          className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟩⟩
                        </Button>
                      </div>
                    </div>
                    
                    {/* Desktop: Original layout */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>{adminT('common.showing', 'Показано')} {((productsPage - 1) * itemsPerPage) + 1}-{Math.min(productsPage * itemsPerPage, productsTotal)} {adminT('common.of', 'из')} {productsTotal}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(1)}
                          disabled={productsPage === 1}
                          title="Первая страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.max(1, prev - 1))}
                          disabled={productsPage === 1}
                          title="Предыдущая страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-white border border-orange-500 rounded h-8 flex items-center">
                          {productsPage} из {productsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.min(productsTotalPages, prev + 1))}
                          disabled={productsPage === productsTotalPages}
                          title="Следующая страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(productsTotalPages)}
                          disabled={productsPage === productsTotalPages}
                          title="Последняя страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟩⟩
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Categories Management */}
          {hasPermission("canManageCategories") && (
            <TabsContent value="categories" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <div className={`${isRTL ? 'text-right sm:order-2' : 'text-left sm:order-1'}`}>
                      <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
                      {adminT('categories.title')}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {adminT('categories.description', 'Простое управление категориями')}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingCategory(null);
                      setIsCategoryFormOpen(true);
                    }}
                    className={`bg-orange-500 text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 w-full sm:w-auto ${isRTL ? 'sm:order-1' : 'sm:order-2'}`}
                    size="sm"
                  >
                    <Plus className={`${isRTL ? 'mr-4' : 'mr-4'} h-4 w-4`} />
                    {adminT('actions.add')} {adminT('categories.title')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(categories as any[] || []).length > 0 ? (
                  <div className="space-y-4" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                    <div className="text-sm text-gray-600 mb-4">
                      {adminT('categories.dragToReorder', 'Перетащите категории для изменения порядка отображения')}
                    </div>
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleCategoryDragEnd}
                    >
                      <SortableContext 
                        items={(categories as any[]).map((cat: any) => cat.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {(categories as any[] || []).map((category: any) => (
                            <SortableCategoryItem
                              key={category.id}
                              category={category}
                              onEdit={(category) => {
                                setEditingCategory(category);
                                setIsCategoryFormOpen(true);
                              }}
                              onDelete={(id) => deleteCategoryMutation.mutate(id)}
                              adminT={adminT}
                              isRTL={isRTL}
                              setActiveTab={setActiveTab}
                              setSelectedCategory={setSelectedCategory}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ) : (
                  <div className={`text-center py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className={`text-lg font-medium text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.noCategories', 'Нет категорий')}</h3>
                    <p className={`text-gray-500 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.addFirstCategory', 'Начните с добавления первой категории')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Orders Management */}
          {hasPermission("canManageOrders") && (
            <TabsContent value="orders" className="space-y-4 sm:space-y-6">
              {/* Header Section */}
              <div className="flex flex-col gap-4">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h1 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <ShoppingCart className="h-6 w-6" />
                    {adminT('orders.title')}
                  </h1>
                  <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.description', 'Управление заказами клиентов')}</p>
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
                    {adminT('common.table', 'Таблица')}
                  </Button>
                  <Button
                    variant={ordersViewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setOrdersViewMode("kanban")}
                    className="text-xs px-3 py-1 h-8"
                  >
                    <Columns className="h-3 w-3 mr-1" />
                    {adminT('common.kanban', 'Канбан')}
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                  <Select value={ordersStatusFilter} onValueChange={setOrdersStatusFilter}>
                    <SelectTrigger className="w-40 text-xs h-8">
                      <SelectValue placeholder={adminT('orders.filterOrders', 'Фильтр заказов')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{adminT('orders.activeOrders', 'Активные заказы')}</SelectItem>
                      <SelectItem value="delivered">{adminT('orders.deliveredOrders', 'Доставленные заказы')}</SelectItem>
                      <SelectItem value="cancelled">{adminT('orders.cancelledOrders', 'Отмененные заказы')}</SelectItem>
                      <SelectItem value="all">{adminT('orders.allOrders', 'Все заказы')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                    <Input
                      placeholder={adminT('orders.searchOrders', 'Поиск заказов...')}
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
                      <div className="border rounded-lg bg-white">
                        <div className="w-full table-container">
                          <Table className="rtl:text-right">
                            <TableHeader>
                              <TableRow>
                                <TableHead className={`text-xs sm:text-sm w-12 ${isRTL ? 'text-right' : 'text-left'}`}>№</TableHead>
                                <TableHead className={`text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.customer', 'Клиент')}</TableHead>
                                <TableHead className={`text-xs sm:text-sm hidden sm:table-cell w-24 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.status', 'Статус')}</TableHead>
                                <TableHead className={`text-xs sm:text-sm w-20 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.total', 'Сумма')}</TableHead>
                                <TableHead className={`text-xs sm:text-sm hidden md:table-cell w-32 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.date', 'Дата и время')}</TableHead>
                                <TableHead className={`text-xs sm:text-sm w-12 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.actions', 'Действия')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ordersResponse.data.map((order: any) => (
                                <TableRow key={order.id} className="hover:bg-gray-50">
                                  <TableCell className={`font-bold text-xs sm:text-sm text-orange-600 ${isRTL ? 'text-right' : 'text-left'}`}>#{order.id}</TableCell>
                                  <TableCell className={`text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="space-y-1">
                                      <div className="font-medium">
                                        {order.user?.firstName && order.user?.lastName 
                                          ? `${order.user.firstName} ${order.user.lastName}`
                                          : order.user?.email || "—"
                                        }
                                      </div>
                                      {order.customerPhone && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="text-blue-600 text-xs hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                                              <Phone className="h-3 w-3" />
                                              {order.customerPhone}
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="start" className="w-40 bg-white border border-gray-200 shadow-lg">
                                            <DropdownMenuItem 
                                              onClick={() => window.location.href = `tel:${order.customerPhone}`}
                                              className="cursor-pointer text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                            >
                                              <Phone className="h-4 w-4 mr-2" />
{adminT('orders.call', 'Позвонить')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                const cleanPhone = order.customerPhone.replace(/[^\d+]/g, '');
                                                window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                              }}
                                              className="cursor-pointer text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                            >
                                              <MessageCircle className="h-4 w-4 mr-2" />
                                              WhatsApp
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className={`hidden sm:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
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
                                      <SelectTrigger className={`w-full h-8 text-xs border-2 ${getStatusColor(order.status)} ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                                        <SelectItem value="pending" className="text-yellow-800 hover:bg-yellow-50">Ожидает</SelectItem>
                                        <SelectItem value="confirmed" className="text-blue-800 hover:bg-blue-50">Подтвержден</SelectItem>
                                        <SelectItem value="preparing" className="text-orange-800 hover:bg-orange-50">Готовится</SelectItem>
                                        <SelectItem value="ready" className="text-green-800 hover:bg-green-50">Готов</SelectItem>
                                        <SelectItem value="delivered" className="text-gray-800 hover:bg-gray-50">Доставлен</SelectItem>
                                        <SelectItem value="cancelled" className="text-red-800 hover:bg-red-50">Отменен</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className={`font-medium text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                    {(() => {
                                      // Extract discount information from order notes
                                      const extractDiscounts = (notes: string) => {
                                        const discountMatch = notes?.match(/\[DISCOUNTS:(.*?)\]/);
                                        if (discountMatch) {
                                          try {
                                            return JSON.parse(discountMatch[1]);
                                          } catch (e) {
                                            return { orderDiscount: null, itemDiscounts: null };
                                          }
                                        }
                                        return { orderDiscount: null, itemDiscounts: null };
                                      };

                                      const discounts = extractDiscounts(order.customerNotes || '');
                                      const hasOrderDiscount = discounts.orderDiscount && discounts.orderDiscount.value > 0;
                                      const hasItemDiscounts = discounts.itemDiscounts && Object.keys(discounts.itemDiscounts).length > 0;
                                      
                                      if (hasOrderDiscount || hasItemDiscounts) {
                                        // Calculate original total before discounts
                                        let originalTotal = parseFloat(order.totalAmount);
                                        
                                        // Apply reverse order discount calculation
                                        if (hasOrderDiscount) {
                                          if (discounts.orderDiscount.type === 'percentage') {
                                            originalTotal = originalTotal / (1 - discounts.orderDiscount.value / 100);
                                          } else {
                                            originalTotal = originalTotal + discounts.orderDiscount.value;
                                          }
                                        }
                                        
                                        return (
                                          <div className="space-y-1">
                                            <div className="flex flex-col gap-1">
                                              <span className="text-xs text-gray-500 line-through">
                                                {formatCurrency(originalTotal)}
                                              </span>
                                              <span className="font-medium text-green-600">
                                                {formatCurrency(order.totalAmount)}
                                              </span>
                                            </div>
                                            <div className="text-xs text-red-600 font-medium">
                                              скидка
                                            </div>
                                          </div>
                                        );
                                      }
                                      
                                      // Show detailed breakdown for orders with delivery fee
                                      const deliveryFee = parseFloat(order.deliveryFee || "0");
                                      const subtotal = parseFloat(order.totalAmount) - deliveryFee;
                                      
                                      if (deliveryFee > 0) {
                                        return (
                                          <div className="space-y-1">
                                            <div className="text-xs text-gray-600">
                                              Товары: {formatCurrency(subtotal)}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              Доставка: {formatCurrency(deliveryFee)}
                                            </div>
                                            <div className="font-medium">
                                              {formatCurrency(order.totalAmount)}
                                            </div>
                                          </div>
                                        );
                                      } else if (deliveryFee === 0 && order.deliveryFee !== undefined) {
                                        return (
                                          <div className="space-y-1">
                                            <div className="text-xs text-gray-600">
                                              Товары: {formatCurrency(subtotal)}
                                            </div>
                                            <div className="text-xs text-green-600">
                                              Доставка: Бесплатно
                                            </div>
                                            <div className="font-medium">
                                              {formatCurrency(order.totalAmount)}
                                            </div>
                                          </div>
                                        );
                                      }
                                      
                                      return formatCurrency(order.totalAmount);
                                    })()}
                                  </TableCell>
                                  <TableCell className={`text-xs sm:text-sm hidden md:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="space-y-1">
                                      <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Calendar className="h-3 w-3 text-gray-400" />
                                        <span className="font-medium">Создан:</span>
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {new Date(order.createdAt).toLocaleDateString('ru-RU')} {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {order.deliveryDate && (
                                        <>
                                          <div className={`flex items-center gap-1 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Clock className="h-3 w-3 text-blue-400" />
                                            <span className="font-medium text-blue-600">Доставка:</span>
                                          </div>
                                          <div className="text-xs text-blue-600">
                                            {new Date(order.deliveryDate).toLocaleDateString('ru-RU')} {order.deliveryTime || ''}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className={`${isRTL ? 'text-right' : 'text-left'}`}>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-xs h-8 px-2"
                                      onClick={() => {
                                        setEditingOrder(order);
                                        setIsOrderFormOpen(true);
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* Pagination for table view */}
                        <div className={`flex items-center justify-between px-4 py-3 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-2 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <span>Показано {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} из {ordersResponse.total}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(1)}
                              disabled={ordersResponse.page === 1}
                              title="Первая страница"
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              ⟨⟨
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                              disabled={ordersResponse.page === 1}
                              title="Предыдущая страница"
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-3 py-1 bg-white border border-orange-500 rounded h-8 flex items-center">
                              {ordersResponse.page} из {ordersResponse.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title="Следующая страница"
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(ordersResponse.totalPages)}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title="Последняя страница"
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              ⟩⟩
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Kanban View */}
                    {ordersViewMode === "kanban" && (
                      <div 
                        className="overflow-x-auto kanban-scroll-container"
                        ref={(el) => {
                          if (el && ordersViewMode === "kanban") {
                            setTimeout(() => {
                              if (el) {
                                el.scrollLeft = 0;
                              }
                            }, 100);
                          }
                        }}
                      >
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
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const orderId = e.dataTransfer.getData("orderId");
                              if (orderId) {
                                updateOrderStatusMutation.mutate({
                                  orderId: parseInt(orderId),
                                  status: "pending"
                                });
                              }
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
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const orderId = e.dataTransfer.getData("orderId");
                              if (orderId) {
                                updateOrderStatusMutation.mutate({
                                  orderId: parseInt(orderId),
                                  status: "confirmed"
                                });
                              }
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
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const orderId = e.dataTransfer.getData("orderId");
                              if (orderId) {
                                updateOrderStatusMutation.mutate({
                                  orderId: parseInt(orderId),
                                  status: "preparing"
                                });
                              }
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
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const orderId = e.dataTransfer.getData("orderId");
                              if (orderId) {
                                updateOrderStatusMutation.mutate({
                                  orderId: parseInt(orderId),
                                  status: "ready"
                                });
                              }
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
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const orderId = e.dataTransfer.getData("orderId");
                                if (orderId) {
                                  updateOrderStatusMutation.mutate({
                                    orderId: parseInt(orderId),
                                    status: "delivered"
                                  });
                                }
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
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const orderId = e.dataTransfer.getData("orderId");
                                if (orderId) {
                                  handleOrderCancellation(parseInt(orderId));
                                }
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
                      <div className="px-4 py-3 border-t bg-gray-50 mt-4">
                        {/* Mobile: Stack info and controls */}
                        <div className="sm:hidden space-y-2">
                          <div className="text-center text-xs text-gray-600">
                            Показано {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} из {ordersResponse.total}
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(1)}
                              disabled={ordersResponse.page === 1}
                              title="Первая страница"
                              className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              ⟨⟨
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                              disabled={ordersResponse.page === 1}
                              title="Предыдущая страница"
                              className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-4 bg-white border border-orange-500 rounded h-9 flex items-center justify-center min-w-[60px]">
                              {ordersResponse.page}/{ordersResponse.totalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title="Следующая страница"
                              className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(ordersResponse.totalPages)}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title="Последняя страница"
                              className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              ⟩⟩
                            </Button>
                          </div>
                        </div>
                        
                        {/* Desktop: Original layout */}
                        <div className="hidden sm:flex items-center justify-between">
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
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              ⟨⟨
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                              disabled={ordersResponse.page === 1}
                              title="Предыдущая страница"
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-3 py-1 bg-white border border-orange-500 rounded h-8 flex items-center">
                              {ordersResponse.page} из {ordersResponse.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title="Следующая страница"
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(ordersResponse.totalPages)}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title="Последняя страница"
                              className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              ⟩⟩
                            </Button>
                          </div>
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
                    {editingOrder ? `${adminT('orders.order')} #${editingOrder.id}` : adminT('orders.newOrder')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingOrder ? adminT('orders.editOrderDescription') : adminT('orders.createOrderDescription')}
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
                    searchPlaceholder={adminT('common.searchProducts')}
                    adminT={adminT}
                    isRTL={isRTL}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
          )}

          {/* Users Management */}
          {hasPermission("canViewUsers") && (
            <TabsContent value="users" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        Пользователи
                      </CardTitle>
                      <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        Управление пользователями и ролями
                      </CardDescription>
                    </div>
                  </div>
              </CardHeader>
              <CardContent>
                {/* Users Filters and Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Поиск по email или имени..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={usersRoleFilter} onValueChange={setUsersRoleFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Все роли" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        <SelectItem value="admin">Администраторы</SelectItem>
                        <SelectItem value="worker">Сотрудники</SelectItem>
                        <SelectItem value="customer">Клиенты</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => setIsUserFormOpen(true)}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Plus className={`h-4 w-4 ${isRTL ? 'mr-4' : 'mr-4'}`} />
                      {adminT('users.addUser', 'Добавить пользователя')}
                    </Button>
                  </div>
                </div>

                {(usersData as any[] || []).length > 0 ? (
                  <div className="border rounded-lg bg-white overflow-hidden">
                    <div className={`overflow-x-auto table-container ${isRTL ? 'rtl-scroll-container' : ''}`}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Имя</TableHead>
                            <TableHead className="text-xs sm:text-sm">Роль</TableHead>
                            <TableHead className="text-xs sm:text-sm">Телефон</TableHead>
                            <TableHead className="text-xs sm:text-sm">Заказов</TableHead>
                            <TableHead className="text-xs sm:text-sm">Сумма заказов</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(usersData as any[] || []).map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setIsUserFormOpen(true);
                                  }}
                                  className="h-auto p-0 font-medium text-blue-600 hover:text-blue-800 hover:bg-transparent"
                                >
                                  {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.email || "Безымянный пользователь"
                                  }
                                </Button>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <Badge variant="outline" className={
                                  user.role === "admin" ? "border-red-200 text-red-700 bg-red-50" :
                                  user.role === "worker" ? "border-orange-200 text-orange-700 bg-orange-50" :
                                  "border-gray-200 text-gray-700 bg-gray-50"
                                }>
                                  {user.role === "admin" ? "Админ" : 
                                   user.role === "worker" ? "Сотрудник" : "Клиент"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {user.phone ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-auto p-0 font-medium text-blue-600 hover:text-blue-800 hover:bg-transparent"
                                      >
                                        {user.phone}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg">
                                      <DropdownMenuItem onClick={() => window.open(`tel:${user.phone}`, '_self')} className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
                                        <Phone className="mr-2 h-4 w-4" />
                                        Позвонить
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => window.open(`https://wa.me/${user.phone.replace(/[^\d]/g, '')}`, '_blank')} className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        WhatsApp
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <span className="font-medium">
                                  {user.orderCount || 0}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <span className="font-medium">
                                  {formatCurrency(user.totalOrderAmount || 0)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination for users table */}
                    <div className="flex items-center justify-between px-4 py-3 border-t">
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
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                          disabled={usersPage === 1}
                          title="Предыдущая страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-white border border-orange-500 rounded h-8 flex items-center">
                          {usersPage} из {usersTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                          disabled={usersPage === usersTotalPages}
                          title="Следующая страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(usersTotalPages)}
                          disabled={usersPage === usersTotalPages}
                          title="Последняя страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟩⟩
                        </Button>
                      </div>
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
                  <div className="px-4 py-3 border-t bg-gray-50">
                    {/* Mobile: Stack info and controls */}
                    <div className="sm:hidden space-y-2">
                      <div className="text-center text-xs text-gray-600">
                        Показано {((usersPage - 1) * itemsPerPage) + 1}-{Math.min(usersPage * itemsPerPage, usersTotal)} из {usersTotal}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(1)}
                          disabled={usersPage === 1}
                          title="Первая страница"
                          className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                          disabled={usersPage === 1}
                          title="Предыдущая страница"
                          className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-4 bg-white border border-orange-500 rounded h-9 flex items-center justify-center min-w-[60px]">
                          {usersPage}/{usersTotalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                          disabled={usersPage === usersTotalPages}
                          title="Следующая страница"
                          className="h-9 w-9 p-0 bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(usersTotalPages)}
                          disabled={usersPage === usersTotalPages}
                          title="Последняя страница"
                          className="h-9 w-9 p-0 text-xs bg-white text-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟩⟩
                        </Button>
                      </div>
                    </div>
                    
                    {/* Desktop: Original layout */}
                    <div className="hidden sm:flex items-center justify-between">
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
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                          disabled={usersPage === 1}
                          title="Предыдущая страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-white border border-orange-500 rounded h-8 flex items-center">
                          {usersPage} из {usersTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                          disabled={usersPage === usersTotalPages}
                          title="Следующая страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(usersTotalPages)}
                          disabled={usersPage === usersTotalPages}
                          title="Последняя страница"
                          className="h-8 px-3 bg-white border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟩⟩
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Store Management */}
          {hasPermission("canViewSettings") && (
            <TabsContent value="store" className="space-y-4 sm:space-y-6">
              <div className="grid gap-6">
                {/* Basic Store Information */}
                <Card>
                  <CardHeader>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                        {adminT('settings.title')}
                      </CardTitle>
                      <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {adminT('settings.description')}
                      </CardDescription>
                    </div>
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
          )}

          {/* Settings Management */}
          {hasPermission("canManageSettings") && (
            <TabsContent value="settings" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Settings className="h-5 w-5" />
                      Настройки системы
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      Управление правами доступа для сотрудников
                    </CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Worker Permissions Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Права доступа сотрудников</h3>
                  <p className="text-sm text-gray-600">
                    Настройте, к каким разделам админ-панели имеют доступ пользователи с ролью "Работник"
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Управление товарами</label>
                          <p className="text-xs text-gray-500">Добавление, редактирование и удаление товаров</p>
                        </div>
                        <CustomSwitch
                          checked={(storeSettings?.workerPermissions as any)?.canManageProducts || false}
                          onChange={(checked) => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageProducts: checked
                              }
                            })
                          }
                          bgColor="bg-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Управление категориями</label>
                          <p className="text-xs text-gray-500">Добавление, редактирование и удаление категорий</p>
                        </div>
                        <CustomSwitch
                          checked={(storeSettings?.workerPermissions as any)?.canManageCategories || false}
                          onChange={(checked) => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageCategories: checked
                              }
                            })
                          }
                          bgColor="bg-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Управление заказами</label>
                          <p className="text-xs text-gray-500">Просмотр и изменение статуса заказов</p>
                        </div>
                        <CustomSwitch
                          checked={(storeSettings?.workerPermissions as any)?.canManageOrders || false}
                          onChange={(checked) => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageOrders: checked
                              }
                            })
                          }
                          bgColor="bg-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Просмотр пользователей</label>
                          <p className="text-xs text-gray-500">Просмотр списка клиентов</p>
                        </div>
                        <Switch
                          checked={(storeSettings?.workerPermissions as any)?.canViewUsers || false}
                          onCheckedChange={(checked) => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canViewUsers: checked
                              }
                            })
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Управление пользователями</label>
                          <p className="text-xs text-gray-500">Редактирование и удаление пользователей</p>
                        </div>
                        <CustomSwitch
                          checked={(storeSettings?.workerPermissions as any)?.canManageUsers || false}
                          onChange={(checked) => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageUsers: checked
                              }
                            })
                          }
                          bgColor="bg-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Просмотр настроек</label>
                          <p className="text-xs text-gray-500">Доступ к настройкам магазина (только чтение)</p>
                        </div>
                        <CustomSwitch
                          checked={(storeSettings?.workerPermissions as any)?.canViewSettings || false}
                          onChange={(checked) => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canViewSettings: checked
                              }
                            })
                          }
                          bgColor="bg-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Управление настройками</label>
                          <p className="text-xs text-gray-500">Полный доступ к настройкам магазина</p>
                        </div>
                        <CustomSwitch
                          checked={(storeSettings?.workerPermissions as any)?.canManageSettings || false}
                          onChange={(checked) => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageSettings: checked
                              }
                            })
                          }
                          bgColor="bg-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Theme Management */}
          {hasPermission("canManageSettings") && (
            <TabsContent value="themes" className="space-y-4 sm:space-y-6">
              <ThemeManager />
            </TabsContent>
          )}
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
        adminT={adminT}
        onSubmit={(data: any) => {
          // Set isAvailable based on availability status
          const productData = {
            ...data,
            isAvailable: data.availabilityStatus !== 'completely_unavailable'
          };
          
          if (editingProduct) {
            updateProductMutation.mutate({ id: editingProduct.id, ...productData });
          } else {
            createProductMutation.mutate(productData);
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

      {/* User Form Dialog */}
      <UserFormDialog
        open={isUserFormOpen}
        onClose={() => {
          setIsUserFormOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSubmit={(data: any) => {
          if (editingUser) {
            // For editing users, handle password separately if provided
            const { password, ...userData } = data;
            updateUserMutation.mutate({ id: editingUser.id, ...userData });
            
            // If password is provided, set it separately
            if (password && password.trim()) {
              setUserPasswordMutation.mutate({ userId: editingUser.id, password });
            }
          } else {
            // For creating new users, include password in the creation
            createUserMutation.mutate(data);
          }
        }}
        onDelete={(userId: string) => deleteUserMutation.mutate(userId)}
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
        cancellationReasons={(storeSettings?.cancellationReasons as string[]) || ["Клиент отменил", "Товар отсутствует", "Технические проблемы", "Другое"]}
      />

      {/* Availability Confirmation Dialog */}
      <AlertDialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
        <AlertDialogContent className={isRTL ? 'rtl' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>
              {adminT('products.statusDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {adminT('products.statusDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={`${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
            <AlertDialogAction
              onClick={() => {
                if (productToToggle) {
                  updateAvailabilityStatusMutation.mutate({
                    id: productToToggle.id,
                    availabilityStatus: "completely_unavailable"
                  });
                }
              }}
              className={`btn-system btn-error ${isRTL ? 'mr-2' : 'ml-2'}`}
            >
              {adminT('products.statusDialog.disable')}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (productToToggle) {
                  updateAvailabilityStatusMutation.mutate({
                    id: productToToggle.id,
                    availabilityStatus: "out_of_stock_today"
                  });
                }
              }}
              className={`btn-system btn-info ${isRTL ? 'ml-2' : 'mr-2'}`}
            >
              {adminT('products.statusDialog.keep')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Custom Switch Component for mobile compatibility
function CustomSwitch({ checked, onChange, bgColor = "bg-gray-500" }: { 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  bgColor?: string;
}) {
  return (
    <div
      onClick={() => {
        try {
          onChange(!checked);
        } catch (error) {
          console.error('Switch toggle error:', error);
        }
      }}
      className={`cursor-pointer transition-colors rounded-full relative flex items-center ${
        checked ? bgColor : 'bg-gray-200'
      }`}
      style={{ 
        width: '44px', 
        height: '24px',
        padding: '2px',
        direction: 'ltr'
      }}
    >
      <div
        className="bg-white rounded-full transition-transform shadow-md border border-gray-200"
        style={{ 
          width: '20px', 
          height: '20px',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)'
        }}
      />
    </div>
  );
}

// Form Dialog Components
function ProductFormDialog({ open, onClose, categories, product, onSubmit, onDelete, adminT }: any) {
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
      availabilityStatus: "available" as const,
      isSpecialOffer: false,
      discountType: "",
      discountValue: "",
    },
  });

  // Watch form values with useWatch to avoid re-render issues on mobile
  const isSpecialOffer = useWatch({ control: form.control, name: "isSpecialOffer" });
  const discountType = useWatch({ control: form.control, name: "discountType" });
  const unit = useWatch({ control: form.control, name: "unit" });

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
          availabilityStatus: product.availabilityStatus || "available",
          isSpecialOffer: product.isSpecialOffer ?? false,
          discountType: product.discountType || "",
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
          availabilityStatus: "available" as const,
          isSpecialOffer: false,
          discountType: "",
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
            {product ? adminT('products.dialog.editTitle') : adminT('products.dialog.addTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {product ? adminT('products.dialog.editDescription') : adminT('products.dialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">{adminT('products.dialog.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={adminT('products.dialog.namePlaceholder')} {...field} className="text-sm" />
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
                  <FormLabel className="text-sm">{adminT('products.dialog.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={adminT('products.dialog.descriptionPlaceholder')}
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
                  <FormLabel className="text-sm">{adminT('products.dialog.categoryLabel')}</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={adminT('products.dialog.categoryPlaceholder')} />
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
                    <FormLabel className="text-sm">{adminT('products.dialog.priceLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder={adminT('products.dialog.pricePlaceholder')}
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
                    <FormLabel className="text-sm">{adminT('products.dialog.unitLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder={adminT('products.dialog.unitLabel')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="100g" className="text-sm">{adminT('products.dialog.unit100g')}</SelectItem>
                        <SelectItem value="100ml" className="text-sm">{adminT('products.dialog.unit100ml')}</SelectItem>
                        <SelectItem value="piece" className="text-sm">{adminT('products.dialog.unitPiece')}</SelectItem>
                        <SelectItem value="kg" className="text-sm">{adminT('products.dialog.unitKg')}</SelectItem>
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
                  <FormLabel className="text-sm">{adminT('products.dialog.imageLabel')}</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    {adminT('products.dialog.recommendedSize')}
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availabilityStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">{adminT('products.dialog.availabilityLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={adminT('products.dialog.availabilityPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available" className="text-sm">{adminT('products.dialog.statusAvailable')}</SelectItem>
                      <SelectItem value="completely_unavailable" className="text-sm">{adminT('products.dialog.statusUnavailable')}</SelectItem>
                      <SelectItem value="out_of_stock_today" className="text-sm">{adminT('products.dialog.statusOutOfStock')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-gray-500">
                    {adminT('products.dialog.statusDescription')}
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSpecialOffer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm sm:text-base">{adminT('products.dialog.specialOfferLabel')}</FormLabel>
                    <div className="text-xs sm:text-sm text-gray-500">
                      {adminT('products.dialog.specialOfferDescription')}
                    </div>
                  </div>
                  <FormControl>
                    <CustomSwitch
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      bgColor="bg-orange-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isSpecialOffer && (
              <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
                <h4 className="text-sm font-medium text-orange-800">{adminT('products.dialog.discountSettings')}</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{adminT('products.dialog.discountTypeLabel')}</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder={adminT('products.dialog.discountTypePlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">{adminT('products.dialog.discountTypePercent')}</SelectItem>
                            <SelectItem value="fixed">{adminT('products.dialog.discountTypeFixed')}</SelectItem>
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
                          {adminT('products.dialog.discountValueLabel')} {discountType === "percentage" ? "(%)" : "(₪)"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder={discountType === "percentage" ? "10" : "5.00"}
                            {...field}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {discountType === "fixed" && (
                  <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                    {adminT('products.dialog.fixedDiscountInfo')} {unit === "piece" ? adminT('products.dialog.unitPiece') : unit === "kg" ? adminT('products.dialog.unitKg') : adminT('products.dialog.unit100gml')}
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
                      {adminT('products.dialog.deleteTitle')}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-sm sm:text-base">{adminT('products.dialog.deleteTitle')}</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs sm:text-sm">
                        {adminT('products.dialog.deleteConfirm')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="text-xs sm:text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200">{adminT('products.dialog.cancelButton')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          // Call delete mutation here - we'll need to pass it as a prop
                          if (onDelete) onDelete(product.id);
                          onClose();
                        }}
                        className="bg-red-600 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 text-xs sm:text-sm"
                      >
                        {adminT('products.dialog.deleteTitle')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div></div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200"
                >
                  {adminT('products.dialog.cancelButton')}
                </Button>
                <Button 
                  type="submit" 
                  className="text-sm bg-orange-500 text-white border-orange-500 hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {product ? adminT('products.dialog.saveButton') : adminT('products.dialog.createButton')}
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
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  
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
        <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
          <DialogTitle className={`text-lg sm:text-xl ${isRTL ? 'text-right' : 'text-left'}`}>
            {category ? adminT('categories.editTitle', 'Редактировать категорию') : adminT('categories.addTitle', 'Добавить категорию')}
          </DialogTitle>
          <DialogDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            {category ? adminT('categories.editDescription', 'Обновите информацию о категории') : adminT('categories.addDescription', 'Добавьте новую категорию товаров')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name', 'Название категории')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={adminT('categories.fields.namePlaceholder', 'Введите название категории')} 
                      {...field} 
                      className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </FormControl>
                  <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.description', 'Описание')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={adminT('categories.fields.descriptionPlaceholder', 'Введите описание категории')}
                      className={`resize-none text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
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
                    <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.icon', 'Иконка категории')}</FormLabel>
                    <div className="space-y-3">
                      {/* Current selected icon display */}
                      <div className={`flex items-center gap-3 p-3 border rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-2xl">{field.value}</span>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.selectedIcon', 'Выбранная иконка')}</div>
                          <div className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.clickToSelect', 'Нажмите на иконку ниже для выбора')}</div>
                        </div>
                      </div>
                      
                      {/* Icon grid selector */}
                      <div>
                        <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.popularIcons', 'Популярные иконки')}:</div>
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
                        <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.customIcon', 'Или введите свою иконку')}:</div>
                        <FormControl>
                          <Input 
                            placeholder={adminT('categories.iconPlaceholder', '🍽️ Введите эмодзи')}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                        </FormControl>
                      </div>
                      
                      {/* Image upload option */}
                      <div>
                        <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.uploadImage', 'Или загрузите изображение')}:</div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-orange-300 transition-colors">
                          <ImageUpload
                            value=""
                            onChange={(url) => {
                              if (url) {
                                field.onChange(url);
                              }
                            }}
                          />
                          <div className={`text-xs text-gray-400 mt-2 text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                            {adminT('categories.recommendedSize', 'Рекомендуемый размер: 64×64 пикселей')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                  </FormItem>
                );
              }}
            />

            <div className={`flex flex-col sm:flex-row justify-end gap-3 ${isRTL ? 'sm:flex-row-reverse rtl:space-x-reverse' : 'space-x-4'}`}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className={`text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200 ${isRTL ? 'ml-4' : ''}`}
              >
                {adminT('actions.cancel', 'Отмена')}
              </Button>
              <Button 
                type="submit" 
                className={`text-sm bg-orange-500 text-white border-orange-500 hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {category ? adminT('actions.update', 'Обновить') : adminT('actions.create', 'Создать')}  
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
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
  const [isDeliveryPaymentOpen, setIsDeliveryPaymentOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [isTrackingCodeOpen, setIsTrackingCodeOpen] = useState(false);
  const [isAuthPageOpen, setIsAuthPageOpen] = useState(false);
  
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
      paymentMethods: storeSettings?.paymentMethods || [
        { name: "Наличными при получении", id: 1 },
        { name: "Банковской картой", id: 2 },
        { name: "Банковский перевод", id: 3 }
      ],
      aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
      deliveryFee: storeSettings?.deliveryFee || "15.00",
      freeDeliveryFrom: storeSettings?.freeDeliveryFrom || "",
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
      headerHtml: storeSettings?.headerHtml || "",
      footerHtml: storeSettings?.footerHtml || "",
      showWhatsAppChat: storeSettings?.showWhatsAppChat !== false,
      whatsappPhoneNumber: storeSettings?.whatsappPhoneNumber || "",
      whatsappDefaultMessage: storeSettings?.whatsappDefaultMessage || "Здравствуйте! Я хотел бы узнать больше о ваших товарах.",
      showCartBanner: storeSettings?.showCartBanner || false,
      cartBannerType: storeSettings?.cartBannerType || "text",
      cartBannerImage: storeSettings?.cartBannerImage || "",
      cartBannerText: storeSettings?.cartBannerText || "",
      cartBannerBgColor: storeSettings?.cartBannerBgColor || "#f97316",
      cartBannerTextColor: storeSettings?.cartBannerTextColor || "#ffffff",
      defaultLanguage: storeSettings?.defaultLanguage || "ru",
      enabledLanguages: storeSettings?.enabledLanguages || ["ru", "en", "he"],
    } as any,
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
        paymentMethods: storeSettings?.paymentMethods || [
          { name: "Наличными при получении", id: 1 },
          { name: "Банковской картой", id: 2 },
          { name: "Банковский перевод", id: 3 }
        ],
        aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
        deliveryFee: storeSettings?.deliveryFee || "15.00",
        freeDeliveryFrom: storeSettings?.freeDeliveryFrom || "",
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
        headerHtml: storeSettings?.headerHtml || "",
        footerHtml: storeSettings?.footerHtml || "",
        showWhatsAppChat: storeSettings?.showWhatsAppChat !== false,
        whatsappPhoneNumber: storeSettings?.whatsappPhoneNumber || "",
        whatsappDefaultMessage: storeSettings?.whatsappDefaultMessage || "Здравствуйте! Я хотел бы узнать больше о ваших товарах.",
        showCartBanner: storeSettings?.showCartBanner || false,
        cartBannerType: storeSettings?.cartBannerType || "text",
        cartBannerImage: storeSettings?.cartBannerImage || "",
        cartBannerText: storeSettings?.cartBannerText || "",
        cartBannerBgColor: storeSettings?.cartBannerBgColor || "#f97316",
        cartBannerTextColor: storeSettings?.cartBannerTextColor || "#ffffff",
        authPageTitle: storeSettings?.authPageTitle || "",
        authPageSubtitle: storeSettings?.authPageSubtitle || "",
        authPageFeature1: storeSettings?.authPageFeature1 || "",
        authPageFeature2: storeSettings?.authPageFeature2 || "",
        authPageFeature3: storeSettings?.authPageFeature3 || "",
        defaultLanguage: storeSettings?.defaultLanguage || "ru",
        enabledLanguages: storeSettings?.enabledLanguages || ["ru", "en", "he"],
      } as any);
    }
  }, [storeSettings, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-8 ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* Основная информация */}
        <Collapsible open={isBasicInfoOpen} onOpenChange={setIsBasicInfoOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Store className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.basicSettings')}</h3>
                {isBasicInfoOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 ml-auto" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 ml-auto" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="storeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{adminT('settings.storeName')}</FormLabel>
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
                <FormLabel className="text-sm">{adminT('settings.welcomeTitle')}</FormLabel>
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
                <FormLabel className="text-sm">{adminT('settings.storePhone')}</FormLabel>
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
                <FormLabel className="text-sm">{adminT('settings.contactEmail')}</FormLabel>
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
                <FormLabel className="text-sm">{adminT('settings.deliveryFee')}</FormLabel>
                <FormControl>
                  <Input {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="freeDeliveryFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{adminT('settings.freeDeliveryFrom')}</FormLabel>
                <FormControl>
                  <Input {...field} className="text-sm" />
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
          </CollapsibleContent>
        </Collapsible>

        {/* Описание и контакты */}
        <Collapsible open={isContactsOpen} onOpenChange={setIsContactsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MapPin className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.basicSettingsDescription')}</h3>
                {isContactsOpen ? (
                  <ChevronUp className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                ) : (
                  <ChevronDown className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">

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
          </CollapsibleContent>
        </Collapsible>

        {/* Визуальное оформление */}
        <Collapsible open={isVisualsOpen} onOpenChange={setIsVisualsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Upload className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.visualSettings')}</h3>
                {isVisualsOpen ? (
                  <ChevronUp className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                ) : (
                  <ChevronDown className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">

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
          </CollapsibleContent>
        </Collapsible>

        {/* Language Settings */}
        <Collapsible open={isLanguageSettingsOpen} onOpenChange={setIsLanguageSettingsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Languages className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.languageSettings')}</h3>
                {isLanguageSettingsOpen ? (
                  <ChevronUp className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                ) : (
                  <ChevronDown className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Язык по умолчанию</h4>
                <div className="p-3 border rounded-lg bg-gray-50">
                  <Select 
                    value={form.watch("defaultLanguage") || "ru"}
                    onValueChange={(value) => form.setValue("defaultLanguage", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).filter(([code]) => {
                        const enabledLanguages = form.watch("enabledLanguages") || ["ru", "en", "he"];
                        return enabledLanguages.includes(code);
                      }).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center gap-2">
                            <span>{(info as any).flag}</span>
                            <span>{(info as any).name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500">
                  Выберите язык интерфейса по умолчанию для новых посетителей
                </p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Доступные языки</h4>
                <div className="space-y-3">
                  {Object.entries(LANGUAGES).map(([code, info]) => {
                    const enabledLanguages = form.watch("enabledLanguages") || ["ru", "en", "he"];
                    const isEnabled = enabledLanguages.includes(code);
                    
                    return (
                      <div key={code} className="flex items-center justify-between p-3 border rounded-lg rtl:flex-row-reverse">
                        <div className="flex items-center gap-3 rtl:flex-row-reverse">
                          <span className="text-lg">{(info as any).flag}</span>
                          <div className="flex flex-col">
                            <span className="font-medium">{(info as any).name}</span>
                            <span className="text-xs text-gray-500">{(info as any).nativeName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                            {isEnabled ? 'Активен' : 'Отключен'}
                          </span>
                          <CustomSwitch 
                            checked={isEnabled}
                            onChange={(checked) => {
                              const currentEnabled = form.getValues("enabledLanguages") || ["ru", "en", "he"];
                              const currentDefault = form.getValues("defaultLanguage") || "ru";
                              let newEnabled;
                              
                              if (checked) {
                                newEnabled = [...currentEnabled, code];
                              } else {
                                newEnabled = currentEnabled.filter((lang: string) => lang !== code);
                              }
                              
                              // Ensure at least one language is always enabled
                              if (newEnabled.length === 0) {
                                newEnabled = ["ru"];
                              }
                              
                              form.setValue("enabledLanguages", newEnabled);
                              
                              // If the default language is being disabled, switch to the first enabled language
                              if (!newEnabled.includes(currentDefault)) {
                                form.setValue("defaultLanguage", newEnabled[0]);
                              }
                            }}
                            bgColor={isEnabled ? "bg-green-500" : "bg-gray-300"}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 text-blue-600 mt-0.5">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <strong>Примечание:</strong> Изменения в настройках языков применяются после сохранения настроек. 
                  Отключение языка скроет его из селектора на сайте.
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Часы работы */}
        <Collapsible open={isWorkingHoursOpen} onOpenChange={setIsWorkingHoursOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Clock className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.operatingHours')}</h3>
                {isWorkingHoursOpen ? (
                  <ChevronUp className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                ) : (
                  <ChevronDown className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
          
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
          </CollapsibleContent>
        </Collapsible>

        {/* Доставка и оплата */}
        <Collapsible open={isDeliveryPaymentOpen} onOpenChange={setIsDeliveryPaymentOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 w-full">
                <Truck className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.deliverySettings')}</h3>
                {isDeliveryPaymentOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 ml-auto" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 ml-auto" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">

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
          name="paymentMethods"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Способы оплаты
              </FormLabel>
              <div className="space-y-3">
                {(field.value || []).map((method: any, index: number) => (
                  <div key={method.id || index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Название способа оплаты"
                      value={method.name || ""}
                      onChange={(e) => {
                        const updatedMethods = [...(field.value || [])];
                        updatedMethods[index] = { ...method, name: e.target.value };
                        field.onChange(updatedMethods);
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updatedMethods = (field.value || []).filter((_: any, i: number) => i !== index);
                        field.onChange(updatedMethods);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Удалить
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMethod = { name: "", id: Date.now() };
                    field.onChange([...(field.value || []), newMethod]);
                  }}
                  className="w-full"
                >
                  + Добавить способ оплаты
                </Button>
              </div>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

          </CollapsibleContent>
        </Collapsible>

        {/* Настройки отображения */}
        <Collapsible open={isDisplaySettingsOpen} onOpenChange={setIsDisplaySettingsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 w-full">
                <Eye className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.displaySettings')}</h3>
                {isDisplaySettingsOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 ml-auto" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 ml-auto" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">

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

        {/* Переключатели отображения */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Настройки отображения главной страницы</h4>
          
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
                    <FormLabel className="text-sm font-medium">{adminT('settings.showSpecialOffers')}</FormLabel>
                    <FormDescription className="text-xs">
                      {adminT('settings.specialOffersDescription')}
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
                    <FormLabel className="text-sm font-medium">{adminT('settings.showCategoryMenu')}</FormLabel>
                    <FormDescription className="text-xs">
                      {adminT('settings.categoryMenuDescription')}
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
              name="showWhatsAppChat"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Показывать чат WhatsApp</FormLabel>
                    <FormDescription className="text-xs">
                      Плавающая кнопка WhatsApp в правом нижнем углу сайта
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

            {form.watch("showWhatsAppChat") && (
              <>
                <FormField
                  control={form.control}
                  name="whatsappPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Номер телефона WhatsApp
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+972501234567"
                          {...field} 
                          className="text-sm" 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Номер телефона в международном формате (включая код страны)
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsappDefaultMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Сообщение по умолчанию
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Здравствуйте! Я хотел бы узнать больше о ваших товарах."
                          {...field} 
                          className="text-sm min-h-[80px]" 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Текст сообщения, который автоматически появится в WhatsApp при нажатии на кнопку
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        </div>

        {/* Баннер корзины */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Баннер корзины</h3>
          </div>

          <FormField
            control={form.control}
            name="showCartBanner"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-medium">Показывать баннер в корзине</FormLabel>
                  <FormDescription className="text-xs">
                    Баннер отображается в корзине под итоговой суммой
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

          {form.watch("showCartBanner") && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="cartBannerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Тип баннера
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Выберите тип баннера" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Текстовый баннер</SelectItem>
                        <SelectItem value="image">Изображение</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Выберите между текстовым баннером с фоном или загрузкой изображения
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {form.watch("cartBannerType") === "text" && (
                <>
                  <FormField
                    control={form.control}
                    name="cartBannerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Текст баннера
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Бесплатная доставка от 100₪!"
                            {...field} 
                            className="text-sm min-h-[60px]" 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Текст для отображения в баннере корзины
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cartBannerBgColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Цвет фона
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="color"
                              {...field} 
                              className="w-12 h-8 p-0 border rounded" 
                            />
                            <Input 
                              type="text"
                              {...field} 
                              placeholder="#f97316"
                              className="text-sm flex-1" 
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Цвет фона для текстового баннера
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cartBannerTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Цвет текста
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="color"
                              {...field} 
                              className="w-12 h-8 p-0 border rounded" 
                            />
                            <Input 
                              type="text"
                              {...field} 
                              placeholder="#ffffff"
                              className="text-sm flex-1" 
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Цвет текста для текстового баннера
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {form.watch("cartBannerType") === "image" && (
                <FormField
                  control={form.control}
                  name="cartBannerImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Изображение баннера
                      </FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Максимальная высота: 120px. Рекомендуемый размер: 400×120 пикселей
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}
        </div>

        {/* Нижние баннеры */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Layers className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Нижние баннеры</h3>
          </div>

          
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
          </CollapsibleContent>
        </Collapsible>

        {/* Код отслеживания */}
        <Collapsible open={isTrackingCodeOpen} onOpenChange={setIsTrackingCodeOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Code className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.trackingCode')}</h3>
                {isTrackingCodeOpen ? (
                  <ChevronUp className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                ) : (
                  <ChevronDown className={`h-5 w-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <FormField
              control={form.control}
              name="headerHtml"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    HTML код для секции head
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="<!-- Добавьте сюда код Google Analytics, Facebook Pixel, или другие трекинговые скрипты -->" 
                      className="text-sm font-mono min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Этот код будет добавлен в секцию &lt;head&gt; всех страниц сайта. Используйте для Google Analytics, Facebook Pixel и других систем аналитики.
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="footerHtml"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    HTML код для подвала сайта
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="<!-- Добавьте сюда код чатов, кнопок соц. сетей или другие виджеты -->" 
                      className="text-sm font-mono min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    Этот код будет добавлен в конец страницы перед закрывающим тегом &lt;/body&gt;. Используйте для онлайн-чатов, кнопок соц. сетей и других виджетов.
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Настройки страницы авторизации */}
        <Collapsible open={isAuthPageOpen} onOpenChange={setIsAuthPageOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <User className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{adminT('settings.authPage')}</h3>
              </div>
              {isAuthPageOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6">
            <FormField
              control={form.control}
              name="authPageTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Заголовок страницы входа
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Добро пожаловать в eDAHouse"
                      {...field} 
                      className="text-sm"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Основной заголовок на странице входа/регистрации
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authPageSubtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Подзаголовок страницы входа
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Готовые блюда высокого качества с доставкой на дом"
                      {...field} 
                      className="text-sm min-h-[60px]"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Описание под основным заголовком
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authPageFeature1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Первое преимущество
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Свежие готовые блюда каждый день"
                      {...field} 
                      className="text-sm"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Первое преимущество в списке на странице авторизации
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authPageFeature2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Второе преимущество
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Быстрая доставка в удобное время"
                      {...field} 
                      className="text-sm"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Второе преимущество в списке на странице авторизации
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authPageFeature3"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Третье преимущество
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Широкий выбор блюд на любой вкус"
                      {...field} 
                      className="text-sm"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Третье преимущество в списке на странице авторизации
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-orange-500 text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? adminT('common.loading') : adminT('settings.saveSettings')}
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

// User Form Dialog Component
function UserFormDialog({ open, onClose, user, onSubmit, onDelete }: any) {
  const userSchema = z.object({
    email: z.string().email("Неверный формат email"),
    firstName: z.string().min(1, "Имя обязательно"),
    lastName: z.string().min(1, "Фамилия обязательна"),
    phone: z.string().optional(),
    role: z.enum(["admin", "worker", "customer"]),
    password: z.string().optional(),
  });

  type UserFormData = z.infer<typeof userSchema>;
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "customer",
      password: "",
    },
  });

  // Reset form when user or dialog state changes
  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          email: user.email || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phone: user.phone || "",
          role: user.role || "customer",
          password: "", // Always empty for editing existing users
        });
      } else {
        form.reset({
          email: "",
          firstName: "",
          lastName: "",
          phone: "",
          role: "customer",
        });
      }
    }
  }, [open, user, form]);

  const handleSubmit = (data: UserFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {user ? "Редактировать пользователя" : "Добавить пользователя"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {user ? "Изменить информацию о пользователе" : "Создать нового пользователя"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Email *</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Имя *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Иван"
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Фамилия *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Иванов"
                        {...field}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Телефон</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel"
                      placeholder="+972-50-123-4567"
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Роль *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="customer">Клиент</SelectItem>
                      <SelectItem value="worker">Сотрудник</SelectItem>
                      <SelectItem value="admin">Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {user ? "Новый пароль (оставьте пустым если не меняете)" : "Пароль"}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Минимум 6 символов"
                      {...field}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} className="text-sm">
                  Отмена
                </Button>
                {user && user.id !== "43948959" && ( // Don't allow deleting yourself
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-sm text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Удалить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить пользователя</AlertDialogTitle>
                        <AlertDialogDescription>
                          Вы уверены, что хотите удалить пользователя {user.email}? 
                          Это действие нельзя отменить.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onDelete(user.id);
                            onClose();
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Button 
                type="submit" 
                variant="default"
                size="sm"
              >
                {user ? "Сохранить изменения" : "Создать пользователя"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
