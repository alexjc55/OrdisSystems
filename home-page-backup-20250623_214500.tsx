/**
 * HOME PAGE BACKUP - Created June 23, 2025 21:45
 * 
 * This backup includes the current state of the home page with:
 * - Multi-language support (Russian, English, Hebrew)
 * - RTL layout support for Hebrew interface
 * - Product filtering and search functionality
 * - Shopping cart integration
 * - Mobile-responsive design
 * - Special offers carousel with Swiper
 * - Information blocks system
 * - Category navigation and product display
 * - All existing features and UI patterns preserved
 * 
 * Features included:
 * - Dynamic category selection and URL routing
 * - Product search with real-time results
 * - Special offers carousel with navigation
 * - Information blocks positioning system
 * - Working hours and contact information display
 * - Delivery and payment information cards
 * - Mobile-optimized layout and interactions
 */

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
import { useShopTranslation, useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CategoryNav from "@/components/menu/category-nav";
import ProductCard from "@/components/menu/product-card";
import CartSidebar from "@/components/cart/cart-sidebar";
import { useCartStore } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
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
  Users,
  Sparkles
} from "lucide-react";
import type { CategoryWithCount, ProductWithCategories } from "@shared/schema";

// InfoBlocks Component for reusable information cards
const InfoBlocks = memo(({ storeSettings, t, currentLanguage }: {
  storeSettings: any;
  t: (key: string) => string;
  currentLanguage: string;
}) => {
  if (!storeSettings || storeSettings.showInfoBlocks === false) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      {/* Left Column: Working Hours and Contacts */}
      <div className="space-y-6">
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
              <div className={`space-y-2 px-0 ${currentLanguage === 'he' ? 'mr-12 pl-4' : 'ml-12 pr-4'}`}>
              {(() => {
                try {
                  const workingHours = storeSettings.workingHours;
                  if (!workingHours || typeof workingHours !== 'object') {
                    return <p className="text-gray-500 text-sm">{t('notSpecified')}</p>;
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

                  const dayOrder = storeSettings?.weekStartDay === 'sunday' 
                    ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                    : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  
                  const validEntries = dayOrder
                    .filter(day => workingHours[day] && typeof workingHours[day] === 'string' && workingHours[day].trim() !== '')
                    .map(day => [day, workingHours[day]]);

                  if (validEntries.length === 0) {
                    return <p className="text-gray-500 text-sm">{t('notSpecified')}</p>;
                  }

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

                  return (
                    <div className="space-y-2">
                      {groupedHours.map((group, index) => {
                        const daysText = group.days.length === 1 
                          ? dayNames[group.days[0]]
                          : group.days.length === 2
                          ? `${dayNames[group.days[0]]}, ${dayNames[group.days[group.days.length - 1]]}`
                          : `${dayNames[group.days[0]]} - ${dayNames[group.days[group.days.length - 1]]}`;
                        
                        return (
                          <div key={index} className="text-base sm:text-lg flex justify-between">
                            <span className="font-bold">{daysText}:</span>
                            <span className="text-gray-700">{group.hours}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering working hours:', error);
                  return <p className="text-gray-500 text-sm">{t('loadingError')}</p>;
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
              <div className={`space-y-2 px-0 ${currentLanguage === 'he' ? 'mr-12 pl-4' : 'ml-12 pr-4'}`}>
                {storeSettings.contactPhone && (
                  <div className="text-base sm:text-lg flex justify-between">
                    <span className="text-gray-700 font-bold">{t('phone')}:</span>
                    <span className="text-gray-700">{storeSettings.contactPhone}</span>
                  </div>
                )}
                {storeSettings.contactEmail && (
                  <div className="text-base sm:text-lg flex justify-between">
                    <span className="text-gray-700 font-bold">Email:</span>
                    <span className="text-gray-700 break-all">{storeSettings.contactEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Right Column: Delivery & Payment */}
      {(storeSettings?.deliveryInfo || storeSettings?.paymentInfo) && (
        <div className="flex">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden flex-1 flex flex-col">
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-lg text-gray-800">Оплата и доставка</span>
              </div>
              <div className={`space-y-4 flex-1 px-0 ${currentLanguage === 'he' ? 'mr-12 pl-4' : 'ml-12 pr-4'}`}>
                {storeSettings.deliveryInfo && (
                  <div>
                    <span className="text-gray-700 text-base font-bold block mb-2">{t('delivery')}:</span>
                    <span className="text-gray-800 text-base leading-relaxed">{storeSettings.deliveryInfo}</span>
                  </div>
                )}
                {storeSettings.paymentInfo && (
                  <div>
                    <span className="text-gray-700 text-base font-bold block mb-2">{t('payment')}:</span>
                    <span className="text-gray-800 text-base leading-relaxed">{storeSettings.paymentInfo}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
});

export default function Home() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const swiperRef = useRef<any>(null);
  const { user } = useAuth();
  const { isOpen: isCartOpen, addItem } = useCartStore();
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch all products for special offers and search
  const { data: allProducts = [], isLoading: allProductsLoading } = useQuery<ProductWithCategories[]>({
    queryKey: ["/api/products"],
  });

  // Fetch products for selected category
  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithCategories[]>({
    queryKey: ["/api/products", selectedCategoryId],
    queryFn: () => fetch(`/api/products?categoryId=${selectedCategoryId}`).then(res => res.json()),
    enabled: selectedCategoryId !== null,
    staleTime: 0, // Always refetch when category changes
  });

  // Search products
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<ProductWithCategories[]>({
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

  const handleCategoryFilterChange = useCallback((value: string) => {
    setCategoryFilter(value);
    if (value === "all") {
      // Reset to all products view
      setSelectedCategoryId(0);
      navigate('/all-products');
    } else {
      // Navigate to specific category
      const categoryId = parseInt(value);
      setSelectedCategoryId(categoryId);
      navigate(`/category/${categoryId}`);
    }
  }, [navigate]);

  // Get special offers (products marked as special offers from active categories only)
  const specialOffers = useMemo(() => {
    if (!allProducts || !categories) return [];
    
    return allProducts.filter(product => {
      const hasActiveCategory = product.categories?.some(cat => cat.isActive);
      return product.isAvailable !== false && 
             product.isSpecialOffer === true && 
             hasActiveCategory;
    });
  }, [allProducts, categories]);

  // Display products logic
  const displayProducts = useMemo(() => {
    let productsToShow: ProductWithCategories[] = [];

    if (searchQuery && searchQuery.length > 2) {
      productsToShow = searchResults;
    } else if (categoryFilter !== "all") {
      // Use category filter when it's set (overrides selectedCategoryId)
      const categoryId = parseInt(categoryFilter);
      productsToShow = allProducts.filter(product => 
        product.categories?.some(cat => cat.id === categoryId)
      );
    } else if (selectedCategoryId === 0) {
      // Show all products
      productsToShow = allProducts;
    } else if (selectedCategoryId !== null && products) {
      productsToShow = products;
    } else {
      productsToShow = [];
    }

    // Apply discount filter
    if (discountFilter === "discount") {
      productsToShow = productsToShow.filter(product => product.isSpecialOffer);
    }

    return productsToShow;
  }, [searchQuery, searchResults, selectedCategoryId, allProducts, products, categoryFilter, discountFilter]);

  // URL parameters handling
  useEffect(() => {
    const pathParts = location.split('/');
    if (pathParts[1] === 'category' && pathParts[2]) {
      const categoryId = parseInt(pathParts[2]);
      if (!isNaN(categoryId) && categoryId !== selectedCategoryId) {
        setSelectedCategoryId(categoryId);
        setCategoryFilter(categoryId.toString());
      }
    } else if (pathParts[1] === 'all-products' && selectedCategoryId !== 0) {
      setSelectedCategoryId(0);
      setCategoryFilter("all");
    } else if (pathParts[1] === '' && selectedCategoryId !== null) {
      setSelectedCategoryId(null);
      setCategoryFilter("all");
    }
  }, [location, selectedCategoryId]);
  
  // For Embla carousel, we don't need complex page calculation
  // Each slide is individual, navigation works slide by slide
  const slidesPerPage = isMobile ? 1 : 3;
  const totalSlides = specialOffers.length;
  const totalPages = Math.ceil(totalSlides / slidesPerPage);
  
  // Handle swiper navigation
  const goToSlide = (pageIndex: number) => {
    if (swiperRef.current && swiperRef.current.swiper) {
      const slideIndex = pageIndex * slidesPerPage;
      swiperRef.current.swiper.slideTo(slideIndex);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden pt-16">
      <Header onResetView={handleResetView} />
      
      {/* Simple Banner Image */}
      {storeSettings?.bannerImage && storeSettings?.showBanner !== false && (
        <div className="w-full h-40 md:h-64 lg:h-80 overflow-hidden bg-gray-200">
          <img 
            src={storeSettings.bannerImage} 
            alt="Store Banner" 
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}

      <div className="flex bg-gray-50">
        <Sidebar />
        
        <main className="flex-1 px-0 max-w-none">
          {/* Information Blocks at top position */}
          {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && storeSettings && 
           storeSettings.showInfoBlocks !== false && storeSettings.infoBlocksPosition === "top" && (
            <div className="px-6 pt-6">
              <InfoBlocks 
                storeSettings={storeSettings} 
                t={t} 
                currentLanguage={currentLanguage} 
              />
            </div>
          )}

          {/* Category Navigation */}
          <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
            <CategoryNav 
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={handleCategorySelect}
              isLoading={categoriesLoading}
            />
          </div>

          {/* Main Content Area */}
          <div className="px-6 py-6">
            {/* Show special offers on home view only */}
            {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && (
              <>
                {/* Special Offers Section */}
                {specialOffers.length > 0 && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">{t('specialOffers')}</h2>
                      </div>
                      
                      {/* Custom Navigation for desktop */}
                      {!isMobile && totalSlides > slidesPerPage && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => swiperRef.current?.swiper?.slidePrev()}
                            className="h-8 w-8 p-0 border-gray-300 hover:border-orange-500 hover:text-orange-500"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => swiperRef.current?.swiper?.slideNext()}
                            className="h-8 w-8 p-0 border-gray-300 hover:border-orange-500 hover:text-orange-500"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <Swiper
                        ref={swiperRef}
                        modules={[Navigation, Pagination]}
                        spaceBetween={16}
                        slidesPerView={isMobile ? 1 : 3}
                        navigation={false}
                        pagination={{
                          clickable: true,
                          bulletClass: 'swiper-pagination-bullet !bg-orange-500',
                          bulletActiveClass: 'swiper-pagination-bullet-active !bg-orange-600',
                        }}
                        className="special-offers-swiper"
                        breakpoints={{
                          640: {
                            slidesPerView: 2,
                            spaceBetween: 16,
                          },
                          1024: {
                            slidesPerView: 3,
                            spaceBetween: 20,
                          },
                        }}
                      >
                        {specialOffers.map((product) => (
                          <SwiperSlide key={product.id}>
                            <ProductCard 
                              product={product} 
                              onAddToCart={() => addItem(product)} 
                              showBadge={true}
                            />
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Search and Filter Bar */}
            {(selectedCategory || selectedCategoryId === 0 || searchQuery.length > 2) && (
              <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                {/* Category Filter */}
                <Select
                  value={categoryFilter}
                  onValueChange={handleCategoryFilterChange}
                >
                  <SelectTrigger className="w-full md:w-48 border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories')}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Discount Filter */}
                <Select
                  value={discountFilter}
                  onValueChange={setDiscountFilter}
                >
                  <SelectTrigger className="w-full md:w-48 border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder={t('allProducts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allProducts')}</SelectItem>
                    <SelectItem value="discount">{t('withDiscount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selected Category Header */}
            {selectedCategory && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{selectedCategory.name}</h1>
                    {selectedCategory.description && (
                      <p className="text-gray-600">{selectedCategory.description}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleResetView}
                    className="border-gray-300 hover:border-orange-500 hover:text-orange-500"
                  >
                    {t('backToHome')}
                  </Button>
                </div>
              </div>
            )}

            {/* All Products Header */}
            {selectedCategoryId === 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('allProducts')}</h1>
                    <p className="text-gray-600">{t('allProductsDescription')}</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleResetView}
                    className="border-gray-300 hover:border-orange-500 hover:text-orange-500"
                  >
                    {t('backToHome')}
                  </Button>
                </div>
              </div>
            )}

            {/* Search Results Header */}
            {searchQuery.length > 2 && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      {t('searchResults')} "{searchQuery}"
                    </h1>
                    <p className="text-gray-600">
                      {searchResults.length === 1 
                        ? t('oneResultFound')
                        : t('resultsFound', { count: searchResults.length })
                      }
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleResetView}
                    className="border-gray-300 hover:border-orange-500 hover:text-orange-500"
                  >
                    {t('backToHome')}
                  </Button>
                </div>
              </div>
            )}

            {/* Products Grid */}
            {displayProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={() => addItem(product)} 
                  />
                ))}
              </div>
            ) : (
              // Loading states and empty states
              <div className="text-center py-16">
                {(productsLoading || searchLoading) ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    <span className="text-gray-600">{t('loading')}</span>
                  </div>
                ) : searchQuery.length > 2 ? (
                  <div className="space-y-4">
                    <div className="text-6xl">🔍</div>
                    <h3 className="text-xl font-semibold text-gray-800">{t('noSearchResults')}</h3>
                    <p className="text-gray-600">{t('noSearchResultsDescription')}</p>
                    <Button 
                      onClick={() => setSearchQuery("")}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {t('clearSearch')}
                    </Button>
                  </div>
                ) : selectedCategory || selectedCategoryId === 0 ? (
                  <div className="space-y-4">
                    <div className="text-6xl">📦</div>
                    <h3 className="text-xl font-semibold text-gray-800">{t('noProductsInCategory')}</h3>
                    <p className="text-gray-600">{t('noProductsInCategoryDescription')}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Information Blocks at bottom position */}
          {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && storeSettings && 
           storeSettings.showInfoBlocks !== false && storeSettings.infoBlocksPosition === "bottom" && (
            <div className="px-6 pb-6">
              <InfoBlocks 
                storeSettings={storeSettings} 
                t={t} 
                currentLanguage={currentLanguage} 
              />
            </div>
          )}
        </main>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar />
    </div>
  );
}