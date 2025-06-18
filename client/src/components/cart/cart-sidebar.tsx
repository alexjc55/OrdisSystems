import { useCartStore } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatQuantity, type ProductUnit } from "@/lib/currency";
import { X, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";

export default function CartSidebar() {
  const { items, isOpen, setCartOpen, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const [, setLocation] = useLocation();

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, Number(newQuantity.toFixed(1)));
    }
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setLocation("/checkout");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setCartOpen(false)} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Корзина ({items.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCartOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <div className="text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Корзина пуста</h3>
                  <p className="text-gray-500 mb-4">Добавьте товары для оформления заказа</p>
                  <Button onClick={() => setCartOpen(false)}>
                    Продолжить покупки
                  </Button>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="rounded-lg border p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.product.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{item.product.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.product.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity - 0.1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium min-w-[60px] text-center">
                            {formatQuantity(item.quantity, item.product.unit as ProductUnit)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity + 0.1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {formatCurrency(item.product.price)} за {item.product.unit}
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <div className="space-y-2">
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого:</span>
                  <span>{formatCurrency(getTotalPrice())}</span>
                </div>
              </div>
              
              <Button 
                onClick={handleCheckout}
                className="w-full"
                size="lg"
              >
                Оформить заказ
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}