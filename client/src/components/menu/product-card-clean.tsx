import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, calculateTotal, getUnitLabel, formatQuantity, type ProductUnit } from "@/lib/currency";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import type { ProductWithCategory } from "@shared/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation } from "@/hooks/use-language";
import defaultProductImage from "@/assets/default-product.svg";

interface ProductCardProps {
  product: ProductWithCategory;
  onCategoryClick?: (categoryId: number) => void;
}

export default function ProductCardClean({ product, onCategoryClick }: ProductCardProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const { addItem } = useCartStore();
  const { toast } = useToast();
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();

  const unit = (product.unit as ProductUnit) || "piece";
  const basePrice = parseFloat(product.price);
  
  const hasValidDiscount = product.isSpecialOffer && 
    product.discountType && 
    product.discountValue && 
    parseFloat(product.discountValue) > 0;

  const discountedPrice = hasValidDiscount
    ? product.discountType === "percentage"
      ? basePrice * (1 - parseFloat(product.discountValue || "0") / 100)
      : basePrice - parseFloat(product.discountValue || "0")
    : basePrice;

  const handleAddToCart = () => {
    if (!product.isAvailable) return;

    const totalPrice = calculateTotal(selectedQuantity, discountedPrice, unit);
    
    addItem(product, selectedQuantity);

    toast({
      title: t('product.addedToCart'),
      description: `${product.name} - ${formatQuantity(selectedQuantity, unit)} = ${formatCurrency(totalPrice)}`,
    });
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedQuantity(numValue);
    }
  };

  const incrementQuantity = () => setSelectedQuantity(prev => prev + (unit === "kg" ? 0.1 : 1));
  const decrementQuantity = () => setSelectedQuantity(prev => Math.max(unit === "kg" ? 0.1 : 1, prev - (unit === "kg" ? 0.1 : 1)));

  return (
    <Card className="group h-full overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      {/* Product Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/20">
        <img 
          src={product.imageUrl || defaultProductImage} 
          alt={product.name || "Product image"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== defaultProductImage) {
              target.src = defaultProductImage;
            }
          }}
        />
        
        {/* Discount Badge */}
        {hasValidDiscount && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-red-500 text-white text-xs font-medium">
              {product.discountType === "percentage" 
                ? `-${product.discountValue || 0}%` 
                : `-${formatCurrency(parseFloat(product.discountValue || "0"))}`
              }
            </Badge>
          </div>
        )}
        
        {/* Unavailable Overlay */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm font-medium">
              {t('product.outOfStock')}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Category */}
        <div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary font-medium"
            onClick={() => onCategoryClick?.(product.category?.id || 0)}
          >
            {product.category?.name}
          </Button>
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(discountedPrice)}
            </span>
            {hasValidDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(basePrice)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {getUnitLabel(unit)}
            </span>
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={decrementQuantity}
            disabled={!product.isAvailable}
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <Input
            type="number"
            value={selectedQuantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            step={unit === "kg" ? "0.1" : "1"}
            min={unit === "kg" ? "0.1" : "1"}
            className="h-8 w-16 text-center text-sm"
            disabled={!product.isAvailable}
          />
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={incrementQuantity}
            disabled={!product.isAvailable}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={!product.isAvailable}
          className="w-full"
          size="sm"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {formatCurrency(calculateTotal(selectedQuantity, discountedPrice, unit))}
        </Button>
      </CardContent>
    </Card>
  );
}