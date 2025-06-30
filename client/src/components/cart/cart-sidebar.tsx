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

interface StoreSettings {
  deliveryFee?: string;
  freeDeliveryFrom?: string;
  cartBannerText?: string;
  cartBannerImageUrl?: string;
  [key: string]: any;
}

interface ThemeSettings {
  primary?: string;
  [key: string]: any;
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
  const { data: storeSettings } = useQuery<StoreSettings>({
    queryKey: ['/api/settings'],
    enabled: isOpen && items.length > 0
  });

  // Load theme settings for banner styling
  const { data: themeSettings } = useQuery<ThemeSettings>({
    queryKey: ['/api/themes/active'],
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
                      <div key={item.productId} className={`cart-item bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow ${isRTL ? 'rtl' : ''}`}>
                        <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {/* Product Image */}
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                            <img
                              src={localizedImageUrl || currentProduct.imageUrl || "/placeholder-product.jpg"}
                              alt={localizedName || currentProduct.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className={`flex justify-between items-start mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <h3 className={`font-semibold text-gray-900 text-sm leading-tight ${isRTL ? 'text-right' : ''}`}>
                                {localizedName || currentProduct.name}
                              </h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.productId)}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className={`text-xs text-gray-500 mb-3 ${isRTL ? 'text-right' : ''}`}>
                              {formatCurrency(parseFloat(currentProduct.pricePerKg || currentProduct.price))} / {currentProduct.unit}
                            </div>
                            
                            {/* Quantity Controls and Price */}
                            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={`flex items-center gap-2 bg-gray-50 rounded-full p-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuantityChange(item.productId, Math.max(0, item.quantity - getIncrementValue(currentProduct.unit)), currentProduct.unit)}
                                  className="h-7 w-7 p-0 rounded-full hover:bg-white"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <input
                                  type="text"
                                  value={getDisplayQuantity(item)}
                                  onChange={(e) => setEditingQuantity(prev => ({ ...prev, [item.productId]: e.target.value }))}
                                  onBlur={() => handleQuantityBlur(item.productId, currentProduct.unit)}
                                  onKeyPress={(e) => handleQuantityKeyPress(e, item.productId, currentProduct.unit)}
                                  className="w-12 text-center text-sm font-medium bg-transparent border-0 outline-none"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuantityChange(item.productId, item.quantity + getIncrementValue(currentProduct.unit), currentProduct.unit)}
                                  className="h-7 w-7 p-0 rounded-full hover:bg-white"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {/* Price */}
                              <div className={`font-semibold text-primary ${isRTL ? 'text-left' : 'text-right'}`}>
                                {formatCurrency(parseFloat(calculateItemTotal(currentProduct, item.quantity)))}
                              </div>
                            </div>
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

              {/* Cart Banner with Theme Background */}
              {(storeSettings?.cartBannerText || storeSettings?.cartBannerImageUrl) && (
                <div 
                  className={`relative overflow-hidden rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}
                  style={{
                    backgroundColor: themeSettings?.primary || 'var(--primary)',
                    backgroundImage: storeSettings?.cartBannerImageUrl ? `url(${storeSettings.cartBannerImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    minHeight: '80px'
                  }}
                >
                  {/* Overlay for better text readability */}
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  
                  {/* Banner content */}
                  <div className="relative z-10 p-4 flex items-center justify-center h-full">
                    {storeSettings?.cartBannerText && (
                      <p className="text-white font-medium text-center text-sm leading-relaxed drop-shadow-md">
                        {storeSettings.cartBannerText}
                      </p>
                    )}
                  </div>
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