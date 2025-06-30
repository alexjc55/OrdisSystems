import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatWeight, calculateTotal, getUnitLabel, formatQuantity, type ProductUnit } from "@/lib/currency";
import { ShoppingCart, Plus, Minus, Eye, Star, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ProductWithCategories } from "@shared/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { useQuery } from "@tanstack/react-query";

interface ProductCardProps {
  product: ProductWithCategories;
  onCategoryClick?: (categoryId: number) => void;
}

export default function ProductCard({ product, onCategoryClick }: ProductCardProps) {
  const unit = (product.unit || "100g") as ProductUnit;
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  
  // Load store settings for default language
  const { data: storeSettingsData } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Get localized product fields
  const localizedName = getLocalizedField(product, 'name', currentLanguage as SupportedLanguage, storeSettingsData as any);
  const localizedDescription = getLocalizedField(product, 'description', currentLanguage as SupportedLanguage, storeSettingsData as any);
  

  
  // Set default quantity based on unit type
  const getDefaultQuantity = () => {
    switch (unit) {
      case "piece": return 1;
      case "kg": return 1.0;
      case "100g":
      case "100ml": return 100; // 100 grams by default
      default: return 1.0;
    }
  };
  
  const [selectedQuantity, setSelectedQuantity] = useState<number | null>(getDefaultQuantity());
  const { addItem, toggleCart } = useCartStore();
  const { toast } = useToast();

  const price = parseFloat(product.price || product.pricePerKg || "0");
  
  // Calculate discount if product is a special offer
  const getDiscountedPrice = (originalPrice: number) => {
    if (!product.isSpecialOffer || !product.discountType || !product.discountValue) {
      return originalPrice;
    }
    
    const discountValue = parseFloat(product.discountValue);
    if (isNaN(discountValue)) {
      return originalPrice;
    }
    
    if (product.discountType === "percentage") {
      return originalPrice * (1 - discountValue / 100);
    } else {
      return Math.max(0, originalPrice - discountValue);
    }
  };
  
  const discountedPrice = getDiscountedPrice(price);
  const totalPrice = calculateTotal(discountedPrice, selectedQuantity || getDefaultQuantity(), unit);

  const handleQuantityChange = (newQuantity: number | null) => {
    if (newQuantity === null) {
      setSelectedQuantity(null);
      return;
    }
    
    let minValue, maxValue, processedQuantity;
    
    switch (unit) {
      case "piece":
        minValue = 1;
        maxValue = 99;
        processedQuantity = Math.round(newQuantity);
        break;
      case "kg":
        minValue = 0.1;
        maxValue = 99;
        processedQuantity = Number(newQuantity.toFixed(1));
        break;
      case "100g":
      case "100ml":
        minValue = 1; // 1 gram minimum
        maxValue = 9999; // up to 9999 grams
        processedQuantity = Math.round(newQuantity);
        break;
      default:
        minValue = 0.1;
        maxValue = 99;
        processedQuantity = Number(newQuantity.toFixed(1));
    }
    
    if (newQuantity >= minValue && newQuantity <= maxValue) {
      setSelectedQuantity(processedQuantity);
    }
  };

  const handleAddToCart = () => {
    const finalQuantity = selectedQuantity || getDefaultQuantity();
    addItem(product, finalQuantity);
    
    // Format quantity with proper unit display
    const getQuantityDisplay = (qty: number, productUnit: ProductUnit) => {
      const roundedQty = Math.round(qty * 10) / 10;
      const formatQty = (value: number) => value % 1 === 0 ? value.toString() : value.toFixed(1);
      
      switch (productUnit) {
        case 'piece': 
          return `${formatQty(roundedQty)} ${t('units.piece')}`;
        case 'kg': 
          return `${formatQty(roundedQty)} ${t('units.kg')}`;
        case '100g': 
          if (roundedQty >= 1000) {
            return `${formatQty(roundedQty / 1000)} ${t('units.kg')}`;
          }
          return `${formatQty(roundedQty)} ${t('units.g')}`;
        case '100ml': 
          return `${formatQty(roundedQty)} ${t('units.ml')}`;
        default: 
          return formatQty(roundedQty);
      }
    };
    
    toast({
      title: t('addedToCart'),
      description: `${localizedName} (${getQuantityDisplay(finalQuantity, unit)}) - ${formatCurrency(totalPrice)}`,
      action: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            toggleCart();
          }}
          className="ml-2"
        >
          <Eye className="h-4 w-4 mr-1" />
          {t('viewCart')}
        </Button>
      ),
    });
  };

  const getAvailabilityBadge = () => {
    // Don't show any status badges - unavailable products are filtered out
    return null;
  };

  const isOrderable = () => {
    return product.isAvailable && product.availabilityStatus !== 'completely_unavailable';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="relative">
        <img
          src={product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
          alt={localizedName}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
          }}
        />
        
        {/* Out of stock overlay bar */}
        {product.availabilityStatus === 'out_of_stock_today' && (
          <div className="absolute bottom-0 left-0 right-0 out-of-stock-status-overlay text-white text-center py-2 font-semibold text-base">
            {t('outOfStockToday')}
          </div>
        )}
        
        {/* Discount badge - only show if it's a special offer */}
        {product.isSpecialOffer && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary text-white text-sm px-3 py-1.5 font-semibold shadow-lg">
              <Star className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5 fill-current" />
              {storeSettings?.discountBadgeText || 'Скидка'}
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex-1 min-h-[200px] flex flex-col">
          <h3 className="text-lg font-poppins font-semibold text-gray-900 mb-1 min-h-[28px] line-clamp-1">
            {localizedName}
          </h3>
          <div className="min-h-[48px] mb-2">
            {localizedDescription && (
              <p className="text-base text-gray-600 line-clamp-2">
                {localizedDescription}
              </p>
            )}
          </div>
          <div className="min-h-[32px] mb-2">
            {product.categories && product.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.categories.slice(0, 2).map((category) => (
                  <Badge 
                    key={category.id}
                    variant="secondary" 
                    className="cursor-pointer bg-gray-100 text-gray-700 hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                    onClick={() => onCategoryClick?.(category.id)}
                  >
                    {getLocalizedField(category, 'name', currentLanguage as SupportedLanguage, storeSettingsData as any)}
                  </Badge>
                ))}
                {product.categories.length > 2 && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                    +{product.categories.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mb-3 mt-auto">
            <div className="flex flex-col">
              {product.isSpecialOffer && discountedPrice < price ? (
                <>
                  <span className="text-lg line-through text-gray-400">
                    {formatCurrency(price)}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(discountedPrice)}
                  </span>

                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(discountedPrice)}
                </span>
              )}
            </div>
            <span className="text-base text-gray-500">{getUnitLabel(unit, t)}</span>
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {unit === "piece" ? t('product.quantity') + ':' : 
               unit === "kg" ? t('product.weight') + ':' : 
               unit === "100g" || unit === "100ml" ? t('product.grams') + ':' : t('product.quantity') + ':'}
            </span>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="outline"
                className="h-10 w-10 md:h-8 md:w-8 p-0 border-gray-300"
                onClick={() => {
                  const step = unit === "piece" ? 1 : unit === "kg" ? 0.1 : 1;
                  const currentQuantity = selectedQuantity || getDefaultQuantity();
                  handleQuantityChange(currentQuantity - step);
                }}
                disabled={(selectedQuantity || getDefaultQuantity()) <= (unit === "piece" ? 1 : unit === "kg" ? 0.1 : 1)}
              >
                <Minus className="h-2 w-2" />
              </Button>
              <Input
                type="text"
                value={selectedQuantity || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    // Allow empty input for manual editing
                    handleQuantityChange(null);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 0) {
                      handleQuantityChange(numValue);
                    }
                  }
                }}
                className="w-20 md:w-16 text-center text-sm h-10 md:h-8 border-gray-300"
                placeholder={unit === "piece" ? "1" : unit === "kg" ? "1" : "100"}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-10 w-10 md:h-8 md:w-8 p-0 border-gray-300"
                onClick={() => {
                  const step = unit === "piece" ? 1 : unit === "kg" ? 0.1 : 1;
                  const currentQuantity = selectedQuantity || getDefaultQuantity();
                  handleQuantityChange(currentQuantity + step);
                }}
                disabled={(selectedQuantity || getDefaultQuantity()) >= (unit === "100g" || unit === "100ml" ? 9999 : 99)}
              >
                <Plus className="h-2 w-2" />
              </Button>
            </div>
          </div>

          {/* Total Price */}
          <div className="bg-gray-50 rounded p-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('total')}:</span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          {isOrderable() ? (
            product.availabilityStatus === 'out_of_stock_today' ? (
              <Button
                onClick={handleAddToCart}
                className="w-full btn-tomorrow h-10 text-sm font-medium"
              >
                <ShoppingCart className="mr-1 rtl:mr-0 rtl:ml-1 h-3 w-3" />
                {t('orderForTomorrow')}
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                className="w-full bg-primary text-white hover:bg-primary-hover h-10 text-sm font-medium"
              >
                <ShoppingCart className="mr-1 rtl:mr-0 rtl:ml-1 h-3 w-3" />
                {t('product.addToCart')}
              </Button>
            )
          ) : (
            <Button
              disabled
              className="w-full out-of-stock-overlay cursor-not-allowed h-10 text-sm"
            >
              ❌ {t('product.outOfStock')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
