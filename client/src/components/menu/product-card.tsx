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
  
  const [selectedQuantity, setSelectedQuantity] = useState(getDefaultQuantity());
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
  const totalPrice = calculateTotal(discountedPrice, selectedQuantity, unit);

  const handleQuantityChange = (newQuantity: number) => {
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
    addItem(product, selectedQuantity);
    toast({
      title: "Добавлено в корзину",
      description: `${product.name} (${formatQuantity(selectedQuantity, unit)}) - ${formatCurrency(totalPrice)}`,
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
          Корзина
        </Button>
      ),
    });
  };

  const getAvailabilityBadge = () => {
    if (product.availabilityStatus === 'completely_unavailable' || !product.isAvailable) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Недоступен
        </Badge>
      );
    }
    if (product.stockStatus === 'low_stock') {
      return (
        <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Мало
        </Badge>
      );
    }
    if (product.availabilityStatus === 'out_of_stock_today') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
          <Clock className="w-3 h-3 mr-1" />
          Завтра
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        В наличии
      </Badge>
    );
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
        <div className="absolute top-2 right-2">
          {getAvailabilityBadge()}
        </div>
        {product.isSpecialOffer && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-orange-500 text-white">
              <Star className="w-3 h-3 mr-1" />
              Акция
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
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
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
                  <Badge className="bg-orange-500 text-white text-xs mt-1 w-fit">
                    {storeSettings?.discountBadgeText || "Скидка"}
                  </Badge>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(discountedPrice)}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">{getUnitLabel(unit)}</span>
          </div>
        </div>

        <div className="space-y-3 mt-auto">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {unit === "piece" ? t('product.quantity', 'Количество:') : 
               unit === "kg" ? t('product.weight', 'Вес (кг):') : 
               unit === "100g" || unit === "100ml" ? t('product.grams', 'Граммы:') : t('product.quantity', 'Количество:')}
            </label>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => {
                  const step = unit === "piece" ? 1 : unit === "kg" ? 0.1 : 1;
                  handleQuantityChange(selectedQuantity - step);
                }}
                disabled={selectedQuantity <= (unit === "piece" ? 1 : unit === "kg" ? 0.1 : 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={selectedQuantity}
                onChange={(e) => {
                  const defaultValue = unit === "piece" ? 1 : unit === "kg" ? 0.1 : 100;
                  handleQuantityChange(parseFloat(e.target.value) || defaultValue);
                }}
                step={unit === "piece" ? "1" : unit === "kg" ? "0.1" : "1"}
                min={unit === "piece" ? "1" : unit === "kg" ? "0.1" : "1"}
                max={unit === "100g" || unit === "100ml" ? "9999" : "99"}
                className="w-20 text-center text-sm h-8"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => {
                  const step = unit === "piece" ? 1 : unit === "kg" ? 0.1 : 1;
                  handleQuantityChange(selectedQuantity + step);
                }}
                disabled={selectedQuantity >= (unit === "100g" || unit === "100ml" ? 9999 : 99)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Total Price */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('product.total', 'Итого:')}:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          {isOrderable() ? (
            product.availabilityStatus === 'out_of_stock_today' ? (
              <Button
                onClick={handleAddToCart}
                variant="info"
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Доступен на другой день
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                variant="default"
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t('product.addToCart', 'В корзину')}
              </Button>
            )
          ) : (
            <Button
              disabled
              className="w-full bg-gray-300 text-gray-500 cursor-not-allowed py-2 px-4"
            >
              ❌ Недоступен
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
