import React, { useState, useMemo } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, MapPin, Calendar, Clock, ShoppingCart, Scan, Trash2, UserPlus, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BarcodeScanner } from "./barcode-scanner";
import { calculateDeliveryFeeFromSettings } from "@/lib/delivery-utils";

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

// Utility function to generate delivery time slots
const generateDeliveryTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 21; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
    slots.push({
      value: timeSlot,
      label: timeSlot
    });
  }
  return slots;
};

export default function CreateOrderDialog({ trigger, isOpen, onClose, onSuccess }: CreateOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Client, 2: Delivery, 3: Products, 4: Pricing
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState<{ type: 'percent' | 'fixed'; amount: number; reason: string } | null>(null);
  
  const { t } = useTranslation();
  const adminT = (key: string) => t(`admin:${key}`);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch store settings for delivery calculation
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    enabled: dialogOpen,
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

  const deliveryDates = generateDeliveryDates();
  const deliveryTimeSlots = generateDeliveryTimeSlots();
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
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue placeholder={adminT('orders.clientSelection.selectClient')} />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="sticky top-0 bg-white border-b p-2">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                      placeholder={adminT('orders.clientSelection.searchClient')}
                                      value={clientSearch}
                                      onChange={(e) => setClientSearch(e.target.value)}
                                      className="pl-8 h-8"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                  {filteredClients.length > 0 ? (
                                    filteredClients.map((client: any) => (
                                      <SelectItem key={client.id} value={client.id.toString()}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {client.firstName} {client.lastName}
                                          </span>
                                          <span className="text-sm text-gray-500">
                                            {client.email}
                                          </span>
                                          {client.phone && (
                                            <span className="text-xs text-gray-400">
                                              {client.phone}
                                            </span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-2 text-sm text-gray-500 text-center">
                                      {clientSearch ? adminT('orders.clientSelection.noResults') : adminT('orders.clientSelection.noClients')}
                                    </div>
                                  )}
                                </div>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('orders.deliveryInfo.address')}</FormLabel>
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
                                {deliveryTimeSlots.map((slot) => (
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
                              <SelectItem value="cash">Наличные</SelectItem>
                              <SelectItem value="card">Карта курьеру</SelectItem>
                              <SelectItem value="transfer">Перевод</SelectItem>
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