import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
      toast({
        title: "Заказ создан!",
        description: "Ваш заказ успешно оформлен и принят в обработку",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать заказ",
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
  const deliveryFee = parseFloat(storeSettings?.deliveryFee || "15");
  const finalTotal = totalAmount + deliveryFee;

  const handleSubmit = () => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в систему для оформления заказа",
        variant: "destructive",
      });
      return;
    }

    if (!formData.deliveryAddress || !formData.customerPhone) {
      toast({
        title: "Заполните обязательные поля",
        description: "Адрес доставки и телефон обязательны",
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
      deliveryFee: deliveryFee.toString(),
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
            Оформление Заказа
          </CardTitle>
          <CardDescription>
            Заполните данные для доставки
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold">Ваш заказ:</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-gray-600">
                      {formatWeight(item.quantity)} × {formatCurrency(parseFloat(item.product.pricePerKg))}/кг
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(item.totalPrice)}</div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Стоимость товаров:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Доставка:</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Итого:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Информация о доставке
            </h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="deliveryAddress">Адрес доставки *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  placeholder="Улица, дом, квартира, подъезд, этаж"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">Телефон *</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="+972-XX-XXX-XXXX"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Delivery Time */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Желаемое время доставки (по возможности)
            </h3>
            
            {storeSettings && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Ограничения по времени:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Минимальное время подготовки: {storeSettings.minDeliveryTimeHours} часа</li>
                  <li>• Максимальный период заказа: {storeSettings.maxDeliveryTimeDays} дня</li>
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryDate">Дата доставки</Label>
                <Select 
                  value={formData.requestedDeliveryDate} 
                  onValueChange={(value) => setFormData({ ...formData, requestedDeliveryDate: value, requestedDeliveryTime: "" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите дату" />
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
                <Label htmlFor="deliveryTime">Время доставки</Label>
                <Select 
                  value={formData.requestedDeliveryTime} 
                  onValueChange={(value) => setFormData({ ...formData, requestedDeliveryTime: value })}
                  disabled={!formData.requestedDeliveryDate}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите время" />
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
              Способ оплаты
            </h3>
            
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Наличными при получении</SelectItem>
                <SelectItem value="card">Картой при получении</SelectItem>
                <SelectItem value="transfer">Банковский перевод</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="customerNotes">Комментарий к заказу</Label>
            <Textarea
              id="customerNotes"
              value={formData.customerNotes}
              onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
              placeholder="Дополнительные пожелания или комментарии..."
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
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              disabled={createOrderMutation.isPending || !formData.deliveryAddress || !formData.customerPhone}
            >
              {createOrderMutation.isPending ? "Оформление..." : `Заказать за ${formatCurrency(finalTotal)}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}