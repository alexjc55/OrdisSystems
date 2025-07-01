/**
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 * 
 * Правила для разработчика:
 * - НЕ изменять существующий дизайн и компоновку интерфейса
 * - НЕ заменять на "более удобные" решения без запроса
 * - НЕ менять стили, цвета, расположение элементов
 * - ТОЛЬКО добавлять новый функционал или исправлять то, что конкретно просят
 * - Сохранять все существующие UI паттерны и структуру
 * 
 * Последнее обновление: исправлены переводы ролей пользователей
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { useAdminTranslation, useCommonTranslation } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/lib/i18n";
import { useTranslationManager } from "@/hooks/useTranslationManager";
import { TranslationToolbar } from "@/components/ui/translation-toolbar";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { getLocalizedFieldForAdmin } from "@shared/multilingual-helpers";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getMultilingualValue, createMultilingualUpdate } from "@/components/ui/multilingual-store-settings";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getUnitLabel, formatDeliveryTimeRange, type ProductUnit } from "@/lib/currency";
import { applyTheme } from "@/lib/theme-system";
import { format } from "date-fns";
import { ru, enUS, he, ar } from "date-fns/locale";
import { insertStoreSettingsSchema, type StoreSettings, type CategoryWithCount } from "@shared/schema";
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
  category: CategoryWithCount, 
  onEdit: (category: CategoryWithCount) => void, 
  onDelete: (id: number) => void, 
  adminT: (key: string) => string,
  isRTL: boolean,
  setActiveTab: (tab: string) => void,
  setSelectedCategory: (category: string) => void
}) {
  const { i18n } = useTranslation();
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
      className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50/30 to-white border border-gray-200/80 rounded-xl shadow-sm hover:shadow-lg hover:shadow-gray-900/[0.08] transition-all duration-300 h-[140px] flex flex-col backdrop-blur-sm hover:border-gray-300/60"
    >
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-gray-100/10 pointer-events-none" />
      
      {/* Header with drag handle and actions */}
      <div className="relative flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 -m-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-lg transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-gray-200/50 relative z-10"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          
          {/* Product count snippet */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('products');
              setSelectedCategory(category.id.toString());
            }}
            className="cursor-pointer"
          >
            <span className="text-xs font-medium text-white hover:text-white transition-colors bg-primary hover:bg-primary px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm">
              {category.productCount || 0} {adminT('categories.products')}
            </span>
          </div>
        </div>
        
        <div className="flex gap-1.5 relative z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              updateCategoryMutation.mutate({ id: category.id, isActive: !category.isActive });
            }}
            className={`h-7 w-7 p-0 rounded-lg backdrop-blur-sm transition-all duration-200 border border-transparent ${category.isActive ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/70 hover:border-emerald-200/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/70 hover:border-gray-200/50'}`}
            title={category.isActive ? adminT('categories.hideCategory') : adminT('categories.showCategory')}
          >
            {category.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(category)}
            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50/70 rounded-lg backdrop-blur-sm transition-all duration-200 border border-transparent hover:border-blue-200/50"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50/70 rounded-lg backdrop-blur-sm transition-all duration-200 border border-transparent hover:border-red-200/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={isRTL ? "rtl" : ""}>
              <AlertDialogHeader>
                <AlertDialogTitle>{adminT('categories.deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {category.productCount && category.productCount > 0 ? 
                    adminT('categories.deleteWithProductsWarning').replace('{{categoryName}}', getLocalizedField(category, 'name', i18n.language as SupportedLanguage)).replace('{{productCount}}', category.productCount.toString()) :
                    adminT('categories.deleteConfirmDesc').replace('{{categoryName}}', getLocalizedField(category, 'name', i18n.language as SupportedLanguage))
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={isRTL ? "flex-row-reverse" : ""}>
                <AlertDialogCancel>{adminT('actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(category.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {adminT('actions.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main content with two containers */}
      <div className="relative flex-1 px-3 py-2 flex items-start gap-3">
        {/* Left container - Text content */}
        <div 
          className="flex-1 min-w-0 flex flex-col h-full cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(category);
          }}
        >
          {/* Category name */}
          <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-gray-800 transition-colors leading-tight tracking-wide mb-1 hover:text-blue-600">
            {getLocalizedField(category, 'name', i18n.language as SupportedLanguage)}
          </h3>

          {/* Description if exists */}
          {getLocalizedField(category, 'description', i18n.language as SupportedLanguage) && (
            <p className="text-xs text-gray-500/90 line-clamp-2 leading-relaxed hover:text-gray-700">
              {getLocalizedField(category, 'description', i18n.language as SupportedLanguage)}
            </p>
          )}
        </div>
        
        {/* Right container - Icon */}
        <div className="flex-shrink-0 flex items-center">
          <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-sm opacity-80">
            {category.icon || '📦'}
          </div>
        </div>
      </div>

      {/* Inactive state overlay */}
      {!category.isActive && (
        <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-[2px] rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200/60 shadow-sm">
            <span className="text-sm font-medium text-gray-600">{adminT('categories.hidden')}</span>
          </div>
        </div>
      )}
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
  Receipt,
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
  Calendar as CalendarIcon,
  MapPin,
  Phone,
  Eye,
  EyeOff,
  X,
  MessageCircle,
  Code,
  Layers,
  Palette,
  Settings,
  Languages,
  Layers3,
  UserCheck,
  MoreHorizontal,
  Info,
  Globe,
  Type
} from "lucide-react";

// Validation schemas
const productSchema = z.object({
  name: z.string().optional(),  // Allow empty for translation languages
  description: z.string().optional(),
  categoryIds: z.array(z.number()).min(1, "Выберите хотя бы одну категорию"),
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
  name_en: z.string().optional(),
  name_he: z.string().optional(),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_en: z.string().optional(),
  description_he: z.string().optional(),
  description_ar: z.string().optional(),
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
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("orderId", order.id.toString());
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.dropEffect = "move";
        // Add visual feedback
        (e.target as HTMLElement).style.opacity = "0.5";
      }}
      onDragEnd={(e) => {
        e.preventDefault();
        // Restore visual state
        (e.target as HTMLElement).style.opacity = "1";
      }}
      className="kanban-card cursor-move touch-manipulation transition-opacity duration-75"
      style={{ 
        touchAction: 'manipulation',
        transform: 'translateZ(0)', // Force hardware acceleration
        backfaceVisibility: 'hidden' // Improve rendering performance
      }}
    >
      <OrderCard order={order} onEdit={onEdit} onStatusChange={onStatusChange} onCancelOrder={onCancelOrder} />
    </div>
  );
}

