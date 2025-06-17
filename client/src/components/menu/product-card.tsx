import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatWeight, calculateTotal } from "@/lib/currency";
import { ShoppingCart, Plus, Minus, Eye } from "lucide-react";
import type { ProductWithCategory } from "@shared/schema";

interface ProductCardProps {
  product: ProductWithCategory;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [selectedWeight, setSelectedWeight] = useState(1.0);
  const { addItem, toggleCart } = useCartStore();
  const { toast } = useToast();

  const pricePerKg = parseFloat(product.pricePerKg);
  const totalPrice = calculateTotal(pricePerKg, selectedWeight);

  const handleWeightChange = (newWeight: number) => {
    if (newWeight >= 0.1 && newWeight <= 99) {
      setSelectedWeight(Number(newWeight.toFixed(1)));
    }
  };

  const handleAddToCart = () => {
    addItem(product, selectedWeight);
    toast({
      title: "Добавлено в корзину",
      description: `${product.name} (${formatWeight(selectedWeight)}) - ${formatCurrency(totalPrice)}`,
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

  const getStockBadge = () => {
    if (product.stockStatus === 'low_stock') {
      return (
        <Badge variant="destructive" className="bg-warning text-warning-foreground">
          Мало
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
          {getStockBadge()}
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-poppins font-semibold text-gray-900 mb-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(pricePerKg)}
            </span>
            <span className="text-sm text-gray-500">за кг</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Weight Selector */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Вес (кг):
            </label>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handleWeightChange(selectedWeight - 0.1)}
                disabled={selectedWeight <= 0.1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={selectedWeight}
                onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0.1)}
                step="0.1"
                min="0.1"
                max="99"
                className="w-16 text-center text-sm h-8"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => handleWeightChange(selectedWeight + 0.1)}
                disabled={selectedWeight >= 99}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Total Price */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Итого:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4"
            style={{ backgroundColor: 'hsl(16, 100%, 60%)', color: 'white' }}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            В корзину
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
