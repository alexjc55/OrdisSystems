import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/header";
import CategoryNav from "@/components/menu/category-nav";
import ProductCardModern from "@/components/menu/product-card-modern";
import { ShoppingCart, Star, Clock, Truck, Heart, Search, Filter, Sparkles, Award, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation } from "@/hooks/use-language";
import { formatCurrency } from "@/lib/currency";
import type { ProductWithCategory, CategoryWithProducts } from "@shared/schema";

export default function HomeRedesigned() {
  const { t } = useShopTranslation();
  const { storeSettings } = useStoreSettings();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "special">("all");

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

    if (categoryFilter === "special") {
      products = products.filter(product => product.isSpecialOffer);
    }

    return products.filter(product => product.isAvailable);
  }, [allProducts, searchQuery, selectedCategoryId, categoryFilter]);

  const specialOffers = useMemo(() => {
    return allProducts.filter(product => product.isSpecialOffer && product.isAvailable).slice(0, 6);
  }, [allProducts]);

  const popularProducts = useMemo(() => {
    return allProducts.filter(product => product.isAvailable).slice(0, 8);
  }, [allProducts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Header onResetView={() => {
        setSelectedCategoryId(null);
        setSearchQuery("");
        setCategoryFilter("all");
      }} />
      
      {/* Hero Section - Completely Redesigned */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
        {/* Revolutionary Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/8"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(120,119,198,0.12),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,119,198,0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(120,119,198,0.04)_120deg,transparent_240deg)]"></div>
        
        {/* Premium Floating Elements */}
        <div className="absolute top-[8%] left-[3%] w-72 h-72 bg-gradient-to-br from-primary/8 via-accent/6 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-gradient-to-br from-secondary/6 via-primary/4 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-[50%] left-[8%] w-56 h-56 bg-gradient-to-br from-accent/10 via-secondary/8 to-transparent rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute top-[15%] right-[12%] w-40 h-40 bg-gradient-to-br from-primary/12 via-accent/10 to-transparent rounded-full blur-xl animate-pulse delay-2000"></div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            {/* Ultimate Premium Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-10"
            >
              <Badge className="px-10 py-5 text-lg font-black bg-gradient-to-r from-primary/25 via-accent/20 to-secondary/25 text-primary border-2 border-primary/40 hover:from-primary/35 hover:via-accent/30 hover:to-secondary/35 transition-all duration-700 shadow-2xl backdrop-blur-lg rounded-2xl">
                <Sparkles className="mr-3 h-6 w-6" />
                Премиум готовая еда • Свежесть гарантирована
              </Badge>
            </motion.div>

            {/* Massive Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-7xl md:text-9xl lg:text-[12rem] font-black mb-8 leading-[0.8] tracking-tighter"
            >
              <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent drop-shadow-2xl filter">
                {storeSettings?.storeName || "eDAHouse"}
              </span>
              <span className="block text-4xl md:text-6xl lg:text-7xl font-bold text-muted-foreground/70 mt-6 tracking-normal">
                Ready-to-Eat Excellence
              </span>
            </motion.h1>

            {/* Premium Description */}
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1 }}
              className="text-2xl md:text-3xl lg:text-4xl text-muted-foreground mb-16 max-w-5xl mx-auto leading-relaxed font-medium"
            >
              {storeSettings?.welcomeTitle || t('welcome.title')}
            </motion.p>

            {/* Revolutionary CTA Section */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="flex flex-col xl:flex-row gap-10 justify-center items-center mb-24"
            >
              <Button 
                size="lg" 
                className="group relative px-20 py-12 text-2xl font-black bg-gradient-to-r from-primary via-accent to-secondary hover:from-primary/90 hover:via-accent/90 hover:to-secondary/90 shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:-translate-y-4 hover:scale-115 overflow-hidden border-0 rounded-3xl"
                onClick={() => {
                  const menuSection = document.getElementById('menu-section');
                  menuSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/30 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100"></div>
                <ShoppingCart className="mr-5 h-8 w-8 group-hover:rotate-12 transition-transform duration-700" />
                <span className="relative z-10">{t('menu.orderNow')}</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="px-20 py-12 text-2xl font-bold border-3 border-primary/60 hover:border-primary hover:bg-primary/20 backdrop-blur-2xl transition-all duration-700 hover:scale-110 rounded-3xl shadow-xl"
              >
                <Star className="mr-5 h-7 w-7" />
                Популярные блюда
              </Button>
            </motion.div>

            {/* Premium Feature Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto"
            >
              <div className="group p-12 rounded-3xl bg-gradient-to-br from-card/80 via-card/70 to-card/80 backdrop-blur-2xl border-2 border-border/40 hover:border-primary/50 transition-all duration-700 hover:scale-115 hover:shadow-2xl">
                <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-2xl">
                  <Clock className="h-12 w-12 text-primary" />
                </div>
                <h3 className="font-black text-2xl text-foreground mb-4">{t('delivery.fastDelivery')}</h3>
                <p className="text-muted-foreground text-xl leading-relaxed">Молниеносная доставка за 15-30 минут по всему городу</p>
              </div>
              
              <div className="group p-12 rounded-3xl bg-gradient-to-br from-card/80 via-card/70 to-card/80 backdrop-blur-2xl border-2 border-border/40 hover:border-yellow-500/50 transition-all duration-700 hover:scale-115 hover:shadow-2xl">
                <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-yellow-500/40 to-orange-500/40 flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-2xl">
                  <Award className="h-12 w-12 text-yellow-500" />
                </div>
                <h3 className="font-black text-2xl text-foreground mb-4">Премиум качество</h3>
                <p className="text-muted-foreground text-xl leading-relaxed">4.9/5 звезд • 2000+ довольных клиентов</p>
              </div>
              
              <div className="group p-12 rounded-3xl bg-gradient-to-br from-card/80 via-card/70 to-card/80 backdrop-blur-2xl border-2 border-border/40 hover:border-green-500/50 transition-all duration-700 hover:scale-115 hover:shadow-2xl">
                <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-green-500/40 to-emerald-500/40 flex items-center justify-center group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-2xl">
                  <Shield className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="font-black text-2xl text-foreground mb-4">Гарантия свежести</h3>
                <p className="text-muted-foreground text-xl leading-relaxed">Бесплатная доставка от {formatCurrency(freeDeliveryThreshold)}</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Menu Section */}
      <section id="menu-section" className="py-20 bg-gradient-to-b from-background to-muted/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Badge className="mb-6 px-6 py-3 text-lg font-bold bg-primary/20 text-primary border-primary/30">
              Наше меню
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black text-foreground mb-6">
              Изысканные <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">блюда</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Свежеприготовленные блюда из качественных ингредиентов
            </p>
          </motion.div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-6 mb-12 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Поиск блюд..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg border-2 border-border/50 focus:border-primary/50 rounded-2xl"
              />
            </div>
            <Button
              variant={categoryFilter === "special" ? "default" : "outline"}
              onClick={() => setCategoryFilter(categoryFilter === "special" ? "all" : "special")}
              className="px-8 py-6 text-lg font-semibold rounded-2xl"
            >
              <Filter className="mr-2 h-5 w-5" />
              Специальные предложения
            </Button>
          </div>

          {/* Category Navigation */}
          <div className="mb-16">
            <CategoryNav
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={setSelectedCategoryId}
            />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <ProductCardModern
                  product={product}
                  onCategoryClick={setSelectedCategoryId}
                />
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl text-muted-foreground">Товары не найдены</p>
            </div>
          )}
        </div>
      </section>

      {/* Special Offers Section */}
      {specialOffers.length > 0 && (
        <section className="py-20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <Badge className="mb-6 px-6 py-3 text-lg font-bold bg-red-500/20 text-red-600 border-red-500/30">
                🔥 Горячие предложения
              </Badge>
              <h2 className="text-5xl md:text-6xl font-black text-foreground mb-6">
                Специальные <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">скидки</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {specialOffers.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <ProductCardModern
                    product={product}
                    onCategoryClick={setSelectedCategoryId}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}