import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useCartStore, type CartItem } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDeliveryTimeRange } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { useUTMNavigate } from "@/hooks/use-utm-navigate";
import { useLocation } from "wouter";
import { UTMLink } from "@/components/UTMLink";
import { ShoppingCart, User, UserCheck, UserPlus, AlertTriangle, CheckCircle, ArrowLeft, Clock, Calendar as CalendarIcon, Info, MapPin, Star } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { useBranch } from "@/hooks/useBranch";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { useSEO, generateKeywords } from "@/hooks/useSEO";
import { getPaymentMethodName as getLocalizedPaymentMethodName } from "@shared/multilingual-helpers";
import { format } from "date-fns";
import { ru, enUS, he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { triggerPushRequestAfterAction } from "@/lib/prompt-utils";

function PaymentBadges({ provider }: { provider: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap', gap: 0, marginTop: 10 }}>
      {/* SSL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, paddingRight: 8 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', userSelect: 'none', whiteSpace: 'nowrap' }}>SSL</span>
      </div>

      <span style={{ color: '#e5e7eb', fontSize: 12, flexShrink: 0, paddingRight: 8 }}>|</span>

      {/* PCI DSS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, paddingRight: 8 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#9ca3af">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        <span style={{ fontSize: 8, fontWeight: 800, color: '#9ca3af', lineHeight: 1.15, userSelect: 'none' }}>PCI<br/>DSS</span>
      </div>

      <span style={{ color: '#e5e7eb', fontSize: 12, flexShrink: 0, paddingRight: 8 }}>|</span>

      {/* Provider logo */}
      {provider === 'grow' ? (
        <img
          src="https://grow.business/wp-content/uploads/2023/06/grow-logo-white.svg"
          alt="Grow"
          style={{ height: 13, filter: 'grayscale(1) opacity(0.5)', flexShrink: 0, paddingRight: 8 }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = 'none';
            const span = document.createElement('span');
            span.style.cssText = 'font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:1px;padding-right:8px;';
            span.textContent = 'GROW';
            el.parentNode?.insertBefore(span, el);
          }}
        />
      ) : (
        <img
          src="https://pay.hyp.co.il/yaadpay/7.0/Images/paybyqr/logo_hyp_large.svg"
          alt="HYP"
          style={{ height: 13, filter: 'grayscale(1) opacity(0.5)', flexShrink: 0, paddingRight: 8 }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = 'none';
            const span = document.createElement('span');
            span.style.cssText = 'font-size:10px;font-weight:800;color:#9ca3af;letter-spacing:1px;padding-right:8px;';
            span.textContent = 'HYP';
            el.parentNode?.insertBefore(span, el);
          }}
        />
      )}

      <span style={{ color: '#e5e7eb', fontSize: 12, flexShrink: 0, paddingRight: 8 }}>|</span>

      {/* VISA */}
      <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 14, color: '#9ca3af', lineHeight: 1, userSelect: 'none', flexShrink: 0, whiteSpace: 'nowrap', paddingRight: 6 }}>VISA</span>

      {/* Mastercard */}
      <svg width="24" height="15" viewBox="0 0 38 24" aria-label="Mastercard" style={{ flexShrink: 0, marginRight: 6 }}>
        <circle cx="14" cy="12" r="8" fill="#9ca3af" />
        <circle cx="24" cy="12" r="8" fill="#6b7280" />
        <path d="M19 5.5a8 8 0 0 1 0 13A8 8 0 0 1 19 5.5z" fill="#d1d5db" />
      </svg>

      {/* Amex */}
      <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 11, color: '#9ca3af', lineHeight: 1, userSelect: 'none', flexShrink: 0, whiteSpace: 'nowrap', paddingRight: 6 }}>AMEX</span>

      {/* PayPal — only HYP */}
      {provider !== 'grow' && (
        <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 900, fontSize: 11, lineHeight: 1, userSelect: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#6b7280' }}>Pay</span><span style={{ color: '#9ca3af' }}>Pal</span>
        </span>
      )}
    </div>
  );
}

const getDateLocale = (language: string) => {
  switch (language) {
    case 'en': return enUS;
    case 'he': return he;
    case 'ru':
    default: return ru;
  }
};

// Calculate delivery fee based on order total and free delivery threshold
const calculateDeliveryFee = (orderTotal: number, deliveryFee: number, freeDeliveryFrom: number | null) => {
  // If no free delivery threshold is set or it's empty/invalid, always charge delivery fee
  if (!freeDeliveryFrom || isNaN(freeDeliveryFrom) || freeDeliveryFrom <= 0) {
    return deliveryFee;
  }
  return orderTotal >= freeDeliveryFrom ? 0 : deliveryFee;
};

// Schemas will be created inside component after translation hooks

type GuestOrderData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
};

type GuestOrderResponse = {
  orderId: number;
  guestAccessToken: string;
  guestClaimToken: string;
  orderLanguage: string;
};

type RegistrationData = GuestOrderData & {
  password: string;
  confirmPassword: string;
};
type AuthData = {
  email: string;
  password: string;
};
type OrderPayloadItem = {
  productId: number;
  quantity: string;
  pricePerKg: string;
  totalPrice: string;
};

type BaseOrderPayload = {
  items: OrderPayloadItem[];
  totalAmount: string;
  status: string;
  branchId?: number;
};

type AuthenticatedOrderData = {
  address: string;
  phone: string;
  deliveryDate: string;
  deliveryTime: string;
  paymentMethod: string;
};

