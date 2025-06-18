import { useState, useMemo, useRef, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CategoryNav from "@/components/menu/category-nav";
import ProductCard from "@/components/menu/product-card";
import CartOverlay from "@/components/cart/cart-overlay";
import { useCartStore } from "@/lib/cart";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { 
  Search, 
  Clock, 
  Phone, 
  MapPin, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Star,
  Plus,
  Settings,
  Package,
  Users
} from "lucide-react";
import type { CategoryWithProducts, ProductWithCategory } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const carouselApiRef = useRef<any>(null);
  const { user } = useAuth();
  const { isOpen: isCartOpen } = useCartStore();
  const { storeSettings } = useStoreSettings();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryWithProducts[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch all products for special offers and search
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
  });

  // Selected category for display
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find(cat => cat.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];

    let products = allProducts;

    // Filter by search query
    if (searchQuery.length > 2) {
      const query = searchQuery.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }

    // Filter by category if selected
    if (selectedCategoryId && selectedCategoryId !== 0) {
      products = products.filter(product => product.categoryId === selectedCategoryId);
    }

    return products;
  }, [allProducts, searchQuery, selectedCategoryId]);

  // Products to display based on search or category
  const displayProducts = useMemo(() => {
    if (searchQuery.length > 2 || selectedCategoryId) {
      return filteredProducts;
    }
    return allProducts; // Show all products when no search/category
  }, [filteredProducts, allProducts, searchQuery, selectedCategoryId]);

  // Special offers - products with discount
  const specialOffers = useMemo(() => {
    return allProducts
      .filter(product => product.discountPercentage && product.discountPercentage > 0)
      .slice(0, 10);
  }, [allProducts]);

  const handleCategorySelect = useCallback((categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery("");
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedCategoryId(null);
    setSearchQuery("");
  }, []);

  const isLoading = categoriesLoading || productsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onResetView={handleResetView} />
      
      {/* Banner Image */}
      {storeSettings?.bannerImage && storeSettings?.showBannerImage !== false && (
        <div 
          className="w-full h-32 sm:h-40 lg:h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${storeSettings.bannerImage})` }}
        />
      )}
      
      <div className="flex overflow-x-hidden">
        <Sidebar 
          categories={categories || []} 
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={handleCategorySelect}
          isLoading={categoriesLoading}
        />

        <main className={`flex-1 p-6 lg:pb-6 overflow-x-hidden ${storeSettings?.showCategoryMenu !== false ? 'pb-24' : 'pb-6'}`}>
          <div className="max-w-7xl mx-auto">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="mb-6">
                {/* Title and Description */}
                {storeSettings?.showTitleDescription !== false && (
                  <>
                    <h1 className="text-3xl font-poppins font-bold text-gray-900 mb-4">
                      {(() => {
                        try {
                          if (searchQuery && searchQuery.length > 2) {
                            return `Результаты поиска: "${searchQuery}"`;
                          }
                          if (selectedCategory?.name) {
                            return selectedCategory.name;
                          }
                          if (storeSettings?.welcomeTitle) {
                            return storeSettings.welcomeTitle;
                          }
                          return "eDAHouse - Домашняя еда на развес";
                        } catch (error) {
                          console.error('Error rendering title:', error);
                          return "eDAHouse - Домашняя еда на развес";
                        }
                      })()}
                    </h1>
                    
                    <p className="text-gray-600 text-lg mb-6">
                      {(() => {
                        try {
                          if (searchQuery && searchQuery.length > 2) {
                            return `Найдено ${displayProducts.length} товаров`;
                          }
                          if (selectedCategory?.description) {
                            return selectedCategory.description;
                          }
                          if (storeSettings?.storeDescription) {
                            return storeSettings.storeDescription;
                          }
                          return "Свежая домашняя еда на развес - выбирайте по вкусу";
                        } catch (error) {
                          console.error('Error rendering description:', error);
                          return "Свежая домашняя еда на развес - выбирайте по вкусу";
                        }
                      })()}
                    </p>
                  </>
                )}

                {/* Compact Store Information */}
                {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && storeSettings && storeSettings?.showInfoBlocks !== false && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
                    {/* Working Hours */}
                    {storeSettings?.workingHours && (
                      <Card className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm sm:text-base">Часы работы</span>
                        </div>
                        <div className="space-y-1">
                          {(() => {
                            try {
                              const workingHours = storeSettings.workingHours;
                              if (!workingHours || typeof workingHours !== 'object') {
                                return <p className="text-gray-500 text-xs">Не указаны</p>;
                              }

                              const entries = Object.entries(workingHours);
                              const dayNames: Record<string, string> = {
                                monday: 'Пн',
                                tuesday: 'Вт', 
                                wednesday: 'Ср',
                                thursday: 'Чт',
                                friday: 'Пт',
                                saturday: 'Сб',
                                sunday: 'Вс'
                              };

                              const validEntries = entries.filter(([day, hours]) => {
                                return hours && typeof hours === 'string' && hours.trim() !== '';
                              });

                              if (validEntries.length === 0) {
                                return <p className="text-gray-500 text-xs">Не указаны</p>;
                              }

                              return validEntries.slice(0, 3).map(([day, hours]) => (
                                <div key={day} className="flex justify-between text-xs sm:text-sm">
                                  <span className="font-medium">{dayNames[day] || day}</span>
                                  <span className="text-gray-600">{String(hours)}</span>
                                </div>
                              ));
                            } catch (error) {
                              console.error('Error rendering working hours:', error);
                              return <p className="text-gray-500 text-xs">Не указаны</p>;
                            }
                          })()}
                        </div>
                      </Card>
                    )}

                    {/* Phone */}
                    {storeSettings?.phone && (
                      <Card className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm sm:text-base">Телефон</span>
                        </div>
                        <a 
                          href={`tel:${storeSettings.phone}`} 
                          className="text-primary hover:text-primary/80 font-medium text-sm sm:text-base"
                        >
                          {storeSettings.phone}
                        </a>
                      </Card>
                    )}

                    {/* Address */}
                    {storeSettings?.address && (
                      <Card className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm sm:text-base">Адрес</span>
                        </div>
                        <p className="text-gray-600 text-xs sm:text-sm">
                          {storeSettings.address}
                        </p>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Поиск блюд..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3 text-lg"
                />
              </div>
            </div>

            {/* Special Offers Section */}
            {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && specialOffers.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <h2 className="text-xl font-semibold">Специальные предложения</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {specialOffers.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {/* Products Grid */}
            {displayProducts.length > 0 && (
              <div className="mb-8">
                {(selectedCategory || searchQuery.length > 2) && (
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">
                      {searchQuery.length > 2 
                        ? `Результаты поиска (${displayProducts.length})` 
                        : selectedCategory?.name || "Товары"
                      }
                    </h2>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {/* No Products Message */}
            {displayProducts.length === 0 && !isLoading && (searchQuery.length > 2 || selectedCategory) && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Товары не найдены
                </h3>
                <p className="text-gray-500">
                  {searchQuery.length > 2 
                    ? `По запросу "${searchQuery}" товары не найдены`
                    : "В этой категории пока нет товаров"
                  }
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Category Navigation */}
      {storeSettings?.showCategoryMenu !== false && (
        <CategoryNav 
          categories={categories || []}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={handleCategorySelect}
        />
      )}

      {/* Bottom Banners */}
      {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && 
       (storeSettings?.bottomBanner1Url || storeSettings?.bottomBanner2Url) && (
        <div className="bg-white">
          <div className="max-w-7xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Banner 1 */}
              {storeSettings?.bottomBanner1Url && (
                <div className="relative overflow-hidden rounded-lg shadow-lg group">
                  {storeSettings?.bottomBanner1Link ? (
                    <a 
                      href={storeSettings.bottomBanner1Link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={storeSettings.bottomBanner1Url}
                        alt="Баннер 1"
                        className="w-full h-64 md:h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                    </a>
                  ) : (
                    <img
                      src={storeSettings.bottomBanner1Url}
                      alt="Баннер 1"
                      className="w-full h-64 md:h-80 object-cover"
                    />
                  )}
                </div>
              )}

              {/* Banner 2 */}
              {storeSettings?.bottomBanner2Url && (
                <div className="relative overflow-hidden rounded-lg shadow-lg group">
                  {storeSettings?.bottomBanner2Link ? (
                    <a 
                      href={storeSettings.bottomBanner2Link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={storeSettings.bottomBanner2Url}
                        alt="Баннер 2"
                        className="w-full h-64 md:h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                    </a>
                  ) : (
                    <img
                      src={storeSettings.bottomBanner2Url}
                      alt="Баннер 2"
                      className="w-full h-64 md:h-80 object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Overlay */}
      {isCartOpen && <CartOverlay />}

      {/* Admin Floating Actions */}
      {(user?.role === 'admin') && (
        <div className="fixed bottom-6 right-6 space-y-3">
          <Button
            onClick={() => window.location.href = '/admin'}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}