import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Minus, Plus, Trash2, X, ShoppingBag, Info } from 'lucide-react';
import { useCartStore } from '@/lib/cart';
import { useShopTranslation } from '@/hooks/use-language';
import { formatCurrency } from '@/lib/currency';
import { useQuery } from '@tanstack/react-query';
import { getLocalizedField, type SupportedLanguage } from '@shared/localization';

interface Product {
  id: number;
  name: string;
  name_en?: string;
  name_he?: string;
  name_ar?: string;
  description?: string;
  description_en?: string;
  description_he?: string;
  description_ar?: string;
  price: string;
  unit: string;
  pricePerKg?: string;
  imageUrl?: string;
  imageUrl_en?: string;
  imageUrl_he?: string;
  imageUrl_ar?: string;
  availabilityStatus?: string;
}

export default function CartSidebar() {
  const { items, isOpen, setCartOpen, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const { t, i18n } = useShopTranslation();
  const currentLanguage = i18n.language;
  const [editingQuantity, setEditingQuantity] = useState<Record<number, string>>({});
  
  // Check if current language is RTL
  const isRTL = currentLanguage === 'he' || currentLanguage === 'ar';

  // Fetch all products to get current data with translations
  const { data: productsList = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: isOpen && items.length > 0
  });

  // Load store settings for delivery calculations
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: isOpen && items.length > 0
  });

  const handleQuantityChange = (productId: number, newQuantity: number, unit: string) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const getIncrementValue = (unit: string) => {
    switch (unit) {
      case 'piece': return 1;
      case 'kg': return 0.1;
      case '100g': return 1;
      case '100ml': return 1;
      default: return 1;
    }
  };

  const handleManualQuantityChange = (productId: number, value: string, unit: string) => {
    setEditingQuantity(prev => ({ ...prev, [productId]: value }));
  };

  const handleQuantityBlur = (productId: number, unit: string) => {
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

  const handleQuantityKeyPress = (e: React.KeyboardEvent, productId: number, unit: string) => {
    if (e.key === 'Enter') {
      handleQuantityBlur(productId, unit);
    }
  };

  const getDisplayQuantity = (item: any) => {
    const productId = item.productId;
    if (editingQuantity[productId] !== undefined) {
      return editingQuantity[productId];
    }
    return item.quantity.toString();
  };

  // Calculate total price for an item based on product and quantity
  const calculateItemTotal = (product: Product, quantity: number) => {
    if (product.unit === 'per100g' && product.pricePerKg) {
      // For per100g items, price is already per 100g, so calculate based on actual weight
      const pricePerGram = parseFloat(product.pricePerKg) / 100;
      return (pricePerGram * quantity).toFixed(2);
    } else {
      // For regular items, use standard calculation
      const basePrice = parseFloat(product.pricePerKg || product.price);
      return (basePrice * quantity).toFixed(2);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setCartOpen}>
      <SheetContent 
        side="right" 
        className={`cart-sidebar w-full sm:max-w-md flex flex-col h-full p-0 ${isRTL ? 'rtl' : ''}`}
      >
        <SheetHeader className="border-b p-6 pb-4">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <SheetTitle className="text-lg">{t('cart.title')}</SheetTitle>
                <SheetDescription className="text-sm text-gray-500">
                  {items.length} {t('cart.itemsCount')}
                </SheetDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCartOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('cart.empty')}</h3>
                <p className="text-sm text-gray-500 mb-6">{t('cart.emptyDescription')}</p>
                <Button onClick={() => setCartOpen(false)} className="w-full">
                  {t('cart.continueShopping')}
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {items.map((item) => {
                    // Get current product data with translations
                    const currentProduct = productsList.find(p => p.id === item.productId);
                    if (!currentProduct) return null; // Skip if product not found
                    
                    const localizedName = getLocalizedField(currentProduct, 'name', currentLanguage as SupportedLanguage);
                    const localizedImageUrl = getLocalizedField(currentProduct, 'imageUrl', currentLanguage as SupportedLanguage);
                    
                    return (
                      <div key={item.productId} className={`cart-item flex gap-3 p-3 bg-white border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={localizedImageUrl || currentProduct.imageUrl || "/placeholder-product.jpg"}
                            alt={localizedName || currentProduct.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium text-gray-900 text-sm leading-tight ${isRTL ? 'text-right' : ''}`}>
                            {localizedName || currentProduct.name}
                          </h3>
                          <div className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                            {formatCurrency(parseFloat(currentProduct.pricePerKg || currentProduct.price))} / {currentProduct.unit}
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className={`cart-item-controls flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, Math.max(0, item.quantity - 0.1))}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="text"
                              value={item.quantity.toFixed(1)}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                updateQuantity(item.productId, value);
                              }}
                              className="w-16 h-7 text-center text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, item.quantity + 0.1)}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.productId)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 ml-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className={`text-right flex-shrink-0 ${isRTL ? 'text-left' : ''}`}>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(parseFloat(calculateItemTotal(currentProduct, item.quantity)))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <div className="cart-footer border-t bg-white p-4 space-y-4">
              {/* Order Summary */}
              <div className="space-y-2">
                <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('subtotal')}</span>
                  <span>{formatCurrency(getTotalPrice())}</span>
                </div>
                <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('deliveryFee')}</span>
                  <span>
                    {storeSettings && parseFloat(storeSettings.deliveryFee || "0") > 0 ? (
                      getTotalPrice() >= parseFloat(storeSettings.freeDeliveryFrom || "0") ? (
                        <span className="text-green-600">{t('free')}</span>
                      ) : (
                        formatCurrency(parseFloat(storeSettings.deliveryFee || "0"))
                      )
                    ) : (
                      <span className="text-green-600">{t('free')}</span>
                    )}
                  </span>
                </div>
                <div className={`flex justify-between font-medium text-lg border-t pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('total')}</span>
                  <span>
                    {formatCurrency(
                      getTotalPrice() + 
                      (storeSettings && parseFloat(storeSettings.deliveryFee || "0") > 0 && 
                       getTotalPrice() < parseFloat(storeSettings.freeDeliveryFrom || "0") 
                        ? parseFloat(storeSettings.deliveryFee || "0") 
                        : 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Cart Banner */}
              {storeSettings?.cartBannerText && (
                <div className={`p-3 bg-orange-50 border border-orange-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-sm text-orange-800">{storeSettings.cartBannerText}</p>
                </div>
              )}

              {/* Actions */}
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="text-gray-600 hover:text-red-600"
                >
                  {t('clear')}
                </Button>
                <Button className="flex-1 ml-3" size="lg" onClick={() => window.location.href = '/checkout'}>
                  {t('checkout')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}