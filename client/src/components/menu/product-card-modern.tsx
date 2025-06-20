import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatWeight, calculateTotal, getUnitLabel, formatQuantity, type ProductUnit } from "@/lib/currency";
import { ShoppingCart, Plus, Minus, Star, Clock, Truck, Heart } from "lucide-react";
import type { ProductWithCategory } from "@shared/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation } from "@/hooks/use-language";

interface ProductCardProps {
  product: ProductWithCategory;
  onCategoryClick?: (categoryId: number) => void;
}

export default function ModernProductCard({ product, onCategoryClick }: ProductCardProps) {
  const unit = (product.unit || "100g") as ProductUnit;
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();
  
  const getDefaultQuantity = () => {
    switch (unit) {
      case "piece": return 1;
      case "kg": return 1.0;
      case "100g":
      case "100ml": return 100;
      default: return 1.0;
    }
  };
  
  const [selectedQuantity, setSelectedQuantity] = useState(getDefaultQuantity());
  const [isLiked, setIsLiked] = useState(false);
  const { addItem, toggleCart } = useCartStore();
  const { toast } = useToast();

  const price = parseFloat(product.price || product.pricePerKg || "0");
  
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
  const hasValidDiscount = product.isSpecialOffer && 
    product.discountType && 
    product.discountValue && 
    !isNaN(parseFloat(product.discountValue)) &&
    discountedPrice < price;

  const handleAddToCart = () => {
    if (!product.isAvailable) return;

    const totalPrice = calculateTotal(selectedQuantity, discountedPrice, unit);
    
    addItem(product, selectedQuantity);

    toast({
      title: t('product.addedToCart'),
      description: `${product.name} - ${formatQuantity(selectedQuantity, unit)} = ${formatCurrency(totalPrice)}`,
    });
    
    toggleCart();
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (unit === "piece") {
      setSelectedQuantity(Math.max(1, Math.floor(newQuantity)));
    } else if (unit === "kg") {
      setSelectedQuantity(Math.max(0.1, Math.round(newQuantity * 10) / 10));
    } else {
      setSelectedQuantity(Math.max(100, Math.floor(newQuantity / 100) * 100));
    }
  };

  return (
    <Card className="product-card group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-500">
      {/* Product Image */}
      <div className="relative overflow-hidden">
        {product.imageUrl ? (
          <div className="aspect-[4/3] overflow-hidden">
            <img 
              src={product.imageUrl} 
              alt={product.name || "Product image"}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Like Button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </Button>
        
        {/* Special Offer Badge */}
        {hasValidDiscount && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold px-3 py-1.5 text-xs shadow-lg">
              <Star className="w-3 h-3 mr-1" />
              {product.discountType === "percentage" 
                ? `-${product.discountValue || 0}%` 
                : `-${formatCurrency(parseFloat(product.discountValue || "0"))}`
              }
            </Badge>
          </div>
        )}
        
        {/* Unavailable Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm shadow-xl">
              {t('product.unavailable')}
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Category Badge */}
        {product.category && (
          <div className="flex justify-between items-start">
            <Badge 
              variant="outline" 
              className="text-xs font-medium cursor-pointer hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-full px-3 py-1"
              onClick={() => onCategoryClick?.(product.category?.id || 0)}
            >
              {product.category.name}
            </Badge>
          </div>
        )}

        {/* Product Info */}
        <div className="space-y-3">
          <h3 className="font-bold text-xl text-foreground line-clamp-2 leading-tight">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price Section */}
        <div className="space-y-2">
          {hasValidDiscount ? (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-red-600">
                  {formatCurrency(discountedPrice)}
                </span>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(price)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">{getUnitLabel(unit)}</p>
            </div>
          ) : (
            <div>
              <span className="text-2xl font-black text-foreground">
                {formatCurrency(price)}
              </span>
              <p className="text-xs text-muted-foreground font-medium">{getUnitLabel(unit)}</p>
            </div>
          )}
        </div>

        {/* Quantity Controls */}
        {product.isAvailable && (
          <div className="space-y-4">
            <div className="glass-effect p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {t('product.quantity')}:
                </span>
                <span className="text-xs text-muted-foreground font-medium bg-primary/10 px-2 py-1 rounded-full">
                  {formatQuantity(selectedQuantity, unit)}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200"
                  onClick={() => {
                    if (unit === "piece") {
                      handleQuantityChange(selectedQuantity - 1);
                    } else if (unit === "kg") {
                      handleQuantityChange(selectedQuantity - 0.1);
                    } else {
                      handleQuantityChange(selectedQuantity - 100);
                    }
                  }}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                
                <Input
                  type="number"
                  value={selectedQuantity}
                  onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
                  className="form-input text-center h-12 text-lg font-bold flex-1"
                  min={unit === "piece" ? 1 : unit === "kg" ? 0.1 : 100}
                  step={unit === "piece" ? 1 : unit === "kg" ? 0.1 : 100}
                />
                
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full border-2 hover:border-primary hover:bg-primary/10 transition-all duration-200"
                  onClick={() => {
                    if (unit === "piece") {
                      handleQuantityChange(selectedQuantity + 1);
                    } else if (unit === "kg") {
                      handleQuantityChange(selectedQuantity + 0.1);
                    } else {
                      handleQuantityChange(selectedQuantity + 100);
                    }
                  }}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Total Price Display */}
            <div className="text-center py-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
              <div className="text-sm text-muted-foreground font-medium mb-1">{t('product.total')}:</div>
              <div className="text-2xl font-black text-primary">
                {formatCurrency(calculateTotal(selectedQuantity, discountedPrice, unit))}
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button 
              className="btn-modern w-full text-primary-foreground font-bold py-4 text-lg shadow-xl transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-6 h-6 mr-3" />
              {t('product.addToCart')}
            </Button>
          </div>
        )}

        {/* Quick Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>30 мин</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span>Доставка</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>4.8</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}