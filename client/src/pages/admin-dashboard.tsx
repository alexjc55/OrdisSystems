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

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useModalBackButton, suppressedHistoryBack, isPopstateSuppressed } from "@/hooks/useModalBackButton";

import { useAdminTranslation, useCommonTranslation, useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/lib/i18n";
import { useTranslationManager } from "@/hooks/useTranslationManager";
import { TranslationToolbar } from "@/components/ui/translation-toolbar";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { getLocalizedFieldForAdmin } from "@shared/multilingual-helpers";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { getMultilingualValue, createMultilingualUpdate } from "@/components/ui/multilingual-store-settings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDropdown, buildCategoryOptions } from "@/components/ui/category-dropdown";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
import { TranslationManager } from "@/components/admin/translation-manager";
import { CatalogImportModal } from "@/components/admin/catalog-import-modal";
import { PushNotificationsPanel } from "@/components/PushNotificationsPanel";
import { AdminCacheBuster } from "@/components/cache-buster";
import { BarcodeConfigSection } from "@/components/barcode-config-section";
import { BarcodeScanner } from "@/components/barcode-scanner";
import CreateOrderDialog from "@/components/create-order-dialog";
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

  const isImgUrl = (s?: string | null) => !!s && (s.startsWith('/') || s.startsWith('http'));
  // Prefer dedicated image field, fallback to icon if it's a URL
  const thumbSrc = isImgUrl(category.image) ? category.image : isImgUrl(category.icon) ? category.icon : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 h-[140px] flex flex-col backdrop-blur-sm hover:border-gray-300"
    >
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent pointer-events-none" />
      
      {/* Header with drag handle and actions */}
      <div className="relative flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 -m-1.5 text-gray-400 hover:text-gray-600 hover:bg-[rgba(255,255,255,0.7)] rounded-lg transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-gray-200 relative z-10"
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
            <span className="text-xs font-medium text-white hover:text-white transition-colors bg-primary hover:bg-primary px-2 py-1 rounded-md backdrop-blur-sm shadow-sm whitespace-nowrap">
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
            className={`h-7 w-7 p-0 rounded-lg backdrop-blur-sm transition-all duration-200 border border-transparent ${category.isActive ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 hover:border-gray-200'}`}
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
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed hover:text-gray-700">
              {getLocalizedField(category, 'description', i18n.language as SupportedLanguage)}
            </p>
          )}
        </div>
        
        {/* Right container - photo thumbnail or emoji icon */}
        <div className="flex-shrink-0 flex items-center">
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt=""
              className="w-14 h-14 object-cover rounded-lg shadow-sm transform group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-sm opacity-80">
              {!isImgUrl(category.icon) ? (category.icon || '📦') : '📦'}
            </div>
          )}
        </div>
      </div>

      {/* Inactive state overlay */}
      {!category.isActive && (
        <div className="absolute inset-0 bg-gray-100 opacity-80 backdrop-blur-[2px] rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-white backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
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
  Minus,
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
  Type,
  Smartphone,
  Bell,
  Image,
  Loader2,
  QrCode,
  Camera,
  Menu,
  Mail,
  BarChart3,
  Printer,
  Building2,
  Pencil,
  AlertTriangle,
  Tag,
  Gift,
  Percent,
  CheckCircle,
  XCircle,
  Star,
  Download
} from "lucide-react";

// Validation schemas
const productSchema = z.object({
  name: z.string().min(1, 'Введите название товара'),
  description: z.string().optional(),
  ingredients: z.string().optional(),
  categoryIds: z.array(z.number()).min(1, "Выберите хотя бы одну категорию"),
  price: z.string().min(1),
  unit: z.enum(["100g", "100ml", "piece", "portion", "kg"]).default("100g"),
  imageUrl: z.string().optional(),
  barcode: z.string().optional(),
  isAvailable: z.boolean().default(true),
  availabilityStatus: z.enum(["available", "out_of_stock_today", "completely_unavailable"]).default("available"),
  isSpecialOffer: z.boolean().default(false),
  discountType: z.string().optional(),
  discountValue: z.string().optional(),
  sortOrder: z.number().default(0),
});

const categorySchema = z.object({
  name: z.string().optional(),
  name_en: z.string().optional(),
  name_he: z.string().optional(),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  description_en: z.string().optional(),
  description_he: z.string().optional(),
  description_ar: z.string().optional(),
  icon: z.string().default("🍽️"),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
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
  facebookConversionsApiEnabled: z.boolean().default(false),
  facebookPixelId: z.string().optional(),
  facebookAccessToken: z.string().optional(),
  // Payment provider form fields (packed into paymentProviderConfig on submit)
  paymentProvider: z.string().default('none'),
  hypMasof: z.string().optional(),
  hypPassP: z.string().optional(),
  hypKey: z.string().optional(),
  hypTestMode: z.boolean().default(true),
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
const generateAdminDeliveryTimes = (workingHours: any, selectedDate: string, weekStartDay: string = 'monday', deliveryHours?: any) => {
  if (!workingHours || !selectedDate) return [];
  
  const date = new Date(selectedDate + 'T00:00:00');
  // Fixed Sunday-first mapping: date.getDay() always returns 0=Sun…6=Sat
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = DAY_NAMES[date.getDay()];

  // Determine effective schedule: deliveryHours override > workingHours fallback
  const deliveryDayValue = deliveryHours?.[dayName];
  const effectiveSchedule = (deliveryDayValue != null) ? deliveryDayValue : workingHours[dayName];

  if (!effectiveSchedule || effectiveSchedule.trim() === '' || 
      effectiveSchedule.toLowerCase().includes('закрыто') || 
      effectiveSchedule.toLowerCase().includes('closed') ||
      effectiveSchedule.toLowerCase().includes('выходной')) {
    return [{
      value: 'closed',
      label: 'Closed'
    }];
  }
  
  // Parse schedule (e.g., "09:00-18:00" or "09:00-14:00, 16:00-20:00")
  const timeSlots: { value: string; label: string }[] = [];
  const scheduleRanges = effectiveSchedule.split(',').map((range: string) => range.trim());
  
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
function DraggableOrderCard({ order, onEdit, onStatusChange, onCancelOrder, branchName }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void, branchName?: string }) {
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
      <OrderCard order={order} onEdit={onEdit} onStatusChange={onStatusChange} onCancelOrder={onCancelOrder} branchName={branchName} />
    </div>
  );
}

const OrderCard = React.memo(function OrderCard({ order, onEdit, onStatusChange, onCancelOrder, branchName }: { order: any, onEdit: (order: any) => void, onStatusChange: (data: { orderId: number, status: string }) => void, onCancelOrder: (orderId: number) => void, branchName?: string }) {
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
  const { t: commonT } = useCommonTranslation();
  const { i18n } = useTranslation();
  const { storeSettings: cardStoreSettings } = useStoreSettings();

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
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow bg-white"
      onClick={() => onEdit(order)}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Order Header */}
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm text-primary">#{order.id}</div>
            <div className="flex items-center gap-1">
              {branchName && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-purple-200 text-purple-700 bg-purple-50">
                  <Building2 className="h-2.5 w-2.5 mr-0.5" />
                  {branchName}
                </Badge>
              )}
              <Badge className={`text-xs px-2 py-1 ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3 w-3 text-gray-400" />
              <div className="flex flex-col">
                <span className="font-medium">
                  {order.user ? (
                    order.user.firstName && order.user.lastName 
                      ? `${order.user.firstName} ${order.user.lastName}`
                      : order.user.email || "—"
                  ) : order.guestName ? (
                    order.guestName
                  ) : "Гость"}
                </span>
                {!order.user && order.guestEmail && (
                  <span className="text-xs text-blue-600">{order.guestEmail}</span>
                )}
              </div>
            </div>
            {(order.customerPhone || order.guestPhone) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="text-blue-600 text-xs hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-3 w-3" />
                    {order.customerPhone || order.guestPhone}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem 
                    onClick={() => window.location.href = `tel:${order.customerPhone || order.guestPhone}`}
                    className="cursor-pointer hover:!text-primary hover:!bg-orange-50 focus:!text-primary focus:!bg-orange-50"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {adminT('orders.call')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      const cleanPhone = (order.customerPhone || order.guestPhone).replace(/[^\d+]/g, '');
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
              
              const hasCouponDiscount = parseFloat(order.couponDiscount || '0') > 0;
              const hasLoyaltyDiscount = parseFloat(order.loyaltyDiscount || '0') > 0;

              if (hasOrderDiscount || hasItemDiscounts || hasCouponDiscount || hasLoyaltyDiscount) {
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
                if (hasCouponDiscount) originalTotal += parseFloat(order.couponDiscount);
                if (hasLoyaltyDiscount) originalTotal += parseFloat(order.loyaltyDiscount);
                
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
                    {(hasOrderDiscount || hasItemDiscounts) && (
                      <div className="text-xs text-red-600 font-medium">
                        {adminT('orders.discountApplied')}
                      </div>
                    )}
                    {hasCouponDiscount && (
                      <div className="text-xs text-green-700 font-medium">
                        🏷️ {order.couponCode} -{formatCurrency(parseFloat(order.couponDiscount))}
                      </div>
                    )}
                    {hasLoyaltyDiscount && (
                      <div className="text-xs text-blue-700 font-medium">
                        ⭐ -{formatCurrency(parseFloat(order.loyaltyDiscount))}
                      </div>
                    )}
                    {(() => {
                      try {
                        const dd = typeof order.discountDetails === 'string'
                          ? JSON.parse(order.discountDetails)
                          : order.discountDetails;
                        if (!dd) return null;
                        const volumeAmt = dd.volume?.discountAmount;
                        const giftName = dd.gift?.productName;
                        return (
                          <>
                            {volumeAmt > 0 && (
                              <div className="text-xs text-orange-600 font-medium">
                                📦 -{formatCurrency(volumeAmt)}
                              </div>
                            )}
                            {giftName && (
                              <div className="text-xs text-purple-600 font-medium">
                                🎁 {giftName}
                              </div>
                            )}
                          </>
                        );
                      } catch { return null; }
                    })()}
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
                {formatDeliveryTimeRange(order.deliveryTime, commonT)}
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
                  <span>{(() => {
                    const lang = localStorage.getItem('language') || 'ru';
                    const methods: any[] = Array.isArray(cardStoreSettings?.paymentMethods) ? (cardStoreSettings.paymentMethods as any[]) : [];
                    const found = methods.find((m: any) => m.name === order.paymentMethod || m.name_en === order.paymentMethod || m.name_he === order.paymentMethod || m.name_ar === order.paymentMethod);
                    if (!found) return order.paymentMethod;
                    const k = lang === 'en' ? 'name_en' : lang === 'he' ? 'name_he' : lang === 'ar' ? 'name_ar' : 'name';
                    return found[k] || found.name || order.paymentMethod;
                  })()}</span>
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
                // Prevent automatic close when cancelling
                if (newStatus === 'cancelled') {
                  setTimeout(() => {
                    onCancelOrder(order.id);
                  }, 100); // Small delay to let Select close properly first
                } else {
                  onStatusChange({ orderId: order.id, status: newStatus });
                }
              }}
            >
              <SelectTrigger 
                className="w-32 h-8 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
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
});

// OrderEditForm component
function OrderEditForm({ order, onClose, onSave, searchPlaceholder, adminT, tCommon, isRTL, isAdmin, branchesEnabled }: { order: any, onClose: () => void, onSave: () => void, searchPlaceholder: string, adminT: (key: string) => string, tCommon: (key: string) => string, isRTL: boolean, isAdmin?: boolean, branchesEnabled?: boolean }) {
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: adminBranches = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/branches'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!branchesEnabled,
  });

  const { data: barcodeConfig } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/barcode/config'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: loyaltyCtx } = useQuery<any>({
    queryKey: ['/api/loyalty/context'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Generate time slots based on store working hours for this component
  const getFormTimeSlots = (selectedDate = '', workingHours: any = {}, weekStartDay = 'monday', deliveryHours?: any) => {
    if (!selectedDate) return [];
    
    const date = new Date(selectedDate + 'T00:00:00');
    // Fixed Sunday-first mapping: date.getDay() always returns 0=Sun…6=Sat
    const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = DAY_NAMES[date.getDay()];

    // Determine effective schedule: deliveryHours override > workingHours fallback
    const deliveryDayValue = deliveryHours?.[dayName];
    const daySchedule = (deliveryDayValue != null) ? deliveryDayValue : workingHours[dayName];

    if (!daySchedule || daySchedule.trim() === '' || 
        daySchedule.toLowerCase().includes('закрыто') || 
        daySchedule.toLowerCase().includes('closed') ||
        daySchedule.toLowerCase().includes('выходной')) {
      return [{
        value: 'closed',
        label: 'Closed'
      }];
    }
    
    // Parse schedule (e.g., "09:00-18:00" or "09:00-14:00, 16:00-20:00")
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

  const localizedPaymentMethod = (() => {
    if (!order.paymentMethod) return '';
    const lang = i18n.language || localStorage.getItem('language') || 'ru';
    const pmethods: any[] = Array.isArray(storeSettings?.paymentMethods) ? (storeSettings.paymentMethods as any[]) : [];
    const pmFound = pmethods.find((m: any) => m.name === order.paymentMethod || m.name_en === order.paymentMethod || m.name_he === order.paymentMethod || m.name_ar === order.paymentMethod);
    if (!pmFound) return order.paymentMethod as string;
    const langToKey = (l: string) => l === 'en' ? 'name_en' : l === 'he' ? 'name_he' : l === 'ar' ? 'name_ar' : 'name';
    const langOrder: string[] = Array.isArray(storeSettings?.languageOrder) ? (storeSettings.languageOrder as string[]) : ['ru', 'en', 'he', 'ar'];
    // Try current UI language first, then fallback through languageOrder (default lang is always first)
    return (pmFound[langToKey(lang)] || langOrder.reduce((acc: string, l: string) => acc || (pmFound[langToKey(l)] as string) || '', '') || order.paymentMethod) as string;
  })();

  const [showAddItem, setShowAddItem] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [editedOrderItems, setEditedOrderItems] = useState(order.items || []);

  // Derived subtotal excluding the gift item (gift always has totalPrice=0, but explicit exclusion is safer)
  const nonGiftSubtotal = useMemo(() => {
    if (!order.giftProductId) return 0;
    return editedOrderItems
      .filter((item: any) => item.productId !== order.giftProductId)
      .reduce((sum: number, item: any) => sum + (parseFloat(String(item.totalPrice)) || 0), 0);
  }, [editedOrderItems, order.giftProductId]);

  // Auto-remove / re-add gift item when subtotal crosses the gift threshold.
  // Depends on nonGiftSubtotal scalar, not the array — fires only on real total changes.
  // Returns prev unchanged when no action needed so React bails out (no re-render, no loop).
  useEffect(() => {
    if (!order.giftProductId || !loyaltyCtx?.giftEnabled) return;
    const threshold = parseFloat(loyaltyCtx?.giftMinOrderAmount || '0');
    if (!threshold || isNaN(threshold)) return;
    setEditedOrderItems((prev: any[]) => {
      const hasGiftItem = prev.some((item: any) => item.productId === order.giftProductId);
      if (nonGiftSubtotal < threshold && hasGiftItem) {
        return prev.filter((item: any) => item.productId !== order.giftProductId);
      } else if (nonGiftSubtotal >= threshold && !hasGiftItem) {
        const giftQty = loyaltyCtx?.giftProductQuantity ?? 1;
        const giftProduct = loyaltyCtx?.giftProduct;
        return [...prev, {
          productId: order.giftProductId,
          quantity: giftQty,
          pricePerKg: '0',
          totalPrice: '0',
          product: giftProduct ? { name: giftProduct.name, unit: giftProduct.unit } : null,
        }];
      }
      return prev;
    });
  }, [nonGiftSubtotal, order.giftProductId, loyaltyCtx?.giftEnabled, loyaltyCtx?.giftMinOrderAmount]);

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

  // Convert old delivery time values to new format
  const normalizeDeliveryTime = (time: string) => {
    if (time === 'morning') return 'half_day_first';
    if (time === 'afternoon') return 'half_day_second';
    // Normalize range format "10:00 - 12:00" → "10:00" (start time only)
    if (time.includes(' - ')) return time.split(' - ')[0];
    return time;
  };

  const [editedOrder, setEditedOrder] = useState({
    customerPhone: order.customerPhone || order.guestPhone || '',
    deliveryAddress: order.deliveryAddress || '',
    deliveryDate: order.deliveryDate || '',
    deliveryTime: normalizeDeliveryTime(order.deliveryTime || ''),
    status: order.status || 'pending',
    notes: cleanNotes(order.customerNotes || ''),
    branchId: order.branchId || null,
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
          
          // Calculate base price based on product unit (same logic as updateItemQuantity)
          let basePrice;
          const unit = item.product?.unit;
          
          if (item.product.pricePerKg && (unit === 'gram' || unit === '100gram')) {
            // If price is per kg but quantity is in grams, convert to kg for calculation
            basePrice = (quantity / 1000) * unitPrice;
          } else if (unit === '100g' || unit === '100ml' || unit === '100gram') {
            // For 100g/100ml products, price is per 100 units, quantity is in actual units (grams/ml)
            basePrice = unitPrice * (quantity / 100);
          } else {
            // For piece and kg products, direct multiplication
            basePrice = quantity * unitPrice;
          }
          
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
      case 'portion': return `${qty} ${adminT('products.units.portion')}`;
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

  // Returns the effective total base price for an order item at a given quantity,
  // applying the product's own special-offer discount (discountType/discountValue) when present.
  // This ensures admin subtotals and quantity edits operate on the price the customer actually pays.
  const getEffectiveProductBasePrice = (item: any, quantity: number): number => {
    const unitPrice = parseFloat(item.pricePerUnit || item.pricePerKg || 0);
    const unit = item.product?.unit;

    // Apply product's own special-offer discount to unit price first
    let effectiveUnitPrice = unitPrice;
    const product = item.product;
    if (product?.isSpecialOffer && product.discountType && product.discountValue) {
      const dv = parseFloat(String(product.discountValue));
      if (!isNaN(dv)) {
        if (product.discountType === 'percentage') {
          effectiveUnitPrice = Math.max(0, unitPrice * (1 - dv / 100));
        } else if (product.discountType === 'fixed') {
          effectiveUnitPrice = Math.max(0, unitPrice - dv);
        }
      }
    }

    // Compute total using the same unit-conversion logic as before
    if (product?.pricePerKg && (unit === 'gram' || unit === '100gram')) {
      return (quantity / 1000) * effectiveUnitPrice;
    } else if (unit === '100g' || unit === '100ml' || unit === '100gram') {
      return effectiveUnitPrice * (quantity / 100);
    } else {
      return quantity * effectiveUnitPrice;
    }
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    const updatedItems = [...editedOrderItems];
    const item = updatedItems[index];

    const basePrice = getEffectiveProductBasePrice(item, newQuantity);

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
    
    // Recalculate item price using effective product price (with product's own discount applied)
    const updatedItems = [...editedOrderItems];
    const item = updatedItems[index];
    const quantity = parseFloat(item.quantity) || 0;
    const basePrice = getEffectiveProductBasePrice(item, quantity);
    
    let finalPrice = basePrice;
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        finalPrice = basePrice * (1 - discountValue / 100);
      } else {
        finalPrice = Math.max(0, basePrice - discountValue);
      }
    }
    
    updatedItems[index] = { ...item, totalPrice: finalPrice };
    setEditedOrderItems(updatedItems);
  };

  const calculateSubtotal = () => {
    // Use item.totalPrice directly — it already reflects the product's own discount
    // and any admin item-level discount applied via applyItemDiscount.
    return editedOrderItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.totalPrice) || 0);
    }, 0);
  };

  const calculateOrderDiscount = (subtotal: number) => {
    if (orderDiscount.value === 0) return 0;
    
    if (orderDiscount.type === 'percentage') {
      return subtotal * (orderDiscount.value / 100);
    } else {
      return Math.min(orderDiscount.value, subtotal);
    }
  };

  // Calculate correct delivery fee based on store settings and order subtotal
  const calculateCorrectDeliveryFee = () => {
    const subtotal = calculateSubtotal();
    const deliveryFee = parseFloat(storeSettings?.deliveryFee || "15.00");
    const freeDeliveryRaw = storeSettings?.freeDeliveryFrom;
    const freeDeliveryThreshold = (freeDeliveryRaw != null && String(freeDeliveryRaw).trim() !== "") 
      ? parseFloat(String(freeDeliveryRaw)) 
      : null;
    
    // If no free delivery threshold is set or it's empty/invalid, always charge delivery fee
    if (!freeDeliveryThreshold || isNaN(freeDeliveryThreshold) || freeDeliveryThreshold <= 0) {
      return deliveryFee;
    }
    return subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
  };

  const calculateFinalTotal = () => {
    let subtotal;
    
    // Use manual price override if enabled, otherwise calculate from items
    if (manualPriceOverride.enabled && manualPriceOverride.value > 0) {
      subtotal = manualPriceOverride.value;
    } else {
      subtotal = calculateSubtotal();
      const discount = calculateOrderDiscount(subtotal);
      const couponDiscount = parseFloat(order.couponDiscount || '0');
      const loyaltyDiscount = parseFloat(order.loyaltyDiscount || '0');
      subtotal = subtotal - discount - couponDiscount - loyaltyDiscount;
    }
    
    const deliveryFee = calculateCorrectDeliveryFee();
    return Math.max(0, subtotal + deliveryFee);
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

  // Get all products for barcode scanner
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    select: (data: any) => data || []
  });

  // Handlers for barcode scanner
  const handleUpdateItemFromBarcode = (productId: number, newWeight: number) => {
    const itemIndex = editedOrderItems.findIndex((item: any) => item.productId === productId);
    if (itemIndex !== -1) {
      updateItemQuantity(itemIndex, newWeight);
    }
  };

  const handleAddItemFromBarcode = (product: any, weight: number) => {
    addItem(product, weight);
  };

  const handlePrint = () => {
    const currentLang = i18n.language as SupportedLanguage;
    const isRTLPrint = currentLang === 'he' || currentLang === 'ar';
    const storeName = storeSettings?.storeName || 'Store';
    const currency = '₪';
    
    const statusLabels: Record<string, Record<string, string>> = {
      pending: { ru: 'Ожидает', en: 'Pending', he: 'ממתין', ar: 'قيد الانتظار' },
      confirmed: { ru: 'Подтвержден', en: 'Confirmed', he: 'מאושר', ar: 'مؤكد' },
      preparing: { ru: 'Готовится', en: 'Preparing', he: 'בהכנה', ar: 'يتم التحضير' },
      ready: { ru: 'Готов', en: 'Ready', he: 'מוכן', ar: 'جاهز' },
      delivered: { ru: 'Доставлен', en: 'Delivered', he: 'נמסר', ar: 'تم التسليم' },
      cancelled: { ru: 'Отменен', en: 'Cancelled', he: 'בוטל', ar: 'ملغي' },
    };

    const labels: Record<string, Record<string, string>> = {
      order: { ru: 'Заказ', en: 'Order', he: 'הזמנה', ar: 'طلب' },
      customer: { ru: 'Клиент', en: 'Customer', he: 'לקוח', ar: 'العميل' },
      phone: { ru: 'Телефон', en: 'Phone', he: 'טלפון', ar: 'الهاتف' },
      address: { ru: 'Адрес', en: 'Address', he: 'כתובת', ar: 'العنوان' },
      deliveryDate: { ru: 'Дата доставки', en: 'Delivery Date', he: 'תאריך משלוח', ar: 'تاريخ التسليم' },
      deliveryTime: { ru: 'Время доставки', en: 'Delivery Time', he: 'שעת משלוח', ar: 'وقت التسليم' },
      status: { ru: 'Статус', en: 'Status', he: 'סטטוס', ar: 'الحالة' },
      product: { ru: 'Товар', en: 'Product', he: 'מוצר', ar: 'المنتج' },
      qty: { ru: 'Кол-во', en: 'Qty', he: 'כמות', ar: 'الكمية' },
      price: { ru: 'Цена', en: 'Price', he: 'מחיר', ar: 'السعر' },
      check: { ru: '✓', en: '✓', he: '✓', ar: '✓' },
      notes: { ru: 'Заметки', en: 'Notes', he: 'הערות', ar: 'ملاحظات' },
      subtotal: { ru: 'Подитог', en: 'Subtotal', he: 'סיכום ביניים', ar: 'المجموع الفرعي' },
      delivery: { ru: 'Доставка', en: 'Delivery', he: 'משלוח', ar: 'توصيل' },
      discount: { ru: 'Скидка', en: 'Discount', he: 'הנחה', ar: 'خصم' },
      couponDiscount: { ru: 'Купон', en: 'Coupon', he: 'קופון', ar: 'قسيمة' },
      loyaltyDiscount: { ru: 'Пост. клиент', en: 'Loyalty', he: 'לקוח קבוע', ar: 'ولاء' },
      total: { ru: 'Итого', en: 'Total', he: 'סה"כ', ar: 'المجموع' },
      orderNotes: { ru: 'Комментарии к заказу', en: 'Order Notes', he: 'הערות להזמנה', ar: 'ملاحظات الطلب' },
      generalComments: { ru: 'Общие комментарии', en: 'General Comments', he: 'הערות כלליות', ar: 'تعليقات عامة' },
      branch: { ru: 'Филиал', en: 'Branch', he: 'סניף', ar: 'الفرع' },
      payment: { ru: 'Оплата', en: 'Payment', he: 'תשלום', ar: 'الدفع' },
      backToOrder: { ru: '← Назад к заказу', en: '← Back to order', he: '← חזרה להזמנה', ar: '← العودة للطلب' },
      printOrder: { ru: 'Распечатать', en: 'Print', he: 'הדפסה', ar: 'طباعة' },
    };

    const l = (key: string) => labels[key]?.[currentLang] || labels[key]?.['en'] || key;
    const getStatusLabel = (s: string) => statusLabels[s]?.[currentLang] || statusLabels[s]?.['en'] || s;

    const subtotal = calculateSubtotal();
    const discountAmount = calculateOrderDiscount(subtotal);
    const deliveryFee = calculateCorrectDeliveryFee();
    const finalTotal = calculateFinalTotal();

    const itemsRows = editedOrderItems.map((item: any, index: number) => {
      const productName = getLocalizedField(item.product, 'name', currentLang) || item.product?.name || `Product #${item.productId}`;
      const quantity = item.quantity;
      const unit = item.product?.unit || 'piece';
      const unitDisplay = getUnitDisplay(unit, quantity);
      const price = parseFloat(item.totalPrice || 0).toFixed(2);
      const hasDiscount = itemDiscounts[index] && itemDiscounts[index].value > 0;
      
      return `<tr>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;width:40px;">
          <div style="width:18px;height:18px;border:2px solid #333;display:inline-block;"></div>
        </td>
        <td style="padding:6px 8px;border:1px solid #ccc;">${productName}${hasDiscount ? ' <span style="color:#e53e3e;font-size:11px;">(' + l('discount') + ')</span>' : ''}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;white-space:nowrap;">${unitDisplay}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;">${price}${currency}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;width:120px;">&nbsp;</td>
      </tr>`;
    }).join('');

    // Remove any existing print overlay and clean up its popstate listener
    const existingOverlay = document.getElementById('order-print-overlay');
    if (existingOverlay) {
      const existingHandler = (existingOverlay as any)._popStateHandler;
      if (existingHandler) window.removeEventListener('popstate', existingHandler);
      existingOverlay.remove();
      // Also pop the history entry that was pushed for the old overlay
      suppressedHistoryBack();
    }
    document.getElementById('order-print-style')?.remove();

    const S = {
      wrap:    `font-family:Arial,sans-serif;font-size:13px;color:#333;direction:${isRTLPrint ? 'rtl' : 'ltr'};`,
      hdr:     `text-align:center;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #333;`,
      hdrH1:   `font-size:18px;margin:4px 0 0;padding:0;`,
      hdrSub:  `font-size:14px;color:#666;margin:0;padding:0;`,
      infoTbl: `width:100%;border-collapse:collapse;margin-bottom:15px;font-size:12px;`,
      infoTd:  `padding:3px 6px;vertical-align:top;`,
      label:   `font-weight:bold;white-space:nowrap;padding:3px 10px 3px 6px;vertical-align:top;`,
      prodTbl: `width:100%;border-collapse:collapse;margin-bottom:15px;`,
      th:      `padding:6px 8px;border:1px solid #ccc;background:#f5f5f5;font-size:12px;text-align:${isRTLPrint ? 'right' : 'left'};`,
      td:      `padding:6px 8px;border:1px solid #ccc;`,
      totWrap: `margin-bottom:15px;`,
      totRow:  `display:flex;justify-content:space-between;padding:3px 0;font-size:12px;`,
      totFin:  `display:flex;justify-content:space-between;padding:6px 0 3px;font-size:15px;font-weight:bold;border-top:2px solid #333;margin-top:4px;`,
      notes:   `background:#f9f9f9;padding:8px;margin-bottom:10px;border:1px solid #ddd;font-size:12px;`,
      comments:`border:1px solid #ccc;padding:10px;margin-bottom:10px;min-height:60px;`,
      cmtH3:   `font-size:13px;margin:0 0 6px;padding:0 0 4px;border-bottom:1px solid #eee;`,
    };

    const customerName = order.user
      ? (order.user.firstName && order.user.lastName
          ? `${order.user.firstName} ${order.user.lastName}`
          : order.user.email || '')
      : order.guestName || '';

    const makeInfoRows = (rows: string[][]) =>
      rows.filter(([, v]) => v)
          .map(([k, v]) => `<tr>
            <td class="info-td-no-border" style="${S.label}">${k}:</td>
            <td class="info-td-no-border" style="${S.infoTd}word-wrap:break-word;overflow-wrap:break-word;">${v}</td>
          </tr>`)
          .join('');

    const printBranch = order.branchId
      ? adminBranches.find((br: any) => br.id === order.branchId)
      : null;
    const printBranchName = printBranch
      ? (getLocalizedField(printBranch, 'name', currentLang) || printBranch.name || '')
      : '';

    const localizedPaymentForPrint = (() => {
      if (!order.paymentMethod) return '';
      const pmethods: any[] = Array.isArray(storeSettings?.paymentMethods) ? (storeSettings.paymentMethods as any[]) : [];
      const pmFound = pmethods.find((m: any) => m.name === order.paymentMethod || m.name_en === order.paymentMethod || m.name_he === order.paymentMethod || m.name_ar === order.paymentMethod);
      if (!pmFound) return order.paymentMethod;
      const langToKeyP = (l: string) => l === 'en' ? 'name_en' : l === 'he' ? 'name_he' : l === 'ar' ? 'name_ar' : 'name';
      const langOrderP: string[] = Array.isArray(storeSettings?.languageOrder) ? (storeSettings.languageOrder as string[]) : ['ru', 'en', 'he', 'ar'];
      return (pmFound[langToKeyP(currentLang)] || langOrderP.reduce((acc: string, l: string) => acc || (pmFound[langToKeyP(l)] as string) || '', '') || order.paymentMethod) as string;
    })();

    const allInfoRows = makeInfoRows([
      [l('customer'),     customerName],
      [l('phone'),        editedOrder.customerPhone || order.guestPhone || ''],
      [l('address'),      editedOrder.deliveryAddress || ''],
      [l('deliveryDate'), editedOrder.deliveryDate || ''],
      [l('deliveryTime'), editedOrder.deliveryTime ? formatDeliveryTimeRange(editedOrder.deliveryTime, tCommon) : ''],
      [l('payment'),      localizedPaymentForPrint],
      [l('status'),       getStatusLabel(editedOrder.status)],
      [l('branch'),       printBranchName],
    ]);

    // Two-column info rows for iOS print (window.print() path)
    const allInfoData = [
      [l('customer'),     customerName],
      [l('phone'),        editedOrder.customerPhone || order.guestPhone || ''],
      [l('address'),      editedOrder.deliveryAddress || ''],
      [l('deliveryDate'), editedOrder.deliveryDate || ''],
      [l('deliveryTime'), editedOrder.deliveryTime ? formatDeliveryTimeRange(editedOrder.deliveryTime, tCommon) : ''],
      [l('payment'),      localizedPaymentForPrint],
      [l('status'),       getStatusLabel(editedOrder.status)],
      [l('branch'),       printBranchName],
    ].filter(([, v]) => v);
    const iosLeftRows  = makeInfoRows(allInfoData.slice(0, Math.ceil(allInfoData.length / 2)));
    const iosRightRows = makeInfoRows(allInfoData.slice(Math.ceil(allInfoData.length / 2)));

    const contentHtml = `
  <div style="${S.wrap}" id="order-print-content">
    <div style="${S.hdr}">
      <p style="${S.hdrSub}">${storeName}</p>
      <h1 style="${S.hdrH1}">${l('order')} #${order.id}</h1>
    </div>

    <!-- SCREEN: single-column info (mobile-friendly) -->
    <div class="screen-info">
      <table style="${S.infoTbl}"><tbody>${allInfoRows}</tbody></table>
    </div>

    <!-- PRINT (iOS window.print()): two-column info — hidden on screen -->
    <div class="print-info" style="display:none;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:15px;table-layout:fixed;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-${isRTLPrint ? 'left' : 'right'}:10px;">
            <table style="${S.infoTbl}"><tbody>${iosLeftRows}</tbody></table>
          </td>
          <td style="width:50%;vertical-align:top;padding-${isRTLPrint ? 'right' : 'left'}:10px;border-${isRTLPrint ? 'right' : 'left'}:1px solid #e5e7eb;">
            <table style="${S.infoTbl}"><tbody>${iosRightRows}</tbody></table>
          </td>
        </tr>
      </table>
    </div>

    <table style="${S.prodTbl}">
      <thead><tr>
        <th style="${S.th}width:40px;text-align:center;">${l('check')}</th>
        <th style="${S.th}">${l('product')}</th>
        <th style="${S.th}text-align:center;">${l('qty')}</th>
        <th style="${S.th}text-align:center;">${l('price')}</th>
        <th style="${S.th}width:120px;">${l('notes')}</th>
      </tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div style="${S.totWrap}">
      <div style="${S.totRow}"><span>${l('subtotal')}:</span><span>${subtotal.toFixed(2)}${currency}</span></div>
      ${discountAmount > 0 ? `<div style="${S.totRow}color:#e53e3e;"><span>${l('discount')}:</span><span>-${discountAmount.toFixed(2)}${currency}</span></div>` : ''}
      ${parseFloat(order.couponDiscount || '0') > 0 ? `<div style="${S.totRow}color:#e53e3e;"><span>${l('couponDiscount')}${order.couponCode ? ' (' + order.couponCode + ')' : ''}:</span><span>-${parseFloat(order.couponDiscount).toFixed(2)}${currency}</span></div>` : ''}
      ${parseFloat(order.loyaltyDiscount || '0') > 0 ? `<div style="${S.totRow}color:#e53e3e;"><span>${l('loyaltyDiscount')}:</span><span>-${parseFloat(order.loyaltyDiscount).toFixed(2)}${currency}</span></div>` : ''}
      ${deliveryFee > 0 ? `<div style="${S.totRow}"><span>${l('delivery')}:</span><span>${deliveryFee.toFixed(2)}${currency}</span></div>` : ''}
      <div style="${S.totFin}"><span>${l('total')}:</span><span>${finalTotal.toFixed(2)}${currency}</span></div>
    </div>

    ${editedOrder.notes ? `<div style="${S.notes}"><strong>${l('orderNotes')}:</strong> ${editedOrder.notes}</div>` : ''}

    <div style="${S.comments}">
      <h3 style="${S.cmtH3}">${l('generalComments')}</h3>
    </div>
  </div>`;

    // Create full-screen overlay — works on iOS/Android without popup
    const overlay = document.createElement('div');
    overlay.id = 'order-print-overlay';
    overlay.setAttribute('dir', isRTLPrint ? 'rtl' : 'ltr');
    overlay.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:#fff', 'z-index:99999', 'overflow-y:auto',
      'font-family:Arial,sans-serif', 'font-size:13px', 'color:#333',
      `direction:${isRTLPrint ? 'rtl' : 'ltr'}`,
    ].join(';');

    overlay.innerHTML = `
      <div id="order-print-bar" style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;background:#fff;position:sticky;top:0;z-index:1;">
        <button id="print-close-btn" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;cursor:pointer;font-size:13px;color:#374151;font-family:Arial,sans-serif;">${l('backToOrder')}</button>
        <button id="print-do-btn" style="display:inline-flex;align-items:center;gap:8px;padding:8px 20px;background:#f97316;border:none;border-radius:8px;cursor:pointer;font-size:13px;color:#fff;font-family:Arial,sans-serif;font-weight:600;">🖨 ${l('printOrder')}</button>
      </div>
      ${contentHtml}
    `;

    document.body.appendChild(overlay);

    // Push a history entry so the Android/iOS back button closes the overlay
    // instead of navigating away from the admin page
    window.history.pushState({ printOverlay: true }, '', window.location.href);

    const dispatchReopen = () => {
      window.dispatchEvent(new CustomEvent('edahouse:reopen-order-dialog'));
    };

    const onPopState = () => {
      // Ignore popstate events generated programmatically by suppressedHistoryBack()
      if (isPopstateSuppressed()) return;
      // Hardware/gesture back button pressed — browser already went back,
      // just close the overlay (no extra history.back() needed)
      document.getElementById('order-print-style')?.remove();
      overlay.remove();
      window.removeEventListener('popstate', onPopState);
      dispatchReopen();
    };

    window.addEventListener('popstate', onPopState);
    // Store handler reference on the element for cleanup if handlePrint is called again
    (overlay as any)._popStateHandler = onPopState;

    const closeOverlay = () => {
      // "← Back to Order" button clicked: remove listener first so the
      // upcoming history.back() doesn't re-trigger onPopState
      document.getElementById('order-print-style')?.remove();
      window.removeEventListener('popstate', onPopState);
      overlay.remove();
      // Pop the extra history entry we pushed when the overlay opened
      suppressedHistoryBack();
      dispatchReopen();
    };

    const closeBtnEl = document.getElementById('print-close-btn');
    const printBtnEl = document.getElementById('print-do-btn');
    // Build a standalone print document (two-column info layout, full CSS embedded).
    // Split all info rows into two halves for two-column layout on paper.
    const infoData = [
      [l('customer'),     customerName],
      [l('phone'),        editedOrder.customerPhone || order.guestPhone || ''],
      [l('address'),      editedOrder.deliveryAddress || ''],
      [l('deliveryDate'), editedOrder.deliveryDate || ''],
      [l('deliveryTime'), editedOrder.deliveryTime ? formatDeliveryTimeRange(editedOrder.deliveryTime, tCommon) : ''],
      [l('payment'),      localizedPaymentForPrint],
      [l('status'),       getStatusLabel(editedOrder.status)],
      [l('branch'),       printBranchName],
    ].filter(([, v]) => v);

    const half = Math.ceil(infoData.length / 2);
    const leftData  = infoData.slice(0, half);
    const rightData = infoData.slice(half);

    const pLbl = `font-weight:bold;white-space:nowrap;padding:3px 8px 3px 4px;vertical-align:top;font-size:12px;`;
    const pVal = `padding:3px 4px;vertical-align:top;font-size:12px;word-wrap:break-word;overflow-wrap:break-word;`;

    const mkPrintRows = (rows: string[][]) =>
      rows.map(([k, v]) => `<tr><td style="${pLbl}">${k}:</td><td style="${pVal}">${v}</td></tr>`).join('');

    const pTh = `padding:6px 8px;border:1px solid #999;background:#f0f0f0;font-size:12px;font-weight:bold;text-align:${isRTLPrint ? 'right' : 'left'};-webkit-print-color-adjust:exact;print-color-adjust:exact;`;
    const pTd = `padding:6px 8px;border:1px solid #ccc;vertical-align:top;font-size:12px;`;

    const printItemsRows = editedOrderItems.map((item: any, index: number) => {
      const productName = getLocalizedField(item.product, 'name', currentLang) || item.product?.name || `Product #${item.productId}`;
      const quantity = item.quantity;
      const unit = item.product?.unit || 'piece';
      const unitDisplay = getUnitDisplay(unit, quantity);
      const price = parseFloat(item.totalPrice || 0).toFixed(2);
      const hasDiscount = itemDiscounts[index] && itemDiscounts[index].value > 0;
      return `<tr>
        <td style="${pTd}text-align:center;width:36px;"><div style="width:16px;height:16px;border:2px solid #333;display:inline-block;"></div></td>
        <td style="${pTd}">${productName}${hasDiscount ? ` <span style="color:#e53e3e;font-size:11px;">(${l('discount')})</span>` : ''}</td>
        <td style="${pTd}text-align:center;">${unitDisplay}</td>
        <td style="${pTd}text-align:center;">${price}${currency}</td>
        <td style="${pTd}width:100px;">&nbsp;</td>
      </tr>`;
    }).join('');

    const printDocHtml = `<!DOCTYPE html>
<html lang="${currentLang}" dir="${isRTLPrint ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <title>${l('order')} #${order.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #333;
           direction: ${isRTLPrint ? 'rtl' : 'ltr'}; padding-top: 56px; }
    .prt-content { padding: 16px; }
    #prt-bar { position: fixed; top: 0; left: 0; right: 0; height: 48px;
               display: flex; align-items: center; gap: 10px;
               padding: 0 14px; background: #f97316; z-index: 10; }
    @page { margin: 1cm; }
    @media print {
      #prt-bar { display: none !important; }
      body { padding-top: 0; }
    }
  </style>
</head>
<body>
  <div id="prt-bar">
    <button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);border-radius:8px;cursor:pointer;font-size:13px;color:#fff;font-family:Arial,sans-serif;">← ${l('backToOrder')}</button>
    <button onclick="window.print()" style="display:inline-flex;align-items:center;gap:6px;padding:7px 18px;background:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#f97316;font-family:Arial,sans-serif;">🖨 ${l('printOrder')}</button>
    <span style="font-size:13px;color:#fff;opacity:0.9;">${l('order')} #${order.id} — ${storeName}</span>
  </div>
  <div class="prt-content">
  <div style="text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #333;">
    <p style="font-size:13px;color:#666;margin:0;">${storeName}</p>
    <h1 style="font-size:18px;margin:4px 0 0;">${l('order')} #${order.id}</h1>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
    <tr>
      <td style="width:50%;vertical-align:top;padding-${isRTLPrint ? 'left' : 'right'}:10px;">
        <table style="width:100%;border-collapse:collapse;"><tbody>${mkPrintRows(leftData)}</tbody></table>
      </td>
      <td style="width:50%;vertical-align:top;padding-${isRTLPrint ? 'right' : 'left'}:10px;border-${isRTLPrint ? 'right' : 'left'}:1px solid #ccc;">
        <table style="width:100%;border-collapse:collapse;"><tbody>${mkPrintRows(rightData)}</tbody></table>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
    <thead><tr>
      <th style="${pTh}width:36px;text-align:center;">${l('check')}</th>
      <th style="${pTh}">${l('product')}</th>
      <th style="${pTh}text-align:center;">${l('qty')}</th>
      <th style="${pTh}text-align:center;">${l('price')}</th>
      <th style="${pTh}width:100px;">${l('notes')}</th>
    </tr></thead>
    <tbody>${printItemsRows}</tbody>
  </table>

  <div style="margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;"><span>${l('subtotal')}:</span><span>${subtotal.toFixed(2)}${currency}</span></div>
    ${discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:#e53e3e;"><span>${l('discount')}:</span><span>-${discountAmount.toFixed(2)}${currency}</span></div>` : ''}
    ${deliveryFee > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;"><span>${l('delivery')}:</span><span>${deliveryFee.toFixed(2)}${currency}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:6px 0 3px;font-size:15px;font-weight:bold;border-top:2px solid #333;margin-top:4px;"><span>${l('total')}:</span><span>${finalTotal.toFixed(2)}${currency}</span></div>
  </div>

  ${editedOrder.notes ? `<div style="background:#f9f9f9;padding:8px;margin-bottom:10px;border:1px solid #ddd;font-size:12px;"><strong>${l('orderNotes')}:</strong> ${editedOrder.notes}</div>` : ''}
  <div style="border:1px solid #ccc;padding:10px;margin-bottom:10px;min-height:60px;">
    <h3 style="font-size:13px;margin:0 0 6px;padding:0 0 4px;border-bottom:1px solid #eee;">${l('generalComments')}</h3>
  </div>
  </div>
</body>
</html>`;

    if (closeBtnEl) closeBtnEl.addEventListener('click', closeOverlay);
    if (printBtnEl) printBtnEl.addEventListener('click', () => {
      // Open the prepared print document in a new window so that on iOS Safari
      // window.print() only sees the order HTML — not the admin page behind it.
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(printDocHtml);
        printWin.document.close();
        let printed = false;
        const doPrint = () => {
          if (printed) return;
          printed = true;
          printWin.focus();
          printWin.print();
        };
        // Primary: wait for full load then print
        printWin.onload = doPrint;
        // Fallback for iOS Safari where onload may not fire on document.write
        setTimeout(doPrint, 900);
      }
      // Close the main-page overlay immediately — the new window is the only UI now.
      // This avoids a double-preview situation where the user must dismiss two screens.
      closeOverlay();
    });
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
              <div className="text-xs text-gray-500">
                {order.user ? adminT('orders.customer') : 'Гость'}
              </div>
              <div className="font-medium text-sm truncate">
                {order.user ? (
                  order.user.firstName && order.user.lastName 
                    ? `${order.user.firstName} ${order.user.lastName}`
                    : order.user.email || "—"
                ) : order.guestName ? (
                  order.guestName
                ) : "Гость"}
                {!order.user && order.guestEmail && (
                  <div className="text-xs text-blue-600">{order.guestEmail}</div>
                )}
              </div>
            </div>
            {branchesEnabled && (isAdmin ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 shadow-sm shrink-0 min-w-[120px]">
                <div className="text-xs text-purple-500 mb-1">{tCommon('branch.selectedBranch')}</div>
                <Select
                  value={editedOrder.branchId ? String(editedOrder.branchId) : 'none'}
                  onValueChange={(v) => setEditedOrder(prev => ({ ...prev, branchId: v === 'none' ? null : parseInt(v) }))}
                >
                  <SelectTrigger className="text-xs h-7 border-purple-300 bg-white text-purple-800 w-full px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000] bg-white">
                    <SelectItem value="none"><span className="text-gray-400">{adminT('branches.noBranch') || '—'}</span></SelectItem>
                    {(adminBranches as any[]).map((br: any) => (
                      <SelectItem key={br.id} value={String(br.id)}>
                        {getLocalizedField(br, 'name', i18n.language as any) || br.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (order.branchId ? (() => {
              const bm = adminBranches.find((br: any) => br.id === (editedOrder.branchId || order.branchId));
              if (!bm) return null;
              const bmName = getLocalizedField(bm, 'name', i18n.language as any) || bm.name;
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 shadow-sm shrink-0">
                  <div className="text-xs text-purple-500">{tCommon('branch.selectedBranch')}</div>
                  <div className="font-medium text-purple-800 text-sm">{bmName}</div>
                </div>
              );
            })() : null))}
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
                <SelectContent className="z-[10000] bg-white">
                  <SelectItem value="pending" className="hover:bg-yellow-50 focus:bg-yellow-50">
                    <span className="text-xs font-medium text-yellow-800">
                      {adminT('orders.status.pending')}
                    </span>
                  </SelectItem>
                  <SelectItem value="confirmed" className="hover:bg-blue-50 focus:bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">
                      {adminT('orders.status.confirmed')}
                    </span>
                  </SelectItem>
                  <SelectItem value="preparing" className="hover:bg-orange-50 focus:bg-orange-50">
                    <span className="text-xs font-medium text-orange-800">
                      {adminT('orders.status.preparing')}
                    </span>
                  </SelectItem>
                  <SelectItem value="ready" className="hover:bg-green-50 focus:bg-green-50">
                    <span className="text-xs font-medium text-green-800">
                      {adminT('orders.status.ready')}
                    </span>
                  </SelectItem>
                  <SelectItem value="delivered" className="hover:bg-gray-50 focus:bg-gray-50">
                    <span className="text-xs font-medium text-gray-800">
                      {adminT('orders.status.delivered')}
                    </span>
                  </SelectItem>
                  <SelectItem value="cancelled" className="hover:bg-red-50 focus:bg-red-50">
                    <span className="text-xs font-medium text-red-800">
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
              <div className="text-xs text-gray-500">
                {order.user ? adminT('orders.customer') : 'Гость'}
              </div>
              <div className="font-medium">
                {order.user ? (
                  order.user.firstName && order.user.lastName 
                    ? `${order.user.firstName} ${order.user.lastName}`
                    : order.user.email || "—"
                ) : order.guestName ? (
                  order.guestName
                ) : "Гость"}
                {!order.user && order.guestEmail && (
                  <div className="text-xs text-blue-600">{order.guestEmail}</div>
                )}
              </div>
            </div>
            {branchesEnabled && (isAdmin ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 shadow-sm min-w-[140px]">
                <div className="text-xs text-purple-500 mb-1">{tCommon('branch.selectedBranch')}</div>
                <Select
                  value={editedOrder.branchId ? String(editedOrder.branchId) : 'none'}
                  onValueChange={(v) => setEditedOrder(prev => ({ ...prev, branchId: v === 'none' ? null : parseInt(v) }))}
                >
                  <SelectTrigger className="text-xs h-7 border-purple-300 bg-white text-purple-800 w-full px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000] bg-white">
                    <SelectItem value="none"><span className="text-gray-400">{adminT('branches.noBranch') || '—'}</span></SelectItem>
                    {(adminBranches as any[]).map((br: any) => (
                      <SelectItem key={br.id} value={String(br.id)}>
                        {getLocalizedField(br, 'name', i18n.language as any) || br.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (editedOrder.branchId ? (() => {
              const b = adminBranches.find((br: any) => br.id === editedOrder.branchId);
              if (!b) return null;
              const bName = getLocalizedField(b, 'name', i18n.language as any) || b.name;
              return (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 shadow-sm">
                  <div className="text-xs text-purple-500">{tCommon('branch.selectedBranch')}</div>
                  <div className="font-medium text-purple-800">{bName}</div>
                </div>
              );
            })() : null))}
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
                  <SelectItem value="pending" className="hover:bg-yellow-50 focus:bg-yellow-50">
                    <span className="text-xs font-medium text-yellow-800">
                      {adminT('orders.status.pending')}
                    </span>
                  </SelectItem>
                  <SelectItem value="confirmed" className="hover:bg-blue-50 focus:bg-blue-50">
                    <span className="text-xs font-medium text-blue-800">
                      {adminT('orders.status.confirmed')}
                    </span>
                  </SelectItem>
                  <SelectItem value="preparing" className="hover:bg-orange-50 focus:bg-orange-50">
                    <span className="text-xs font-medium text-orange-800">
                      {adminT('orders.status.preparing')}
                    </span>
                  </SelectItem>
                  <SelectItem value="ready" className="hover:bg-green-50 focus:bg-green-50">
                    <span className="text-xs font-medium text-green-800">
                      {adminT('orders.status.ready')}
                    </span>
                  </SelectItem>
                  <SelectItem value="delivered" className="hover:bg-gray-50 focus:bg-gray-50">
                    <span className="text-xs font-medium text-gray-800">
                      {adminT('orders.status.delivered')}
                    </span>
                  </SelectItem>
                  <SelectItem value="cancelled" className="hover:bg-red-50 focus:bg-red-50">
                    <span className="text-xs font-medium text-red-800">
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
      <div className="grid grid-cols-1 gap-4">
        


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
                        {editedOrder.deliveryDate ? format(new Date(editedOrder.deliveryDate), "dd.MM.yyyy") : adminT('orders.selectDate')}
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
                  {/* Delivery time based on store settings */}
                  {storeSettingsData?.deliveryTimeMode === 'disabled' ? (
                    <div className="relative flex items-center">
                      <Clock className="absolute left-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={editedOrder.deliveryTime || ""}
                        onChange={(e) => setEditedOrder(prev => ({ ...prev, deliveryTime: e.target.value }))}
                        placeholder={adminT('orders.selectTime') + ' (' + adminT('themes.optional') + ')'}
                        className="pl-8 pr-3 py-1.5 text-sm border border-input rounded-md h-8 w-full bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ) : storeSettingsData?.deliveryTimeMode === 'half_day' ? (
                    <Select
                      value={editedOrder.deliveryTime || ""}
                      onValueChange={(value) => setEditedOrder(prev => ({ ...prev, deliveryTime: value }))}
                    >
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue placeholder={adminT('orders.selectTime')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="half_day_first">{tCommon('checkout.halfDayFirst')}</SelectItem>
                        <SelectItem value="half_day_second">{tCommon('checkout.halfDaySecond')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={editedOrder.deliveryTime || ""}
                      onValueChange={(value) => setEditedOrder(prev => ({ ...prev, deliveryTime: value }))}
                    >
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue placeholder={adminT('orders.selectTime')} />
                      </SelectTrigger>
                      <SelectContent>
                        {getFormTimeSlots(editedOrder.deliveryDate, storeSettingsData?.workingHours, storeSettingsData?.weekStartDay, storeSettingsData?.deliveryHours).map((slot: any) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                      {editedOrder.deliveryDate ? format(new Date(editedOrder.deliveryDate), "dd.MM.yyyy") : adminT('orders.selectDate')}
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
                {/* Delivery time based on store settings */}
                {storeSettingsData?.deliveryTimeMode === 'disabled' ? (
                  <div className="relative flex items-center">
                    <Clock className="absolute left-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={editedOrder.deliveryTime || ""}
                      onChange={(e) => setEditedOrder(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      placeholder={adminT('orders.selectTime') + ' (' + adminT('themes.optional') + ')'}
                      className="pl-8 pr-3 py-1.5 text-sm border border-input rounded-md h-8 w-full bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ) : storeSettingsData?.deliveryTimeMode === 'half_day' ? (
                  <Select
                    value={editedOrder.deliveryTime || ""}
                    onValueChange={(value) => setEditedOrder(prev => ({ ...prev, deliveryTime: value }))}
                  >
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue placeholder={adminT('orders.selectTime')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="half_day_first">{tCommon('checkout.halfDayFirst')}</SelectItem>
                      <SelectItem value="half_day_second">{tCommon('checkout.halfDaySecond')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={editedOrder.deliveryTime || ""}
                    onValueChange={(value) => setEditedOrder(prev => ({ ...prev, deliveryTime: value }))}
                  >
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue placeholder={adminT('orders.selectTime')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getFormTimeSlots(editedOrder.deliveryDate, storeSettingsData?.workingHours, storeSettingsData?.weekStartDay, storeSettingsData?.deliveryHours).map((slot: any) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Payment Method */}
      {order.paymentMethod && localizedPaymentMethod && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
          <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            {adminT('orders.paymentMethod')}
          </span>
          <span className="text-sm font-semibold text-gray-900">{localizedPaymentMethod}</span>
        </div>
      )}

      {/* Order Items - Important section with visual accent */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-4 shadow-sm">
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <h3 className="font-semibold text-green-800 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-green-600" />
            {adminT('orders.orderItems')}
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              size="sm" 
              onClick={() => setShowAddItem(true)}
              className="text-xs bg-primary hover:bg-primary text-white border-primary w-full sm:w-auto"
            >
              <Plus className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {adminT('orders.addProduct')}
            </Button>
            {barcodeConfig?.enabled && (
              <Button 
                size="sm" 
                onClick={() => setShowBarcodeScanner(true)}
                className="text-xs btn-info w-full sm:w-auto"
              >
                <Camera className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {adminT('barcode.scanBarcode')}
              </Button>
            )}
          </div>
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
                    <div className="font-medium">{getLocalizedField(item.product, 'name', i18n.language as SupportedLanguage)}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.productId === order.giftProductId ? (
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 font-medium">
                          🎁 {getUnitDisplay(item.product?.unit, item.quantity)}
                        </div>
                        <span className="text-xs text-green-600">{i18n.language === 'ru' ? 'Кол-во фиксировано' : i18n.language === 'he' ? 'כמות קבועה' : i18n.language === 'ar' ? 'الكمية ثابتة' : 'Fixed qty'}</span>
                      </div>
                    ) : (
                    <div className={`flex flex-col gap-1 ${isRTL ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const step = item.product?.unit === "piece" || item.product?.unit === "portion" ? 1 : 
                                       item.product?.unit === "kg" ? 0.1 : 
                                       item.product?.unit === "100g" || item.product?.unit === "100ml" ? 50 : 50;
                            updateItemQuantity(index, Math.max(1, parseFloat(item.quantity) - step));
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          step={item.product?.unit === "piece" || item.product?.unit === "portion" ? "1" : 
                               item.product?.unit === "kg" ? "0.1" : 
                               item.product?.unit === "100g" || item.product?.unit === "100ml" ? "50" : "50"}
                          min="1"
                          value={Math.round(parseFloat(item.quantity))}
                          onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                          className={`w-20 h-6 text-xs text-center mx-1 ${isRTL ? 'text-right' : ''}`}
                          dir="ltr"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const step = item.product?.unit === "piece" || item.product?.unit === "portion" ? 1 : 
                                       item.product?.unit === "kg" ? 0.1 : 
                                       item.product?.unit === "100g" || item.product?.unit === "100ml" ? 50 : 50;
                            updateItemQuantity(index, parseFloat(item.quantity) + step);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-gray-500 text-center w-full" dir="ltr">
                        {getUnitDisplay(item.product?.unit, item.quantity)}
                      </span>
                    </div>
                    )}
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
              
              {/* Quantity Controls Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  {item.productId === order.giftProductId ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-sm text-green-700 font-medium">
                        🎁 {getUnitDisplay(item.product?.unit, item.quantity)}
                      </div>
                      <span className="text-xs text-green-600">{i18n.language === 'ru' ? 'Кол-во фиксировано' : i18n.language === 'he' ? 'כמות קבועה' : i18n.language === 'ar' ? 'الكمية ثابتة' : 'Fixed qty'}</span>
                    </div>
                  ) : (
                  <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        const step = item.product?.unit === "piece" || item.product?.unit === "portion" ? 1 : 
                                   item.product?.unit === "kg" ? 0.1 : 
                                   item.product?.unit === "100g" || item.product?.unit === "100ml" ? 50 : 50;
                        updateItemQuantity(index, Math.max(1, parseFloat(item.quantity) - step));
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      step={item.product?.unit === "piece" || item.product?.unit === "portion" ? "1" : 
                           item.product?.unit === "kg" ? "0.1" : 
                           item.product?.unit === "100g" || item.product?.unit === "100ml" ? "50" : "50"}
                      min="1"
                      value={Math.round(parseFloat(item.quantity))}
                      onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                      className={`h-7 text-sm w-16 text-center mx-1 ${isRTL ? 'text-right' : ''}`}
                      dir="ltr"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        const step = item.product?.unit === "piece" || item.product?.unit === "portion" ? 1 : 
                                   item.product?.unit === "kg" ? 0.1 : 
                                   item.product?.unit === "100g" || item.product?.unit === "100ml" ? 50 : 50;
                        updateItemQuantity(index, parseFloat(item.quantity) + step);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  )}
                  <span className="text-xs text-gray-500 text-center w-full" dir="ltr">
                    {item.productId !== order.giftProductId && getUnitDisplay(item.product?.unit, item.quantity)}
                  </span>
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

            {parseFloat(order.couponDiscount || '0') > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{tCommon('profile.couponDiscount')}{order.couponCode ? ` (${order.couponCode})` : ''}:</span>
                <span>-{formatCurrency(parseFloat(order.couponDiscount))}</span>
              </div>
            )}
            {parseFloat(order.loyaltyDiscount || '0') > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{tCommon('profile.loyaltyDiscount')}:</span>
                <span>-{formatCurrency(parseFloat(order.loyaltyDiscount))}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>{adminT('orders.deliveryFee')}:</span>
              <span>
                {(() => {
                  const correctDeliveryFee = calculateCorrectDeliveryFee();
                  return correctDeliveryFee === 0 ? (
                    <span className="text-green-600 font-medium">{adminT('common.free')}</span>
                  ) : (
                    formatCurrency(correctDeliveryFee)
                  );
                })()}
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
            
            {localizedPaymentMethod && (
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                <span>{adminT('orders.paymentMethod')}:</span>
                <span>{localizedPaymentMethod}</span>
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
          currentOrderItems={editedOrderItems}
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

      {/* Barcode Scanner */}
      <BarcodeScanner 
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        orderItems={editedOrderItems}
        onUpdateItem={handleUpdateItemFromBarcode}
        onAddItem={handleAddItemFromBarcode}
        allProducts={allProducts}
      />

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          {adminT('actions.cancel')}
        </Button>
        <Button
          variant="outline"
          onClick={handlePrint}
          title={adminT('orders.print') || 'Print'}
          className="px-3"
        >
          <Printer className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">{adminT('orders.print') || 'Print'}</span>
        </Button>
        <Button 
          onClick={handleSave}
          disabled={updateOrderMutation.isPending}
          variant="success"
          className="whitespace-nowrap text-sm"
        >
          {updateOrderMutation.isPending ? adminT('common.saving') : adminT('common.saveChanges')}
        </Button>
      </div>
    </div>
  );
}

