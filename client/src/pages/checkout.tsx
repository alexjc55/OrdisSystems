import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

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
import { useLocation } from "wouter";
import { ShoppingCart, User, UserCheck, UserPlus, AlertTriangle, CheckCircle, ArrowLeft, Clock, Calendar as CalendarIcon, Info } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { useSEO, generateKeywords } from "@/hooks/useSEO";
import { getPaymentMethodName as getLocalizedPaymentMethodName } from "@shared/multilingual-helpers";
import { format } from "date-fns";
import { ru, enUS, he } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  // If no free delivery threshold is set, always charge delivery fee
  if (!freeDeliveryFrom || freeDeliveryFrom <= 0) {
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
type RegistrationData = GuestOrderData & {
  password: string;
  confirmPassword: string;
};
type AuthData = {
  email: string;
  password: string;
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

const generateDeliveryTimes = (workingHours: any, selectedDate: string, weekStartDay: string = 'monday') => {
  if (!workingHours || !selectedDate) return [];
  
  const date = new Date(selectedDate + 'T00:00:00');
  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = selectedDate === today;
  const currentHour = new Date().getHours();
  
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
      label: 'Closed' // Will be translated in component
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
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderType, setOrderType] = useState<"guest" | "register" | "login">("register");
  const { storeSettings } = useStoreSettings();
  const { currentLanguage } = useLanguage();
  const dateLocale = getDateLocale(currentLanguage);

  // SEO for checkout page
  const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
  const title = `Оформление заказа - ${storeName || 'eDAHouse'}`;
  const description = `Оформите заказ готовой еды с доставкой в ${storeName || 'eDAHouse'}`;
  
  useSEO({
    title,
    description,
    keywords: generateKeywords(title, description),
    ogTitle: title,
    ogDescription: description,
    canonical: currentLanguage === 'ru' ? '/checkout' : `/${currentLanguage}/checkout`
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
        message: "В вашем заказе есть товары доступные для заказа на другой день. Необходимо обязательно указать желаемый день и время доставки."
      };
    }
    
    const today = format(new Date(), "yyyy-MM-dd");
    const futureProducts = getFutureOrderProducts();
    
    if (deliveryDate === today) {
      return {
        valid: false,
        message: `Товары для будущих заказов: ${futureProducts.map(item => getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru')).join(', ')}`
      };
    }
    
    return { valid: true };
  };

  const isTodayAvailableForDelivery = () => {
    if (!storeSettings?.workingHours) return false;
    
    const today = format(new Date(), "yyyy-MM-dd");
    const todayTimeSlots = generateDeliveryTimes(storeSettings.workingHours, today, storeSettings.weekStartDay);
    
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


  const { t: tCommon } = useCommonTranslation();
  const { t: tShop } = useShopTranslation();
  
  // Create schemas inside component with access to translation functions
  const guestOrderSchema = z.object({
    firstName: z.string().min(2, tCommon('validation.firstNameMinLength')),
    lastName: z.string().min(2, tCommon('validation.lastNameMinLength')),
    email: z.string().email(tCommon('validation.emailInvalid')),
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
    email: z.string().email(tCommon('validation.emailInvalid')),
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

  const createGuestOrderMutation = useMutation({
    mutationFn: async (data: GuestOrderData) => {
      const deliveryDate = selectedGuestDate ? format(selectedGuestDate, "yyyy-MM-dd") : "";
      
      // Enhanced validation for future-order products
      const validation = validateDeliveryDateForFutureOrders(deliveryDate);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const subtotal = getTotalPrice();
      const deliveryFeeAmount = calculateDeliveryFee(
        subtotal, 
        parseFloat(storeSettings?.deliveryFee || "15.00"), 
        parseFloat(storeSettings?.freeDeliveryFrom || "50.00")
      );
      const total = subtotal + deliveryFeeAmount;

      const orderData = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: total.toString(),
        deliveryFee: deliveryFeeAmount.toString(),
        guestInfo: {
          ...data,
          deliveryDate,
          deliveryTime: formatDeliveryTimeRange(selectedGuestTime),
          paymentMethod: selectedGuestPaymentMethod,
        },
        status: "pending"
      };
      
      const res = await apiRequest("POST", "/api/orders/guest", orderData);
      return await res.json();
    },
    onSuccess: (order) => {
      clearCart();
      toast({
        title: "Заказ оформлен!",
        description: `Заказ №${order.id} принят в обработку. Мы свяжемся с вами для подтверждения.`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка при оформлении заказа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerAndOrderMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      // First register the user
      const registerRes = await apiRequest("POST", "/api/register", {
        username: data.email, // Use email as username for checkout registration
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      
      if (!registerRes.ok) {
        throw new Error(tCommon('auth.registerError'));
      }

      // Get the created user data
      const newUser = await registerRes.json();

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

      // Then create the order with user ID
      const subtotal = getTotalPrice();
      const deliveryFeeAmount = calculateDeliveryFee(
        subtotal, 
        parseFloat(storeSettings?.deliveryFee || "15.00"), 
        parseFloat(storeSettings?.freeDeliveryFrom || "50.00")
      );
      const total = subtotal + deliveryFeeAmount;

      const orderData = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: total.toString(),
        deliveryFee: deliveryFeeAmount.toString(),
        userId: newUser.id, // Link order to the newly created user
        deliveryAddress: data.address,
        deliveryDate: selectedRegisterDate ? format(selectedRegisterDate, "yyyy-MM-dd") : "",
        deliveryTime: formatDeliveryTimeRange(selectedRegisterTime),
        paymentMethod: selectedRegisterPaymentMethod,
        customerPhone: data.phone,
        status: "pending"
      };
      
      const orderRes = await apiRequest("POST", "/api/orders", orderData);
      return await orderRes.json();
    },
    onSuccess: (order) => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: tShop('checkout.registrationAndOrderCompleted'),
        description: `Заказ №${order.id} принят в обработку`,
      });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: AuthData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
        subtotal, 
        parseFloat(storeSettings?.deliveryFee || "15.00"), 
        parseFloat(storeSettings?.freeDeliveryFrom || "50.00")
      );
      const total = subtotal + deliveryFeeAmount;

      const orderData = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: total.toString(),
        deliveryFee: deliveryFeeAmount.toString(),
        deliveryAddress: formData.address,
        customerPhone: formData.phone,
        deliveryDate,
        deliveryTime: formatDeliveryTimeRange(selectedTime),
        paymentMethod: formData.paymentMethod,
        status: "pending"
      };
      
      const res = await apiRequest("POST", "/api/orders", orderData);
      return await res.json();
    },
    onSuccess: (order) => {
      clearCart();
      toast({
        title: tShop('checkout.orderPlaced'),
        description: `Заказ №${order.id} принят в обработку`,
      });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      toast({
        title: tShop('checkout.orderError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{tCommon('cart.empty')}</h2>
            <p className="text-gray-600 mb-4">{tCommon('cart.emptyDescription')}</p>
            <Button onClick={() => setLocation("/")}>
              {tCommon('navigation.goShopping')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon('navigation.backToShopping')}
        </Button>
      </div>

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
              <Separator />
              {(() => {
                const subtotal = getTotalPrice();
                const freeDeliveryThreshold = storeSettings?.freeDeliveryFrom ? parseFloat(storeSettings.freeDeliveryFrom) : null;
                const deliveryFeeAmount = calculateDeliveryFee(
                  subtotal, 
                  parseFloat(storeSettings?.deliveryFee || "15.00"), 
                  freeDeliveryThreshold
                );
                const total = subtotal + deliveryFeeAmount;

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{tShop('cart.items')}:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
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
                  const deliveryTime = formatDeliveryTimeRange(selectedTime || "");
                  const paymentMethod = selectedPaymentMethod;
                  createAuthenticatedOrderMutation.mutate({ address, phone, deliveryDate, deliveryTime, paymentMethod });
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
                                {String(addr?.label ? `${addr.label}: ${addr.address || ''}` : (addr?.address || ''))}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deliveryDate">{tShop('checkout.deliveryDate')} *</Label>
                        <Input
                          type="date"
                          id="deliveryDate"
                          value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSelectedDate(new Date(e.target.value));
                              setSelectedTime(""); // Reset time selection when date changes
                            } else {
                              setSelectedDate(undefined);
                            }
                          }}
                          min={format(new Date(), "yyyy-MM-dd")}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label htmlFor="deliveryTime">{tShop('checkout.deliveryTime')} *</Label>
                        <div className="relative">
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            disabled={!selectedDate}
                            required
                            className="w-full h-10 bg-white border border-gray-200 rounded-md px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">{tShop('checkout.selectTime')}</option>
                            {selectedDate && generateDeliveryTimes(
                              storeSettings?.workingHours,
                              format(selectedDate, "yyyy-MM-dd"),
                              storeSettings?.weekStartDay
                            ).map((time) => (
                              <option key={time.value} value={time.value}>
                                {time.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="paymentMethod">{tShop('checkout.paymentMethod')} *</Label>
                      <div className="relative">
                        <select
                          value={selectedPaymentMethod}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                          required
                          className="w-full h-10 bg-white border border-gray-200 rounded-md px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="">{tShop('checkout.selectPaymentMethod')}</option>
                          {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                            storeSettings.paymentMethods.map((method: any) => (
                              <option key={method.id} value={method.name}>
                                {getPaymentMethodName(method)}
                              </option>
                            )) : (
                              <>
                                <option value="cash">{tShop('checkout.cashOnDelivery')}</option>
                                <option value="card">{tShop('checkout.cardOnDelivery')}</option>
                                <option value="transfer">{tShop('checkout.bankTransfer')}</option>
                              </>
                            )
                          }
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 text-lg shadow-lg"
                      disabled={createAuthenticatedOrderMutation.isPending}
                    >
                      {createAuthenticatedOrderMutation.isPending ? tShop('checkout.processing') : tShop('checkout.placeOrder')}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Guest/Registration/Login Options */
              <Tabs value={orderType} onValueChange={(value) => setOrderType(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
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
                </TabsList>

                <TabsContent value="register" className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {tShop('checkout.registrationBenefit')}
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={registerForm.handleSubmit((data) => registerAndOrderMutation.mutate(data))}>
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
                          <Input
                            type="date"
                            id="registerDeliveryDate"
                            value={selectedRegisterDate ? format(selectedRegisterDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedRegisterDate(new Date(e.target.value));
                                setSelectedRegisterTime(""); // Reset time selection when date changes
                              } else {
                                setSelectedRegisterDate(undefined);
                              }
                            }}
                            min={format(new Date(), "yyyy-MM-dd")}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <Label htmlFor="registerDeliveryTime">{tShop('checkout.deliveryTime')} *</Label>
                          <div className="relative">
                            <select
                              value={selectedRegisterTime}
                              onChange={(e) => setSelectedRegisterTime(e.target.value)}
                              disabled={!selectedRegisterDate}
                              required
                              className="w-full h-10 bg-white border border-gray-200 rounded-md px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">{tShop('checkout.selectTime')}</option>
                              {selectedRegisterDate && generateDeliveryTimes(
                                storeSettings?.workingHours,
                                format(selectedRegisterDate, "yyyy-MM-dd"),
                                storeSettings?.weekStartDay
                              ).map((time) => (
                                <option key={time.value} value={time.value}>
                                  {time.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="registerPaymentMethod">{tShop('checkout.paymentMethod')} *</Label>
                        <div className="relative">
                          <select
                            value={selectedRegisterPaymentMethod}
                            onChange={(e) => setSelectedRegisterPaymentMethod(e.target.value)}
                            required
                            className="w-full h-10 bg-white border border-gray-200 rounded-md px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">{tShop('checkout.selectPaymentMethod')}</option>
                            {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                              storeSettings.paymentMethods.map((method: any) => (
                                <option key={method.id} value={method.name}>
                                  {getPaymentMethodName(method)}
                                </option>
                              )) : (
                                <>
                                  <option value="cash">{tShop('checkout.cashOnDelivery')}</option>
                                  <option value="card">{tShop('checkout.cardOnDelivery')}</option>
                                  <option value="transfer">{tShop('checkout.bankTransfer')}</option>
                                </>
                              )
                            }
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 text-lg shadow-lg"
                        disabled={registerAndOrderMutation.isPending}
                      >
                        {registerAndOrderMutation.isPending ? tShop('checkout.registeringAndProcessing') : tShop('checkout.registerAndPlaceOrder')}
                      </Button>
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
                        <Label htmlFor="loginEmail">{tCommon('email')}</Label>
                        <Input
                          id="loginEmail"
                          type="email"
                          {...loginForm.register("email")}
                          placeholder="your@email.com"
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
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {tShop('checkout.guestWarning')}
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={guestForm.handleSubmit((data) => createGuestOrderMutation.mutate(data))}>
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
                          <Input
                            type="date"
                            id="guestDeliveryDate"
                            value={selectedGuestDate ? format(selectedGuestDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedGuestDate(new Date(e.target.value));
                                setSelectedGuestTime(""); // Reset time selection when date changes
                              } else {
                                setSelectedGuestDate(undefined);
                              }
                            }}
                            min={format(new Date(), "yyyy-MM-dd")}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <Label htmlFor="guestDeliveryTime">{tShop('checkout.deliveryTime')} *</Label>
                          <div className="relative">
                            <select
                              value={selectedGuestTime}
                              onChange={(e) => setSelectedGuestTime(e.target.value)}
                              disabled={!selectedGuestDate}
                              required
                              className="w-full h-10 bg-white border border-gray-200 rounded-md px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">{tShop('checkout.selectTime')}</option>
                              {selectedGuestDate && generateDeliveryTimes(
                                storeSettings?.workingHours,
                                format(selectedGuestDate, "yyyy-MM-dd"),
                                storeSettings?.weekStartDay
                              ).map((time) => (
                                <option key={time.value} value={time.value}>
                                  {time.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="guestPaymentMethod">{tShop('checkout.paymentMethod')} *</Label>
                        <div className="relative">
                          <select
                            value={selectedGuestPaymentMethod}
                            onChange={(e) => setSelectedGuestPaymentMethod(e.target.value)}
                            required
                            className="w-full h-10 bg-white border border-gray-200 rounded-md px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">{tShop('checkout.selectPaymentMethod')}</option>
                            {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                              storeSettings.paymentMethods.map((method: any) => (
                                <option key={method.id} value={method.name}>
                                  {getPaymentMethodName(method)}
                                </option>
                              )) : (
                                <>
                                  <option value="cash">{tShop('checkout.cashOnDelivery')}</option>
                                  <option value="card">{tShop('checkout.cardOnDelivery')}</option>
                                  <option value="transfer">{tShop('checkout.bankTransfer')}</option>
                                </>
                              )
                            }
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 text-lg shadow-lg"
                        disabled={createGuestOrderMutation.isPending}
                      >
                        {createGuestOrderMutation.isPending ? tShop('checkout.processing') : tShop('checkout.placeOrderAsGuest')}
                      </Button>
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