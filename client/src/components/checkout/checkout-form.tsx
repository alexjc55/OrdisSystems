import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatWeight } from "@/lib/currency";
import { Calendar, Clock, MapPin, Phone, CreditCard, Package } from "lucide-react";
import type { StoreSettings } from "@shared/schema";

interface CheckoutFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CheckoutForm({ onSuccess, onCancel }: CheckoutFormProps) {
  const { user } = useAuth();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useShopTranslation();
  const { currentLanguage } = useLanguage();

  const [formData, setFormData] = useState({
    deliveryAddress: "",
    customerPhone: "",
    requestedDeliveryDate: "",
    requestedDeliveryTime: "",
    customerNotes: "",
    paymentMethod: "cash",
  });

  // Fetch store settings for delivery time constraints
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ["/api/store-settings"],
    queryFn: async () => {
      const res = await fetch("/api/store-settings", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: t('checkout.orderCreated'),
        description: t('checkout.orderCreatedDescription'),
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: t('checkout.orderError'),
        description: error.message || t('checkout.orderErrorDescription'),
        variant: "destructive",
      });
    },
  });

  // Calculate delivery time constraints
  const getDeliveryTimeConstraints = () => {
    const now = new Date();
    const minHours = storeSettings?.minDeliveryTimeHours || 2;
    const maxDays = storeSettings?.maxDeliveryTimeDays || 4;

    const minDate = new Date(now.getTime() + minHours * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    return { minDate, maxDate };
  };

  // Generate available delivery dates
  const getAvailableDates = () => {
    const { minDate, maxDate } = getDeliveryTimeConstraints();
    const dates = [];
    const current = new Date(minDate);
    current.setHours(0, 0, 0, 0);

    while (current <= maxDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Generate available time slots for selected date
  const getAvailableTimeSlots = (selectedDate: string) => {
    if (!selectedDate) return [];

    const { minDate } = getDeliveryTimeConstraints();
    const date = new Date(selectedDate);
    const isToday = date.toDateString() === new Date().toDateString();
    
    let startHour = isToday ? Math.max(minDate.getHours() + 1, 9) : 9;
    const endHour = 22;

    // Time range slots like in cart overlay
    const timeSlots = [
      { value: "10:00-12:00", label: "10:00 - 12:00", start: 10, end: 12 },
      { value: "12:00-14:00", label: "12:00 - 14:00", start: 12, end: 14 },
      { value: "14:00-16:00", label: "14:00 - 16:00", start: 14, end: 16 },
      { value: "16:00-18:00", label: "16:00 - 18:00", start: 16, end: 18 },
      { value: "18:00-20:00", label: "18:00 - 20:00", start: 18, end: 20 },
      { value: "20:00-22:00", label: "20:00 - 22:00", start: 20, end: 22 }
    ];

    return timeSlots
      .filter(slot => slot.start >= startHour && slot.end <= endHour)
      .map(slot => ({ value: slot.value, label: slot.label }));
  };

  const totalAmount = getTotalPrice();
  const freeDeliveryThreshold = storeSettings?.freeDeliveryFrom ? parseFloat(storeSettings.freeDeliveryFrom) : null;
  const deliveryFeeAmount = (!freeDeliveryThreshold || freeDeliveryThreshold <= 0 || totalAmount < freeDeliveryThreshold)
    ? parseFloat(storeSettings?.deliveryFee || "15")
    : 0;
  const finalTotal = totalAmount + deliveryFeeAmount;

  const handleSubmit = () => {
    if (!user) {
      toast({
        title: t('checkout.authRequired'),
        description: t('checkout.authRequiredDescription'),
        variant: "destructive",
      });
      return;
    }

    if (!formData.deliveryAddress || !formData.customerPhone) {
      toast({
        title: t('checkout.fillRequiredFields'),
        description: t('checkout.fillRequiredFieldsDescription'),
        variant: "destructive",
      });
      return;
    }

    const orderItems = items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity.toString(),
      pricePerKg: item.product.pricePerKg,
      totalPrice: item.totalPrice.toString(),
    }));

    let requestedDeliveryTime = null;
    if (formData.requestedDeliveryDate && formData.requestedDeliveryTime) {
      // Handle time ranges like "10:00-12:00" - just store the range as-is
      requestedDeliveryTime = formData.requestedDeliveryTime;
    }

    createOrderMutation.mutate({
      totalAmount: finalTotal.toString(),
      deliveryFee: deliveryFeeAmount.toString(),
      deliveryAddress: formData.deliveryAddress,
      customerPhone: formData.customerPhone,
      customerNotes: formData.customerNotes,
      paymentMethod: formData.paymentMethod,
      requestedDeliveryDate: formData.requestedDeliveryDate,
      requestedDeliveryTime,
      items: orderItems,
    });
  };

  const availableDates = getAvailableDates();
  const availableTimeSlots = getAvailableTimeSlots(formData.requestedDeliveryDate);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('checkout.orderFormTitle')}
          </CardTitle>
          <CardDescription>
            {t('checkout.orderFormDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('checkout.yourOrder')}:</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru')}</div>
                    <div className="text-gray-600">
                      {formatWeight(item.quantity)} × {formatCurrency(parseFloat(item.product.pricePerKg))}/kg
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(item.totalPrice)}</div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t('checkout.itemsTotal')}:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('checkout.delivery')}:</span>
                <span>
                  {deliveryFeeAmount === 0 ? (
                    <span className="text-green-600 font-medium">{t('checkout.free')}</span>
                  ) : (
                    formatCurrency(deliveryFeeAmount)
                  )}
                </span>
              </div>
              {deliveryFeeAmount > 0 && (
                <div className="text-xs text-gray-500 text-center">
                  {t('checkout.freeDeliveryFrom')} {formatCurrency(parseFloat(storeSettings?.freeDeliveryFrom || "50.00"))}
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>{t('checkout.total')}:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('checkout.deliveryInfo')}
            </h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="deliveryAddress">{t('checkout.deliveryAddress')} *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  placeholder={t('enterDeliveryAddress')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">{t('checkout.phone')} *</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder={t('enterPhoneNumber')}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Delivery Time */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('checkout.deliveryTime')}
            </h3>
            
            {storeSettings && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>{t('checkout.timeConstraints')}:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• {t('checkout.minPrepTime')}: {storeSettings.minDeliveryTimeHours} {t('checkout.hours')}</li>
                  <li>• {t('checkout.maxOrderPeriod')}: {storeSettings.maxDeliveryTimeDays} {t('checkout.days')}</li>
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryDate">{t('checkout.deliveryDate')}</Label>
                <Select 
                  value={formData.requestedDeliveryDate} 
                  onValueChange={(value) => setFormData({ ...formData, requestedDeliveryDate: value, requestedDeliveryTime: "" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('selectTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map((date) => (
                      <SelectItem key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                        {date.toLocaleDateString('ru-RU', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="deliveryTime">{t('checkout.deliveryTimeLabel')}</Label>
                <Select 
                  value={formData.requestedDeliveryTime} 
                  onValueChange={(value) => setFormData({ ...formData, requestedDeliveryTime: value })}
                  disabled={!formData.requestedDeliveryDate}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('selectTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('checkout.paymentMethod')}
            </h3>
            
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('checkout.cashOnDelivery')}</SelectItem>
                <SelectItem value="card">{t('checkout.cardOnDelivery')}</SelectItem>
                <SelectItem value="transfer">{t('checkout.bankTransfer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="customerNotes">{t('checkout.orderNotes')}</Label>
            <Textarea
              id="customerNotes"
              value={formData.customerNotes}
              onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
              placeholder={t('checkout.orderNotesPlaceholder')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={createOrderMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary"
              disabled={createOrderMutation.isPending || !formData.deliveryAddress || !formData.customerPhone}
            >
              {createOrderMutation.isPending ? t('checkout.processing') : `${t('checkout.orderFor')} ${formatCurrency(finalTotal)}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}