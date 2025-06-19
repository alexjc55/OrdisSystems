import { useCartStore } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatQuantity, type ProductUnit } from "@/lib/currency";
import { X, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

// Calculate delivery fee based on order total and free delivery threshold
const calculateDeliveryFee = (orderTotal: number, deliveryFee: number, freeDeliveryFrom: number) => {
  return orderTotal >= freeDeliveryFrom ? 0 : deliveryFee;
};

export default function CartSidebar() {
  const { items, isOpen, setCartOpen, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const [, setLocation] = useLocation();
  const [editingQuantity, setEditingQuantity] = useState<{[key: number]: string}>({});
  const { storeSettings } = useStoreSettings();

  const handleQuantityChange = (productId: number, newQuantity: number, unit: ProductUnit) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      // Adjust increment based on unit type
      let adjustedQuantity = newQuantity;
      if (unit === "piece") {
        adjustedQuantity = Math.round(newQuantity); // Whole numbers for pieces
      } else if (unit === "kg") {
        adjustedQuantity = Number(newQuantity.toFixed(1)); // 0.1 kg increments
      } else {
        adjustedQuantity = Number(newQuantity.toFixed(1)); // 0.1 increments for 100g/100ml
      }
      updateQuantity(productId, adjustedQuantity);
    }
  };

  const getIncrementValue = (unit: ProductUnit) => {
    switch (unit) {
      case "piece":
        return 1;
      case "kg":
        return 0.1;
      default:
        return 0.1; // For 100g/100ml
    }
  };

  const handleManualQuantityChange = (productId: number, value: string, unit: ProductUnit) => {
    setEditingQuantity(prev => ({ ...prev, [productId]: value }));
  };

  const handleQuantityBlur = (productId: number, unit: ProductUnit) => {
    const value = editingQuantity[productId];
    if (value !== undefined) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        handleQuantityChange(productId, numValue, unit);
      }
      setEditingQuantity(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    }
  };

  const handleQuantityKeyPress = (e: React.KeyboardEvent, productId: number, unit: ProductUnit) => {
    if (e.key === 'Enter') {
      handleQuantityBlur(productId, unit);
    }
  };

  const getDisplayQuantity = (item: any) => {
    const productId = item.product.id;
    if (editingQuantity[productId] !== undefined) {
      return editingQuantity[productId];
    }
    return item.quantity.toString();
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
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        {/* Product Image Placeholder */}
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="h-6 w-6 text-orange-600" />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm leading-tight">{item.product.name}</h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.product.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.product.id)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full flex-shrink-0 ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Price and Quantity Controls */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(
                                    item.product.id, 
                                    item.quantity - getIncrementValue(item.product.unit as ProductUnit),
                                    item.product.unit as ProductUnit
                                  )}
                                  className="h-8 w-8 p-0 rounded-full bg-white border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="text"
                                  value={getDisplayQuantity(item)}
                                  onChange={(e) => handleManualQuantityChange(item.product.id, e.target.value, item.product.unit as ProductUnit)}
                                  onBlur={() => handleQuantityBlur(item.product.id, item.product.unit as ProductUnit)}
                                  onKeyPress={(e) => handleQuantityKeyPress(e, item.product.id, item.product.unit as ProductUnit)}
                                  className="w-16 h-8 text-center text-sm font-bold border-gray-200 focus:border-orange-300"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(
                                    item.product.id, 
                                    item.quantity + getIncrementValue(item.product.unit as ProductUnit),
                                    item.product.unit as ProductUnit
                                  )}
                                  className="h-8 w-8 p-0 rounded-full bg-white border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.product.unit === "piece" ? "шт" : 
                                 item.product.unit === "kg" ? "кг" : 
                                 item.product.unit === "100g" ? "100г" : "100мл"}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-xs text-gray-500">
                                {formatCurrency(item.product.price)} за {item.product.unit}
                              </div>
                              <div className="font-bold text-lg text-gray-900">
                                {formatCurrency(item.totalPrice)}
                              </div>
                            </div>
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
            <div className="border-t bg-white p-4 space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
                {(() => {
                  const subtotal = getTotalPrice();
                  const deliveryFeeAmount = calculateDeliveryFee(
                    subtotal, 
                    parseFloat(storeSettings?.deliveryFee || "15.00"), 
                    parseFloat(storeSettings?.freeDeliveryFrom || "50.00")
                  );
                  const total = subtotal + deliveryFeeAmount;

                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Товары:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Доставка:</span>
                        <span>
                          {deliveryFeeAmount === 0 ? (
                            <span className="text-green-600 font-medium">Бесплатно</span>
                          ) : (
                            formatCurrency(deliveryFeeAmount)
                          )}
                        </span>
                      </div>
                      {deliveryFeeAmount > 0 && (
                        <div className="text-xs text-gray-500 text-center">
                          Бесплатная доставка от {formatCurrency(parseFloat(storeSettings?.freeDeliveryFrom || "50.00"))}
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-700">Итого:</span>
                        <span className="text-2xl font-bold text-orange-600">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Cart Banner */}
              {storeSettings?.showCartBanner && (
                <div className="space-y-3">
                  {storeSettings.cartBannerType === "text" && storeSettings.cartBannerText && (
                    <div 
                      className="rounded-xl p-4 text-center font-semibold shadow-md"
                      style={{ 
                        backgroundColor: storeSettings.cartBannerBgColor || "#f97316",
                        color: storeSettings.cartBannerTextColor || "#ffffff"
                      }}
                    >
                      <p className="text-sm leading-relaxed">{storeSettings.cartBannerText}</p>
                    </div>
                  )}
                  
                  {storeSettings.cartBannerType === "image" && storeSettings.cartBannerImage && (
                    <div className="rounded-xl overflow-hidden shadow-md">
                      <img 
                        src={storeSettings.cartBannerImage} 
                        alt="Cart Banner"
                        className="w-full h-auto max-h-[120px] object-cover"
                        style={{ maxHeight: "120px" }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200"
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