function OrderCard({ order, onEdit, onStatusChange, onCancelOrder }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const { t: adminT } = useAdminTranslation();
  const { i18n } = useTranslation();
  
  const getStatusLabel = (status: string) => {
    console.log('OrderCard getStatusLabel called with status:', status);
    console.log('adminT function:', adminT);
    
    if (status === 'pending') {
      const pendingTranslation = adminT('orders.status.pending');
      console.log('Pending translation result:', pendingTranslation);
      console.log('Pending translation type:', typeof pendingTranslation);
      console.log('Pending translation length:', pendingTranslation?.length);
    }
    
    const result = (() => {
      switch (status) {
        case 'pending': return adminT('orders.status.pending') || 'Ожидает';
        case 'confirmed': return adminT('orders.status.confirmed') || 'Подтвержден';
        case 'preparing': return adminT('orders.status.preparing') || 'Готовится';
        case 'ready': return adminT('orders.status.ready') || 'Готов';
        case 'delivered': return adminT('orders.status.delivered') || 'Доставлен';
        case 'cancelled': return adminT('orders.status.cancelled') || 'Отменен';
        default: return status;
      }
    })();
    console.log('OrderCard getStatusLabel result:', result);
    return result;
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Order Header */}
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm text-primary">#{order.id}</div>
            <Badge className={`text-xs px-2 py-1 ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </Badge>
          </div>

          {/* Customer Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3 w-3 text-gray-400" />
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
                    className="cursor-pointer hover:!text-primary hover:!bg-orange-50 focus:!text-primary focus:!bg-orange-50"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {adminT('orders.call')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      const cleanPhone = order.customerPhone.replace(/[^\d+]/g, '');
                      window.open(`https://wa.me/${cleanPhone}`, '_blank');
                    }}
                    className="cursor-pointer hover:!text-primary hover:!bg-orange-50 focus:!text-primary focus:!bg-orange-50"
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
                <CalendarIcon className="h-3 w-3" />
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
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{adminT('orders.status.pending')}</SelectItem>
                <SelectItem value="confirmed">{adminT('orders.status.confirmed')}</SelectItem>
                <SelectItem value="preparing">{adminT('orders.status.preparing')}</SelectItem>
                <SelectItem value="ready">{adminT('orders.status.ready')}</SelectItem>
                <SelectItem value="delivered">{adminT('orders.status.delivered')}</SelectItem>
                <SelectItem value="cancelled">{adminT('orders.status.cancelled')}</SelectItem>
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
  const { i18n } = useTranslation();
  
  // Status color function for consistent styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileDatePickerOpen, setMobileDatePickerOpen] = useState(false);

  // Get locale for calendar based on current language
  const getCalendarLocale = () => {
    const currentLanguage = localStorage.getItem('language') || 'ru';
    switch (currentLanguage) {
      case 'en': return enUS;
      case 'he': return he;
      case 'ar': return ar;
      default: return ru;
    }
  };

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
        title: adminT('actions.error'),
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
    // Format quantity as whole number without decimal places
    const qty = Math.round(quantity);
    switch (unit) {
      case 'piece': return `${qty} ${adminT('products.units.piece')}`;
      case 'kg': return `${qty} ${adminT('products.units.kg')}`;
      case '100g': return `${qty} ${adminT('products.units.g')}`;
      case '100ml': return `${qty} ${adminT('products.units.ml')}`;
      default: return `${qty}`;
    }
  };

  const getStatusDisplayName = (status: string) => {
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

  const getUnitPrice = (product: any) => {
    switch (product.unit) {
      case 'piece': return `${formatCurrency(product.price)} ${adminT('products.units.piece')}`;
      case 'kg': return `${formatCurrency(product.price)} ${adminT('products.units.kg')}`;
      case '100g': return `${formatCurrency(product.price)} ${adminT('products.units.100g')}`;
      case '100ml': return `${formatCurrency(product.price)} ${adminT('products.units.100ml')}`;
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
    
    if (item.product.pricePerKg && (unit === 'gram' || unit === '100gram')) {
      // If price is per kg but quantity is in grams, convert to kg for calculation
      basePrice = (newQuantity / 1000) * unitPrice;
    } else if (unit === '100g' || unit === '100ml' || unit === '100gram') {
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
    
    // Check if product already exists in the order
    const existingItemIndex = editedOrderItems.findIndex((item: any) => item.productId === product.id);
    
    if (existingItemIndex !== -1) {
      // Product exists, update quantity
      const existingItem = editedOrderItems[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      updateItemQuantity(existingItemIndex, newQuantity);
    } else {
      // New product, add to order
      // Calculate total price based on product unit and pricing
      let totalPrice;
      if (product.pricePerKg && (product.unit === 'gram' || product.unit === '100gram')) {
        // If price is per kg but quantity is in grams, convert to kg for calculation
        totalPrice = (quantity / 1000) * unitPrice;
      } else if (product.unit === '100gram' || product.unit === '100g') {
        // For 100g products, price is per 100g unit, so divide quantity by 100
        totalPrice = (quantity / 100) * unitPrice;
      } else {
        // Standard calculation for other units
        totalPrice = quantity * unitPrice;
      }

      const newItem = {
        product,
        productId: product.id,
        quantity,
        pricePerUnit: unitPrice,
        pricePerKg: unitPrice,
        totalPrice: totalPrice
      };
      setEditedOrderItems([...editedOrderItems, newItem]);
    }
    
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
    <div className="space-y-4 admin-input-focus">
      {/* Compact Order Header with Key Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
        {/* Mobile Layout - New arrangement */}
        <div className="block sm:hidden space-y-3">
          {/* First row: Order number and Customer name */}
          <div className="flex justify-between items-center gap-2">
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">{adminT('orders.orderNumber')}</div>
              <div className="font-bold text-lg">#{order.id}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm flex-1 min-w-0">
              <div className="text-xs text-gray-500">{adminT('orders.customer')}</div>
              <div className="font-medium text-sm truncate">{order.user?.firstName && order.user?.lastName 
                ? `${order.user.firstName} ${order.user.lastName}`
                : order.user?.email || "—"}</div>
            </div>
          </div>
          {/* Second row: Total amount and Status */}
          <div className="flex justify-between items-center gap-2">
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">{adminT('orders.orderTotal')}</div>
              <div className="font-bold text-lg text-green-600">{formatCurrency(order.totalAmount)}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm flex-1">
              <div className="text-xs text-gray-500 mb-1">{adminT('orders.orderStatus')}</div>
              <Select
                value={editedOrder.status}
                onValueChange={(value) => setEditedOrder(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className={`text-sm h-8 border w-full ${getStatusColor(editedOrder.status)}`}>
                  <SelectValue>
                    <span className="text-sm font-medium">
                      {getStatusDisplayName(editedOrder.status)}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="pending">
                    <span className="text-xs md:text-xs sm:text-sm font-medium text-yellow-800">
                      {adminT('orders.status.pending')}
                    </span>
                  </SelectItem>
                  <SelectItem value="confirmed">
                    <span className="text-xs md:text-xs sm:text-sm font-medium text-blue-800">
                      {adminT('orders.status.confirmed')}
                    </span>
                  </SelectItem>
                  <SelectItem value="preparing">
                    <span className="text-xs md:text-xs sm:text-sm font-medium text-orange-800">
                      {adminT('orders.status.preparing')}
                    </span>
                  </SelectItem>
                  <SelectItem value="ready">
                    <span className="text-xs md:text-xs sm:text-sm font-medium text-green-800">
                      {adminT('orders.status.ready')}
                    </span>
                  </SelectItem>
                  <SelectItem value="delivered">
                    <span className="text-xs md:text-xs sm:text-sm font-medium text-gray-800">
                      {adminT('orders.status.delivered')}
                    </span>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <span className="text-xs md:text-xs sm:text-sm font-medium text-red-800">
                      {adminT('orders.status.cancelled')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Horizontal */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">{adminT('orders.orderNumber')}</div>
              <div className="font-bold text-lg">#{order.id}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">{adminT('orders.orderTotal')}</div>
              <div className="font-bold text-lg text-green-600">{formatCurrency(order.totalAmount)}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">{adminT('orders.customer')}</div>
              <div className="font-medium">{order.user?.firstName && order.user?.lastName 
                ? `${order.user.firstName} ${order.user.lastName}`
                : order.user?.email || "—"}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm min-w-[160px]">
              <div className="text-xs text-gray-500">{adminT('orders.orderStatus')}</div>
              <Select
                value={editedOrder.status}
                onValueChange={(value) => setEditedOrder(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className={`text-sm h-8 border w-full ${getStatusColor(editedOrder.status)}`}>
                  <SelectValue>
                    <span className="text-sm font-medium">
                      {getStatusDisplayName(editedOrder.status)}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="pending" className="bg-yellow-50 hover:bg-yellow-100">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs md:text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800">
                      {adminT('orders.status.pending')}
                    </span>
                  </SelectItem>
                  <SelectItem value="confirmed" className="bg-blue-50 hover:bg-blue-100">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs md:text-xs sm:text-sm font-medium bg-blue-100 text-blue-800">
                      {adminT('orders.status.confirmed')}
                    </span>
                  </SelectItem>
                  <SelectItem value="preparing" className="bg-orange-50 hover:bg-orange-100">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs md:text-xs sm:text-sm font-medium bg-orange-100 text-orange-800">
                      {adminT('orders.status.preparing')}
                    </span>
                  </SelectItem>
                  <SelectItem value="ready" className="bg-green-50 hover:bg-green-100">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs md:text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                      {adminT('orders.status.ready')}
                    </span>
                  </SelectItem>
                  <SelectItem value="delivered" className="bg-gray-50 hover:bg-gray-100">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs md:text-xs sm:text-sm font-medium bg-gray-100 text-gray-800">
                      {adminT('orders.status.delivered')}
                    </span>
                  </SelectItem>
                  <SelectItem value="cancelled" className="bg-red-50 hover:bg-red-100">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs md:text-xs sm:text-sm font-medium bg-red-100 text-red-800">
                      {adminT('orders.status.cancelled')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{adminT('orders.createdDate')}</div>
            <div className="text-sm">{new Date(order.createdAt).toLocaleString('ru-RU')}</div>
          </div>
        </div>
      </div>

      {/* Compact Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        


        {/* Delivery Information - Important section with visual accent */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 p-4 shadow-sm">
          <h3 className="font-semibold mb-3 text-blue-800 flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-600" />
            {adminT('orders.delivery')}
          </h3>
          <div className="space-y-2">
            {/* Customer Information and Delivery Details */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{adminT('orders.clientDeliveryInfo')}</label>
              
              {/* Mobile Layout - Stack vertically */}
              <div className="grid grid-cols-1 gap-2 sm:hidden">
                <div className="flex gap-1">
                  <Input
                    value={editedOrder.customerPhone}
                    onChange={(e) => setEditedOrder(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder={adminT('orders.phonePlaceholder')}
                    className="text-sm flex-1 h-8"
                    autoFocus={false}
                  />
                  {editedOrder.customerPhone && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem 
                          onClick={() => window.location.href = `tel:${editedOrder.customerPhone}`}
                          className="cursor-pointer hover:!text-primary hover:!bg-orange-50"
                        >
                          <Phone className="h-3 w-3 mr-2" />
                          {adminT('orders.call')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            const cleanPhone = editedOrder.customerPhone.replace(/[^\d+]/g, '');
                            window.open(`https://wa.me/${cleanPhone}`, '_blank');
                          }}
                          className="cursor-pointer hover:!text-primary hover:!bg-orange-50"
                        >
                          <MessageCircle className="h-3 w-3 mr-2" />
                          WhatsApp
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <Input
                  value={editedOrder.deliveryAddress}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder={adminT('orders.addressPlaceholder')}
                  className="text-sm h-8"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="text-sm h-8 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedOrder.deliveryDate ? format(new Date(editedOrder.deliveryDate), "PPP", { locale: getCalendarLocale() }) : adminT('orders.selectDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editedOrder.deliveryDate ? new Date(editedOrder.deliveryDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setEditedOrder(prev => ({ ...prev, deliveryDate: format(date, "yyyy-MM-dd") }));
                            setDatePickerOpen(false);
                          }
                        }}
                        locale={getCalendarLocale()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Select
                    value={formatDeliveryTimeRange(editedOrder.deliveryTime || "")}
                    onValueChange={(value) => setEditedOrder(prev => ({ ...prev, deliveryTime: value }))}
                  >
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue placeholder={adminT('orders.selectTime')} />
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

              {/* Desktop/Tablet Layout - Horizontal */}
              <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex gap-1">
                  <Input
                    value={editedOrder.customerPhone}
                    onChange={(e) => setEditedOrder(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder={adminT('orders.phonePlaceholder')}
                    className="text-sm flex-1 h-8"
                    autoFocus={false}
                  />
                  {editedOrder.customerPhone && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-1 text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem 
                          onClick={() => window.location.href = `tel:${editedOrder.customerPhone}`}
                          className="cursor-pointer hover:!text-primary hover:!bg-orange-50"
                        >
                          <Phone className="h-3 w-3 mr-2" />
                          {adminT('orders.call')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            const cleanPhone = editedOrder.customerPhone.replace(/[^\d+]/g, '');
                            window.open(`https://wa.me/${cleanPhone}`, '_blank');
                          }}
                          className="cursor-pointer hover:!text-primary hover:!bg-orange-50"
                        >
                          <MessageCircle className="h-3 w-3 mr-2" />
                          WhatsApp
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <Input
                  value={editedOrder.deliveryAddress}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder={adminT('orders.addressPlaceholder')}
                  className="text-sm h-8"
                />
                <Popover open={mobileDatePickerOpen} onOpenChange={setMobileDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-sm h-8 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedOrder.deliveryDate ? format(new Date(editedOrder.deliveryDate), "PPP", { locale: getCalendarLocale() }) : adminT('orders.selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editedOrder.deliveryDate ? new Date(editedOrder.deliveryDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setEditedOrder(prev => ({ ...prev, deliveryDate: format(date, "yyyy-MM-dd") }));
                          setMobileDatePickerOpen(false);
                        }
                      }}
                      locale={getCalendarLocale()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Select
                  value={formatDeliveryTimeRange(editedOrder.deliveryTime || "")}
                  onValueChange={(value) => setEditedOrder(prev => ({ ...prev, deliveryTime: value }))}
                >
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder={adminT('orders.selectTime')} />
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

      </div>

      {/* Order Items - Important section with visual accent */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-4 shadow-sm">
        <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-600" />
            {adminT('orders.orderItems')}
          </h3>
          <Button 
            size="sm" 
            onClick={() => setShowAddItem(true)}
            className="text-xs bg-primary hover:bg-primary text-white border-primary"
          >
            <Plus className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
            {adminT('orders.addProduct')}
          </Button>
        </div>
        {/* Desktop Table View */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{adminT('orders.product')}</TableHead>
                <TableHead className="text-xs w-32">{adminT('orders.quantity')}</TableHead>
                <TableHead className="text-xs w-20">{adminT('orders.price')}</TableHead>
                <TableHead className="text-xs w-24">{adminT('orders.amount')}</TableHead>
                <TableHead className="text-xs w-20">{adminT('orders.discount')}</TableHead>
                <TableHead className="text-xs w-16">{adminT('orders.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedOrderItems.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="text-sm">
                    <div>
                      <div className="font-medium">{getLocalizedField(item.product, 'name', i18n.language as SupportedLanguage)}</div>
                      {(getLocalizedField(item.product, 'description', i18n.language as SupportedLanguage) || item.product?.description) && (
                        <div className="text-xs text-gray-500">{getLocalizedField(item.product, 'description', i18n.language as SupportedLanguage) || item.product.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={Math.round(parseFloat(item.quantity))}
                        onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                        className={`w-20 h-7 text-xs ${isRTL ? 'text-right' : ''}`}
                        dir="ltr"
                      />
                      <span className={`text-xs text-gray-500 ${isRTL ? 'text-right' : ''}`} dir="ltr">
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
                          {adminT('orders.discount')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{adminT('actions.confirm')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {adminT('orders.removeItemConfirm')} "{getLocalizedField(item.product, 'name', i18n.language as SupportedLanguage)}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{adminT('actions.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeItem(index)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {adminT('actions.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {editedOrderItems.map((item: any, index: number) => (
            <div key={index} className="bg-gray-50 border rounded-lg p-3">
              {/* Product Header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base text-gray-900 truncate">{getLocalizedField(item.product, 'name', i18n.language as SupportedLanguage)}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{getUnitPrice(item.product)}</div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{adminT('actions.confirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {adminT('orders.removeItemConfirm')} "{getLocalizedField(item.product, 'name', i18n.language as SupportedLanguage)}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={`${isRTL ? 'flex-row-reverse space-x-reverse space-x-4' : ''}`}>
                      <AlertDialogCancel>{adminT('actions.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeItem(index)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {adminT('actions.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              {/* Compact Controls Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={Math.round(parseFloat(item.quantity))}
                      onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                      className={`h-7 text-sm w-20 ${isRTL ? 'text-right' : 'text-center'}`}
                      dir="ltr"
                    />
                    <span className={`text-sm text-gray-600 min-w-[40px] flex-shrink-0 ${isRTL ? 'text-right' : ''}`} dir="ltr">
                      {getUnitDisplay(item.product?.unit, item.quantity)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-green-600">{formatCurrency(item.totalPrice)}</div>
                </div>
              </div>
              
              {/* Discount section - compact */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{adminT('orders.discount')}</span>
                  {itemDiscounts[index] ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDiscountDialog(index)}
                      className="h-6 px-2 text-xs text-green-600 hover:text-green-800 border-green-200"
                    >
                      {itemDiscounts[index].type === 'percentage' ? `${itemDiscounts[index].value}%` : formatCurrency(itemDiscounts[index].value)}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDiscountDialog(index)}
                      className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {adminT('orders.discount')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Total Summary - Important section with visual accent */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 p-4 rounded-lg shadow-sm mt-6">
          <h4 className="font-medium mb-3 text-purple-800 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-purple-600" />
            {adminT('orders.orderSummary')}
          </h4>
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
                <span className="font-medium">{adminT('orders.discount')}:</span>
                <span className="text-red-600">-{formatCurrency(calculateOrderDiscount(calculateSubtotal()))}</span>
              </div>
              {/* Mobile Layout - Stack vertically */}
              <div className="block sm:hidden space-y-2">
                <div className="flex gap-1">
                  <Select
                    value={orderDiscount.type}
                    onValueChange={(value: 'percentage' | 'amount') => 
                      setOrderDiscount(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs w-16">
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
                    className="h-8 text-xs w-20"
                  />
                </div>
                <Input
                  placeholder={adminT('orders.discountReason')}
                  value={orderDiscount.reason}
                  onChange={(e) => setOrderDiscount(prev => ({ 
                    ...prev, 
                    reason: e.target.value 
                  }))}
                  className="h-8 text-xs w-full"
                />
              </div>

              {/* Desktop Layout - Horizontal */}
              <div className="hidden sm:flex gap-2">
                <Select
                  value={orderDiscount.type}
                  onValueChange={(value: 'percentage' | 'amount') => 
                    setOrderDiscount(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs w-20">
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
                  className="h-8 text-xs w-20"
                />
                <Input
                  placeholder={adminT('orders.discountReason')}
                  value={orderDiscount.reason}
                  onChange={(e) => setOrderDiscount(prev => ({ 
                    ...prev, 
                    reason: e.target.value 
                  }))}
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>
            
            {/* Manual Price Adjustment */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{adminT('orders.manualPriceOverride')}:</span>
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
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              {manualPriceOverride.enabled && (
                <div className="space-y-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={adminT('orders.enterNewOrderAmount')}
                    value={manualPriceOverride.value || ''}
                    onChange={(e) => setManualPriceOverride(prev => ({ 
                      ...prev, 
                      value: parseFloat(e.target.value) || 0 
                    }))}
                    className="h-8 text-xs w-28"
                  />
                  <p className="text-xs text-primary">
                    * {adminT('orders.manualPriceNote')}
                  </p>
                  {!manualPriceOverride.enabled && (
                    <p className="text-xs text-gray-500">
                      Расчетная стоимость: {formatCurrency(calculateSubtotal() - calculateOrderDiscount(calculateSubtotal()))}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {order.paymentMethod && (
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                <span>{adminT('orders.paymentMethod')}:</span>
                <span>{order.paymentMethod}</span>
              </div>
            )}
            
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>{adminT('orders.finalTotal')}:</span>
              <span>{formatCurrency(calculateFinalTotal())}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">{adminT('orders.notes')}</label>
        <Textarea
          value={editedOrder.notes}
          onChange={(e) => setEditedOrder(prev => ({ ...prev, notes: e.target.value }))}
          placeholder={adminT('orders.notesPlaceholder')}
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
      {showDiscountDialog !== null && editedOrderItems[showDiscountDialog] && (
        <ItemDiscountDialog
          itemIndex={showDiscountDialog}
          item={editedOrderItems[showDiscountDialog]}
          currentDiscount={itemDiscounts[showDiscountDialog] || null}
          onClose={() => setShowDiscountDialog(null)}
          onApply={applyItemDiscount}
          adminT={adminT}
        />
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          {adminT('actions.cancel')}
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
  const { i18n } = useTranslation();
  
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

  // Update default quantity when product is selected
  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    console.log('Selected product unit:', product.unit, 'price per unit:', product.pricePerKg || product.pricePerPiece);
    
    // Set default quantity based on unit and pricing structure
    if (product.pricePerKg && product.unit !== 'piece') {
      // If price is per kg, default to 100g
      setQuantity(100);
    } else if (product.unit === 'piece' || product.pricePerPiece) {
      // If it's per piece, default to 1
      setQuantity(1);
    } else {
      // Fallback based on unit name
      switch (product.unit) {
        case 'piece':
          setQuantity(1);
          break;
        case 'gram':
        case 'ml':
        case '100gram':
        case '100ml':
          setQuantity(100);
          break;
        case 'kg':
        case 'liter':
          setQuantity(1);
          break;
        default:
          setQuantity(1);
      }
    }
  };
  const [searchQuery, setSearchQuery] = useState("");

  const { data: productsResponse } = useQuery({
    queryKey: ["/api/products"],
    select: (data: any) => data?.filter((product: any) => 
      getLocalizedField(product, 'name', i18n.language as SupportedLanguage).toLowerCase().includes(searchQuery.toLowerCase())
    )
  });

  const handleAdd = () => {
    if (selectedProduct && quantity > 0) {
      onAdd(selectedProduct, quantity);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-96 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{adminT('orders.addProduct')}</DialogTitle>
        </DialogHeader>
        
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder={adminT('actions.searchProducts')}
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
              onClick={() => handleProductSelect(product)}
            >
              <div className="font-medium">{getLocalizedField(product, 'name', i18n.language as SupportedLanguage)}</div>
              <div className="text-sm text-gray-500">
                {formatCurrency(product.price || product.pricePerKg)} {adminT('products.per')} {getUnitDisplay(product.unit)}
              </div>
            </div>
          ))}
        </div>

        {/* Quantity */}
        {selectedProduct && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {adminT('orders.quantity')} ({getUnitDisplay(selectedProduct.unit)})
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

        <DialogFooter className={`${isRTL ? 'gap-4' : 'gap-3'}`}>
          <Button variant="outline" onClick={onClose}>
            {adminT('actions.cancel')}
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={!selectedProduct || quantity <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {adminT('actions.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const { i18n } = useTranslation();
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{adminT('orders.itemDiscount')}</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="font-medium">{getLocalizedField(item.product, 'name', i18n.language as SupportedLanguage)}</div>
          <div className="text-sm text-gray-500">
            {adminT('orders.baseCost')}: {formatCurrency(basePrice)}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{adminT('orders.discountType')}</label>
            <Select
              value={discountType}
              onValueChange={(value: 'percentage' | 'amount') => setDiscountType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                <SelectItem value="percentage">{adminT('orders.percentage')} (%)</SelectItem>
                <SelectItem value="amount">{adminT('orders.amount')} (₪)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {adminT('orders.discountSize')} {discountType === 'percentage' ? '(%)' : '(₪)'}
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={discountType === 'percentage' ? "100" : basePrice.toString()}
              value={discountValue === 0 ? '' : discountValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setDiscountValue(0);
                } else {
                  setDiscountValue(parseFloat(value) || 0);
                }
              }}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{adminT('orders.discountReason')}</label>
            <Input
              placeholder={adminT('orders.discountReasonPlaceholder')}
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

        <DialogFooter className="gap-4 mt-6">
          <Button variant="outline" onClick={onClose}>
            {adminT('actions.cancel')}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { t: adminT } = useAdminTranslation();
  const { t: commonT, i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();

  // Force component remount key to prevent stale state issues
  const [componentKey, setComponentKey] = useState(Date.now());
  
  // Add timeout to prevent infinite loading for repeated visits
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timer);
  }, []);

  // Show timeout message if loading takes too long
  if (loadingTimeout && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-4">Панель загружается медленно</h2>
          <p className="text-gray-600 mb-6">Возможно проблема с подключением к серверу</p>
          <Button onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>
        </div>
      </div>
    );
  }

  // Data queries with pagination  
  const { data: storeSettings, isLoading: storeSettingsLoading } = useQuery<StoreSettings>({
    queryKey: ["/api/settings"]
  });

  // Stable permissions reference to prevent tab switching during mutations
  const stablePermissions = useRef<any>({});
  
  // Update stable permissions when storeSettings change
  useEffect(() => {
    if (storeSettings?.workerPermissions) {
      stablePermissions.current = storeSettings.workerPermissions;
    }
  }, [storeSettings]);

  // Helper function to check worker permissions
  const hasPermission = (permission: string) => {
    if (user?.role === "admin") return true;
    if (user?.role !== "worker") return false;
    
    // Core work sections - always available for workers (no permission check)
    if (permission === 'canManageProducts' || 
        permission === 'canManageCategories' || 
        permission === 'canManageOrders') {
      return true;
    }
    
    // Administrative sections - require permission check
    const workerPermissions = stablePermissions.current || {};
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
  
  // Simple state-based navigation with URL sync
  const [activeTab, setActiveTabState] = useState(() => {
    // Initialize from URL on first load
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'products';
  });
  
  // Set active tab and update URL
  const setActiveTab = useCallback((newTab: string) => {
    setActiveTabState(newTab);
    // Update URL without causing re-renders
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Set default tab based on worker permissions - only once on mount
  useEffect(() => {
    if (user?.role === "worker" && storeSettings && activeTab === "products") {
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
      
      if (defaultTab !== "products") {
        setActiveTab(defaultTab);
      }
    }
  }, [user, storeSettings, setActiveTab]); // Remove activeTab from dependencies

  // Orders management state
  const [ordersViewMode, setOrdersViewMode] = useState<"table" | "kanban">("table");
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  
  // Kanban scroll container ref
  const kanbanRef = useRef<HTMLDivElement>(null);
  
  // Enhanced kanban scrolling with mouse support
  useEffect(() => {
    const container = kanbanRef.current;
    if (!container || ordersViewMode !== "kanban") return;

    let isMouseDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scrolling with Shift+wheel
      if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target && (e.target as Element).closest('.kanban-card')) return;
      isMouseDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
      isMouseDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      container.style.cursor = 'grab';
      container.style.userSelect = 'auto';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.style.cursor = 'grab';

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [ordersViewMode]);
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
  
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(adminT('users.deleteConfirm'))) {
      try {
        await apiRequest('DELETE', `/api/admin/users/${userId}`);
        toast({
          title: adminT('users.deleted'),
          description: adminT('users.deleteSuccess'),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      } catch (error: any) {
        toast({
          title: adminT('actions.error'),
          description: error.message || adminT('users.deleteError'),
          variant: "destructive",
        });
      }
    }
  };
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories", "includeInactive"],
    queryFn: async () => {
      const response = await fetch('/api/categories?includeInactive=true');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 1 * 60 * 1000, // 1 minute for orders (more frequent updates)
    gcTime: 3 * 60 * 1000, // 3 minutes
  });

  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", usersPage, searchQuery, usersRoleFilter, storeSettings?.defaultItemsPerPage],
    queryFn: async () => {
      const limit = storeSettings?.defaultItemsPerPage || 10;
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: usersRoleFilter
      });
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!storeSettings,
    staleTime: 3 * 60 * 1000, // 3 minutes for users (less frequent changes)
    gcTime: 7 * 60 * 1000, // 7 minutes
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
      toast({ title: adminT('actions.error'), description: adminT('categories.notifications.updateError'), variant: "destructive" });
    }
  });

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const formData = new FormData();
      Object.keys(productData).forEach(key => {
        if (key === 'categoryIds' && Array.isArray(productData[key])) {
          // Handle categoryIds array specially
          productData[key].forEach((id: number) => {
            formData.append('categoryIds[]', id.toString());
          });
        } else if (productData[key] !== undefined && productData[key] !== null) {
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
      toast({ title: adminT('actions.error'), description: adminT('products.notifications.createError'), variant: "destructive" });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...productData }: any) => {
      // Ensure price and pricePerKg are properly set
      const updateData = {
        ...productData,
        price: productData.price?.toString() || productData.pricePerKg?.toString(),
        pricePerKg: productData.price?.toString() || productData.pricePerKg?.toString(),
        categoryIds: productData.categoryIds || [],
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
    onSuccess: (updatedProduct) => {
      // Add timestamp to force fresh data
      const timestamp = Date.now();
      
      // Clear all cached queries
      queryClient.removeQueries({ queryKey: ['/api/admin/products'] });
      queryClient.removeQueries({ queryKey: ['/api/products'] });
      
      // Force refetch with fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/products'],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/products'],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      setEditingProduct(null);
      setIsProductFormOpen(false);
      toast({ title: adminT('products.notifications.productUpdated'), description: adminT('products.notifications.productUpdatedDesc') });
    },
    onError: (error: any) => {
      console.error("Product update error:", error);
      toast({ 
        title: adminT('actions.error'), 
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
      toast({ title: adminT('actions.error'), description: adminT('products.notifications.deleteError'), variant: "destructive" });
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
      toast({ title: adminT('actions.error'), description: adminT('products.notifications.statusError'), variant: "destructive" });
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
      toast({ title: adminT('actions.error'), description: adminT('products.notifications.availabilityError'), variant: "destructive" });
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
      toast({ title: adminT('actions.error'), description: adminT('categories.notifications.createError'), variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await apiRequest('DELETE', `/api/categories/${categoryId}`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'includeInactive'] });
      toast({ title: adminT('categories.notifications.categoryDeleted'), description: adminT('categories.notifications.categoryDeletedDesc') });
    },
    onError: (error: any) => {
      console.error("Category deletion error:", error);
      
      // Handle specific error when category has products
      if (error.error === 'CATEGORY_HAS_PRODUCTS') {
        toast({ 
          title: adminT('categories.notifications.deleteErrorWithProducts'), 
          description: adminT('categories.notifications.deleteErrorWithProductsDesc'),
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: adminT('actions.error'), 
          description: adminT('categories.notifications.deleteError'), 
          variant: "destructive" 
        });
      }
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
      // Краткое уведомление об успешном изменении порядка
      toast({ 
        title: adminT('categories.title'),
        description: adminT('categories.orderUpdated'),
        duration: 2000 
      });
    },
    onError: (error: any) => {
      console.error("Category reordering error:", error);
      toast({ title: adminT('actions.error'), description: error.message || 'Не удалось изменить порядок категорий', variant: "destructive" });
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
    onSuccess: (newData) => {
      // Update cache with the new data returned from the server
      queryClient.setQueryData(['/api/settings'], newData);
      // Also invalidate the public settings cache to update header immediately
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: adminT('settings.saved'), description: adminT('settings.saveSuccess') });
    },
    onError: (error: any) => {
      console.error("Store settings update error:", error);
      toast({ title: adminT('actions.error'), description: adminT('settings.saveError'), variant: "destructive" });
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
      toast({ title: adminT('actions.error'), description: adminT('users.notifications.roleUpdateError'), variant: "destructive" });
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
      toast({ title: adminT('actions.error'), description: adminT('users.notifications.deleteError'), variant: "destructive" });
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
      toast({ title: adminT('actions.error'), description: error.message || adminT('users.notifications.passwordSetError'), variant: "destructive" });
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

  // Enhanced loading state checks to prevent hanging
  const isStillLoading = (isLoading || !user || storeSettingsLoading || !storeSettings) && !loadingTimeout;
  
  // Additional check for first data load for workers
  const isWorkerWithoutPermissions = user?.role === "worker" && storeSettings && !storeSettings.workerPermissions;

  if ((isStillLoading || isWorkerWithoutPermissions) && !loadingTimeout) {
    return (
      <div key={componentKey} className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg mb-2">Загрузка админ панели...</p>
          <p className="text-gray-500 text-sm">Подготовка данных для работы</p>
          {isWorkerWithoutPermissions && (
            <p className="text-orange-500 text-xs mt-2">Настройка прав доступа...</p>
          )}
        </div>
      </div>
    );
  }

  // Force render if timeout reached, even with incomplete data
  if (loadingTimeout && (!user || (user.role !== "admin" && user.role !== "worker"))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Ошибка загрузки</div>
          <p className="text-gray-600 mb-4">Не удалось загрузить данные админ панели</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "worker")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Доступ запрещен</div>
          <p className="text-gray-600">У вас нет прав доступа к административной панели</p>
        </div>
      </div>
    );
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
        (getLocalizedField(product, 'name', i18n.language as SupportedLanguage) || product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (getLocalizedField(product, 'description', i18n.language as SupportedLanguage) || product.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategoryFilter === "all" || 
        product.categories?.some((cat: any) => cat.id === parseInt(selectedCategoryFilter));
      
      const matchesStatus = selectedStatusFilter === "all" ||
        (selectedStatusFilter === "available" && product.isAvailable) ||
        (selectedStatusFilter === "unavailable" && !product.isAvailable) ||
        (selectedStatusFilter === "out_of_stock_today" && product.availabilityStatus === "out_of_stock_today") ||
        (selectedStatusFilter === "with_discount" && (product.isSpecialOffer || (product.discountValue && parseFloat(product.discountValue) > 0)));
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "name":
          aValue = (getLocalizedField(a, 'name', i18n.language as SupportedLanguage) || a.name || '').toLowerCase();
          bValue = (getLocalizedField(b, 'name', i18n.language as SupportedLanguage) || b.name || '').toLowerCase();
          break;
        case "price":
          aValue = parseFloat(a.price || a.pricePerKg || "0");
          bValue = parseFloat(b.price || b.pricePerKg || "0");
          break;
        case "category":
          aValue = getLocalizedField(a.category, 'name', i18n.language as SupportedLanguage).toLowerCase() || "";
          bValue = getLocalizedField(b.category, 'name', i18n.language as SupportedLanguage).toLowerCase() || "";
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
              <p className={`text-gray-600 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dashboard.description')}</p>
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
                  {(hasPermission("canManageSettings") || hasPermission("canManageThemes")) && (
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
                  {(hasPermission("canManageSettings") || hasPermission("canManageThemes")) && (
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
                  {(hasPermission("canManageSettings") || hasPermission("canManageThemes")) && (
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
            <TabsContent value="products" className="space-y-4 sm:space-y-6 products-container" data-tab="products">
              <Card>
                <CardHeader>
                  <div className={`flex flex-col gap-4 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'} sm:justify-between sm:items-center`}>
                  <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                    <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      {adminT('products.title')}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {adminT('products.description')}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingProduct(null);
                      setIsProductFormOpen(true);
                    }}
                    className="bg-primary text-white hover:bg-primary hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 w-full sm:w-auto"
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
                      placeholder={adminT('products.searchProducts')}
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
                          <SelectValue placeholder={adminT('products.allCategories')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{adminT('products.allCategories')}</SelectItem>
                          {(categories as any[] || []).map((category: any) => (
                            <SelectItem 
                              key={category.id}
                                          title={getLocalizedField(category, 'name', i18n.language as SupportedLanguage)} 
                              value={category.id.toString()}
                            >
                              {getLocalizedField(category, 'name', i18n.language as SupportedLanguage)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative min-w-[160px]">
                      <Filter className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                        <SelectTrigger className={`text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'}`}>
                          <SelectValue placeholder={adminT('products.productStatus')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                          <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">{adminT('products.allProducts')}</SelectItem>
                          <SelectItem value="available" className="text-gray-900 hover:bg-gray-100">{adminT('products.availableProducts')}</SelectItem>
                          <SelectItem value="unavailable" className="text-gray-900 hover:bg-gray-100">{adminT('products.unavailableProducts')}</SelectItem>
                          <SelectItem value="out_of_stock_today" className="text-gray-900 hover:bg-gray-100">{adminT('products.preorderProducts')}</SelectItem>
                          <SelectItem value="with_discount" className="text-gray-900 hover:bg-gray-100">{adminT('products.productsWithDiscount')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Products Table */}
                {filteredProducts.length > 0 ? (
                  <div className="border rounded-lg bg-white overflow-hidden products" dir="ltr">
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
                                    className="flex items-center gap-1 hover:text-primary transition-colors flex-row-reverse"
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
                                    className="flex items-center gap-1 hover:text-primary transition-colors flex-row-reverse"
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
                                    className="flex items-center gap-1 hover:text-primary transition-colors flex-row-reverse"
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
                                <TableHead className={`min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <button 
                                    onClick={() => handleSort("name")}
                                    className={`flex items-center gap-1 hover:text-primary transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                                  >
                                    {adminT('products.productName')}
                                    {sortField === "name" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className={`min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <button 
                                    onClick={() => handleSort("category")}
                                    className={`flex items-center gap-1 hover:text-primary transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                                  >
                                    {adminT('products.productCategory')}
                                    {sortField === "category" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className={`min-w-[100px] px-2 sm:px-4 text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <button 
                                    onClick={() => handleSort("price")}
                                    className={`flex items-center gap-1 hover:text-primary transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                                  >
                                    {adminT('products.productPrice')}
                                    {sortField === "price" && (
                                      sortDirection === "asc" ? 
                                        <ChevronUp className="h-3 w-3" /> : 
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </TableHead>
                                <TableHead className="min-w-[120px] px-2 sm:px-4 text-xs sm:text-sm text-center">{adminT('products.productStatus')}</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product: any) => {
                            // Get localized product name for display
                            const localizedName = getLocalizedField(product, 'name', currentLanguage as SupportedLanguage, 'ru');
                            return (
                              <TableRow key={product.id} className={
                              product.availabilityStatus !== "available"
                                ? 'bg-gray-50 hover:bg-gray-100' 
                                : 'hover:bg-gray-50'
                            }>
                              {/* Dynamically order columns for RTL */}
                              {isRTL ? (
                                // RTL order: Status, Price, Category, Name (reversed)
                                <>
                                  <TableCell className="px-2 sm:px-4 py-2 text-right">
                                    <div className="flex flex-col gap-1 items-center justify-center">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const isActive = product.availabilityStatus === "available";
                                          if (isActive) {
                                            setProductToToggle({ id: product.id, currentStatus: product.isAvailable });
                                            setIsAvailabilityDialogOpen(true);
                                          } else {
                                            updateAvailabilityStatusMutation.mutate({
                                              id: product.id,
                                              availabilityStatus: "available"
                                            });
                                          }
                                        }}
                                        className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                                          product.availabilityStatus === "available"
                                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        }`}
                                        title={product.availabilityStatus === "available" 
                                          ? adminT('products.hideProduct') 
                                          : adminT('products.showProduct')
                                        }
                                      >
                                        {product.availabilityStatus === "available" 
                                          ? <Eye className="h-6 w-6" /> 
                                          : <EyeOff className="h-6 w-6" />
                                        }
                                      </Button>
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
                                          <div className="text-primary text-xs font-medium" dir="ltr">
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
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                      {product.categories?.map((category: any) => (
                                        <span 
                                          key={category.id}
                                          title={getLocalizedField(category, "name", i18n.language as SupportedLanguage)} 
                                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-white hover:bg-primary shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 max-w-[120px] text-center whitespace-nowrap overflow-hidden text-ellipsis"
                                        >
                                          
                                          {getLocalizedField(category, "name", i18n.language as SupportedLanguage)}
                                        </span>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-right max-w-[150px] w-[150px]">
                                    <button
                                      onClick={() => {
                                        setEditingProduct(product);
                                        setIsProductFormOpen(true);
                                      }}
                                      className={`font-medium text-xs sm:text-sm hover:text-primary transition-colors cursor-pointer break-words whitespace-normal leading-relaxed p-0 border-0 bg-transparent ${isRTL ? 'text-right justify-end' : 'text-left justify-start'}`}
                                    >
                                      {localizedName}
                                    </button>
                                  </TableCell>
                                </>
                              ) : (
                                // LTR order: Name, Category, Price, Status (normal)
                                <>
                                  <TableCell className={`px-2 sm:px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} max-w-[150px] w-[150px]`}>
                                    <button
                                      onClick={() => {
                                        setEditingProduct(product);
                                        setIsProductFormOpen(true);
                                      }}
                                      className={`font-medium text-xs sm:text-sm hover:text-primary transition-colors cursor-pointer break-words whitespace-normal leading-relaxed p-0 border-0 bg-transparent ${isRTL ? 'text-right justify-end' : 'text-left justify-start'}`}
                                    >
                                      {localizedName}
                                    </button>
                                  </TableCell>
                                  <TableCell className={`px-2 sm:px-4 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                      {product.categories?.map((category: any) => (
                                        <span 
                                          key={category.id}
                                          title={getLocalizedField(category, "name", i18n.language as SupportedLanguage)} 
                                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-white hover:bg-primary shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 max-w-[120px] text-center whitespace-nowrap overflow-hidden text-ellipsis"
                                        >
                                          
                                          {getLocalizedField(category, "name", i18n.language as SupportedLanguage)}
                                        </span>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className={`px-2 sm:px-4 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                                          <div className="text-primary text-xs font-medium" dir="ltr">
                                            -{product.discountType === "percentage" ? `${product.discountValue}%` : formatCurrency(parseFloat(product.discountValue))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="font-semibold text-gray-900" dir="ltr">{formatCurrency(product.price || product.pricePerKg)}</div>
                                      )}
                                      <div className="text-gray-500 text-xs mt-1">{getUnitDisplay(product.unit || "100g")}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className={`px-2 sm:px-4 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="flex flex-col gap-1 items-center justify-center">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const isActive = product.availabilityStatus === "available";
                                          if (isActive) {
                                            setProductToToggle({ id: product.id, currentStatus: product.isAvailable });
                                            setIsAvailabilityDialogOpen(true);
                                          } else {
                                            updateAvailabilityStatusMutation.mutate({
                                              id: product.id,
                                              availabilityStatus: "available"
                                            });
                                          }
                                        }}
                                        className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                                          product.availabilityStatus === "available"
                                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        }`}
                                        title={product.availabilityStatus === "available" 
                                          ? adminT('products.hideProduct') 
                                          : adminT('products.showProduct')
                                        }
                                      >
                                        {product.availabilityStatus === "available" 
                                          ? <Eye className="h-6 w-6" /> 
                                          : <EyeOff className="h-6 w-6" />
                                        }
                                      </Button>
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
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery || selectedCategoryFilter !== "all" ? adminT('common.noResults') : adminT('products.noProducts')}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {searchQuery || selectedCategoryFilter !== "all" 
                        ? adminT('common.tryDifferentSearch')
                        : adminT('products.addFirstProduct')
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
                        {adminT('common.showing')} {((productsPage - 1) * itemsPerPage) + 1}-{Math.min(productsPage * itemsPerPage, productsTotal)} {adminT('common.of')} {productsTotal}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(1)}
                          disabled={productsPage === 1}
                          title={adminT('common.firstPage')}
                          className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.max(1, prev - 1))}
                          disabled={productsPage === 1}
                          title={adminT('common.previousPage')}
                          className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-4 bg-white border border-primary rounded h-9 flex items-center justify-center min-w-[60px]" dir="ltr">
                          {productsPage}/{productsTotalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.min(productsTotalPages, prev + 1))}
                          disabled={productsPage === productsTotalPages}
                          title={adminT('common.nextPage')}
                          className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsPage(productsTotalPages)}
                          disabled={productsPage === productsTotalPages}
                          title={adminT('common.lastPage')}
                          className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟩⟩
                        </Button>
                      </div>
                    </div>
                    
                    {/* Desktop: Original layout */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>{adminT('common.showing')} {((productsPage - 1) * itemsPerPage) + 1}-{Math.min(productsPage * itemsPerPage, productsTotal)} {adminT('common.of')} {productsTotal}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(1)}
                          disabled={productsPage === 1}
                          title={adminT('common.firstPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.max(1, prev - 1))}
                          disabled={productsPage === 1}
                          title={adminT('common.previousPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-white border border-primary rounded h-8 flex items-center" dir="ltr">
                          {productsPage} {adminT('common.of')} {productsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(prev => Math.min(productsTotalPages, prev + 1))}
                          disabled={productsPage === productsTotalPages}
                          title={adminT('common.nextPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductsPage(productsTotalPages)}
                          disabled={productsPage === productsTotalPages}
                          title={adminT('common.lastPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
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
                  <div className={`flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className={`${isRTL ? 'text-right' : 'text-left'} flex-1`}>
                      <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : 'justify-start'}`}>
                      <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
                      {adminT('categories.title')}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {adminT('categories.description')}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingCategory(null);
                      setIsCategoryFormOpen(true);
                    }}
                    className={`bg-primary text-white hover:bg-primary hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 w-full sm:w-auto ${isRTL ? 'sm:mr-auto' : 'sm:ml-auto'}`}
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
                      {adminT('categories.dragToReorder')}
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
                    <h3 className={`text-lg font-medium text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.noCategories')}</h3>
                    <p className={`text-gray-500 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.addFirstCategory')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Orders Management */}
          {hasPermission("canManageOrders") && (
            <TabsContent value="orders" className={`space-y-4 sm:space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
              {/* Header Section */}
              <div className="flex flex-col gap-4" dir="ltr">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h1 className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <ShoppingCart className="h-6 w-6" />
                    {adminT('orders.title')}
                  </h1>
                  <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('orders.description')}</p>
                </div>
              
              {/* Controls Row */}
              <div className={`flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                {/* View Mode Toggle */}
                <div className={`flex items-center gap-2 p-1 bg-gray-100 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button
                    variant={ordersViewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setOrdersViewMode("table")}
                    className={`text-xs px-3 py-1 h-8 ${ordersViewMode === "table" ? 'bg-primary text-white hover:bg-primary' : 'hover:bg-gray-200'}`}
                  >
                    <Grid3X3 className={`h-3 w-3 mr-1 ${ordersViewMode === "table" ? 'text-white' : ''}`} />
                    {adminT('common.table')}
                  </Button>
                  <Button
                    variant={ordersViewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setOrdersViewMode("kanban")}
                    className={`text-xs px-3 py-1 h-8 ${ordersViewMode === "kanban" ? 'bg-primary text-white hover:bg-primary' : 'hover:bg-gray-200'}`}
                  >
                    <Columns className={`h-3 w-3 mr-1 ${ordersViewMode === "kanban" ? 'text-white' : ''}`} />
                    {adminT('common.kanban')}
                  </Button>
                </div>

                {/* Filters */}
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Select value={ordersStatusFilter} onValueChange={setOrdersStatusFilter}>
                    <SelectTrigger className="w-40 text-xs h-8">
                      <SelectValue placeholder={adminT('orders.filterOrders')} />
                    </SelectTrigger>
                    <SelectContent className="min-w-[160px] max-w-[200px] bg-white border border-gray-200 shadow-lg z-50">
                      <SelectItem value="active">{adminT('orders.activeOrders')}</SelectItem>
                      <SelectItem value="delivered">{adminT('orders.deliveredOrders')}</SelectItem>
                      <SelectItem value="cancelled">{adminT('orders.cancelledOrders')}</SelectItem>
                      <SelectItem value="all">{adminT('orders.allOrders')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                    <Input
                      placeholder={adminT('orders.searchOrders')}
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
                      <div className={`border rounded-lg bg-white orders ${isRTL ? 'rtl' : 'ltr'} overflow-x-auto`} dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className={`w-full table-container ${isRTL ? 'rtl' : 'ltr'} min-w-[600px]`}>
                          <Table className={`${isRTL ? 'rtl' : ''} w-full table-fixed`}>
                            <TableHeader>
                              <TableRow dir={isRTL ? 'rtl' : 'ltr'}>
                                <TableHead 
                                  className={`text-xs sm:text-sm font-semibold ${isRTL ? 'text-right' : 'text-center'} w-12 sm:w-20`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >№</TableHead>
                                <TableHead 
                                  className={`text-xs sm:text-sm font-semibold ${isRTL ? 'text-right' : 'text-center'} w-32 sm:w-auto`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >{adminT('orders.customer')}</TableHead>
                                <TableHead 
                                  className={`text-xs sm:text-sm hidden sm:table-cell font-semibold ${isRTL ? 'text-right' : 'text-center'} w-24 sm:w-32`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >{adminT('orders.statusHeader')}</TableHead>
                                <TableHead 
                                  className={`text-xs sm:text-sm font-semibold ${isRTL ? 'text-right' : 'text-center'} w-16 sm:w-24`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >{adminT('orders.orderTotal')}</TableHead>
                                <TableHead 
                                  className={`text-xs sm:text-sm hidden md:table-cell font-semibold ${isRTL ? 'text-right' : 'text-center'} w-20 sm:w-28`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >{adminT('orders.orderDate')}</TableHead>

                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ordersResponse.data.map((order: any) => (
                                <TableRow key={order.id} className="hover:bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <TableCell 
                                    className={`font-bold text-xs sm:text-sm text-primary ${isRTL ? 'text-right' : 'text-center'} w-12 sm:w-20`}
                                    style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <span>#{order.id}</span>
                                      <button
                                        onClick={() => {
                                          setEditingOrder(order);
                                          setIsOrderFormOpen(true);
                                        }}
                                        className="inline-flex items-center justify-center h-10 w-10 sm:h-8 sm:w-8 rounded-md bg-primary hover:bg-primary text-white border-2 border-orange-600 shadow-md transition-colors"
                                        title={adminT('orders.viewDetails')}
                                      >
                                        <Eye className="h-6 w-6 sm:h-5 sm:w-5" />
                                      </button>
                                    </div>
                                  </TableCell>
                                  <TableCell 
                                    className={`text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'} w-32 sm:w-auto px-1 sm:px-3`}
                                    style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'left'}}
                                  >
                                    <div className="space-y-1">
                                      <div className="font-medium text-xs sm:text-sm truncate">
                                        {order.user?.firstName && order.user?.lastName 
                                          ? `${order.user.firstName} ${order.user.lastName}`
                                          : order.user?.email || "—"
                                        }
                                      </div>
                                      {order.customerPhone && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="text-blue-600 text-xs sm:text-sm hover:text-blue-800 flex items-center gap-1 cursor-pointer truncate max-w-full">
                                              <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                              <span className="truncate">{order.customerPhone}</span>
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="start" className="w-40 bg-white border border-gray-200 shadow-lg">
                                            <DropdownMenuItem 
                                              onClick={() => window.location.href = `tel:${order.customerPhone}`}
                                              className="cursor-pointer text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                            >
                                              <Phone className="h-4 w-4 mr-2" />
                                              {adminT('orders.call')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                const cleanPhone = order.customerPhone.replace(/[^\d+]/g, '');
                                                window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                              }}
                                              className="cursor-pointer text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                            >
                                              <MessageCircle className="h-4 w-4 mr-2" />
                                              {adminT('orders.whatsapp')}
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell 
                                    className={`hidden sm:table-cell ${isRTL ? 'text-right' : 'text-center'} w-24 sm:w-32 px-1 sm:px-3`}
                                    style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                  >
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
                                      <SelectTrigger className={`w-full h-8 text-xs border-2 ${getStatusColor(order.status)} ${isRTL ? 'text-right' : 'text-center'}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                                        <SelectItem value="pending" className="text-yellow-800 hover:bg-yellow-50">{adminT('orders.status.pending')}</SelectItem>
                                        <SelectItem value="confirmed" className="text-blue-800 hover:bg-blue-50">{adminT('orders.status.confirmed')}</SelectItem>
                                        <SelectItem value="preparing" className="text-orange-800 hover:bg-orange-50">{adminT('orders.status.preparing')}</SelectItem>
                                        <SelectItem value="ready" className="text-green-800 hover:bg-green-50">{adminT('orders.status.ready')}</SelectItem>
                                        <SelectItem value="delivered" className="text-gray-800 hover:bg-gray-50">{adminT('orders.status.delivered')}</SelectItem>
                                        <SelectItem value="cancelled" className="text-red-800 hover:bg-red-50">{adminT('orders.status.cancelled')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell 
                                    className={`font-medium text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-center'} w-16 sm:w-24 px-1 sm:px-3`}
                                    style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                  >
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
                                              <span className="text-sm text-gray-500 line-through">
                                                {formatCurrency(originalTotal)}
                                              </span>
                                              <span className="font-medium text-green-600">
                                                {formatCurrency(order.totalAmount)}
                                              </span>
                                            </div>
                                            <div className="text-sm text-red-600 font-medium">
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
                                            <div className="text-sm text-gray-600">
                                              {adminT('orders.subtotal')}: {formatCurrency(subtotal)}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                              {adminT('orders.deliveryFee')}: {formatCurrency(deliveryFee)}
                                            </div>
                                            <div className="font-medium">
                                              {formatCurrency(order.totalAmount)}
                                            </div>
                                          </div>
                                        );
                                      } else if (deliveryFee === 0 && order.deliveryFee !== undefined) {
                                        return (
                                          <div className="space-y-1">
                                            <div className="text-sm text-gray-600">
                                              {adminT('orders.subtotal')}: {formatCurrency(subtotal)}
                                            </div>
                                            <div className="text-sm text-green-600">
                                              {adminT('orders.deliveryFee')}: {adminT('common.free')}
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
                                  <TableCell 
                                    className={`text-sm sm:text-sm hidden md:table-cell ${isRTL ? 'text-right' : 'text-center'}`}
                                    style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                  >
                                    <div className="space-y-1" dir="ltr">
                                      <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-center'}`}>
                                        <CalendarIcon className="h-3 w-3 text-gray-400" />
                                        <span className="font-medium">{adminT('common.created')}:</span>
                                      </div>
                                      <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-center'}`}>
                                        {new Date(order.createdAt).toLocaleDateString('ru-RU')} {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {order.deliveryDate && (
                                        <>
                                          <div className={`flex items-center gap-1 mt-2 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-center'}`}>
                                            <Clock className="h-3 w-3 text-blue-400" />
                                            <span className="font-medium text-blue-600">{adminT('orders.deliveryDate')}:</span>
                                          </div>
                                          <div className={`text-sm text-blue-600 ${isRTL ? 'text-right' : 'text-center'}`}>
                                            {new Date(order.deliveryDate).toLocaleDateString('ru-RU')} {order.deliveryTime || ''}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* Pagination for table view */}
                        {/* Mobile: Stack info and controls */}
                        <div className="sm:hidden space-y-2 px-4 py-3 border-t bg-gray-50">
                          <div className="text-center text-xs text-gray-600">
                            {adminT('common.showing')} {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} {adminT('common.of')} {ordersResponse.total}
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(1)}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.firstPage')}
                              className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              ⟨⟨
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.previousPage')}
                              className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-4 bg-white border border-primary rounded h-9 flex items-center justify-center min-w-[60px]" dir="ltr">
                              {ordersResponse.page}/{ordersResponse.totalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.nextPage')}
                              className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(ordersResponse.totalPages)}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.lastPage')}
                              className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              ⟩⟩
                            </Button>
                          </div>
                        </div>
                        
                        {/* Desktop: Original layout */}
                        <div className={`hidden sm:flex items-center justify-between px-4 py-3 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-2 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <span>{adminT('common.showing')} {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} {adminT('common.of')} {ordersResponse.total}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(1)}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.firstPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              ⟨⟨
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.previousPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-3 py-1 bg-white border border-primary rounded h-8 flex items-center" dir="ltr">
                              {ordersResponse.page} {adminT('common.of')} {ordersResponse.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.nextPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(ordersResponse.totalPages)}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.lastPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
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
                        ref={kanbanRef}
                        className="overflow-x-auto kanban-scroll-container"
                        style={{ 
                          touchAction: 'pan-x pan-y',
                          overflowX: 'auto',
                          WebkitOverflowScrolling: 'touch'
                        }}
                      >
                        {/* Kanban columns container */}
                        <div 
                          className="flex gap-4 min-w-max pb-4"
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
                              {adminT('orders.status.pending')} ({ordersResponse.data.filter((o: any) => o.status === 'pending').length})
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
                              {adminT('orders.status.confirmed')} ({ordersResponse.data.filter((o: any) => o.status === 'confirmed').length})
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
                              {adminT('orders.status.preparing')} ({ordersResponse.data.filter((o: any) => o.status === 'preparing').length})
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
                              {adminT('orders.status.ready')} ({ordersResponse.data.filter((o: any) => o.status === 'ready').length})
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
                                {adminT('orders.status.delivered')} ({ordersResponse.data.filter((o: any) => o.status === 'delivered').length})
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
                                {adminT('orders.status.cancelled')} ({ordersResponse.data.filter((o: any) => o.status === 'cancelled').length})
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
                        <div className="sm:hidden space-y-2 px-4 py-3">
                          <div className="text-center text-xs text-gray-600">
                            {adminT('common.showing')} {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} {adminT('common.of')} {ordersResponse.total}
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(1)}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.firstPage')}
                              className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              ⟨⟨
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.previousPage')}
                              className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-4 bg-white border border-primary rounded h-9 flex items-center justify-center min-w-[60px]" dir="ltr">
                              {ordersResponse.page}/{ordersResponse.totalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.nextPage')}
                              className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOrdersPage(ordersResponse.totalPages)}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.lastPage')}
                              className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              ⟩⟩
                            </Button>
                          </div>
                        </div>
                        
                        {/* Desktop: Original layout */}
                        <div className="hidden sm:flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span>{adminT('common.showing')} {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} {adminT('common.of')} {ordersResponse.total}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(1)}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.firstPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              ⟨⟨
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                              disabled={ordersResponse.page === 1}
                              title={adminT('common.previousPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-3 py-1 bg-white border border-primary rounded h-8 flex items-center" dir="ltr">
                              {ordersResponse.page} {adminT('common.of')} {ordersResponse.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(prev => Math.min(ordersResponse.totalPages, prev + 1))}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.nextPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOrdersPage(ordersResponse.totalPages)}
                              disabled={ordersResponse.page === ordersResponse.totalPages}
                              title={adminT('common.lastPage')}
                              className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{adminT('orders.noOrders')}</h3>
                    <p className="text-gray-500 text-sm">
                      {ordersStatusFilter === "active" ? adminT('orders.activeOrdersMessage') :
                       ordersStatusFilter === "delivered" ? adminT('orders.deliveredOrdersMessage') :
                       ordersStatusFilter === "cancelled" ? adminT('orders.cancelledOrdersMessage') :
                       adminT('orders.allOrdersMessage')}
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
            <TabsContent value="users" className="space-y-4 sm:space-y-6 users-container" data-tab="users">
              <Card>
                <CardHeader>
                  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                        {adminT('users.title')}
                      </CardTitle>
                      <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {adminT('users.description')}
                      </CardDescription>
                    </div>
                  </div>
              </CardHeader>
              <CardContent>
                {/* Users Filters and Controls */}
                <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${isRTL ? '' : ''}`}>
                  {/* Button first for RTL */}
                  <div className={`flex gap-2 ${isRTL ? 'order-first' : 'order-last'}`}>
                    <Button 
                      onClick={() => setIsUserFormOpen(true)}
                      className={`bg-primary hover:bg-primary text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {adminT('users.createUser')}
                    </Button>
                    <Select value={usersRoleFilter} onValueChange={setUsersRoleFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={adminT('users.allRoles')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{adminT('users.allRoles')}</SelectItem>
                        <SelectItem value="admin">{adminT('roles.admin')}</SelectItem>
                        <SelectItem value="worker">{adminT('roles.worker')}</SelectItem>
                        <SelectItem value="customer">{adminT('roles.customer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Search field */}
                  <div className={`flex-1 ${isRTL ? 'order-last' : 'order-first'}`}>
                    <Input
                      placeholder={adminT('users.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`max-w-sm ${isRTL ? 'text-right ml-auto' : ''}`}
                    />
                  </div>
                </div>

                {/* All filtering is handled by backend */}
                {(() => {
                  const filteredUsers = usersData as any[] || [];

                  const usersTotal = usersResponse?.total || 0;
                  const usersTotalPages = usersResponse?.totalPages || 0;

                  return filteredUsers.length > 0 ? (
                    <div className={`border border-gray-100 rounded-lg bg-white overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className={`overflow-x-auto table-auto-scroll ${isRTL ? 'rtl-scroll-container' : ''}`}>
                      <Table className={`w-full users-table ${isRTL ? 'rtl' : 'ltr'}`}>
                        <TableHeader className="bg-gray-50/80">
                          <TableRow className="border-b border-gray-100" dir={isRTL ? 'rtl' : 'ltr'}>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.name')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.role')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.phone')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.orders')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.totalAmount')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.slice((usersPage - 1) * itemsPerPage, usersPage * itemsPerPage).map((user: any) => (
                            <TableRow key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
                              <TableCell className="px-3 py-3 text-sm rtl-cell">
                                <span 
                                  onClick={() => {
                                    setEditingUser(user);
                                    setIsUserFormOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm font-normal w-full block rtl-text"
                                >
                                  {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.email || adminT('users.unnamed')
                                  }
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-3 rtl-cell">
                                <Badge variant="outline" className={
                                  user.role === "admin" ? "border-red-200 text-red-700 bg-red-50 text-xs" :
                                  user.role === "worker" ? "border-orange-200 text-orange-700 bg-orange-50 text-xs" :
                                  "border-gray-200 text-gray-700 bg-gray-50 text-xs"
                                }>
                                  {user.role === "admin" ? adminT('roles.admin') : 
                                   user.role === "worker" ? adminT('roles.worker') : adminT('roles.customer')}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-3 py-3 text-sm">
                                {user.phone ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <span className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm font-normal w-full block" style={{direction: 'ltr', textAlign: 'left'}}>
                                        {user.phone}
                                      </span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg" align={isRTL ? "start" : "end"}>
                                      <DropdownMenuItem onClick={() => window.open(`tel:${user.phone}`, '_self')} className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
                                        <Phone className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                        {adminT('users.callUser')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => window.open(`https://wa.me/${user.phone.replace(/[^\d]/g, '')}`, '_blank')} className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100">
                                        <MessageCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                        {adminT('users.whatsapp')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span className="text-gray-400 text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell className="px-3 py-3 text-sm rtl-cell">
                                <span className="text-sm text-gray-900 font-normal">
                                  {user.orderCount || 0}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-3 text-sm rtl-cell">
                                <span className="text-sm text-gray-900 font-normal">
                                  {formatCurrency(user.totalOrderAmount || 0)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination for users table */}
                    {/* Mobile: Stack info and controls */}
                    <div className="sm:hidden space-y-2 px-4 py-3 border-t bg-gray-50">
                      <div className="text-center text-xs text-gray-600">
                        {adminT('common.showing')} {((usersPage - 1) * itemsPerPage) + 1}-{Math.min(usersPage * itemsPerPage, usersTotal)} {adminT('common.of')} {usersTotal}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(1)}
                          disabled={usersPage === 1}
                          title={adminT('common.firstPage')}
                          className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                          disabled={usersPage === 1}
                          title={adminT('common.previousPage')}
                          className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-4 bg-white border border-primary rounded h-9 flex items-center justify-center min-w-[60px]" dir="ltr">
                          {usersPage}/{usersTotalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                          disabled={usersPage >= usersTotalPages}
                          title={adminT('common.nextPage')}
                          className="h-9 w-9 p-0 bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUsersPage(usersTotalPages)}
                          disabled={usersPage >= usersTotalPages}
                          title={adminT('common.lastPage')}
                          className="h-9 w-9 p-0 text-xs bg-white text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          ⟩⟩
                        </Button>
                      </div>
                    </div>
                    
                    {/* Desktop: Standard layout */}
                    <div className="hidden sm:flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/30">
                      <div className="text-xs text-gray-600">
                        {adminT('common.showing')} {((usersPage - 1) * itemsPerPage) + 1}-{Math.min(usersPage * itemsPerPage, usersTotal)} {adminT('common.of')} {usersTotal}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(1)}
                          disabled={usersPage === 1}
                          title={adminT('common.firstPage')}
                          className="h-7 w-7 p-0 text-xs bg-white border-orange-200 text-primary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                          disabled={usersPage === 1}
                          title={adminT('common.prevPage')}
                          className="h-7 w-7 p-0 text-xs bg-white border-orange-200 text-primary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-gray-600 px-2 min-w-[60px] text-center" dir="ltr">
                          {usersPage} {adminT('common.of')} {usersTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                          disabled={usersPage >= usersTotalPages}
                          title={adminT('common.nextPage')}
                          className="h-7 w-7 p-0 text-xs bg-white border-orange-200 text-primary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(usersTotalPages)}
                          disabled={usersPage >= usersTotalPages}
                          title={adminT('common.lastPage')}
                          className="h-7 w-7 p-0 text-xs bg-white border-orange-200 text-primary hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ⟩⟩
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{adminT('users.noUsers')}</h3>
                    <p className="text-gray-500 text-sm">{adminT('users.addFirstUser')}</p>
                  </div>
                  );
                })()}
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
                        {adminT('storeSettings.title')}
                      </CardTitle>
                      <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {adminT('storeSettings.description')}
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
                      {adminT('systemSettings.title')}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {adminT('systemSettings.description')}
                    </CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Worker Permissions Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{adminT('systemSettings.workerPermissions')}</h3>
                  <p className="text-sm text-gray-600">
                    {adminT('systemSettings.workerPermissionsDescription')}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {/* Core work sections - always available for workers */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">{adminT('systemSettings.coreWorkSections')}</h4>
                        <p className="text-xs text-blue-600 mb-3">{adminT('systemSettings.coreWorkSectionsDescription')}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-green-600" />
                            <span>{adminT('systemSettings.canManageProducts')} - {adminT('systemSettings.alwaysEnabled')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-green-600" />
                            <span>{adminT('systemSettings.canManageCategories')} - {adminT('systemSettings.alwaysEnabled')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-green-600" />
                            <span>{adminT('systemSettings.canEditOrders')} - {adminT('systemSettings.alwaysEnabled')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <label className="text-sm font-medium">{adminT('systemSettings.canViewUsers')}</label>
                          <p className="text-xs text-gray-500">{adminT('systemSettings.canViewUsersDescription')}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canViewUsers: !((storeSettings?.workerPermissions as any)?.canViewUsers || false)
                              }
                            })
                          }
                          className={`p-2 h-8 w-8 ${(storeSettings?.workerPermissions as any)?.canViewUsers ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-500'}`}
                        >
                          {(storeSettings?.workerPermissions as any)?.canViewUsers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <label className="text-sm font-medium">{adminT('systemSettings.canManageUsers')}</label>
                          <p className="text-xs text-gray-500">{adminT('systemSettings.canManageUsersDescription')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageUsers: !((storeSettings?.workerPermissions as any)?.canManageUsers || false)
                              }
                            })
                          }
                          className="h-8 w-8 p-0"
                        >
                          {(storeSettings?.workerPermissions as any)?.canManageUsers ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <label className="text-sm font-medium">{adminT('systemSettings.canViewSettings')}</label>
                          <p className="text-xs text-gray-500">{adminT('systemSettings.canViewSettingsDescription')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canViewSettings: !((storeSettings?.workerPermissions as any)?.canViewSettings || false)
                              }
                            })
                          }
                          className="h-8 w-8 p-0"
                        >
                          {(storeSettings?.workerPermissions as any)?.canViewSettings ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <label className="text-sm font-medium">{adminT('systemSettings.canManageSettings')}</label>
                          <p className="text-xs text-gray-500">{adminT('systemSettings.canManageSettingsDescription')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageSettings: !((storeSettings?.workerPermissions as any)?.canManageSettings || false)
                              }
                            })
                          }
                          className="h-8 w-8 p-0"
                        >
                          {(storeSettings?.workerPermissions as any)?.canManageSettings ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <label className="text-sm font-medium">{adminT('systemSettings.canManageThemes')}</label>
                          <p className="text-xs text-gray-500">{adminT('systemSettings.canManageThemesDescription')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageThemes: !((storeSettings?.workerPermissions as any)?.canManageThemes || false)
                              }
                            })
                          }
                          className="h-8 w-8 p-0"
                        >
                          {(storeSettings?.workerPermissions as any)?.canManageThemes ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Theme Management */}
          {(hasPermission("canManageSettings") || hasPermission("canManageThemes")) && (
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
        onSubmit={(combinedData: any) => {
          console.log('Received combined data from form:', combinedData);
          
          // Set isAvailable based on availability status
          const productData = {
            ...combinedData,
            isAvailable: combinedData.availabilityStatus !== 'completely_unavailable'
          };
          
          console.log('Final product data for mutation:', productData);
          
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
        adminT={adminT}
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
  
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const translationManager = useTranslationManager({
    defaultLanguage: 'ru',
    baseFields: ['name', 'description']
  });
  
  const [formData, setFormData] = useState<any>({});
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryIds: [],
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

  // Initialize form data with multilingual support - ONLY when dialog opens
  useEffect(() => {
    if (open) {
      if (product) {
        // Set up form data with all language fields
        const initialData = {
          ...product,
          categoryIds: product.categories ? product.categories.map((cat: any) => cat.id) : [],
          price: (product.price || product.pricePerKg)?.toString() || "",
          unit: (product.unit || "100g") as ProductUnit,
          discountValue: product.discountValue?.toString() || "",
        };
        setFormData(initialData);
        
        // Set form values based on current language
        const nameValue = translationManager.getFieldValue(initialData, 'name');
        const descriptionValue = translationManager.getFieldValue(initialData, 'description');
        
        form.reset({
          name: nameValue,
          description: descriptionValue,
          categoryIds: initialData.categoryIds,
          price: initialData.price,
          unit: initialData.unit,
          imageUrl: initialData.imageUrl || "",
          isAvailable: initialData.isAvailable ?? true,
          availabilityStatus: initialData.availabilityStatus || "available",
          isSpecialOffer: initialData.isSpecialOffer ?? false,
          discountType: initialData.discountType || "",
          discountValue: initialData.discountValue,
        });
      } else {
        // New product - reset everything
        const emptyData = {};
        setFormData(emptyData);
        form.reset({
          name: "",
          description: "",
          categoryIds: [],
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
  }, [open, product]);

  // Handle input changes and save to formData
  const handleFieldChange = (fieldName: string, value: any, isMultilingual = false) => {
    if (isMultilingual) {
      const currentLang = translationManager.currentLanguage;
      const defaultLang = translationManager.defaultLanguage;
      
      if (currentLang === defaultLang) {
        setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
      } else {
        const localizedField = `${fieldName}_${currentLang}`;
        setFormData((prev: any) => ({ ...prev, [localizedField]: value }));
      }
    } else {
      // Common fields - same for all languages
      setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
    }
  };



  // Update form values when language changes - TEMPORARILY DISABLED
  /*useEffect(() => {
    if (open && formData && Object.keys(formData).length > 0) {
      const currentLang = translationManager.currentLanguage;
      const defaultLang = translationManager.defaultLanguage;
      
      let nameValue = '';
      let descriptionValue = '';
      
      if (currentLang === defaultLang) {
        // For default language, use base fields
        nameValue = formData.name || '';
        descriptionValue = formData.description || '';
      } else {
        // For other languages, use localized fields with fallback
        const nameField = `name_${currentLang}`;
        const descField = `description_${currentLang}`;
        nameValue = formData[nameField] || '';
        descriptionValue = formData[descField] || '';
      }
      
      // Only update form if values are different to prevent infinite loops
      const currentName = form.getValues('name');
      const currentDesc = form.getValues('description');
      
      if (currentName !== nameValue) {
        form.setValue('name', nameValue);
      }
      if (currentDesc !== descriptionValue) {
        form.setValue('description', descriptionValue);
      }
    }
  }, [translationManager.currentLanguage, open]);*/
  
  // Handle translation copy/clear
  const handleCopyAllFields = () => {
    if (translationManager.currentLanguage === translationManager.defaultLanguage) {
      toast({
        title: 'Уже на основном языке',
        description: 'Копирование не требуется для основного языка',
        variant: 'destructive'
      });
      return;
    }

    // Get values from default language fields
    const defaultName = formData.name || '';
    const defaultDescription = formData.description || '';
    
    if (!defaultName && !defaultDescription) {
      toast({
        title: 'Нет данных для копирования',
        description: 'Заполните поля на русском языке сначала',
        variant: 'destructive'
      });
      return;
    }

    // Update formData with copied values FIRST
    const targetNameField = `name_${translationManager.currentLanguage}`;
    const targetDescField = `description_${translationManager.currentLanguage}`;
    
    const updatedFormData = {
      ...formData,
      [targetNameField]: defaultName,
      [targetDescField]: defaultDescription
    };
    
    setFormData(updatedFormData);

    // Then set form values
    if (defaultName) {
      form.setValue('name', defaultName);
    }
    if (defaultDescription) {
      form.setValue('description', defaultDescription);
    }

    let copiedCount = 0;
    if (defaultName) copiedCount++;
    if (defaultDescription) copiedCount++;

    toast({
      title: adminT('translation.copySuccess'),
      description: adminT('translation.fieldsCopied', { count: copiedCount }),
    });
  };
  
  const handleClearAllFields = () => {
    const clearedCount = translationManager.clearAllFields(setFormData);
    if (clearedCount > 0) {
      form.setValue('name', '');
      form.setValue('description', '');
      
      toast({
        title: adminT('translation.clearSuccess'),
        description: adminT('translation.fieldsCleared', { count: clearedCount }),
      });
    }
  };

  // Local onSubmit handler that merges multilingual data
  const handleFormSubmit = (data: any) => {
    // Save current form values to formData before submitting
    const currentLang = translationManager.currentLanguage;
    const defaultLang = translationManager.defaultLanguage;
    
    const updatedFormData = { ...formData };
    
    // Save current name and description to formData
    if (currentLang === defaultLang) {
      updatedFormData.name = data.name;
      updatedFormData.description = data.description;
    } else {
      updatedFormData[`name_${currentLang}`] = data.name;
      updatedFormData[`description_${currentLang}`] = data.description;
    }
    
    // Save imageUrl if it's a multilingual field
    if (currentLang === defaultLang) {
      updatedFormData.imageUrl = data.imageUrl;
    } else {
      updatedFormData[`imageUrl_${currentLang}`] = data.imageUrl;
    }
    
    // Merge all data - form data + multilingual data from formData
    const finalData = {
      ...data,
      ...updatedFormData
    };
    
    console.log('Submitting product data:', finalData);
    
    // Send to parent component
    onSubmit(finalData);
  };

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
        
        {/* Translation Toolbar */}
        <TranslationToolbar
          currentLanguage={translationManager.currentLanguage}
          defaultLanguage={translationManager.defaultLanguage}
          formData={formData}
          baseFields={['name', 'description']}
          onCopyAllFields={handleCopyAllFields}
          onClearAllFields={handleClearAllFields}
        />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {translationManager.getFieldLabel('name', adminT('products.dialog.nameLabel'))}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={adminT('products.dialog.namePlaceholder')} 
                      {...field}
                      onChange={(e) => {
                        console.log('Name field changed:', e.target.value);
                        field.onChange(e.target.value);
                        handleFieldChange('name', e.target.value, true);
                      }}
                      className="text-sm"
                    />
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
                  <FormLabel className="text-sm">
                    {translationManager.getFieldLabel('description', adminT('products.dialog.descriptionLabel'))}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={adminT('products.dialog.descriptionPlaceholder')}
                      className="resize-none text-sm"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        handleFieldChange('description', e.target.value, true);
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">{adminT('products.dialog.categoryLabel')}</FormLabel>
                  <FormControl>
                    <div className="border rounded-md p-3 max-h-32 overflow-y-auto category-selector-block">
                      {categories?.map((category: any) => (
                        <div key={category.id}
                                          title={getLocalizedField(category, "name", i18n.language as SupportedLanguage)} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            id={`category-${category.id}`}
                            checked={field.value?.includes(category.id) || false}
                            onChange={(e) => {
                              const currentIds = field.value || [];
                              let newIds;
                              if (e.target.checked) {
                                newIds = [...currentIds, category.id];
                              } else {
                                newIds = currentIds.filter((id: number) => id !== category.id);
                              }
                              field.onChange(newIds);
                              handleFieldChange('categoryIds', newIds, false);
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer flex-1">
                            {category.icon} {getLocalizedField(category, "name", i18n.language as SupportedLanguage)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </FormControl>
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
                        onChange={(e) => {
                          console.log('Price field changed:', e.target.value);
                          field.onChange(e.target.value);
                          handleFieldChange('price', e.target.value, false);
                        }}
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
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleFieldChange('unit', value, false);
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder={adminT('products.dialog.unitLabel')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="100g" className="text-sm">{adminT('products.units.100g')}</SelectItem>
                        <SelectItem value="100ml" className="text-sm">{adminT('products.units.100ml')}</SelectItem>
                        <SelectItem value="piece" className="text-sm">{adminT('products.units.piece')}</SelectItem>
                        <SelectItem value="kg" className="text-sm">{adminT('products.units.kg')}</SelectItem>
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
                  <FormLabel className="text-sm">
                    {translationManager.getFieldLabel('imageUrl', adminT('products.dialog.imageLabel'))}
                  </FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={(value) => {
                        field.onChange(value);
                        handleFieldChange('imageUrl', value, true);
                      }}
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
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    handleFieldChange('availabilityStatus', value, false);
                  }} value={field.value}>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newValue = !field.value;
                        field.onChange(newValue);
                        handleFieldChange('isSpecialOffer', newValue, false);
                      }}
                      className={`h-8 w-8 p-0 rounded-lg transition-all duration-200 ${
                        field.value 
                          ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {field.value ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleFieldChange('discountType', value, false);
                          }}
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
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleFieldChange('discountValue', e.target.value, false);
                            }}
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
                    {adminT('products.dialog.fixedDiscountInfo')} {unit === "piece" ? adminT('products.units.piece') : unit === "kg" ? adminT('products.units.kg') : adminT('products.dialog.unit100gml')}
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
              
              <div className="flex flex-row gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200 flex-1"
                >
                  {adminT('products.dialog.cancelButton')}
                </Button>
                <Button 
                  type="submit" 
                  className="text-sm bg-primary text-white border-primary hover:bg-primary hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 flex items-center gap-2 flex-1"
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
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState("basic");
  
  // Get enabled languages from settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: open, // Only fetch when dialog is open
  });
  
  // Define available language tabs based on enabled languages
  const enabledLanguages = (settings as any)?.enabledLanguages || ['ru', 'en', 'he', 'ar'];
  const availableTabs = [
    { key: 'basic', label: adminT('categories.tabs.basic'), icon: Info, langCode: 'ru' },
    { key: 'english', label: 'English', icon: Globe, langCode: 'en' },
    { key: 'hebrew', label: 'עברית', icon: Languages, langCode: 'he' },
    { key: 'arabic', label: 'العربية', icon: Type, langCode: 'ar' }
  ].filter(tab => tab.langCode === 'ru' || enabledLanguages.includes(tab.langCode));

  // Reset activeTab if current tab is not available
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(tab => tab.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);
  
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      name_en: "",
      name_he: "",
      name_ar: "",
      description: "",
      description_en: "",
      description_he: "",
      description_ar: "",
      icon: "🍽️",
    },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          name: category.name || "",
          name_en: category.name_en || "",
          name_he: category.name_he || "",
          name_ar: category.name_ar || "",
          description: category.description || "",
          description_en: category.description_en || "",
          description_he: category.description_he || "",
          description_ar: category.description_ar || "",
          icon: category.icon || "🍽️",
        });
      } else {
        form.reset({
          name: "",
          name_en: "",
          name_he: "",
          name_ar: "",
          description: "",
          description_en: "",
          description_he: "",
          description_ar: "",
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
            {category ? adminT('categories.editTitle') : adminT('categories.addTitle')}
          </DialogTitle>
          <DialogDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            {category ? adminT('categories.editDescription') : adminT('categories.addDescription')}
          </DialogDescription>
        </DialogHeader>
        
        {/* Dynamic Translation Tabs based on enabled languages */}
        <div className="flex border-b border-gray-200 mb-4">
          {availableTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 flex-1 ${
                  activeTab === tab.key
                    ? "border-b-2 border-primary text-primary bg-primary/5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {activeTab === "basic" && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (Русский)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={adminT('categories.fields.namePlaceholder')} 
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
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.description')} (Русский)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={adminT('categories.fields.descriptionPlaceholder')}
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
                        <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.icon')}</FormLabel>
                        <div className="space-y-3">
                          {/* Current selected icon display */}
                          <div className={`flex items-center gap-3 p-3 border rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-2xl">{field.value}</span>
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.selectedIcon')}</div>
                              <div className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.clickToSelect')}</div>
                            </div>
                          </div>
                          
                          {/* Icon grid selector */}
                          <div>
                            <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.popularIcons')}:</div>
                            <div className="grid grid-cols-8 gap-2">
                              {commonIcons.map((icon) => (
                                <Button
                                  key={icon}
                                  type="button"
                                  variant={field.value === icon ? "default" : "outline"}
                                  className={`h-10 w-10 p-0 text-lg ${
                                    field.value === icon 
                                      ? "bg-primary border-primary hover:bg-primary" 
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
                            <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.customIcon')}:</div>
                            <FormControl>
                              <Input 
                                placeholder={adminT('categories.iconPlaceholder')}
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                                dir={isRTL ? 'rtl' : 'ltr'}
                              />
                            </FormControl>
                          </div>
                          
                          {/* Image upload option */}
                          <div>
                            <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.uploadImage')}:</div>
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
                                {adminT('categories.recommendedSize')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                      </FormItem>
                    );
                  }}
                />
              </>
            )}

            {activeTab === "english" && (
              <>
                <FormField
                  control={form.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (English)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Category name in English" 
                          {...field} 
                          className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.description')} (English)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Category description in English"
                          className={`resize-none text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                    </FormItem>
                  )}
                />
              </>
            )}

            {activeTab === "hebrew" && (
              <>
                <FormField
                  control={form.control}
                  name="name_he"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (עברית)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="שם הקטגוריה בעברית" 
                          {...field} 
                          className="text-sm text-right"
                          dir="rtl"
                        />
                      </FormControl>
                      <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_he"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.description')} (עברית)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="תיאור הקטגוריה בעברית"
                          className="resize-none text-sm text-right"
                          dir="rtl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                    </FormItem>
                  )}
                />
              </>
            )}

            {activeTab === "arabic" && (
              <>
                <FormField
                  control={form.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (العربية)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="اسم الفئة بالعربية" 
                          {...field} 
                          className="text-sm text-right"
                          dir="rtl"
                        />
                      </FormControl>
                      <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.description')} (العربية)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="وصف الفئة بالعربية"
                          className="resize-none text-sm text-right"
                          dir="rtl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className={`flex flex-col sm:flex-row justify-center gap-3 ${isRTL ? 'sm:flex-row-reverse rtl:space-x-reverse' : 'space-x-4'}`}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className={`text-sm border-gray-300 text-gray-700 bg-white hover:bg-white hover:shadow-md hover:shadow-black/20 transition-shadow duration-200 ${isRTL ? 'ml-4' : ''}`}
              >
                {adminT('actions.cancel')}
              </Button>
              <Button 
                type="submit" 
                className={`text-sm bg-primary text-white border-primary hover:bg-primary hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {category ? adminT('actions.update') : adminT('actions.create')}  
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
  const currentLanguage = i18n.language as SupportedLanguage;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
  const [isDeliveryPaymentOpen, setIsDeliveryPaymentOpen] = useState(false);

  const [isTrackingCodeOpen, setIsTrackingCodeOpen] = useState(false);

  
  const form = useForm({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: getLocalizedFieldForAdmin(storeSettings, 'storeName', currentLanguage, storeSettings) || "",
      welcomeTitle: getLocalizedFieldForAdmin(storeSettings, 'welcomeTitle', currentLanguage, storeSettings) || "",
      storeDescription: getLocalizedFieldForAdmin(storeSettings, 'storeDescription', currentLanguage, storeSettings) || "",
      logoUrl: storeSettings?.logoUrl || "",
      bannerImage: storeSettings?.bannerImage || "",
      contactPhone: getLocalizedFieldForAdmin(storeSettings, 'contactPhone', currentLanguage, storeSettings) || "",
      contactEmail: getLocalizedFieldForAdmin(storeSettings, 'contactEmail', currentLanguage, storeSettings) || "",
      address: getLocalizedFieldForAdmin(storeSettings, 'address', currentLanguage, storeSettings) || "",
      workingHours: {
        monday: storeSettings?.workingHours?.monday || "",
        tuesday: storeSettings?.workingHours?.tuesday || "",
        wednesday: storeSettings?.workingHours?.wednesday || "",
        thursday: storeSettings?.workingHours?.thursday || "",
        friday: storeSettings?.workingHours?.friday || "",
        saturday: storeSettings?.workingHours?.saturday || "",
        sunday: storeSettings?.workingHours?.sunday || "",
      },
      deliveryInfo: getLocalizedFieldForAdmin(storeSettings, 'deliveryInfo', currentLanguage, storeSettings) || "",
      paymentInfo: getLocalizedFieldForAdmin(storeSettings, 'paymentInfo', currentLanguage, storeSettings) || "",
      aboutText: getLocalizedFieldForAdmin(storeSettings, 'aboutText', currentLanguage, storeSettings) || "",
      paymentMethods: storeSettings?.paymentMethods || [
        { name: "Наличными при получении", id: 1 },
        { name: "Банковской картой", id: 2 },
        { name: "Банковский перевод", id: 3 }
      ],
      aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
      deliveryFee: storeSettings?.deliveryFee || "15.00",
      freeDeliveryFrom: storeSettings?.freeDeliveryFrom || "",
      discountBadgeText: getLocalizedFieldForAdmin(storeSettings, 'discountBadgeText', currentLanguage, storeSettings) || "",
      showBannerImage: storeSettings?.showBannerImage !== false,
      showTitleDescription: storeSettings?.showTitleDescription !== false,
      showInfoBlocks: storeSettings?.showInfoBlocks !== false,
      infoBlocksPosition: storeSettings?.infoBlocksPosition || "top",
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
      whatsappDefaultMessage: getLocalizedFieldForAdmin(storeSettings, 'whatsappDefaultMessage', currentLanguage, storeSettings) || "",
      bannerButtonText: getLocalizedFieldForAdmin(storeSettings, 'bannerButtonText', currentLanguage, storeSettings) || "",
      showCartBanner: storeSettings?.showCartBanner || false,
      bannerButtonLink: storeSettings?.bannerButtonLink || "#categories",
      cartBannerType: storeSettings?.cartBannerType || "text",
      cartBannerImage: storeSettings?.cartBannerImage || "",
      cartBannerText: getLocalizedFieldForAdmin(storeSettings, 'cartBannerText', currentLanguage, storeSettings) || "",
      cartBannerBgColor: storeSettings?.cartBannerBgColor || "#f97316",
      cartBannerTextColor: storeSettings?.cartBannerTextColor || "#ffffff",
      defaultLanguage: storeSettings?.defaultLanguage || "ru",
      enabledLanguages: storeSettings?.enabledLanguages || ["ru", "en", "he"],
    } as any,
  });

  // Helper function to get payment method name for current language
  const getPaymentMethodName = (method: any, language: string) => {
    switch (language) {
      case 'en': return method.name_en || method.name || '';
      case 'he': return method.name_he || method.name || '';
      case 'ar': return method.name_ar || method.name || '';
      default: return method.name || '';
    }
  };

  // Helper function to update payment method name for current language
  const updatePaymentMethodName = (method: any, language: string, newName: string) => {
    switch (language) {
      case 'en': return { ...method, name_en: newName };
      case 'he': return { ...method, name_he: newName };
      case 'ar': return { ...method, name_ar: newName };
      default: return { ...method, name: newName };
    }
  };

  // Reset form when storeSettings or language changes
  useEffect(() => {
    if (storeSettings) {
      console.log('Updating form with paymentMethods:', storeSettings?.paymentMethods);
      form.reset({
        storeName: getLocalizedFieldForAdmin(storeSettings, 'storeName', currentLanguage, storeSettings) || "",
        welcomeTitle: getLocalizedFieldForAdmin(storeSettings, 'welcomeTitle', currentLanguage, storeSettings) || "",
        storeDescription: getLocalizedFieldForAdmin(storeSettings, 'storeDescription', currentLanguage, storeSettings) || "",
        logoUrl: storeSettings?.logoUrl || "",
        bannerImage: storeSettings?.bannerImage || "",
        contactPhone: getLocalizedFieldForAdmin(storeSettings, 'contactPhone', currentLanguage, storeSettings) || "",
        contactEmail: getLocalizedFieldForAdmin(storeSettings, 'contactEmail', currentLanguage, storeSettings) || "",
        address: getLocalizedFieldForAdmin(storeSettings, 'address', currentLanguage, storeSettings) || "",
        workingHours: {
          monday: storeSettings?.workingHours?.monday || "",
          tuesday: storeSettings?.workingHours?.tuesday || "",
          wednesday: storeSettings?.workingHours?.wednesday || "",
          thursday: storeSettings?.workingHours?.thursday || "",
          friday: storeSettings?.workingHours?.friday || "",
          saturday: storeSettings?.workingHours?.saturday || "",
          sunday: storeSettings?.workingHours?.sunday || "",
        },
        deliveryInfo: getLocalizedFieldForAdmin(storeSettings, 'deliveryInfo', currentLanguage, storeSettings) || "",
        aboutText: getLocalizedFieldForAdmin(storeSettings, 'aboutText', currentLanguage, storeSettings) || "",
        bannerButtonText: getLocalizedFieldForAdmin(storeSettings, 'bannerButtonText', currentLanguage, storeSettings) || "",
        paymentInfo: getLocalizedFieldForAdmin(storeSettings, 'paymentInfo', currentLanguage, storeSettings) || "",
        discountBadgeText: getLocalizedFieldForAdmin(storeSettings, 'discountBadgeText', currentLanguage, storeSettings) || "",
        whatsappDefaultMessage: getLocalizedFieldForAdmin(storeSettings, 'whatsappDefaultMessage', currentLanguage, storeSettings) || "",
        cartBannerText: getLocalizedFieldForAdmin(storeSettings, 'cartBannerText', currentLanguage, storeSettings) || "",
        paymentMethods: storeSettings?.paymentMethods || [],
        aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
        deliveryFee: storeSettings?.deliveryFee || "15.00",
        freeDeliveryFrom: storeSettings?.freeDeliveryFrom || "",

        showBannerImage: storeSettings?.showBannerImage !== false,
        showTitleDescription: storeSettings?.showTitleDescription !== false,
        showInfoBlocks: storeSettings?.showInfoBlocks !== false,
        infoBlocksPosition: storeSettings?.infoBlocksPosition || "top",
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

        showCartBanner: storeSettings?.showCartBanner || false,
        cartBannerType: storeSettings?.cartBannerType || "text",
        cartBannerImage: storeSettings?.cartBannerImage || "",

        cartBannerBgColor: storeSettings?.cartBannerBgColor || "#f97316",
        cartBannerTextColor: storeSettings?.cartBannerTextColor || "#ffffff",

        defaultLanguage: storeSettings?.defaultLanguage || "ru",
        enabledLanguages: storeSettings?.enabledLanguages || ["ru", "en", "he"],
        bannerButtonLink: storeSettings?.bannerButtonLink || "",
        modernBlock1Icon: storeSettings?.modernBlock1Icon || "",
        modernBlock1Text: storeSettings?.modernBlock1Text || "",
        modernBlock2Icon: storeSettings?.modernBlock2Icon || "",
        modernBlock2Text: storeSettings?.modernBlock2Text || "",
        modernBlock3Icon: storeSettings?.modernBlock3Icon || "",
        modernBlock3Text: storeSettings?.modernBlock3Text || "",
      } as any);
    }
  }, [storeSettings, currentLanguage, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        // Create multilingual updates for text fields - only update current language
        const multilingualUpdates = {
          ...createMultilingualUpdate('storeName', data.storeName, currentLanguage),
          ...createMultilingualUpdate('welcomeTitle', data.welcomeTitle, currentLanguage),
          ...createMultilingualUpdate('storeDescription', data.storeDescription, currentLanguage),
          ...createMultilingualUpdate('deliveryInfo', data.deliveryInfo, currentLanguage),
          ...createMultilingualUpdate('aboutText', data.aboutText, currentLanguage),
          ...createMultilingualUpdate('bannerButtonText', data.bannerButtonText, currentLanguage),
          ...createMultilingualUpdate('paymentInfo', data.paymentInfo, currentLanguage),
          ...createMultilingualUpdate('discountBadgeText', data.discountBadgeText, currentLanguage),
          ...createMultilingualUpdate('whatsappDefaultMessage', data.whatsappDefaultMessage, currentLanguage),
          ...createMultilingualUpdate('cartBannerText', data.cartBannerText, currentLanguage),
          ...createMultilingualUpdate('contactPhone', data.contactPhone, currentLanguage),
          ...createMultilingualUpdate('contactEmail', data.contactEmail, currentLanguage),
          ...createMultilingualUpdate('address', data.address, currentLanguage),
        };
        
        // Preserve existing data for other languages using correct database field names
        const preservedData = {
          // Keep all existing multilingual data with proper camelCase naming
          storeName: storeSettings?.storeName || '',
          storeNameEn: storeSettings?.storeNameEn || '',
          storeNameHe: storeSettings?.storeNameHe || '',
          storeNameAr: storeSettings?.storeNameAr || '',
          welcomeTitle: storeSettings?.welcomeTitle || '',
          welcomeTitleEn: storeSettings?.welcomeTitleEn || '',
          welcomeTitleHe: storeSettings?.welcomeTitleHe || '',
          welcomeTitleAr: storeSettings?.welcomeTitleAr || '',
          storeDescription: storeSettings?.storeDescription || '',
          storeDescriptionEn: storeSettings?.storeDescriptionEn || '',
          storeDescriptionHe: storeSettings?.storeDescriptionHe || '',
          storeDescriptionAr: storeSettings?.storeDescriptionAr || '',
          deliveryInfo: storeSettings?.deliveryInfo || '',
          deliveryInfoEn: storeSettings?.deliveryInfoEn || '',
          deliveryInfoHe: storeSettings?.deliveryInfoHe || '',
          deliveryInfoAr: storeSettings?.deliveryInfoAr || '',
          aboutText: storeSettings?.aboutText || '',
          aboutTextEn: storeSettings?.aboutTextEn || '',
          aboutTextHe: storeSettings?.aboutTextHe || '',
          aboutTextAr: storeSettings?.aboutTextAr || '',
          bannerButtonText: storeSettings?.bannerButtonText || '',
          bannerButtonTextEn: storeSettings?.bannerButtonTextEn || '',
          bannerButtonTextHe: storeSettings?.bannerButtonTextHe || '',
          bannerButtonTextAr: storeSettings?.bannerButtonTextAr || '',
          paymentInfo: storeSettings?.paymentInfo || '',
          paymentInfoEn: storeSettings?.paymentInfoEn || '',
          paymentInfoHe: storeSettings?.paymentInfoHe || '',
          paymentInfoAr: storeSettings?.paymentInfoAr || '',
          discountBadgeText: storeSettings?.discountBadgeText || '',
          discountBadgeTextEn: storeSettings?.discountBadgeTextEn || '',
          discountBadgeTextHe: storeSettings?.discountBadgeTextHe || '',
          discountBadgeTextAr: storeSettings?.discountBadgeTextAr || '',
          whatsappDefaultMessage: storeSettings?.whatsappDefaultMessage || '',
          whatsappDefaultMessageEn: storeSettings?.whatsappDefaultMessageEn || '',
          whatsappDefaultMessageHe: storeSettings?.whatsappDefaultMessageHe || '',
          whatsappDefaultMessageAr: storeSettings?.whatsappDefaultMessageAr || '',
          cartBannerText: storeSettings?.cartBannerText || '',
          cartBannerTextEn: storeSettings?.cartBannerTextEn || '',
          cartBannerTextHe: storeSettings?.cartBannerTextHe || '',
          cartBannerTextAr: storeSettings?.cartBannerTextAr || '',
          contactPhone: storeSettings?.contactPhone || '',
          contactPhoneEn: storeSettings?.contactPhoneEn || '',
          contactPhoneHe: storeSettings?.contactPhoneHe || '',
          contactPhoneAr: storeSettings?.contactPhoneAr || '',
          contactEmail: storeSettings?.contactEmail || '',
          contactEmailEn: storeSettings?.contactEmailEn || '',
          contactEmailHe: storeSettings?.contactEmailHe || '',
          contactEmailAr: storeSettings?.contactEmailAr || '',
          address: storeSettings?.address || '',
          addressEn: storeSettings?.addressEn || '',
          addressHe: storeSettings?.addressHe || '',
          addressAr: storeSettings?.addressAr || '',
        };
        
        // Handle payment methods specially - preserve all language data
        const processedPaymentMethods = data.paymentMethods?.map((method: any) => {
          // Find corresponding method in existing data
          const existingMethod = storeSettings?.paymentMethods?.find((existing: any) => 
            existing.name === method.name || existing.id === method.id
          );
          
          if (existingMethod) {
            // Merge current language changes with existing multilingual data
            return {
              ...existingMethod,
              ...method,
              // Preserve other language data that might not be in current form
              name_en: existingMethod.name_en || method.name_en || '',
              name_he: existingMethod.name_he || method.name_he || '',
              name_ar: existingMethod.name_ar || method.name_ar || ''
            };
          }
          
          return method;
        }) || [];

        // Merge preserved data with current language updates and other form data
        const finalData = { 
          ...data, 
          ...preservedData, 
          ...multilingualUpdates,
          paymentMethods: processedPaymentMethods
        };
        

        
        onSubmit(finalData);
      })} className={`space-y-8 ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* {adminT('storeSettings.basicInfo')} */}
        <Collapsible open={isBasicInfoOpen} onOpenChange={setIsBasicInfoOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full`} dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? (
                  <>
                    {isBasicInfoOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-semibold flex-1 text-right">{adminT('storeSettings.basicInfo')}</h3>
                    <Store className="h-5 w-5 text-primary" />
                  </>
                ) : (
                  <>
                    <Store className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold flex-1 text-left">{adminT('storeSettings.basicInfo')}</h3>
                    {isBasicInfoOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </>
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            {/* Language indicator for multilingual fields */}
            <div className={`flex items-center gap-2 p-3 bg-blue-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Languages className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                {adminT('storeSettings.editingLanguage')}: <strong>{currentLanguage.toUpperCase()}</strong>
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="storeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{adminT('storeSettings.storeName')}</FormLabel>
                <FormControl>
                  <Input placeholder={adminT('storeSettings.storeNamePlaceholder')} {...field} className="text-sm" />
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
                <FormLabel className="text-sm">{adminT('storeSettings.welcomeTitle')}</FormLabel>
                <FormControl>
                  <Input placeholder={adminT('storeSettings.welcomeTitlePlaceholder')} {...field} className="text-sm" />
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
                <FormLabel className="text-sm">{adminT('storeSettings.contactPhone')}</FormLabel>
                <FormControl>
                  <Input placeholder={adminT('storeSettings.contactPhonePlaceholder')} {...field} className="text-sm" />
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
                <FormLabel className="text-sm">{adminT('storeSettings.contactEmail')}</FormLabel>
                <FormControl>
                  <Input placeholder={adminT('storeSettings.contactEmailPlaceholder')} type="email" {...field} className="text-sm" />
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
                <FormLabel className="text-sm">{adminT('storeSettings.deliveryFee')}</FormLabel>
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
                <FormLabel className="text-sm">{adminT('storeSettings.freeDeliveryFrom')}</FormLabel>
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
                <FormLabel className="text-sm">{adminT('storeSettings.defaultItemsPerPage')}</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString() || "10"}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={adminT('storeSettings.selectQuantity')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="10">{adminT('storeSettings.items10')}</SelectItem>
                    <SelectItem value="15">{adminT('storeSettings.items15')}</SelectItem>
                    <SelectItem value="25">{adminT('storeSettings.items25')}</SelectItem>
                    <SelectItem value="50">{adminT('storeSettings.items50')}</SelectItem>
                    <SelectItem value="100">{adminT('storeSettings.items100')}</SelectItem>
                    <SelectItem value="1000">{adminT('storeSettings.allItems')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-gray-500">
                  {adminT('storeSettings.itemsPerPageDescription')}
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountBadgeText"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{adminT('storeSettings.discountBadgeTextLabel')}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={adminT('storeSettings.discountBadgeText')}
                    className="text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {adminT('storeSettings.discountBadgeDescription')}
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
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className={`text-lg font-semibold flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('storeSettings.contacts')}</h3>
                {isContactsOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
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
              <FormLabel className="text-sm">{adminT('storeSettings.storeDescription')}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={adminT('storeSettings.storeDescriptionPlaceholder')}
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
              <FormLabel className="text-sm">{adminT('storeSettings.address')}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={adminT('storeSettings.addressPlaceholder')}
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



        {/* Language Settings */}
        <Collapsible open={isLanguageSettingsOpen} onOpenChange={setIsLanguageSettingsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <Languages className="h-5 w-5 text-primary" />
                <h3 className={`text-lg font-semibold flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('storeSettings.languageSettings')}</h3>
                {isLanguageSettingsOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{adminT('storeSettings.defaultLanguage')}</h4>
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
                  {adminT('storeSettings.defaultLanguageDescription')}
                </p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{adminT('storeSettings.availableLanguages')}</h4>
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
                            {isEnabled ? adminT('storeSettings.languageActive') : adminT('storeSettings.languageDisabled')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const currentEnabled = form.getValues("enabledLanguages") || ["ru", "en", "he"];
                              const currentDefault = form.getValues("defaultLanguage") || "ru";
                              let newEnabled;
                              
                              if (isEnabled) {
                                newEnabled = currentEnabled.filter((lang: string) => lang !== code);
                              } else {
                                newEnabled = [...currentEnabled, code];
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
                            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            {isEnabled ? (
                              <Eye className="h-5 w-5 text-green-600 hover:scale-110 transition-transform" />
                            ) : (
                              <EyeOff className="h-5 w-5 text-gray-400 hover:scale-110 transition-transform" />
                            )}
                          </button>
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
                  <strong>{adminT('storeSettings.noteTitle')}:</strong> {adminT('storeSettings.languageNote')}
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
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full`} dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? (
                  <>
                    {isWorkingHoursOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-semibold flex-1 text-right">{adminT('storeSettings.operatingHours')}</h3>
                    <Clock className="h-5 w-5 text-primary" />
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold flex-1 text-left">{adminT('storeSettings.operatingHours')}</h3>
                    {isWorkingHoursOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </>
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
          
          <FormField
            control={form.control}
            name="weekStartDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{adminT('storeSettings.weekStartDay')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={adminT('storeSettings.weekStartDayPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monday">{adminT('storeSettings.monday')}</SelectItem>
                    <SelectItem value="sunday">{adminT('storeSettings.sunday')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {adminT('storeSettings.weekStartDayDescription')}
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "monday", label: adminT(`storeSettings.monday`) },
              { key: "tuesday", label: adminT(`storeSettings.tuesday`) },
              { key: "wednesday", label: adminT(`storeSettings.wednesday`) },
              { key: "thursday", label: adminT(`storeSettings.thursday`) },
              { key: "friday", label: adminT(`storeSettings.friday`) },
              { key: "saturday", label: adminT(`storeSettings.saturday`) },
              { key: "sunday", label: adminT(`storeSettings.sunday`) },
            ].map(({ key, label }) => {
              const currentHours = form.watch(`workingHours.${key}` as any) || "";
              const isWorking = currentHours && currentHours !== adminT('storeSettings.closedDay');
              const [openTime, closeTime] = isWorking ? currentHours.split("-") : ["09:00", "18:00"];

              return (
                <div key={key} className={`border rounded-lg p-3 space-y-2 ${isWorking ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <FormLabel className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{label}</FormLabel>
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isWorking) {
                            form.setValue(`workingHours.${key}` as any, "");
                          } else {
                            form.setValue(`workingHours.${key}` as any, "09:00-18:00");
                          }
                        }}
                        className={`p-1 h-7 w-7 ${isWorking ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-500'}`}
                      >
                        {isWorking ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-center font-medium">
                    {isWorking ? (
                      <span className="text-green-700">{adminT('storeSettings.workingDay')}</span>
                    ) : (
                      <span className="text-gray-500">{adminT('storeSettings.closedDay')}</span>
                    )}
                  </div>
                  
                  {isWorking && (
                    <div className="space-y-2">
                      <div>
                        <FormLabel className="text-xs text-gray-600 block mb-1">{adminT('storeSettings.openTime')}</FormLabel>
                        <Select
                          value={openTime}
                          onValueChange={(value) => {
                            const currentClose = closeTime || "18:00";
                            form.setValue(`workingHours.${key}` as any, `${value}-${currentClose}`);
                          }}
                        >
                          <SelectTrigger className="text-xs h-8">
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
                        <FormLabel className="text-xs text-gray-600 block mb-1">{adminT('storeSettings.closeTime')}</FormLabel>
                        <Select
                          value={closeTime}
                          onValueChange={(value) => {
                            const currentOpen = openTime || "09:00";
                            form.setValue(`workingHours.${key}` as any, `${currentOpen}-${value}`);
                          }}
                        >
                          <SelectTrigger className="text-xs h-8">
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

        {/* {adminT('storeSettings.deliveryPayment')} */}
        <Collapsible open={isDeliveryPaymentOpen} onOpenChange={setIsDeliveryPaymentOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full`} dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? (
                  <>
                    {isDeliveryPaymentOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-semibold flex-1 text-right">{adminT('storeSettings.deliveryPayment')}</h3>
                    <Truck className="h-5 w-5 text-primary" />
                  </>
                ) : (
                  <>
                    <Truck className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold flex-1 text-left">{adminT('storeSettings.deliveryPayment')}</h3>
                    {isDeliveryPaymentOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </>
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
              <FormLabel className={`text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <Truck className="h-4 w-4" />
                {adminT('storeSettings.deliveryInfo')}
              </FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={adminT('storeSettings.deliveryInfoPlaceholder')}
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
              <FormLabel className={`text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <CreditCard className="h-4 w-4" />
                {adminT('storeSettings.paymentInfo')}
              </FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={adminT('storeSettings.paymentInfoPlaceholder')}
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
              <FormLabel className={`text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <CreditCard className="h-4 w-4" />
                {adminT('storeSettings.paymentMethods')}
              </FormLabel>
              <div className="space-y-3">
                {(field.value || []).map((method: any, index: number) => (
                  <div key={method.id || index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder={adminT('storeSettings.paymentMethodPlaceholder')}
                      value={getPaymentMethodName(method, currentLanguage)}
                      onChange={(e) => {
                        const updatedMethods = [...(field.value || [])];
                        updatedMethods[index] = updatePaymentMethodName(method, currentLanguage, e.target.value);
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
{adminT('actions.delete')}
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMethod = { 
                      name: "", 
                      name_en: "", 
                      name_he: "", 
                      name_ar: "", 
                      fee: 0, 
                      enabled: true, 
                      id: Date.now() 
                    };
                    field.onChange([...(field.value || []), newMethod]);
                  }}
                  className="w-full"
                >
+ {adminT('storeSettings.addPaymentMethod')}
                </Button>
              </div>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

          </CollapsibleContent>
        </Collapsible>


        {/* {adminT('storeSettings.trackingCode')} */}
        <Collapsible open={isTrackingCodeOpen} onOpenChange={setIsTrackingCodeOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full`} dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? (
                  <>
                    {isTrackingCodeOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-semibold flex-1 text-right">{adminT('storeSettings.trackingCode')}</h3>
                    <Code className="h-5 w-5 text-primary" />
                  </>
                ) : (
                  <>
                    <Code className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold flex-1 text-left">{adminT('storeSettings.trackingCode')}</h3>
                    {isTrackingCodeOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </>
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
                    {adminT('storeSettings.htmlHeadCode')}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={adminT('storeSettings.htmlHeadExample')} 
                      className="text-sm font-mono min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    {adminT('storeSettings.htmlHeadDescription')}
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
                    {adminT('storeSettings.htmlFooterCode')}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={adminT('storeSettings.htmlFooterExample')} 
                      className="text-sm font-mono min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-gray-500">
                    {adminT('storeSettings.htmlFooterDescription')}
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>



        <div className="flex justify-center">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-primary text-white hover:bg-primary hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200"
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
  cancellationReasons,
  adminT 
}: {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  cancellationReasons: string[];
  adminT: (key: string) => string;
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
          <DialogTitle className="text-lg">{adminT('orders.cancelReason')}</DialogTitle>
          <DialogDescription className="text-sm">
            {adminT('orders.selectCancelReason')} #{orderId}
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
                className="text-primary focus:ring-orange-500"
              />
              <label htmlFor={`reason-${index}`} className="text-sm cursor-pointer">
                {reason}
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-center space-x-2 pt-4">
          <Button variant="outline" onClick={onClose} className="text-sm">
            {adminT('actions.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedReason}
            className="text-sm bg-red-600 text-white hover:bg-red-700"
          >
            {adminT('orders.cancelOrder')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// User Form Dialog Component
function UserFormDialog({ open, onClose, user, onSubmit, onDelete }: any) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const userSchema = z.object({
    email: z.string().email(adminT('dialog.emailError')),
    firstName: z.string().min(1, adminT('dialog.firstNameRequired')),
    lastName: z.string().min(1, adminT('dialog.lastNameRequired')),
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
          <DialogTitle className={`text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            {user ? adminT('users.editUser') : adminT('users.createUser')}
          </DialogTitle>
          <DialogDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            {user ? adminT('dialog.editDescription') : adminT('dialog.addDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dialog.emailLabel')} *</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder={adminT('dialog.emailPlaceholder')}
                      {...field}
                      className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </FormControl>
                  <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                </FormItem>
              )}
            />

            <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'rtl' : 'ltr'}`}>
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dialog.firstNameLabel')} *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={adminT('dialog.firstNamePlaceholder')}
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dialog.lastNameLabel')} *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={adminT('dialog.lastNamePlaceholder')}
                        {...field}
                        className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                    </FormControl>
                    <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dialog.phoneLabel')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel"
                      placeholder={adminT('dialog.phonePlaceholder')}
                      {...field}
                      className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                      dir="ltr"
                    />
                  </FormControl>
                  <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dialog.roleLabel')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <SelectValue placeholder={adminT('dialog.rolePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="customer">{adminT('roles.customer')}</SelectItem>
                      <SelectItem value="worker">{adminT('roles.worker')}</SelectItem>
                      <SelectItem value="admin">{adminT('roles.admin')}</SelectItem>
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
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {user ? adminT('dialog.newPasswordLabel') : adminT('dialog.passwordLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder={adminT('dialog.passwordMinLength')}
                      {...field}
                      className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </FormControl>
                  <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                </FormItem>
              )}
            />

            <div className={`flex justify-between items-center pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button type="button" variant="outline" onClick={onClose} className="text-sm">
                  {adminT('actions.cancel')}
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
                        {adminT('actions.delete')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                          {adminT('users.deleteUser')}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                          {adminT('dialog.deleteWarning')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
                        <AlertDialogCancel>{adminT('actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onDelete(user.id);
                            onClose();
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {adminT('actions.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Button 
                type="submit" 
                className="text-sm bg-primary hover:bg-primary text-white"
              >
                {user ? adminT('actions.update') : adminT('users.createUser')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
