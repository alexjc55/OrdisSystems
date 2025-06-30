import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { UserAddress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatQuantity, formatWeight, type ProductUnit } from "@/lib/currency";
import { useShopTranslation, useCommonTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { X, Plus, Minus, Trash2, CreditCard, Clock, MapPin, Phone, User } from "lucide-react";

// Calculate delivery fee based on order total and free delivery threshold
const calculateDeliveryFee = (orderTotal: number, deliveryFee: number, freeDeliveryFrom: number) => {
  return orderTotal >= freeDeliveryFrom ? 0 : deliveryFee;
};

export default function CartOverlay() {
  const { items, isOpen, setCartOpen, updateQuantity, removeItem, clearCart } = useCartStore();
  const { user } = useAuth();
  
  // Fetch current products data to get translations
  const { data: productsData = [] } = useQuery({
    queryKey: ['/api/products'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const productsList = productsData as any[];
  const { storeSettings } = useStoreSettings();
  const { toast } = useToast();
  const { t } = useShopTranslation();
  const { t: tCommon } = useCommonTranslation();
  const { currentLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [customerNotes, setCustomerNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  // Fetch user addresses
  const { data: userAddresses = [] } = useQuery<UserAddress[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  // Auto-populate user data when user is logged in and cart is opened
  useEffect(() => {
    if (user && isOpen) {
      // Set phone from user profile if empty
      if (user.phone && !customerPhone) {
        setCustomerPhone(user.phone);
      }
      
      // Set default address if user has addresses and no address is selected
      const addresses = userAddresses as UserAddress[];
      if (addresses.length > 0 && !deliveryAddress) {
        const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
        if (defaultAddress) {
          setDeliveryAddress(defaultAddress.address);
          setSelectedAddressId(defaultAddress.id);
        }
      }
    }
  }, [user, userAddresses, isOpen]);

  // Force re-render when language changes to update localized product names
  useEffect(() => {
    // This effect triggers a re-render when currentLanguage changes
    // which will update the localizedName calculations in the render method
  }, [currentLanguage]);

  // Handle address selection
  const handleAddressSelect = (addressId: number) => {
    const addresses = userAddresses as UserAddress[];
    const selectedAddress = addresses.find(addr => addr.id === addressId);
    if (selectedAddress) {
      setDeliveryAddress(selectedAddress.address);
      setSelectedAddressId(addressId);
    }
  };

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  // Generate next 7 days for delivery
  const generateDeliveryDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString(currentLanguage === 'he' ? 'he-IL' : currentLanguage === 'ar' ? 'ar' : currentLanguage === 'en' ? 'en-US' : 'ru-RU', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })
      });
    }
    
    return dates;
  };

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });
      if (!response.ok) {
        throw new Error('Failed to place order');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('orderPlaced'),
        description: t('orderPlacedDescription'),
      });
      clearCart();
      setCartOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('authRequired'),
          description: t('pleaseLoginToPlaceOrder'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('orderFailed'),
          description: t('orderFailedDescription'),
          variant: "destructive",
        });
      }
    }
  });

  const handleOrder = () => {
    if (!user) {
      toast({
        title: t('authRequired'),
        description: t('pleaseLoginToPlaceOrder'),
        variant: "destructive",
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        title: t('deliveryAddressRequired'),
        description: t('pleaseEnterDeliveryAddress'),
        variant: "destructive",
      });
      return;
    }

    if (!customerPhone.trim()) {
      toast({
        title: t('phoneRequired'),
        description: t('pleaseEnterPhoneNumber'),
        variant: "destructive",
      });
      return;
    }

    if (!deliveryDate) {
      toast({
        title: t('deliveryDateRequired'),
        description: t('pleaseSelectDeliveryDate'),
        variant: "destructive",
      });
      return;
    }

    if (!deliveryTime) {
      toast({
        title: t('deliveryTimeRequired'),
        description: t('pleaseSelectDeliveryTime'),
        variant: "destructive",
      });
      return;
    }

    const orderItems = items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity.toString(),
      pricePerKg: item.product.pricePerKg || item.product.price,
      totalPrice: (parseFloat(item.product.pricePerKg || item.product.price) * item.quantity).toFixed(2)
    }));

    const orderData = {
      customerPhone,
      deliveryAddress,
      deliveryDate,
      deliveryTime,
      customerNotes,
      items: orderItems,
      total: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      grandTotal: grandTotal.toFixed(2)
    };

    orderMutation.mutate(orderData);
  };

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.product.pricePerKg || item.product.price);
    return sum + (price * item.quantity);
  }, 0);

  const deliveryFee = storeSettings ? calculateDeliveryFee(
    subtotal,
    parseFloat(storeSettings.deliveryFee || "0"),
    parseFloat(storeSettings.freeDeliveryFrom || "0")
  ) : 0;

  const grandTotal = subtotal + deliveryFee;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <div className="w-full max-w-md h-full bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('cart')}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCartOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 max-h-[calc(100vh-120px)]">
          <div className="p-4">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">{t('cartEmpty')}</p>
                <Button onClick={() => setCartOpen(false)}>
                  {t('continueShopping')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  // Get current product data with translations
                  const currentProduct = productsList.find(p => p.id === item.product.id) || item.product;
                  const localizedName = getLocalizedField(currentProduct, 'name', currentLanguage as SupportedLanguage);
                  const localizedImageUrl = getLocalizedField(currentProduct, 'imageUrl', currentLanguage as SupportedLanguage);
                  

                  
                  return (
                    <div key={item.product.id} className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                      <img
                        src={localizedImageUrl || currentProduct.imageUrl || "/placeholder-product.jpg"}
                        alt={localizedName || currentProduct.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{localizedName || currentProduct.name}</h3>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(parseFloat(currentProduct.pricePerKg || currentProduct.price))} / {currentProduct.unit}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium min-w-[3rem] text-center">
                            {formatQuantity(item.quantity, currentProduct.unit as ProductUnit)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.product.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(parseFloat(currentProduct.pricePerKg || currentProduct.price) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <Separator />

                {/* Order Summary */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{t('subtotal')}</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('deliveryFee')}</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-green-600">{t('free')}</span>
                      ) : (
                        formatCurrency(deliveryFee)
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>{t('total')}</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <Separator />

                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="font-medium">{t('deliveryInformation')}</h3>
                  
                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {t('phoneNumber')}
                    </label>
                    <Input
                      type="tel"
                      placeholder={t('enterPhoneNumber')}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {t('deliveryAddress')}
                    </label>
                    
                    {user && userAddresses.length > 0 && (
                      <Select onValueChange={(value) => handleAddressSelect(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectSavedAddress')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(userAddresses as UserAddress[]).map((address) => (
                            <SelectItem key={address.id} value={address.id.toString()}>
                              {address.name ? `${address.name}: ${address.address}` : address.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Textarea
                      placeholder={t('enterDeliveryAddress')}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Delivery Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('deliveryDate')}</label>
                    <Select onValueChange={setDeliveryDate}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectDeliveryDate')} />
                      </SelectTrigger>
                      <SelectContent>
                        {generateDeliveryDates().map((date) => (
                          <SelectItem key={date.value} value={date.value}>
                            {date.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delivery Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {t('deliveryTime')}
                    </label>
                    <Select onValueChange={setDeliveryTime}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectDeliveryTime')} />
                      </SelectTrigger>
                      <SelectContent>
                        {generateTimeSlots().map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('additionalNotes')}</label>
                    <Textarea
                      placeholder={t('addNotesOptional')}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                {/* Order Button */}
                <Button
                  onClick={handleOrder}
                  disabled={orderMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {orderMutation.isPending ? t('placingOrder') : `${t('placeOrder')} ${formatCurrency(grandTotal)}`}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}