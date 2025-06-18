import { useState, useMemo, useRef } from "react";
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
  const { data: allProducts = [], isLoading: allProductsLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
  });

  // Fetch products for selected category
  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products", selectedCategoryId],
    queryFn: () => fetch(`/api/products?categoryId=${selectedCategoryId}`).then(res => res.json()),
    enabled: selectedCategoryId !== null,
  });

  // Search products
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products/search", searchQuery],
    queryFn: () => fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`).then(res => res.json()),
    enabled: searchQuery.length > 2,
  });

  const selectedCategory = useMemo(() => {
    return categories.find(cat => cat.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery("");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategoryId(null);
  };

  // Filter and prepare products for display
  const getFilteredProducts = () => {
    let baseProducts = [];
    
    if (searchQuery.length > 2) {
      baseProducts = searchResults || [];
    } else if (selectedCategoryId === 0) {
      // All products view
      baseProducts = allProducts || [];
    } else if (selectedCategoryId !== null) {
      // Single category view
      baseProducts = products || [];
    } else {
      return [];
    }

    // Filter by availability
    let filtered = baseProducts.filter(product => product.isAvailable !== false);

    // Apply category filter for "All Products" view
    if (selectedCategoryId === 0 && categoryFilter !== "all") {
      filtered = filtered.filter(product => product.categoryId === parseInt(categoryFilter));
    }

    // Apply discount filter
    if (discountFilter === "with_discount") {
      filtered = filtered.filter(product => 
        product.isSpecialOffer || (product.discountValue && parseFloat(product.discountValue) > 0)
      );
    } else if (discountFilter === "without_discount") {
      filtered = filtered.filter(product => 
        !product.isSpecialOffer && (!product.discountValue || parseFloat(product.discountValue) === 0)
      );
    }

    return filtered;
  };

  const displayProducts = getFilteredProducts();
  const isLoading = searchQuery.length > 2 ? searchLoading : (selectedCategoryId === null ? allProductsLoading : productsLoading);
  
  // Get special offers (products marked as special offers)
  const specialOffers = allProducts?.filter(product => product.isAvailable !== false && product.isSpecialOffer === true) || [];
  
  // Calculate total slides for carousel
  const totalSlides = Math.ceil(specialOffers.length / 3);
  
  // Handle carousel navigation
  const goToSlide = (slideIndex: number) => {
    if (carouselApiRef.current) {
      carouselApiRef.current.scrollTo(slideIndex);
      setCurrentSlide(slideIndex);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />
      
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
              {!selectedCategory && searchQuery.length <= 2 && storeSettings && storeSettings?.showInfoBlocks !== false && (
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
                                <span className="text-gray-600">{dayNames[day] || day}</span>
                                <span className="font-medium">{hours as string}</span>
                              </div>
                            ));
                          } catch (error) {
                            console.error('Error rendering working hours:', error);
                            return <p className="text-gray-500 text-xs">Ошибка загрузки</p>;
                          }
                        })()}
                      </div>
                    </Card>
                  )}

                  {/* Contact Information */}
                  {(storeSettings?.contactPhone || storeSettings?.contactEmail) && (
                    <Card className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm sm:text-base">Контакты</span>
                      </div>
                      <div className="space-y-1">
                        {storeSettings.contactPhone && (
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-600">Телефон:</span>
                            <br />
                            <span className="font-medium">{storeSettings.contactPhone}</span>
                          </div>
                        )}
                        {storeSettings.contactEmail && (
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-600">Email:</span>
                            <br />
                            <span className="font-medium">{storeSettings.contactEmail}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Delivery & Payment */}
                  {(storeSettings?.deliveryInfo || storeSettings?.paymentInfo) && (
                    <Card className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm sm:text-base">Оплата и доставка</span>
                      </div>
                      <div className="space-y-2">
                        {storeSettings.deliveryInfo && (
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-600">Доставка:</span>
                            <br />
                            <span className="font-medium">{storeSettings.deliveryInfo}</span>
                          </div>
                        )}
                        {storeSettings.paymentInfo && (
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-600">Оплата:</span>
                            <br />
                            <span className="font-medium">{storeSettings.paymentInfo}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Поиск блюд..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white border-gray-300"
              />
            </div>
          </div>

          {/* Special Offers or Category View */}
          {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && (
            <div>
              {/* Category Overview */}
              {categories && categories.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <Package className="mr-3 h-6 w-6 text-primary" />
                      <h2 className="text-2xl font-poppins font-bold text-gray-900">Категории</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => setSelectedCategoryId(0)}
                        size="lg"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3"
                      >
                        <Package className="mr-2 h-5 w-5" />
                        Все товары
                      </Button>
                      <Badge variant="default" className="bg-primary">
                        {categories.length} категорий
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map((category) => (
                      <Card 
                        key={category.id} 
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleCategorySelect(category.id)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="text-4xl mb-3">
                            {category.icon || '📦'}
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {category.description || "Вкусные блюда"}
                          </p>
                          <Badge variant="default" className="mt-2 bg-primary">
                            {category.products.length} блюд
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Offers Section */}
              {specialOffers.length > 0 && storeSettings?.showSpecialOffers !== false && (
                <div className="mt-12">
                  <div className="flex items-center mb-6">
                    <span className="mr-3 text-2xl">🔥</span>
                    <h2 className="text-2xl font-poppins font-bold text-gray-900">Специальные предложения</h2>
                  </div>
                  
                  {allProductsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                          <div className="w-full h-48 bg-gray-200"></div>
                          <div className="p-4 space-y-3">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full relative">
                      <Carousel
                        opts={{
                          align: "start",
                          loop: false,
                          slidesToScroll: 3,
                        }}
                        className="w-full mx-auto"
                        setApi={(api) => {
                          carouselApiRef.current = api;
                          if (api) {
                            api.on('select', () => {
                              setCurrentSlide(api.selectedScrollSnap());
                            });
                          }
                        }}
                      >
                        <CarouselContent className="ml-0 flex items-stretch gap-2.5">
                          {specialOffers.map((product) => (
                            <CarouselItem 
                              key={product.id} 
                              className="min-w-0 shrink-0 grow-0 basis-1/3 flex flex-col flex-shrink-0 pl-[0px] pr-[0px]"
                            >
                              <div className="relative flex-1 flex">
                                <div className="transform scale-90 origin-center w-full relative">
                                  <ProductCard 
                                    product={product} 
                                    onCategoryClick={handleCategorySelect}
                                  />
                                  <Badge className="absolute top-2 left-2 bg-orange-500 text-white z-10 text-xs">
                                    <Star className="w-2 h-2 mr-1" />
                                    {storeSettings?.discountBadgeText || "Скидка"}
                                  </Badge>
                                </div>
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="flex" />
                        <CarouselNext className="flex" />
                      </Carousel>
                      
                      {/* Carousel indicators */}
                      <div className="flex justify-center items-center mt-4 space-x-4">
                        {/* Dots indicator */}
                        <div className="flex space-x-2">
                          {Array.from({ length: totalSlides }).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => goToSlide(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentSlide 
                                  ? 'bg-orange-500' 
                                  : 'bg-gray-300 hover:bg-orange-400'
                              }`}
                              aria-label={`Go to slide ${index + 1}`}
                            />
                          ))}
                        </div>
                        
                        {/* Mobile swipe hint */}
                        <div className="md:hidden flex items-center text-xs text-gray-400">
                          <span className="mr-1">👆</span>
                          <span>Свайпайте</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Products Grid - Show when category is selected or showing all */}
          {(selectedCategoryId !== null || searchQuery.length > 2) && (
            <div className="mb-8">
              {/* Filters for All Products/Category View */}
              {selectedCategoryId !== null && (
                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedCategoryId === 0 ? "Все товары" : selectedCategory?.name}
                    </h2>
                    {selectedCategory?.description && selectedCategoryId !== 0 && (
                      <p className="text-gray-600">{selectedCategory.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select 
                      value={selectedCategoryId === 0 ? categoryFilter : selectedCategoryId.toString()} 
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedCategoryId(0);
                          setCategoryFilter("all");
                        } else {
                          setSelectedCategoryId(parseInt(value));
                          setCategoryFilter("all");
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Категория" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все категории</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={discountFilter} onValueChange={setDiscountFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Все товары" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все товары</SelectItem>
                        <SelectItem value="with_discount">Со скидкой</SelectItem>
                        <SelectItem value="without_discount">Без скидки</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                      <div className="w-full h-48 bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onCategoryClick={handleCategorySelect}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Package className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    {searchQuery.length > 2 ? "Ничего не найдено" : "Нет товаров"}
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
          )}
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