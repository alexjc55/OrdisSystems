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
import { useShopTranslation } from '@/hooks/useTranslation';
import { formatCurrency } from '@/lib/currency';
import { useQuery } from '@tanstack/react-query';
import { getLocalizedField, type SupportedLanguage } from '@shared/localization';
import { ProductUnit } from '@shared/schema';

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
  const { t, currentLanguage } = useShopTranslation();
  const [editingQuantity, setEditingQuantity] = useState<Record<number, string>>({});

  // Fetch all products to get current data with translations
  const { data: productsList = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: isOpen && items.length > 0
  });

  const handleQuantityChange = (productId: number, newQuantity: number, unit: ProductUnit) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const getIncrementValue = (unit: ProductUnit) => {
    switch (unit) {
      case 'piece': return 1;
      case 'kg': return 0.1;
      case '100g': return 1;
      case '100ml': return 1;
      default: return 1;
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
    const productId = item.productId;
    if (editingQuantity[productId] !== undefined) {
      return editingQuantity[productId];
    }
    return item.quantity.toString();
  };

  // Calculate total price for an item based on product and quantity
  const calculateItemTotal = (product: Product, quantity: number) => {
    const basePrice = parseFloat(product.pricePerKg || product.price);
    return (basePrice * quantity).toFixed(2);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col h-full p-0">
        <SheetHeader className="border-b p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
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
                      <div key={item.productId} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-start gap-3">
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
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">{localizedName || currentProduct.name}</h4>
                                  {currentProduct.availabilityStatus === 'out_of_stock_today' && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                                            <Info className="h-3 w-3" />
                                            {t('preOrder')}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">{t('preOrderTooltip')}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatCurrency(parseFloat(currentProduct.pricePerKg || currentProduct.price))} / {currentProduct.unit}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.productId)}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full flex-shrink-0 ml-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Price and Quantity Controls */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(
                                  item.productId, 
                                  item.quantity - getIncrementValue(currentProduct.unit as ProductUnit),
                                  currentProduct.unit as ProductUnit
                                )}
                                className="h-8 w-8 p-0 rounded-full bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary-light"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="text"
                                value={getDisplayQuantity(item)}
                                onChange={(e) => handleManualQuantityChange(item.productId, e.target.value, currentProduct.unit as ProductUnit)}
                                onBlur={() => handleQuantityBlur(item.productId, currentProduct.unit as ProductUnit)}
                                onKeyPress={(e) => handleQuantityKeyPress(e, item.productId, currentProduct.unit as ProductUnit)}
                                className="w-16 h-8 text-center text-sm font-bold border-gray-200 focus:border-primary"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(
                                  item.productId, 
                                  item.quantity + getIncrementValue(currentProduct.unit as ProductUnit),
                                  currentProduct.unit as ProductUnit
                                )}
                                className="h-8 w-8 p-0 rounded-full bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary-light"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              {currentProduct.unit === "piece" ? t('units.piece') : 
                               currentProduct.unit === "kg" ? t('units.kg') : 
                               currentProduct.unit === "100g" ? t('units.per100g') : t('units.per100ml')}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              {formatCurrency(currentProduct.price)} {t('units.per')} {(() => {
                                switch (currentProduct.unit) {
                                  case 'piece': return t('units.piece');
                                  case 'kg': return t('units.kg');
                                  case '100g': return t('units.per100g');
                                  case '100ml': return t('units.per100ml');
                                  default: return currentProduct.unit;
                                }
                              })()}
                            </div>
                            <div className="font-bold text-lg text-gray-900">
                              {formatCurrency(calculateItemTotal(currentProduct, item.quantity))}
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
            <div className="border-t bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="text-gray-600 hover:text-red-600"
                >
                  {t('cart.clear')}
                </Button>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{t('cart.total')}</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(getTotalPrice())}
                  </div>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => window.location.href = '/checkout'}>
                {t('cart.checkout')}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}