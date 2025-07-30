import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, MapPin, Calendar, Clock, ShoppingCart, Scan, Trash2, UserPlus, CreditCard, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { getPaymentMethodName as getLocalizedPaymentMethodName } from "@shared/multilingual-helpers";
import { BarcodeScanner } from "./barcode-scanner";
import { calculateDeliveryFeeFromSettings } from "@/lib/delivery-utils";
import { format } from 'date-fns';
import { ru, enUS, he } from 'date-fns/locale';
import type { UserAddress } from "@shared/schema";

// Types for the order creation flow
type ClientType = 'existing' | 'new' | 'guest';

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  weight?: number; // For barcode scanned items
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

interface CreateOrderData {
  clientType: ClientType;
  clientId?: number;
  newClientData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  guestData?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryNotes?: string;
  paymentMethod: string;
  items: OrderItem[];
  discountType?: 'percent' | 'fixed';
  discountAmount?: number;
  discountReason?: string;
}

// Schema for order creation
const createOrderSchema = z.object({
  clientType: z.enum(['existing', 'new', 'guest']),
  clientId: z.number().optional(),
  newClientData: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }).optional(),
  guestData: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(1),
  }).optional(),
  deliveryAddress: z.string().min(1),
  deliveryDate: z.string().min(1),
  deliveryTime: z.string().min(1),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.string().min(1),
  items: z.array(z.object({
    productId: z.number(),
    productName: z.string(),
    quantity: z.number().min(1),
    weight: z.number().optional(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    unit: z.string(),
  })).min(1),
  discountType: z.enum(['percent', 'fixed']).optional(),
  discountAmount: z.number().optional(),
  discountReason: z.string().optional(),
});

interface CreateOrderDialogProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

// Utility function to generate delivery dates (same as checkout)
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

// Date and locale helper functions from checkout
const getDateLocale = (language: string) => {
  switch (language) {
    case 'en': return enUS;
    case 'he': return he;
    case 'ru':
    default: return ru;
  }
};

// Generate delivery times based on working hours like in checkout
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

