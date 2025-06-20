import { useState, useMemo, useRef, useCallback, memo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useShopTranslation } from "@/hooks/use-language";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CategoryNav from "@/components/menu/category-nav";
import ProductCard from "@/components/menu/product-card";
import CartSidebar from "@/components/cart/cart-sidebar";
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
  const params = useParams();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const carouselApiRef = useRef<any>(null);
  const { user } = useAuth();
  const { isOpen: isCartOpen } = useCartStore();
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();

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

  const handleCategorySelect = useCallback((categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSearchQuery("");
    
    // Navigate to appropriate URL
    if (categoryId === 0) {
      navigate('/all-products');
    } else if (categoryId !== null) {
      navigate(`/category/${categoryId}`);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleResetView = useCallback(() => {
    setSelectedCategoryId(null);
    setSearchQuery("");
    setCategoryFilter("all");
    setDiscountFilter("all");
    navigate('/');
  }, [navigate]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedCategoryId(null);
  }, []);

  // Handle URL parameters for direct category navigation
  useEffect(() => {
    if (params.categoryId) {
      const categoryId = parseInt(params.categoryId);
      if (!isNaN(categoryId)) {
        setSelectedCategoryId(categoryId);
        setSearchQuery("");
      }
    } else if (location === '/all-products') {
      setSelectedCategoryId(0);
      setSearchQuery("");
    }
  }, [params.categoryId, location]);

  // Filter and prepare products for display with memoization
  const displayProducts = useMemo(() => {
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
  }, [searchQuery, searchResults, selectedCategoryId, allProducts, products, categoryFilter, discountFilter]);
  const isLoading = searchQuery.length > 2 ? searchLoading : (selectedCategoryId === null ? allProductsLoading : productsLoading);
  
  // Get special offers (products marked as special offers)
  const specialOffers = allProducts?.filter(product => product.isAvailable !== false && product.isSpecialOffer === true) || [];
  
  // Calculate total slides for carousel - simplified approach
  const totalSlides = Math.max(1, specialOffers.length);
  
  // Handle carousel navigation
  const goToSlide = (slideIndex: number) => {
    if (carouselApiRef.current) {
      carouselApiRef.current.scrollTo(slideIndex);
      setCurrentSlide(slideIndex);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden pt-16">
      <Header onResetView={handleResetView} />
      
      {/* Modern Hero Banner */}
      {storeSettings?.bannerImage && storeSettings?.showBannerImage !== false && (
        <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center transform scale-105 hover:scale-100 transition-transform duration-700"
            style={{ backgroundImage: `url(${storeSettings.bannerImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30"></div>
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-white px-6 max-w-4xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  {storeSettings?.storeName || "eDAHouse"}
                </span>
              </h1>
              <p className="text-xl sm:text-2xl lg:text-3xl font-light opacity-90 mb-8">
                {storeSettings?.welcomeTitle || "Свежие продукты каждый день"}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <div className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 transition-colors">
                  <span className="text-sm font-medium">🚚 Быстрая доставка</span>
                </div>
                <div className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 transition-colors">
                  <span className="text-sm font-medium">🍃 Свежие продукты</span>
                </div>
                <div className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 hover:bg-white/30 transition-colors">
                  <span className="text-sm font-medium">⭐ Высокое качество</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
              {/* Modern Title and Description */}
              {storeSettings?.showTitleDescription !== false && (
                <div className="text-center mb-12">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                      {(() => {
                        try {
                          if (searchQuery && searchQuery.length > 2) {
                            return `${t('searchResults')}: "${searchQuery}"`;
                          }
                          if (selectedCategory?.name) {
                            return selectedCategory.name;
                          }
                          if (storeSettings?.welcomeTitle) {
                            return storeSettings.welcomeTitle;
                          }
                          return t('defaultWelcomeTitle');
                        } catch (error) {
                          console.error('Error rendering title:', error);
                          return t('defaultWelcomeTitle');
                        }
                      })()}
                    </span>
                  </h1>
                  
                  <div className="max-w-3xl mx-auto">
                    <p className="text-xl sm:text-2xl text-gray-600 font-light leading-relaxed mb-8">
                      {(() => {
                        try {
                          if (searchQuery && searchQuery.length > 2) {
                            return `${t('foundItems', { count: displayProducts.length })}`;
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
                    <div className="w-24 h-1 bg-gradient-to-r from-primary to-orange-500 mx-auto rounded-full"></div>
                  </div>
                </div>
              )}

              {/* Modern Store Information Cards */}
              {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && storeSettings && storeSettings?.showInfoBlocks !== false && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  {/* Working Hours */}
                  {storeSettings?.workingHours && (
                    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                            <Clock className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-semibold text-lg text-gray-800">{t('workingHours')}</span>
                        </div>
                        <div className="space-y-2">
                        {(() => {
                          try {
                            const workingHours = storeSettings.workingHours;
                            if (!workingHours || typeof workingHours !== 'object') {
                              return <p className="text-gray-500 text-xs">{t('notSpecified')}</p>;
                            }

                            const dayNames: Record<string, string> = {
                              monday: t('days.mon'),
                              tuesday: t('days.tue'), 
                              wednesday: t('days.wed'),
                              thursday: t('days.thu'),
                              friday: t('days.fri'),
                              saturday: t('days.sat'),
                              sunday: t('days.sun')
                            };

                            // Define day order based on store settings
                            const dayOrder = storeSettings?.weekStartDay === 'sunday' 
                              ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                              : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                            
                            const validEntries = dayOrder
                              .filter(day => workingHours[day] && typeof workingHours[day] === 'string' && workingHours[day].trim() !== '')
                              .map(day => [day, workingHours[day]]);

                            if (validEntries.length === 0) {
                              return <p className="text-gray-500 text-xs">{t('notSpecified')}</p>;
                            }

                            // Group consecutive days with same hours
                            const groupedHours: Array<{days: string[], hours: string}> = [];
                            let currentGroup: {days: string[], hours: string} | null = null;

                            validEntries.forEach(([day, hours]) => {
                              if (currentGroup && currentGroup.hours === hours) {
                                currentGroup.days.push(day);
                              } else {
                                if (currentGroup) {
                                  groupedHours.push(currentGroup);
                                }
                                currentGroup = { days: [day], hours: hours as string };
                              }
                            });

                            if (currentGroup) {
                              groupedHours.push(currentGroup);
                            }

                            return groupedHours.map((group, index) => {
                              const dayDisplay = group.days.length === 1 
                                ? dayNames[group.days[0]]
                                : group.days.length > 2 && 
                                  dayOrder.indexOf(group.days[group.days.length - 1]) - dayOrder.indexOf(group.days[0]) === group.days.length - 1
                                  ? `${dayNames[group.days[0]]}-${dayNames[group.days[group.days.length - 1]]}`
                                  : group.days.map(day => dayNames[day]).join(', ');

                              return (
                                <div key={index} className="flex justify-between text-xs sm:text-sm">
                                  <span className="text-gray-600">{dayDisplay}</span>
                                  <span className="font-medium">{group.hours}</span>
                                </div>
                              );
                            });
                          } catch (error) {
                            console.error('Error rendering working hours:', error);
                            return <p className="text-gray-500 text-xs">{t('loadingError')}</p>;
                          }
                        })()}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Contact Information */}
                  {(storeSettings?.contactPhone || storeSettings?.contactEmail) && (
                    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                            <Phone className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-semibold text-lg text-gray-800">{t('contacts')}</span>
                        </div>
                      <div className="space-y-1">
                        {storeSettings.contactPhone && (
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-600">{t('phone')}:</span>
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
                      </div>
                    </Card>
                  )}

                  {/* Delivery & Payment */}
                  {(storeSettings?.deliveryInfo || storeSettings?.paymentInfo) && (
                    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                            <CreditCard className="h-5 w-5 text-white" />
                          </div>
                          <span className="font-semibold text-lg text-gray-800">Оплата и доставка</span>
                        </div>
                        <div className="space-y-3">
                          {storeSettings.deliveryInfo && (
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-sm font-medium mb-1">{t('delivery')}:</span>
                              <span className="text-gray-800 font-semibold">{storeSettings.deliveryInfo}</span>
                            </div>
                          )}
                          {storeSettings.paymentInfo && (
                            <div className="flex flex-col">
                              <span className="text-gray-500 text-sm font-medium mb-1">{t('payment')}:</span>
                              <span className="text-gray-800 font-semibold">{storeSettings.paymentInfo}</span>
                            </div>
                          )}
                        </div>
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
                placeholder={t('searchPlaceholder')}
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
                      <h2 className="text-2xl font-poppins font-bold text-gray-900">{t('categories')}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="default" className="bg-primary">
                        {t('categoriesCount', { count: categories.length })}
                      </Badge>
                      <Button
                        onClick={() => setSelectedCategoryId(0)}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {t('allProducts')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 min-w-0" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
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
                          slidesToScroll: 1,
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
                              className="min-w-0 shrink-0 grow-0 basis-full md:basis-1/3 flex flex-col flex-shrink-0 pl-[0px] pr-[0px]"
                            >
                              <div className="relative flex-1 flex">
                                <div className="transform scale-90 origin-center w-full relative">
                                  <ProductCard 
                                    product={product} 
                                    onCategoryClick={handleCategorySelect}
                                  />
                                  <Badge className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-orange-500 text-white z-10 text-xs">
                                    <Star className="w-2 h-2 mr-1 rtl:mr-0 rtl:ml-1" />
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
                        {/* Mobile carousel dots fix */}
                        <style dangerouslySetInnerHTML={{
                          __html: `
                            button.carousel-dot:not([role="switch"]):not([data-state]) {
                              display: block !important;
                              width: 10px !important;
                              height: 10px !important;
                              border-radius: 50% !important;
                              border: none !important;
                              outline: none !important;
                              padding: 0 !important;
                              margin: 0 !important;
                              flex: none !important;
                              min-width: 10px !important;
                              min-height: 10px !important;
                              max-width: 10px !important;
                              max-height: 10px !important;
                              box-sizing: border-box !important;
                            }
                          `
                        }} />
                        {/* Dots indicator */}
                        <div className="flex space-x-4">
                          {Array.from({ length: totalSlides }).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => goToSlide(index)}
                              className="carousel-dot"
                              style={{ 
                                backgroundColor: index === currentSlide ? '#f97316' : '#d1d5db',
                                transition: 'background-color 0.2s ease'
                              }}
                              aria-label={`Go to slide ${index + 1}`}
                            />
                          ))}
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
                <div className="mb-6 flex flex-col gap-4 items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedCategoryId === 0 ? "Все товары" : selectedCategory?.name}
                    </h2>
                    {selectedCategory?.description && selectedCategoryId !== 0 && (
                      <p className="text-gray-600">{selectedCategory.description}</p>
                    )}
                  </div>
                  <div className="flex flex-row gap-3 w-full">
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
                      <SelectTrigger className="w-1/2 sm:w-48">
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
                      <SelectTrigger className="w-1/2 sm:w-40">
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

      {/* Bottom Banners */}
      {storeSettings?.showBottomBanners && (storeSettings?.bottomBanner1Url || storeSettings?.bottomBanner2Url) && (
        <div className="mt-16 mb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
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
      <CartSidebar />


    </div>
  );
}