// Utility functions for delivery date/time generation
const generateDeliveryDates = (minDeliveryTimeHours: number = 2, maxDeliveryTimeDays: number = 7) => {
  const dates = [];
  const now = new Date();
  const minTime = new Date(now.getTime() + minDeliveryTimeHours * 60 * 60 * 1000);
  
  for (let i = 0; i <= maxDeliveryTimeDays; i++) {
    const date = new Date(minTime.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push({
      value: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('ru-RU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    });
  }
  
  return dates;
};

const generateDeliveryTimes = (
  workingHours: any, 
  selectedDate: string, 
  weekStartDay: string = 'monday',
  deliveryTimeMode: 'hours' | 'half_day' | 'disabled' = 'hours',
  t?: (key: string) => string,
  deliveryHours?: any
) => {
  // If delivery time selection is disabled, return empty array
  if (deliveryTimeMode === 'disabled') {
    return [];
  }
  
  if (!workingHours || !selectedDate) return [];
  
  const date = new Date(selectedDate + 'T00:00:00');
  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = selectedDate === today;
  const currentHour = new Date().getHours();
  
  // Always use fixed Sunday-first order to map date.getDay() (0=Sun…6=Sat) to day keys.
  // weekStartDay only affects calendar display order, not day-key lookup.
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = DAY_NAMES[date.getDay()];

  // Determine effective schedule: deliveryHours override > workingHours fallback
  let deliveryDayValue: string | null | undefined = deliveryHours?.[dayName];
  // null/undefined means inherit from workingHours
  const effectiveSchedule = (deliveryDayValue != null) ? deliveryDayValue : workingHours[dayName];

  const isClosed = !effectiveSchedule || effectiveSchedule.trim() === '' || 
      effectiveSchedule.toLowerCase().includes('закрыто') || 
      effectiveSchedule.toLowerCase().includes('closed') ||
      effectiveSchedule.toLowerCase().includes('выходной');

  if (isClosed) {
    return [{
      value: 'closed',
      label: t ? t('checkout.closed') : 'Закрыто'
    }];
  }
  
  // Half-day mode: only morning/afternoon options
  if (deliveryTimeMode === 'half_day') {
    const timeSlots: { value: string; label: string }[] = [];
    
    // First half of day option (if it's not afternoon already)
    if (!isToday || currentHour < 12) {
      timeSlots.push({
        value: 'half_day_first',
        label: t ? t('checkout.halfDayFirst') : 'Первая половина дня'
      });
    }
    
    // Second half of day option
    if (!isToday || currentHour < 18) {
      timeSlots.push({
        value: 'half_day_second',
        label: t ? t('checkout.halfDaySecond') : 'Вторая половина дня'
      });
    }
    
    return timeSlots.length > 0 ? timeSlots : [];
  }
  
  // Hours mode: generate 2-hour intervals based on effective schedule
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
        
        // Skip past time slots if today is selected
        if (isToday && hour <= currentHour) continue;
        
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

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const { items, getTotalPrice, clearCart, removeItem, updateProductSnapshot, appliedCoupon, setAppliedCoupon, giftAccepted, setGiftAccepted } = useCartStore();
  const navigate = useUTMNavigate();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderType, setOrderType] = useState<"guest" | "register" | "login">("register");
  const [orderTypeInitialized, setOrderTypeInitialized] = useState(false);
  const { storeSettings } = useStoreSettings();
  const { currentLanguage } = useLanguage();
  const { selectedBranchId, selectedBranch, branches, selectBranch, branchesEnabled } = useBranch();
  const [showBranchConfirmDialog, setShowBranchConfirmDialog] = useState(true);
  const [showBranchChangeDialog, setShowBranchChangeDialog] = useState(false);
  const [pendingBranchId, setPendingBranchId] = useState<number | null>(null);
  const [branchCompatResult, setBranchCompatResult] = useState<{
    toRemove: CartItem[];
    toDowngrade: CartItem[];
    toKeep: CartItem[];
  } | null>(null);
  const [isFetchingCompat, setIsFetchingCompat] = useState(false);
  const dateLocale = getDateLocale(currentLanguage);
  const { t: tCommon } = useCommonTranslation();
  const { t: tShop } = useShopTranslation();

  // Load closed dates for blocking in calendar
  const { data: closedDates = [] } = useQuery<any[]>({
    queryKey: ['/api/closed-dates'],
  });

  // Loyalty context (discount % for registered users + gift product)
  const { data: loyaltyContext } = useQuery<{
    loyaltyDiscountEnabled: boolean;
    loyaltyDiscountPercent: number;
    giftEnabled: boolean;
    giftProduct: any | null;
    giftProductQuantity: number;
    giftMinOrderAmount: number;
  }>({
    queryKey: ['/api/loyalty/context'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch volume discounts for all products in cart (checkout view)
  const checkoutProductIds = items.map((item: any) => item.product?.id).filter(Boolean) as number[];
  const { data: checkoutVolumeDiscountsMap } = useQuery<Record<number, Array<{ minQuantity: string; discountType: string; discountValue: string }>>>({
    queryKey: ['/api/products/volume-discounts', checkoutProductIds.join(',')],
    queryFn: () => apiRequest('GET', `/api/products/volume-discounts?productIds=${checkoutProductIds.join(',')}`),
    enabled: checkoutProductIds.length > 0,
    staleTime: 60 * 1000,
  });

  // Compute per-item volume discounts for checkout totals
  const checkoutVolumeDiscountAmount = (() => {
    if (!checkoutVolumeDiscountsMap) return 0;
    let total = 0;
    for (const item of items as any[]) {
      if (!item.product?.id) continue;
      const tiers = (checkoutVolumeDiscountsMap[item.product.id] || []).filter((t: any) =>
        t.minQuantity !== null && parseFloat(t.minQuantity) <= item.quantity
      );
      if (tiers.length === 0) continue;
      const best = tiers.reduce((a: any, b: any) => parseFloat(a.minQuantity) >= parseFloat(b.minQuantity) ? a : b);
      const pct = parseFloat(best.discountValue);
      if (best.discountType === 'percentage') {
        total += Math.round(item.totalPrice * pct / 100 * 100) / 100;
      } else {
        total += Math.min(pct, item.totalPrice);
      }
    }
    return Math.round(total * 100) / 100;
  })();

  // Computed discount helpers used throughout the page
  const subtotalForDiscounts = getTotalPrice();
  const subtotalAfterVolume = Math.max(0, subtotalForDiscounts - checkoutVolumeDiscountAmount);
  // Loyalty discount: skipped only when a coupon is applied that does NOT stack with loyalty
  // All registered users receive loyalty discount (not guests)
  const loyaltyDiscountAmount = ((!appliedCoupon || appliedCoupon?.stacksWithLoyalty) && loyaltyContext?.loyaltyDiscountEnabled && isAuthenticated && (loyaltyContext.loyaltyDiscountPercent || 0) > 0)
    ? Math.round((subtotalAfterVolume * (loyaltyContext.loyaltyDiscountPercent || 0) / 100) * 100) / 100
    : 0;
  const subtotalAfterLoyalty = subtotalAfterVolume - loyaltyDiscountAmount;
  // Coupon discount: use the server-returned discountAmount as authoritative value.
  // For product-scoped coupons the server computes eligibleSubtotal; recalculating on the
  // client against the full subtotal would apply the coupon to ineligible items.
  const couponDiscountAmount = appliedCoupon?.discountAmount ?? 0;
  // When coupon stacks with loyalty: subtract both. Otherwise coupon replaces loyalty.
  const subtotalAfterAllDiscounts = Math.max(0,
    (appliedCoupon && !appliedCoupon.stacksWithLoyalty)
      ? subtotalAfterVolume - couponDiscountAmount
      : subtotalAfterLoyalty - couponDiscountAmount
  );
  // Gift eligibility uses raw subtotal (before discounts)
  const giftEligible = loyaltyContext?.giftEnabled && loyaltyContext?.giftProduct && subtotalForDiscounts >= (loyaltyContext.giftMinOrderAmount || 300);

  // Initialize orderType from store settings once loaded
  useEffect(() => {
    if (storeSettings && !orderTypeInitialized) {
      setOrderType(storeSettings.checkoutGuestFirst ? 'guest' : 'register');
      setOrderTypeInitialized(true);
    }
  }, [storeSettings, orderTypeInitialized]);

  // Auto-reset giftAccepted when the cart no longer qualifies for the gift
  useEffect(() => {
    if (giftAccepted && !giftEligible) {
      setGiftAccepted(false);
    }
  }, [giftEligible, giftAccepted, setGiftAccepted]);

  // On checkout load, validate cart against selected branch and auto-remove unavailable items
  useEffect(() => {
    if (!branchesEnabled || !selectedBranchId || items.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products?branchId=${selectedBranchId}`);
        if (!res.ok || cancelled) return;
        const branchProducts: Array<{ id: number; isAvailable: boolean; availabilityStatus: string }> = await res.json();
        const branchMap = new Map(branchProducts.map(p => [p.id, p]));
        const toRemove: CartItem[] = [];
        for (const cartItem of items) {
          const inBranch = branchMap.get(cartItem.product.id);
          if (!inBranch || inBranch.isAvailable === false || inBranch.availabilityStatus === 'completely_unavailable') {
            toRemove.push(cartItem);
          }
        }
        // Remove unavailable items
        if (toRemove.length > 0 && !cancelled) {
          toRemove.forEach(item => removeItem(item.product.id));
          toast({
            title: String(tCommon('branch.itemsRemovedTitle')),
            description: String(tCommon('branch.itemsRemovedDesc')),
            variant: 'destructive',
          });
        }
        // Patch availability snapshot for items that changed to pre-order
        const toDowngrade = items.filter(cartItem => {
          if (toRemove.some(r => r.product.id === cartItem.product.id)) return false;
          const inBranch = branchMap.get(cartItem.product.id);
          return inBranch &&
            inBranch.availabilityStatus === 'out_of_stock_today' &&
            cartItem.product.availabilityStatus !== 'out_of_stock_today';
        });
        if (toDowngrade.length > 0 && !cancelled) {
          toDowngrade.forEach(item =>
            updateProductSnapshot(item.product.id, { availabilityStatus: 'out_of_stock_today' })
          );
        }
      } catch {
        // Silent — don't block checkout on network failure
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Run only on mount

  // Create Set for fast lookup
  const closedDatesSet = useMemo(() => {
    return new Set(closedDates.map((d: any) => d.date));
  }, [closedDates]);

  // Helper function to check if date should be disabled in calendar
  const isDateDisabled = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if date is before today
    if (date < today) return true;
    
    // Check if date is in closed dates list
    const dateStr = format(date, "yyyy-MM-dd");
    if (closedDatesSet.has(dateStr)) return true;
    
    // Check if it's a non-working day or no-delivery day
    // Priority: deliveryHours[day] overrides workingHours[day] when explicitly set
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];

    const deliveryDayValue = storeSettings?.deliveryHours?.[dayName];

    if (deliveryDayValue != null) {
      // deliveryHours explicitly configured for this day — takes full priority
      const isNoDelivery =
        deliveryDayValue === '' ||
        deliveryDayValue.toLowerCase() === 'closed' ||
        deliveryDayValue.toLowerCase().includes('закрыто') ||
        deliveryDayValue.toLowerCase().includes('выходной');
      if (isNoDelivery) return true;
      // Has an explicit delivery window → day is available; skip workingHours check
    } else if (storeSettings?.workingHours) {
      // No deliveryHours override → fall back to workingHours
      const daySchedule = storeSettings.workingHours[dayName];
      const isClosed =
        !daySchedule ||
        daySchedule.trim() === '' ||
        daySchedule.toLowerCase().includes('закрыто') ||
        daySchedule.toLowerCase().includes('closed') ||
        daySchedule.toLowerCase().includes('выходной');
      if (isClosed) return true;
    }

    // Check if today has no available delivery time slots
    // Skip this check when deliveryTimeMode is 'disabled' — no time selection needed, day is already open
    if (storeSettings?.workingHours && date.getTime() === today.getTime() && storeSettings?.deliveryTimeMode !== 'disabled') {
      const todayTimeSlots = generateDeliveryTimes(
        storeSettings.workingHours,
        format(date, "yyyy-MM-dd"),
        storeSettings.weekStartDay,
        storeSettings.deliveryTimeMode || 'hours',
        tCommon,
        storeSettings.deliveryHours
      );
      return !todayTimeSlots.some(slot => slot.value !== 'closed');
    }

    return false;
  }, [closedDatesSet, storeSettings, tCommon]);

  // SEO for checkout page — multilingual
  const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
  const checkoutSeoDescriptions: Record<string, string> = {
    ru: `Оформите заказ с доставкой${storeName ? ` в ${storeName}` : ''}`,
    en: `Place your delivery order${storeName ? ` at ${storeName}` : ''}`,
    he: `בצע הזמנה עם משלוח${storeName ? ` ב-${storeName}` : ''}`,
    ar: `قدم طلبك مع التوصيل${storeName ? ` في ${storeName}` : ''}`,
  };
  const checkoutTitleText = tShop('checkout.title') || 'Checkout';
  const title = storeName ? `${checkoutTitleText} - ${storeName}` : checkoutTitleText;
  const description = checkoutSeoDescriptions[currentLanguage] || checkoutSeoDescriptions.ru;

  useSEO({
    title,
    description,
    keywords: generateKeywords(title, description),
    ogTitle: title,
    ogDescription: description,
    canonical: currentLanguage === 'ru' ? '/checkout' : `/${currentLanguage}/checkout`,
    noindex: true
  });
  
  // Helper function to get payment method name for current language with fallback to Russian
  const getPaymentMethodName = (method: any) => {
    return getLocalizedPaymentMethodName(method, currentLanguage);
  };
  
  // Helper functions for future-order validation
  const getFutureOrderProducts = () => {
    return items.filter(item => item.product.availabilityStatus === 'out_of_stock_today');
  };

  const hasFutureOrderProducts = () => {
    return getFutureOrderProducts().length > 0;
  };

  const validateDeliveryDateForFutureOrders = (deliveryDate: string | null) => {
    if (!hasFutureOrderProducts()) return { valid: true };
    
    if (!deliveryDate) {
      return {
        valid: false,
        message: tCommon('checkout.futureOrderProblem') + '. ' + tCommon('checkout.futureOrderSolution')
      };
    }
    
    const today = format(new Date(), "yyyy-MM-dd");
    const futureProducts = getFutureOrderProducts();
    
    if (deliveryDate === today) {
      const productNames = futureProducts.map(item => 
        getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru')
      ).join(', ');
      
      return {
        valid: false,
        message: `${tCommon('checkout.futureOrderProblem')}.\n\n${tCommon('checkout.futureOrderSolution')}\n\n${productNames}`
      };
    }
    
    return { valid: true };
  };

  const isTodayAvailableForDelivery = () => {
    if (!storeSettings?.workingHours) return false;

    // When time selection is disabled, check only if today is a working/delivery day
    if (storeSettings.deliveryTimeMode === 'disabled') {
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[today.getDay()];
      const todayStr = format(today, "yyyy-MM-dd");
      if (closedDatesSet.has(todayStr)) return false;
      const deliveryDayValue = storeSettings.deliveryHours?.[dayName];
      if (deliveryDayValue != null) {
        return deliveryDayValue !== '' && !deliveryDayValue.toLowerCase().includes('closed') && !deliveryDayValue.toLowerCase().includes('закрыто') && !deliveryDayValue.toLowerCase().includes('выходной');
      }
      const daySchedule = storeSettings.workingHours[dayName];
      return !!daySchedule && daySchedule.trim() !== '' && !daySchedule.toLowerCase().includes('закрыто') && !daySchedule.toLowerCase().includes('closed') && !daySchedule.toLowerCase().includes('выходной');
    }
    
    const today = format(new Date(), "yyyy-MM-dd");
    const todayTimeSlots = generateDeliveryTimes(storeSettings.workingHours, today, storeSettings.weekStartDay, storeSettings.deliveryTimeMode || 'hours', tCommon, storeSettings.deliveryHours);
    
    // Check if there are any valid time slots (not just "closed")
    return todayTimeSlots.some(slot => slot.value !== 'closed');
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedGuestDate, setSelectedGuestDate] = useState<Date | undefined>(undefined);
  const [selectedRegisterDate, setSelectedRegisterDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedGuestTime, setSelectedGuestTime] = useState("");
  const [selectedRegisterTime, setSelectedRegisterTime] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedGuestPaymentMethod, setSelectedGuestPaymentMethod] = useState("");
  const [selectedRegisterPaymentMethod, setSelectedRegisterPaymentMethod] = useState("");
  const [isCheckingHypPayment, setIsCheckingHypPayment] = useState(false);
  const hypPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const HYP_PENDING_KEY = 'hyp_pending_payment';

  // Auto-select payment method when there is exactly one enabled option
  // Show toast if redirected back from HYP with payment failure
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "failed") {
      toast({ title: tShop('checkout.paymentFailed'), variant: "destructive" });
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // iOS PWA recovery: poll pending HYP payment status when app regains focus
  useEffect(() => {
    const stopPolling = () => {
      if (hypPollIntervalRef.current) {
        clearInterval(hypPollIntervalRef.current);
        hypPollIntervalRef.current = null;
      }
      setIsCheckingHypPayment(false);
    };

    const startPolling = () => {
      stopPolling();
      const raw = localStorage.getItem(HYP_PENDING_KEY);
      if (!raw) return;
      let parsed: { token: string; timestamp: number };
      try { parsed = JSON.parse(raw); } catch { localStorage.removeItem(HYP_PENDING_KEY); return; }
      const MAX_POLL_MS = 5 * 60 * 1000; // 5 minutes max
      if (Date.now() - parsed.timestamp > MAX_POLL_MS) {
        localStorage.removeItem(HYP_PENDING_KEY);
        return;
      }
      setIsCheckingHypPayment(true);
      const deadlineTimer = setTimeout(() => {
        stopPolling();
        localStorage.removeItem(HYP_PENDING_KEY);
        toast({ title: tShop('checkout.paymentFailed'), variant: 'destructive' });
      }, MAX_POLL_MS - (Date.now() - parsed.timestamp));
      const poll = async () => {
        try {
          const result = await apiRequest('GET', `/api/payment/pending/${parsed.token}`);
          if (result.status === 'completed') {
            clearTimeout(deadlineTimer);
            stopPolling();
            localStorage.removeItem(HYP_PENDING_KEY);
            window.location.href = '/thanks?payment=success';
          } else if (result.status === 'failed') {
            clearTimeout(deadlineTimer);
            stopPolling();
            localStorage.removeItem(HYP_PENDING_KEY);
            toast({ title: tShop('checkout.paymentFailed'), variant: 'destructive' });
          }
        } catch (err: any) {
          // 404 = token not found (payment was never created) — stop immediately
          if (err?.status === 404 || err?.message?.includes('404') || err?.message?.includes('Not found')) {
            clearTimeout(deadlineTimer);
            stopPolling();
            localStorage.removeItem(HYP_PENDING_KEY);
          }
          // other network errors — keep trying until deadline
        }
      };
      poll();
      hypPollIntervalRef.current = setInterval(poll, 3000);
    };

    startPolling();

    const handleVisibility = () => { if (!document.hidden) startPolling(); };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!storeSettings?.paymentMethods || !Array.isArray(storeSettings.paymentMethods)) return;
    const enabled = storeSettings.paymentMethods.filter((m: any) => m.enabled !== false);
    if (enabled.length !== 1) return;
    const only = enabled[0].name;
    if (!selectedPaymentMethod) setSelectedPaymentMethod(only);
    if (!selectedGuestPaymentMethod) setSelectedGuestPaymentMethod(only);
    if (!selectedRegisterPaymentMethod) setSelectedRegisterPaymentMethod(only);
  }, [storeSettings?.paymentMethods]);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [guestDatePickerOpen, setGuestDatePickerOpen] = useState(false);
  const [registerDatePickerOpen, setRegisterDatePickerOpen] = useState(false);
  
  // Create schemas inside component with access to translation functions
  const guestOrderSchema = z.object({
    firstName: z.string().min(2, tCommon('validation.firstNameMinLength')),
    lastName: z.string().min(2, tCommon('validation.lastNameMinLength')),
    email: z.union([
      z.string().email(tCommon('validation.emailInvalid')),
      z.literal('')
    ]),
    phone: z.string().min(10, tCommon('validation.phoneMinLength')),
    address: z.string().min(10, tCommon('validation.addressMinLength')),
  });

  const registrationSchema = guestOrderSchema.extend({
    password: z.string().min(6, tCommon('validation.passwordMinLength')),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: tCommon('validation.passwordMismatch'),
    path: ["confirmPassword"],
  });

  const authSchema = z.object({
    email: z.string().min(1, tCommon('validation.usernameRequired')),
    password: z.string().min(1, tCommon('validation.passwordRequired')),
  });

  const authenticatedOrderSchema = z.object({
    address: z.string().min(10, tCommon('validation.addressMinLength')),
    phone: z.string().min(10, tCommon('validation.phoneMinLength')),
    deliveryDate: z.string().min(1, tCommon('validation.deliveryDateRequired')),
    deliveryTime: z.string().min(1, tCommon('validation.deliveryTimeRequired')),
    paymentMethod: z.string().min(1, tCommon('validation.paymentMethodRequired')),
  });
  
  const guestForm = useForm<GuestOrderData>({
    resolver: zodResolver(guestOrderSchema),
  });

  const registerForm = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
  });

  const loginForm = useForm<AuthData>({
    resolver: zodResolver(authSchema),
  });

  // Get user addresses if authenticated
  const { data: addresses } = useQuery({
    queryKey: ["/api/addresses"],
    enabled: isAuthenticated,
  });

  const createGuestOrderMutation = useMutation<GuestOrderResponse, Error, GuestOrderData>({
    mutationFn: async (data: GuestOrderData) => {
      const deliveryDate = selectedGuestDate ? format(selectedGuestDate, "yyyy-MM-dd") : "";
      if (!deliveryDate) {
        throw new Error(tCommon('validation.deliveryDateRequired'));
      }
      if (storeSettings?.deliveryTimeMode !== 'disabled' && !selectedGuestTime) {
        throw new Error(tCommon('validation.deliveryTimeRequired'));
      }
      // Enhanced validation for future-order products
      const validation = validateDeliveryDateForFutureOrders(deliveryDate);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const subtotal = getTotalPrice();
      const deliveryFeeAmount = calculateDeliveryFee(
        subtotalAfterAllDiscounts, 
        parseFloat(storeSettings?.deliveryFee || "15.00"), 
        (storeSettings?.freeDeliveryFrom && storeSettings.freeDeliveryFrom.trim() !== "") ? parseFloat(storeSettings.freeDeliveryFrom) : null
      );
      const total = subtotalAfterAllDiscounts + deliveryFeeAmount;

      const orderPayloadItems: OrderPayloadItem[] = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity.toString(),
        pricePerKg: item.product.pricePerKg || item.product.price,
        totalPrice: item.totalPrice.toString()
      }));
      const orderData: BaseOrderPayload & {
        guestInfo: typeof data & { deliveryDate: string; deliveryTime: string; paymentMethod: string; deliveryFee: string };
        language: string;
        couponCode?: string;
        giftAccepted?: boolean;
      } = {
        items: orderPayloadItems,
        totalAmount: total.toString(),
        guestInfo: {
          ...data,
          deliveryDate,
          deliveryTime: selectedGuestTime,
          paymentMethod: selectedGuestPaymentMethod,
          deliveryFee: calculateDeliveryFee(
            subtotalAfterAllDiscounts,
            parseFloat(storeSettings?.deliveryFee || "15.00"),
            (storeSettings?.freeDeliveryFrom && storeSettings.freeDeliveryFrom.trim() !== "") ? parseFloat(storeSettings.freeDeliveryFrom) : null
          ).toString(),
        },
        language: currentLanguage,
        status: "pending",
        ...(branchesEnabled && selectedBranchId ? { branchId: selectedBranchId } : {}),
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        ...(giftAccepted && giftEligible ? { giftAccepted: true } : {}),
      };
      
      return await apiRequest("POST", "/api/orders/guest", orderData);
    },
    onSuccess: (order, variables) => {
      clearCart();
      
      // Trigger push notification request after successful checkout (contextual moment)
      triggerPushRequestAfterAction('checkout');
      
      toast({
        title: tShop('checkout.orderPlaced'),
        description: tShop('checkout.orderAcceptedForProcessing', { orderId: order.orderId }),
      });
      // Redirect to thanks page with guest order parameters
      const currentLang = localStorage.getItem('language') || 'ru';
      const hasEmail = !!(variables.email && variables.email.trim());
      const thanksUrl = `/thanks?orderId=${order.orderId}&guestAccessToken=${order.guestAccessToken}&claimToken=${order.guestClaimToken}&guest=true&hasEmail=${hasEmail}&lang=${currentLang}`;
      navigate(thanksUrl);
    },
    onError: (error: any) => {
      if (error?.message === 'coupon_invalid') {
        setAppliedCoupon(null);
        toast({ title: tShop('checkout.orderError'), description: tShop(`cart.${error.couponError || 'couponError'}`), variant: "destructive" });
      } else {
        toast({ title: tShop('checkout.orderError'), description: error.message, variant: "destructive" });
      }
    },
  });

  const registerAndOrderMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      // First register the user
      const newUser = await apiRequest("POST", "/api/register", {
        username: data.email, // Use email as username for checkout registration
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      // Save the delivery address for the new user
      if (data.address && data.address.trim()) {
        try {
          await apiRequest("POST", "/api/addresses", {
            label: tCommon('address.home'),
            address: data.address.trim()
          });
        } catch (error) {
          console.warn("Failed to save address:", error);
        }
      }

      // Validate delivery date/time before creating order
      const deliveryDateStr = selectedRegisterDate ? format(selectedRegisterDate, "yyyy-MM-dd") : "";
      if (!deliveryDateStr) {
        throw new Error(tCommon('validation.deliveryDateRequired'));
      }
      if (storeSettings?.deliveryTimeMode !== 'disabled' && !selectedRegisterTime) {
        throw new Error(tCommon('validation.deliveryTimeRequired'));
      }
      const validation = validateDeliveryDateForFutureOrders(deliveryDateStr);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Then create the order with user ID
      const subtotal = getTotalPrice();
      const deliveryFeeAmount = calculateDeliveryFee(
        subtotalAfterAllDiscounts, 
        parseFloat(storeSettings?.deliveryFee || "15.00"), 
        (storeSettings?.freeDeliveryFrom && storeSettings.freeDeliveryFrom.trim() !== "") ? parseFloat(storeSettings.freeDeliveryFrom) : null
      );
      const total = subtotalAfterAllDiscounts + deliveryFeeAmount;

      const regOrderPayload: BaseOrderPayload & {
        userId: string;
        deliveryAddress: string;
        deliveryDate: string;
        deliveryTime: string;
        paymentMethod: string;
        customerPhone: string;
        deliveryFee: string;
        couponCode?: string;
        giftAccepted?: boolean;
      } = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.pricePerKg || item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: total.toString(),
        userId: newUser.id,
        deliveryAddress: data.address,
        deliveryDate: selectedRegisterDate ? format(selectedRegisterDate, "yyyy-MM-dd") : "",
        deliveryTime: selectedRegisterTime,
        paymentMethod: selectedRegisterPaymentMethod,
        customerPhone: data.phone,
        deliveryFee: deliveryFeeAmount.toString(),
        status: "pending",
        ...(branchesEnabled && selectedBranchId ? { branchId: selectedBranchId } : {}),
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        ...(giftAccepted && giftEligible ? { giftAccepted: true } : {}),
      };
      
      if ((data as any)._useHyp) {
        const hypResult = await apiRequest("POST", "/api/payment/initiate", {
          items: regOrderPayload.items,
          totalAmount: regOrderPayload.totalAmount,
          orderData: {
            userId: newUser.id,
            deliveryAddress: regOrderPayload.deliveryAddress,
            deliveryDate: regOrderPayload.deliveryDate,
            deliveryTime: regOrderPayload.deliveryTime,
            deliveryFee: regOrderPayload.deliveryFee,
            status: "pending",
            customerPhone: regOrderPayload.customerPhone,
            ...(branchesEnabled && selectedBranchId ? { branchId: selectedBranchId } : {}),
            ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
            ...(giftAccepted && giftEligible ? { giftAccepted: true } : {}),
          },
          userId: newUser.id,
          language: currentLanguage,
          branchId: branchesEnabled && selectedBranchId ? selectedBranchId : null,
        });
        localStorage.setItem(HYP_PENDING_KEY, JSON.stringify({ token: hypResult.token, timestamp: Date.now() }));
        window.location.href = hypResult.redirectUrl;
        throw new Error("HYP_REDIRECT");
      }

      return await apiRequest("POST", "/api/orders", regOrderPayload);
    },
    onSuccess: (order) => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Trigger push notification request after successful checkout (contextual moment)
      triggerPushRequestAfterAction('checkout');
      
      toast({
        title: tShop('checkout.registrationAndOrderCompleted'),
        description: tShop('checkout.orderAcceptedForProcessing', { orderId: order.id }),
      });
      // Redirect to thanks page for registered user order
      const currentLang = localStorage.getItem('language') || 'ru';
      const thanksUrl = `/thanks?orderId=${order.id}&guest=false&lang=${currentLang}`;
      navigate(thanksUrl);
    },
    onError: (error: any) => {
      if (error?.message === 'coupon_invalid') {
        setAppliedCoupon(null);
        toast({ title: tShop('checkout.orderError'), description: tShop(`cart.${error.couponError || 'couponError'}`), variant: "destructive" });
      } else if (error?.message === 'HYP_REDIRECT') {
        // ignore — browser is redirecting to HYP payment page
      } else {
        toast({ title: tShop('checkout.orderError'), description: error.message, variant: "destructive" });
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: AuthData) => {
      // Use username (which can be email) for login
      return await apiRequest("POST", "/api/login", {
        username: credentials.email,
        password: credentials.password
      });
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: tCommon('auth.loginSuccess'),
        description: tShop('checkout.canNowPlaceOrder'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tCommon('auth.loginError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAuthenticatedOrderMutation = useMutation({
    mutationFn: async (formData: AuthenticatedOrderData) => {
      const deliveryDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
      
      // Enhanced validation for future-order products
      const validation = validateDeliveryDateForFutureOrders(deliveryDate);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const subtotal = getTotalPrice();
      const deliveryFeeAmount = calculateDeliveryFee(
        subtotalAfterAllDiscounts, 
        parseFloat(storeSettings?.deliveryFee || "15.00"), 
        (storeSettings?.freeDeliveryFrom && storeSettings.freeDeliveryFrom.trim() !== "") ? parseFloat(storeSettings.freeDeliveryFrom) : null
      );
      const total = subtotalAfterAllDiscounts + deliveryFeeAmount;

      const authOrderPayload: BaseOrderPayload & {
        deliveryAddress: string;
        customerPhone: string;
        deliveryDate: string;
        deliveryTime: string;
        paymentMethod: string;
        deliveryFee: string;
        couponCode?: string;
        giftAccepted?: boolean;
      } = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.pricePerKg || item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: total.toString(),
        deliveryAddress: formData.address,
        customerPhone: formData.phone,
        deliveryDate,
        deliveryTime: selectedTime,
        paymentMethod: formData.paymentMethod,
        deliveryFee: deliveryFeeAmount.toString(),
        status: "pending",
        ...(branchesEnabled && selectedBranchId ? { branchId: selectedBranchId } : {}),
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        ...(giftAccepted && giftEligible ? { giftAccepted: true } : {}),
      };
      
      return await apiRequest("POST", "/api/orders", authOrderPayload);
    },
    onSuccess: (order) => {
      clearCart();
      
      // Trigger push notification request after successful checkout (contextual moment)
      triggerPushRequestAfterAction('checkout');
      
      toast({
        title: tShop('checkout.orderPlaced'),
        description: tShop('checkout.orderAcceptedForProcessing', { orderId: order.id }),
      });
      // Redirect to thanks page for authenticated user order
      const currentLang = localStorage.getItem('language') || 'ru';
      const thanksUrl = `/thanks?orderId=${order.id}&guest=false&lang=${currentLang}`;
      navigate(thanksUrl);
    },
    onError: (error: any) => {
      if (error?.message === 'coupon_invalid') {
        setAppliedCoupon(null);
        toast({ title: tShop('checkout.orderError'), description: tShop(`cart.${error.couponError || 'couponError'}`), variant: "destructive" });
      } else {
        toast({ title: tShop('checkout.orderError'), description: error.message, variant: "destructive" });
      }
    },
  });

  // HYP online payment initiation mutation (shared across all checkout flows)
  const hypPaymentMutation = useMutation({
    mutationFn: async (payload: {
      items: any[];
      totalAmount: string;
      orderData: Record<string, any>;
      userId?: string | null;
      language: string;
      branchId?: number | null;
    }) => {
      return await apiRequest("POST", "/api/payment/initiate", payload);
    },
    onSuccess: (data: { redirectUrl: string; token: string }) => {
      localStorage.setItem(HYP_PENDING_KEY, JSON.stringify({ token: data.token, timestamp: Date.now() }));
      window.location.href = data.redirectUrl;
    },
    onError: (error: any) => {
      toast({ title: tShop('checkout.orderError'), description: error.message, variant: "destructive" });
    },
  });

  const isOnlinePayment = (method: string) => method === "__online__";

  // Check if online payment is available via paymentProviderConfig
  const activePaymentProvider: string = (storeSettings as any)?.paymentProviderConfig?.active || 'none';
  const isOnlinePaymentAvailable = Boolean(
    (activePaymentProvider === 'hyp' && (storeSettings as any)?.paymentProviderConfig?.hyp?.masof) ||
    (activePaymentProvider === 'grow' && (storeSettings as any)?.paymentProviderConfig?.grow?.userId)
  );

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{tCommon('cart.empty')}</h2>
            <p className="text-gray-600 mb-4">{tCommon('cart.emptyDescription')}</p>
            <Button asChild>
              <UTMLink href="/">
                {tCommon('navigation.goShopping')}
              </UTMLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* iOS PWA: HYP payment status check overlay */}
      {isCheckingHypPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4 mx-4 max-w-xs w-full">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-800 font-medium text-center">{tShop('checkout.checkingPaymentStatus')}</p>
            <button
              onClick={() => {
                if (hypPollIntervalRef.current) clearInterval(hypPollIntervalRef.current);
                hypPollIntervalRef.current = null;
                localStorage.removeItem(HYP_PENDING_KEY);
                setIsCheckingHypPayment(false);
              }}
              className="text-sm text-gray-500 underline hover:text-gray-700 mt-1"
            >
              {tShop('checkout.cancelPaymentCheck') || 'Отмена'}
            </button>
          </div>
        </div>
      )}
      {/* Back Navigation */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          asChild
        >
          <UTMLink href="/">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {tCommon('navigation.backToShopping')}
          </UTMLink>
        </Button>
      </div>

      {/* Branch confirmation dialog — appears on checkout page load */}
      {showBranchConfirmDialog && branchesEnabled && selectedBranch && branches.length > 1 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <MapPin className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {String(tCommon('branch.confirmBranchTitle'))}
              </h2>
              <p className="text-sm text-gray-500">
                {String(tCommon('branch.confirmBranchDesc'))}
              </p>
            </div>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 mb-5 text-center">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                {String(tCommon('branch.orderFrom'))}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {getLocalizedField(selectedBranch, 'name', currentLanguage as SupportedLanguage, 'ru')}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full bg-primary text-white hover:bg-primary-hover"
                onClick={() => setShowBranchConfirmDialog(false)}
              >
                {String(tCommon('branch.confirmBranchBtn'))}
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700"
                onClick={() => {
                  setShowBranchConfirmDialog(false);
                  setShowBranchChangeDialog(true);
                }}
              >
                {String(tCommon('branch.changeBranch'))}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Branch indicator - shown when branches feature is active and a branch is selected */}
      {branchesEnabled && selectedBranch && branches.length > 1 && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl shadow-sm">
          <MapPin className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide leading-tight">
              {String(tCommon('branch.selectedBranch'))}
            </p>
            <p className="text-base font-bold text-gray-900 truncate">
              {getLocalizedField(selectedBranch, 'name', currentLanguage as SupportedLanguage, 'ru')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-400 text-amber-700 hover:bg-amber-100 text-xs flex-shrink-0"
            onClick={() => setShowBranchChangeDialog(true)}
          >
            {String(tCommon('branch.changeBranch'))}
          </Button>
        </div>
      )}

      {/* Branch Change: Step 1 – Select a different branch */}
      {showBranchChangeDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {String(tCommon('branch.changeBranch'))}
              </h2>
            </div>
            <div className="space-y-2 mb-5">
              {branches.map(branch => (
                <button
                  key={branch.id}
                  disabled={isFetchingCompat}
                  onClick={async () => {
                    if (branch.id === selectedBranchId) {
                      setShowBranchChangeDialog(false);
                      return;
                    }
                    setIsFetchingCompat(true);
                    try {
                      const res = await fetch(`/api/products?branchId=${branch.id}`);
                      const branchProducts: Array<{ id: number; isAvailable: boolean; availabilityStatus: string }> = await res.json();
                      const branchMap = new Map(branchProducts.map(p => [p.id, p]));
                      const toRemove: CartItem[] = [];
                      const toDowngrade: CartItem[] = [];
                      const toKeep: CartItem[] = [];
                      for (const cartItem of items) {
                        const inBranch = branchMap.get(cartItem.product.id);
                        if (!inBranch || inBranch.isAvailable === false || inBranch.availabilityStatus === 'completely_unavailable') {
                          toRemove.push(cartItem);
                        } else if (
                          inBranch.availabilityStatus === 'out_of_stock_today' &&
                          cartItem.product.availabilityStatus !== 'out_of_stock_today'
                        ) {
                          toDowngrade.push(cartItem);
                        } else {
                          toKeep.push(cartItem);
                        }
                      }
                      setBranchCompatResult({ toRemove, toDowngrade, toKeep });
                      setPendingBranchId(branch.id);
                    } catch {
                      toast({ title: String(tShop('checkout.orderError')), variant: 'destructive' });
                    } finally {
                      setIsFetchingCompat(false);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 group ${
                    branch.id === selectedBranchId
                      ? 'border-primary bg-primary/5 cursor-default'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-4 h-4 flex-shrink-0 ${branch.id === selectedBranchId ? 'text-primary' : 'text-gray-400 group-hover:text-orange-500'}`} />
                    <span className={`font-medium text-sm ${branch.id === selectedBranchId ? 'text-primary' : 'text-gray-800'}`}>
                      {branch.name}
                    </span>
                    {branch.id === selectedBranchId && (
                      <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                    )}
                    {isFetchingCompat && branch.id !== selectedBranchId && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowBranchChangeDialog(false)}>
              {tCommon('actions.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Branch Change: Step 2 – Show compatibility and confirm */}
      {pendingBranchId !== null && branchCompatResult !== null && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                branchCompatResult.toRemove.length > 0 ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${branchCompatResult.toRemove.length > 0 ? 'text-red-500' : 'text-orange-500'}`} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {String(tCommon('branch.confirmChange'))}
              </h2>
              <p className="text-gray-500 text-sm">
                {(() => {
                  const pendingBranch = branches.find(b => b.id === pendingBranchId);
                  return pendingBranch ? pendingBranch.name : '';
                })()}
              </p>
            </div>

            {branchCompatResult.toRemove.length === 0 && branchCompatResult.toDowngrade.length === 0 ? (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4 text-center">
                {String(tCommon('branch.allItemsAvailable'))}
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {branchCompatResult.toRemove.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-xs font-semibold text-red-700 mb-1">{String(tCommon('branch.itemsToRemove'))} ({branchCompatResult.toRemove.length})</p>
                    <ul className="space-y-0.5">
                      {branchCompatResult.toRemove.map(item => (
                        <li key={item.product.id} className="text-xs text-red-600 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                          {getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {branchCompatResult.toDowngrade.length > 0 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                    <p className="text-xs font-semibold text-orange-700 mb-1">{String(tCommon('branch.itemsPreOrder'))} ({branchCompatResult.toDowngrade.length})</p>
                    <ul className="space-y-0.5">
                      {branchCompatResult.toDowngrade.map(item => (
                        <li key={item.product.id} className="text-xs text-orange-600 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                          {getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {branchCompatResult.toKeep.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <p className="text-xs font-semibold text-green-700 mb-1">{String(tCommon('branch.itemsKept'))} ({branchCompatResult.toKeep.length})</p>
                    <ul className="space-y-0.5">
                      {branchCompatResult.toKeep.map(item => (
                        <li key={item.product.id} className="text-xs text-green-600 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                          {getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                className="w-full bg-primary text-white hover:bg-primary-hover"
                onClick={() => {
                  const { toRemove, toDowngrade } = branchCompatResult;
                  toRemove.forEach(item => removeItem(item.product.id));
                  // Update cart product snapshots for downgraded items so
                  // checkout delivery validation reflects their new pre-order status
                  toDowngrade.forEach(item =>
                    updateProductSnapshot(item.product.id, { availabilityStatus: 'out_of_stock_today' })
                  );
                  selectBranch(pendingBranchId!);
                  setPendingBranchId(null);
                  setBranchCompatResult(null);
                  setShowBranchChangeDialog(false);
                  if (branchCompatResult.toRemove.length === items.length) {
                    setLocation('/');
                  }
                }}
              >
                {branchCompatResult.toRemove.length > 0
                  ? String(tCommon('branch.confirmAndRemove'))
                  : String(tCommon('branch.confirm'))}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPendingBranchId(null);
                  setBranchCompatResult(null);
                }}
              >
                {tCommon('actions.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {tShop('checkout.yourOrder')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru')}</h4>
                      {item.product.availabilityStatus === 'out_of_stock_today' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                                <Info className="h-3 w-3" />
                                {tShop('preOrder')}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{tShop('preOrderTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        const qty = Math.round(item.quantity * 10) / 10;
                        const formatQty = (value: number) => value % 1 === 0 ? value.toString() : value.toFixed(1);
                        
                        switch (item.product.unit) {
                          case 'piece': 
                            return `${formatQty(qty)} ${tShop('units.piece')} x ${formatCurrency(item.product.price)}`;
                          case 'kg': 
                            return `${formatQty(qty)} ${tShop('units.kg')} x ${formatCurrency(item.product.price)}`;
                          case '100g': 
                            if (qty >= 1000) {
                              return `${formatQty(qty / 1000)} ${tShop('units.kg')} x ${formatCurrency(item.product.price)}`;
                            }
                            return `${formatQty(qty)} ${tShop('units.g')} x ${formatCurrency(item.product.price)}`;
                          case '100ml': 
                            return `${formatQty(qty)} ${tShop('units.ml')} x ${formatCurrency(item.product.price)}`;
                          default: 
                            return `${formatQty(qty)} x ${formatCurrency(item.product.price)}`;
                        }
                      })()}
                    </p>
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              ))}
              {/* Gift item shown as a separate 100%-discounted line when accepted */}
              {giftAccepted && giftEligible && loyaltyContext?.giftProduct && (
                <div className="flex justify-between items-center border border-green-200 bg-green-50 rounded-lg px-3 py-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-sm">🎁</span>
                      <h4 className="font-medium text-green-800">
                        {getLocalizedField(loyaltyContext.giftProduct, 'name', currentLanguage as SupportedLanguage, 'ru')}
                      </h4>
                      <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">
                        {tShop('cart.giftAdded')}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 mt-0.5">
                      {(() => {
                        const qty = loyaltyContext.giftProductQuantity || 1;
                        const unit = loyaltyContext.giftProduct.unit;
                        if (unit === 'piece') return `${qty} ${tShop('units.piece')}`;
                        if (unit === 'kg') return `${qty} ${tShop('units.kg')}`;
                        if (unit === '100g' || unit === '100gram') return `${qty} ${tShop('units.g')}`;
                        if (unit === '100ml') return `${qty} ${tShop('units.ml')}`;
                        return `${qty}`;
                      })()}
                    </p>
                  </div>
                  <div className="font-semibold text-green-600">{tShop('checkout.free')}</div>
                </div>
              )}
              <Separator />
              {(() => {
                const subtotal = subtotalForDiscounts;
                const freeDeliveryThreshold = (storeSettings?.freeDeliveryFrom && storeSettings.freeDeliveryFrom.trim() !== "") ? parseFloat(storeSettings.freeDeliveryFrom) : null;
                const deliveryFeeAmount = calculateDeliveryFee(
                  subtotalAfterAllDiscounts, 
                  parseFloat(storeSettings?.deliveryFee || "15.00"), 
                  freeDeliveryThreshold
                );
                const total = subtotalAfterAllDiscounts + deliveryFeeAmount;

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{tShop('cart.items')}:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {checkoutVolumeDiscountAmount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>{tShop('cart.volumeDiscount')}:</span>
                        <span>-{formatCurrency(checkoutVolumeDiscountAmount)}</span>
                      </div>
                    )}
                    {loyaltyDiscountAmount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>{tShop('cart.loyaltyDiscount')} ({loyaltyContext?.loyaltyDiscountPercent}%):</span>
                        <span>-{formatCurrency(loyaltyDiscountAmount)}</span>
                      </div>
                    )}
                    {appliedCoupon && couponDiscountAmount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>{tShop('cart.couponDiscount')} ({appliedCoupon.code}):</span>
                        <span>-{formatCurrency(couponDiscountAmount)}</span>
                      </div>
                    )}
                    {giftAccepted && giftEligible && loyaltyContext?.giftProduct && (
                      <div className="flex justify-between text-green-700">
                        <span>{tShop('cart.giftAdded')}:</span>
                        <span className="text-green-600 font-medium">{tShop('checkout.free')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{tShop('cart.delivery')}:</span>
                      <span>
                        {deliveryFeeAmount === 0 ? (
                          <span className="text-green-600 font-medium">{tShop('checkout.free')}</span>
                        ) : (
                          formatCurrency(deliveryFeeAmount)
                        )}
                      </span>
                    </div>
                    {deliveryFeeAmount > 0 && freeDeliveryThreshold && freeDeliveryThreshold > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-green-700">
                          {tShop('cart.freeDeliveryFrom')} {formatCurrency(freeDeliveryThreshold)}
                        </div>
                        <div className="text-sm text-green-600 mt-1">
                          🚚 {tShop('cart.freeDeliveryBenefit')}
                        </div>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>{tShop('cart.total')}:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Checkout Form */}
        <Card>
          <CardHeader>
            <CardTitle>{tShop('checkout.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isAuthenticated ? (
              /* Authenticated User Checkout */
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {tShop('checkout.welcomeMessage').replace('{name}', user?.firstName || '')}
                  </AlertDescription>
                </Alert>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const address = formData.get("address") as string;
                  const phone = formData.get("phone") as string;
                  const deliveryDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
                  const paymentMethod = selectedPaymentMethod;
                  if (!deliveryDate) {
                    toast({ title: tCommon('validation.deliveryDateRequired'), variant: "destructive" });
                    return;
                  }
                  if (storeSettings?.deliveryTimeMode !== 'disabled' && !selectedTime) {
                    toast({ title: tCommon('validation.deliveryTimeRequired'), variant: "destructive" });
                    return;
                  }
                  if (isOnlinePayment(paymentMethod)) {
                    const deliveryFeeAmt = calculateDeliveryFee(
                      subtotalAfterAllDiscounts,
                      parseFloat(storeSettings?.deliveryFee || "15.00"),
                      (storeSettings?.freeDeliveryFrom && storeSettings.freeDeliveryFrom.trim() !== "") ? parseFloat(storeSettings.freeDeliveryFrom) : null
                    );
                    const total = subtotalAfterAllDiscounts + deliveryFeeAmt;
                    hypPaymentMutation.mutate({
                      items: items.map(item => ({
                        productId: item.product.id,
                        quantity: item.quantity.toString(),
                        pricePerKg: item.product.pricePerKg || item.product.price,
                        totalPrice: item.totalPrice.toString()
                      })),
                      totalAmount: total.toString(),
                      orderData: {
                        userId: user?.id,
                        deliveryAddress: address,
                        customerPhone: phone,
                        deliveryDate,
                        deliveryTime: selectedTime,
                        deliveryFee: deliveryFeeAmt.toString(),
                        status: "pending",
                        ...(branchesEnabled && selectedBranchId ? { branchId: selectedBranchId } : {}),
                        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
                        ...(giftAccepted && giftEligible ? { giftAccepted: true } : {}),
                      },
                      userId: user?.id || null,
                      language: currentLanguage,
                      branchId: branchesEnabled && selectedBranchId ? selectedBranchId : null,
                    });
                    return;
                  }
                  createAuthenticatedOrderMutation.mutate({ address, phone, deliveryDate, deliveryTime: selectedTime, paymentMethod });
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">{tShop('checkout.customerPhone')} *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+972-XX-XXX-XXXX"
                        defaultValue={user?.phone || ""}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address">{tShop('checkout.deliveryAddress')} *</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder={tShop('checkout.deliveryAddressPlaceholder')}
                        required
                      />
                      
                      {addresses && Array.isArray(addresses) && addresses.length > 0 && (
                        <div className="mt-2">
                          <Label className="text-sm text-gray-600">{tShop('checkout.savedAddresses')}</Label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {addresses.map((addr: any, index: number) => (
                              <Button
                                key={index}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const input = document.getElementById("address") as HTMLInputElement;
                                  if (input) input.value = addr?.address ? String(addr.address) : '';
                                }}
                              >
                                {addr?.label ? `${addr.label}: ${addr.address || ''}` : (addr?.address || '')}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deliveryDate">{tShop('checkout.deliveryDate')} *</Label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: dateLocale }) : tShop('checkout.selectDate')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate}
                              locale={dateLocale}
                              onSelect={(date) => {
                                setSelectedDate(date);
                                setSelectedTime(""); // Reset time selection when date changes
                                setDatePickerOpen(false); // Close calendar after selection
                              }}
                              disabled={isDateDisabled}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {storeSettings?.deliveryTimeMode !== 'disabled' && (
                        <div>
                          <Label htmlFor="deliveryTime">{tShop('checkout.deliveryTime')} *</Label>
                          <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate} required>
                            <SelectTrigger>
                              <SelectValue placeholder={tShop('checkout.selectTime')} />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedDate && generateDeliveryTimes(
                                storeSettings?.workingHours,
                                format(selectedDate, "yyyy-MM-dd"),
                                storeSettings?.weekStartDay,
                                storeSettings?.deliveryTimeMode || 'hours',
                                tCommon,
                                storeSettings?.deliveryHours
                              ).map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="paymentMethod">{tShop('checkout.paymentMethod')} *</Label>
                      <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} required>
                        <SelectTrigger>
                          <SelectValue placeholder={tShop('checkout.selectPaymentMethod')} />
                        </SelectTrigger>
                        <SelectContent>
                          {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                            storeSettings.paymentMethods.map((method: any) => (
                              <SelectItem key={method.id} value={method.name}>
                                {getPaymentMethodName(method)}
                              </SelectItem>
                            )) : (
                              <>
                                <SelectItem value="cash">{tShop('checkout.cashOnDelivery')}</SelectItem>
                                <SelectItem value="card">{tShop('checkout.cardOnDelivery')}</SelectItem>
                                <SelectItem value="transfer">{tShop('checkout.bankTransfer')}</SelectItem>
                              </>
                            )
                          }
                          {isOnlinePaymentAvailable && (
                            <SelectItem value="__online__">{tShop('checkout.paymentOption')}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 text-lg shadow-lg"
                      disabled={createAuthenticatedOrderMutation.isPending || hypPaymentMutation.isPending}
                    >
                      {(createAuthenticatedOrderMutation.isPending || hypPaymentMutation.isPending)
                        ? (isOnlinePayment(selectedPaymentMethod) ? tShop('checkout.processingPayment') : tShop('checkout.processing'))
                        : (isOnlinePayment(selectedPaymentMethod) ? tShop('checkout.payOnline') : tShop('checkout.placeOrder'))
                      }
                    </Button>
                    {isOnlinePayment(selectedPaymentMethod) && <PaymentBadges provider={activePaymentProvider} />}
                  </div>
                </form>
              </div>
            ) : (
              /* Guest/Registration/Login Options */
              <Tabs value={orderType} onValueChange={(value) => setOrderType(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  {storeSettings?.checkoutGuestFirst ? (
                    <>
                      <TabsTrigger value="guest" className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {tShop('checkout.guest')}
                      </TabsTrigger>
                      <TabsTrigger value="register" className="flex items-center gap-1">
                        <UserPlus className="h-4 w-4" />
                        {tShop('checkout.registration')}
                      </TabsTrigger>
                      <TabsTrigger value="login" className="flex items-center gap-1">
                        <UserCheck className="h-4 w-4" />
                        {tShop('checkout.loginTab')}
                      </TabsTrigger>
                    </>
                  ) : (
                    <>
                      <TabsTrigger value="register" className="flex items-center gap-1">
                        <UserPlus className="h-4 w-4" />
                        {tShop('checkout.registration')}
                      </TabsTrigger>
                      <TabsTrigger value="login" className="flex items-center gap-1">
                        <UserCheck className="h-4 w-4" />
                        {tShop('checkout.loginTab')}
                      </TabsTrigger>
                      <TabsTrigger value="guest" className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {tShop('checkout.guest')}
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                <TabsContent value="register" className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {tShop('checkout.registrationBenefit')}
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={registerForm.handleSubmit((data) => registerAndOrderMutation.mutate({ ...data, _useHyp: isOnlinePayment(selectedRegisterPaymentMethod) } as any))}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">{tCommon('firstName')}</Label>
                          <Input
                            id="firstName"
                            {...registerForm.register("firstName")}
                            placeholder={tCommon('enterFirstName')}
                          />
                          {registerForm.formState.errors.firstName && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.firstName.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="lastName">{tCommon('lastName')}</Label>
                          <Input
                            id="lastName"
                            {...registerForm.register("lastName")}
                            placeholder={tCommon('enterLastName')}
                          />
                          {registerForm.formState.errors.lastName && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">{tCommon('email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          {...registerForm.register("email")}
                          placeholder="your@email.com"
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone">{tShop('checkout.customerPhone')} *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...registerForm.register("phone")}
                          placeholder="+972-XX-XXX-XXXX"
                        />
                        {registerForm.formState.errors.phone && (
                          <p className="text-sm text-red-600">{registerForm.formState.errors.phone.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="address">{tShop('checkout.deliveryAddress')} *</Label>
                        <Input
                          id="address"
                          {...registerForm.register("address")}
                          placeholder={tShop('checkout.deliveryAddressPlaceholder')}
                        />
                        {registerForm.formState.errors.address && (
                          <p className="text-sm text-red-600">{registerForm.formState.errors.address.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="password">{tCommon('password')}</Label>
                          <Input
                            id="password"
                            type="password"
                            {...registerForm.register("password")}
                            placeholder={tCommon('passwordPlaceholder')}
                          />
                          {registerForm.formState.errors.password && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">{tCommon('confirmPassword')}</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            {...registerForm.register("confirmPassword")}
                            placeholder={tCommon('confirmPassword')}
                          />
                          {registerForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.confirmPassword.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="registerDeliveryDate">{tShop('checkout.deliveryDate')} *</Label>
                          <Popover open={registerDatePickerOpen} onOpenChange={setRegisterDatePickerOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !selectedRegisterDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedRegisterDate ? format(selectedRegisterDate, "dd MMMM yyyy", { locale: dateLocale }) : tShop('checkout.selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={selectedRegisterDate}
                                locale={dateLocale}
                                onSelect={(date) => {
                                  setSelectedRegisterDate(date);
                                  setSelectedRegisterTime(""); // Reset time selection when date changes
                                  setRegisterDatePickerOpen(false); // Close calendar after selection
                                }}
                                disabled={isDateDisabled}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {storeSettings?.deliveryTimeMode !== 'disabled' && (
                          <div>
                            <Label htmlFor="registerDeliveryTime">{tShop('checkout.deliveryTime')} *</Label>
                            <Select value={selectedRegisterTime} onValueChange={setSelectedRegisterTime} disabled={!selectedRegisterDate} required>
                              <SelectTrigger>
                                <SelectValue placeholder={tShop('checkout.selectTime')} />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedRegisterDate && generateDeliveryTimes(
                                  storeSettings?.workingHours,
                                  format(selectedRegisterDate, "yyyy-MM-dd"),
                                  storeSettings?.weekStartDay,
                                  storeSettings?.deliveryTimeMode || 'hours',
                                  tCommon,
                                  storeSettings?.deliveryHours
                                ).map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="registerPaymentMethod">{tShop('checkout.paymentMethod')} *</Label>
                        <Select 
                          value={selectedRegisterPaymentMethod} 
                          onValueChange={setSelectedRegisterPaymentMethod} 
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={tShop('checkout.selectPaymentMethod')} />
                          </SelectTrigger>
                          <SelectContent>
                            {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                              storeSettings.paymentMethods.map((method: any) => (
                                <SelectItem key={method.id} value={method.name}>
                                  {getPaymentMethodName(method)}
                                </SelectItem>
                              )) : (
                                <>
                                  <SelectItem value="cash">{tShop('checkout.cashOnDelivery')}</SelectItem>
                                  <SelectItem value="card">{tShop('checkout.cardOnDelivery')}</SelectItem>
                                  <SelectItem value="transfer">{tShop('checkout.bankTransfer')}</SelectItem>
                                </>
                              )
                            }
                            {isOnlinePaymentAvailable && (
                              <SelectItem value="__online__">{tShop('checkout.paymentOption')}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 text-lg shadow-lg"
                        disabled={registerAndOrderMutation.isPending || hypPaymentMutation.isPending}
                      >
                        {(registerAndOrderMutation.isPending || hypPaymentMutation.isPending)
                          ? (isOnlinePayment(selectedRegisterPaymentMethod) ? tShop('checkout.processingPayment') : tShop('checkout.registeringAndProcessing'))
                          : (isOnlinePayment(selectedRegisterPaymentMethod) ? tShop('checkout.payOnline') : tShop('checkout.registerAndPlaceOrder'))
                        }
                      </Button>
                      {isOnlinePayment(selectedRegisterPaymentMethod) && <PaymentBadges provider={activePaymentProvider} />}
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="login" className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {tShop('checkout.signInToUseData')}
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="loginEmail">{tCommon('usernameOrEmail')}</Label>
                        <Input
                          id="loginEmail"
                          type="text"
                          {...loginForm.register("email")}
                          placeholder={tCommon('usernamePlaceholder')}
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="loginPassword">{tCommon('password')}</Label>
                        <Input
                          id="loginPassword"
                          type="password"
                          {...loginForm.register("password")}
                          placeholder={tCommon('passwordPlaceholder')}
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? tCommon('loading') : tCommon('signIn')}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="guest" className="space-y-4">
                  <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/30">
                    <Star className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-800 dark:text-amber-300 font-medium">
                      {(storeSettings as any)?.guestPromoEnabled
                        ? (getLocalizedField(storeSettings as any, 'guestPromoText', currentLanguage as SupportedLanguage) || tShop('checkout.guestFirstPromo'))
                        : tShop('checkout.guestFirstPromo')}
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={guestForm.handleSubmit(async (data) => {
                    if (isOnlinePayment(selectedGuestPaymentMethod)) {
                      const deliveryDate = selectedGuestDate ? format(selectedGuestDate, "yyyy-MM-dd") : "";
                      if (!deliveryDate) { toast({ title: tCommon('validation.deliveryDateRequired'), variant: "destructive" }); return; }
                      if (storeSettings?.deliveryTimeMode !== 'disabled' && !selectedGuestTime) { toast({ title: tCommon('validation.deliveryTimeRequired'), variant: "destructive" }); return; }
                      const deliveryFeeAmt = calculateDeliveryFee(
                        subtotalAfterAllDiscounts,
                        parseFloat(storeSettings?.deliveryFee || "15.00"),
                        (storeSettings?.freeDeliveryFrom && storeSettings.freeDeliveryFrom.trim() !== "") ? parseFloat(storeSettings.freeDeliveryFrom) : null
                      );
                      const total = subtotalAfterAllDiscounts + deliveryFeeAmt;
                      hypPaymentMutation.mutate({
                        items: items.map(item => ({
                          productId: item.product.id,
                          quantity: item.quantity.toString(),
                          pricePerKg: item.product.pricePerKg || item.product.price,
                          totalPrice: item.totalPrice.toString()
                        })),
                        totalAmount: total.toString(),
                        orderData: {
                          guestName: `${data.firstName} ${data.lastName}`,
                          guestEmail: data.email,
                          guestPhone: data.phone,
                          deliveryAddress: data.address,
                          deliveryDate,
                          deliveryTime: selectedGuestTime,
                          deliveryFee: deliveryFeeAmt.toString(),
                          status: "pending",
                          ...(branchesEnabled && selectedBranchId ? { branchId: selectedBranchId } : {}),
                          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
                        },
                        userId: null,
                        language: currentLanguage,
                        branchId: branchesEnabled && selectedBranchId ? selectedBranchId : null,
                      });
                      return;
                    }
                    createGuestOrderMutation.mutate(data);
                  })}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guestFirstName">{tCommon('firstName')}</Label>
                          <Input
                            id="guestFirstName"
                            {...guestForm.register("firstName")}
                            placeholder={tCommon('firstName')}
                          />
                          {guestForm.formState.errors.firstName && (
                            <p className="text-sm text-red-600">{guestForm.formState.errors.firstName.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="guestLastName">{tCommon('lastName')}</Label>
                          <Input
                            id="guestLastName"
                            {...guestForm.register("lastName")}
                            placeholder={tCommon('lastName')}
                          />
                          {guestForm.formState.errors.lastName && (
                            <p className="text-sm text-red-600">{guestForm.formState.errors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="guestEmail">{tCommon('email')}</Label>
                        <Input
                          id="guestEmail"
                          type="email"
                          {...guestForm.register("email")}
                          placeholder="your@email.com"
                        />
                        {guestForm.formState.errors.email && (
                          <p className="text-sm text-red-600">{guestForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="guestPhone">{tShop('checkout.customerPhone')} *</Label>
                        <Input
                          id="guestPhone"
                          type="tel"
                          {...guestForm.register("phone")}
                          placeholder="+972-XX-XXX-XXXX"
                        />
                        {guestForm.formState.errors.phone && (
                          <p className="text-sm text-red-600">{guestForm.formState.errors.phone.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="guestAddress">{tShop('checkout.deliveryAddress')} *</Label>
                        <Input
                          id="guestAddress"
                          {...guestForm.register("address")}
                          placeholder={tShop('checkout.deliveryAddressPlaceholder')}
                        />
                        {guestForm.formState.errors.address && (
                          <p className="text-sm text-red-600">{guestForm.formState.errors.address.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guestDeliveryDate">{tShop('checkout.deliveryDate')} *</Label>
                          <Popover open={guestDatePickerOpen} onOpenChange={setGuestDatePickerOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !selectedGuestDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedGuestDate ? format(selectedGuestDate, "dd MMMM yyyy", { locale: dateLocale }) : tShop('checkout.selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={selectedGuestDate}
                                locale={dateLocale}
                                onSelect={(date) => {
                                  setSelectedGuestDate(date);
                                  setSelectedGuestTime(""); // Reset time selection when date changes
                                  setGuestDatePickerOpen(false); // Close calendar after selection
                                }}
                                disabled={isDateDisabled}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {storeSettings?.deliveryTimeMode !== 'disabled' && (
                          <div>
                            <Label htmlFor="guestDeliveryTime">{tShop('checkout.deliveryTime')} *</Label>
                            <Select value={selectedGuestTime} onValueChange={setSelectedGuestTime} disabled={!selectedGuestDate} required>
                              <SelectTrigger>
                                <SelectValue placeholder={tShop('checkout.selectTime')} />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedGuestDate && generateDeliveryTimes(
                                  storeSettings?.workingHours,
                                  format(selectedGuestDate, "yyyy-MM-dd"),
                                  storeSettings?.weekStartDay,
                                  storeSettings?.deliveryTimeMode || 'hours',
                                  tCommon,
                                  storeSettings?.deliveryHours
                                ).map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="guestPaymentMethod">{tShop('checkout.paymentMethod')} *</Label>
                        <Select 
                          value={selectedGuestPaymentMethod} 
                          onValueChange={setSelectedGuestPaymentMethod} 
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={tShop('checkout.selectPaymentMethod')} />
                          </SelectTrigger>
                          <SelectContent>
                            {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                              storeSettings.paymentMethods.map((method: any) => (
                                <SelectItem key={method.id} value={method.name}>
                                  {getPaymentMethodName(method)}
                                </SelectItem>
                              )) : (
                                <>
                                  <SelectItem value="cash">{tShop('checkout.cashOnDelivery')}</SelectItem>
                                  <SelectItem value="card">{tShop('checkout.cardOnDelivery')}</SelectItem>
                                  <SelectItem value="transfer">{tShop('checkout.bankTransfer')}</SelectItem>
                                </>
                              )
                            }
                            {isOnlinePaymentAvailable && (
                              <SelectItem value="__online__">{tShop('checkout.paymentOption')}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 text-lg shadow-lg"
                        disabled={createGuestOrderMutation.isPending || hypPaymentMutation.isPending}
                      >
                        {(createGuestOrderMutation.isPending || hypPaymentMutation.isPending)
                          ? (isOnlinePayment(selectedGuestPaymentMethod) ? tShop('checkout.processingPayment') : tShop('checkout.processing'))
                          : (isOnlinePayment(selectedGuestPaymentMethod) ? tShop('checkout.payOnline') : tShop('checkout.placeOrderAsGuest'))
                        }
                      </Button>
                      {isOnlinePayment(selectedGuestPaymentMethod) && <PaymentBadges provider={activePaymentProvider} />}
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}