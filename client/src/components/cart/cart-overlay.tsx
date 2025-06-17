import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatWeight } from "@/lib/currency";
import { X, Plus, Minus, Trash2, CreditCard } from "lucide-react";

const DELIVERY_FEE = 15.00;

export default function CartOverlay() {
  const { items, isOpen, setCartOpen, updateQuantity, removeItem, clearCart } = useCartStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerNotes, setCustomerNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const subtotal = items.reduce((total, item) => total + item.totalPrice, 0);
  const total = subtotal + DELIVERY_FEE;

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      await apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Заказ создан",
        description: "Ваш заказ успешно оформлен и передан в обработку",
      });
      clearCart();
      setCartOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Ошибка при создании заказа",
        description: "Не удалось создать заказ. Попробуйте еще раз.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Корзина пуста",
        description: "Добавьте товары в корзину перед оформлением заказа",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      totalAmount: total.toFixed(2),
      deliveryFee: DELIVERY_FEE.toFixed(2),
      customerNotes: customerNotes.trim() || null,
      deliveryAddress: deliveryAddress.trim() || null,
      paymentMethod: "cash",
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity.toFixed(3),
        pricePerKg: item.product.pricePerKg,
        totalPrice: item.totalPrice.toFixed(2),
      }))
    };

    createOrderMutation.mutate(orderData);
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, Number(newQuantity.toFixed(1)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setCartOpen(false)} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-poppins font-semibold">Корзина</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCartOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-6">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🛍️</div>
                <h3 className="text-lg font-poppins font-semibold text-gray-900 mb-2">
                  Корзина пуста
                </h3>
                <p className="text-gray-600">
                  Добавьте товары в корзину для оформления заказа
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                    <img
                      src={item.product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop'}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop';
                      }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatWeight(item.quantity)} × {formatCurrency(parseFloat(item.product.pricePerKg))}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity - 0.1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.product.id, parseFloat(e.target.value) || 0.1)}
                          step="0.1"
                          min="0.1"
                          className="w-16 text-center text-xs h-6 px-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity + 0.1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatCurrency(item.totalPrice)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.product.id)}
                        className="text-red-500 hover:text-red-700 p-1 h-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Order Notes */}
                <div className="space-y-3 pt-4">
                  <label className="text-sm font-medium text-gray-700">
                    Комментарий к заказу (необязательно)
                  </label>
                  <Textarea
                    placeholder="Особые пожелания, время доставки..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Delivery Address */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Адрес доставки (необязательно)
                  </label>
                  <Textarea
                    placeholder="Введите адрес доставки..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Подытог:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Доставка:</span>
                  <span>{formatCurrency(DELIVERY_FEE)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              
              <Button
                onClick={handleCheckout}
                disabled={createOrderMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3"
              >
                {createOrderMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Оформление...
                  </div>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Оформить заказ
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
