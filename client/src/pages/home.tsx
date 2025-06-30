/**
 * BACKUP VERSION OF HOME PAGE - Created June 21, 2025
 * 
 * This is a complete backup of the home page with:
 * - Multi-language support (Russian, English, Hebrew)
 * - RTL layout support for Hebrew interface
 * - Product filtering and search functionality
 * - Shopping cart integration
 * - Mobile-responsive design
 * - All existing features and UI patterns preserved
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
import { getLocalizedField } from "@/shared/localization";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CategoryNav from "@/components/menu/category-nav";
import ProductCard from "@/components/menu/product-card";
import CartSidebar from "@/components/cart/cart-sidebar";
import { HeaderVariant } from "@/components/layout/header-variants";
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
                <div className="p-3 rounded-full group-hover:scale-110 transition-transform duration-300" style={{ background: `linear-gradient(to bottom right, var(--color-working-hours-icon, hsl(220, 91%, 54%)), var(--color-working-hours-icon, hsl(220, 91%, 54%)))` }}>
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
                <div className="p-3 rounded-full group-hover:scale-110 transition-transform duration-300" style={{ background: `linear-gradient(to bottom right, var(--color-contacts-icon, hsl(142, 76%, 36%)), var(--color-contacts-icon, hsl(142, 76%, 36%)))` }}>
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
                    <span className="text-gray-700 font-bold">{t('email')}:</span>
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
                <div className="p-3 rounded-full group-hover:scale-110 transition-transform duration-300" style={{ background: `linear-gradient(to bottom right, var(--color-payment-delivery-icon, hsl(262, 83%, 58%)), var(--color-payment-delivery-icon, hsl(262, 83%, 58%)))` }}>
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-lg text-gray-800">{t('paymentMethod')} & {t('cart.delivery')}</span>
              </div>
              <div className={`space-y-4 flex-1 px-0 ${currentLanguage === 'he' ? 'mr-12 pl-4' : 'ml-12 pr-4'}`}>
                {storeSettings.deliveryInfo && (
                  <div>
                    <span className="text-gray-700 text-base font-bold block mb-2">{t('cart.delivery')}:</span>
                    <span className="text-gray-800 text-base leading-relaxed">{storeSettings.deliveryInfo}</span>
                  </div>
                )}
                {storeSettings.paymentInfo && (
                  <div>
                    <span className="text-gray-700 text-base font-bold block mb-2">{t('paymentMethod')}:</span>
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

  // Get header style from store settings (accessible to all users)
  const headerStyle = storeSettings?.headerStyle || 'classic';

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
    if (query.length <= 2) {
      setSelectedCategoryId(null);
    }
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
      
      {/* Header Variant - Full width banners - only show on main page */}
      {!selectedCategory && !searchQuery && (
        <HeaderVariant 
          storeSettings={storeSettings} 
          style={headerStyle as 'classic' | 'modern' | 'minimal'}
        />
      )}
      
      <div className="flex overflow-x-hidden">
        {storeSettings?.showCategoryMenu !== false && (
          <Sidebar 
            categories={categories || []} 
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            isLoading={categoriesLoading}
          />
        )}

        <main className={`flex-1 p-6 lg:pb-6 overflow-x-hidden ${storeSettings?.showCategoryMenu !== false ? 'pb-24' : 'pb-6'}`}>
          {/* Title and Description - only show when searching/filtering (classic style shows this in header) */}
          {storeSettings?.showTitleDescription !== false && (searchQuery.length > 2 || selectedCategory) && (
            <div className="text-center-force mb-12">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight text-center-force">
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
              
              <div className="max-w-3xl mx-auto text-center-force">
                <p className="text-xl sm:text-2xl text-gray-600 font-light leading-relaxed mb-8 text-center-force">
                  {(() => {
                    try {
                      if (searchQuery && searchQuery.length > 2) {
                        return t('foundItems').replace('{count}', displayProducts.length.toString());
                      }
                      if (selectedCategory?.description) {
                        return selectedCategory.description;
                      }
                      if (storeSettings?.storeDescription) {
                        return storeSettings.storeDescription;
                      }
                      return t('defaultStoreDescription');
                    } catch (error) {
                      console.error('Error rendering description:', error);
                      return t('defaultStoreDescription');
                    }
                  })()}
                </p>
                <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
              </div>
            </div>
          )}



          {/* Information Blocks at top position */}
          {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && storeSettings && 
           storeSettings.showInfoBlocks !== false && storeSettings.infoBlocksPosition === "top" && (
            <InfoBlocks 
              storeSettings={storeSettings} 
              t={t} 
              currentLanguage={currentLanguage} 
            />
          )}

          {/* Search Bar - hide on main page, show on category/product pages */}
          <div className={`mb-8 ${!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 ? 'hidden' : ''}`}>
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
                <div id="categories" className="mb-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary rounded-xl shadow-lg">
                        <Package className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                          {t('categoriesText')}
                        </h2>
                        <p className="text-gray-600 font-medium">{t('selectCategoryDescription')}</p>
                      </div>
                    </div>
                    <div className="flex justify-start md:justify-end mt-6 md:mt-0">
                      <Button
                        onClick={() => handleCategorySelect(0)}
                        className="w-full md:w-auto bg-primary hover:bg-primary-hover !text-white hover:!text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <Package className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
                        {t('allProducts')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-6 min-w-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {categories.map((category) => (
                      <Card 
                        key={category.id} 
                        className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden transform hover:scale-105"
                        onClick={() => handleCategorySelect(category.id)}
                      >
                        <CardContent className="p-4 h-32 relative">
                          <div className="flex items-start gap-3 h-full">
                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                              <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-primary transition-colors duration-300">
                                {getLocalizedField(category, 'name', currentLanguage)}
                              </h3>
                              
                              <p className="text-gray-600 text-sm leading-tight truncate">
                                {(() => {
                                  const text = category.description || t('defaultCategoryDescription');
                                  return text.length > 40 ? text.substring(0, 40) + '...' : text;
                                })()}
                              </p>
                              
                              <div className="mt-auto">
                                <Badge className="px-3 py-1 bg-primary text-white font-semibold text-sm shadow-md">
                                  {(category as any).productCount || 0} {t('dishesCount')}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex-shrink-0 w-16 flex justify-center">
                              <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                                {category.icon || '📦'}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Offers Section */}
              {specialOffers.length > 0 && storeSettings?.showSpecialOffers !== false && (
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <span className="mr-3 text-2xl">🔥</span>
                      <h2 className="text-2xl font-poppins font-bold text-gray-900">{t('specialOffers')}</h2>
                    </div>
                    
                    {/* Navigation Arrows */}
                    {specialOffers.length > slidesPerPage && (
                      <div className="hidden md:flex items-center gap-2">
                        <button
                          className="swiper-button-prev-custom w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary transition-colors shadow-sm"
                        >
                          {(currentLanguage === 'he' || currentLanguage === 'ar') ? 
                            <ChevronRight className="h-4 w-4" /> : 
                            <ChevronLeft className="h-4 w-4" />
                          }
                        </button>
                        <button
                          className="swiper-button-next-custom w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary transition-colors shadow-sm"
                        >
                          {(currentLanguage === 'he' || currentLanguage === 'ar') ? 
                            <ChevronLeft className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    )}
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
                      <Swiper
                        key={currentLanguage}
                        ref={swiperRef}
                        modules={[Navigation, Pagination]}
                        spaceBetween={16}
                        slidesPerView={isMobile ? 1 : 3}
                        slidesPerGroup={isMobile ? 1 : 3}
                        dir={currentLanguage === 'he' ? 'rtl' : 'ltr'}
                        navigation={{
                          prevEl: '.swiper-button-prev-custom',
                          nextEl: '.swiper-button-next-custom',
                        }}
                        pagination={{
                          el: '.swiper-pagination-custom',
                          clickable: true,
                          bulletClass: 'swiper-pagination-bullet-custom',
                          bulletActiveClass: 'swiper-pagination-bullet-active-custom',
                        }}
                        onSlideChange={(swiper) => {
                          setCurrentSlide(swiper.activeIndex);
                        }}
                        className="w-full pb-12"
                      >
                        {specialOffers.map((product) => (
                          <SwiperSlide key={product.id}>
                            <div className="p-1">
                              <ProductCard 
                                product={product} 
                                onCategoryClick={handleCategorySelect}
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>

                      {/* Custom Pagination */}
                      {specialOffers.length > slidesPerPage && (
                        <div className="swiper-pagination-custom flex justify-center mt-6 space-x-2"></div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category/Product List View */}
          {(selectedCategory || selectedCategoryId === 0 || searchQuery.length > 2) && (
            <div>
              {/* Back Button for Category View */}
              {selectedCategory && (
                <div className="mb-4">
                  <Button
                    onClick={handleResetView}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('buttons.back', 'Назад')}</span>
                  </Button>
                </div>
              )}

              {/* Filter Controls */}
              {(selectedCategoryId === 0 || searchQuery.length <= 2) && (
                <div className="flex gap-2 sm:gap-4 mb-6">
                  <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                    <SelectTrigger className="flex-1 min-w-0 text-sm">
                      <SelectValue placeholder={t('filterByCategory', 'Фильтр по категории')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allCategories')}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {getLocalizedField(category, 'name', currentLanguage)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={discountFilter} onValueChange={setDiscountFilter}>
                    <SelectTrigger className="flex-1 min-w-0 text-sm">
                      <SelectValue placeholder={t('filterByDiscount')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allProducts')}</SelectItem>
                      <SelectItem value="discount">{t('onlyDiscounted')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Products Grid */}
              {(productsLoading || searchLoading) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    <Package className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2 force-center-text">
                    {searchQuery ? t('noSearchResults') : t('noProductsFound')}
                  </h3>
                  <p className="text-gray-500 force-center-text">
                    {searchQuery ? t('tryDifferentSearch') : t('checkBackLater')}
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
                        alt={t('banner1')}
                        className="w-full h-64 md:h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                    </a>
                  ) : (
                    <img
                      src={storeSettings.bottomBanner1Url}
                      alt={t('banner1')}
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
                        alt={t('banner2')}
                        className="w-full h-64 md:h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                    </a>
                  ) : (
                    <img
                      src={storeSettings.bottomBanner2Url}
                      alt={t('banner2')}
                      className="w-full h-64 md:h-80 object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Cart Sidebar */}
      <CartSidebar />
    </div>
  );
}