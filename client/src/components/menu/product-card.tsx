import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatWeight, calculateTotal, getUnitLabel, formatQuantity, type ProductUnit } from "@/lib/currency";
import { ShoppingCart, Plus, Minus, Eye, Star, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ProductWithCategory } from "@shared/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation } from "@/hooks/use-language";

interface ProductCardProps {
  product: ProductWithCategory;
  onCategoryClick?: (categoryId: number) => void;
}

export default function ProductCard({ product, onCategoryClick }: ProductCardProps) {
  const unit = (product.unit || "100g") as ProductUnit;
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();
  
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
    toast({
      title: t('addedToCart'),
      description: `${product.name} (${formatQuantity(finalQuantity, unit, t)}) - ${formatCurrency(totalPrice)}`,
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
          {t('cart')}
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
          alt={product.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
          }}
        />
        
        {/* Out of stock overlay bar */}
        {product.availabilityStatus === 'out_of_stock_today' && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 bg-opacity-90 text-white text-center py-2 font-semibold text-base">
            {t('outOfStockToday')}
          </div>
        )}
        
        {/* Discount badge - only show if it's a special offer */}
        {product.isSpecialOffer && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-orange-500 text-white text-sm px-3 py-1.5 font-semibold shadow-lg">
              <Star className="w-4 h-4 mr-1.5 fill-current" />
              {t('discount')}
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-lg font-poppins font-semibold text-gray-900 mb-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-base text-gray-600 mb-2 line-clamp-2">
              {product.description}
            </p>
          )}
          {product.category && (
            <Badge 
              variant="secondary" 
              className="mb-2 cursor-pointer bg-gray-100 text-gray-700 hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => onCategoryClick?.(product.category.id)}
            >
              {product.category.name}
            </Badge>
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              {product.isSpecialOffer && discountedPrice < price ? (
                <>
                  <span className="text-lg line-through text-gray-400">
                    {formatCurrency(price)}
                  </span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(discountedPrice)}
                  </span>

                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(discountedPrice)}
                </span>
              )}
            </div>
            <span className="text-base text-gray-500">{getUnitLabel(unit)}</span>
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {unit === "piece" ? 'Кол-во:' : 
               unit === "kg" ? 'Вес (кг):' : 
               unit === "100g" || unit === "100ml" ? 'Граммы:' : 'Кол-во:'}
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
                className="w-full bg-blue-500 text-white hover:bg-blue-600 h-10 text-sm font-medium"
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                {t('orderForTomorrow')}
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                className="w-full bg-orange-500 text-white hover:bg-orange-600 h-10 text-sm font-medium"
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                {t('addToCart')}
              </Button>
            )
          ) : (
            <Button
              disabled
              className="w-full bg-gray-200 text-gray-500 cursor-not-allowed h-10 text-sm"
            >
              ❌ Недоступен
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
