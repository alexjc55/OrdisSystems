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
import { useUTMNavigate } from "@/hooks/use-utm-navigate";
import { UTMLink } from "@/components/UTMLink";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useBranch } from "@/hooks/useBranch";
import { useShopTranslation, useCommonTranslation, useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSEO, generateKeywords } from "@/hooks/useSEO";
import { generateHomeSEO } from "@/lib/seo-utils";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CategoryNav from "@/components/menu/category-nav";
import ProductCard from "@/components/menu/product-card";
import { HeaderVariant } from "@/components/layout/header-variants";
import SearchInput from "@/components/SearchInput";
import StickyFilters from "@/components/filters/sticky-filters";
import { useCartStore } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { getMultilingualValue } from "@/components/ui/multilingual-store-settings";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { 
  Clock, 
  Phone, 
  MapPin, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Truck,
  TrendingUp,
  Star,
  Plus,
  Settings,
  Package,
  Users,
  Sparkles,
  LayoutGrid
} from "lucide-react";
import type { CategoryWithCount, ProductWithCategories } from "@shared/schema";

// InfoBlocks Component — redesigned with contacts/hours/delivery cards
const InfoBlocks = memo(({ storeSettings, t, currentLanguage }: {
  storeSettings: any;
  t: (key: string) => string;
  currentLanguage: string;
}) => {
  const [hoursExpanded, setHoursExpanded] = useState(true);
  const [deliveryExpanded, setDeliveryExpanded] = useState(true);

  if (!storeSettings || storeSettings.showInfoBlocks === false) return null;

  const isRTL = currentLanguage === 'he' || currentLanguage === 'ar';
  const phone = storeSettings?.contactPhone;
  const whatsapp = storeSettings?.whatsappNumber || phone;
  const address = getLocalizedField(storeSettings, 'address', currentLanguage as SupportedLanguage);
  const deliveryInfo = getMultilingualValue(storeSettings, 'deliveryInfo', currentLanguage as any);
  const paymentInfo = getMultilingualValue(storeSettings, 'paymentInfo', currentLanguage as any);

  const hasContacts = !!(phone || storeSettings?.contactEmail || address);
  const hasHours = !!storeSettings?.workingHours;
  const hasDeliveryPayment = !!(deliveryInfo || paymentInfo);

  // Live open/closed status
  const openStatus = (() => {
    if (!storeSettings?.workingHours) return null;
    try {
      const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const todayKey = dayKeys[new Date().getDay()];
      const h = (storeSettings.workingHours as Record<string,string>)[todayKey];
      if (!h || !h.trim()) return { isOpen: false, until: null };
      const [start, end] = h.split('-');
      if (!start || !end) return null;
      const [sh, sm] = start.trim().split(':').map(Number);
      const [eh, em] = end.trim().split(':').map(Number);
      const now = new Date().getHours() * 60 + new Date().getMinutes();
      return { isOpen: now >= sh*60+sm && now < eh*60+em, until: end.trim() };
    } catch { return null; }
  })();

  const dayNamesMap: Record<string,string> = {
    monday: t('days.mon'), tuesday: t('days.tue'), wednesday: t('days.wed'),
    thursday: t('days.thu'), friday: t('days.fri'), saturday: t('days.sat'), sunday: t('days.sun')
  };
  const dayOrder = storeSettings?.weekStartDay === 'sunday'
    ? ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    : ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  const groupHours = (hoursObj: Record<string,string>) => {
    const valid = dayOrder
      .filter(d => hoursObj[d] && typeof hoursObj[d] === 'string' && hoursObj[d].trim())
      .map(d => [d, hoursObj[d]] as [string,string]);
    const groups: Array<{days: string[], hours: string}> = [];
    let cur: {days: string[], hours: string} | null = null;
    valid.forEach(([d, h]) => {
      if (cur && cur.hours === h) cur.days.push(d);
      else { if (cur) groups.push(cur); cur = { days: [d], hours: h }; }
    });
    if (cur) groups.push(cur);
    return groups;
  };

  const fmt = (g: {days: string[]}) =>
    g.days.length === 1 ? dayNamesMap[g.days[0]] : `${dayNamesMap[g.days[0]]} – ${dayNamesMap[g.days[g.days.length-1]]}`;

  const workingGroups = storeSettings?.workingHours ? groupHours(storeSettings.workingHours) : [];

  const deliveryHoursGroups: Array<{days: string[], value: string|null}> = storeSettings?.deliveryHours ? (() => {
    const dh = storeSettings.deliveryHours as Record<string, string|null>;
    const valid = dayOrder.filter(d => dh[d] !== null && dh[d] !== undefined).map(d => ({ day: d, value: dh[d] }));
    const groups: Array<{days: string[], value: string|null}> = [];
    let cur: {days: string[], value: string|null} | null = null;
    valid.forEach(({ day, value }) => {
      if (cur && cur.value === value) cur.days.push(day);
      else { if (cur) groups.push(cur); cur = { days: [day], value }; }
    });
    if (cur) groups.push(cur);
    return groups;
  })() : [];

  const cardCls = "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden";
  const rowCls = `flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`;
  const iconWrap = "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0";

  const openLabel = currentLanguage === 'en' ? 'Open until' : currentLanguage === 'he' ? 'פתוח עד' : currentLanguage === 'ar' ? 'مفتوح حتى' : 'Открыто до';
  const closedLabel = currentLanguage === 'en' ? 'Closed' : currentLanguage === 'he' ? 'סגור' : currentLanguage === 'ar' ? 'مغلق' : 'Закрыто';
  const msgLabel = currentLanguage === 'en' ? 'Message' : currentLanguage === 'he' ? 'כתוב' : currentLanguage === 'ar' ? 'مراسلة' : 'Написать';
  const callLabel = currentLanguage === 'en' ? 'Call' : currentLanguage === 'he' ? 'התקשר' : currentLanguage === 'ar' ? 'اتصال' : 'Позвонить';
  const addrLabel = currentLanguage === 'en' ? 'Store address' : currentLanguage === 'he' ? 'כתובת' : currentLanguage === 'ar' ? 'العنوان' : 'Адрес магазина';
  const headingLabel = currentLanguage === 'en' ? 'Contact Us' : currentLanguage === 'he' ? 'צרו קשר' : currentLanguage === 'ar' ? 'تواصل معنا' : 'Свяжитесь с нами';
  const subheadLabel = currentLanguage === 'en' ? 'We are always here to help' : currentLanguage === 'he' ? 'אנחנו תמיד זמינים לעזור' : currentLanguage === 'ar' ? 'نحن دائماً هنا للمساعدة' : 'Мы всегда на связи и готовы помочь';

  // ── Contact Card ───────────────────────────────────────────────────
  const ContactCard = () => (
    <div className={cardCls}>
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={iconWrap} style={{ background: 'var(--color-primary, hsl(25,95%,53%))' }}>
          <Phone className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-base">{t('contacts')}</span>
      </div>

      {phone && (
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={iconWrap} style={{ backgroundColor: 'rgba(249,115,22,0.12)' }}>
            <Phone className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
            <p className="text-xs text-gray-400">{t('phone')}</p>
            <p className="font-semibold text-gray-900 text-base">{phone}</p>
          </div>
        </div>
      )}

      {whatsapp && (
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={iconWrap} style={{ backgroundColor: 'rgba(37,211,102,0.12)' }}>
            <MessageCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
            <p className="font-semibold text-gray-900 text-base">WhatsApp</p>
          </div>
        </div>
      )}

      {address && (
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={iconWrap} style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
            <MapPin className="w-5 h-5 text-red-500" />
          </div>
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
            <p className="text-xs text-gray-400">{addrLabel}</p>
            <p className="font-semibold text-gray-900 text-base">{address}</p>
          </div>
        </div>
      )}

      <div className={`p-4 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {whatsapp && (
          <a href={`https://wa.me/${(whatsapp as string).replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            <MessageCircle className="w-4 h-4" />{msgLabel}
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border-2"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'rgba(249,115,22,0.06)' }}>
            <Phone className="w-4 h-4" />{callLabel}
          </a>
        )}
      </div>
    </div>
  );

  // ── Hours Card ─────────────────────────────────────────────────────
  const HoursCard = ({ collapsible = false }: { collapsible?: boolean }) => (
    <div className={cardCls}>
      <button
        type="button"
        onClick={() => collapsible && setHoursExpanded(v => !v)}
        className={`w-full flex flex-col px-4 py-4 ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className={`flex items-center gap-3 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={iconWrap} style={{ background: 'var(--color-working-hours-icon, hsl(220,91%,54%))' }}>
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className={`font-semibold text-gray-900 text-base flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('workingHours')}</span>
          {collapsible && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${hoursExpanded ? 'rotate-180' : ''}`} />}
        </div>
        {openStatus && (
          <div className={`mt-2 ${isRTL ? 'mr-12' : 'ml-12'}`}>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${openStatus.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {openStatus.isOpen ? `● ${openLabel} ${openStatus.until}` : `● ${closedLabel}`}
            </span>
          </div>
        )}
      </button>

      {(!collapsible || hoursExpanded) && (
        <div className="px-4 pb-4 space-y-2">
          {workingGroups.map((g, i) => (
            <div key={i} className={`flex items-center justify-between text-base ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-500">{fmt(g)}</span>
              <span className="font-medium text-gray-900">{g.hours}</span>
            </div>
          ))}
          {deliveryHoursGroups.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-primary)' }}>{t('delivery')}</p>
              {deliveryHoursGroups.map((g, i) => (
                <div key={i} className={`flex items-center justify-between text-base mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-500">{fmt(g)}</span>
                  {!g.value || g.value === 'closed'
                    ? <span className="text-red-500 font-medium">✕</span>
                    : <span className="font-medium text-gray-900">{g.value}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Delivery & Payment Card ────────────────────────────────────────
  const DeliveryPaymentCard = ({ collapsible = false }: { collapsible?: boolean }) => (
    <div className={cardCls}>
      <button
        type="button"
        onClick={() => collapsible && setDeliveryExpanded(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-4 border-b border-gray-100 ${collapsible ? 'cursor-pointer' : 'cursor-default'} ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div className={iconWrap} style={{ background: 'var(--color-payment-delivery-icon, hsl(262,83%,58%))' }}>
          <Truck className="w-4 h-4 text-white" />
        </div>
        <span className={`font-semibold text-gray-900 text-base flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('cart.delivery')} & {t('paymentMethod')}
        </span>
        {collapsible && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${deliveryExpanded ? 'rotate-180' : ''}`} />}
      </button>

      {(!collapsible || deliveryExpanded) && (
        <div className={`p-4 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          {deliveryInfo && (
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <div className={`${iconWrap} flex-shrink-0 mt-0.5`} style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
                <Truck className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-base mb-1">{t('cart.delivery')}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{deliveryInfo}</p>
              </div>
            </div>
          )}
          {paymentInfo && (
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <div className={`${iconWrap} flex-shrink-0 mt-0.5`} style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                <CreditCard className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-base mb-1">{t('paymentMethod')}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{paymentInfo}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="mb-12">
      {/* Section heading */}
      <div className={`mb-5 ${isRTL ? 'text-right' : ''}`}>
        <h2 className="text-2xl font-bold text-gray-900">{headingLabel}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{subheadLabel}</p>
      </div>

      {/* Desktop: contacts + hours in 2 cols, then delivery full-width */}
      <div className="hidden md:block space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {hasContacts && <ContactCard />}
          {hasHours && <HoursCard />}
        </div>
        {hasDeliveryPayment && <DeliveryPaymentCard />}
      </div>

      {/* Mobile: vertical stack, hours & delivery collapsible */}
      <div className="md:hidden space-y-3">
        {hasContacts && <ContactCard />}
        {hasHours && <HoursCard collapsible />}
        {hasDeliveryPayment && <DeliveryPaymentCard collapsible />}
      </div>
    </div>
  );
});

export default function Home() {
  const params = useParams();
  const [location] = useLocation();
  const navigate = useUTMNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const swiperRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { isOpen: isCartOpen, addItem } = useCartStore();
  const { storeSettings } = useStoreSettings();
  const { t } = useShopTranslation();
  const { t: tCommon } = useCommonTranslation();
  const { currentLanguage } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { selectedBranchId, branchesEnabled } = useBranch();

  // Wait for /api/config to load before fetching products so branchesEnabled is known
  const { data: configData } = useQuery<{ branchesEnabled: boolean }>({
    queryKey: ['/api/config'],
    staleTime: 5 * 60 * 1000,
  });
  const configLoaded = configData !== undefined;

  // Combined translation function that uses correct namespace for each key
  const tCombined = (key: string) => {
    // Keys that should use common translations
    const commonKeys = ['deliveryAddress', 'phone', 'email', 'contacts', 'workingHours', 'notSpecified', 'loadingError', 'delivery'];
    
    if (commonKeys.includes(key)) {
      return tCommon(key);
    }
    
    // Default to shop translations
    return t(key);
  };

  const branchQueryParam = branchesEnabled && selectedBranchId ? `?branchId=${selectedBranchId}` : '';

  // Fetch categories — wait for config so branchesEnabled is settled before request
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories", selectedBranchId, branchesEnabled],
    queryFn: () => fetch(`/api/categories${branchQueryParam}`).then(res => res.json()),
    enabled: configLoaded,
  });

  // Fetch all products for special offers and search — wait for config
  const { data: allProducts = [], isLoading: allProductsLoading } = useQuery<ProductWithCategories[]>({
    queryKey: ["/api/products", selectedBranchId, branchesEnabled],
    queryFn: () => fetch(`/api/products${branchQueryParam}`).then(res => res.json()),
    enabled: configLoaded,
  });

  // Get header style from store settings (accessible to all users)
  const headerStyle = storeSettings?.headerStyle || 'classic';

  // Calculate selected category first
  const selectedCategory = useMemo(() => {
    return categories.find(cat => cat.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  // Fetch products for selected category
  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithCategories[]>({
    queryKey: ["/api/products", selectedCategoryId, selectedBranchId, branchesEnabled],
    queryFn: () => {
      const params = new URLSearchParams({ categoryId: String(selectedCategoryId) });
      if (branchesEnabled && selectedBranchId) params.set('branchId', String(selectedBranchId));
      return fetch(`/api/products?${params}`).then(res => res.json());
    },
    enabled: configLoaded && selectedCategoryId !== null,
    staleTime: 0,
  });

  // Search products (branch-aware)
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<ProductWithCategories[]>({
    queryKey: ["/api/products/search", searchQuery, selectedBranchId, branchesEnabled],
    queryFn: () => {
      const searchParams = new URLSearchParams({ q: searchQuery });
      if (branchesEnabled && selectedBranchId) searchParams.set('branchId', String(selectedBranchId));
      return fetch(`/api/products/search?${searchParams}`).then(res => res.json());
    },
    enabled: configLoaded && searchQuery.length > 2,
  });

  // Generate SEO data for home page (after all data fetched)
  const seoData = useMemo(() => {
    if (selectedCategory) {
      // Category page SEO with products ItemList
      const categoryName = getLocalizedField(selectedCategory, 'name', currentLanguage);
      const categoryDescription = getLocalizedField(selectedCategory, 'description', currentLanguage);
      const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
      
      const title = categoryName 
        ? `${categoryName} - ${storeName || 'eDAHouse'}`
        : storeName || 'eDAHouse';
        
      const description = categoryDescription || 
        `Просмотр товаров в категории ${categoryName} в магазине ${storeName}`;
      
      // Prepare products of this category for ItemList
      const categoryProducts = (products || [])
        .filter((p: ProductWithCategories) => p.availabilityStatus === 'available')
        .slice(0, 12) // Show up to 12 products in structured data
        .map((p: ProductWithCategories) => ({
          id: p.id,
          name: getLocalizedField(p, 'name', currentLanguage),
          description: getLocalizedField(p, 'description', currentLanguage),
          url: currentLanguage === 'ru' ? `/?product=${p.id}` : `/${currentLanguage}/?product=${p.id}`
        }));
      
      return {
        title,
        description,
        keywords: generateKeywords(title, description),
        ogTitle: title,
        ogDescription: description,
        canonical: currentLanguage === 'ru' ? `/category/${selectedCategory.id}` : `/${currentLanguage}/category/${selectedCategory.id}`,
        products: categoryProducts.length > 0 ? categoryProducts : undefined,
        productsListTitle: categoryName // Use category name as ItemList title
      };
    } else if (selectedCategoryId === 0) {
      // All products page SEO
      const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
      const title = `${t('allProducts')} - ${storeName || 'eDAHouse'}`;
      const description = `Просмотр всех товаров в магазине ${storeName}`;
      
      return {
        title,
        description,
        keywords: generateKeywords(title, description),
        ogTitle: title,
        ogDescription: description,
        canonical: currentLanguage === 'ru' ? '/all-products' : `/${currentLanguage}/all-products`
      };
    } else if (searchQuery.length > 2) {
      // Search results SEO
      const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
      const title = `${t('searchResults')}: "${searchQuery}" - ${storeName || 'eDAHouse'}`;
      const description = `Результаты поиска "${searchQuery}" в магазине ${storeName}`;
      
      return {
        title,
        description,
        keywords: generateKeywords(title, description),
        ogTitle: title,
        ogDescription: description,
        canonical: currentLanguage === 'ru' ? `/search?q=${searchQuery}` : `/${currentLanguage}/search?q=${searchQuery}`
      };
    } else {
      // Home page SEO with categories and products for sitelinks
      const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
      const welcomeTitle = getLocalizedField(storeSettings, 'welcomeTitle', currentLanguage);
      const welcomeSubtitle = getLocalizedField(storeSettings, 'welcomeSubtitle', currentLanguage);
      
      const title = welcomeTitle 
        ? `${storeName} - ${welcomeTitle}`
        : storeName || 'eDAHouse';
        
      const description = welcomeSubtitle || 
        getLocalizedField(storeSettings, 'description', currentLanguage) ||
        'Система доставки готовой еды с многоязычной поддержкой';
      
      // Prepare categories for sitelinks (active categories only)
      const categoriesForSEO = categories
        .filter(cat => cat.isActive)
        .slice(0, 8) // Google typically shows max 6-8 sitelinks
        .map(cat => ({
          id: cat.id,
          name: getLocalizedField(cat, 'name', currentLanguage),
          description: getLocalizedField(cat, 'description', currentLanguage),
          url: currentLanguage === 'ru' ? `/category/${cat.id}` : `/${currentLanguage}/category/${cat.id}`
        }));
      
      // Prepare special offer products for sitelinks (use allProducts for home page)
      const specialProducts = (allProducts || [])
        .filter((p: ProductWithCategories) => p.isSpecialOffer && p.availabilityStatus === 'available')
        .slice(0, 6) // Show top 6 special offers
        .map((p: ProductWithCategories) => ({
          id: p.id,
          name: getLocalizedField(p, 'name', currentLanguage),
          description: getLocalizedField(p, 'description', currentLanguage),
          url: currentLanguage === 'ru' ? `/?product=${p.id}` : `/${currentLanguage}/?product=${p.id}`
        }));
      
      return {
        title,
        description,
        keywords: generateKeywords(title, description),
        ogTitle: title,
        ogDescription: description,
        canonical: currentLanguage === 'ru' ? '/' : `/${currentLanguage}/`,
        categories: categoriesForSEO.length > 0 ? categoriesForSEO : undefined,
        products: specialProducts.length > 0 ? specialProducts : undefined
      };
    }
  }, [storeSettings, selectedCategory, selectedCategoryId, searchQuery, currentLanguage, t, categories, allProducts, products]);

  // Apply SEO data
  useSEO(seoData);

  const handleCategorySelect = useCallback((categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setCategoryFilter(categoryId !== null && categoryId !== 0 ? categoryId.toString() : "all");
    // Don't clear search query when switching categories
    
    // Прокрутка к началу страницы при выборе категории
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
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
    // Прокрутка к началу страницы при сбросе вида
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/');
  }, [navigate]);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.length <= 2) {
      setSelectedCategoryId(null);
    }
  }, [searchQuery]);

  const handleSearch = useCallback((query: string) => {
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
      productsToShow = allProducts
        .filter(product => product.categories?.some(cat => cat.id === categoryId))
        .sort((a, b) => {
          const aOrder = (a.sortOrder ?? 0) === 0 ? 999999 : (a.sortOrder ?? 0);
          const bOrder = (b.sortOrder ?? 0) === 0 ? 999999 : (b.sortOrder ?? 0);
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.name || '').localeCompare(b.name || '');
        });
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
    const pathParts = location.split('/').filter(p => p);
    
    // Find category index (works with or without language prefix)
    const categoryIndex = pathParts.indexOf('category');
    if (categoryIndex !== -1 && pathParts[categoryIndex + 1]) {
      const categoryId = parseInt(pathParts[categoryIndex + 1]);
      if (!isNaN(categoryId) && categoryId !== selectedCategoryId) {
        setSelectedCategoryId(categoryId);
        setCategoryFilter(categoryId.toString());
      }
    } else if (pathParts.includes('all-products') && selectedCategoryId !== 0) {
      setSelectedCategoryId(0);
      setCategoryFilter("all");
    } else if (pathParts.length === 0 && selectedCategoryId !== null) {
      // Root path without category
      setSelectedCategoryId(null);
      setCategoryFilter("all");
    } else if (pathParts.length === 1 && ['en', 'he', 'ar', 'ru'].includes(pathParts[0]) && selectedCategoryId !== null) {
      // Just language code, no category
      setSelectedCategoryId(null);
      setCategoryFilter("all");
    }
  }, [location, selectedCategoryId, categories]);
  
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
      {!selectedCategory && !searchQuery && selectedCategoryId !== 0 && (
        <HeaderVariant 
          storeSettings={storeSettings} 
          style={headerStyle as 'classic' | 'modern' | 'minimal'}
        />
      )}

      {/* Sticky Filters */}
      <StickyFilters
        showBackButton={!!selectedCategory}
        onBack={handleResetView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('searchPlaceholder')}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryFilterChange}
        categories={categories || []}
        discountFilter={discountFilter}
        onDiscountFilterChange={setDiscountFilter}
        showFilters={!!(selectedCategory || selectedCategoryId === 0 || searchQuery.length > 2)}
        showSearch={!!(selectedCategory || selectedCategoryId === 0)}
      />
      
      <div className="flex overflow-x-hidden">
        {storeSettings?.showCategoryMenu !== false && (
          <Sidebar 
            categories={categories || []} 
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            isLoading={categoriesLoading}
          />
        )}

        <main className={`flex-1 p-6 lg:pb-6 overflow-x-hidden ${storeSettings?.showCategoryMenu !== false ? 'pb-24' : 'pb-6'} ${(selectedCategory || selectedCategoryId === 0 || searchQuery.length > 2) ? 'pt-32' : ''}`}>
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
                        return getLocalizedField(selectedCategory, 'name', currentLanguage as SupportedLanguage, 'ru');
                      }
                      if (storeSettings?.welcomeTitle) {
                        return getLocalizedField(storeSettings, 'welcomeTitle', currentLanguage as SupportedLanguage, 'ru');
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
                        return getLocalizedField(selectedCategory, 'description', currentLanguage as SupportedLanguage, 'ru');
                      }
                      if (storeSettings?.storeDescription) {
                        return getLocalizedField(storeSettings, 'storeDescription', currentLanguage as SupportedLanguage, 'ru');
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
              t={tCombined} 
              currentLanguage={currentLanguage} 
            />
          )}


          {/* Special Offers or Category View */}
          {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && (
            <div>
              {/* Category Overview */}
              {categories && categories.length > 0 && (() => {
                const displayStyle = storeSettings?.categoryDisplayStyle || 'default';

                if (displayStyle === 'carousel') {
                  const pillBase = "flex flex-col items-center justify-start gap-1 rounded-2xl border transition-all duration-200";
                  const pillActive = "bg-primary text-white border-primary shadow-md";
                  const pillInactive = "bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary";
                  const pillSize = "flex-none md:flex-1 md:min-w-[80px]";
                  const isImgUrl = (s?: string) => !!s && (s.startsWith('/') || s.startsWith('http'));
                  return (
                    <div id="categories" className="mb-8">
                      <div
                        className="flex flex-nowrap gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible md:pb-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                      >
                        <UTMLink
                          href="/all-products"
                          onClick={() => handleCategorySelect(0)}
                          className={`${pillBase} ${pillSize} ${selectedCategoryId === null || selectedCategoryId === 0 ? pillActive : pillInactive}`}
                          style={{ minWidth: '88px', minHeight: '84px', padding: '10px 8px', textDecoration: 'none' }}
                        >
                          <LayoutGrid className="w-7 h-7 flex-shrink-0 mt-0.5" />
                          <span className="text-xs font-medium leading-tight text-center w-full">{t('allCategories')}</span>
                        </UTMLink>
                        {categories.map((category) => {
                          const name = getLocalizedField(category, 'name', currentLanguage as SupportedLanguage, 'ru');
                          const isActive = selectedCategoryId === category.id;
                          const iconIsUrl = isImgUrl(category.icon);
                          return (
                            <UTMLink key={category.id} href={`/category/${category.id}`}
                              className={`${pillBase} ${pillSize} ${isActive ? pillActive : pillInactive}`}
                              style={{ minWidth: '88px', minHeight: '84px', padding: '10px 8px', textDecoration: 'none' }}
                              onClick={() => handleCategorySelect(category.id)}
                            >
                              {iconIsUrl ? (
                                <img src={category.icon!} alt={name} className="w-8 h-8 object-cover rounded-lg flex-shrink-0 mt-0.5" />
                              ) : (
                                <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{category.icon || '📦'}</span>
                              )}
                              <span className="text-xs font-medium leading-tight text-center w-full">{name}</span>
                            </UTMLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (displayStyle === 'photo_grid') {
                  if (categories.length === 0) return null;
                  const isImgUrl = (s?: string | null) => !!s && (s.startsWith('/') || s.startsWith('http'));
                  return (
                    <div id="categories" className="mb-8">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {categories.map((category) => {
                          const name = getLocalizedField(category, 'name', currentLanguage as SupportedLanguage, 'ru');
                          const isActive = selectedCategoryId === category.id;
                          // Use dedicated image field first, then icon if it's a URL
                          const bgImage = isImgUrl((category as any).image)
                            ? (category as any).image
                            : isImgUrl(category.icon)
                            ? category.icon
                            : null;
                          const emojiIcon = !isImgUrl(category.icon) ? (category.icon || '📦') : '📦';
                          return (
                            <UTMLink key={category.id} href={`/category/${category.id}`}>
                              <div
                                onClick={() => handleCategorySelect(category.id)}
                                className={`relative overflow-hidden rounded-xl cursor-pointer group ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                style={{ aspectRatio: '4/3' }}
                              >
                                {bgImage ? (
                                  <img
                                    src={bgImage}
                                    alt={name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-primary flex items-center justify-center transition-opacity duration-300 group-hover:opacity-90">
                                    <span className="text-5xl">{emojiIcon}</span>
                                  </div>
                                )}
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.15) 100%)' }} />
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <p className="text-white font-semibold text-sm md:text-lg leading-tight drop-shadow">{name}</p>
                                  {(() => {
                                    const desc = getLocalizedField(category, 'description', currentLanguage as SupportedLanguage, 'ru');
                                    return desc ? <p className="text-xs md:text-sm mt-0.5 leading-tight line-clamp-1 drop-shadow" style={{ color: 'rgba(255,255,255,0.8)' }}>{desc}</p> : null;
                                  })()}
                                </div>
                              </div>
                            </UTMLink>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <UTMLink
                          href="/all-products"
                          className="md:col-start-3"
                          onClick={() => handleCategorySelect(0)}
                        >
                          <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200"
                            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = 'var(--color-primary)'; el.style.color = '#ffffff'; }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = ''; el.style.color = 'var(--color-primary)'; }}
                          >
                            <span className="font-semibold text-base">{t('allProducts')}</span>
                            <LayoutGrid className="h-5 w-5 flex-shrink-0" />
                          </div>
                        </UTMLink>
                      </div>
                    </div>
                  );
                }

                // default style — original card grid
                return (
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
                          className="w-full md:w-auto bg-primary hover:bg-primary-hover !text-white hover:!text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          asChild
                        >
                          <UTMLink href="/all-products">
                            <Package className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />
                            {t('allProducts')}
                          </UTMLink>
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
                      {categories.map((category) => (
                        <UTMLink key={category.id} href={`/category/${category.id}`}>
                          <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden transform hover:scale-105">
                            <CardContent className="p-4 h-32 relative">
                              <div className="flex items-start gap-3 h-full">
                                <div className="flex-1 flex flex-col h-full overflow-hidden">
                                  <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-primary transition-colors duration-300">
                                    {getLocalizedField(category, 'name', currentLanguage as SupportedLanguage, 'ru')}
                                  </h3>
                                  <p className="text-gray-600 text-sm leading-tight truncate">
                                    {(() => {
                                      const text = getLocalizedField(category, 'description', currentLanguage as SupportedLanguage, 'ru') || t('defaultCategoryDescription');
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
                        </UTMLink>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Special Offers Section - hide on all products page */}
              {specialOffers.length > 0 && storeSettings?.showSpecialOffers !== false && selectedCategoryId !== 0 && (
                <div className="mt-12 rounded-2xl px-6 pt-6 pb-8" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <h2 className="text-2xl font-poppins font-bold text-gray-900 whitespace-nowrap">{t('specialOffers')}</h2>
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
                        dir={(currentLanguage === 'he' || currentLanguage === 'ar') ? 'rtl' : 'ltr'}
                        navigation={{
                          prevEl: '.swiper-button-prev-custom',
                          nextEl: '.swiper-button-next-custom',
                        }}
                        pagination={{
                          clickable: true,
                          el: '.swiper-special-offers-pagination',
                          bulletClass: 'swiper-pagination-bullet-custom',
                          bulletActiveClass: 'swiper-pagination-bullet-active-custom',
                        }}
                        onSlideChange={(swiper) => {
                          setCurrentSlide(swiper.activeIndex);
                        }}
                        className="w-full pb-4"
                      >
                        {specialOffers.map((product) => (
                          <SwiperSlide key={product.id} className="h-auto">
                            <div className="p-1 h-full">
                              <ProductCard 
                                product={product} 
                                onCategoryClick={handleCategorySelect}
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                      {/* External pagination container — always centered, RTL-safe */}
                      <div
                        className="swiper-special-offers-pagination"
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px',
                          direction: 'ltr',
                          marginTop: '12px',
                          width: '100%',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category/Product List View */}
          {(selectedCategory || selectedCategoryId === 0 || searchQuery.length > 2) && (
            <div>

              {/* Products Grid */}
              {(productsLoading || searchLoading) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Information Blocks at bottom position */}
      {!selectedCategory && selectedCategoryId !== 0 && searchQuery.length <= 2 && storeSettings && 
       storeSettings.showInfoBlocks !== false && storeSettings.infoBlocksPosition === "bottom" && (
        <div className="px-6 pb-6">
          <InfoBlocks 
            storeSettings={storeSettings} 
            t={tCombined} 
            currentLanguage={currentLanguage} 
          />
        </div>
      )}

      {/* Bottom Banners */}
      {storeSettings?.showBottomBanners && (
        storeSettings?.bottomBanner1Url || storeSettings?.bottomBanner2Url ||
        (storeSettings as any)?.bottomBanner1Url_en || (storeSettings as any)?.bottomBanner2Url_en ||
        (storeSettings as any)?.bottomBanner1Url_he || (storeSettings as any)?.bottomBanner2Url_he ||
        (storeSettings as any)?.bottomBanner1Url_ar || (storeSettings as any)?.bottomBanner2Url_ar
      ) && (
        <div className="mt-16 mb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Banner 1 */}
              {(getLocalizedField(storeSettings, 'bottomBanner1Url', currentLanguage as SupportedLanguage, storeSettings as any) || storeSettings?.bottomBanner1Url) && (
                <div className="relative overflow-hidden rounded-lg shadow-lg group bg-gray-100">
                  {storeSettings?.bottomBanner1Link ? (
                    <a 
                      href={storeSettings.bottomBanner1Link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={getLocalizedField(storeSettings, 'bottomBanner1Url', currentLanguage as SupportedLanguage, storeSettings as any) || storeSettings.bottomBanner1Url}
                        alt={t('banner1')}
                        className="w-full h-64 md:h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </a>
                  ) : (
                    <img
                      src={getLocalizedField(storeSettings, 'bottomBanner1Url', currentLanguage as SupportedLanguage, storeSettings as any) || storeSettings.bottomBanner1Url}
                      alt={t('banner1')}
                      className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
              )}

              {/* Banner 2 */}
              {(getLocalizedField(storeSettings, 'bottomBanner2Url', currentLanguage as SupportedLanguage, storeSettings as any) || storeSettings?.bottomBanner2Url) && (
                <div className="relative overflow-hidden rounded-lg shadow-lg group bg-gray-100">
                  {storeSettings?.bottomBanner2Link ? (
                    <a 
                      href={storeSettings.bottomBanner2Link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={getLocalizedField(storeSettings, 'bottomBanner2Url', currentLanguage as SupportedLanguage, storeSettings as any) || storeSettings.bottomBanner2Url}
                        alt={t('banner2')}
                        className="w-full h-64 md:h-80 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </a>
                  ) : (
                    <img
                      src={getLocalizedField(storeSettings, 'bottomBanner2Url', currentLanguage as SupportedLanguage, storeSettings as any) || storeSettings.bottomBanner2Url}
                      alt={t('banner2')}
                      className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}