export default function CreateOrderDialog({ trigger, isOpen, onClose, onSuccess }: CreateOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Client, 2: Delivery, 3: Products, 4: Pricing
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState<{ type: 'percent' | 'fixed'; amount: number; reason: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  
  const { t } = useTranslation();
  const adminT = (key: string) => t(`admin:${key}`);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { storeSettings } = useStoreSettings();
  const { currentLanguage } = useLanguage();
  const dateLocale = getDateLocale(currentLanguage);

  const form = useForm<CreateOrderData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      clientType: 'existing',
      deliveryAddress: '',
      deliveryDate: '',
      deliveryTime: '',
      deliveryNotes: '',
      paymentMethod: 'cash',
      items: [],
    },
  });

  // Use external isOpen prop if provided, otherwise use internal state
  const dialogOpen = isOpen !== undefined ? isOpen : open;

  // Fetch clients for selection
  const { data: clients, error: clientsError, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users?limit=100');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
    enabled: dialogOpen, // Only fetch when dialog is open
  });

  // Fetch products for selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: dialogOpen,
  });

  // Get payment method name helper
  const getPaymentMethodName = (method: any) => {
    return getLocalizedPaymentMethodName(method, currentLanguage as SupportedLanguage);
  };

  // Fetch user addresses for selected client
  const { data: userAddresses = [] } = useQuery<UserAddress[]>({
    queryKey: ["/api/addresses", form.watch('clientId')],
    queryFn: async () => {
      const clientId = form.watch('clientId');
      if (!clientId) return [];
      const response = await fetch(`/api/admin/users/${clientId}/addresses`);
      if (!response.ok) throw new Error('Failed to fetch addresses');
      return response.json();
    },
    enabled: !!form.watch('clientId') && form.watch('clientType') === 'existing',
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: adminT('orders.createOrder'),
        description: adminT('orders.notifications.statusUpdated'),
      });
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: adminT('actions.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset();
    setStep(1);
    setItems([]);
    setDiscount(null);
    setClientSearch('');
    setProductSearch('');
  };

  // Filter clients based on search - only show customer role users
  const filteredClients = useMemo(() => {
    if (clientsLoading || !clients?.data) {
      return [];
    }
    
    // Filter only customer role users
    const customerUsers = clients.data.filter((user: any) => 
      user.role === 'customer'
    );
    
    if (!clientSearch) {
      return customerUsers;
    }
    
    const searchTerm = clientSearch.toLowerCase();
    return customerUsers.filter((client: any) => {
      return (
        `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase().includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm) ||
        client.username?.toLowerCase().includes(searchTerm) ||
        client.phone?.includes(clientSearch)
      );
    });
  }, [clients, clientSearch, clientsLoading]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product: any) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      product.isAvailable &&
      !items.some(item => item.productId === product.id)
    );
  }, [products, productSearch, items]);

  // Calculate order totals
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = discount 
    ? (discount.type === 'percent' ? subtotal * (discount.amount / 100) : discount.amount)
    : 0;
  const deliveryFee = storeSettings 
    ? calculateDeliveryFeeFromSettings(subtotal - discountAmount, storeSettings)
    : 0;
  const total = subtotal - discountAmount + deliveryFee;

  // Generate delivery dates and times based on store settings
  const deliveryDates = useMemo(() => {
    const minDeliveryHours = storeSettings?.minDeliveryTimeHours || 2;
    const maxDeliveryDays = storeSettings?.maxDeliveryTimeDays || 7;
    return generateDeliveryDates(minDeliveryHours, maxDeliveryDays);
  }, [storeSettings]);

  const deliveryTimes = useMemo(() => {
    const selectedDateValue = form.watch('deliveryDate');
    if (!selectedDateValue || !storeSettings?.workingHours) return [];
    
    return generateDeliveryTimes(
      storeSettings.workingHours,
      selectedDateValue,
      storeSettings.weekStartDay
    );
  }, [form.watch('deliveryDate'), storeSettings]);

  const addProduct = (product: any) => {
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: parseFloat(product.price),
      totalPrice: parseFloat(product.price),
      unit: product.unit || 'шт',
    };
    setItems([...items, newItem]);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const updatedItems = [...items];
    updatedItems[index].quantity = quantity;
    updatedItems[index].totalPrice = updatedItems[index].unitPrice * quantity;
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const formData = form.getValues();
    const orderData: CreateOrderData = {
      ...formData,
      items,
      discountType: discount?.type,
      discountAmount: discount?.amount,
      discountReason: discount?.reason,
    };
    createOrderMutation.mutate(orderData);
  };


  const handleOpenChange = (newOpen: boolean) => {
    if (isOpen !== undefined && onClose) {
      if (!newOpen) onClose();
    } else {
      setOpen(newOpen);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            {adminT('orders.createOrder')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{adminT('orders.createOrderTitle')}</DialogTitle>
          <DialogDescription>
            {adminT('orders.createOrderDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              {[1, 2, 3, 4].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step >= stepNum ? 'btn-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepNum}
                </div>
              ))}
            </div>

            {/* Step 1: Client Selection */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {adminT('orders.clientSelection.title')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('orders.clientSelection.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="existing">
                                {adminT('orders.clientSelection.existingClient')}
                              </SelectItem>
                              <SelectItem value="new">
                                {adminT('orders.clientSelection.newClient')}
                              </SelectItem>
                              <SelectItem value="guest">
                                {adminT('orders.clientSelection.guestOrder')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('clientType') === 'existing' && (
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => {
                        const selectedClient = filteredClients?.find(client => client.id === field.value);
                        
                        return (
                          <FormItem className="flex flex-col">
                            <FormControl>
                              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {selectedClient ? (
                                      <div className="flex flex-col items-start">
                                        <span className="font-medium">
                                          {selectedClient.firstName} {selectedClient.lastName}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                          {selectedClient.email}
                                        </span>
                                      </div>
                                    ) : (
                                      adminT('orders.clientSelection.selectClient')
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                  <Command shouldFilter={false}>
                                    <CommandInput
                                      placeholder={adminT('orders.clientSelection.searchClient')}
                                      value={clientSearch}
                                      onValueChange={setClientSearch}
                                    />
                                    <CommandEmpty>
                                      {clientSearch ? adminT('orders.clientSelection.noResults') : adminT('orders.clientSelection.noClients')}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandList>
                                        {(filteredClients || []).map((client: any) => {
                                          const searchText = `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
                                          
                                          return (
                                            <CommandItem
                                              key={client.id}
                                              value={client.id.toString()}
                                              onSelect={() => {
                                                field.onChange(client.id);
                                                setClientSearch('');
                                                setComboboxOpen(false);
                                              }}
                                              className="cursor-pointer"
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4 shrink-0",
                                                  field.value === client.id ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-medium">
                                                  {client.firstName} {client.lastName}
                                                </span>
                                                <span className="text-sm opacity-60">
                                                  {client.email}
                                                </span>
                                                {client.phone && (
                                                  <span className="text-xs opacity-50">
                                                    {client.phone}
                                                  </span>
                                                )}
                                              </div>
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandList>
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}

                  {form.watch('clientType') === 'new' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="newClientData.firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('orders.clientSelection.firstName')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newClientData.lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('orders.clientSelection.lastName')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newClientData.email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('orders.clientSelection.email')}</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="newClientData.phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('orders.clientSelection.phone')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {form.watch('clientType') === 'guest' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="guestData.firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('orders.clientSelection.firstName')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guestData.lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('orders.clientSelection.lastName')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guestData.phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('orders.clientSelection.phone')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Delivery Information */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {adminT('orders.deliveryInfo.title')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('orders.deliveryInfo.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Saved addresses for existing clients */}
                  {form.watch('clientType') === 'existing' && userAddresses.length > 0 && (
                    <div className="space-y-3">
                      <Label>{adminT('orders.deliveryInfo.savedAddresses')}</Label>
                      <div className="grid gap-2">
                        {userAddresses.map((address) => (
                          <Button
                            key={address.id}
                            type="button"
                            variant={selectedAddressId === address.id ? "default" : "outline"}
                            className="h-auto p-3 text-left justify-start"
                            onClick={() => {
                              setSelectedAddressId(address.id);
                              form.setValue('deliveryAddress', 
                                `${address.street}, ${address.building}${address.apartment ? `, кв. ${address.apartment}` : ''}, ${address.city}`
                              );
                            }}
                          >
                            <MapPin className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {address.street}, {address.building}
                                {address.apartment && `, кв. ${address.apartment}`}
                              </span>
                              <span className="text-sm opacity-70">
                                {address.city}
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-px bg-border flex-1" />
                        <span className="text-sm text-muted-foreground px-2">
                          {adminT('orders.deliveryInfo.orNewAddress')}
                        </span>
                        <div className="h-px bg-border flex-1" />
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch('clientType') === 'existing' && userAddresses.length > 0
                            ? adminT('orders.deliveryInfo.newAddress')
                            : adminT('orders.deliveryInfo.address')
                          }
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={adminT('orders.deliveryInfo.addressPlaceholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('orders.deliveryInfo.date')}</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder={adminT('orders.deliveryInfo.selectDate')} />
                              </SelectTrigger>
                              <SelectContent>
                                {deliveryDates.map((date) => (
                                  <SelectItem key={date.value} value={date.value}>
                                    {date.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('orders.deliveryInfo.time')}</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder={adminT('orders.deliveryInfo.selectTime')} />
                              </SelectTrigger>
                              <SelectContent>
                                {deliveryTimes.map((slot) => (
                                  <SelectItem key={slot.value} value={slot.value}>
                                    {slot.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deliveryNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('orders.deliveryInfo.deliveryNotes')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('orders.paymentMethod')}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {storeSettings?.paymentMethods?.map((method: any) => (
                                <SelectItem key={method.id} value={method.id}>
                                  {getPaymentMethodName(method)}
                                </SelectItem>
                              )) || [
                                <SelectItem key="cash" value="cash">Наличные</SelectItem>,
                                <SelectItem key="card" value="card">Карта курьеру</SelectItem>,
                                <SelectItem key="transfer" value="transfer">Перевод</SelectItem>
                              ]}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Product Selection */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {adminT('orders.productSelection.title')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('orders.productSelection.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={adminT('orders.productSelection.searchProduct')}
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsScannerOpen(true)}
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {adminT('orders.productSelection.scanBarcode')}
                    </Button>
                  </div>

                  {/* Available products */}
                  {filteredProducts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {filteredProducts.slice(0, 6).map((product: any) => (
                        <Button
                          key={product.id}
                          variant="outline"
                          className="justify-start h-auto p-3"
                          onClick={() => addProduct(product)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">₪{product.price}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Selected items */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Товары в заказе ({items.length})</h4>
                    {items.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        {adminT('orders.productSelection.noItems')}
                      </p>
                    ) : (
                      items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-gray-500">
                              ₪{item.unitPrice} × {item.quantity} {item.unit}
                              {item.weight && ` (${item.weight}г)`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-16 text-center"
                            />
                            <div className="font-medium">₪{item.totalPrice.toFixed(2)}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Pricing */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    {adminT('orders.pricing.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{adminT('orders.pricing.subtotal')}</span>
                      <span>₪{subtotal.toFixed(2)}</span>
                    </div>
                    
                    {discount && (
                      <div className="flex justify-between text-green-600">
                        <span>{adminT('orders.pricing.discount')} ({discount.type === 'percent' ? `${discount.amount}%` : `₪${discount.amount}`})</span>
                        <span>-₪{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span>{adminT('orders.pricing.deliveryFee')}</span>
                      <span>{deliveryFee === 0 ? adminT('orders.pricing.freeDelivery') : `₪${deliveryFee.toFixed(2)}`}</span>
                    </div>
                    
                    <hr />
                    
                    <div className="flex justify-between font-bold text-lg">
                      <span>{adminT('orders.pricing.totalAmount')}</span>
                      <span>₪{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Discount controls */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">{adminT('orders.pricing.discount')}</h4>
                    {!discount ? (
                      <div className="grid grid-cols-3 gap-2">
                        <Select onValueChange={(type) => setDiscount({ type: type as 'percent' | 'fixed', amount: 0, reason: '' })}>
                          <SelectTrigger>
                            <SelectValue placeholder={adminT('orders.pricing.discountType')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">{adminT('orders.pricing.discountPercent')}</SelectItem>
                            <SelectItem value="fixed">{adminT('orders.pricing.discountFixed')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={discount.type === 'percent' ? 100 : subtotal}
                            value={discount.amount}
                            onChange={(e) => setDiscount({ ...discount, amount: parseFloat(e.target.value) || 0 })}
                            placeholder={adminT('orders.pricing.discountAmount')}
                          />
                          <Button variant="outline" onClick={() => setDiscount(null)}>
                            {adminT('orders.pricing.removeDiscount')}
                          </Button>
                        </div>
                        <Input
                          value={discount.reason}
                          onChange={(e) => setDiscount({ ...discount, reason: e.target.value })}
                          placeholder="Причина скидки"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                Назад
              </Button>
              
              <div className="flex gap-2">
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={
                      (step === 1 && !form.watch('clientType')) ||
                      (step === 2 && (!form.watch('deliveryAddress') || !form.watch('deliveryDate') || !form.watch('deliveryTime'))) ||
                      (step === 3 && items.length === 0)
                    }
                  >
                    Далее
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createOrderMutation.isPending || items.length === 0}
                    className="btn-primary"
                  >
                    {createOrderMutation.isPending ? adminT('actions.creating') : adminT('orders.createOrder')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Form>

        {/* Barcode Scanner */}
        <BarcodeScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          orderItems={items}
          onUpdateItem={(productId: number, newWeight: number) => {
            const itemIndex = items.findIndex(item => item.productId === productId);
            if (itemIndex >= 0) {
              const updatedItems = [...items];
              updatedItems[itemIndex].weight = newWeight;
              setItems(updatedItems);
            }
          }}
          onAddItem={(product: any, weight: number) => {
            const newItem: OrderItem = {
              productId: product.id,
              productName: product.name,
              quantity: 1,
              weight: weight,
              unitPrice: parseFloat(product.price),
              totalPrice: parseFloat(product.price),
              unit: product.unit || 'г',
            };
            setItems([...items, newItem]);
          }}
          allProducts={products || []}
        />
      </DialogContent>
    </Dialog>
  );
}