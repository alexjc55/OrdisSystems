import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { ShoppingCart, User, UserCheck, UserPlus, AlertTriangle, CheckCircle, ArrowLeft, Clock, Calendar as CalendarIcon } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

const guestOrderSchema = z.object({
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  address: z.string().min(10, "Введите полный адрес доставки"),
});

const registrationSchema = guestOrderSchema.extend({
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

const authSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

const authenticatedOrderSchema = z.object({
  address: z.string().min(10, "Введите полный адрес доставки"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  deliveryDate: z.string().min(1, "Выберите дату доставки"),
  deliveryTime: z.string().min(1, "Выберите время доставки"),
  paymentMethod: z.string().min(1, "Выберите способ оплаты"),
});

type GuestOrderData = z.infer<typeof guestOrderSchema>;
type RegistrationData = z.infer<typeof registrationSchema>;
type AuthData = z.infer<typeof authSchema>;
type AuthenticatedOrderData = z.infer<typeof authenticatedOrderSchema>;

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

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderType, setOrderType] = useState<"guest" | "register" | "login">("register");
  const { storeSettings } = useStoreSettings();
  

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedGuestDate, setSelectedGuestDate] = useState<Date | undefined>(undefined);
  const [selectedRegisterDate, setSelectedRegisterDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedGuestTime, setSelectedGuestTime] = useState("");
  const [selectedRegisterTime, setSelectedRegisterTime] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedGuestPaymentMethod, setSelectedGuestPaymentMethod] = useState("");
  const [selectedRegisterPaymentMethod, setSelectedRegisterPaymentMethod] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [guestDatePickerOpen, setGuestDatePickerOpen] = useState(false);
  const [registerDatePickerOpen, setRegisterDatePickerOpen] = useState(false);

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
      const orderData = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: getTotalPrice().toString(),
        guestInfo: {
          ...data,
          deliveryDate: selectedGuestDate ? format(selectedGuestDate, "yyyy-MM-dd") : "",
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
        throw new Error("Ошибка регистрации");
      }

      // Get the created user data
      const newUser = await registerRes.json();

      // Save the delivery address for the new user
      if (data.address && data.address.trim()) {
        try {
          await apiRequest("POST", "/api/addresses", {
            label: "Дом",
            address: data.address.trim()
          });
        } catch (error) {
          console.warn("Failed to save address:", error);
        }
      }

      // Then create the order with user ID
      const orderData = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: getTotalPrice().toString(),
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
        title: "Регистрация завершена и заказ оформлен!",
        description: `Заказ №${order.id} принят. Теперь вы можете отслеживать статус в личном кабинете.`,
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
        title: "Вход выполнен",
        description: "Теперь вы можете оформить заказ",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка входа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAuthenticatedOrderMutation = useMutation({
    mutationFn: async (formData: AuthenticatedOrderData) => {
      const orderData = {
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          pricePerKg: item.product.price,
          totalPrice: item.totalPrice.toString()
        })),
        totalAmount: getTotalPrice().toString(),
        deliveryAddress: formData.address,
        customerPhone: formData.phone,
        deliveryDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
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
        title: "Заказ оформлен!",
        description: `Заказ №${order.id} принят в обработку.`,
      });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка при оформлении заказа",
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
            <h2 className="text-xl font-semibold mb-2">Корзина пуста</h2>
            <p className="text-gray-600 mb-4">Добавьте товары для оформления заказа</p>
            <Button onClick={() => setLocation("/")}>
              Перейти к покупкам
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
          Вернуться к покупкам
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Ваш заказ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{item.product.name}</h4>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x {formatCurrency(item.product.price)}
                    </p>
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Итого:</span>
                <span>{formatCurrency(getTotalPrice())}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Form */}
        <Card>
          <CardHeader>
            <CardTitle>Оформление заказа</CardTitle>
          </CardHeader>
          <CardContent>
            {isAuthenticated ? (
              /* Authenticated User Checkout */
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Добро пожаловать, {user?.firstName}! Вы можете отслеживать статус заказа в личном кабинете.
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
                      <Label htmlFor="phone">Номер телефона *</Label>
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
                      <Label htmlFor="address">Адрес доставки *</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="Введите адрес доставки"
                        required
                      />
                      
                      {addresses && Array.isArray(addresses) && (addresses as any[]).length > 0 && (
                        <div className="mt-2">
                          <Label className="text-sm text-gray-600">Или выберите из сохраненных адресов:</Label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {(addresses as any[]).map((addr: any) => (
                              <Button
                                key={addr.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const input = document.getElementById("address") as HTMLInputElement;
                                  if (input) input.value = addr.address;
                                }}
                              >
                                {addr.label ? `${addr.label}: ${addr.address}` : addr.address}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deliveryDate">Дата доставки *</Label>
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
                              {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date);
                                setSelectedTime(""); // Reset time selection when date changes
                                setDatePickerOpen(false); // Close calendar after selection
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                
                                // Check if date is before today
                                if (date < today) return true;
                                
                                // Check if it's a non-working day
                                if (storeSettings?.workingHours) {
                                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                  const dayName = dayNames[date.getDay()];
                                  const daySchedule = storeSettings.workingHours[dayName];
                                  
                                  // Disable if no schedule or closed or weekend
                                  if (!daySchedule || daySchedule.trim() === '' || 
                                      daySchedule.toLowerCase().includes('закрыто') || 
                                      daySchedule.toLowerCase().includes('closed') ||
                                      daySchedule.toLowerCase().includes('выходной')) {
                                    return true;
                                  }
                                }
                                
                                return false;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label htmlFor="deliveryTime">Время доставки *</Label>
                        <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите время" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedDate && generateDeliveryTimes(
                              storeSettings?.workingHours,
                              format(selectedDate, "yyyy-MM-dd"),
                              storeSettings?.weekStartDay
                            ).map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="paymentMethod">Способ оплаты *</Label>
                      <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите способ оплаты" />
                        </SelectTrigger>
                        <SelectContent>
                          {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                            storeSettings.paymentMethods.map((method: any) => (
                              <SelectItem key={method.id} value={method.name}>
                                {method.name}
                              </SelectItem>
                            )) : (
                              <>
                                <SelectItem value="cash">Наличными при получении</SelectItem>
                                <SelectItem value="card">Банковской картой</SelectItem>
                                <SelectItem value="transfer">Банковский перевод</SelectItem>
                              </>
                            )
                          }
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 text-lg shadow-lg"
                      disabled={createAuthenticatedOrderMutation.isPending}
                    >
                      {createAuthenticatedOrderMutation.isPending ? "Оформляем..." : "Оформить заказ"}
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
                    Регистрация
                  </TabsTrigger>
                  <TabsTrigger value="login" className="flex items-center gap-1">
                    <UserCheck className="h-4 w-4" />
                    Вход
                  </TabsTrigger>
                  <TabsTrigger value="guest" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Гость
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="register" className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Зарегистрируйтесь, чтобы отслеживать статус заказа и сохранять адреса доставки.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={registerForm.handleSubmit((data) => registerAndOrderMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Имя</Label>
                          <Input
                            id="firstName"
                            {...registerForm.register("firstName")}
                            placeholder="Введите имя"
                          />
                          {registerForm.formState.errors.firstName && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.firstName.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="lastName">Фамилия</Label>
                          <Input
                            id="lastName"
                            {...registerForm.register("lastName")}
                            placeholder="Введите фамилию"
                          />
                          {registerForm.formState.errors.lastName && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
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
                        <Label htmlFor="phone">Номер телефона *</Label>
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
                        <Label htmlFor="address">Адрес доставки *</Label>
                        <Input
                          id="address"
                          {...registerForm.register("address")}
                          placeholder="Введите полный адрес"
                        />
                        {registerForm.formState.errors.address && (
                          <p className="text-sm text-red-600">{registerForm.formState.errors.address.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="password">Пароль</Label>
                          <Input
                            id="password"
                            type="password"
                            {...registerForm.register("password")}
                            placeholder="Минимум 6 символов"
                          />
                          {registerForm.formState.errors.password && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            {...registerForm.register("confirmPassword")}
                            placeholder="Повторите пароль"
                          />
                          {registerForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.confirmPassword.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="registerDeliveryDate">Дата доставки *</Label>
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
                                {selectedRegisterDate ? format(selectedRegisterDate, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={selectedRegisterDate}
                                onSelect={(date) => {
                                  setSelectedRegisterDate(date);
                                  setSelectedRegisterTime(""); // Reset time selection when date changes
                                  setRegisterDatePickerOpen(false); // Close calendar after selection
                                }}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  
                                  // Check if date is before today
                                  if (date < today) return true;
                                  
                                  // Check if it's a non-working day
                                  if (storeSettings?.workingHours) {
                                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                    const dayName = dayNames[date.getDay()];
                                    const daySchedule = storeSettings.workingHours[dayName];
                                    
                                    // Disable if no schedule or closed or weekend
                                    if (!daySchedule || daySchedule.trim() === '' || 
                                        daySchedule.toLowerCase().includes('закрыто') || 
                                        daySchedule.toLowerCase().includes('closed') ||
                                        daySchedule.toLowerCase().includes('выходной')) {
                                      return true;
                                    }
                                  }
                                  
                                  return false;
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label htmlFor="registerDeliveryTime">Время доставки *</Label>
                          <Select value={selectedRegisterTime} onValueChange={setSelectedRegisterTime} disabled={!selectedRegisterDate} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите время" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedRegisterDate && generateDeliveryTimes(
                                storeSettings?.workingHours,
                                format(selectedRegisterDate, "yyyy-MM-dd"),
                                storeSettings?.weekStartDay
                              ).map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="registerPaymentMethod">Способ оплаты *</Label>
                        <Select 
                          value={selectedRegisterPaymentMethod} 
                          onValueChange={setSelectedRegisterPaymentMethod} 
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите способ оплаты" />
                          </SelectTrigger>
                          <SelectContent>
                            {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                              storeSettings.paymentMethods.map((method: any) => (
                                <SelectItem key={method.id} value={method.name}>
                                  {method.name}
                                </SelectItem>
                              )) : (
                                <>
                                  <SelectItem value="cash">Наличными при получении</SelectItem>
                                  <SelectItem value="card">Банковской картой</SelectItem>
                                  <SelectItem value="transfer">Банковский перевод</SelectItem>
                                </>
                              )
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 text-lg shadow-lg"
                        disabled={registerAndOrderMutation.isPending}
                      >
                        {registerAndOrderMutation.isPending ? "Регистрируем и оформляем..." : "Зарегистрироваться и оформить заказ"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="login" className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Войдите в аккаунт, чтобы использовать сохраненные данные и отслеживать заказы.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="loginEmail">Email</Label>
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
                        <Label htmlFor="loginPassword">Пароль</Label>
                        <Input
                          id="loginPassword"
                          type="password"
                          {...loginForm.register("password")}
                          placeholder="Введите пароль"
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
                        {loginMutation.isPending ? "Вход..." : "Войти"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="guest" className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Как гость, вы не сможете отслеживать статус заказа. Рекомендуем зарегистрироваться для полного функционала.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={guestForm.handleSubmit((data) => createGuestOrderMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guestFirstName">Имя</Label>
                          <Input
                            id="guestFirstName"
                            {...guestForm.register("firstName")}
                            placeholder="Введите имя"
                          />
                          {guestForm.formState.errors.firstName && (
                            <p className="text-sm text-red-600">{guestForm.formState.errors.firstName.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="guestLastName">Фамилия</Label>
                          <Input
                            id="guestLastName"
                            {...guestForm.register("lastName")}
                            placeholder="Введите фамилию"
                          />
                          {guestForm.formState.errors.lastName && (
                            <p className="text-sm text-red-600">{guestForm.formState.errors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="guestEmail">Email</Label>
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
                        <Label htmlFor="guestPhone">Номер телефона *</Label>
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
                        <Label htmlFor="guestAddress">Адрес доставки *</Label>
                        <Input
                          id="guestAddress"
                          {...guestForm.register("address")}
                          placeholder="Введите полный адрес"
                        />
                        {guestForm.formState.errors.address && (
                          <p className="text-sm text-red-600">{guestForm.formState.errors.address.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guestDeliveryDate">Дата доставки *</Label>
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
                                {selectedGuestDate ? format(selectedGuestDate, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={selectedGuestDate}
                                onSelect={(date) => {
                                  setSelectedGuestDate(date);
                                  setSelectedGuestTime(""); // Reset time selection when date changes
                                  setGuestDatePickerOpen(false); // Close calendar after selection
                                }}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  
                                  // Check if date is before today
                                  if (date < today) return true;
                                  
                                  // Check if it's a non-working day
                                  if (storeSettings?.workingHours) {
                                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                    const dayName = dayNames[date.getDay()];
                                    const daySchedule = storeSettings.workingHours[dayName];
                                    
                                    // Disable if no schedule or closed or weekend
                                    if (!daySchedule || daySchedule.trim() === '' || 
                                        daySchedule.toLowerCase().includes('закрыто') || 
                                        daySchedule.toLowerCase().includes('closed') ||
                                        daySchedule.toLowerCase().includes('выходной')) {
                                      return true;
                                    }
                                  }
                                  
                                  return false;
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label htmlFor="guestDeliveryTime">Время доставки *</Label>
                          <Select value={selectedGuestTime} onValueChange={setSelectedGuestTime} disabled={!selectedGuestDate} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите время" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedGuestDate && generateDeliveryTimes(
                                storeSettings?.workingHours,
                                format(selectedGuestDate, "yyyy-MM-dd"),
                                storeSettings?.weekStartDay
                              ).map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="guestPaymentMethod">Способ оплаты *</Label>
                        <Select 
                          value={selectedGuestPaymentMethod} 
                          onValueChange={setSelectedGuestPaymentMethod} 
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите способ оплаты" />
                          </SelectTrigger>
                          <SelectContent>
                            {storeSettings?.paymentMethods && Array.isArray(storeSettings.paymentMethods) ? 
                              storeSettings.paymentMethods.map((method: any) => (
                                <SelectItem key={method.id} value={method.name}>
                                  {method.name}
                                </SelectItem>
                              )) : (
                                <>
                                  <SelectItem value="cash">Наличными при получении</SelectItem>
                                  <SelectItem value="card">Банковской картой</SelectItem>
                                  <SelectItem value="transfer">Банковский перевод</SelectItem>
                                </>
                              )
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 text-lg shadow-lg"
                        disabled={createGuestOrderMutation.isPending}
                      >
                        {createGuestOrderMutation.isPending ? "Оформляем..." : "Оформить заказ как гость"}
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