// Add Item Dialog Component
function AddItemDialog({ onClose, onAdd, currentOrderItems, searchPlaceholder, adminT, isRTL }: { onClose: () => void, onAdd: (product: any, quantity: number) => void, currentOrderItems: any[], searchPlaceholder: string, adminT: (key: string) => string, isRTL: boolean }) {
  const { i18n, t } = useTranslation('common');
  
  function getUnitDisplay(unit: string) {
    switch (unit) {
      case 'piece': return adminT('products.units.piece');
      case 'portion': return adminT('products.units.portion');
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
    if (product.pricePerKg && product.unit !== 'piece' && product.unit !== 'portion') {
      // If price is per kg, default to 100g (but not for piece or portion units)
      setQuantity(100);
    } else if (product.unit === 'piece' || product.unit === 'portion' || product.pricePerPiece) {
      // If it's per piece or portion, default to 1
      setQuantity(1);
    } else {
      // Fallback based on unit name
      switch (product.unit) {
        case 'piece':
        case 'portion':
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
    select: (data: any) => {
      // Get IDs of products already in the order
      const existingProductIds = currentOrderItems.map((item: any) => item.productId);
      
      return data?.filter((product: any) => {
        // Filter by search query
        const matchesSearch = getLocalizedField(product, 'name', i18n.language as SupportedLanguage)
          .toLowerCase().includes(searchQuery.toLowerCase());
        
        // Filter out products already in the order
        const notInOrder = !existingProductIds.includes(product.id);
        
        return matchesSearch && notInOrder;
      });
    }
  });

  const handleAdd = () => {
    if (selectedProduct && quantity > 0) {
      onAdd(selectedProduct, quantity);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
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
          {productsResponse && productsResponse.length > 0 ? (
            productsResponse.map((product: any) => (
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
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? t('messages.noSearchResults') : adminT('orders.allProductsInOrder')}
            </div>
          )}
        </div>

        {/* Quantity */}
        {selectedProduct && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {adminT('orders.quantity')} ({getUnitDisplay(selectedProduct.unit)})
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => {
                  const step = selectedProduct.unit === "piece" || selectedProduct.unit === "portion" ? 1 : 
                             selectedProduct.unit === "kg" ? 0.1 : 
                             selectedProduct.unit === "100g" || selectedProduct.unit === "100ml" ? 50 : 50;
                  setQuantity(Math.max(step, quantity - step));
                }}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                step={selectedProduct.unit === "piece" || selectedProduct.unit === "portion" ? "1" : 
                     selectedProduct.unit === "kg" ? "0.1" : 
                     selectedProduct.unit === "100g" || selectedProduct.unit === "100ml" ? "50" : "50"}
                min={selectedProduct.unit === "piece" || selectedProduct.unit === "portion" ? "1" : 
                     selectedProduct.unit === "kg" ? "0.1" : "50"}
                value={quantity}
                onChange={(e) => {
                  const minValue = selectedProduct.unit === "piece" || selectedProduct.unit === "portion" ? 1 : 
                                 selectedProduct.unit === "kg" ? 0.1 : 50;
                  setQuantity(parseFloat(e.target.value) || minValue);
                }}
                className="flex-1 text-center"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => {
                  const step = selectedProduct.unit === "piece" || selectedProduct.unit === "portion" ? 1 : 
                             selectedProduct.unit === "kg" ? 0.1 : 
                             selectedProduct.unit === "100g" || selectedProduct.unit === "100ml" ? 50 : 50;
                  setQuantity(quantity + step);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
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
  
  // Calculate base price based on product unit (same logic as updateItemQuantity)
  let basePrice;
  const unit = item.product?.unit;
  
  if (item.product.pricePerKg && (unit === 'gram' || unit === '100gram')) {
    // If price is per kg but quantity is in grams, convert to kg for calculation
    basePrice = (quantity / 1000) * unitPrice;
  } else if (unit === '100g' || unit === '100ml' || unit === '100gram') {
    // For 100g/100ml products, price is per 100 units, quantity is in actual units (grams/ml)
    basePrice = unitPrice * (quantity / 100);
  } else {
    // For piece and kg products, direct multiplication
    basePrice = quantity * unitPrice;
  }
  const discountAmount = discountType === 'percentage' 
    ? basePrice * (discountValue / 100) 
    : Math.min(discountValue, basePrice);
  const finalPrice = basePrice - discountAmount;

  return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
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

// Closed Dates Manager Component
function ClosedDatesManager() {
  const { toast } = useToast();
  const { t: adminT, i18n } = useAdminTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  useModalBackButton(isAddDialogOpen, () => setIsAddDialogOpen(false));

  // Fetch closed dates
  const { data: closedDates = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/closed-dates'],
  });

  // Add closed date mutation
  const addClosedDateMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      return await apiRequest('POST', '/api/admin/closed-dates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/closed-dates'] });
      toast({
        title: adminT('closedDates.dateAdded'),
        description: adminT('closedDates.dateAddedSuccess'),
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      // Check if it's a duplicate date error
      if (error?.isDuplicate) {
        toast({
          title: adminT('closedDates.error'),
          description: error.message || 'Эта дата уже добавлена как выходной день',
          variant: 'destructive',
        });
      } else {
        toast({
          title: adminT('closedDates.error'),
          description: adminT('closedDates.addError'),
          variant: 'destructive',
        });
      }
    },
  });

  // Delete closed date mutation
  const deleteClosedDateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/closed-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/closed-dates'] });
      toast({
        title: adminT('closedDates.dateDeleted'),
        description: adminT('closedDates.dateDeletedSuccess'),
      });
    },
    onError: () => {
      toast({
        title: adminT('closedDates.error'),
        description: adminT('closedDates.deleteError'),
        variant: 'destructive',
      });
    },
  });

  const [closedDatePickerOpen, setClosedDatePickerOpen] = useState(false);

  const getClosedDateCalendarLocale = () => {
    switch (i18n.language) {
      case 'en': return enUS;
      case 'he': return he;
      case 'ar': return ar;
      default: return ru;
    }
  };

  const closedDateSchema = z.object({
    date: z.string().min(1, adminT('closedDates.dateRequired')),
    reason: z.string().min(1, adminT('closedDates.descriptionRequired')),
  });

  const form = useForm({
    resolver: zodResolver(closedDateSchema),
    defaultValues: {
      date: '',
      reason: '',
    },
  });

  const onSubmit = (data: z.infer<typeof closedDateSchema>) => {
    addClosedDateMutation.mutate(data);
    form.reset();
  };

  if (isLoading) {
    return <div className="text-center py-8">{adminT('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {adminT('closedDates.managementDescription')}
        </p>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-closed-date" className="w-full sm:w-auto whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          {adminT('closedDates.addDate')}
        </Button>
      </div>

      {/* Closed Dates List */}
      <div className="space-y-3">
        {closedDates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{adminT('closedDates.noDates')}</p>
          </div>
        ) : (
          closedDates.map((closedDate: any) => (
            <Card key={closedDate.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">
                        {format(new Date(closedDate.date), 'dd MMMM yyyy', {
                          locale: i18n.language === 'ru' ? ru : i18n.language === 'en' ? enUS : i18n.language === 'he' ? he : ar
                        })}
                      </h3>
                    </div>
                    <div className="sm:hidden">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-delete-closed-date-${closedDate.id}`}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{adminT('closedDates.confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {adminT('closedDates.confirmDeleteDescription')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{adminT('actions.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteClosedDateMutation.mutate(closedDate.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {adminT('actions.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {closedDate.reason && (
                    <p className="text-sm text-gray-700">{closedDate.reason}</p>
                  )}
                </div>
                <div className="hidden sm:block">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-delete-closed-date-${closedDate.id}`}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{adminT('closedDates.confirmDelete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {adminT('closedDates.confirmDeleteDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{adminT('actions.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteClosedDateMutation.mutate(closedDate.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {adminT('actions.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Closed Date Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adminT('closedDates.addDate')}</DialogTitle>
            <DialogDescription>
              {adminT('closedDates.addDescription')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{adminT('closedDates.date')}</FormLabel>
                    <FormControl>
                      <Popover open={closedDatePickerOpen} onOpenChange={setClosedDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start font-normal ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}
                            data-testid="input-closed-date"
                          >
                            <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {field.value
                              ? format(new Date(field.value), 'dd.MM.yyyy')
                              : <span className="text-muted-foreground">{adminT('closedDates.selectDate') || (isRTL && i18n.language === 'he' ? 'בחר תאריך' : isRTL ? 'اختر تاريخاً' : 'Выберите дату')}</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                              setClosedDatePickerOpen(false);
                            }}
                            locale={getClosedDateCalendarLocale()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{adminT('closedDates.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={adminT('closedDates.descriptionPlaceholder')} data-testid="input-closed-date-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">
                  {adminT('actions.cancel')}
                </Button>
                <Button type="submit" disabled={addClosedDateMutation.isPending} data-testid="button-submit-closed-date" className="w-full sm:w-auto">
                  {addClosedDateMutation.isPending ? adminT('common.loading') : adminT('actions.add')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { t: adminT } = useAdminTranslation();
  const { t: commonT, i18n } = useCommonTranslation();
  const { currentLanguage } = useLanguage();

  // Reliable RTL detection: read directly from document lang + listen to language change events
  const getDocLang = () => document.documentElement.lang || localStorage.getItem('language') || i18n.language || 'ru';
  const [rtlLang, setRtlLang] = useState<string>(getDocLang);
  useEffect(() => {
    const handler = () => setRtlLang(getDocLang());
    window.addEventListener('languageChanged', handler);
    // Also update when i18n language changes
    i18n.on('languageChanged', handler);
    return () => {
      window.removeEventListener('languageChanged', handler);
      i18n.off('languageChanged', handler);
    };
  }, []);
  // Keep in sync if i18n.language already reflects change before event fires
  const activeLang = rtlLang || i18n.language || 'ru';
  const isRTL = activeLang === 'he' || activeLang === 'ar';

  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  // Force component remount key to prevent stale state issues
  const [componentKey, setComponentKey] = useState(Date.now());
  
  // Add timeout to prevent infinite loading for repeated visits
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 30000); // 30 second timeout для Android устройств
    
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
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes - cache settings for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
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
  const [isProductFormOpen, _setIsProductFormOpen] = useState(false);
  const [isCategoryFormOpen, _setIsCategoryFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const setIsProductFormOpen = (v: boolean) => { _setIsProductFormOpen(v); };
  const setIsCategoryFormOpen = (v: boolean) => { _setIsCategoryFormOpen(v); };

  useModalBackButton(isProductFormOpen, () => { setIsProductFormOpen(false); setEditingProduct(null); });
  useModalBackButton(isCategoryFormOpen, () => { setIsCategoryFormOpen(false); setEditingCategory(null); });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedProductBranchFilter, setSelectedProductBranchFilter] = useState("all");

  const [sortField, setSortField] = useState<"name" | "price" | "category" | "sortOrder">("name");
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
    // Update URL without causing re-renders.
    // Preserve existing history state (e.g. {modal:true} when a dialog is open)
    // so we don't corrupt the entry that useModalBackButton relies on.
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState(window.history.state || {}, '', url.toString());
  }, []);

  // Listen for quick-nav events from bottom-nav (avoids full page reload)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('adminQuickNav', handler);
    return () => window.removeEventListener('adminQuickNav', handler);
  }, [setActiveTab]);

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
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);

  // Order editing handler
  const handleOrderEdit = useCallback((order: any) => {
    setEditingOrder(order);
    setIsOrderFormOpen(true);
  }, []);

  // Keep a stable ref to editingOrder so the reopen handler always has the latest value
  const editingOrderRef = useRef<any>(null);
  useEffect(() => { editingOrderRef.current = editingOrder; }, [editingOrder]);

  // Android/iOS back button support for the order dialog
  // Tracks whether the history entry was pushed by this dialog and the active popstate handler
  const orderDialogHistoryRef = useRef<{ pushed: boolean; handler: ((e: PopStateEvent) => void) | null }>({ pushed: false, handler: null });

  useEffect(() => {
    if (isOrderFormOpen) {
      // Dialog just opened — push a history entry so the system back button is intercepted
      window.history.pushState({ orderDialog: true }, '', window.location.href);
      orderDialogHistoryRef.current.pushed = true;

      const onPopState = (e: PopStateEvent) => {
        // If we popped TO the orderDialog state, that means we came from the print overlay
        // going back one step — the order dialog should remain open
        if (e.state?.orderDialog) return;

        // Ignore popstate events generated programmatically by suppressedHistoryBack()
        if (isPopstateSuppressed()) return;

        // We popped PAST the orderDialog state (real Android back) — close the dialog
        orderDialogHistoryRef.current.pushed = false;
        orderDialogHistoryRef.current.handler = null;
        window.removeEventListener('popstate', onPopState);
        setIsOrderFormOpen(false);
        setEditingOrder(null);
      };

      window.addEventListener('popstate', onPopState);
      orderDialogHistoryRef.current.handler = onPopState;

      return () => {
        // Cleanup in case the effect re-runs before the handler fires
        window.removeEventListener('popstate', onPopState);
      };
    } else {
      // Dialog just closed via button/X (not via back button)
      const { pushed, handler } = orderDialogHistoryRef.current;
      if (handler) {
        window.removeEventListener('popstate', handler);
        orderDialogHistoryRef.current.handler = null;
      }
      if (pushed) {
        orderDialogHistoryRef.current.pushed = false;
        // Pop the history entry we pushed so the browser history stays clean
        suppressedHistoryBack();
      }
    }
  }, [isOrderFormOpen]);

  // Reopen order dialog after print preview is closed
  useEffect(() => {
    const handler = () => {
      const order = editingOrderRef.current;
      // Small delay to let Radix finish its close animation before we reopen
      setTimeout(() => {
        if (order) setEditingOrder(order);
        setIsOrderFormOpen(true);
      }, 80);
    };
    window.addEventListener('edahouse:reopen-order-dialog', handler);
    return () => window.removeEventListener('edahouse:reopen-order-dialog', handler);
  }, []);
  
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
  const [ordersBranchFilter, setOrdersBranchFilter] = useState("all");
  
  // Cancellation dialog state
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
  
  // Image optimization state
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [isImportingTranslations, setIsImportingTranslations] = useState(false);
  const [selectedTranslationFile, setSelectedTranslationFile] = useState<File | null>(null);
  const [showCatalogImportModal, setShowCatalogImportModal] = useState(false);
  const translationFileInputRef = useRef<HTMLInputElement>(null);

  // Availability modal state
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [modalProductId, setModalProductId] = useState<number | null>(null);
  const [applyToAllBranches, setApplyToAllBranches] = useState(true);
  const [globalStatusChoice, setGlobalStatusChoice] = useState("completely_unavailable");
  const [branchStatusChoices, setBranchStatusChoices] = useState<Record<number, string>>({});
  const [isLoadingModalBranchData, setIsLoadingModalBranchData] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [modalAccessibleBranches, setModalAccessibleBranches] = useState<any[]>([]);

  // Pagination state
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  // User management state
  const [isUserFormOpen, _setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isUserDeletionDialogOpen, setIsUserDeletionDialogOpen] = useState(false);

  const setIsUserFormOpen = (v: boolean) => { _setIsUserFormOpen(v); };

  useModalBackButton(isUserFormOpen, () => { setIsUserFormOpen(false); setEditingUser(null); });
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  const handleDeleteUser = (user: any) => {
    console.log('handleDeleteUser called with user:', user);
    setUserToDelete(user);
    setIsUserDeletionDialogOpen(true);
  };
  
  const handleConfirmDeleteUser = async (userId: string, forceDelete: boolean) => {
    console.log('handleConfirmDeleteUser called with userId:', userId, 'forceDelete:', forceDelete);
    try {
      const queryParams = forceDelete ? '?forceDelete=true' : '';
      const response = await apiRequest('DELETE', `/api/admin/users/${userId}${queryParams}`);
      console.log('Delete response:', response);
      toast({
        title: adminT('users.deleted'),
        description: adminT('users.deleteSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsUserDeletionDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast({
        title: adminT('actions.error'),
        description: error.message || adminT('users.deleteError'),
        variant: "destructive",
      });
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
  }, [searchQuery, ordersStatusFilter, ordersBranchFilter]);

  useEffect(() => {
    setUsersPage(1);
  }, [searchQuery]);

  // Sorting function
  const handleSort = (field: "name" | "price" | "category" | "sortOrder") => {
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
    queryKey: ["/api/admin/products", productsPage, searchQuery, selectedCategoryFilter, selectedStatusFilter, sortField, sortDirection, storeSettings?.defaultItemsPerPage, selectedProductBranchFilter],
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
      if (selectedProductBranchFilter !== 'all') {
        params.set('branchId', selectedProductBranchFilter);
      }
      const response = await fetch(`/api/admin/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!storeSettings,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/admin/orders", ordersPage, searchQuery, ordersStatusFilter, ordersBranchFilter, storeSettings?.defaultItemsPerPage],
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
      
      const paramsObj: Record<string, string> = {
        page: ordersPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusParam,
        sortField: 'createdAt',
        sortDirection: 'desc'
      };
      if (ordersBranchFilter !== 'all') {
        paramsObj.branchId = ordersBranchFilter;
      }
      const params = new URLSearchParams(paramsObj);
      const response = await fetch(`/api/admin/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: !!storeSettings,
    staleTime: 1 * 60 * 1000, // 1 minute for orders (more frequent updates)
    gcTime: 3 * 60 * 1000, // 3 minutes
  });

  // Image optimization mutation
  const optimizeImagesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/optimize-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка оптимизации изображений');
      }
      return response.json();
    },
    onMutate: () => {
      setIsOptimizingImages(true);
      setOptimizationResults(null);
    },
    onSuccess: (data) => {
      setOptimizationResults(data);
      toast({
        title: "🎉 Оптимизация завершена!",
        description: `Обработано: ${data.processed} из ${data.totalFiles} изображений. Экономия: ${data.totalSavingsMB}MB`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка оптимизации",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsOptimizingImages(false);
    }
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

  // Config query to check feature flags
  const { data: appConfig } = useQuery({
    queryKey: ["/api/config"],
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
  const branchesEnabled = (appConfig as any)?.branchesEnabled === true;

  // Branches data query (admin only, when branchesEnabled)
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/admin/branches"],
    queryFn: async () => {
      const response = await fetch('/api/admin/branches');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: branchesEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Current user's accessible branch IDs (empty = all branches for admin)
  const { data: myBranchIds = [] } = useQuery<number[]>({
    queryKey: ["/api/auth/my-branches"],
    queryFn: async () => {
      const res = await fetch('/api/auth/my-branches');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: branchesEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-set product branch filter for workers with a single accessible branch.
  // This ensures the status filter and mixed-status badges work correctly for them.
  useEffect(() => {
    if (!isAdmin && branchesEnabled) {
      const activeBranches = (branches as any[]).filter((b: any) => b.isActive);
      if (activeBranches.length === 1) {
        setSelectedProductBranchFilter(String(activeBranches[0].id));
      }
    }
  }, [isAdmin, branchesEnabled, branches]);

  // Branch limit status — check if current count exceeds MAX_BRANCHES config
  const { data: branchLimitStatus, refetch: refetchLimitStatus } = useQuery<{
    maxBranches: number | null;
    currentCount: number;
    isOverLimit: boolean;
    overLimitCount: number;
    branches: any[];
  } | null>({
    queryKey: ["/api/admin/branches/limit-status"],
    queryFn: async () => {
      const res = await fetch('/api/admin/branches/limit-status');
      if (!res.ok) return null;
      return res.json();
    },
    enabled: branchesEnabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const branchOverLimit = branchLimitStatus?.isOverLimit === true;
  const branchOverLimitCount = branchLimitStatus?.overLimitCount || 0;
  const branchMaxAllowed = branchLimitStatus?.maxBranches ?? null;

  // Branch CRUD mutations
  const createBranchMutation = useMutation({
    mutationFn: async (data: { name: string; nameEn?: string; nameHe?: string; nameAr?: string; isActive: boolean; sortOrder: number }) => {
      return await apiRequest('POST', '/api/admin/branches', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches/limit-status'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/branches'] });
      setIsBranchFormOpen(false);
      setEditingBranch(null);
      toast({ title: adminT('branches.createSuccess') });
    },
    onError: () => {
      toast({ title: adminT('actions.error'), description: adminT('branches.createError'), variant: 'destructive' });
    }
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; nameEn?: string; nameHe?: string; nameAr?: string; isActive?: boolean; sortOrder?: number }) => {
      return await apiRequest('PUT', `/api/admin/branches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches/limit-status'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/branches'] });
      setIsBranchFormOpen(false);
      setEditingBranch(null);
      toast({ title: adminT('branches.updateSuccess') });
    },
    onError: () => {
      toast({ title: adminT('actions.error'), description: adminT('branches.updateError'), variant: 'destructive' });
    }
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async ({ id, transferTo }: { id: number; transferTo?: number | null }) => {
      return await apiRequest('DELETE', `/api/admin/branches/${id}`, { transferTo: transferTo || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches/limit-status'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/branches'] });
      setIsBranchDeleteDialogOpen(false);
      setBranchDeleteTarget(null);
      toast({ title: adminT('branches.deleteSuccess') });
    },
    onError: () => {
      toast({ title: adminT('actions.error'), description: adminT('branches.deleteError'), variant: 'destructive' });
    }
  });

  // Branch form state
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormNameEn, setBranchFormNameEn] = useState('');
  const [branchFormNameHe, setBranchFormNameHe] = useState('');
  const [branchFormNameAr, setBranchFormNameAr] = useState('');
  const [branchFormIsActive, setBranchFormIsActive] = useState(true);
  const [branchFormSortOrder, setBranchFormSortOrder] = useState(1);
  const [selectedBranchesToDelete, setSelectedBranchesToDelete] = useState<Set<number>>(new Set());
  const [isDeletingLimitBranches, setIsDeletingLimitBranches] = useState(false);
  // Regular branch delete dialog (with optional order transfer)
  const [branchDeleteTarget, setBranchDeleteTarget] = useState<any>(null);
  const [branchDeleteOrderCount, setBranchDeleteOrderCount] = useState(0);
  const [branchDeleteOrderCountLoading, setBranchDeleteOrderCountLoading] = useState(false);
  const [branchDeleteTransferTo, setBranchDeleteTransferTo] = useState<string>('none');
  const [isBranchDeleteDialogOpen, setIsBranchDeleteDialogOpen] = useState(false);
  // Limit-exceeded modal step 2 (order transfer mapping per branch)
  const [limitModalStep, setLimitModalStep] = useState<1 | 2>(1);
  const [limitBranchOrderCounts, setLimitBranchOrderCounts] = useState<Record<number, number>>({});
  const [limitOrderTransferMap, setLimitOrderTransferMap] = useState<Record<number, string>>({});

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
    onSuccess: (updatedCategory: any) => {
      // Immediately update admin list (all categories including inactive)
      queryClient.setQueryData(['/api/categories', 'includeInactive'], (old: any[]) =>
        old ? old.map((c: any) => c.id === updatedCategory.id ? { ...c, ...updatedCategory } : c) : old
      );
      // Immediately update home page list: add if now active, remove if now inactive
      queryClient.setQueryData(['/api/categories'], (old: any[]) => {
        if (!old) return old;
        const exists = old.some((c: any) => c.id === updatedCategory.id);
        if (updatedCategory.isActive === false) {
          return old.filter((c: any) => c.id !== updatedCategory.id);
        } else if (exists) {
          return old.map((c: any) => c.id === updatedCategory.id ? { ...c, ...updatedCategory } : c);
        } else {
          return [...old, updatedCategory];
        }
      });
      // Purge SW cache for categories so next invalidateQueries refetch gets fresh server data
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PURGE_URL_CACHE', urlPattern: '/api/categories' });
      }
      // Now refetch — SW cache was purged so we get live server data
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'includeInactive'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
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
      // Ensure required fields are present
      const jsonData = {
        ...productData,
        name: productData.name || '',
        price: productData.price || '',
        pricePerKg: productData.price || productData.pricePerKg || '', // Use price as pricePerKg
      };
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create product: ${errorText}`);
      }
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
      if (!response.ok) {
        let errorData: any = {};
        
        try {
          errorData = await response.json();
        } catch (e) {
          // JSON parsing failed - might be HTML error page or empty body
          console.error('Failed to parse error response:', e);
        }
        
        // Check if it's a foreign key constraint error (by status code or errorCode)
        if (response.status === 409 || errorData.errorCode === 'PRODUCT_IN_USE') {
          const error: any = new Error(errorData.message || 'Product is used in existing orders');
          error.errorCode = 'PRODUCT_IN_USE';
          throw error;
        }
        
        throw new Error(errorData.message || 'Failed to delete product');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: adminT('products.notifications.productDeleted'), description: adminT('products.notifications.productDeletedDesc') });
    },
    onError: (error: any) => {
      console.error("Product deletion error:", error);
      
      // Check if it's a product-in-use error
      if (error.errorCode === 'PRODUCT_IN_USE') {
        toast({ 
          title: adminT('productDeletion.cannotDelete'),
          description: adminT('productDeletion.usedInOrders') + '\n\n' + adminT('productDeletion.suggestion'),
          variant: "destructive",
          duration: 10000 // Show longer for this important message
        });
      } else {
        toast({ 
          title: adminT('actions.error'),
          description: adminT('products.notifications.deleteError'),
          variant: "destructive" 
        });
      }
    }
  });

  const saveProductBranchAvailabilityMutation = useMutation({
    mutationFn: async ({ id, branchAvailability }: { id: number; branchAvailability: { branchId: number; availabilityStatus: string; isAvailable: boolean }[] }) => {
      const response = await fetch(`/api/admin/products/${id}/branch-availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchAvailability),
      });
      if (!response.ok) throw new Error('Failed to save product branch availability');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
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
      setIsAvailabilityModalOpen(false);
      setModalProductId(null);
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

  const [optimisticSpecialOffers, setOptimisticSpecialOffers] = useState<Map<number, boolean>>(new Map());

  const toggleSpecialOfferMutation = useMutation({
    mutationFn: async ({ id, isSpecialOffer }: { id: number; isSpecialOffer: boolean }) => {
      const response = await fetch(`/api/products/${id}/special-offer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSpecialOffer }),
      });
      if (!response.ok) throw new Error('Failed to toggle special offer');
      return await response.json();
    },
    onMutate: ({ id, isSpecialOffer }) => {
      setOptimisticSpecialOffers(prev => new Map(prev).set(id, isSpecialOffer));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setTimeout(() => {
        setOptimisticSpecialOffers(prev => { const n = new Map(prev); n.delete(id); return n; });
      }, 1500);
    },
    onError: (_, { id }) => {
      setOptimisticSpecialOffers(prev => { const n = new Map(prev); n.delete(id); return n; });
      toast({ title: adminT('actions.error'), variant: "destructive" });
    },
  });

  const updateBranchAvailabilityQuickMutation = useMutation({
    mutationFn: async ({ productId, branchId, availabilityStatus }: { productId: number; branchId: number; availabilityStatus: string }) => {
      const isAvailable = availabilityStatus !== 'completely_unavailable';
      const response = await fetch(`/api/products/${productId}/branch-availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ branchId, availabilityStatus, isAvailable }]),
      });
      if (!response.ok) throw new Error('Failed to update branch availability');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsAvailabilityModalOpen(false);
      setModalProductId(null);
      toast({ title: adminT('products.notifications.statusUpdated'), description: adminT('products.notifications.statusUpdatedDesc') });
    },
    onError: (error: any) => {
      console.error("Update branch availability error:", error);
      toast({ title: adminT('actions.error'), description: adminT('products.notifications.statusError'), variant: "destructive" });
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
      return await apiRequest('DELETE', `/api/categories/${categoryId}`);
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

  // ── Danger Zone state & mutations ────────────────────────────────
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [dangerDialog, setDangerDialog] = useState<"orders"|"users"|"products"|"categories"|"push"|null>(null);

  const dangerMutation = useMutation({
    mutationFn: async (target: "orders"|"users"|"products"|"categories"|"push") => {
      const res = await fetch(`/api/admin/danger/all-${target}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Ошибка удаления");
      }
      return res.json();
    },
    onSuccess: (_, target) => {
      setDangerDialog(null);
      setDangerConfirm("");
      const labels: Record<string, string> = {
        orders: "Все заказы удалены",
        users: "Все пользователи удалены (кроме вас)",
        products: "Все товары удалены",
        categories: "Все категории удалены",
        push: "История push-уведомлений очищена",
      };
      toast({ title: "✅ " + labels[target] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'includeInactive'] });
    },
    onError: (err: any) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    }
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (toEmail: string) => {
      console.log("Sending test email to:", toEmail);
      
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toEmail })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Не удалось отправить тестовое письмо");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Успешно!",
        description: data.message || "Тестовое письмо отправлено",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Ошибка",
        description: error.message || "Не удалось отправить тестовое письмо",
        variant: "destructive"
      });
    }
  });

  // Store settings mutation
  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      console.log("Saving store settings:", settingsData);
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
      
      console.log("Cleaned data:", cleanedData);
      
      const response = await apiRequest('PUT', '/api/settings', cleanedData);
      console.log("Settings response:", response);
      
      return response;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['/api/settings'], data);
      }
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
    onSuccess: (_, variables) => {
      toast({
        title: adminT('orders.notifications.statusUpdated'),
        description: adminT('orders.notifications.statusUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      
      // Close cancellation dialog only after successful status update
      if (variables.status === 'cancelled') {
        setIsCancellationDialogOpen(false);
        setOrderToCancel(null);
      }
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

  // RTL table scroll is handled purely by CSS:
  // The scroll container has dir={isRTL ? 'rtl' : 'ltr'} which makes the browser
  // automatically start scrolling from the right side for RTL languages.
  // No JavaScript scroll manipulation needed.

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
          {loadingTimeout && (
            <div className="mt-4">
              <Button onClick={() => window.location.reload()} variant="outline">
                Обновить страницу
              </Button>
            </div>
          )}
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

  const doDeleteSelectedBranches = async (transferMap: Record<number, string>) => {
    setIsDeletingLimitBranches(true);
    try {
      for (const branchId of selectedBranchesToDelete) {
        const transferToStr = transferMap[branchId];
        const transferTo = transferToStr && transferToStr !== 'none' ? parseInt(transferToStr) : null;
        await apiRequest('DELETE', `/api/admin/branches/${branchId}`, { transferTo });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/branches/limit-status'] });
      refetchLimitStatus();
      setSelectedBranchesToDelete(new Set());
      setLimitModalStep(1);
      setLimitBranchOrderCounts({});
      setLimitOrderTransferMap({});
      toast({ title: adminT('branches.deleteSuccess') });
    } catch {
      toast({ title: adminT('actions.error'), description: adminT('branches.deleteError'), variant: 'destructive' });
    } finally {
      setIsDeletingLimitBranches(false);
    }
  };

  const handleDeleteOverLimitBranches = async () => {
    if (selectedBranchesToDelete.size < branchOverLimitCount) return;
    setIsDeletingLimitBranches(true);
    try {
      const counts: Record<number, number> = {};
      for (const branchId of selectedBranchesToDelete) {
        const res = await fetch(`/api/admin/branches/${branchId}/order-count`);
        const data = await res.json();
        counts[branchId] = data.count || 0;
      }
      setLimitBranchOrderCounts(counts);
      const hasOrdersAnywhere = Object.values(counts).some(c => c > 0);
      if (hasOrdersAnywhere) {
        const initMap: Record<number, string> = {};
        for (const branchId of selectedBranchesToDelete) initMap[branchId] = 'none';
        setLimitOrderTransferMap(initMap);
        setLimitModalStep(2);
        setIsDeletingLimitBranches(false);
        return;
      }
      await doDeleteSelectedBranches({});
    } catch {
      toast({ title: adminT('actions.error'), description: adminT('branches.deleteError'), variant: 'destructive' });
      setIsDeletingLimitBranches(false);
    }
  };

  const openAvailabilityModal = async (product: any, currentEffectiveStatus: string) => {
    setModalProductId(product.id);
    setGlobalStatusChoice(currentEffectiveStatus || product.availabilityStatus || 'available');
    setApplyToAllBranches(true);
    setIsAvailabilityModalOpen(true);

    if (branchesEnabled && (branches as any[]).length > 0) {
      setIsLoadingModalBranchData(true);
      try {
        const res = await fetch(`/api/admin/products/${product.id}/branch-availability`);
        const branchAvail: any[] = await res.json();

        // Determine which branches this user can access
        const activeBranches = (branches as any[]).filter((b: any) => b.isActive);
        const accessibleBranches = isAdmin
          ? activeBranches
          : myBranchIds.length === 0
            ? activeBranches
            : activeBranches.filter((b: any) => myBranchIds.includes(b.id));

        const choices: Record<number, string> = {};
        accessibleBranches.forEach((branch: any) => {
          const override = branchAvail.find((ba: any) => ba.branchId === branch.id);
          choices[branch.id] = override
            ? override.availabilityStatus
            : (product.isAvailable ? (product.availabilityStatus || 'available') : 'completely_unavailable');
        });
        setBranchStatusChoices(choices);
        setModalAccessibleBranches(accessibleBranches);

        // Fix 1: if only 1 accessible branch, never show "apply to all" checkbox
        if (accessibleBranches.length <= 1) {
          setApplyToAllBranches(false);
        } else {
          // Fix 2: if statuses differ across accessible branches, auto-switch to per-branch view
          const statuses = Object.values(choices);
          const allSame = statuses.every(s => s === statuses[0]);
          if (!allSame) {
            setApplyToAllBranches(false);
          } else {
            setGlobalStatusChoice(statuses[0] || currentEffectiveStatus);
          }
        }
      } catch {
        const activeBranches = (branches as any[]).filter((b: any) => b.isActive);
        const accessibleBranches = isAdmin
          ? activeBranches
          : myBranchIds.length === 0
            ? activeBranches
            : activeBranches.filter((b: any) => myBranchIds.includes(b.id));
        const choices: Record<number, string> = {};
        accessibleBranches.forEach((b: any) => {
          choices[b.id] = product.isAvailable ? (product.availabilityStatus || 'available') : 'completely_unavailable';
        });
        setBranchStatusChoices(choices);
        setModalAccessibleBranches(accessibleBranches);
        if (accessibleBranches.length <= 1) setApplyToAllBranches(false);
      } finally {
        setIsLoadingModalBranchData(false);
      }
    }
  };

  const handleSaveAvailability = async () => {
    if (!modalProductId || isSavingAvailability) return;
    setIsSavingAvailability(true);
    try {
      if (!branchesEnabled || applyToAllBranches) {
        // Update global availability status
        const isAvail = globalStatusChoice !== 'completely_unavailable';
        await fetch(`/api/products/${modalProductId}/availability`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availabilityStatus: globalStatusChoice, isAvailable: isAvail }),
        });
        // When branches enabled: also update accessible branch records so overrides don't contradict the global status
        if (branchesEnabled && modalAccessibleBranches.length > 0) {
          const branchUpdates = modalAccessibleBranches.map((b: any) => ({
            branchId: b.id,
            availabilityStatus: globalStatusChoice,
            isAvailable: isAvail,
          }));
          await fetch(`/api/admin/products/${modalProductId}/branch-availability`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branchUpdates),
          });
        }
      } else {
        // Per-branch update: only update the branches this user has access to
        const branchUpdates = modalAccessibleBranches.map((b: any) => ({
          branchId: b.id,
          availabilityStatus: branchStatusChoices[b.id] || 'available',
          isAvailable: (branchStatusChoices[b.id] || 'available') !== 'completely_unavailable',
        }));
        const res = await fetch(`/api/admin/products/${modalProductId}/branch-availability`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(branchUpdates),
        });
        if (!res.ok) throw new Error('Failed');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsAvailabilityModalOpen(false);
      setModalProductId(null);
      toast({ title: adminT('products.notifications.statusUpdated'), description: adminT('products.notifications.statusUpdatedDesc') });
    } catch {
      toast({ title: adminT('actions.error'), description: adminT('products.notifications.statusError'), variant: "destructive" });
    } finally {
      setIsSavingAvailability(false);
    }
  };

  function getUnitDisplay(unit: string) {
    switch (unit) {
      case 'piece': return adminT('products.units.piece');
      case 'portion': return adminT('products.units.portion');
      case 'kg': return adminT('products.units.kg');
      case '100g': return adminT('products.units.per100g');
      case '100ml': return adminT('products.units.per100ml');
      default: return '';
    }
  }

  const _allProductIds = (productsData as any[] || []).map((p: any) => p.id).filter(Boolean);
  const { data: listVolumeDiscounts } = useQuery({
    queryKey: [`/api/products/volume-discounts?productIds=${_allProductIds.join(',')}`],
    enabled: _allProductIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const filteredProducts = (productsData as any[] || [])
    .filter((product: any) => {
      const matchesSearch = !searchQuery || 
        (getLocalizedField(product, 'name', i18n.language as SupportedLanguage) || product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (getLocalizedField(product, 'description', i18n.language as SupportedLanguage) || product.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategoryFilter === "all" || 
        product.categories?.some((cat: any) => cat.id === parseInt(selectedCategoryFilter));
      
      let matchesStatus = false;
      if (selectedStatusFilter === "all") {
        matchesStatus = true;
      } else if (selectedStatusFilter === "with_discount") {
        const hasVolumeDiscount = ((listVolumeDiscounts as any)?.[product.id] || []).some((d: any) => d.isActive);
        matchesStatus = product.isSpecialOffer || (product.discountValue && parseFloat(product.discountValue) > 0) || hasVolumeDiscount;
      } else if (branchesEnabled && selectedProductBranchFilter !== 'all') {
        // Branch-aware status: check per-branch override, fallback to global
        const branchRecord = (product.branchAvailability || []).find((ba: any) => ba.branchId === parseInt(selectedProductBranchFilter));
        const effectiveStat = branchRecord
          ? branchRecord.availabilityStatus
          : (product.isAvailable ? product.availabilityStatus : 'completely_unavailable');
        if (selectedStatusFilter === "available") matchesStatus = effectiveStat === "available";
        else if (selectedStatusFilter === "unavailable") matchesStatus = effectiveStat === "completely_unavailable";
        else if (selectedStatusFilter === "out_of_stock_today") matchesStatus = effectiveStat === "out_of_stock_today";
        else matchesStatus = true;
      } else {
        // Global status filter (no branch selected) - also consider per-branch overrides
        const allBranchRecordsForFilter: any[] = product.allBranchAvailability || product.branchAvailability || [];
        if (selectedStatusFilter === "available") matchesStatus = product.isAvailable && product.availabilityStatus === "available";
        else if (selectedStatusFilter === "unavailable") {
          const hasUnavailableBranch = allBranchRecordsForFilter.some((ba: any) => ba.availabilityStatus === 'completely_unavailable');
          matchesStatus = !product.isAvailable || hasUnavailableBranch;
        }
        else if (selectedStatusFilter === "out_of_stock_today") {
          const hasOutOfStockBranch = allBranchRecordsForFilter.some((ba: any) => ba.availabilityStatus === 'out_of_stock_today');
          matchesStatus = product.availabilityStatus === "out_of_stock_today" || hasOutOfStockBranch;
        }
        else matchesStatus = true;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a: any, b: any) => {
      // When a category is selected and no explicit sort override, sort by sortOrder (0 = end)
      if (selectedCategoryFilter !== "all" && sortField === "name") {
        const aOrder = (a.sortOrder ?? 0) === 0 ? 999999 : (a.sortOrder ?? 0);
        const bOrder = (b.sortOrder ?? 0) === 0 ? 999999 : (b.sortOrder ?? 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aName = (getLocalizedField(a, 'name', i18n.language as SupportedLanguage) || a.name || '').toLowerCase();
        const bName = (getLocalizedField(b, 'name', i18n.language as SupportedLanguage) || b.name || '').toLowerCase();
        return aName < bName ? -1 : aName > bName ? 1 : 0;
      }

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
        case "sortOrder":
          aValue = a.sortOrder ?? 0;
          bValue = b.sortOrder ?? 0;
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

      {/* Branch limit exceeded — WORKER blocking overlay */}
      {branchesEnabled && branchOverLimit && !isAdmin && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" /></svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{adminT('branches.workerBlockedTitle')}</h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{adminT('branches.workerBlockedDesc')}</p>
          </div>
        </div>
      )}

      {/* Branch limit exceeded — ADMIN selection modal */}
      {branchesEnabled && branchOverLimit && isAdmin && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{adminT('branches.limitExceeded')}</h2>
                {limitModalStep === 2 && (
                  <p className="text-xs text-gray-500">{adminT('branches.stepTransferOrders') || 'Шаг 2: перенос заказов'}</p>
                )}
              </div>
            </div>

            {limitModalStep === 1 && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {adminT('branches.limitExceededDesc')
                    .replace('{count}', String(branchLimitStatus?.currentCount || 0))
                    .replace('{max}', String(branchMaxAllowed ?? 0))}
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700 mb-2">{adminT('branches.limitExceededSelectTitle')}</p>
                  {(branchLimitStatus?.branches || []).map((branch: any) => (
                    <label key={branch.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={selectedBranchesToDelete.has(branch.id)}
                        onCheckedChange={(checked) => {
                          setSelectedBranchesToDelete(prev => {
                            const next = new Set(prev);
                            if (checked) next.add(branch.id); else next.delete(branch.id);
                            return next;
                          });
                        }}
                      />
                      <span className="text-sm text-gray-800">{branch.name}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {branch.isActive ? adminT('branches.active') : adminT('branches.inactive')}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedBranchesToDelete.size < branchOverLimitCount && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {adminT('branches.mustSelectMinimum').replace('{count}', String(branchOverLimitCount))}
                  </p>
                )}
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  disabled={selectedBranchesToDelete.size < branchOverLimitCount || isDeletingLimitBranches}
                  onClick={handleDeleteOverLimitBranches}
                >
                  {isDeletingLimitBranches ? adminT('branches.deletingBranches') : adminT('branches.deleteSelected')}
                </Button>
              </>
            )}

            {limitModalStep === 2 && (
              <>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {adminT('branches.transferOrdersDesc') || 'Некоторые удаляемые филиалы содержат заказы. Укажите куда перенести заказы каждого филиала.'}
                </p>
                <div className="space-y-3">
                  {Array.from(selectedBranchesToDelete).map((branchId) => {
                    const branch = (branchLimitStatus?.branches || []).find((b: any) => b.id === branchId);
                    const count = limitBranchOrderCounts[branchId] || 0;
                    const remainingBranches = (branchLimitStatus?.branches || []).filter((b: any) => !selectedBranchesToDelete.has(b.id));
                    return (
                      <div key={branchId} className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">{branch?.name}</span>
                          {count > 0 ? (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              {adminT('branches.ordersCount') ? adminT('branches.ordersCount').replace('{count}', String(count)) : `${count} заказов`}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              {adminT('branches.noOrders') || 'Заказов нет'}
                            </span>
                          )}
                        </div>
                        {count > 0 && (
                          <Select
                            value={limitOrderTransferMap[branchId] || 'none'}
                            onValueChange={(v) => setLimitOrderTransferMap(prev => ({ ...prev, [branchId]: v }))}
                          >
                            <SelectTrigger className="w-full text-sm h-9 bg-white">
                              <SelectValue placeholder={adminT('branches.selectTransferTarget') || 'Перенести заказы в...'} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[10100]">
                              <SelectItem value="none">
                                <span className="text-gray-500">{adminT('branches.leaveWithoutBranch') || 'Оставить без филиала'}</span>
                              </SelectItem>
                              {remainingBranches.map((b: any) => (
                                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setLimitModalStep(1); setLimitBranchOrderCounts({}); setLimitOrderTransferMap({}); }}
                    disabled={isDeletingLimitBranches}
                  >
                    {adminT('actions.back') || 'Назад'}
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={isDeletingLimitBranches}
                    onClick={() => doDeleteSelectedBranches(limitOrderTransferMap)}
                  >
                    {isDeletingLimitBranches ? adminT('branches.deletingBranches') : adminT('branches.confirmDeleteAndTransfer') || 'Подтвердить и удалить'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full bg-white border-gray-200 h-12 justify-between hover:bg-gray-50">
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Menu className="w-5 h-5 text-gray-600" />
                      <span className="text-lg font-medium">
                        {currentLanguage === 'ru' && 'Разделы меню'}
                        {currentLanguage === 'en' && 'Menu Sections'}
                        {currentLanguage === 'he' && 'חלקי התפריט'}
                        {currentLanguage === 'ar' && 'أقسام القائمة'}
                      </span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-screen min-w-full overflow-y-auto border-0 rounded-none p-2 z-50 bg-white" 
                  align={isRTL ? "end" : "start"} 
                  side="bottom" 
                  sideOffset={0}
                  style={{
                    minHeight: 'calc(100vh - 120px)',
                    maxHeight: 'calc(100vh - 120px)'
                  }}
                >
                  <div className="w-full" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px',
                    width: '100%',
                    minWidth: '0'
                  }}>
                    {hasPermission("canManageProducts") && (
                      <div 
                        onClick={() => {
                          setActiveTab("products");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'products' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Package className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.products')}</span>
                        </div>
                      </div>
                    )}
                    {hasPermission("canManageCategories") && (
                      <div 
                        onClick={() => {
                          setActiveTab("categories");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'categories' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Layers3 className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.categories')}</span>
                        </div>
                      </div>
                    )}
                    {hasPermission("canManageOrders") && (
                      <div 
                        onClick={() => {
                          setActiveTab("orders");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'orders' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <ShoppingCart className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.orders')}</span>
                        </div>
                      </div>
                    )}
                    {hasPermission("canViewUsers") && (
                      <div 
                        onClick={() => {
                          setActiveTab("users");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'users' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Users className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.users')}</span>
                        </div>
                      </div>
                    )}
                    {hasPermission("canViewSettings") && (
                      <div 
                        onClick={() => {
                          setActiveTab("store-settings");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'store-settings' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Settings className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.settings')}</span>
                        </div>
                      </div>
                    )}
                    {hasPermission("canViewSettings") && (
                      <div 
                        onClick={() => {
                          setActiveTab("closed-dates");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'closed-dates' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <CalendarIcon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.closedDates')}</span>
                        </div>
                      </div>
                    )}
                    {isAdmin && branchesEnabled && (
                      <div 
                        onClick={() => {
                          setActiveTab("branches");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'branches' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Building2 className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.branches')}</span>
                        </div>
                      </div>
                    )}
                    {isAdmin && (
                      <div 
                        onClick={() => {
                          setActiveTab("coupons");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'coupons' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Tag className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">
                            {currentLanguage === 'ru' ? 'Купоны' : currentLanguage === 'he' ? 'קופונים' : currentLanguage === 'ar' ? 'كوبونات' : 'Coupons'}
                          </span>
                        </div>
                      </div>
                    )}
                    {hasPermission("canManageTranslations") && (
                      <div 
                        onClick={() => {
                          setActiveTab("translations");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'translations' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Globe className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.translations')}</span>
                        </div>
                      </div>
                    )}
                    {user?.role === 'admin' && (
                      <div 
                        onClick={() => {
                          setActiveTab("notifications");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'notifications' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Bell className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">
                            {currentLanguage === 'ru' && 'Push Уведомления'}
                            {currentLanguage === 'en' && 'Push Notifications'}
                            {currentLanguage === 'he' && 'התראות Push'}
                            {currentLanguage === 'ar' && 'إشعарات Push'}
                          </span>
                        </div>
                      </div>
                    )}
                    {hasPermission("canManageSettings") && (
                      <div 
                        onClick={() => {
                          setActiveTab("settings");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'settings' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <UserCheck className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.permissions')}</span>
                        </div>
                      </div>
                    )}
                    {(hasPermission("canManageSettings") || hasPermission("canManageThemes")) && (
                      <div 
                        onClick={() => {
                          setActiveTab("themes");
                          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                        }} 
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center w-full ${activeTab === 'themes' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white hover:bg-primary hover:text-primary-foreground hover:shadow-md border border-gray-200'}`}
                        style={{minWidth: '0', overflow: 'hidden'}}
                      >
                        <div className={`flex flex-col items-center gap-1 ${isRTL ? 'text-right' : 'text-center'} w-full`}>
                          <Palette className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-medium leading-tight text-center truncate w-full">{adminT('tabs.themes')}</span>
                        </div>
                      </div>
                    )}

                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  {isAdmin && branchesEnabled && (
                    <TabsTrigger value="branches" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.branches')}>
                      <Building2 className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.branches')}</span>
                    </TabsTrigger>
                  )}
                  {isAdmin && (
                    <TabsTrigger value="coupons" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={currentLanguage === 'ru' ? 'Купоны и лояльность' : currentLanguage === 'he' ? 'קופונים ונאמנות' : currentLanguage === 'ar' ? 'كوبونات والولاء' : 'Coupons & Loyalty'}>
                      <Tag className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{currentLanguage === 'ru' ? 'Купоны' : currentLanguage === 'he' ? 'קופונים' : currentLanguage === 'ar' ? 'كوبونات' : 'Coupons'}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageTranslations") && (
                    <TabsTrigger value="translations" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.translations')}>
                      <Globe className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.translations')}</span>
                    </TabsTrigger>
                  )}
                  {isAdmin && (
                    <TabsTrigger value="notifications" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title="Push Уведомления">
                      <Bell className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">Push</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canViewSettings") && (
                    <TabsTrigger value="store-settings" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.settings')}>
                      <Settings className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.settings')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canViewSettings") && (
                    <TabsTrigger value="closed-dates" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.closedDates')}>
                      <CalendarIcon className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">{adminT('tabs.closedDates')}</span>
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
                    <TabsTrigger value="store-settings" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.settings')}>
                      <Settings className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.settings')}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canViewSettings") && (
                    <TabsTrigger value="closed-dates" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.closedDates')}>
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.closedDates')}</span>
                    </TabsTrigger>
                  )}
                  {isAdmin && (
                    <TabsTrigger value="notifications" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title="Push Уведомления">
                      <Bell className="w-4 h-4 ml-1" />
                      <span className="admin-tab-text">Push</span>
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
                  {isAdmin && branchesEnabled && (
                    <TabsTrigger value="branches" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.branches')}>
                      <Building2 className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.branches')}</span>
                    </TabsTrigger>
                  )}
                  {isAdmin && (
                    <TabsTrigger value="coupons" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={currentLanguage === 'ru' ? 'Купоны и лояльность' : currentLanguage === 'he' ? 'קופונים ונאמנות' : currentLanguage === 'ar' ? 'كوبونات والولاء' : 'Coupons & Loyalty'}>
                      <Tag className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{currentLanguage === 'ru' ? 'Купоны' : currentLanguage === 'he' ? 'קופונים' : currentLanguage === 'ar' ? 'كوبونات' : 'Coupons'}</span>
                    </TabsTrigger>
                  )}
                  {hasPermission("canManageTranslations") && (
                    <TabsTrigger value="translations" className="admin-tabs-trigger text-xs sm:text-sm whitespace-nowrap" title={adminT('tabs.translations')}>
                      <Globe className="w-4 h-4 mr-1" />
                      <span className="admin-tab-text">{adminT('tabs.translations')}</span>
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
                      <CategoryDropdown
                        value={selectedCategoryFilter}
                        onChange={setSelectedCategoryFilter}
                        options={buildCategoryOptions(
                          (categories as any[]) || [],
                          i18n.language,
                          storeSettings,
                          String(adminT('products.allCategories'))
                        )}
                        currentLanguage={i18n.language}
                        triggerClassName={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                    <div className="relative min-w-[160px]">
                      <Filter className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                        <SelectTrigger className={`text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'}`}>
                          <SelectValue placeholder={adminT('products.productStatus')} />
                        </SelectTrigger>
                        <SelectContent align="end" className="bg-white border border-gray-200 shadow-lg min-w-max">
                          <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">{adminT('products.allProducts')}</SelectItem>
                          <SelectItem value="available" className="text-gray-900 hover:bg-gray-100">{adminT('products.availableProducts')}</SelectItem>
                          <SelectItem value="unavailable" className="text-gray-900 hover:bg-gray-100">{adminT('products.unavailableProducts')}</SelectItem>
                          <SelectItem value="out_of_stock_today" className="text-gray-900 hover:bg-gray-100">{adminT('products.preorderProducts')}</SelectItem>
                          <SelectItem value="with_discount" className="text-gray-900 hover:bg-gray-100">{adminT('products.productsWithDiscount')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {branchesEnabled && (branches as any[]).filter((b: any) => b.isActive).length > 1 && (
                      <div className="relative min-w-[160px]">
                        <Building2 className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <Select value={selectedProductBranchFilter} onValueChange={setSelectedProductBranchFilter}>
                          <SelectTrigger className={`text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'}`}>
                            <SelectValue placeholder={adminT('branches.allBranches')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{adminT('branches.allBranches')}</SelectItem>
                            {(branches as any[]).filter((b: any) => b.isActive).map((b: any) => (
                              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Products Table */}
                {filteredProducts.length > 0 ? (
                  <div className={`border rounded-lg bg-white overflow-x-auto ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="table-container min-w-[600px] products">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {/* Dynamically order columns for RTL */}
                            {(isRTL || document.documentElement.lang === 'he' || document.documentElement.lang === 'ar') ? (
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
                                <TableHead className={`w-12 px-2 sm:px-4 text-xs sm:text-sm text-right hidden sm:table-cell`}>
                                  <button 
                                    onClick={() => handleSort("sortOrder")}
                                    className="flex items-center gap-1 hover:text-primary transition-colors flex-row-reverse"
                                  >
                                    {adminT('products.sortOrder')}
                                    {sortField === "sortOrder" && (
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
                                <TableHead className={`w-12 px-2 sm:px-4 text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'} hidden sm:table-cell`}>
                                  <button 
                                    onClick={() => handleSort("sortOrder")}
                                    className={`flex items-center gap-1 hover:text-primary transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                                  >
                                    {adminT('products.sortOrder')}
                                    {sortField === "sortOrder" && (
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
                            const displaySpecialOffer = optimisticSpecialOffers.has(product.id) ? optimisticSpecialOffers.get(product.id)! : !!product.isSpecialOffer;
                            const hasActiveVolumeDiscount = ((listVolumeDiscounts as any)?.[product.id] || []).some((d: any) => d.isActive);
                            const showStar = displaySpecialOffer;
                            // Get localized product name for display
                            const localizedName = getLocalizedField(product, 'name', currentLanguage as SupportedLanguage, 'ru');
                            // All branch availability records for this product (for mixed status display)
                            // Workers only see their own branches; admins can see allBranchAvailability for full picture
                            const allBranchRecords: any[] = branchesEnabled
                              ? (isAdmin
                                  ? (product.allBranchAvailability || product.branchAvailability || [])
                                  : (product.branchAvailability || []))
                              : [];
                            // For workers with branch availability data, use per-branch status
                            const workerBranchStatuses: any[] | null = branchesEnabled && !isAdmin && product.branchAvailability?.length > 0
                              ? product.branchAvailability
                              : null;
                            // For admins with a specific branch filter selected, show that branch's status
                            const adminBranchRecord = branchesEnabled && isAdmin && selectedProductBranchFilter !== 'all'
                              ? (product.branchAvailability || []).find((ba: any) => ba.branchId === parseInt(selectedProductBranchFilter)) || null
                              : null;
                            const effectiveStatus = adminBranchRecord
                              ? adminBranchRecord.availabilityStatus
                              : workerBranchStatuses
                                ? workerBranchStatuses[0].availabilityStatus
                                : product.availabilityStatus;
                            // Detect mixed statuses across branches (for status column indicator)
                            const hasMixedBranchStatuses = branchesEnabled && allBranchRecords.length > 1 &&
                              new Set(allBranchRecords.map((ba: any) => ba.availabilityStatus)).size > 1;
                            const showMixedIndicator = hasMixedBranchStatuses && selectedProductBranchFilter === 'all';
                            return (
                              <TableRow key={product.id} className={
                              effectiveStatus !== "available"
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
                                        onClick={() => openAvailabilityModal(product, effectiveStatus)}
                                        className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                                          effectiveStatus === "available"
                                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        }`}
                                        title={effectiveStatus === "available" 
                                          ? adminT('products.hideProduct') 
                                          : adminT('products.showProduct')
                                        }
                                      >
                                        {effectiveStatus === "available" 
                                          ? <Eye className="h-6 w-6" /> 
                                          : <EyeOff className="h-6 w-6" />
                                        }
                                      </Button>
                                      <button
                                        onClick={() => toggleSpecialOfferMutation.mutate({ id: product.id, isSpecialOffer: !displaySpecialOffer })}
                                        className={`h-8 w-8 p-0 rounded-lg text-xl leading-none transition-all duration-200 border-0 bg-transparent cursor-pointer flex items-center justify-center hover:bg-yellow-50 ${
                                          showStar ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                                        }`}
                                        title={adminT('products.productsWithDiscount')}
                                        type="button"
                                      >
                                        {showStar ? '★' : '☆'}
                                      </button>
                                      {effectiveStatus === "out_of_stock_today" && (
                                        <div className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md mt-1">
                                          {adminT('products.preorder')}
                                        </div>
                                      )}
                                      {workerBranchStatuses && workerBranchStatuses.length > 1 && workerBranchStatuses.slice(1).map((bs: any) => {
                                        const bName = (branches as any[]).find((b: any) => b.id === bs.branchId)?.name || `#${bs.branchId}`;
                                        return (
                                          <div key={bs.branchId} className={`inline-block px-1 py-0.5 text-xs rounded mt-0.5 ${bs.availabilityStatus === 'available' ? 'bg-green-100 text-green-700' : bs.availabilityStatus === 'out_of_stock_today' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`} title={`${bName}: ${bs.availabilityStatus}`}>
                                            {bName}
                                          </div>
                                        );
                                      })}
                                      {showMixedIndicator && (
                                        <div className="flex gap-1 flex-wrap justify-center mt-0.5">
                                          {allBranchRecords.map((ba: any) => {
                                            const bName = (branches as any[]).find((b: any) => b.id === ba.branchId)?.name || `#${ba.branchId}`;
                                            return (
                                              <span key={ba.branchId} title={`${bName}: ${ba.availabilityStatus}`} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${ba.availabilityStatus === 'available' ? 'bg-green-100 text-green-700' : ba.availabilityStatus === 'out_of_stock_today' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${ba.availabilityStatus === 'available' ? 'bg-green-500' : ba.availabilityStatus === 'out_of_stock_today' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                                                {bName}
                                              </span>
                                            );
                                          })}
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
                                      {(() => {
                                        const vd = ((listVolumeDiscounts as any)?.[product.id] || []).filter((d: any) => d.isActive);
                                        if (!vd.length) return null;
                                        const best = vd.reduce((a: any, b: any) => parseFloat(a.minQuantity) <= parseFloat(b.minQuantity) ? a : b);
                                        const pu = product.unit || '100g';
                                        const qty = (pu === '100g' || pu === '100ml') ? Math.round(parseFloat(best.minQuantity) * 100) : parseFloat(best.minQuantity);
                                        const sfx = adminT(`products.volumeDiscount.unitSuffix.${pu}`) || '';
                                        const dlbl = best.discountType === 'percentage' ? `${best.discountValue}%` : formatCurrency(parseFloat(best.discountValue));
                                        return <div className="mt-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded px-1.5 py-0.5 inline-block" dir="ltr">{adminT('products.volumeDiscount.discountWord')} {dlbl} {adminT('products.volumeDiscount.fromLabel')} {qty}{sfx}</div>;
                                      })()}
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
                                  <TableCell className="px-2 sm:px-4 py-2 text-center hidden sm:table-cell">
                                    <span className="text-xs text-gray-500 tabular-nums">{product.sortOrder ?? 0}</span>
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
                                      {(() => {
                                        const vd = ((listVolumeDiscounts as any)?.[product.id] || []).filter((d: any) => d.isActive);
                                        if (!vd.length) return null;
                                        const best = vd.reduce((a: any, b: any) => parseFloat(a.minQuantity) <= parseFloat(b.minQuantity) ? a : b);
                                        const pu = product.unit || '100g';
                                        const qty = (pu === '100g' || pu === '100ml') ? Math.round(parseFloat(best.minQuantity) * 100) : parseFloat(best.minQuantity);
                                        const sfx = adminT(`products.volumeDiscount.unitSuffix.${pu}`) || '';
                                        const dlbl = best.discountType === 'percentage' ? `${best.discountValue}%` : formatCurrency(parseFloat(best.discountValue));
                                        return <div className="mt-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded px-1.5 py-0.5 inline-block" dir="ltr">{adminT('products.volumeDiscount.discountWord')} {dlbl} {adminT('products.volumeDiscount.fromLabel')} {qty}{sfx}</div>;
                                      })()}
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-2 sm:px-4 py-2 text-center hidden sm:table-cell">
                                    <span className="text-xs text-gray-500 tabular-nums">{product.sortOrder ?? 0}</span>
                                  </TableCell>
                                  <TableCell className={`px-2 sm:px-4 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="flex flex-col gap-1 items-center justify-center">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openAvailabilityModal(product, effectiveStatus)}
                                        className={`h-10 w-10 p-0 rounded-lg transition-all duration-200 ${
                                          effectiveStatus === "available"
                                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                        }`}
                                        title={effectiveStatus === "available" 
                                          ? adminT('products.hideProduct') 
                                          : adminT('products.showProduct')
                                        }
                                      >
                                        {effectiveStatus === "available" 
                                          ? <Eye className="h-6 w-6" /> 
                                          : <EyeOff className="h-6 w-6" />
                                        }
                                      </Button>
                                      <button
                                        onClick={() => toggleSpecialOfferMutation.mutate({ id: product.id, isSpecialOffer: !displaySpecialOffer })}
                                        className={`h-8 w-8 p-0 rounded-lg text-xl leading-none transition-all duration-200 border-0 bg-transparent cursor-pointer flex items-center justify-center hover:bg-yellow-50 ${
                                          showStar ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                                        }`}
                                        title={adminT('products.productsWithDiscount')}
                                        type="button"
                                      >
                                        {showStar ? '★' : '☆'}
                                      </button>
                                      {effectiveStatus === "out_of_stock_today" && (
                                        <div className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md mt-1">
                                          {adminT('products.preorder')}
                                        </div>
                                      )}
                                      {workerBranchStatuses && workerBranchStatuses.length > 1 && workerBranchStatuses.slice(1).map((bs: any) => {
                                        const bName = (branches as any[]).find((b: any) => b.id === bs.branchId)?.name || `#${bs.branchId}`;
                                        return (
                                          <div key={bs.branchId} className={`inline-block px-1 py-0.5 text-xs rounded mt-0.5 ${bs.availabilityStatus === 'available' ? 'bg-green-100 text-green-700' : bs.availabilityStatus === 'out_of_stock_today' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`} title={`${bName}: ${bs.availabilityStatus}`}>
                                            {bName}
                                          </div>
                                        );
                                      })}
                                      {showMixedIndicator && (
                                        <div className="flex gap-1 flex-wrap justify-center mt-0.5">
                                          {allBranchRecords.map((ba: any) => {
                                            const bName = (branches as any[]).find((b: any) => b.id === ba.branchId)?.name || `#${ba.branchId}`;
                                            return (
                                              <span key={ba.branchId} title={`${bName}: ${ba.availabilityStatus}`} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${ba.availabilityStatus === 'available' ? 'bg-green-100 text-green-700' : ba.availabilityStatus === 'out_of_stock_today' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${ba.availabilityStatus === 'available' ? 'bg-green-500' : ba.availabilityStatus === 'out_of_stock_today' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                                                {bName}
                                              </span>
                                            );
                                          })}
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
                          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                          {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                          {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="flex flex-col gap-y-2">
                {/* Row 1: View toggle (left) + Create Order button (right) — side by side on sm+ */}
                <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', backgroundColor: '#f3f4f6', borderRadius: '8px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
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

                  {((storeSettings?.workerPermissions as any)?.canCreateOrders !== false) && (
                    <Button
                      onClick={() => setShowCreateOrderDialog(true)}
                      className={`sm:ml-auto bg-primary hover:bg-primary text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse sm:ml-0 sm:mr-auto' : ''}`}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      {adminT('orders.createOrder')}
                    </Button>
                  )}
                </div>

                {/* Row 2: Filters in a row on sm+, stacked on mobile — dropdowns together, search last */}
                <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  <Select value={ordersStatusFilter} onValueChange={setOrdersStatusFilter}>
                    <SelectTrigger className="sm:w-44 text-xs h-9">
                      <SelectValue placeholder={adminT('orders.filterOrders')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      <SelectItem value="active">{adminT('orders.activeOrders')}</SelectItem>
                      <SelectItem value="delivered">{adminT('orders.deliveredOrders')}</SelectItem>
                      <SelectItem value="cancelled">{adminT('orders.cancelledOrders')}</SelectItem>
                      <SelectItem value="all">{adminT('orders.allOrders')}</SelectItem>
                    </SelectContent>
                  </Select>

                  {branchesEnabled && (branches as any[]).filter((b: any) => b.isActive).length > 1 && (
                    <Select value={ordersBranchFilter} onValueChange={setOrdersBranchFilter}>
                      <SelectTrigger className="sm:w-40 text-xs h-9">
                        <SelectValue placeholder={adminT('branches.filterByBranch')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                        <SelectItem value="all">{adminT('branches.allBranches')}</SelectItem>
                        {(branches as any[]).map((branch: any) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className={`relative sm:flex-1 ${isRTL ? 'sm:mr-auto' : ''}`}>
                    <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                      placeholder={adminT('orders.searchOrders')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full h-9 ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9'}`}
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
                                  className={`text-xs sm:text-sm font-semibold ${isRTL ? 'text-right' : 'text-center'} w-24 sm:w-32`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >{adminT('orders.customer')}</TableHead>
                                <TableHead 
                                  className={`text-xs sm:text-sm hidden sm:table-cell font-semibold ${isRTL ? 'text-right' : 'text-center'} w-24 sm:w-32`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >{adminT('orders.statusHeader')}</TableHead>
                                <TableHead 
                                  className={`text-xs sm:text-sm font-semibold ${isRTL ? 'text-right' : 'text-center'} w-20 sm:w-32`}
                                  style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                >{adminT('orders.orderTotal')}</TableHead>
                                {branchesEnabled && (branches as any[]).filter((b: any) => b.isActive).length > 1 && (
                                  <TableHead 
                                    className={`text-xs sm:text-sm hidden sm:table-cell font-semibold ${isRTL ? 'text-right' : 'text-center'} w-20 sm:w-28`}
                                    style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                  >{adminT('branches.title')}</TableHead>
                                )}
                                <TableHead 
                                  className={`text-xs sm:text-sm table-cell font-semibold ${isRTL ? 'text-right' : 'text-center'} w-24 sm:w-36`}
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
                                        onClick={() => handleOrderEdit(order)}
                                        className="inline-flex items-center justify-center h-10 w-10 sm:h-8 sm:w-8 rounded-md bg-primary hover:bg-primary text-white border-2 border-orange-600 shadow-md transition-colors"
                                        title={adminT('orders.viewDetails')}
                                      >
                                        <Eye className="h-6 w-6 sm:h-5 sm:w-5" />
                                      </button>
                                    </div>
                                  </TableCell>
                                  <TableCell 
                                    className={`text-xs sm:text-sm ${isRTL ? 'text-right' : 'text-left'} w-24 sm:w-32 px-1 sm:px-3`}
                                    style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'left'}}
                                  >
                                    <div className="space-y-1">
                                      <div className="font-medium text-xs sm:text-sm">
                                        <div className="truncate">
                                          {order.user ? (
                                            order.user.firstName && order.user.lastName 
                                              ? `${order.user.firstName} ${order.user.lastName}`
                                              : order.user.email || "—"
                                          ) : order.guestName ? (
                                            order.guestName
                                          ) : "Гость"}
                                        </div>
                                        {!order.user && order.guestEmail && (
                                          <div className="text-xs text-blue-600 truncate">{order.guestEmail}</div>
                                        )}
                                      </div>
                                      {(order.customerPhone || order.guestPhone) && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="text-blue-600 text-xs sm:text-sm hover:text-blue-800 flex items-center gap-1 cursor-pointer truncate max-w-full">
                                              <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                              <span className="truncate">{order.customerPhone || order.guestPhone}</span>
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="start" className="w-40 bg-white border border-gray-200 shadow-lg">
                                            <DropdownMenuItem 
                                              onClick={() => window.location.href = `tel:${order.customerPhone || order.guestPhone}`}
                                              className="cursor-pointer text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                                            >
                                              <Phone className="h-4 w-4 mr-2" />
                                              {adminT('orders.call')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                const cleanPhone = (order.customerPhone || order.guestPhone).replace(/[^\d+]/g, '');
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
                                          setTimeout(() => {
                                            handleOrderCancellation(order.id);
                                          }, 100); // Small delay to let Select close properly first
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
                                      
                                      // Calculate delivery fee dynamically based on current store settings
                                      const calculateOrderDeliveryFee = (orderItems: any[]) => {
                                        if (!orderItems || orderItems.length === 0) return 0;
                                        
                                        const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
                                        const deliveryFee = parseFloat(storeSettings?.deliveryFee || "15.00");
                                        const freeDeliveryRaw2 = storeSettings?.freeDeliveryFrom;
                                        const freeDeliveryThreshold = (freeDeliveryRaw2 != null && String(freeDeliveryRaw2).trim() !== "") 
                                          ? parseFloat(String(freeDeliveryRaw2)) 
                                          : null;
                                        
                                        if (!freeDeliveryThreshold || isNaN(freeDeliveryThreshold) || freeDeliveryThreshold <= 0) {
                                          return deliveryFee;
                                        }
                                        return subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
                                      };
                                      
                                      const deliveryFee = calculateOrderDeliveryFee(order.items || []);
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
                                      } else if (deliveryFee === 0) {
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
                                  {branchesEnabled && (branches as any[]).filter((b: any) => b.isActive).length > 1 && (
                                    <TableCell
                                      className={`text-xs sm:text-sm hidden sm:table-cell ${isRTL ? 'text-right' : 'text-center'}`}
                                      style={isRTL ? {textAlign: 'right', direction: 'rtl'} : {textAlign: 'center'}}
                                    >
                                      {order.branchId && (
                                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                                          {(branches as any[]).find((b: any) => b.id === order.branchId)?.name || `#${order.branchId}`}
                                        </Badge>
                                      )}
                                    </TableCell>
                                  )}
                                  <TableCell 
                                    className={`text-sm sm:text-sm table-cell ${isRTL ? 'text-right' : 'text-center'}`}
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
                                            {new Date(order.deliveryDate).toLocaleDateString('ru-RU')} {formatDeliveryTimeRange(order.deliveryTime || '', commonT)}
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
                          <div className="flex items-center justify-center gap-2 pagination-controls">
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
                              {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                              {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                          <div className={`flex items-center gap-2 text-sm text-gray-700 pagination-controls ${isRTL ? 'text-right' : 'text-left'}`}>
                            <span>{adminT('common.showing')} {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} {adminT('common.of')} {ordersResponse.total}</span>
                          </div>
                          <div className={`flex items-center gap-2 pagination-controls ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                                  onEdit={handleOrderEdit}
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation}
                                  branchName={branchesEnabled && order.branchId ? (branches as any[]).find((b: any) => b.id === order.branchId)?.name : undefined}
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
                                  onEdit={handleOrderEdit}
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation}
                                  branchName={branchesEnabled && order.branchId ? (branches as any[]).find((b: any) => b.id === order.branchId)?.name : undefined}
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
                                  onEdit={handleOrderEdit}
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation}
                                  branchName={branchesEnabled && order.branchId ? (branches as any[]).find((b: any) => b.id === order.branchId)?.name : undefined}
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
                                  onEdit={handleOrderEdit}
                                  onStatusChange={updateOrderStatusMutation.mutate} 
                                  onCancelOrder={handleOrderCancellation}
                                  branchName={branchesEnabled && order.branchId ? (branches as any[]).find((b: any) => b.id === order.branchId)?.name : undefined}
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
                                    onEdit={handleOrderEdit}
                                    onStatusChange={updateOrderStatusMutation.mutate} 
                                    onCancelOrder={handleOrderCancellation}
                                    branchName={branchesEnabled && order.branchId ? (branches as any[]).find((b: any) => b.id === order.branchId)?.name : undefined}
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
                                    onEdit={handleOrderEdit}
                                    onStatusChange={updateOrderStatusMutation.mutate} 
                                    onCancelOrder={handleOrderCancellation}
                                    branchName={branchesEnabled && order.branchId ? (branches as any[]).find((b: any) => b.id === order.branchId)?.name : undefined}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Kanban view pagination - only show if in kanban mode */}
                    {ordersViewMode === "kanban" && ordersResponse?.totalPages > 1 && (
                      <div className="px-4 py-3 border-t bg-gray-50 mt-4">
                        {/* Mobile: Stack info and controls */}
                        <div className="sm:hidden space-y-2 px-4 py-3">
                          <div className="text-center text-xs text-gray-600">
                            {adminT('common.showing')} {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} {adminT('common.of')} {ordersResponse.total}
                          </div>
                          <div className="flex items-center justify-center gap-2 pagination-controls">
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
                              {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                              {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                          <div className="flex items-center gap-2 text-sm text-gray-700 pagination-controls">
                            <span>{adminT('common.showing')} {((ordersResponse.page - 1) * ordersResponse.limit) + 1}-{Math.min(ordersResponse.page * ordersResponse.limit, ordersResponse.total)} {adminT('common.of')} {ordersResponse.total}</span>
                          </div>
                          <div className="flex items-center gap-2 pagination-controls">
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
                              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
              <DialogContent
                className="max-w-4xl max-h-[90vh] overflow-y-auto"
                onPointerDownOutside={(e) => {
                  if (document.getElementById('order-print-overlay')) e.preventDefault();
                }}
                onInteractOutside={(e) => {
                  if (document.getElementById('order-print-overlay')) e.preventDefault();
                }}
              >
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
                    tCommon={commonT}
                    isRTL={isRTL}
                    isAdmin={isAdmin}
                    branchesEnabled={branchesEnabled}
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
                <div className={`flex flex-col gap-3 mb-6 ${isRTL ? '' : ''}`}>
                  {/* Button and Filter - stacked on mobile, inline on larger screens */}
                  <div className={`flex flex-col sm:flex-row gap-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <Button 
                      onClick={() => setIsUserFormOpen(true)}
                      className={`bg-primary hover:bg-primary text-white flex items-center gap-2 w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {adminT('users.createUser')}
                    </Button>
                    <Select value={usersRoleFilter} onValueChange={setUsersRoleFilter}>
                      <SelectTrigger className="w-full sm:w-40">
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
                  // Backend already returns paginated data, no need for frontend slicing
                  const filteredUsers = usersData as any[] || [];

                  const usersTotal = usersResponse?.total || 0;
                  const usersTotalPages = usersResponse?.totalPages || 0;

                  return filteredUsers.length > 0 ? (
                    <div className={`border border-gray-100 rounded-lg bg-white overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className={`overflow-x-auto table-auto-scroll ${isRTL ? 'rtl-scroll-container' : ''}`}>
                      <Table className={`w-full users-table ${isRTL ? 'rtl' : 'ltr'}`}>
                        <TableHeader className="bg-gray-50">
                          <TableRow className="border-b border-gray-100" dir={isRTL ? 'rtl' : 'ltr'}>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.name')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.role')}</TableHead>
                            {branchesEnabled && (branches as any[]).length > 0 && (
                              <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'} hidden sm:table-cell`}>{adminT('branches.title')}</TableHead>
                            )}
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.phone')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.orders')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.totalAmount')}</TableHead>
                            <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('table.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user: any) => (
                            <TableRow key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
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
                              {branchesEnabled && (branches as any[]).length > 0 && (
                                <TableCell className="px-3 py-3 rtl-cell hidden sm:table-cell">
                                  {user.role === 'worker' ? (
                                    <div className="flex flex-wrap gap-1">
                                      {(user.branchIds || []).length === 0 ? (
                                        <span className="text-xs text-gray-400">{adminT('branches.allBranches')}</span>
                                      ) : (
                                        (user.branchIds || []).map((bId: number) => {
                                          const branch = (branches as any[]).find((b: any) => b.id === bId);
                                          return branch ? (
                                            <Badge key={bId} variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 text-xs">
                                              {branch.name}
                                            </Badge>
                                          ) : null;
                                        })
                                      )}
                                    </div>
                                  ) : user.role === 'customer' && (user.customerBranchIds || []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {(user.customerBranchIds || []).map((bId: number) => {
                                        const branch = (branches as any[]).find((b: any) => b.id === bId);
                                        return branch ? (
                                          <Badge key={bId} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-xs">
                                            {branch.name}
                                          </Badge>
                                        ) : null;
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
                                </TableCell>
                              )}
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
                              <TableCell className="px-3 py-3 text-sm rtl-cell">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  title={adminT('actions.delete')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                      <div className="flex items-center justify-center gap-2 pagination-controls">
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
                          {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                          {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                    <div className={`hidden sm:flex items-center justify-between px-4 py-3 border-t bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-2 text-sm text-gray-700 pagination-controls ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span>{adminT('common.showing')} {((usersPage - 1) * itemsPerPage) + 1}-{Math.min(usersPage * itemsPerPage, usersTotal)} {adminT('common.of')} {usersTotal}</span>
                      </div>
                      <div className={`flex items-center gap-2 pagination-controls ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(1)}
                          disabled={usersPage === 1}
                          title={adminT('common.firstPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          ⟨⟨
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                          disabled={usersPage === 1}
                          title={adminT('common.previousPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                        <span className="text-sm font-medium px-3 py-1 bg-white border border-primary rounded h-8 flex items-center" dir="ltr">
                          {usersPage} {adminT('common.of')} {usersTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                          disabled={usersPage >= usersTotalPages}
                          title={adminT('common.nextPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
                        >
                          {(i18n.language === 'he' || i18n.language === 'ar') ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(usersTotalPages)}
                          disabled={usersPage >= usersTotalPages}
                          title={adminT('common.lastPage')}
                          className="h-8 px-3 bg-white border-primary text-primary hover:bg-primary hover:text-white focus:ring-0 focus:ring-offset-0"
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

          {/* Store Settings */}
          {hasPermission("canManageSettings") && (
            <TabsContent value="store-settings" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Settings className="h-5 w-5" />
                      {currentLanguage === 'ru' && 'Настройки магазина'}
                      {currentLanguage === 'en' && 'Store Settings'}
                      {currentLanguage === 'he' && 'הגדרות חנות'}
                      {currentLanguage === 'ar' && 'إعدادات المتجر'}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLanguage === 'ru' && 'Управление основными настройками магазина, контактной информацией и внешним видом'}
                      {currentLanguage === 'en' && 'Manage basic store settings, contact information and appearance'}
                      {currentLanguage === 'he' && 'ניהול הגדרות בסיסיות של החנות, מידע ליצירת קשר ומראה חיצוני'}
                      {currentLanguage === 'ar' && 'إدارة إعدادات المتجر الأساسية ومعلومات الاتصال والمظهر'}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <StoreSettingsForm 
                    storeSettings={storeSettings} 
                    onSubmit={(data) => updateStoreSettingsMutation.mutate(data)}
                    isLoading={updateStoreSettingsMutation.isPending}
                    testEmailMutation={testEmailMutation}
                  />
                </CardContent>
              </Card>
              
              {/* Loyalty Settings Section */}
              <LoyaltySettingsCard isRTL={isRTL} currentLanguage={currentLanguage} />

              {/* System Management Section */}
              <Card>
                <CardHeader>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Settings className="h-5 w-5" />
                      {(() => {
                        const systemSettingsText = adminT('settings.systemSettings');
                        console.log('Admin Dashboard - systemSettings translation:', {
                          key: 'settings.systemSettings',
                          result: systemSettingsText,
                          currentLanguage: i18n.language,
                          adminTFunction: typeof adminT
                        });
                        return systemSettingsText;
                      })()}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {(() => {
                        const systemDescriptionText = adminT('settings.systemDescription');
                        console.log('Admin Dashboard - systemDescription translation:', {
                          key: 'settings.systemDescription',
                          result: systemDescriptionText,
                          currentLanguage: i18n.language
                        });
                        return systemDescriptionText;
                      })()}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cache Management Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{(() => {
                      const cacheManagementText = adminT('settings.cacheManagement');
                      console.log('Admin Dashboard - cacheManagement translation:', {
                        key: 'settings.cacheManagement',
                        result: cacheManagementText,
                        currentLanguage: i18n.language
                      });
                      return cacheManagementText;
                    })()}</h3>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        const cacheDescriptionText = adminT('settings.cacheDescription');
                        console.log('Admin Dashboard - cacheDescription translation:', {
                          key: 'settings.cacheDescription',
                          result: cacheDescriptionText,
                          currentLanguage: i18n.language
                        });
                        return cacheDescriptionText;
                      })()}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <AdminCacheBuster />
                      <p className="text-xs text-gray-500">
                        {adminT('settings.cacheUsage')}
                      </p>
                    </div>
                  </div>

                  {/* Image Optimization Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">📸 {(() => {
                      const imageOptimizationText = adminT('settings.imageOptimization');
                      console.log('Admin Dashboard - imageOptimization translation:', {
                        key: 'settings.imageOptimization',
                        result: imageOptimizationText,
                        currentLanguage: i18n.language
                      });
                      return imageOptimizationText;
                    })()}</h3>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        const imageOptimizationDescriptionText = adminT('settings.imageOptimizationDescription');
                        console.log('Admin Dashboard - imageOptimizationDescription translation:', {
                          key: 'settings.imageOptimizationDescription',
                          result: imageOptimizationDescriptionText,
                          currentLanguage: i18n.language
                        });
                        return imageOptimizationDescriptionText;
                      })()}
                    </p>
                    
                    {optimizationResults && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-green-800 mb-2">{adminT('settings.lastOptimizationResults')}:</h4>
                        <div className="text-sm text-green-700 space-y-1">
                          <p>• {adminT('settings.processed')}: {optimizationResults.processed} {adminT('settings.of')} {optimizationResults.totalFiles} {adminT('settings.images')}</p>
                          <p>• {adminT('settings.errors')}: {optimizationResults.errors}</p>
                          <p>• {adminT('settings.spaceSavings')}: {optimizationResults.totalSavingsMB} MB ({optimizationResults.totalSavingsKB} KB)</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <Button
                        onClick={() => optimizeImagesMutation.mutate()}
                        disabled={isOptimizingImages}
                        variant="outline"
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        {isOptimizingImages ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {adminT('settings.optimizing')}...
                          </>
                        ) : (
                          <>
                            <Image className="h-4 w-4" />
                            {adminT('settings.optimizeAllImages')}
                          </>
                        )}
                      </Button>
                      <div className="text-xs text-gray-500">
                        {adminT('settings.optimizationDetails')}
                      </div>
                    </div>
                  </div>

                  {/* Barcode System Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">🏷️ {adminT('barcode.title')}</h3>
                    <p className="text-sm text-gray-600">
                      {adminT('barcode.description')}
                    </p>
                    
                    <BarcodeConfigSection />
                  </div>

                  {/* Translation Export/Import Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">🌐 {adminT('translationManagement.translationManagement')}</h3>
                    <p className="text-sm text-gray-600">
                      {adminT('translationManagement.translationManagementDescription')}
                    </p>

                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">{adminT('translationManagement.translationManagement')}</p>
                      <p className="text-sm text-gray-500">{adminT('translationManagement.manageAllTranslations')}</p>
                    </div>

                    <input
                      ref={translationFileInputRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedTranslationFile(file);
                      }}
                    />

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'direction-rtl' : ''}`}>
                      {/* Export card */}
                      <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Download className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                          <span className="font-semibold text-gray-900">{adminT('translationManagement.exportTranslations')}</span>
                        </div>
                        <p className="text-sm text-gray-500">{adminT('translationManagement.downloadAllTranslations')}</p>
                        <div className={`flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-blue-700 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{adminT('translationManagement.exportInfo')}</span>
                        </div>
                        <a
                          href="/api/translations/export"
                          download="translations.xlsx"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                          <Download className="h-4 w-4" />
                          {adminT('translationManagement.exportToExcel')}
                        </a>
                      </div>

                      {/* Import card */}
                      <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Upload className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                          <span className="font-semibold text-gray-900">{adminT('translationManagement.importTranslations')}</span>
                        </div>
                        <p className="text-sm text-gray-500">{adminT('translationManagement.uploadTranslationsFile')}</p>
                        <div className={`flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-md p-3 text-sm text-amber-700 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{currentLanguage === 'en' ? 'Existing translations will be overwritten.' : currentLanguage === 'he' ? 'תרגומים קיימים יוחלפו.' : currentLanguage === 'ar' ? 'سيتم استبدال الترجمات الموجودة.' : 'Существующие переводы будут перезаписаны.'}</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">{adminT('translationManagement.selectFile')}</p>
                          <button
                            type="button"
                            onClick={() => translationFileInputRef.current?.click()}
                            className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <Upload className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{selectedTranslationFile ? selectedTranslationFile.name : (currentLanguage === 'en' ? 'No file chosen' : currentLanguage === 'he' ? 'לא נבחר קובץ' : currentLanguage === 'ar' ? 'لم يتم اختيار ملف' : 'Файл не выбран')}</span>
                          </button>
                        </div>
                        <Button
                          onClick={async () => {
                            if (!selectedTranslationFile) return;
                            setIsImportingTranslations(true);
                            try {
                              const formData = new FormData();
                              formData.append('file', selectedTranslationFile);
                              const resp = await fetch('/api/translations/import', {
                                method: 'POST',
                                body: formData,
                                credentials: 'include',
                              });
                              const data = await resp.json();
                              if (resp.ok) {
                                toast({ title: adminT('translationManagement.importSuccess'), description: adminT('translationManagement.translationsImported').replace('{count}', String(data.importedRows)) });
                                setSelectedTranslationFile(null);
                                if (translationFileInputRef.current) translationFileInputRef.current.value = '';
                              } else {
                                toast({ title: adminT('translationManagement.importError'), description: data.message, variant: 'destructive' });
                              }
                            } catch {
                              toast({ title: adminT('translationManagement.importError'), description: adminT('translationManagement.importFailed'), variant: 'destructive' });
                            } finally {
                              setIsImportingTranslations(false);
                            }
                          }}
                          disabled={isImportingTranslations || !selectedTranslationFile}
                          className="w-full flex items-center justify-center gap-2"
                          variant="outline"
                        >
                          {isImportingTranslations ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />{adminT('translationManagement.importing')}</>
                          ) : (
                            <><Upload className="h-4 w-4" />{adminT('translationManagement.importFile')}</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Catalog Import ─────────────────────────────────── */}
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Store className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                    {currentLanguage === 'en' ? 'Catalog Import' : currentLanguage === 'he' ? 'ייבוא קטלוג' : currentLanguage === 'ar' ? 'استيراد الكتالوج' : 'Импорт каталога'}
                  </CardTitle>
                  <CardDescription>
                    {currentLanguage === 'en' ? 'Import categories and products from Wolt or 10bis' : currentLanguage === 'he' ? 'ייבוא קטגוריות ומוצרים מ-Wolt או 10bis' : currentLanguage === 'ar' ? 'استيراد الفئات والمنتجات من Wolt أو 10bis' : 'Импорт категорий и товаров из Wolt или 10bis'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`flex items-start gap-4 flex-col sm:flex-row ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {currentLanguage === 'en'
                          ? 'Quickly import your entire menu — categories and products with photos and prices — from your restaurant page on Wolt or 10bis.'
                          : currentLanguage === 'he'
                          ? 'ייבוא מהיר של כל התפריט — קטגוריות ומוצרים עם תמונות ומחירים — מדף המסעדה שלכם ב-Wolt או 10bis.'
                          : currentLanguage === 'ar'
                          ? 'استورد قائمتك بالكامل بسرعة — الفئات والمنتجات مع الصور والأسعار — من صفحة مطعمك على Wolt أو 10bis.'
                          : 'Быстро импортируйте всё меню — категории и товары с фотографиями и ценами — со страницы вашего ресторана в Wolt или 10bis.'}
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowCatalogImportModal(true)}
                      className="flex-shrink-0 flex items-center gap-2"
                      style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                    >
                      <Store className="h-4 w-4" />
                      {currentLanguage === 'en' ? 'Import from Wolt / 10bis' : currentLanguage === 'he' ? 'ייבוא מ-Wolt / 10bis' : currentLanguage === 'ar' ? 'استيراد من Wolt / 10bis' : 'Импортировать из Wolt / 10bis'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <CatalogImportModal
                open={showCatalogImportModal}
                onClose={() => setShowCatalogImportModal(false)}
                currentLanguage={currentLanguage}
                isRTL={isRTL}
              />

              {/* ── Danger Zone (admin only) ──────────────────────────── */}
              {user?.role === 'admin' && (
                <Card className="border-2 border-red-200">
                  <CardHeader>
                    <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 text-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <AlertTriangle className="h-5 w-5" />
                      {currentLanguage === 'en' ? 'Danger Zone' : currentLanguage === 'he' ? 'אזור מסוכן' : currentLanguage === 'ar' ? 'منطقة الخطر' : 'Опасная зона'}
                    </CardTitle>
                    <CardDescription className="text-red-600">
                      {currentLanguage === 'en' ? 'Irreversible bulk delete operations. Cannot be undone.' : currentLanguage === 'he' ? 'פעולות מחיקה בלתי הפיכות. לא ניתן לשחזר.' : currentLanguage === 'ar' ? 'عمليات حذف جماعي لا يمكن التراجع عنها.' : 'Необратимые операции массового удаления. Отменить невозможно.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Delete all orders */}
                      <div className="flex flex-col gap-1 p-4 rounded-lg bg-red-50 border border-red-100">
                        <span className="font-semibold text-gray-900 text-sm">
                          {currentLanguage === 'en' ? 'Delete all orders' : currentLanguage === 'he' ? 'מחק את כל ההזמנות' : currentLanguage === 'ar' ? 'حذف كل الطلبات' : 'Удалить все заказы'}
                        </span>
                        <span className="text-xs text-gray-500 mb-2">
                          {currentLanguage === 'en' ? 'Removes all orders and their items' : currentLanguage === 'he' ? 'מסיר את כל ההזמנות ופריטיהן' : currentLanguage === 'ar' ? 'يزيل جميع الطلبات وعناصرها' : 'Удаляет все заказы и позиции в них'}
                        </span>
                        <Button variant="destructive" size="sm" onClick={() => { setDangerDialog("orders"); setDangerConfirm(""); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {currentLanguage === 'en' ? 'Delete orders' : currentLanguage === 'he' ? 'מחק הזמנות' : currentLanguage === 'ar' ? 'حذف الطلبات' : 'Удалить заказы'}
                        </Button>
                      </div>

                      {/* Delete all users */}
                      <div className="flex flex-col gap-1 p-4 rounded-lg bg-red-50 border border-red-100">
                        <span className="font-semibold text-gray-900 text-sm">
                          {currentLanguage === 'en' ? 'Delete all users' : currentLanguage === 'he' ? 'מחק את כל המשתמשים' : currentLanguage === 'ar' ? 'حذف كل المستخدمين' : 'Удалить всех пользователей'}
                        </span>
                        <span className="text-xs text-gray-500 mb-2">
                          {currentLanguage === 'en' ? 'Removes all users (except you), their orders and addresses' : currentLanguage === 'he' ? 'מסיר משתמשים, הזמנותיהם וכתובותיהם (מלבדך)' : currentLanguage === 'ar' ? 'يزيل المستخدمين وطلباتهم وعناوينهم (إلا أنت)' : 'Удаляет всех пользователей, их заказы и адреса (кроме вас)'}
                        </span>
                        <Button variant="destructive" size="sm" onClick={() => { setDangerDialog("users"); setDangerConfirm(""); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {currentLanguage === 'en' ? 'Delete users' : currentLanguage === 'he' ? 'מחק משתמשים' : currentLanguage === 'ar' ? 'حذف المستخدمين' : 'Удалить пользователей'}
                        </Button>
                      </div>

                      {/* Delete all products */}
                      <div className="flex flex-col gap-1 p-4 rounded-lg bg-red-50 border border-red-100">
                        <span className="font-semibold text-gray-900 text-sm">
                          {currentLanguage === 'en' ? 'Delete all products' : currentLanguage === 'he' ? 'מחק את כל המוצרים' : currentLanguage === 'ar' ? 'حذف كل المنتجات' : 'Удалить все товары'}
                        </span>
                        <span className="text-xs text-gray-500 mb-2">
                          {currentLanguage === 'en' ? 'Removes all products and order history' : currentLanguage === 'he' ? 'מסיר את כל המוצרים והזמנות' : currentLanguage === 'ar' ? 'يزيل كل المنتجات وسجل الطلبات' : 'Удаляет все товары и историю заказов'}
                        </span>
                        <Button variant="destructive" size="sm" onClick={() => { setDangerDialog("products"); setDangerConfirm(""); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {currentLanguage === 'en' ? 'Delete products' : currentLanguage === 'he' ? 'מחק מוצרים' : currentLanguage === 'ar' ? 'حذف المنتجات' : 'Удалить товары'}
                        </Button>
                      </div>

                      {/* Delete all categories */}
                      <div className="flex flex-col gap-1 p-4 rounded-lg bg-red-50 border border-red-100">
                        <span className="font-semibold text-gray-900 text-sm">
                          {currentLanguage === 'en' ? 'Delete all categories' : currentLanguage === 'he' ? 'מחק את כל הקטגוריות' : currentLanguage === 'ar' ? 'حذف كل الفئات' : 'Удалить все категории'}
                        </span>
                        <span className="text-xs text-gray-500 mb-2">
                          {currentLanguage === 'en' ? 'Removes all categories (products kept)' : currentLanguage === 'he' ? 'מסיר את כל הקטגוריות (מוצרים נשמרים)' : currentLanguage === 'ar' ? 'يزيل كل الفئات (تبقى المنتجات)' : 'Удаляет все категории (товары сохраняются)'}
                        </span>
                        <Button variant="destructive" size="sm" onClick={() => { setDangerDialog("categories"); setDangerConfirm(""); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {currentLanguage === 'en' ? 'Delete categories' : currentLanguage === 'he' ? 'מחק קטגוריות' : currentLanguage === 'ar' ? 'حذف الفئات' : 'Удалить категории'}
                        </Button>
                      </div>

                      {/* Delete push history */}
                      <div className="flex flex-col gap-1 p-4 rounded-lg bg-red-50 border border-red-100">
                        <span className="font-semibold text-gray-900 text-sm">
                          {currentLanguage === 'en' ? 'Delete push notification history' : currentLanguage === 'he' ? 'מחק היסטוריית התראות' : currentLanguage === 'ar' ? 'حذف سجل الإشعارات' : 'Удалить историю push-уведомлений'}
                        </span>
                        <span className="text-xs text-gray-500 mb-2">
                          {currentLanguage === 'en' ? 'Clears all sent notifications and subscriptions' : currentLanguage === 'he' ? 'מנקה את כל ההתראות שנשלחו והמנויים' : currentLanguage === 'ar' ? 'يمسح جميع الإشعارات المرسلة والاشتراكات' : 'Очищает историю рассылок и все подписки на уведомления'}
                        </span>
                        <Button variant="destructive" size="sm" onClick={() => { setDangerDialog("push"); setDangerConfirm(""); }}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {currentLanguage === 'en' ? 'Delete push history' : currentLanguage === 'he' ? 'מחק היסטוריה' : currentLanguage === 'ar' ? 'حذف السجل' : 'Удалить историю push'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Danger Zone Confirmation Dialog */}
              <Dialog open={dangerDialog !== null} onOpenChange={(open) => { if (!open) { setDangerDialog(null); setDangerConfirm(""); } }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      {currentLanguage === 'en' ? 'Confirm deletion' : currentLanguage === 'he' ? 'אשר מחיקה' : currentLanguage === 'ar' ? 'تأكيد الحذف' : 'Подтвердите удаление'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-700 pt-1">
                      {dangerDialog === 'orders' && (currentLanguage === 'en' ? 'This will permanently delete ALL orders and order items. This cannot be undone.' : currentLanguage === 'he' ? 'פעולה זו תמחק לצמיתות את כל ההזמנות. לא ניתן לשחזר.' : currentLanguage === 'ar' ? 'سيتم حذف جميع الطلبات نهائياً. لا يمكن التراجع.' : 'Это БЕЗВОЗВРАТНО удалит ВСЕ заказы и их состав. Отменить невозможно.')}
                      {dangerDialog === 'users' && (currentLanguage === 'en' ? 'This will permanently delete ALL users except your current account.' : currentLanguage === 'he' ? 'פעולה זו תמחק לצמיתות את כל המשתמשים מלבד החשבון שלך.' : currentLanguage === 'ar' ? 'سيتم حذف جميع المستخدمين إلا حسابك الحالي نهائياً.' : 'Это БЕЗВОЗВРАТНО удалит ВСЕХ пользователей, кроме вашего аккаунта.')}
                      {dangerDialog === 'products' && (currentLanguage === 'en' ? 'This will permanently delete ALL products, and also all orders (required by database constraints).' : currentLanguage === 'he' ? 'פעולה זו תמחק לצמיתות את כל המוצרים וההזמנות.' : currentLanguage === 'ar' ? 'سيتم حذف جميع المنتجات والطلبات نهائياً.' : 'Это БЕЗВОЗВРАТНО удалит ВСЕ товары, а также все заказы (требование базы данных).')}
                      {dangerDialog === 'categories' && (currentLanguage === 'en' ? 'This will permanently delete ALL categories. Products will remain but lose their category assignments.' : currentLanguage === 'he' ? 'פעולה זו תמחק לצמיתות את כל הקטגוריות. מוצרים יישמרו ללא קטגוריה.' : currentLanguage === 'ar' ? 'سيتم حذف كل الفئات. تبقى المنتجات بدون فئات.' : 'Это БЕЗВОЗВРАТНО удалит ВСЕ категории. Товары сохранятся, но без категорий.')}
                      {dangerDialog === 'push' && (currentLanguage === 'en' ? 'This will permanently delete ALL push notification history and ALL subscriber subscriptions. Users will need to re-subscribe.' : currentLanguage === 'he' ? 'פעולה זו תמחק לצמיתות את כל היסטוריית ההתראות ואת כל המנויים. המשתמשים יצטרכו להירשם מחדש.' : currentLanguage === 'ar' ? 'سيتم حذف سجل الإشعارات بالكامل وجميع اشتراكات المستخدمين نهائياً. يجب عليهم الاشتراك مجدداً.' : 'Это БЕЗВОЗВРАТНО удалит всю историю рассылок и ВСЕ подписки пользователей. Им придётся подписаться заново.')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <p className="text-sm font-medium text-gray-700">
                      {currentLanguage === 'en' ? 'Type DELETE to confirm:' : currentLanguage === 'he' ? 'הקלד УДАЛИТЬ לאישור:' : currentLanguage === 'ar' ? 'اكتب УДАЛИТЬ للتأكيد:' : 'Введите УДАЛИТЬ для подтверждения:'}
                    </p>
                    <Input
                      value={dangerConfirm}
                      onChange={e => setDangerConfirm(e.target.value)}
                      placeholder="УДАЛИТЬ"
                      className="border-red-300 focus:border-red-500"
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setDangerDialog(null); setDangerConfirm(""); }}>
                      {currentLanguage === 'en' ? 'Cancel' : currentLanguage === 'he' ? 'ביטול' : currentLanguage === 'ar' ? 'إلغاء' : 'Отмена'}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={dangerConfirm !== "УДАЛИТЬ" || dangerMutation.isPending}
                      onClick={() => dangerDialog && dangerMutation.mutate(dangerDialog)}
                    >
                      {dangerMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                      {currentLanguage === 'en' ? 'Delete permanently' : currentLanguage === 'he' ? 'מחק לצמיתות' : currentLanguage === 'ar' ? 'حذف نهائي' : 'Удалить безвозвратно'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {/* Closed Dates Management */}
          {hasPermission("canViewSettings") && (
            <TabsContent value="closed-dates" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <CalendarIcon className="h-5 w-5" />
                      {adminT('closedDates.title')}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {adminT('closedDates.description')}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ClosedDatesManager />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Push Notifications Management */}
          {user?.role === 'admin' && (
            <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Bell className="h-5 w-5" />
                      Push Уведомления
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      Управление push уведомлениями для пользователей
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <PushNotificationsPanel />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Worker Access Rights Management */}
          {hasPermission("canManageSettings") && (
            <TabsContent value="settings" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <UserCheck className="h-5 w-5" />
                      {currentLanguage === 'ru' && 'Права доступа работников'}
                      {currentLanguage === 'en' && 'Worker Access Rights'}
                      {currentLanguage === 'he' && 'הרשאות גישה לעובדים'}
                      {currentLanguage === 'ar' && 'صلاحيات الوصول للعمال'}
                    </CardTitle>
                    <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLanguage === 'ru' && 'Управление доступом работников к различным разделам системы'}
                      {currentLanguage === 'en' && 'Manage worker access to different system sections'}
                      {currentLanguage === 'he' && 'ניהול גישת עובדים לחלקים שונים של המערכת'}
                      {currentLanguage === 'ar' && 'إدارة وصول العمال إلى أقسام النظام المختلفة'}
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
                      
                      {/* Order Creation Toggle */}
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <label className="text-sm font-medium">{adminT('systemSettings.canCreateOrders')}</label>
                          <p className="text-xs text-gray-500">{adminT('systemSettings.canCreateOrdersDescription')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canCreateOrders: !((storeSettings?.workerPermissions as any)?.canCreateOrders || false)
                              }
                            })
                          }
                          className="h-8 w-8 p-0"
                        >
                          {(storeSettings?.workerPermissions as any)?.canCreateOrders ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>

                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <label className="text-sm font-medium">{adminT('systemSettings.canManageTranslations')}</label>
                          <p className="text-xs text-gray-500">{adminT('systemSettings.canManageTranslationsDescription')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStoreSettingsMutation.mutate({
                              workerPermissions: {
                                ...(storeSettings?.workerPermissions || {}),
                                canManageTranslations: !((storeSettings?.workerPermissions as any)?.canManageTranslations || false)
                              }
                            })
                          }
                          className="h-8 w-8 p-0"
                        >
                          {(storeSettings?.workerPermissions as any)?.canManageTranslations ? (
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

          {/* Translation Management */}
          {hasPermission("canManageTranslations") && (
            <TabsContent value="translations" className="space-y-4 sm:space-y-6">
              <TranslationManager />
            </TabsContent>
          )}

          {/* Branches Management */}
          {isAdmin && branchesEnabled && (
            <TabsContent value="branches" className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <CardTitle className={`flex items-center gap-2 text-lg sm:text-xl ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        {adminT('branches.title')}
                      </CardTitle>
                      <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {adminT('branches.description')}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingBranch(null);
                        setBranchFormName('');
                        setBranchFormNameEn('');
                        setBranchFormNameHe('');
                        setBranchFormNameAr('');
                        setBranchFormIsActive(true);
                        setBranchFormSortOrder((branches as any[]).length + 1);
                        setIsBranchFormOpen(true);
                      }}
                      disabled={branchMaxAllowed !== null && (branches as any[]).length >= branchMaxAllowed}
                      title={branchMaxAllowed !== null && (branches as any[]).length >= branchMaxAllowed
                        ? adminT('branches.limitReached').replace('{max}', String(branchMaxAllowed))
                        : undefined}
                      className={`bg-primary hover:bg-primary text-white flex items-center gap-2 w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {branchMaxAllowed !== null && (branches as any[]).length >= branchMaxAllowed
                        ? adminT('branches.limitReached').replace('{max}', String(branchMaxAllowed))
                        : adminT('branches.createBranch')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(branches as any[]).length === 0 ? (
                    <p className={`text-gray-500 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('branches.noBranches')}</p>
                  ) : (
                    <div className={`border border-gray-100 rounded-lg bg-white overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <div className="overflow-x-auto">
                        <Table className="w-full">
                          <TableHeader className="bg-gray-50">
                            <TableRow className="border-b border-gray-100">
                              <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('branches.sortOrder')}</TableHead>
                              <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('branches.name')}</TableHead>
                              <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('branches.status')}</TableHead>
                              <TableHead className={`px-3 py-3 text-xs font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('branches.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(branches as any[]).map((branch: any) => (
                              <TableRow key={branch.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <TableCell className="px-3 py-3 text-sm text-gray-600">{branch.sortOrder}</TableCell>
                                <TableCell className="px-3 py-3 text-sm font-medium">{branch.name}</TableCell>
                                <TableCell className="px-3 py-3">
                                  <Badge variant="outline" className={branch.isActive ? "border-green-200 text-green-700 bg-green-50 text-xs" : "border-gray-200 text-gray-500 bg-gray-50 text-xs"}>
                                    {branch.isActive ? adminT('branches.active') : adminT('branches.inactive')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-3 py-3">
                                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => {
                                        setEditingBranch(branch);
                                        setBranchFormName(branch.name);
                                        setBranchFormNameEn(branch.nameEn || '');
                                        setBranchFormNameHe(branch.nameHe || '');
                                        setBranchFormNameAr(branch.nameAr || '');
                                        setBranchFormIsActive(branch.isActive);
                                        setBranchFormSortOrder(branch.sortOrder);
                                        setIsBranchFormOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={async () => {
                                        setBranchDeleteTarget(branch);
                                        setBranchDeleteTransferTo('none');
                                        setBranchDeleteOrderCountLoading(true);
                                        setIsBranchDeleteDialogOpen(true);
                                        try {
                                          const res = await fetch(`/api/admin/branches/${branch.id}/order-count`);
                                          const data = await res.json();
                                          setBranchDeleteOrderCount(data.count || 0);
                                        } catch {
                                          setBranchDeleteOrderCount(0);
                                        } finally {
                                          setBranchDeleteOrderCountLoading(false);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
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
                </CardContent>
              </Card>

              {/* Branch Create/Edit Dialog */}
              <Dialog open={isBranchFormOpen} onOpenChange={(open) => { if (!open) setIsBranchFormOpen(false); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                      {editingBranch ? adminT('branches.editBranch') : adminT('branches.createBranch')}
                    </DialogTitle>
                  </DialogHeader>
                  {(() => {
                    const branchDefaultLang = (storeSettings as any)?.defaultLanguage || 'ru';
                    const branchLangMap: Record<string, { value: string; onChange: (v: string) => void; dir: string; code: string }> = {
                      ru: { value: branchFormName, onChange: setBranchFormName, dir: 'ltr', code: 'RU' },
                      en: { value: branchFormNameEn, onChange: setBranchFormNameEn, dir: 'ltr', code: 'EN' },
                      he: { value: branchFormNameHe, onChange: setBranchFormNameHe, dir: 'rtl', code: 'HE' },
                      ar: { value: branchFormNameAr, onChange: setBranchFormNameAr, dir: 'rtl', code: 'AR' },
                    };
                    return (
                  <div className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`}>
                    {Object.entries(branchLangMap).map(([lang, cfg]) => (
                      <div key={lang}>
                        <label className={`text-sm font-medium block mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {adminT('branches.name')} ({cfg.code}){lang === branchDefaultLang ? ' *' : ''}
                        </label>
                        <Input
                          value={cfg.value}
                          onChange={(e) => cfg.onChange(e.target.value)}
                          placeholder={adminT('branches.namePlaceholder')}
                          className={`text-sm ${lang === branchDefaultLang ? 'border-primary' : ''} ${isRTL ? 'text-right' : 'text-left'}`}
                          dir={cfg.dir}
                        />
                      </div>
                    ))}
                    <div>
                      <label className={`text-sm font-medium block mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('branches.sortOrder')}</label>
                      <Input
                        type="number"
                        value={branchFormSortOrder}
                        onChange={(e) => setBranchFormSortOrder(parseInt(e.target.value) || 1)}
                        className="text-sm"
                        min={1}
                      />
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Switch
                        checked={branchFormIsActive}
                        onCheckedChange={setBranchFormIsActive}
                      />
                      <label className="text-sm font-medium">
                        {branchFormIsActive ? adminT('branches.active') : adminT('branches.inactive')}
                      </label>
                    </div>
                  </div>
                    );
                  })()}
                  {(() => {
                    const branchDefaultLang = (storeSettings as any)?.defaultLanguage || 'ru';
                    const branchValueMap: Record<string, string> = {
                      ru: branchFormName, en: branchFormNameEn, he: branchFormNameHe, ar: branchFormNameAr
                    };
                    const isRequiredFilled = branchValueMap[branchDefaultLang]?.trim().length > 0;
                    return (
                  <div className={`flex justify-between pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button variant="outline" onClick={() => setIsBranchFormOpen(false)} className="text-sm">
                      {adminT('actions.cancel')}
                    </Button>
                    <Button
                      onClick={() => {
                        if (!isRequiredFilled) return;
                        const payload = {
                          name: branchFormName || undefined,
                          nameEn: branchFormNameEn.trim() || undefined,
                          nameHe: branchFormNameHe.trim() || undefined,
                          nameAr: branchFormNameAr.trim() || undefined,
                          isActive: branchFormIsActive,
                          sortOrder: branchFormSortOrder,
                        };
                        if (editingBranch) {
                          updateBranchMutation.mutate({ id: editingBranch.id, ...payload });
                        } else {
                          createBranchMutation.mutate(payload);
                        }
                      }}
                      className="bg-primary hover:bg-primary text-white text-sm"
                      disabled={!isRequiredFilled || createBranchMutation.isPending || updateBranchMutation.isPending}
                    >
                      {editingBranch ? adminT('actions.update') : adminT('actions.create')}
                    </Button>
                  </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>

              {/* Branch Delete Dialog (with order transfer) */}
              <Dialog open={isBranchDeleteDialogOpen} onOpenChange={(open) => { if (!open) { setIsBranchDeleteDialogOpen(false); setBranchDeleteTarget(null); } }}>
                <DialogContent className={`max-w-md ${isRTL ? 'rtl' : 'ltr'}`}>
                  <DialogHeader>
                    <DialogTitle className={`flex items-center gap-2 text-red-700 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                      <Trash2 className="h-4 w-4" />
                      {adminT('branches.deleteBranch')}
                    </DialogTitle>
                    <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                      {branchDeleteTarget?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {branchDeleteOrderCountLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                        {adminT('branches.checkingOrders') || 'Проверка заказов...'}
                      </div>
                    ) : branchDeleteOrderCount > 0 ? (
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-800">
                          {(adminT('branches.hasOrdersWarning') || 'Этот филиал содержит {count} заказов. Выберите куда их перенести.').replace('{count}', String(branchDeleteOrderCount))}
                        </div>
                        <div>
                          <label className={`text-sm font-medium block mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {adminT('branches.transferOrdersTo') || 'Перенести заказы в'}
                          </label>
                          <Select value={branchDeleteTransferTo} onValueChange={setBranchDeleteTransferTo}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-lg z-[10100]">
                              <SelectItem value="none">
                                <span className="text-gray-500">{adminT('branches.leaveWithoutBranch') || 'Оставить без филиала'}</span>
                              </SelectItem>
                              {(branches as any[]).filter((b: any) => b.id !== branchDeleteTarget?.id).map((b: any) => (
                                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {adminT('branches.deleteConfirm')}
                      </p>
                    )}
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setIsBranchDeleteDialogOpen(false); setBranchDeleteTarget(null); }}
                        disabled={deleteBranchMutation.isPending}
                      >
                        {adminT('actions.cancel')}
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        disabled={deleteBranchMutation.isPending || branchDeleteOrderCountLoading}
                        onClick={() => {
                          const transferTo = branchDeleteTransferTo !== 'none' ? parseInt(branchDeleteTransferTo) : null;
                          deleteBranchMutation.mutate({ id: branchDeleteTarget.id, transferTo });
                        }}
                      >
                        {deleteBranchMutation.isPending ? adminT('branches.deletingBranches') : adminT('actions.delete')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {/* Coupons & Loyalty Management */}
          {isAdmin && (
            <TabsContent value="coupons" className="space-y-4 sm:space-y-6">
              <CouponsTab isRTL={isRTL} currentLanguage={currentLanguage} />
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
        branches={branches || []}
        branchesEnabled={branchesEnabled}
        onSubmit={async (combinedData: any) => {
          console.log('Received combined data from form:', combinedData);

          const { branchAvailability: bav, _volumeDiscounts, ...rest } = combinedData;

          // Set isAvailable based on availability status
          const productData = {
            ...rest,
            isAvailable: rest.availabilityStatus !== 'completely_unavailable'
          };
          
          console.log('Final product data for mutation:', productData);
          
          if (editingProduct) {
            updateProductMutation.mutate({ id: editingProduct.id, ...productData });
            if (branchesEnabled && bav !== undefined) {
              saveProductBranchAvailabilityMutation.mutate({ id: editingProduct.id, branchAvailability: bav });
            }
          } else {
            try {
              const createdProduct = await createProductMutation.mutateAsync(productData);
              if (_volumeDiscounts?.length > 0 && createdProduct?.id) {
                try {
                  await apiRequest('POST', `/api/admin/products/${createdProduct.id}/volume-discounts`, _volumeDiscounts);
                  queryClient.invalidateQueries({
                    predicate: (q) => String(q.queryKey[0]).includes('/api/products/volume-discounts'),
                  });
                } catch (vdErr) {
                  console.error('Failed to save volume discounts for new product:', vdErr);
                }
              }
              if (branchesEnabled && bav !== undefined && createdProduct?.id) {
                try {
                  await saveProductBranchAvailabilityMutation.mutateAsync({ id: createdProduct.id, branchAvailability: bav });
                } catch (branchErr) {
                  console.error('Failed to save branch availability after product creation:', branchErr);
                  toast({
                    title: adminT('actions.error'),
                    description: adminT('branches.createError'),
                    variant: 'destructive',
                  });
                }
              }
            } catch (productErr) {
              // Product creation error is already handled by createProductMutation.onError
              console.error('Product creation failed:', productErr);
            }
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
        branches={branches || []}
        branchesEnabled={branchesEnabled}
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
        onDelete={handleDeleteUser}
      />

      {/* User Deletion Dialog */}
      <UserDeletionDialog
        open={isUserDeletionDialogOpen}
        onClose={() => {
          setIsUserDeletionDialogOpen(false);
          setUserToDelete(null);
        }}
        user={userToDelete}
        onConfirm={handleConfirmDeleteUser}
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
            // Dialog will be closed automatically in onSuccess callback
          }
        }}
        cancellationReasons={(storeSettings?.cancellationReasons as string[]) || ["Клиент отменил", "Товар отсутствует", "Технические проблемы", "Другое"]}
        adminT={adminT}
      />

      {/* Availability Modal */}
      <Dialog open={isAvailabilityModalOpen} onOpenChange={(open) => { if (!open) { setIsAvailabilityModalOpen(false); setModalProductId(null); } }}>
        <DialogContent className={`max-w-md ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
              {adminT('products.statusDialog.title')}
            </DialogTitle>
            <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {adminT('products.statusDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Apply to all branches checkbox — only shown when user has access to multiple branches */}
            {branchesEnabled && modalAccessibleBranches.length > 1 && (
              <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Checkbox
                  id="apply-to-all-branches"
                  checked={applyToAllBranches}
                  onCheckedChange={(checked) => setApplyToAllBranches(!!checked)}
                />
                <label htmlFor="apply-to-all-branches" className="text-sm font-medium cursor-pointer select-none">
                  {adminT('products.statusDialog.applyToAll')}
                </label>
              </div>
            )}

            {/* Global status selector — shown when applyToAll or branches not enabled */}
            {(!branchesEnabled || applyToAllBranches) && (
              <div className="space-y-2">
                <Select value={globalStatusChoice} onValueChange={setGlobalStatusChoice}>
                  <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                    <SelectItem value="available">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                        {adminT('products.statusDialog.statusAvailable')}
                      </span>
                    </SelectItem>
                    <SelectItem value="out_of_stock_today">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                        {adminT('products.statusDialog.statusOutOfStockToday')}
                      </span>
                    </SelectItem>
                    <SelectItem value="completely_unavailable">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                        {adminT('products.statusDialog.statusUnavailable')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Per-branch selectors — shown when branches enabled and applyToAll is unchecked */}
            {branchesEnabled && !applyToAllBranches && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {isLoadingModalBranchData ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                  </div>
                ) : (
                  modalAccessibleBranches.map((branch: any) => (
                    <div key={branch.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-1 text-sm font-medium truncate">{branch.name}</div>
                      <Select
                        value={branchStatusChoices[branch.id] || 'available'}
                        onValueChange={(val) => setBranchStatusChoices(prev => ({ ...prev, [branch.id]: val }))}
                      >
                        <SelectTrigger className="w-44 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                          <SelectItem value="available">
                            <span className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                              {adminT('products.statusDialog.statusAvailable')}
                            </span>
                          </SelectItem>
                          <SelectItem value="out_of_stock_today">
                            <span className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                              {adminT('products.statusDialog.statusOutOfStockToday')}
                            </span>
                          </SelectItem>
                          <SelectItem value="completely_unavailable">
                            <span className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                              {adminT('products.statusDialog.statusUnavailable')}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <DialogFooter className={`flex gap-2 sm:gap-2 ${isRTL ? 'flex-row-reverse sm:flex-row-reverse' : 'flex-row'}`}>
            <Button
              variant="outline"
              onClick={() => { setIsAvailabilityModalOpen(false); setModalProductId(null); }}
              className="flex-1"
            >
              {adminT('actions.cancel')}
            </Button>
            <Button
              onClick={handleSaveAvailability}
              disabled={isSavingAvailability || isLoadingModalBranchData}
              className="flex-1"
            >
              {isSavingAvailability ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {adminT('actions.save')}
                </span>
              ) : adminT('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      {showCreateOrderDialog && (
        <CreateOrderDialog 
          isOpen={showCreateOrderDialog}
          onClose={() => setShowCreateOrderDialog(false)}
          onSuccess={() => {
            setShowCreateOrderDialog(false);
            queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
            toast({
              title: adminT('orders.createSuccess'),
              description: adminT('orders.orderCreatedSuccessfully'),
            });
          }}
        />
      )}
    </div>
  );
}

// ==================== LOYALTY SETTINGS CARD ====================
function LoyaltySettingsCard({ isRTL, currentLanguage }: { isRTL: boolean; currentLanguage: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<any>({ queryKey: ['/api/settings'] });
  const { data: productsData } = useQuery<any[]>({ queryKey: ['/api/products'] });
  const products = productsData || [];

  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyPercent, setLoyaltyPercent] = useState('');
  const [giftEnabled, setGiftEnabled] = useState(false);
  const [giftProductId, setGiftProductId] = useState('');
  const [giftProductQuantity, setGiftProductQuantity] = useState('1');
  const [giftMinOrder, setGiftMinOrder] = useState('');
  const [giftProductSearch, setGiftProductSearch] = useState('');
  const [giftProductPickerOpen, setGiftProductPickerOpen] = useState(false);

  // HYP online payment settings
  const [paymentProvider, setPaymentProvider] = useState('none');
  const [hypMasof, setHypMasof] = useState('');
  const [hypKey, setHypKey] = useState('');
  const [hypPassP, setHypPassP] = useState('');
  const [hypTestMode, setHypTestMode] = useState(true);

  useEffect(() => {
    if (settings) {
      setLoyaltyEnabled(settings.loyaltyDiscountEnabled || false);
      setLoyaltyPercent(settings.loyaltyDiscountPercent || '0');
      setGiftEnabled(settings.giftEnabled || false);
      setGiftProductId(settings.giftProductId ? String(settings.giftProductId) : '');
      setGiftProductQuantity(settings.giftProductQuantity ? String(settings.giftProductQuantity) : '1');
      setGiftMinOrder(settings.giftMinOrderAmount || '300');
      const ppc = (settings as any).paymentProviderConfig as { active?: string; hyp?: { masof?: string; passP?: string; key?: string; testMode?: boolean } } | null;
      setPaymentProvider(ppc?.active || 'none');
      setHypMasof(ppc?.hyp?.masof || '');
      setHypKey(ppc?.hyp?.key || '');
      setHypPassP(ppc?.hyp?.passP || '');
      setHypTestMode(ppc?.hyp?.testMode !== false);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const current = await fetch('/api/settings').then(r => r.json());
      return apiRequest('PUT', '/api/settings', { ...current, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/context'] });
      toast({ title: currentLanguage === 'ru' ? 'Сохранено' : currentLanguage === 'he' ? 'נשמר' : currentLanguage === 'ar' ? 'تم الحفظ' : 'Saved' });
    },
    onError: () => {
      toast({ title: currentLanguage === 'ru' ? 'Ошибка сохранения' : 'Save error', variant: 'destructive' });
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      loyaltyDiscountEnabled: loyaltyEnabled,
      loyaltyDiscountPercent: loyaltyPercent,
      giftEnabled,
      giftProductId: giftProductId ? parseInt(giftProductId) : null,
      giftProductQuantity: giftProductQuantity || '1',
      giftMinOrderAmount: giftMinOrder,
    });
  };

  const t = (ru: string, en: string, he: string, ar: string) =>
    currentLanguage === 'ru' ? ru : currentLanguage === 'he' ? he : currentLanguage === 'ar' ? ar : en;

  return (
    <Card>
      <CardHeader>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <Gift className="h-5 w-5" />
            {t('Программа лояльности', 'Loyalty Program', 'תוכנית נאמנות', 'برنامج الولاء')}
          </CardTitle>
          <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('Скидка для зарегистрированных покупателей и подарок при заказе', 'Discount for registered customers and gift on order', 'הנחה ללקוחות רשומים ומתנה בהזמנה', 'خصم للعملاء المسجلين وهدية عند الطلب')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registered customer discount */}
        <div className={`space-y-3 p-4 border rounded-lg ${isRTL ? 'text-right' : ''}`}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                {t('Скидка зарегистрированным', 'Registered customer discount', 'הנחה ללקוחות רשומים', 'خصم للعملاء المسجلين')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('Постоянная скидка для авторизованных покупателей', 'Permanent discount for logged-in customers', 'הנחה קבועה ללקוחות מחוברים', 'خصم دائم للعملاء الذين قاموا بتسجيل الدخول')}
              </p>
            </div>
            <Switch checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} />
          </div>
          {loyaltyEnabled && (
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <label className="text-sm font-medium min-w-max">
                {t('Размер скидки (%)', 'Discount (%)', 'הנחה (%)', 'الخصم (%)')}
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={loyaltyPercent}
                onChange={(e) => setLoyaltyPercent(e.target.value)}
                className="w-24"
              />
            </div>
          )}
        </div>

        {/* Gift on order */}
        <div className={`space-y-3 p-4 border rounded-lg ${isRTL ? 'text-right' : ''}`}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Gift className="h-4 w-4" />
                {t('Подарок при заказе', 'Gift on order', 'מתנה בהזמנה', 'هدية عند الطلب')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('Бесплатный товар при достижении суммы заказа', 'Free item when order reaches threshold', 'פריט חינם כשההזמנה מגיעה לסף', 'عنصر مجاني عند بلوغ الطلب الحد')}
              </p>
            </div>
            <Switch checked={giftEnabled} onCheckedChange={setGiftEnabled} />
          </div>
          {giftEnabled && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <label className="text-sm font-medium min-w-max">
                  {t('Минимальная сумма заказа', 'Minimum order amount', 'סכום הזמנה מינימלי', 'الحد الأدنى لمبلغ الطلب')}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={giftMinOrder}
                  onChange={(e) => setGiftMinOrder(e.target.value)}
                  className="w-32"
                />
              </div>
              {(() => {
                const selectedGiftProduct = products.find((p: any) => String(p.id) === giftProductId) as any | undefined;
                const unitMeta = (() => {
                  const u = selectedGiftProduct?.unit;
                  if (u === 'piece')   return { label: t('шт', 'pcs', 'יח׳', 'قطعة'), defaultQty: '1', min: '1', step: '1' };
                  if (u === 'portion') return { label: t('порц.', 'portion', 'מנה', 'حصة'), defaultQty: '1', min: '1', step: '1' };
                  if (u === 'kg')      return { label: t('кг', 'kg', 'ק"ג', 'كجم'), defaultQty: '1', min: '0.1', step: '0.1' };
                  if (u === '100ml')   return { label: t('мл', 'ml', 'מ"ל', 'مل'), defaultQty: '100', min: '10', step: '10' };
                  return { label: t('г', 'g', 'ג', 'جم'), defaultQty: '100', min: '10', step: '10' };
                })();
                return (
                  <>
                    <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <label className="text-sm font-medium min-w-max mt-2">
                        {t('Товар-подарок', 'Gift product', 'מוצר מתנה', 'منتج الهدية')}
                      </label>
                      <div className="flex-1 max-w-xs space-y-1 relative">
                        <Input
                          type="text"
                          placeholder={t('Поиск товара...', 'Search product...', 'חפש מוצר...', 'ابحث عن منتج...')}
                          value={giftProductPickerOpen ? giftProductSearch : (selectedGiftProduct?.name || '')}
                          onChange={(e) => { setGiftProductSearch(e.target.value); setGiftProductPickerOpen(true); if (!e.target.value) { setGiftProductId(''); setGiftProductQuantity(''); } }}
                          onFocus={() => { setGiftProductPickerOpen(true); setGiftProductSearch(''); }}
                          onBlur={() => setTimeout(() => setGiftProductPickerOpen(false), 180)}
                          className="w-full"
                        />
                        {giftProductPickerOpen && (
                          <div className="absolute z-50 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {products
                              .filter((p: any) => !giftProductSearch || p.name?.toLowerCase().includes(giftProductSearch.toLowerCase()))
                              .slice(0, 30)
                              .map((p: any) => {
                                const pm = (() => {
                                  const u = p.unit;
                                  if (u === 'piece')   return { label: t('шт', 'pcs', 'יח׳', 'قطعة'), defaultQty: '1' };
                                  if (u === 'portion') return { label: t('порц.', 'portion', 'מנה', 'حصة'), defaultQty: '1' };
                                  if (u === 'kg')      return { label: t('кг', 'kg', 'ק"ג', 'كجم'), defaultQty: '1' };
                                  if (u === '100ml')   return { label: t('мл', 'ml', 'מ"ל', 'مل'), defaultQty: '100' };
                                  return { label: t('г', 'g', 'ג', 'جم'), defaultQty: '100' };
                                })();
                                return (
                                  <div
                                    key={p.id}
                                    className={`px-3 py-2 cursor-pointer hover:bg-accent text-sm flex justify-between items-center ${String(p.id) === giftProductId ? 'bg-accent font-medium' : ''}`}
                                    onMouseDown={() => {
                                      setGiftProductId(String(p.id));
                                      setGiftProductQuantity(pm.defaultQty);
                                      setGiftProductSearch('');
                                      setGiftProductPickerOpen(false);
                                    }}
                                  >
                                    <span>{p.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{pm.label}</span>
                                  </div>
                                );
                              })}
                            {products.filter((p: any) => !giftProductSearch || p.name?.toLowerCase().includes(giftProductSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">{t('Ничего не найдено', 'No results', 'אין תוצאות', 'لا توجد نتائج')}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {giftProductId && (
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <label className="text-sm font-medium min-w-max">
                          {t('Количество', 'Quantity', 'כמות', 'الكمية')}
                        </label>
                        <Input
                          type="number"
                          min={unitMeta.min}
                          step={unitMeta.step}
                          value={giftProductQuantity || unitMeta.defaultQty}
                          onChange={(e) => setGiftProductQuantity(e.target.value)}
                          className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">{unitMeta.label}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('Сохранить', 'Save', 'שמור', 'حفظ')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== COUPONS TAB ====================
function CouponsTab({ isRTL, currentLanguage }: { isRTL: boolean; currentLanguage: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allProductsData } = useQuery<any[]>({ queryKey: ['/api/products'] });
  const allProducts = allProductsData || [];

  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '0',
    maxUses: '',
    usageType: 'multi',
    scope: 'order',
    applicableProductIds: [] as number[],
    targetCustomerEmails: [] as string[],
    targetUserIds: [] as string[],
    stacksWithLoyalty: false,
    isActive: true,
    expiresAt: '',
  });
  const [expiresAtPickerOpen, setExpiresAtPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

  const loadCustomers = async (val: string) => {
    setCustomerSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(val)}&limit=20`, { credentials: 'include' });
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
      setCustomerResults(list);
    } catch { setCustomerResults([]); }
    finally { setCustomerSearchLoading(false); }
  };

  const { data: coupons = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/coupons'],
  });

  const t = (ru: string, en: string, he: string, ar: string) =>
    currentLanguage === 'ru' ? ru : currentLanguage === 'he' ? he : currentLanguage === 'ar' ? ar : en;

  const resetForm = () => {
    setForm({ code: '', description: '', discountType: 'percentage', discountValue: '', minOrderAmount: '0', maxUses: '', usageType: 'multi', scope: 'order', applicableProductIds: [], targetCustomerEmails: [], targetUserIds: [], stacksWithLoyalty: false, isActive: true, expiresAt: '' });
    setEditingCoupon(null);
    setShowForm(false);
    setProductSearch('');
    setProductSearchOpen(false);
    setCustomerSearch('');
    setCustomerSearchOpen(false);
    setCustomerResults([]);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || '0',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
      usageType: coupon.usageType || 'multi',
      scope: coupon.scope || 'order',
      applicableProductIds: Array.isArray(coupon.applicableProductIds) ? coupon.applicableProductIds : [],
      targetCustomerEmails: Array.isArray(coupon.targetCustomerEmails) ? coupon.targetCustomerEmails : (coupon.targetCustomerEmail ? [coupon.targetCustomerEmail] : []),
      targetUserIds: Array.isArray(coupon.targetUserIds) ? coupon.targetUserIds : (coupon.targetUserId ? [coupon.targetUserId] : []),
      stacksWithLoyalty: !!coupon.stacksWithLoyalty,
      isActive: coupon.isActive,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    });
    setProductSearch('');
    setCustomerSearch('');
    setCustomerResults([]);
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => editingCoupon
      ? apiRequest('PATCH', `/api/admin/coupons/${editingCoupon.id}`, data)
      : apiRequest('POST', '/api/admin/coupons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      toast({ title: editingCoupon ? t('Купон обновлён', 'Coupon updated', 'קופון עודכן', 'تم تحديث القسيمة') : t('Купон создан', 'Coupon created', 'קופון נוצר', 'تم إنشاء القسيمة') });
      resetForm();
    },
    onError: (err: any) => {
      const details = err?.errors
        ? ': ' + (err.errors as any[]).map((e: any) => `${e.path?.join('.')} — ${e.message}`).join('; ')
        : err?.message ? ': ' + err.message : '';
      toast({ title: t('Ошибка сохранения', 'Save error', 'שגיאת שמירה', 'خطأ في الحفظ') + details, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      toast({ title: t('Купон удалён', 'Coupon deleted', 'קופון נמחק', 'تم حذف القسيمة') });
    },
    onError: () => toast({ title: t('Ошибка', 'Error', 'שגיאה', 'خطأ'), variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest('PATCH', `/api/admin/coupons/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] }),
  });

  const handleSave = () => {
    const discountVal = String(form.discountValue || '').trim();
    if (!form.code.trim() || !discountVal) return;
    let expiresAtValue: string | null = null;
    if (form.expiresAt) {
      try { expiresAtValue = new Date(form.expiresAt).toISOString(); } catch { expiresAtValue = null; }
    }
    const maxUsesInt = form.maxUses ? parseInt(form.maxUses, 10) : null;
    saveMutation.mutate({
      code: form.code.trim().toUpperCase(),
      description: form.description || null,
      discountType: form.discountType,
      discountValue: discountVal,
      minOrderAmount: form.minOrderAmount || '0',
      maxUses: (maxUsesInt !== null && !isNaN(maxUsesInt)) ? maxUsesInt : null,
      usageType: form.usageType,
      scope: form.scope,
      applicableProductIds: form.scope === 'product' && form.applicableProductIds.length > 0 ? form.applicableProductIds : null,
      targetCustomerEmails: form.targetCustomerEmails.length > 0 ? form.targetCustomerEmails : null,
      targetUserIds: form.targetUserIds.length > 0 ? form.targetUserIds : null,
      stacksWithLoyalty: form.stacksWithLoyalty,
      isActive: form.isActive,
      expiresAt: expiresAtValue,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle className={`text-lg sm:text-xl flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Tag className="h-5 w-5" />
                {t('Купоны', 'Coupons', 'קופונים', 'كوبونات')}
              </CardTitle>
              <CardDescription>
                {t('Управление промо-кодами и скидочными купонами', 'Manage promo codes and discount coupons', 'ניהול קודי פרומו וקופוני הנחה', 'إدارة رموز الترويج وقسائم الخصم')}
              </CardDescription>
            </div>
            <Button onClick={openCreate} className={`flex items-center gap-2 w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Plus className="h-4 w-4" />
              {t('Создать купон', 'Create coupon', 'צור קופון', 'إنشاء قسيمة')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>{t('Купонов пока нет', 'No coupons yet', 'אין קופונים עדיין', 'لا توجد قسائم بعد')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? 'text-right' : ''}>{t('Код', 'Code', 'קוד', 'الرمز')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : ''}>{t('Описание', 'Description', 'תיאור', 'الوصف')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : ''}>{t('Скидка', 'Discount', 'הנחה', 'الخصم')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : ''}>{t('Мин. заказ', 'Min order', 'הזמנה מינ.', 'الحد الأدنى')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : ''}>{t('Использований', 'Uses', 'שימושים', 'الاستخدامات')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : ''}>{t('Истекает', 'Expires', 'פג תוקף', 'تنتهي')}</TableHead>
                    <TableHead className={isRTL ? 'text-right' : ''}>{t('Активен', 'Active', 'פעיל', 'نشط')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon: any) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{coupon.description || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}%`
                            : `${coupon.discountValue} ₪`}
                        </Badge>
                      </TableCell>
                      <TableCell>{coupon.minOrderAmount > 0 ? `${coupon.minOrderAmount} ₪` : '—'}</TableCell>
                      <TableCell>
                        {coupon.currentUses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={coupon.isActive}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: coupon.id, isActive: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(coupon)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Удалить купон?', 'Delete coupon?', 'למחוק קופון?', 'حذف القسيمة؟')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t(`Купон "${coupon.code}" будет удалён безвозвратно.`, `Coupon "${coupon.code}" will be permanently deleted.`, `הקופון "${coupon.code}" יימחק לצמיתות.`, `سيتم حذف القسيمة "${coupon.code}" بشكل دائم.`)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Отмена', 'Cancel', 'ביטול', 'إلغاء')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(coupon.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  {t('Удалить', 'Delete', 'מחק', 'حذف')}
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

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingCoupon
                ? t('Редактировать купон', 'Edit coupon', 'ערוך קופון', 'تعديل القسيمة')
                : t('Создать купон', 'Create coupon', 'צור קופון', 'إنشاء قسيمة')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('Код купона', 'Coupon code', 'קוד קופון', 'رمز القسيمة')} *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('Описание', 'Description', 'תיאור', 'الوصف')}</label>
              <Input
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('Летняя скидка', 'Summer discount', 'הנחת קיץ', 'خصم صيفي')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('Тип скидки', 'Discount type', 'סוג הנחה', 'نوع الخصم')}</label>
                <Select value={form.discountType} onValueChange={(v) => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('Процент (%)', 'Percentage (%)', 'אחוז (%)', 'نسبة مئوية (%)')}</SelectItem>
                    <SelectItem value="fixed">{t('Фиксированная сумма', 'Fixed amount', 'סכום קבוע', 'مبلغ ثابت')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  {form.discountType === 'percentage' ? t('Скидка (%)', 'Discount (%)', 'הנחה (%)', 'الخصم (%)') : t('Сумма (₪)', 'Amount (₪)', 'סכום (₪)', 'المبلغ (₪)')}
                </label>
                <Input
                  type="number"
                  min="0"
                  max={form.discountType === 'percentage' ? '100' : undefined}
                  value={form.discountValue}
                  onChange={(e) => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('Тип использования', 'Usage type', 'סוג שימוש', 'نوع الاستخدام')}</label>
              <Select value={form.usageType} onValueChange={(v) => setForm(f => ({ ...f, usageType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multi">{t('Многократный (до лимита)', 'Multi-use (up to limit)', 'שימוש מרובה (עד מגבלה)', 'متعدد الاستخدام (حتى الحد)')}</SelectItem>
                  <SelectItem value="single">{t('Одноразовый (глобально)', 'Single-use (global)', 'חד פעמי (גלובלי)', 'استخدام واحد (عالمي)')}</SelectItem>
                  <SelectItem value="per_customer">{t('Один раз на клиента', 'Once per customer', 'פעם אחת לכל לקוח', 'مرة واحدة لكل عميل')}</SelectItem>
                </SelectContent>
              </Select>
              <p className={`text-xs text-muted-foreground pt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                {form.usageType === 'multi' && t(
                  'Купон можно использовать любое количество раз (разными покупателями) — вплоть до общего лимита.',
                  'The coupon can be used any number of times by any customers — up to the total usage limit.',
                  'הקופון ניתן לשימוש כמה פעמים שרוצים (על ידי לקוחות שונים) — עד למגבלת השימוש הכוללת.',
                  'يمكن استخدام القسيمة أي عدد من المرات من قِبَل أي عميل — حتى الحد الإجمالي للاستخدام.'
                )}
                {form.usageType === 'single' && t(
                  'Купон действителен ровно 1 раз на всех: как только кто-то применит его, он перестанет работать для всех остальных.',
                  'The coupon is valid exactly once in total: once anyone uses it, it becomes invalid for everyone else.',
                  'הקופון תקף בדיוק פעם אחת בסך הכל: ברגע שמישהו משתמש בו, הוא הופך לא תקף עבור כולם.',
                  'القسيمة صالحة مرة واحدة فقط لجميع العملاء: بمجرد استخدامها من أي شخص، تصبح غير صالحة للجميع.'
                )}
                {form.usageType === 'per_customer' && t(
                  'Каждый зарегистрированный покупатель может использовать купон только 1 раз. Разные покупатели — каждый по одному разу.',
                  'Each registered customer can use the coupon only once. Different customers can each use it once.',
                  'כל לקוח רשום יכול להשתמש בקופון פעם אחת בלבד. לקוחות שונים יכולים להשתמש בו — כל אחד פעם.',
                  'يمكن لكل عميل مسجَّل استخدام القسيمة مرة واحدة فقط. يمكن لعملاء مختلفين استخدامها — كل واحد مرة.'
                )}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('Область применения', 'Coupon scope', 'תחום הקופון', 'نطاق القسيمة')}</label>
              <Select value={form.scope} onValueChange={(v) => setForm(f => ({ ...f, scope: v, applicableProductIds: [] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">{t('Весь заказ', 'Whole order', 'כל ההזמנה', 'الطلب بالكامل')}</SelectItem>
                  <SelectItem value="product">{t('Определённые товары', 'Specific products', 'מוצרים ספציפיים', 'منتجات محددة')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope === 'product' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Товары со скидкой', 'Applicable products', 'מוצרים רלוונטיים', 'المنتجات المطبقة')}</label>
                {form.applicableProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.applicableProductIds.map(pid => {
                      const prod = allProducts.find((p: any) => p.id === pid);
                      const prodName = prod ? (getLocalizedField(prod, 'name', currentLanguage as SupportedLanguage, 'ru') || prod.name) : `#${pid}`;
                      return (
                        <span key={pid} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                          {prodName}
                          <button type="button" onClick={() => setForm(f => ({ ...f, applicableProductIds: f.applicableProductIds.filter(id => id !== pid) }))} className="hover:text-destructive font-bold ml-0.5">×</button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => setProductSearchOpen(true)}
                    onBlur={() => setTimeout(() => setProductSearchOpen(false), 150)}
                    placeholder={t('Поиск товара...', 'Search product...', 'חפש מוצר...', 'ابحث عن منتج...')}
                    className="text-sm"
                  />
                  {productSearchOpen && (
                    <div className="absolute z-50 w-full border rounded-md bg-background shadow-md max-h-48 overflow-y-auto mt-1">
                      {(() => {
                        const searchLower = productSearch.toLowerCase();
                        const filtered = allProducts
                          .filter((p: any) => {
                            if (form.applicableProductIds.includes(p.id)) return false;
                            if (!productSearch.trim()) return true;
                            return (p.name?.toLowerCase().includes(searchLower)) ||
                              (p.name_en?.toLowerCase().includes(searchLower)) ||
                              (p.name_he?.toLowerCase().includes(searchLower)) ||
                              (p.name_ar?.toLowerCase().includes(searchLower));
                          })
                          .slice(0, 30);
                        if (filtered.length === 0) return <p className="text-xs text-muted-foreground px-3 py-2">{t('Не найдено', 'Not found', 'לא נמצא', 'غير موجود')}</p>;
                        return filtered.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-3 py-1.5 text-sm hover:bg-accent`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setForm(f => ({ ...f, applicableProductIds: [...f.applicableProductIds, p.id] })); setProductSearch(''); }}
                          >
                            {getLocalizedField(p, 'name', currentLanguage as SupportedLanguage, 'ru') || p.name}
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Stacks with loyalty toggle */}
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <Switch checked={form.stacksWithLoyalty} onCheckedChange={(v) => setForm(f => ({ ...f, stacksWithLoyalty: v }))} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('Суммировать со скидкой лояльности', 'Stack with loyalty discount', 'לצבור עם הנחת נאמנות', 'تراكم مع خصم الولاء')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {form.stacksWithLoyalty
                    ? t('Купон + скидка лояльности применяются одновременно', 'Coupon + loyalty discount both apply', 'קופון + הנחת נאמנות חלים יחד', 'الكوبون + خصم الولاء يُطبَّقان معاً')
                    : t('Купон заменяет скидку лояльности (по умолчанию)', 'Coupon replaces loyalty discount (default)', 'קופון מחליף הנחת נאמנות (ברירת מחדל)', 'الكوبون يحل محل خصم الولاء (افتراضي)')}
                </p>
              </div>
            </div>
            {/* Customer targeting — search + tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Только для клиентов', 'Target customers', 'לקוחות ספציפיים', 'عملاء محددون')}</label>
              <p className="text-xs text-muted-foreground">{t('Оставьте пустым — доступен всем. Найдите и добавьте нужных клиентов.', 'Leave empty — available to all. Find and add target customers.', 'השאר ריק — זמין לכולם. חפש והוסף לקוחות.', 'اتركه فارغاً للجميع. ابحث وأضف عملاء.')}</p>
              {(form.targetCustomerEmails.length > 0 || form.targetUserIds.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {form.targetUserIds.map(uid => {
                    const found = customerResults.find((u: any) => String(u.id) === String(uid));
                    const name = found ? (`${found.firstName || ''} ${found.lastName || ''}`.trim() || found.username) : uid;
                    const email = found?.email || '';
                    return (
                      <span key={uid} className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                        {name}{email ? ` (${email})` : ''}
                        <button type="button" onClick={() => setForm(f => ({ ...f, targetUserIds: f.targetUserIds.filter(id => id !== uid) }))} className="hover:text-destructive font-bold ml-0.5">×</button>
                      </span>
                    );
                  })}
                  {form.targetCustomerEmails.map(email => (
                    <span key={email} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
                      {email}
                      <button type="button" onClick={() => setForm(f => ({ ...f, targetCustomerEmails: f.targetCustomerEmails.filter(e => e !== email) }))} className="hover:text-destructive font-bold ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerSearch(val);
                    loadCustomers(val);
                  }}
                  onFocus={() => { setCustomerSearchOpen(true); if (customerResults.length === 0) loadCustomers(customerSearch); }}
                  onBlur={() => setTimeout(() => setCustomerSearchOpen(false), 150)}
                  placeholder={t('Поиск по имени / email...', 'Search by name / email...', 'חפש לפי שם / אימייל...', 'ابحث بالاسم / البريد...')}
                  className="text-sm"
                />
                {customerSearchOpen && (
                  <div className="absolute z-50 w-full border rounded-md bg-background shadow-md max-h-48 overflow-y-auto mt-1">
                    {customerSearchLoading && <p className="text-xs text-muted-foreground px-3 py-2">{t('Загрузка...', 'Loading...', 'טוען...', 'جار التحميل...')}</p>}
                    {!customerSearchLoading && customerResults.filter((u: any) => !form.targetUserIds.includes(String(u.id))).map((u: any) => {
                      const displayName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-3 py-1.5 text-sm hover:bg-accent`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm(f => ({ ...f, targetUserIds: [...f.targetUserIds, String(u.id)] }));
                            setCustomerSearch('');
                            setCustomerSearchOpen(false);
                          }}
                        >
                          <span className="font-medium">{displayName}</span>
                          {u.email && <span className={`text-muted-foreground ${isRTL ? 'mr-2' : 'ml-2'} text-xs`}>{u.email}</span>}
                        </button>
                      );
                    })}
                    {!customerSearchLoading && customerResults.filter((u: any) => !form.targetUserIds.includes(String(u.id))).length === 0 && (
                      <p className="text-xs text-muted-foreground px-3 py-2">{t('Не найдено', 'Not found', 'לא נמצא', 'غير موجود')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('Мин. сумма заказа', 'Min order amount', 'סכום הזמנה מינ.', 'الحد الأدنى للطلب')}</label>
                <Input
                  type="number"
                  min="0"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('Лимит использований', 'Usage limit', 'מגבלת שימוש', 'حد الاستخدام')}</label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  placeholder={form.usageType === 'single' ? '1' : t('Без лимита', 'Unlimited', 'ללא הגבלה', 'غير محدود')}
                  disabled={form.usageType === 'single'}
                />
                <p className={`text-xs text-muted-foreground pt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {form.usageType === 'single'
                    ? t('Автоматически 1 — купон глобально одноразовый.', 'Automatically 1 — coupon is globally single-use.', 'אוטומטית 1 — קופון חד-פעמי גלובלי.', 'تلقائياً 1 — القسيمة للاستخدام مرة واحدة عالمياً.')
                    : t('Общий лимит на всех покупателей вместе. Пусто — без ограничений.', 'Total limit across all customers combined. Empty — unlimited.', 'מגבלה כוללת על כל הלקוחות יחד. ריק — ללא הגבלה.', 'الحد الإجمالي لجميع العملاء مجتمعين. فارغ — غير محدود.')}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('Дата истечения', 'Expiry date', 'תאריך תפוגה', 'تاريخ الانتهاء')}</label>
              <Popover open={expiresAtPickerOpen} onOpenChange={setExpiresAtPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start font-normal ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}
                  >
                    <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {form.expiresAt
                      ? format(new Date(form.expiresAt), 'dd.MM.yyyy')
                      : <span className="text-muted-foreground">{t('Выберите дату', 'Select date', 'בחר תאריך', 'اختر تاريخاً')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                  <CalendarComponent
                    mode="single"
                    selected={form.expiresAt ? new Date(form.expiresAt) : undefined}
                    onSelect={(date) => {
                      setForm(f => ({ ...f, expiresAt: date ? format(date, 'yyyy-MM-dd') : '' }));
                      setExpiresAtPickerOpen(false);
                    }}
                    locale={currentLanguage === 'en' ? enUS : currentLanguage === 'he' ? he : currentLanguage === 'ar' ? ar : ru}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                  {form.expiresAt && (
                    <div className={`p-2 border-t flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <Button variant="ghost" size="sm" onClick={() => { setForm(f => ({ ...f, expiresAt: '' })); setExpiresAtPickerOpen(false); }}>
                        {t('Убрать дату', 'Clear date', 'נקה תאריך', 'مسح التاريخ')}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
              <label className="text-sm">{t('Активен', 'Active', 'פעיל', 'نشط')}</label>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t flex flex-col-reverse sm:flex-row gap-3 sm:gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={resetForm}>{t('Отмена', 'Cancel', 'ביטול', 'إلغاء')}</Button>
            <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saveMutation.isPending || !form.code.trim() || !String(form.discountValue || '').trim()}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingCoupon ? t('Сохранить', 'Save', 'שמור', 'حفظ') : t('Создать', 'Create', 'צור', 'إنشاء')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
function ProductFormDialog({ open, onClose, categories, product, onSubmit, onDelete, adminT, branches = [], branchesEnabled = false }: any) {
  type ProductFormData = z.infer<typeof productSchema>;
  
  const { toast } = useToast();
  const { i18n } = useTranslation();

  // Check if barcode system is enabled to conditionally show barcode field
  const { data: barcodeConfig } = useQuery({
    queryKey: ['/api/barcode/config'],
    queryFn: () => apiRequest('GET', '/api/barcode/config'),
  });

  // Fetch active theme to know the category display style
  const { data: activeTheme } = useQuery<{ categoryDisplayStyle?: string }>({
    queryKey: ['/api/themes/active'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const categoryDisplayStyle = activeTheme?.categoryDisplayStyle || 'default';
  const showCategoryIcons = categoryDisplayStyle !== 'photo_grid';

  const { data: productDialogSettings } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000,
  });
  const productStoreDefaultLang = (productDialogSettings as any)?.defaultLanguage || 'ru';

  const translationManager = useTranslationManager({
    defaultLanguage: (productStoreDefaultLang as any) || 'ru',
    baseFields: ['name', 'description', 'ingredients']
  });
  
  const [formData, setFormData] = useState<any>({});
  const [branchAvailability, setBranchAvailability] = useState<Record<number, string>>({});
  const [volumeDiscounts, setVolumeDiscounts] = useState<Array<{ minQuantity: string; discountType: 'percentage' | 'fixed'; discountValue: string }>>([]);

  // Volume discount unit conversion helpers
  const toDisplayQty = (storedQty: string, productUnit: string): string => {
    const n = parseFloat(storedQty);
    if (!storedQty || isNaN(n)) return storedQty;
    if (productUnit === '100g' || productUnit === '100ml') return String(Math.round(n * 100));
    return storedQty;
  };
  const toStoredQty = (displayQty: string, productUnit: string): string => {
    const n = parseFloat(displayQty);
    if (!displayQty || isNaN(n)) return displayQty;
    if (productUnit === '100g' || productUnit === '100ml') return String(n / 100);
    return displayQty;
  };
  const getVolumeUnitSuffix = (productUnit: string): string => {
    return adminT(`products.volumeDiscount.unitSuffix.${productUnit}`) || '';
  };

  // Fetch existing volume discounts when editing a product
  const { data: existingVolumeDiscounts } = useQuery({
    queryKey: ['/api/admin/products', product?.id, 'volume-discounts'],
    queryFn: () => apiRequest('GET', `/api/admin/products/${product.id}/volume-discounts`),
    enabled: open && !!product?.id,
  });

  useEffect(() => {
    if (existingVolumeDiscounts && Array.isArray(existingVolumeDiscounts)) {
      const currentUnit = form.getValues('unit') || '100g';
      setVolumeDiscounts(existingVolumeDiscounts.map((d: any) => ({
        minQuantity: toDisplayQty(String(d.minQuantity ?? d.min_quantity ?? ''), currentUnit),
        discountType: (d.discountType ?? d.discount_type ?? 'percentage') as 'percentage' | 'fixed',
        discountValue: String(d.discountValue ?? d.discount_value ?? ''),
      })));
    } else if (!product?.id) {
      setVolumeDiscounts([]);
    }
  }, [existingVolumeDiscounts, product?.id]);

  const saveVolumeDiscountsMutation = useMutation({
    mutationFn: (productId: number) =>
      apiRequest('POST', `/api/admin/products/${productId}/volume-discounts`,
        volumeDiscounts
          .filter(d => d.minQuantity && d.discountValue)
          .map(d => ({
            minQuantity: toStoredQty(d.minQuantity, unit || '100g'),
            discountType: d.discountType,
            discountValue: d.discountValue,
            isActive: true,
          }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => String(q.queryKey[0]).includes('/api/products/volume-discounts'),
      });
    },
    onError: () => toast({ title: adminT('products.volumeDiscount.saveError'), variant: 'destructive' }),
  });
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      ingredients: "",
      categoryIds: [],
      price: "",
      unit: "100g" as ProductUnit,
      imageUrl: "",
      barcode: "",
      isAvailable: true,
      availabilityStatus: "available" as const,
      isSpecialOffer: false,
      discountType: "",
      discountValue: "",
      sortOrder: 0,
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
        // Fetch fresh branch availability from API (more reliable than stale product data)
        if (branchesEnabled && product.id) {
          setBranchAvailability({});
          fetch(`/api/admin/products/${product.id}/branch-availability`)
            .then(r => r.ok ? r.json() : [])
            .then((branchAvail: any[]) => {
              const avail: Record<number, string> = {};
              branchAvail.forEach((ba: any) => {
                avail[ba.branchId] = ba.availabilityStatus || (ba.isAvailable ? 'available' : 'completely_unavailable');
              });
              setBranchAvailability(avail);
            })
            .catch(() => {
              // Fallback to product data
              const fallback: Record<number, string> = {};
              ((product.allBranchAvailability || product.branchAvailability || []) as any[]).forEach((ba: any) => {
                fallback[ba.branchId] = ba.availabilityStatus || (ba.isAvailable ? 'available' : 'completely_unavailable');
              });
              setBranchAvailability(fallback);
            });
        } else {
          setBranchAvailability({});
        }
        
        // Set form values based on current language
        const nameValue = translationManager.getFieldValue(initialData, 'name');
        const descriptionValue = translationManager.getFieldValue(initialData, 'description');
        const ingredientsValue = translationManager.getFieldValue(initialData, 'ingredients');
        
        form.reset({
          name: nameValue,
          description: descriptionValue,
          ingredients: ingredientsValue,
          categoryIds: initialData.categoryIds,
          price: initialData.price,
          unit: initialData.unit,
          imageUrl: initialData.imageUrl || "",
          barcode: initialData.barcode || "",
          isAvailable: initialData.isAvailable ?? true,
          availabilityStatus: initialData.availabilityStatus || "available",
          isSpecialOffer: initialData.isSpecialOffer ?? false,
          discountType: initialData.discountType || "",
          discountValue: initialData.discountValue,
          sortOrder: initialData.sortOrder ?? 0,
        });
      } else {
        // New product - reset everything including branch availability
        const emptyData = {};
        setFormData(emptyData);
        setBranchAvailability({});
        form.reset({
          name: "",
          description: "",
          ingredients: "",
          categoryIds: [],
          price: "",
          unit: "100g" as ProductUnit,
          imageUrl: "",
          barcode: "",
          isAvailable: true,
          availabilityStatus: "available" as const,
          isSpecialOffer: false,
          discountType: "",
          discountValue: "",
          sortOrder: 0,
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

    // Get values from the store's default language fields
    const srcSuffix = productStoreDefaultLang === 'ru' ? '' : `_${productStoreDefaultLang}`;
    const defaultName = formData[`name${srcSuffix}`] || '';
    const defaultDescription = formData[`description${srcSuffix}`] || '';
    const defaultIngredients = formData[`ingredients${srcSuffix}`] || '';
    
    if (!defaultName && !defaultDescription && !defaultIngredients) {
      toast({
        title: adminT('translation.noDataToCopy') || 'Нет данных для копирования',
        description: adminT('translation.fillDefaultFirst') || 'Заполните поля на основном языке сначала',
        variant: 'destructive'
      });
      return;
    }

    // Update formData with copied values FIRST
    const targetNameField = `name_${translationManager.currentLanguage}`;
    const targetDescField = `description_${translationManager.currentLanguage}`;
    const targetIngredientsField = `ingredients_${translationManager.currentLanguage}`;
    
    const updatedFormData = {
      ...formData,
      [targetNameField]: defaultName,
      [targetDescField]: defaultDescription,
      [targetIngredientsField]: defaultIngredients
    };
    
    setFormData(updatedFormData);

    // Then set form values
    if (defaultName) {
      form.setValue('name', defaultName);
    }
    if (defaultDescription) {
      form.setValue('description', defaultDescription);
    }
    if (defaultIngredients) {
      form.setValue('ingredients', defaultIngredients);
    }

    let copiedCount = 0;
    if (defaultName) copiedCount++;
    if (defaultDescription) copiedCount++;
    if (defaultIngredients) copiedCount++;

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
      form.setValue('ingredients', '');
      
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
    const finalData: any = {
      ...data,
      ...updatedFormData
    };

    // Include branch availability if enabled (3-state per branch)
    if (branchesEnabled) {
      finalData.branchAvailability = Object.entries(branchAvailability).map(([branchId, status]) => ({
        branchId: Number(branchId),
        availabilityStatus: status,
        isAvailable: status !== 'completely_unavailable',
      }));
      // Auto-derive global availabilityStatus from branch statuses to eliminate conflict
      const branchStatuses = Object.values(branchAvailability) as string[];
      if (branchStatuses.length > 0) {
        if (branchStatuses.every(s => s === 'completely_unavailable')) {
          finalData.availabilityStatus = 'completely_unavailable';
        } else if (branchStatuses.some(s => s === 'available')) {
          finalData.availabilityStatus = 'available';
        } else {
          finalData.availabilityStatus = 'out_of_stock_today';
        }
      }
    }
    
    console.log('Submitting product data:', finalData);
    
    // For new products include pre-converted volume discounts so parent can save after creation
    if (!product?.id) {
      finalData._volumeDiscounts = volumeDiscounts
        .filter(d => d.minQuantity && d.discountValue)
        .map(d => ({
          minQuantity: toStoredQty(d.minQuantity, unit || '100g'),
          discountType: d.discountType,
          discountValue: d.discountValue,
          isActive: true,
        }));
    }
    // Send to parent component, then save volume discounts for existing products
    onSubmit(finalData);
    if (product?.id) {
      saveVolumeDiscountsMutation.mutate(product.id);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
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
          baseFields={['name', 'description', 'ingredients']}
          onCopyAllFields={handleCopyAllFields}
          onClearAllFields={handleClearAllFields}
        />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {translationManager.getFieldLabel('name', adminT('products.dialog.nameLabel'))}
                    {translationManager.currentLanguage === productStoreDefaultLang ? ' *' : ''}
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
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {translationManager.getFieldLabel('ingredients', adminT('products.dialog.ingredientsLabel'))}
                  </FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={(value) => {
                        field.onChange(value);
                        handleFieldChange('ingredients', value, true);
                      }}
                      placeholder={adminT('products.dialog.ingredientsPlaceholder')}
                      className="text-sm"
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
                          <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer flex-1 flex items-center gap-2">
                            {showCategoryIcons && (
                              (category.icon && (category.icon.startsWith('/') || category.icon.startsWith('http'))) ? (
                                <img 
                                  src={category.icon} 
                                  alt="Category icon" 
                                  className="w-4 h-4 object-cover rounded flex-shrink-0"
                                />
                              ) : (
                                <span>{category.icon || '📦'}</span>
                              )
                            )}
                            {getLocalizedField(category, "name", i18n.language as SupportedLanguage)}
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
                        <SelectItem value="portion" className="text-sm">{adminT('products.units.portion')}</SelectItem>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Global availability: only shown when branches are disabled — otherwise branch section handles it */}
              {!branchesEnabled && (
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{adminT('products.dialog.sortOrderLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        className="text-sm"
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          field.onChange(val);
                          handleFieldChange('sortOrder', val, false);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      {adminT('products.dialog.sortOrderDescription')}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {barcodeConfig?.enabled && (
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">{adminT('barcode.field')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={adminT('barcode.fieldPlaceholder') || ''}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            handleFieldChange('barcode', e.target.value, false);
                          }}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>

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

            {/* Branch Availability Section */}
            {branchesEnabled && (branches as any[]).length > 0 && (
              <div className="space-y-2 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium">{adminT('branches.branchAvailability')}</p>
                </div>
                <p className="text-xs text-gray-500">{adminT('branches.branchAvailabilityDescription')}</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {(branches as any[]).filter((b: any) => b.isActive).map((branch: any) => {
                    const status = branchAvailability[branch.id] ?? 'available';
                    return (
                      <div key={branch.id} className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">{branch.name}</p>
                        <div className="flex gap-2 flex-wrap">
                          {(['available', 'out_of_stock_today', 'completely_unavailable'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setBranchAvailability(prev => ({ ...prev, [branch.id]: s }))}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${
                                status === s
                                  ? s === 'available'
                                    ? 'bg-green-100 border-green-500 text-green-800 font-medium'
                                    : s === 'out_of_stock_today'
                                    ? 'bg-orange-100 border-orange-500 text-orange-800 font-medium'
                                    : 'bg-red-100 border-red-500 text-red-800 font-medium'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {s === 'available' ? adminT('products.dialog.statusAvailable') : s === 'out_of_stock_today' ? adminT('products.dialog.statusOutOfStock') : adminT('products.dialog.statusUnavailable')}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Volume Discounts Section */}
            <div className="space-y-2 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium">{adminT('products.volumeDiscount.title')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setVolumeDiscounts(prev => [...prev, { minQuantity: '', discountType: 'percentage', discountValue: '' }])}
                >
                  + {adminT('products.volumeDiscount.addRow')}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {adminT('products.volumeDiscount.description')}
                {' '}({adminT('products.volumeDiscount.fromLabel')} X {getVolumeUnitSuffix(unit || '100g')})
              </p>
              {!product?.id && volumeDiscounts.length > 0 && (
                <p className="text-xs text-blue-600 italic">{adminT('products.volumeDiscount.newProductNote')}</p>
              )}
              {volumeDiscounts.length === 0 && (
                <p className="text-xs text-gray-400 italic">{adminT('products.volumeDiscount.empty')}</p>
              )}
              {volumeDiscounts.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min="0"
                      step={unit === '100g' || unit === '100ml' ? '50' : '1'}
                      placeholder={adminT('products.volumeDiscount.fromLabel')}
                      value={row.minQuantity}
                      onChange={e => setVolumeDiscounts(prev => prev.map((d, i) => i === idx ? { ...d, minQuantity: e.target.value } : d))}
                      className="text-xs h-8 w-28 pr-7"
                    />
                    <span className="absolute right-2 text-xs text-gray-400 pointer-events-none select-none">
                      {getVolumeUnitSuffix(unit || '100g')}
                    </span>
                  </div>
                  <select
                    value={row.discountType}
                    onChange={e => setVolumeDiscounts(prev => prev.map((d, i) => i === idx ? { ...d, discountType: e.target.value as 'percentage' | 'fixed' } : d))}
                    className="text-xs h-8 border border-input rounded-md px-2 bg-background"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">{adminT('products.volumeDiscount.fixedLabel')}</option>
                  </select>
                  <Input
                    type="number"
                    min="0"
                    max={row.discountType === 'percentage' ? "100" : undefined}
                    step="0.1"
                    placeholder={adminT('products.volumeDiscount.discountPct')}
                    value={row.discountValue}
                    onChange={e => setVolumeDiscounts(prev => prev.map((d, i) => i === idx ? { ...d, discountValue: e.target.value } : d))}
                    className="text-xs h-8 w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    onClick={() => setVolumeDiscounts(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

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

  // Map language code to tab key
  const langToTabKey = (lang: string) => {
    switch (lang) {
      case 'en': return 'english';
      case 'he': return 'hebrew';
      case 'ar': return 'arabic';
      default:   return 'basic';
    }
  };

  const [activeTab, setActiveTab] = useState(() => langToTabKey(i18n.language));
  
  // Get enabled languages from settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  
  // Define available language tabs based on enabled languages and their order from settings
  const enabledLanguages = (settings as any)?.enabledLanguages || ['ru', 'en', 'he', 'ar'];
  const categoryDefaultLang = (settings as any)?.defaultLanguage || 'ru';
  const languageOrder: string[] = (settings as any)?.languageOrder || enabledLanguages;
  const allCategoryTabs = [
    { key: 'basic', label: 'Русский', icon: Languages, langCode: 'ru' },
    { key: 'english', label: 'English', icon: Globe, langCode: 'en' },
    { key: 'hebrew', label: 'עברית', icon: Languages, langCode: 'he' },
    { key: 'arabic', label: 'العربية', icon: Type, langCode: 'ar' }
  ];
  const availableTabs = languageOrder
    .map(code => allCategoryTabs.find(tab => tab.langCode === code))
    .filter((tab): tab is NonNullable<typeof tab> => tab != null && enabledLanguages.includes(tab.langCode));

  // When dialog opens — set active tab to current UI language (if available), else first tab
  useEffect(() => {
    if (open && availableTabs.length > 0) {
      const preferred = langToTabKey(i18n.language);
      const found = availableTabs.find(tab => tab.key === preferred);
      setActiveTab(found ? found.key : availableTabs[0].key);
    }
  }, [open]);
  
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
      image: "",
      isActive: true,
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
          image: category.image || "",
          isActive: category.isActive ?? true,
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
          isActive: true,
        });
      }
    }
  }, [open, category, form]);

  const langToField: Record<string, string> = { ru: 'name', en: 'name_en', he: 'name_he', ar: 'name_ar' };

  const handleCategorySubmit = (data: any) => {
    const reqField = langToField[categoryDefaultLang] || 'name';
    if (!data[reqField]?.trim()) {
      form.setError(reqField as any, { message: adminT('categories.categoryNameRequired') });
      const tabKey = langToTabKey[categoryDefaultLang] || 'basic';
      if (availableTabs.some((t: any) => t.key === tabKey)) {
        setActiveTab(tabKey);
      }
      return;
    }
    onSubmit(data);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
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
            const isRequired = tab.langCode === categoryDefaultLang;
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
                <span className="hidden sm:inline">{tab.label}{isRequired ? ' *' : ''}</span>
              </button>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCategorySubmit)} className="space-y-4">
            {activeTab === "basic" && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (Русский){categoryDefaultLang === 'ru' ? ' *' : ''}</FormLabel>
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

              </>
            )}

            {activeTab === "english" && (
              <>
                <FormField
                  control={form.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (English){categoryDefaultLang === 'en' ? ' *' : ''}</FormLabel>
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
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (עברית){categoryDefaultLang === 'he' ? ' *' : ''}</FormLabel>
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
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.name')} (العربية){categoryDefaultLang === 'ar' ? ' *' : ''}</FormLabel>
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

            {/* ── Shared fields: always visible regardless of active language tab ── */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => {
                  const commonIcons = [
                    "🥗", "🍖", "🐟", "🥩", "🥕", "🍎", "🍞", "🥛",
                    "🍽️", "🥘", "🍱", "🥙", "🧀", "🍯", "🥜", "🍲",
                    "🍰", "🥧", "🍚", "🌮", "🍕", "🍝", "🥪", "🌯",
                    "🥫", "🧄", "🫒", "🌶️", "🥒", "🍅", "🥑", "🥬",
                    "🍄", "🌰", "🥔", "🍠", "🫘", "🧊", "🍳", "🥓",
                    "🌭", "🥨", "🧈", "🥤", "☕", "🍵", "🧃", "🍷",
                    "🧂", "🫚", "🌿", "🍀", "🥄", "🍋", "🥥", "🌱",
                    "🫖", "🧉", "🥝", "🍊", "🍌", "🫐", "🍇", "🍈",
                    "🥣", "🍶", "🏺", "🧊", "🔥", "⭐", "✨", "🎭",
                    "🔶", "🟫", "🟠", "🟡", "🟢", "🔴", "🟣", "⚫"
                  ];
                  return (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.fields.icon')}</FormLabel>
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 p-3 border rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {field.value && field.value.startsWith('/uploads/') ? (
                            <img src={field.value} alt="Category icon" className="w-8 h-8 object-cover rounded" />
                          ) : (
                            <span className="text-2xl">{field.value}</span>
                          )}
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.selectedIcon')}</div>
                            <div className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.clickToSelect')}</div>
                          </div>
                        </div>
                        <div>
                          <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.popularIcons')}:</div>
                          <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-2">
                            {commonIcons.map((icon) => (
                              <Button
                                key={icon}
                                type="button"
                                variant={field.value === icon ? "default" : "outline"}
                                className={`h-10 w-10 p-0 text-lg ${field.value === icon ? "bg-primary border-primary hover:bg-primary" : "hover:bg-orange-50 hover:border-orange-300"}`}
                                onClick={() => field.onChange(icon)}
                              >{icon}</Button>
                            ))}
                          </div>
                        </div>
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
                        <div>
                          <div className={`text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.uploadImage')}:</div>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-orange-300 transition-colors">
                            <ImageUpload
                              value=""
                              onChange={(url) => { if (url) field.onChange(url); }}
                            />
                            <div className={`text-xs text-gray-400 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('categories.recommendedSize')}</div>
                          </div>
                        </div>
                      </div>
                      <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('themes.categoryPhotoHint')}</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {field.value && (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                            <img src={field.value} alt="category" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => field.onChange("")}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >×</button>
                          </div>
                        )}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-orange-300 transition-colors">
                          <ImageUpload value="" onChange={(url) => { if (url) field.onChange(url); }} />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className={`flex items-center justify-between rounded-lg border p-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <FormLabel className="text-sm font-medium">{adminT('categories.showCategory')}</FormLabel>
                      <p className="text-xs text-gray-500">{adminT('categories.hidden')}</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
function StoreSettingsForm({ storeSettings, onSubmit, isLoading, testEmailMutation }: {
  storeSettings: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  testEmailMutation: any;
}) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const { toast } = useToast();
  const currentLanguage = i18n.language as SupportedLanguage;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isEmailNotificationsOpen, setIsEmailNotificationsOpen] = useState(false);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] = useState(false);
  const [isMobileQuickButtonsOpen, setIsMobileQuickButtonsOpen] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);
  const [isDeliveryPaymentOpen, setIsDeliveryPaymentOpen] = useState(false);
  const [showHypHelp, setShowHypHelp] = useState(false);
  const [dragOverLang, setDragOverLang] = useState<string | null>(null);

  const [isTrackingCodeOpen, setIsTrackingCodeOpen] = useState(false);
  const [isAdvertisingFeedsOpen, setIsAdvertisingFeedsOpen] = useState(false);
  const prevStoreSettingsRef = useRef<any>(null);

  const queryClient = useQueryClient();

  const regenerateFeedTokenMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/settings/regenerate-feed-token'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: () => {
      toast({ title: adminT('common.error'), variant: 'destructive' });
    }
  });

  const feedUrl = (url: string) => `${url}${url.includes('?') ? '&' : '?'}token=${storeSettings?.feedToken || ''}`;

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
      deliveryHours: {
        monday: storeSettings?.deliveryHours?.monday ?? null,
        tuesday: storeSettings?.deliveryHours?.tuesday ?? null,
        wednesday: storeSettings?.deliveryHours?.wednesday ?? null,
        thursday: storeSettings?.deliveryHours?.thursday ?? null,
        friday: storeSettings?.deliveryHours?.friday ?? null,
        saturday: storeSettings?.deliveryHours?.saturday ?? null,
        sunday: storeSettings?.deliveryHours?.sunday ?? null,
      },
      deliveryInfo: getLocalizedFieldForAdmin(storeSettings, 'deliveryInfo', currentLanguage, storeSettings) || "",
      paymentInfo: getLocalizedFieldForAdmin(storeSettings, 'paymentInfo', currentLanguage, storeSettings) || "",
      aboutText: getLocalizedFieldForAdmin(storeSettings, 'aboutText', currentLanguage, storeSettings) || "",
      paymentMethods: storeSettings?.paymentMethods || [
        { name: "Наличными при получении", id: 1 },
        { name: "Банковской картой", id: 2 },
        { name: "Банковский перевод", id: 3 }
      ],
      paymentProvider: (storeSettings as any)?.paymentProviderConfig?.active || 'none',
      hypMasof: (storeSettings as any)?.paymentProviderConfig?.hyp?.masof || '',
      hypKey: (storeSettings as any)?.paymentProviderConfig?.hyp?.key || '',
      hypPassP: (storeSettings as any)?.paymentProviderConfig?.hyp?.passP || '',
      hypTestMode: (storeSettings as any)?.paymentProviderConfig?.hyp?.testMode !== false,
      aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
      deliveryFee: storeSettings?.deliveryFee || "15.00",
      freeDeliveryFrom: storeSettings?.freeDeliveryFrom || "",
      deliveryTimeMode: storeSettings?.deliveryTimeMode || "hours",
      discountBadgeText: getLocalizedFieldForAdmin(storeSettings, 'discountBadgeText', currentLanguage, storeSettings) || "",
      preorderButtonStyle: storeSettings?.preorderButtonStyle || "tomorrow",
      checkoutGuestFirst: storeSettings?.checkoutGuestFirst || false,
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
      enabledLanguages: storeSettings?.enabledLanguages || ["ru", "en", "he", "ar"],
      languageOrder: (storeSettings as any)?.languageOrder || storeSettings?.enabledLanguages || ["ru", "en", "he", "ar"],
      // PWA Settings
      pwaIcon: storeSettings?.pwaIcon || "",
      pwaName: getLocalizedFieldForAdmin(storeSettings, 'pwaName', currentLanguage, storeSettings) || "",
      pwaDescription: getLocalizedFieldForAdmin(storeSettings, 'pwaDescription', currentLanguage, storeSettings) || "",
      // Email notification settings
      emailNotificationsEnabled: storeSettings?.emailNotificationsEnabled || false,
      orderNotificationEmail: storeSettings?.orderNotificationEmail || "",
      orderNotificationFromName: storeSettings?.orderNotificationFromName || "Ordis",
      orderNotificationFromEmail: storeSettings?.orderNotificationFromEmail || "noreply@edahouse.com",
      smtpHost: storeSettings?.smtpHost || "",
      smtpPort: storeSettings?.smtpPort || 587,
      smtpSecure: storeSettings?.smtpSecure || false,
      smtpUser: storeSettings?.smtpUser || "",
      smtpPassword: "",
      sendgridApiKey: storeSettings?.sendgridApiKey || "",
      useSendgrid: storeSettings?.useSendgrid || false,
      // Facebook Conversions API settings
      facebookConversionsApiEnabled: storeSettings?.facebookConversionsApiEnabled || false,
      facebookPixelId: storeSettings?.facebookPixelId || "",
      facebookAccessToken: storeSettings?.facebookAccessToken || "",
      mobileQuickButtons: (storeSettings as any)?.mobileQuickButtons || [],
    } as any,
  });

  const watchedPaymentProvider = useWatch({ control: form.control, name: 'paymentProvider' });

  // Helper function to get payment method name for current language (strict - no cross-language fallback)
  const getPaymentMethodName = (method: any, language: string) => {
    switch (language) {
      case 'en': return method.name_en ?? '';
      case 'he': return method.name_he ?? '';
      case 'ar': return method.name_ar ?? '';
      default: return method.name ?? '';
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
      const isStoreSettingsChange = prevStoreSettingsRef.current !== storeSettings;
      prevStoreSettingsRef.current = storeSettings;
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
        deliveryHours: {
          monday: storeSettings?.deliveryHours?.monday ?? null,
          tuesday: storeSettings?.deliveryHours?.tuesday ?? null,
          wednesday: storeSettings?.deliveryHours?.wednesday ?? null,
          thursday: storeSettings?.deliveryHours?.thursday ?? null,
          friday: storeSettings?.deliveryHours?.friday ?? null,
          saturday: storeSettings?.deliveryHours?.saturday ?? null,
          sunday: storeSettings?.deliveryHours?.sunday ?? null,
        },
        deliveryInfo: getLocalizedFieldForAdmin(storeSettings, 'deliveryInfo', currentLanguage, storeSettings) || "",
        aboutText: getLocalizedFieldForAdmin(storeSettings, 'aboutText', currentLanguage, storeSettings) || "",
        bannerButtonText: getLocalizedFieldForAdmin(storeSettings, 'bannerButtonText', currentLanguage, storeSettings) || "",
        paymentInfo: getLocalizedFieldForAdmin(storeSettings, 'paymentInfo', currentLanguage, storeSettings) || "",
        discountBadgeText: getLocalizedFieldForAdmin(storeSettings, 'discountBadgeText', currentLanguage, storeSettings) || "",
        preorderButtonStyle: storeSettings?.preorderButtonStyle || "tomorrow",
        checkoutGuestFirst: storeSettings?.checkoutGuestFirst || false,
        whatsappDefaultMessage: getLocalizedFieldForAdmin(storeSettings, 'whatsappDefaultMessage', currentLanguage, storeSettings) || "",
        cartBannerText: getLocalizedFieldForAdmin(storeSettings, 'cartBannerText', currentLanguage, storeSettings) || "",
        paymentMethods: isStoreSettingsChange ? (storeSettings?.paymentMethods || []) : form.getValues('paymentMethods'),
        aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
        deliveryFee: storeSettings?.deliveryFee || "15.00",
        freeDeliveryFrom: storeSettings?.freeDeliveryFrom || "",
        deliveryTimeMode: storeSettings?.deliveryTimeMode || "hours",

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
        enabledLanguages: storeSettings?.enabledLanguages || ["ru", "en", "he", "ar"],
        languageOrder: (storeSettings as any)?.languageOrder || storeSettings?.enabledLanguages || ["ru", "en", "he", "ar"],
        bannerButtonLink: storeSettings?.bannerButtonLink || "",
        modernBlock1Icon: storeSettings?.modernBlock1Icon || "",
        modernBlock1Text: storeSettings?.modernBlock1Text || "",
        modernBlock2Icon: storeSettings?.modernBlock2Icon || "",
        modernBlock2Text: storeSettings?.modernBlock2Text || "",
        modernBlock3Icon: storeSettings?.modernBlock3Icon || "",
        modernBlock3Text: storeSettings?.modernBlock3Text || "",
        // Email notification settings
        emailNotificationsEnabled: storeSettings?.emailNotificationsEnabled || false,
        orderNotificationEmail: storeSettings?.orderNotificationEmail || "",
        orderNotificationFromName: storeSettings?.orderNotificationFromName || "Ordis",
        orderNotificationFromEmail: storeSettings?.orderNotificationFromEmail || "noreply@edahouse.com",
        smtpHost: storeSettings?.smtpHost || "",
        smtpPort: storeSettings?.smtpPort || 587,
        smtpSecure: storeSettings?.smtpSecure || false,
        smtpUser: storeSettings?.smtpUser || "",
        smtpPassword: "",
        sendgridApiKey: storeSettings?.sendgridApiKey || "",
        useSendgrid: storeSettings?.useSendgrid || false,
        // Facebook Conversions API settings
        facebookConversionsApiEnabled: storeSettings?.facebookConversionsApiEnabled || false,
        facebookPixelId: storeSettings?.facebookPixelId || "",
        facebookAccessToken: storeSettings?.facebookAccessToken || "",
        mobileQuickButtons: (storeSettings as any)?.mobileQuickButtons || [],
        paymentProvider: (storeSettings as any)?.paymentProviderConfig?.active || 'none',
        hypMasof: (storeSettings as any)?.paymentProviderConfig?.hyp?.masof || '',
        hypKey: (storeSettings as any)?.paymentProviderConfig?.hyp?.key || '',
        hypPassP: (storeSettings as any)?.paymentProviderConfig?.hyp?.passP || '',
        hypTestMode: (storeSettings as any)?.paymentProviderConfig?.hyp?.testMode !== false,
      } as any);
    }
  }, [storeSettings, currentLanguage, form]);

  // Handle test email
  const handleTestEmail = () => {
    // Prevent double-clicks during loading
    if (testEmailMutation.isPending) {
      console.log("⚠️ Test email already in progress, ignoring duplicate click");
      return;
    }
    
    const emailAddress = form.getValues("orderNotificationEmail");
    if (!emailAddress) {
      toast({
        title: "❌ Ошибка",
        description: "Укажите email адрес для уведомлений",
        variant: "destructive"
      });
      return;
    }

    console.log("🔄 Sending test email to:", emailAddress);
    testEmailMutation.mutate(emailAddress);
  };

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
          ...createMultilingualUpdate('pwaName', data.pwaName, currentLanguage),
          ...createMultilingualUpdate('pwaDescription', data.pwaDescription, currentLanguage),
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
          pwaName: storeSettings?.pwaName || '',
          pwaNameEn: storeSettings?.pwaNameEn || '',
          pwaNameHe: storeSettings?.pwaNameHe || '',
          pwaNameAr: storeSettings?.pwaNameAr || '',
          pwaDescription: storeSettings?.pwaDescription || '',
          pwaDescriptionEn: storeSettings?.pwaDescriptionEn || '',
          pwaDescriptionHe: storeSettings?.pwaDescriptionHe || '',
          pwaDescriptionAr: storeSettings?.pwaDescriptionAr || '',
        };
        
        // Handle payment methods specially - preserve all language data
        const processedPaymentMethods = data.paymentMethods?.map((method: any) => {
          // Find corresponding method in existing data
          const existingMethod = storeSettings?.paymentMethods?.find((existing: any) => 
            existing.name === method.name || existing.id === method.id
          );
          
          if (existingMethod) {
            // Use form values directly — each language field is independent
            return {
              ...existingMethod,
              ...method,
              name:    method.name    ?? existingMethod.name    ?? '',
              name_en: method.name_en ?? existingMethod.name_en ?? '',
              name_he: method.name_he ?? existingMethod.name_he ?? '',
              name_ar: method.name_ar ?? existingMethod.name_ar ?? '',
            };
          }
          
          return method;
        }) || [];

        // Merge preserved data with current language updates and other form data
        const finalData = { 
          ...data, 
          ...preservedData, 
          ...multilingualUpdates,
          // Phone and email are the same for all languages — sync all variants.
          // If the admin left the field blank, keep the existing stored value.
          ...((() => {
            const phone = data.contactPhone || storeSettings?.contactPhone || '';
            const email = data.contactEmail || storeSettings?.contactEmail || '';
            return {
              contactPhone: phone,
              contactPhoneEn: phone,
              contactPhoneHe: phone,
              contactPhoneAr: phone,
              contactEmail: email,
              contactEmailEn: email,
              contactEmailHe: email,
              contactEmailAr: email,
            };
          })()),
          // address IS multilingual — handled by multilingualUpdates + preservedData above.
          whatsappPhoneNumber: data.whatsappPhoneNumber,
          paymentMethods: processedPaymentMethods,
          paymentProviderConfig: {
            active: data.paymentProvider || 'none',
            ...(data.paymentProvider === 'hyp' ? {
              hyp: {
                masof: data.hypMasof || '',
                passP: data.hypPassP || '',
                key: data.hypKey || '',
                testMode: data.hypTestMode !== false,
              }
            } : {}),
          },
          // Include email notification settings directly (they're not multilingual)
          emailNotificationsEnabled: data.emailNotificationsEnabled,
          orderNotificationEmail: data.orderNotificationEmail,
          orderNotificationFromName: data.orderNotificationFromName,
          orderNotificationFromEmail: data.orderNotificationFromEmail,
          smtpHost: data.smtpHost,
          smtpPort: data.smtpPort,
          smtpSecure: data.smtpSecure,
          smtpUser: data.smtpUser,
          smtpPassword: data.smtpPassword,
          sendgridApiKey: data.sendgridApiKey,
          useSendgrid: data.useSendgrid,
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

          <FormField
            control={form.control}
            name="preorderButtonStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{adminT('storeSettings.preorderButtonStyleLabel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="tomorrow">{adminT('storeSettings.preorderButtonStyleTomorrow')}</SelectItem>
                    <SelectItem value="preorder">{adminT('storeSettings.preorderButtonStylePreorder')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {adminT('storeSettings.preorderButtonStyleDescription')}
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkoutGuestFirst"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{adminT('storeSettings.checkoutGuestFirstLabel')}</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="false">{adminT('storeSettings.checkoutGuestFirstRegister')}</SelectItem>
                    <SelectItem value="true">{adminT('storeSettings.checkoutGuestFirstGuest')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {adminT('storeSettings.checkoutGuestFirstDescription')}
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

            {/* PWA Settings */}
            <div className="col-span-1 md:col-span-2">
              <div className="border-t pt-6 mt-6">
                <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                  <div className="h-4 w-4 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">PWA</span>
                  </div>
                  {adminT('storeSettings.pwaSettings')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="pwaIcon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{adminT('storeSettings.pwaIcon')}</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          {adminT('storeSettings.pwaIconDescription')}
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pwaName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{adminT('storeSettings.pwaName')}</FormLabel>
                          <FormControl>
                            <Input placeholder={adminT('storeSettings.pwaNamePlaceholder')} {...field} className="text-sm" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="pwaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{adminT('storeSettings.pwaDescription')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={adminT('storeSettings.pwaDescriptionPlaceholder')} 
                              {...field} 
                              className="text-sm resize-none"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
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
            {/* Unified drag-and-drop language order list */}
            {(() => {
              const langOrder: string[] = form.watch("languageOrder") || ["ru", "en", "he", "ar"];
              const defaultLang: string = langOrder[0] || "ru";
              const allLangEntries = Object.entries(LANGUAGES);
              const disabledLangs = allLangEntries.filter(([code]) => !langOrder.includes(code));

              const setOrder = (newOrder: string[]) => {
                form.setValue("languageOrder", newOrder);
                form.setValue("enabledLanguages", newOrder);
                form.setValue("defaultLanguage", newOrder[0] || "ru");
              };

              return (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">{adminT('storeSettings.availableLanguages') || 'Порядок языков'}</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      {isRTL
                        ? 'גרור לשינוי סדר. ⭐ = שפת ברירת מחדל (תמיד ראשונה). לחץ על ⭐ להגדרה כברירת מחדל.'
                        : 'Перетащите для изменения порядка. ⭐ = основной язык (всегда первый). Нажмите ⭐ чтобы сделать основным.'}
                    </p>

                    {/* Enabled languages — draggable */}
                    <div className="space-y-2">
                      {langOrder.map((code: string, index: number) => {
                        const info = LANGUAGES[code as keyof typeof LANGUAGES];
                        if (!info) return null;
                        const isDefault = index === 0;
                        return (
                          <div
                            key={code}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(index)); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragOver={(e) => { e.preventDefault(); setDragOverLang(code); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const fromIndex = Number(e.dataTransfer.getData('text/plain'));
                              if (fromIndex === index) { setDragOverLang(null); return; }
                              const newOrder = [...langOrder];
                              newOrder.splice(fromIndex, 1);
                              newOrder.splice(index, 0, langOrder[fromIndex]);
                              setOrder(newOrder);
                              setDragOverLang(null);
                            }}
                            onDragEnd={() => setDragOverLang(null)}
                            className={`flex items-center gap-3 p-3 border-2 rounded-lg bg-white cursor-grab active:cursor-grabbing select-none transition-all ${
                              dragOverLang === code ? 'border-primary bg-primary/5 shadow-md' : isDefault ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0 text-center">{index + 1}</span>
                            <span className="text-xl flex-shrink-0">{(info as any).flag}</span>
                            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                              <div className="font-medium text-sm">{(info as any).name}</div>
                              <div className="text-xs text-gray-500">{(info as any).nativeName}</div>
                            </div>
                            {/* Make default button */}
                            <button
                              type="button"
                              draggable={false}
                              onMouseDown={(e) => e.stopPropagation()}
                              title={isDefault ? (isRTL ? 'שפת ברירת מחדל' : 'Основной язык') : (isRTL ? 'הגדר כברירת מחדל' : 'Сделать основным')}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDefault) return;
                                const newOrder = [code, ...langOrder.filter((c: string) => c !== code)];
                                setOrder(newOrder);
                              }}
                              className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${isDefault ? 'text-yellow-500 cursor-default' : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'}`}
                            >
                              <Star className={`h-4 w-4 ${isDefault ? 'fill-yellow-500' : ''}`} />
                            </button>
                            {/* Disable button — not available for default */}
                            {isDefault ? (
                              <div className="w-7 flex-shrink-0" />
                            ) : (
                              <button
                                type="button"
                                draggable={false}
                                onMouseDown={(e) => e.stopPropagation()}
                                title={isRTL ? 'השבת שפה' : 'Отключить язык'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (langOrder.length <= 1) return;
                                  const newOrder = langOrder.filter((c: string) => c !== code);
                                  setOrder(newOrder);
                                }}
                                className="p-1.5 rounded-md text-green-600 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Disabled languages */}
                    {disabledLangs.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                          {isRTL ? 'שפות מושבתות' : 'Отключённые языки'}
                        </div>
                        {disabledLangs.map(([code, info]) => (
                          <div
                            key={code}
                            className={`flex items-center gap-3 p-3 border border-dashed border-gray-200 rounded-lg bg-gray-50 opacity-70 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <div className="w-4 flex-shrink-0" />
                            <div className="w-5 flex-shrink-0" />
                            <span className="text-xl flex-shrink-0">{(info as any).flag}</span>
                            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                              <div className="font-medium text-sm text-gray-500">{(info as any).name}</div>
                              <div className="text-xs text-gray-400">{(info as any).nativeName}</div>
                            </div>
                            <div className="w-7 flex-shrink-0" />
                            <button
                              type="button"
                              title={isRTL ? 'הפעל שפה' : 'Включить язык'}
                              onClick={() => {
                                const newOrder = [...langOrder, code];
                                setOrder(newOrder);
                              }}
                              className="p-1.5 rounded-md text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors flex-shrink-0"
                            >
                              <EyeOff className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 mt-0.5 flex-shrink-0">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <strong>{isRTL ? 'סדר עדיפויות' : 'Порядок приоритетов'}:</strong>{' '}
                  {isRTL
                    ? 'אם תרגום חסר לשפה מבוקשת, המערכת תחפש לפי הסדר הנ"ל ותציג את השפה הראשונה שנמצאה.'
                    : 'Если перевод отсутствует для запрошенного языка, система проверяет языки в указанном порядке и показывает первый найденный.'}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Быстрые кнопки мобильного меню */}
        <Collapsible open={isMobileQuickButtonsOpen} onOpenChange={setIsMobileQuickButtonsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <Smartphone className="h-5 w-5 text-primary" />
                <h3 className={`text-lg font-semibold flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('storeSettings.mobileQuickButtons')}</h3>
                {isMobileQuickButtonsOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <p className="text-sm text-gray-500">{adminT('storeSettings.mobileQuickButtonsDescription')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'orders', label: adminT('tabs.orders') },
                { key: 'products', label: adminT('tabs.products') },
                { key: 'categories', label: adminT('tabs.categories') },
                { key: 'users', label: adminT('tabs.users') },
              ].map(({ key, label }) => {
                const currentButtons: string[] = form.watch('mobileQuickButtons') || [];
                const isChecked = currentButtons.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => {
                      const next = isChecked
                        ? currentButtons.filter((k: string) => k !== key)
                        : [...currentButtons, key];
                      form.setValue('mobileQuickButtons', next);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                      {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              ℹ️ {adminT('storeSettings.mobileQuickButtonsNote')}
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
                <Select value={field.value || 'monday'} onValueChange={field.onChange}>
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
              const currentDeliveryHours = form.watch(`deliveryHours.${key}` as any);
              const hasCustomDelivery = !!currentDeliveryHours && currentDeliveryHours !== "closed";
              const isNoDelivery = currentDeliveryHours === "closed";
              const [deliveryOpen, deliveryClose] = hasCustomDelivery ? currentDeliveryHours.split("-") : ["10:00", "18:00"];

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
                            const [cH, cM] = (closeTime || "18:00").split(":").map(Number);
                            const [nH, nM] = value.split(":").map(Number);
                            const closeMinutes = cH * 60 + cM;
                            const newOpenMinutes = nH * 60 + nM;
                            const newClose = newOpenMinutes >= closeMinutes ? `${(nH + 1).toString().padStart(2, "0")}:${closeTime?.split(":")[1] || "00"}` : (closeTime || "18:00");
                            form.setValue(`workingHours.${key}` as any, `${value}-${newClose}`);
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
                            {(() => {
                              const [openH, openM] = (openTime || "09:00").split(":").map(Number);
                              const openMinutes = openH * 60 + openM;
                              return Array.from({ length: 48 }, (_, i) => {
                                const hour = Math.floor(i / 2);
                                const minute = i % 2 === 0 ? "00" : "30";
                                const totalMinutes = hour * 60 + (i % 2 === 0 ? 0 : 30);
                                if (totalMinutes <= openMinutes) return null;
                                const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                                return (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                );
                              }).filter(Boolean);
                            })()}
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  )}
                  {/* Delivery hours section - shown for all days including closed days */}
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-300 space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{adminT('storeSettings.deliveryHoursTitle')}</div>
                        <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          <label className={`flex items-center gap-1.5 cursor-pointer select-none ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <input
                              type="checkbox"
                              checked={hasCustomDelivery}
                              disabled={isNoDelivery}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  form.setValue(`deliveryHours.${key}` as any, "10:00-18:00");
                                } else {
                                  form.setValue(`deliveryHours.${key}` as any, null);
                                }
                              }}
                              className="h-3.5 w-3.5 accent-blue-500"
                            />
                            <span className={`text-xs ${isNoDelivery ? 'text-gray-300' : 'text-gray-600'}`}>
                              {adminT('storeSettings.addDeliveryTime')}
                            </span>
                          </label>
                          <label className={`flex items-center gap-1.5 cursor-pointer select-none ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isNoDelivery}
                              disabled={hasCustomDelivery}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  form.setValue(`deliveryHours.${key}` as any, "closed");
                                } else {
                                  form.setValue(`deliveryHours.${key}` as any, null);
                                }
                              }}
                              className="h-3.5 w-3.5 accent-red-500"
                            />
                            <span className={`text-xs ${hasCustomDelivery ? 'text-gray-300' : 'text-red-600'}`}>
                              {adminT('storeSettings.noDelivery')}
                            </span>
                          </label>
                        </div>
                        {!hasCustomDelivery && !isNoDelivery && (
                          <div className="text-xs text-gray-400 italic">{adminT('storeSettings.deliveryInherited')}</div>
                        )}
                        {hasCustomDelivery && (
                          <div className="space-y-2">
                            <div>
                              <FormLabel className="text-xs text-blue-600 block mb-1">{adminT('storeSettings.deliveryOpenTime')}</FormLabel>
                              <Select
                                value={deliveryOpen}
                                onValueChange={(value) => {
                                  const [cH, cM] = (deliveryClose || "18:00").split(":").map(Number);
                                  const [nH, nM] = value.split(":").map(Number);
                                  const dCloseMin = cH * 60 + cM;
                                  const dOpenMin = nH * 60 + nM;
                                  const newClose = dOpenMin >= dCloseMin ? `${(nH + 1).toString().padStart(2, "0")}:${deliveryClose?.split(":")[1] || "00"}` : (deliveryClose || "18:00");
                                  form.setValue(`deliveryHours.${key}` as any, `${value}-${newClose}`);
                                }}
                              >
                                <SelectTrigger className="text-xs h-8 border-blue-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 48 }, (_, i) => {
                                    const hour = Math.floor(i / 2);
                                    const minute = i % 2 === 0 ? "00" : "30";
                                    const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                                    return <SelectItem key={time} value={time}>{time}</SelectItem>;
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FormLabel className="text-xs text-blue-600 block mb-1">{adminT('storeSettings.deliveryCloseTime')}</FormLabel>
                              <Select
                                value={deliveryClose}
                                onValueChange={(value) => {
                                  form.setValue(`deliveryHours.${key}` as any, `${deliveryOpen}-${value}`);
                                }}
                              >
                                <SelectTrigger className="text-xs h-8 border-blue-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => {
                                    const [dOpenH, dOpenM] = (deliveryOpen || "10:00").split(":").map(Number);
                                    const dOpenMinutes = dOpenH * 60 + dOpenM;
                                    return Array.from({ length: 48 }, (_, i) => {
                                      const hour = Math.floor(i / 2);
                                      const minute = i % 2 === 0 ? "00" : "30";
                                      const totalMinutes = hour * 60 + (i % 2 === 0 ? 0 : 30);
                                      if (totalMinutes <= dOpenMinutes) return null;
                                      const time = `${hour.toString().padStart(2, "0")}:${minute}`;
                                      return <SelectItem key={time} value={time}>{time}</SelectItem>;
                                    }).filter(Boolean);
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                  </div>
                </div>
              );
            })}
          </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Email Notifications Section */}
        <Collapsible open={isEmailNotificationsOpen} onOpenChange={setIsEmailNotificationsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full`} dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? (
                  <>
                    {isEmailNotificationsOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-semibold flex-1 text-right">{adminT('storeSettings.emailNotifications')}</h3>
                    <Mail className="h-5 w-5 text-primary" />
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold flex-1 text-left">{adminT('storeSettings.emailNotifications')}</h3>
                    {isEmailNotificationsOpen ? (
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
            
            {/* Email Notifications Toggle */}
            <FormField
              control={form.control}
              name="emailNotificationsEnabled"
              render={({ field }) => (
                <FormItem>
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Mail className="h-4 w-4" />
                      <FormLabel>{adminT('storeSettings.enableEmailNotifications')}</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("emailNotificationsEnabled") && (
              <>
                {/* Order Notification Email */}
                <FormField
                  control={form.control}
                  name="orderNotificationEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <Mail className="h-4 w-4" />
                        {adminT('storeSettings.emailNotificationRecipient')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={adminT('storeSettings.emailRecipientPlaceholder')}
                          type="email"
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Test Email Button */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">
                      📧 {adminT('storeSettings.emailDeliveryCheck')}
                    </p>
                    <p className="text-xs text-blue-600">
                      {adminT('storeSettings.emailDeliveryCheckDesc')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    disabled={testEmailMutation.isPending || !form.watch("orderNotificationEmail")}
                    onClick={() => handleTestEmail()}
                  >
                    {testEmailMutation.isPending ? adminT('storeSettings.emailSending') : adminT('storeSettings.emailTestButton')}
                  </Button>
                </div>

                {/* From Name */}
                <FormField
                  control={form.control}
                  name="orderNotificationFromName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {adminT('storeSettings.senderName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={adminT('storeSettings.senderNamePlaceholder')}
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* From Email */}
                <FormField
                  control={form.control}
                  name="orderNotificationFromEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {adminT('storeSettings.senderEmail')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={adminT('storeSettings.senderEmailPlaceholder')}
                          type="email"
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* SendGrid Toggle */}
                <FormField
                  control={form.control}
                  name="useSendgrid"
                  render={({ field }) => (
                    <FormItem>
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
                          <FormLabel>{adminT('storeSettings.useSendgrid')}</FormLabel>
                          <p className="text-xs text-gray-500">{adminT('storeSettings.sendgridDescription')}</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("useSendgrid") ? (
                  /* SendGrid Configuration */
                  <FormField
                    control={form.control}
                    name="sendgridApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                          {adminT('storeSettings.sendgridApiKey')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SG...."
                            type="password"
                            className="text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                ) : (
                  /* SMTP Configuration */
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <h4 className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('storeSettings.smtpConfiguration')}</h4>
                    
                    <FormField
                      control={form.control}
                      name="smtpHost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                            {adminT('storeSettings.smtpHost')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={adminT('storeSettings.smtpHostPlaceholder')}
                              className="text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="smtpPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                              {adminT('storeSettings.smtpPort')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="587"
                                type="number"
                                className="text-sm"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtpSecure"
                        render={({ field }) => (
                          <FormItem>
                            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <FormLabel className="text-sm">{adminT('storeSettings.useSslTls')}</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="smtpUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                            {adminT('storeSettings.smtpUsername')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={adminT('storeSettings.smtpUsernamePlaceholder')}
                              type="email"
                              className="text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtpPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                            {adminT('storeSettings.smtpPassword')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="••••••••"
                              type="password"
                              autoComplete="new-password"
                              className="text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className={`text-xs text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {storeSettings?.smtpPassword
                              ? ({
                                  ru: 'Оставьте пустым, чтобы сохранить текущий пароль',
                                  en: 'Leave blank to keep the current password',
                                  he: 'השאר ריק כדי לשמור את הסיסמה הנוכחית',
                                  ar: 'اتركه فارغاً للحفاظ على كلمة المرور الحالية',
                                }[currentLanguage] || 'Leave blank to keep the current password')
                              : ''}
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}

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
          name="deliveryTimeMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={`text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <Clock className="h-4 w-4" />
                {adminT('storeSettings.deliveryTimeModeLabel')}
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={adminT('storeSettings.selectDeliveryTimeMode')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hours">{adminT('storeSettings.deliveryTimeMode.hours')}</SelectItem>
                  <SelectItem value="half_day">{adminT('storeSettings.deliveryTimeMode.halfDay')}</SelectItem>
                  <SelectItem value="disabled">{adminT('storeSettings.deliveryTimeMode.disabled')}</SelectItem>
                </SelectContent>
              </Select>
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
                      placeholder={(() => {
                        const defLang = storeSettings?.defaultLanguage || 'ru';
                        if (currentLanguage === defLang) return adminT('storeSettings.paymentMethodPlaceholder');
                        const defVal = getPaymentMethodName(method, defLang);
                        return defVal ? defVal : adminT('storeSettings.paymentMethodPlaceholder');
                      })()}
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

        {/* Online Payment Provider (HYP) */}
        <div className="space-y-4 pt-2">
          <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full`} dir={isRTL ? 'rtl' : 'ltr'}>
            {isRTL ? (
              <>
                <h3 className="text-lg font-semibold flex-1 text-right">
                  {currentLanguage === 'ru' ? 'Онлайн-оплата' : currentLanguage === 'he' ? 'תשלום מקוון' : currentLanguage === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                </h3>
                <CreditCard className="h-5 w-5 text-primary" />
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold flex-1 text-left">
                  {currentLanguage === 'ru' ? 'Онлайн-оплата' : currentLanguage === 'he' ? 'תשלום מקוון' : currentLanguage === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                </h3>
              </>
            )}
          </div>

          <FormField
            control={form.control}
            name="paymentProvider"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {currentLanguage === 'ru' ? 'Провайдер' : currentLanguage === 'he' ? 'ספק תשלום' : currentLanguage === 'ar' ? 'مزود الدفع' : 'Provider'}
                </FormLabel>
                <Select value={field.value || 'none'} onValueChange={field.onChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{currentLanguage === 'ru' ? 'Отключено' : currentLanguage === 'he' ? 'מושבת' : currentLanguage === 'ar' ? 'معطل' : 'None'}</SelectItem>
                    <SelectItem value="hyp">HYP</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {watchedPaymentProvider === 'hyp' && (
            <>
            {/* HYP Setup Help Modal */}
            {showHypHelp && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowHypHelp(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  {/* Modal header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-500 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <img src="https://pay.hyp.co.il/yaadpay/7.0/Images/paybyqr/logo_hyp_large.svg" alt="HYP" className="h-6 brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-white font-semibold text-sm">
                        {currentLanguage === 'ru' ? 'Инструкция по подключению' : currentLanguage === 'he' ? 'הוראות חיבור' : currentLanguage === 'ar' ? 'تعليمات الربط' : 'Setup Guide'}
                      </span>
                    </div>
                    <button onClick={() => setShowHypHelp(false)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
                  </div>

                  {/* Steps */}
                  <div className={`px-5 py-4 space-y-5 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>

                    {/* Step 1 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {currentLanguage === 'ru' ? 'Зарегистрируйтесь как продавец' : currentLanguage === 'he' ? 'הירשם כסוחר' : currentLanguage === 'ar' ? 'سجّل كتاجر' : 'Register as a merchant'}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {currentLanguage === 'ru' ? 'Перейдите на сайт ' : currentLanguage === 'he' ? 'עבור לאתר ' : currentLanguage === 'ar' ? 'انتقل إلى موقع ' : 'Go to '}
                          <a href="https://www.hyp.co.il" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">hyp.co.il</a>
                          {currentLanguage === 'ru' ? ' и подайте заявку на подключение эквайринга.' : currentLanguage === 'he' ? ' והגש בקשה לחיבור סליקה.' : currentLanguage === 'ar' ? ' وقدّم طلب ربط خدمة الاستقطاع.' : ' and apply for a merchant account.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {currentLanguage === 'ru' ? 'Получите Masof (номер терминала)' : currentLanguage === 'he' ? 'קבל את מספר המסוף (Masof)' : currentLanguage === 'ar' ? 'احصل على رقم الطرفية (Masof)' : 'Get your Masof (terminal number)'}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {currentLanguage === 'ru'
                            ? 'Войдите в кабинет по ссылке выше. Перейдите в раздел «Настройки» → «Настройки терминала». Номер терминала (7 цифр) будет указан сверху страницы — это и есть Masof.'
                            : currentLanguage === 'he'
                            ? 'היכנס לחשבון דרך הקישור למעלה. עבור ל"הגדרות" ← "הגדרות מסוף". מספר המסוף (7 ספרות) יופיע בראש הדף.'
                            : currentLanguage === 'ar'
                            ? 'ادخل للحساب عبر الرابط أعلاه. اذهب إلى "الإعدادات" ← "إعدادات الطرفية". رقم الطرفية (7 أرقام) يظهر في أعلى الصفحة.'
                            : 'Log in via the link above. Go to "Settings" → "Terminal Settings". The terminal number (7 digits) is shown at the top — this is your Masof.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {currentLanguage === 'ru' ? 'Установите PassP (удалённый пароль)' : currentLanguage === 'he' ? 'הגדר PassP (סיסמת Remote)' : currentLanguage === 'ar' ? 'اضبط PassP (كلمة مرور Remote)' : 'Set PassP (Remote Password)'}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {currentLanguage === 'ru'
                            ? 'В панели управления: «Безопасность» → «Remote Password». Придумайте пароль и сохраните — он нужен для API-запросов. Это не пароль от входа в кабинет.'
                            : currentLanguage === 'he'
                            ? 'בלוח הבקרה: "אבטחה" ← "Remote Password". צור סיסמה ושמור אותה — היא נדרשת לבקשות API. זו אינה סיסמת הכניסה לחשבון.'
                            : currentLanguage === 'ar'
                            ? 'في لوحة التحكم: "الأمان" ← "Remote Password". اصنع كلمة مرور واحفظها — تُستخدم لطلبات API. هذه ليست كلمة مرور الدخول للحساب.'
                            : 'In the control panel: "Security" → "Remote Password". Create a password and save it — it is used for API requests. This is not your login password.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">4</div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {currentLanguage === 'ru' ? 'Скопируйте KEY (API-ключ)' : currentLanguage === 'he' ? 'העתק את KEY (מפתח API)' : currentLanguage === 'ar' ? 'انسخ KEY (مفتاح API)' : 'Copy your KEY (API key)'}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {currentLanguage === 'ru'
                            ? 'В панели управления: «Безопасность» → «API Key». Скопируйте ключ и вставьте в поле KEY выше. Если ключа нет — нажмите «Создать».'
                            : currentLanguage === 'he'
                            ? 'בלוח הבקרה: "אבטחה" ← "API Key". העתק את המפתח והדבק בשדה KEY למעלה. אם אין מפתח — לחץ "צור מפתח".'
                            : currentLanguage === 'ar'
                            ? 'في لوحة التحكم: "الأمان" ← "API Key". انسخ المفتاح والصقه في حقل KEY أعلاه. إذا لم يكن هناك مفتاح — اضغط "إنشاء مفتاح".'
                            : 'In the control panel: "Security" → "API Key". Copy the key and paste it into the KEY field above. If there is no key — click "Generate Key".'}
                        </p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">5</div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {currentLanguage === 'ru' ? 'Активируйте уведомления о платежах (Webhook)' : currentLanguage === 'he' ? 'הפעל התראות תשלום (Webhook)' : currentLanguage === 'ar' ? 'فعّل إشعارات الدفع (Webhook)' : 'Activate payment notifications (Webhook)'}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {currentLanguage === 'ru'
                            ? 'Свяжитесь с поддержкой HYP и попросите активировать «Notify URL» для вашего терминала. Это необходимо чтобы заказы автоматически менялись на «Оплачено». Тел: *6488 доб. 3 или WhatsApp.'
                            : currentLanguage === 'he'
                            ? 'פנה לתמיכת HYP ובקש להפעיל "Notify URL" עבור המסוף שלך. זה נחוץ כדי שהזמנות יעודכנו אוטומטית ל"שולם". טל: *6488 שלוחה 3 או WhatsApp.'
                            : currentLanguage === 'ar'
                            ? 'تواصل مع دعم HYP واطلب تفعيل "Notify URL" لطرفيتك. هذا ضروري لتحديث الطلبات تلقائياً إلى "مدفوع". هاتف: *6488 داخلي 3 أو واتساب.'
                            : 'Contact HYP support and ask to activate "Notify URL" for your terminal. This is required for orders to automatically update to "Paid". Tel: *6488 ext. 3 or WhatsApp.'}
                        </p>
                      </div>
                    </div>

                    {/* Support link */}
                    <div className={`pt-1 border-t flex ${isRTL ? 'flex-row-reverse' : ''} items-center justify-between gap-2`}>
                      <a href="https://pay.hyp.co.il/p/?action=login" target="_blank" rel="noopener noreferrer"
                        className="text-xs text-violet-600 underline underline-offset-2">
                        {currentLanguage === 'ru' ? 'Открыть личный кабинет HYP →' : currentLanguage === 'he' ? 'פתח חשבון HYP ←' : currentLanguage === 'ar' ? 'افتح حساب HYP ←' : 'Open HYP merchant portal →'}
                      </a>
                      <button onClick={() => setShowHypHelp(false)}
                        className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                        {currentLanguage === 'ru' ? 'Понятно' : currentLanguage === 'he' ? 'הבנתי' : currentLanguage === 'ar' ? 'فهمت' : 'Got it'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border rounded-xl overflow-hidden shadow-sm">
              {/* HYP branded header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-500">
                <img
                  src="https://pay.hyp.co.il/yaadpay/7.0/Images/paybyqr/logo_hyp_large.svg"
                  alt="HYP"
                  className="h-7 brightness-0 invert"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <a
                  href="https://pay.hyp.co.il/p/?action=login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline underline-offset-2 transition-opacity hover:opacity-100 opacity-80"
                  style={{ color: '#ffffff' }}
                >
                  {currentLanguage === 'ru' ? 'Личный кабинет →' : currentLanguage === 'he' ? 'כניסה לחשבון ←' : currentLanguage === 'ar' ? 'الدخول للحساب ←' : 'Merchant login →'}
                </a>
              </div>

              {/* Fields */}
              <div className="space-y-4 p-4 bg-white">
                <div className={`flex flex-col gap-2 ${isRTL ? 'items-end' : 'items-start'}`}>
                  <p className={`text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                    {currentLanguage === 'ru'
                      ? 'Реквизиты доступны в личном кабинете HYP после регистрации как продавец.'
                      : currentLanguage === 'he'
                      ? 'הפרטים זמינים בחשבון הסוחר של HYP לאחר הרשמה כסוחר.'
                      : currentLanguage === 'ar'
                      ? 'البيانات متاحة في حساب التاجر على HYP بعد التسجيل كتاجر.'
                      : 'Credentials are available in your HYP merchant account after registering as a merchant.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowHypHelp(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-md px-3 py-1.5 transition-colors"
                  >
                    <span>📋</span>
                    {currentLanguage === 'ru' ? 'Инструкция: как получить ключи HYP' : currentLanguage === 'he' ? 'הוראות: כיצד לקבל מפתחות HYP' : currentLanguage === 'ar' ? 'تعليمات: كيفية الحصول على مفاتيح HYP' : 'Guide: how to get HYP keys'}
                  </button>
                </div>

              <FormField
                control={form.control}
                name="hypMasof"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      Masof ({currentLanguage === 'ru' ? 'номер терминала' : currentLanguage === 'he' ? 'מספר מסוף' : currentLanguage === 'ar' ? 'رقم الطرف' : 'terminal number'})
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="1234567" className="text-sm" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLanguage === 'ru'
                        ? 'Номер вашего терминала в системе HYP. Находится в разделе «Настройки терминала» личного кабинета.'
                        : currentLanguage === 'he'
                        ? 'מספר המסוף שלך במערכת HYP. נמצא בקטע "הגדרות מסוף" בחשבון הסוחר.'
                        : currentLanguage === 'ar'
                        ? 'رقم طرفيتك في نظام HYP. موجود في قسم "إعدادات الطرفية" في حساب التاجر.'
                        : 'Your terminal number in the HYP system. Found in the "Terminal Settings" section of your merchant account.'}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hypPassP"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      PassP ({currentLanguage === 'ru' ? 'удалённый пароль' : currentLanguage === 'he' ? 'סיסמת Remote' : currentLanguage === 'ar' ? 'كلمة مرور Remote' : 'remote password'})
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" autoComplete="new-password" className="text-sm" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLanguage === 'ru'
                        ? 'Удалённый пароль для API-запросов. Задаётся в разделе «Безопасность» → «Remote Password» панели управления HYP.'
                        : currentLanguage === 'he'
                        ? 'סיסמת Remote לבקשות API. מוגדרת בקטע "אבטחה" ← "Remote Password" בלוח הבקרה של HYP.'
                        : currentLanguage === 'ar'
                        ? 'كلمة مرور Remote لطلبات API. تُعيَّن في قسم "الأمان" ← "Remote Password" في لوحة تحكم HYP.'
                        : 'Remote password for API requests. Set in the "Security" → "Remote Password" section of the HYP control panel.'}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hypKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      KEY ({currentLanguage === 'ru' ? 'API-ключ' : currentLanguage === 'he' ? 'מפתח API' : currentLanguage === 'ar' ? 'مفتاح API' : 'API key'})
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" autoComplete="new-password" className="text-sm" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentLanguage === 'ru'
                        ? 'API-ключ для подписи платёжных запросов. Находится в разделе «Безопасность» → «API Key» панели управления HYP.'
                        : currentLanguage === 'he'
                        ? 'מפתח API לחתימת בקשות תשלום. נמצא בקטע "אבטחה" ← "API Key" בלוח הבקרה של HYP.'
                        : currentLanguage === 'ar'
                        ? 'مفتاح API لتوقيع طلبات الدفع. موجود في قسم "الأمان" ← "API Key" في لوحة تحكم HYP.'
                        : 'API key for signing payment requests. Found in the "Security" → "API Key" section of the HYP control panel.'}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hypTestMode"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      {currentLanguage === 'ru' ? 'Тестовый режим (sandbox)' : currentLanguage === 'he' ? 'מצב בדיקה (sandbox)' : currentLanguage === 'ar' ? 'وضع الاختبار (sandbox)' : 'Test mode (sandbox)'}
                    </FormLabel>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              </div>
            </div>
            </>
          )}
        </div>

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
            {/* Analytics Events Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">{adminT('analyticsTracking.eventsInfo')}</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    {adminT('analyticsTracking.eventsDescription')}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="text-xs bg-[rgba(255,255,255,0.7)] rounded p-3 border border-blue-200/50">
                      <div className="font-semibold text-blue-900 mb-2">{adminT('analyticsTracking.automaticEvents')}</div>
                      <ul className="space-y-1 text-blue-700">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <code className="text-xs bg-white px-1.5 py-0.5 rounded font-mono">purchase</code>
                          <span>- {adminT('analyticsTracking.purchaseEvent')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <code className="text-xs bg-white px-1.5 py-0.5 rounded font-mono">order_completed</code>
                          <span>- {adminT('analyticsTracking.orderCompletedEvent')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <code className="text-xs bg-white px-1.5 py-0.5 rounded font-mono">thank_you_page_visited</code>
                          <span>- {adminT('analyticsTracking.thankYouPageEvent')}</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="text-xs bg-[rgba(255,255,255,0.7)] rounded p-3 border border-blue-200/50">
                      <div className="font-semibold text-blue-900 mb-2">{adminT('analyticsTracking.eventParameters')}</div>
                      <ul className="space-y-1 text-blue-700 font-mono text-xs">
                        <li><code>order_id</code> - {adminT('analyticsTracking.orderIdParam')}</li>
                        <li><code>order_price</code> - {adminT('analyticsTracking.orderPriceParam')}</li>
                        <li><code>currency</code> - {adminT('analyticsTracking.currencyParam')} (ILS)</li>
                        <li><code>is_guest</code> - {adminT('analyticsTracking.isGuestParam')}</li>
                      </ul>
                    </div>
                    
                    <div className="text-xs bg-amber-50 rounded p-3 border border-amber-200">
                      <div className="font-semibold text-amber-900 mb-2">{adminT('analyticsTracking.setupNote')}</div>
                      <div className="space-y-3">
                        <div>
                          <div className="font-medium text-amber-900 mb-1">🟡 {adminT('analyticsTracking.yandexSetup')}</div>
                          <p className="text-amber-800">{adminT('analyticsTracking.yandexInstructions')}</p>
                        </div>
                        <div>
                          <div className="font-medium text-amber-900 mb-1">🔵 {adminT('analyticsTracking.facebookSetup')}</div>
                          <p className="text-amber-800">{adminT('analyticsTracking.facebookInstructions')}</p>
                        </div>
                        <div>
                          <div className="font-medium text-amber-900 mb-1">🟢 {adminT('analyticsTracking.googleSetup')}</div>
                          <p className="text-amber-800">{adminT('analyticsTracking.googleInstructions')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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

            {/* Facebook Conversions API Settings */}
            <div className="border-t pt-6 mt-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-2">{adminT('facebookCapi.title')}</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      {adminT('facebookCapi.description')}
                    </p>
                    <div className="text-xs bg-[rgba(255,255,255,0.7)] rounded p-3 border border-blue-200/50 space-y-2">
                      <div className="font-semibold text-blue-900 mb-2">{adminT('facebookCapi.advantages')}</div>
                      <ul className="space-y-1 text-blue-700">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{adminT('facebookCapi.advantage1')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{adminT('facebookCapi.advantage2')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{adminT('facebookCapi.advantage3')}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="facebookConversionsApiEnabled"
                  render={({ field }) => (
                    <FormItem className={`flex items-center justify-between rounded-lg border p-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {adminT('facebookCapi.enableLabel')}
                        </FormLabel>
                        <FormDescription>
                          {adminT('facebookCapi.enableDescription')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebookPixelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {adminT('facebookCapi.pixelIdLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456789012345" 
                          className="text-sm font-mono"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        {adminT('facebookCapi.pixelIdDescription')}
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebookAccessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {adminT('facebookCapi.accessTokenLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="EAAG..." 
                          className="text-sm font-mono"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        {adminT('facebookCapi.accessTokenDescription')}
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Advertising Feeds Section */}
        <Collapsible open={isAdvertisingFeedsOpen} onOpenChange={setIsAdvertisingFeedsOpen} className="space-y-6">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
            >
              <div className={`flex items-center gap-2 pb-2 border-b border-gray-200 w-full`} dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? (
                  <>
                    {isAdvertisingFeedsOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-semibold flex-1 text-right">{adminT('storeSettings.advertisingFeeds')}</h3>
                    <Globe className="h-5 w-5 text-primary" />
                  </>
                ) : (
                  <>
                    <Globe className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold flex-1 text-left">{adminT('storeSettings.advertisingFeeds')}</h3>
                    {isAdvertisingFeedsOpen ? (
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className={`text-sm text-blue-800 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {adminT('storeSettings.feedsDescription')}
              </p>

              <div className={`flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-blue-200 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs text-gray-500 block mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('storeSettings.feedToken')}:</span>
                  <code className="text-xs font-mono text-gray-700 break-all select-all">{storeSettings?.feedToken || '...'}</code>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                    onClick={() => storeSettings?.feedToken && navigator.clipboard.writeText(storeSettings.feedToken)}
                  >
                    {adminT('common.copy')}
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                    onClick={() => {
                      if (window.confirm(adminT('storeSettings.regenerateFeedTokenWarning'))) {
                        regenerateFeedTokenMutation.mutate();
                      }
                    }}
                    disabled={regenerateFeedTokenMutation.isPending}
                  >
                    {regenerateFeedTokenMutation.isPending ? adminT('common.loading') : adminT('storeSettings.regenerateFeedToken')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Facebook Catalog Feed */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                    <h4 className="font-medium">Facebook Catalog</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-gray-600">XML ({adminT('common.allLanguages')}):</label>
                      <div className="mt-1 flex gap-1 flex-wrap">
                        <button 
                          type="button"
                          className="px-2 py-1 bg-primary text-white hover:bg-primary/80 rounded text-xs font-mono select-all cursor-pointer border-2 border-primary"
                          onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/facebook`))}
                          title={`${adminT('common.copyLink')} (${adminT('common.default')}: ${storeSettings?.defaultLanguage?.toUpperCase() || 'RU'})`}
                        >
                          /api/feed/facebook
                        </button>
                        {storeSettings?.defaultLanguage !== 'ru' && storeSettings?.enabledLanguages?.includes('ru') && storeSettings?.enabledLanguages?.includes('ru') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/facebook?lang=ru`))}
                            title="Russian"
                          >
                            RU
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'en' && storeSettings?.enabledLanguages?.includes('en') && storeSettings?.enabledLanguages?.includes('en') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/facebook?lang=en`))}
                            title="English"
                          >
                            EN
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'he' && storeSettings?.enabledLanguages?.includes('he') && storeSettings?.enabledLanguages?.includes('he') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/facebook?lang=he`))}
                            title="Hebrew"
                          >
                            HE
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'ar' && storeSettings?.enabledLanguages?.includes('ar') && storeSettings?.enabledLanguages?.includes('ar') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/facebook?lang=ar`))}
                            title="Arabic"
                          >
                            AR
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-600">CSV:</label>
                      <button 
                        type="button"
                        className="ml-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-mono select-all cursor-pointer"
                        onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/facebook?format=csv`))}
                        title={adminT('common.copyLink')}
                      >
                        /api/feed/facebook?format=csv
                      </button>
                    </div>
                  </div>
                </div>

                {/* Google Ads Feed */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">G</span>
                    </div>
                    <h4 className="font-medium">Google Ads</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-gray-600">XML ({adminT('common.allLanguages')}):</label>
                      <div className="mt-1 flex gap-1 flex-wrap">
                        <button 
                          type="button"
                          className="px-2 py-1 bg-primary text-white hover:bg-primary/80 rounded text-xs font-mono select-all cursor-pointer border-2 border-primary"
                          onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/google`))}
                          title={`${adminT('common.copyLink')} (${adminT('common.default')}: ${storeSettings?.defaultLanguage?.toUpperCase() || 'RU'})`}
                        >
                          /api/feed/google
                        </button>
                        {storeSettings?.defaultLanguage !== 'ru' && storeSettings?.enabledLanguages?.includes('ru') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/google?lang=ru`))}
                            title="Russian"
                          >
                            RU
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'en' && storeSettings?.enabledLanguages?.includes('en') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/google?lang=en`))}
                            title="English"
                          >
                            EN
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'he' && storeSettings?.enabledLanguages?.includes('he') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/google?lang=he`))}
                            title="Hebrew"
                          >
                            HE
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'ar' && storeSettings?.enabledLanguages?.includes('ar') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/google?lang=ar`))}
                            title="Arabic"
                          >
                            AR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Yandex Direct Feed */}
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Я</span>
                    </div>
                    <h4 className="font-medium">Yandex Direct</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-gray-600">YML ({adminT('common.allLanguages')}):</label>
                      <div className="mt-1 flex gap-1 flex-wrap">
                        <button 
                          type="button"
                          className="px-2 py-1 bg-primary text-white hover:bg-primary/80 rounded text-xs font-mono select-all cursor-pointer border-2 border-primary"
                          onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/yandex`))}
                          title={`${adminT('common.copyLink')} (${adminT('common.default')}: ${storeSettings?.defaultLanguage?.toUpperCase() || 'RU'})`}
                        >
                          /api/feed/yandex
                        </button>
                        {storeSettings?.defaultLanguage !== 'ru' && storeSettings?.enabledLanguages?.includes('ru') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/yandex?lang=ru`))}
                            title="Russian"
                          >
                            RU
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'en' && storeSettings?.enabledLanguages?.includes('en') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/yandex?lang=en`))}
                            title="English"
                          >
                            EN
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'he' && storeSettings?.enabledLanguages?.includes('he') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/yandex?lang=he`))}
                            title="Hebrew"
                          >
                            HE
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'ar' && storeSettings?.enabledLanguages?.includes('ar') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/yandex?lang=ar`))}
                            title="Arabic"
                          >
                            AR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Universal JSON Feed */}
                <div className="bg-white border rounded-lg p-4 md:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{'{}'}</span>
                    </div>
                    <h4 className="font-medium">Universal JSON</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-gray-600">JSON ({adminT('common.allLanguages')}):</label>
                      <div className="mt-1 flex gap-1 flex-wrap">
                        <button 
                          type="button"
                          className="px-2 py-1 bg-primary text-white hover:bg-primary/80 rounded text-xs font-mono select-all cursor-pointer border-2 border-primary"
                          onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/json`))}
                          title={`${adminT('common.copyLink')} (${adminT('common.default')}: ${storeSettings?.defaultLanguage?.toUpperCase() || 'RU'})`}
                        >
                          /api/feed/json
                        </button>
                        {storeSettings?.defaultLanguage !== 'ru' && storeSettings?.enabledLanguages?.includes('ru') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/json?lang=ru`))}
                            title="Russian"
                          >
                            RU
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'en' && storeSettings?.enabledLanguages?.includes('en') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/json?lang=en`))}
                            title="English"
                          >
                            EN
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'he' && storeSettings?.enabledLanguages?.includes('he') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/json?lang=he`))}
                            title="Hebrew"
                          >
                            HE
                          </button>
                        )}
                        {storeSettings?.defaultLanguage !== 'ar' && storeSettings?.enabledLanguages?.includes('ar') && (
                          <button 
                            type="button"
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                            onClick={() => navigator.clipboard.writeText(feedUrl(`${window.location.origin}/api/feed/json?lang=ar`))}
                            title="Arabic"
                          >
                            AR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                <strong>{adminT('common.note')}:</strong> {adminT('storeSettings.feedsNote')}
              </div>
            </div>
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
      // Dialog will be closed automatically after successful mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
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

// User Deletion Confirmation Dialog Component
function UserDeletionDialog({ open, onClose, user, onConfirm }: {
  open: boolean;
  onClose: () => void;
  user: any;
  onConfirm: (userId: string, forceDelete: boolean) => void;
}) {
  const { t: adminT } = useAdminTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<{
    hasOrders: boolean;
    orderCount: number;
    hasAddresses: boolean;
    addressCount: number;
  } | null>(null);

  // Check deletion impact when dialog opens
  useEffect(() => {
    if (open && user) {
      setIsChecking(true);
      setDeletionImpact(null);
      
      fetch(`/api/admin/users/${user.id}/deletion-impact`)
        .then(res => res.json())
        .then(data => {
          console.log('Deletion impact data:', data);
          setDeletionImpact(data);
        })
        .catch(error => {
          console.error('Error checking deletion impact:', error);
        })
        .finally(() => {
          setIsChecking(false);
        });
    }
  }, [open, user]);

  const handleConfirm = () => {
    if (user) {
      console.log('UserDeletionDialog handleConfirm with user.id:', user.id);
      onConfirm(user.id, true); // Force delete with all related data
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            {deletionImpact?.hasOrders || deletionImpact?.hasAddresses 
              ? adminT('userDeletion.deleteUserWithData')
              : adminT('userDeletion.deleteUser')
            }
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {isChecking ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                {adminT('userDeletion.checkingData')}
              </div>
            ) : deletionImpact ? (
              <>
                {deletionImpact.hasOrders || deletionImpact.hasAddresses ? (
                  <>
                    <p>{adminT('userDeletion.userHasRelatedData')}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {deletionImpact.hasOrders && (
                        <li>🛒 Заказов: {deletionImpact.orderCount} (будут удалены)</li>
                      )}
                      {deletionImpact.hasAddresses && (
                        <li>📍 Адресов: {deletionImpact.addressCount} (будут удалены)</li>
                      )}
                    </ul>
                    <p className="text-red-600 font-medium">
                      {adminT('userDeletion.deleteWarning')}
                    </p>
                  </>
                ) : (
                  <p>{adminT('userDeletion.deleteUserConfirm')}</p>
                )}
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} className="w-full sm:w-auto">
            {adminT('userDeletion.cancelDeletion')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isChecking}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
          >
            {adminT('userDeletion.confirmDeletion')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// User Form Dialog Component
function UserFormDialog({ open, onClose, user, onSubmit, onDelete, branches = [], branchesEnabled = false }: any) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [allBranchesAccess, setAllBranchesAccess] = useState(true);

  const userSchema = z.object({
    username: z.string().min(1, adminT('dialog.usernameRequired')),
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
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "customer",
      password: "",
    },
  });

  const watchedRole = useWatch({ control: form.control, name: "role" });

  // Reset form when user or dialog state changes
  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          username: user.username || "",
          email: user.email || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phone: user.phone || "",
          role: user.role || "customer",
          password: "", // Always empty for editing existing users
        });
        const existing = user.branchIds || [];
        setSelectedBranchIds(existing);
        // Empty = all branches access, non-empty = specific branches
        setAllBranchesAccess(existing.length === 0);
      } else {
        setSelectedBranchIds([]);
        setAllBranchesAccess(true);
        form.reset({
          username: "",
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
    const submitData: any = { ...data };
    if (branchesEnabled && data.role === 'worker') {
      // If allBranchesAccess is true, submit empty array (= all branches on backend)
      submitData.branchIds = allBranchesAccess ? [] : selectedBranchIds;
    }
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
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
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{adminT('dialog.usernameLabel')} *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={adminT('dialog.usernamePlaceholder')}
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

            {/* Branch Assignment (shown for workers when branchesEnabled) */}
            {branchesEnabled && watchedRole === 'worker' && (branches as any[]).length > 0 && (
              <div className={`space-y-2 border border-gray-200 rounded-lg p-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div>
                  <p className="text-sm font-medium">{adminT('branches.workerBranches')}</p>
                  <p className="text-xs text-gray-500">{adminT('branches.workerBranchesDescription')}</p>
                </div>
                {/* All Branches toggle */}
                <div className={`flex items-center gap-2 pb-2 border-b border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    id="all-branches-access"
                    checked={allBranchesAccess}
                    onChange={(e) => {
                      setAllBranchesAccess(e.target.checked);
                      if (e.target.checked) setSelectedBranchIds([]);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="all-branches-access" className="text-sm font-medium text-gray-900 cursor-pointer">
                    {adminT('branches.allBranchesAccess')}
                  </label>
                </div>
                {/* Individual branch checkboxes (shown only when not all-access) */}
                {!allBranchesAccess && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(branches as any[]).filter((b: any) => b.isActive).map((branch: any) => (
                      <div key={branch.id} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="checkbox"
                          id={`branch-${branch.id}`}
                          checked={selectedBranchIds.includes(branch.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranchIds(prev => [...prev, branch.id]);
                            } else {
                              setSelectedBranchIds(prev => prev.filter(id => id !== branch.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor={`branch-${branch.id}`} className="text-sm text-gray-700 cursor-pointer">
                          {branch.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {user ? adminT('dialog.newPasswordLabel') : adminT('dialog.passwordLabel')}
                  </FormLabel>
                  <FormControl>
                    <PasswordInput 
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
                            onDelete(user);
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
