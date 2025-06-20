import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/header";
import CategoryNav from "@/components/menu/category-nav";
import ProductCardClean from "@/components/menu/product-card-clean";
import { Search, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation } from "@/hooks/use-language";
import { formatCurrency } from "@/lib/currency";
import type { ProductWithCategory, CategoryWithProducts } from "@shared/schema";

export default function HomeClean() {
  const { t } = useShopTranslation();
  const { storeSettings } = useStoreSettings();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [] } = useQuery<CategoryWithProducts[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allProducts = [] } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
  });

  const freeDeliveryThreshold = storeSettings?.freeDeliveryThreshold ? 
    parseFloat(storeSettings.freeDeliveryThreshold) : 150;

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    if (searchQuery) {
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategoryId) {
      products = products.filter(product => product.categoryId === selectedCategoryId);
    }

    return products.filter(product => product.isAvailable);
  }, [allProducts, searchQuery, selectedCategoryId]);

  return (
    <div className="min-h-screen bg-background">
      <Header onResetView={() => {
        setSelectedCategoryId(null);
        setSearchQuery("");
      }} />
      
      {/* Clean Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                {storeSettings?.storeName || "eDAHouse"}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {storeSettings?.welcomeTitle || t('welcome.title')}
              </p>
              
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg font-medium"
                onClick={() => {
                  const menuSection = document.getElementById('menu-section');
                  menuSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('menu.orderNow')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu-section" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Наше меню
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Свежеприготовленные блюда из качественных ингредиентов
            </p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Поиск блюд..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-4 text-lg border-2 rounded-xl"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-12">
            <CategoryNav
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={setSelectedCategoryId}
            />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCardClean
                  product={product}
                  onCategoryClick={setSelectedCategoryId}
                />
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">Товары не найдены</p>
            </div>
          )}
        </div>
      </section>

      {/* Simple Info Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Быстрая доставка
              </h3>
              <p className="text-muted-foreground">15-30 минут</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Высокое качество
              </h3>
              <p className="text-muted-foreground">4.9/5 звезд</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Бесплатная доставка
              </h3>
              <p className="text-muted-foreground">от {formatCurrency(freeDeliveryThreshold)}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}