/**
 * BACKUP VERSION OF HOME PAGE - Updated June 22, 2025
 * 
 * This is a complete backup of the home page with:
 * - Multi-language support (Russian, English, Hebrew)
 * - RTL layout support for Hebrew interface with proper Swiper carousel
 * - Product filtering and search functionality
 * - Shopping cart integration
 * - Mobile-responsive design
 * - Swiper carousel with full RTL support replacing Embla
 * - Improved information block alignment and spacing
 * - All existing features and UI patterns preserved
 * - Updated font-bold for all information block subheadings
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
import { Swiper, SwiperSlide } from 'swiper/core';
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
  Minus,
  ShoppingCart,
  Filter,
  X,
  Menu,
  Heart,
  Share2,
  Eye,
  AlertCircle
} from "lucide-react";

import type { ProductWithCategory, Category, StoreSettings } from "@shared/schema";

// HEBREW FONT OPTIMIZATION
const hebrewFontClass = "font-['Assistant','Noto_Sans_Hebrew','system-ui','sans-serif']";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("name");
  const [showCart, setShowCart] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const swiperRef = useRef<any>(null);
  const { user } = useAuth();
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();
  const { currentLanguage, isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const cartStore = useCartStore();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Get featured products for carousel
  const { data: products = [] } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const featuredProducts = useMemo(() => {
    return products.filter(product => product.featured && product.available).slice(0, 8);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => product.available);
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }
    
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name":
        default:
          return a.name.localeCompare(b.name, currentLanguage);
      }
    });
    
    return filtered;
  }, [products, searchTerm, selectedCategory, sortBy, currentLanguage]);

  const handleAddToCart = useCallback((product: ProductWithCategory, quantity: number = 1) => {
    cartStore.addItem(product, quantity);
    toast({
      title: t('itemAdded'),
      description: `${product.name} ${t('addedToCart')}`,
    });
  }, [cartStore, toast, t]);

  // Working hours logic
  const workingHoursDisplay = useMemo(() => {
    if (!storeSettings?.workingHours) return null;
    
    try {
      const hours = JSON.parse(storeSettings.workingHours);
      const dayNames = {
        monday: t('monday'),
        tuesday: t('tuesday'), 
        wednesday: t('wednesday'),
        thursday: t('thursday'),
        friday: t('friday'),
        saturday: t('saturday'),
        sunday: t('sunday')
      };

      // Group consecutive days with same hours
      const groupedHours: { days: string[], hours: string }[] = [];
      const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      let currentGroup: { days: string[], hours: string } | null = null;
      
      for (const day of daysOrder) {
        const dayHours = hours[day];
        if (dayHours) {
          if (!currentGroup || currentGroup.hours !== dayHours) {
            if (currentGroup) {
              groupedHours.push(currentGroup);
            }
            currentGroup = { days: [day], hours: dayHours };
          } else {
            currentGroup.days.push(day);
          }
        } else {
          if (currentGroup) {
            groupedHours.push(currentGroup);
            currentGroup = null;
          }
        }
      }
      
      if (currentGroup) {
        groupedHours.push(currentGroup);
      }

      return groupedHours.map((group, index) => {
        const daysText = group.days.length === 1 
          ? dayNames[group.days[0] as keyof typeof dayNames]
          : group.days.length === 2 && daysOrder.indexOf(group.days[1]) === daysOrder.indexOf(group.days[0]) + 1
          ? `${dayNames[group.days[0] as keyof typeof dayNames]}, ${dayNames[group.days[group.days.length - 1] as keyof typeof dayNames]}`
          : `${dayNames[group.days[0] as keyof typeof dayNames]} - ${dayNames[group.days[group.days.length - 1] as keyof typeof dayNames]}`;
        
        return (
          <div key={index} className="text-base sm:text-lg flex justify-between">
            <span className="font-bold">{daysText}:</span>
            <span className="text-gray-700 font-bold">{group.hours}</span>
          </div>
        );
      });
    } catch (error) {
      return null;
    }
  }, [storeSettings?.workingHours, t]);

  const nextSlide = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };

  const prevSlide = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'} ${currentLanguage === 'he' ? hebrewFontClass : ''}`}>
      <Header 
        onMenuClick={() => setIsSidebarOpen(true)}
        onCartClick={() => setShowCart(true)}
      />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <CartSidebar 
        isOpen={showCart} 
        onClose={() => setShowCart(false)}
      />

      <main className="container mx-auto px-4 py-6 max-w-[1023px]">
        {/* Welcome Section */}
        {storeSettings?.welcomeTitle && (
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {storeSettings.welcomeTitle}
            </h1>
            {storeSettings.welcomeMessage && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {storeSettings.welcomeMessage}
              </p>
            )}
          </div>
        )}

        {/* Featured Products Carousel */}
        {featuredProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('featuredProducts')}</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevSlide}
                  className="p-2"
                  disabled={!swiperRef.current}
                >
                  {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextSlide}
                  className="p-2"
                  disabled={!swiperRef.current}
                >
                  {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={16}
                slidesPerView={1}
                breakpoints={{
                  640: { slidesPerView: 2 },
                  768: { slidesPerView: 3 },
                  1024: { slidesPerView: 4 },
                }}
                dir={isRTL ? 'rtl' : 'ltr'}
                key={currentLanguage}
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                }}
                className="featured-products-swiper"
              >
                {featuredProducts.map((product) => (
                  <SwiperSlide key={product.id}>
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-gray-400`} />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${isRTL ? 'pr-10' : 'pl-10'}`}
                />
              </div>
            </div>
            
            <div className="flex gap-2 md:gap-4">
              <Select value={selectedCategory?.toString() || ""} onValueChange={(value) => setSelectedCategory(value ? parseInt(value) : null)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={t('allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('allCategories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('sortByName')}</SelectItem>
                  <SelectItem value="price_asc">{t('sortByPriceAsc')}</SelectItem>
                  <SelectItem value="price_desc">{t('sortByPriceDesc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Category Navigation - Desktop */}
          <div className="hidden lg:block">
            <CategoryNav
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noProducts')}</h3>
                <p className="text-gray-500">{t('noProductsDesc')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Information Blocks */}
        {(storeSettings?.workingHours || storeSettings?.contactPhone || storeSettings?.contactEmail || storeSettings?.deliveryInfo || storeSettings?.paymentInfo) && (
          <div className="mt-16 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Working Hours & Contacts */}
              <div className="space-y-8">
                {/* Working Hours */}
                {storeSettings?.workingHours && workingHoursDisplay && (
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full group-hover:scale-110 transition-transform duration-300">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-semibold text-lg text-gray-800">{t('workingHours')}</span>
                      </div>
                      <div className={`space-y-2 px-0 ${currentLanguage === 'he' ? 'mr-12 pl-4' : 'ml-12 pr-4'}`}>
                        {workingHoursDisplay}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Contacts */}
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
                            <span className="font-bold">{storeSettings.contactPhone}</span>
                          </div>
                        )}
                        {storeSettings.contactEmail && (
                          <div className="text-base sm:text-lg flex justify-between">
                            <span className="text-gray-700 font-bold">Email:</span>
                            <span className="font-bold break-all">{storeSettings.contactEmail}</span>
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
                            <span className="text-gray-800 font-bold text-base leading-relaxed">{storeSettings.deliveryInfo}</span>
                          </div>
                        )}
                        {storeSettings.paymentInfo && (
                          <div>
                            <span className="text-gray-700 text-base font-bold block mb-2">{t('payment')}:</span>
                            <span className="text-gray-800 font-bold text-base leading-relaxed">{storeSettings.paymentInfo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}