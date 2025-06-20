import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/cart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation } from "@/hooks/use-language";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/menu/product-card-modern";
import CartSidebar from "@/components/cart/cart-sidebar";
import { WhatsAppChat } from "@/components/layout/whatsapp-chat";
import { CustomHtml } from "@/components/custom-html";
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Truck, 
  ShoppingBag,
  ChevronRight,
  Sparkles,
  Heart,
  Award
} from "lucide-react";
import type { CategoryWithProducts, ProductWithCategory } from "@shared/schema";

export default function ModernHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { user } = useAuth();
  const { isOpen: isCartOpen } = useCartStore();
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();

  // Fetch data
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryWithProducts[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allProducts = [], isLoading: allProductsLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
  });

  const scrollToMenu = useCallback(() => {
    const menuSection = document.getElementById('menu-section');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    if (searchQuery.length > 2) {
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
    <div className="min-h-screen bg-background">
      <Header onResetView={() => {
        setSelectedCategoryId(null);
        setSearchQuery("");
        setCategoryFilter("all");
      }} />
      
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
        
        {/* Floating Shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-16 w-40 h-40 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-12 max-w-6xl mx-auto">
            <div className="space-y-8 fade-in">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                {t('hero.badge') || "Свежие продукты каждый день"}
              </div>
              
              <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-foreground leading-none tracking-tight">
                {storeSettings?.welcomeTitle || t('welcome.title')}
              </h1>
              
              <p className="text-xl sm:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto font-light leading-relaxed">
                {storeSettings?.welcomeSubtitle || t('welcome.subtitle')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center slide-up">
              <Button 
                size="lg" 
                className="btn-modern text-primary-foreground px-12 py-6 text-xl font-bold shadow-2xl scale-in"
                onClick={scrollToMenu}
              >
                <ShoppingBag className="w-6 h-6 mr-3" />
                {t('welcome.viewMenu')}
              </Button>
              
              {storeSettings?.whatsappNumber && (
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="glass-effect border-2 border-border hover:border-primary px-12 py-6 text-xl font-bold"
                  onClick={() => window.open(`https://wa.me/${storeSettings.whatsappNumber}`, '_blank')}
                >
                  {t('welcome.contact')}
                </Button>
              )}
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-16 fade-in" style={{animationDelay: '0.5s'}}>
              <div className="glass-effect p-6 rounded-2xl text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-lg text-foreground mb-2">Быстрая доставка</h3>
                <p className="text-muted-foreground text-sm">От 30 минут по городу</p>
              </div>
              
              <div className="glass-effect p-6 rounded-2xl text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-lg text-foreground mb-2">Качество</h3>
                <p className="text-muted-foreground text-sm">Только свежие продукты</p>
              </div>
              
              <div className="glass-effect p-6 rounded-2xl text-center">
                <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-lg text-foreground mb-2">Забота</h3>
                <p className="text-muted-foreground text-sm">Индивидуальный подход</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offers Section */}
      {specialOffers.length > 0 && (
        <section className="py-24 bg-gradient-to-br from-surface to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-in">
              <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Star className="w-4 h-4" />
                Специальные предложения
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-6">
                Выгодные акции
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Специальные цены на популярные товары
              </p>
            </div>
            
            <div className="products-grid">
              {specialOffers.map((product, index) => (
                <div key={product.id} className="fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <ProductCard 
                    product={product} 
                    onCategoryClick={setSelectedCategoryId} 
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 fade-in">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-6">
              Категории товаров
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Выберите нужную категорию для быстрого поиска
            </p>
          </div>
          
          <div className="categories-grid">
            <Card 
              className={`modern-card cursor-pointer transition-all duration-300 ${
                !selectedCategoryId ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedCategoryId(null)}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">Все товары</h3>
                <p className="text-muted-foreground text-sm">{allProducts.length} товаров</p>
              </CardContent>
            </Card>
            
            {categories.map((category, index) => (
              <Card 
                key={category.id}
                className={`modern-card cursor-pointer transition-all duration-300 fade-in ${
                  selectedCategoryId === category.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedCategoryId(category.id)}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">{category.icon || '🍽️'}</span>
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2">{category.name}</h3>
                  <p className="text-muted-foreground text-sm">{category.products?.length || 0} товаров</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-24 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center fade-in">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-8">
              Найти нужный товар
            </h2>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pl-14 pr-6 py-6 text-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="menu-section" className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 fade-in">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-6">
              {selectedCategoryId 
                ? categories.find(c => c.id === selectedCategoryId)?.name || "Товары"
                : searchQuery 
                  ? `Результаты поиска: "${searchQuery}"`
                  : "Все товары"
              }
            </h2>
            <p className="text-xl text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'товар' : 'товаров'} найдено
            </p>
          </div>
          
          {filteredProducts.length > 0 ? (
            <div className="products-grid">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className="fade-in" style={{animationDelay: `${index * 0.05}s`}}>
                  <ProductCard 
                    product={product} 
                    onCategoryClick={setSelectedCategoryId} 
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Товары не найдены</h3>
              <p className="text-muted-foreground mb-8">Попробуйте изменить поисковый запрос или выберите другую категорию</p>
              <Button onClick={() => {
                setSearchQuery("");
                setSelectedCategoryId(null);
              }}>
                Показать все товары
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {storeSettings?.storeName || "eDAHouse"}
            </h3>
            <p className="text-muted-foreground mb-8">
              Качественные продукты с доставкой на дом
            </p>
            
            {storeSettings?.whatsappNumber && (
              <Button 
                className="btn-modern"
                onClick={() => window.open(`https://wa.me/${storeSettings.whatsappNumber}`, '_blank')}
              >
                Связаться с нами
              </Button>
            )}
          </div>
        </div>
      </footer>

      {/* Components */}
      <CartSidebar />
      {storeSettings?.whatsappNumber && <WhatsAppChat />}
      {storeSettings?.customFooterHtml && (
        <CustomHtml html={storeSettings.customFooterHtml} type="footer" />
      )}
    </div>
  );
}