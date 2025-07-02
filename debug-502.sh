#!/bin/bash

# VPS Header Component Fix - Eliminates menu flickering on production
echo "🔧 Creating optimized header component for VPS production environment..."

cat > /tmp/header-vps-fix.tsx << 'EOF'
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/cart";
import { useCommonTranslation, useLanguage } from "@/hooks/use-language";
import type { SupportedLanguage } from '@shared/localization';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Utensils, ShoppingCart, Menu, Settings, LogOut, User, X, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePWA } from "@/hooks/usePWA";
import type { User as UserType } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

// CRITICAL: Cache store settings at module level to prevent re-fetches
let cachedStoreSettings: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// VPS-optimized store settings hook with aggressive caching
function useVPSStoreSettings() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedStoreSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return {
      storeSettings: cachedStoreSettings,
      isLoading: false,
      error: null,
    };
  }

  const query = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const data = await res.json();
      
      // Update module-level cache
      cachedStoreSettings = {
        ...data,
        storeName: data.storeName || "eDAHouse",
        welcomeTitle: data.welcomeTitle || "",
        storeDescription: data.storeDescription || "",
        workingHours: data.workingHours || {}
      };
      cacheTimestamp = Date.now();
      
      return cachedStoreSettings;
    },
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !cachedStoreSettings || (now - cacheTimestamp) >= CACHE_DURATION,
  });

  return {
    storeSettings: query.data || cachedStoreSettings,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// Move multilingual helper outside component - CRITICAL for performance
const getMultilingualValue = (
  storeSettings: any,
  baseField: string,
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string => {
  if (!storeSettings) return '';
  
  let langField: string;
  
  if (currentLanguage === 'ru') {
    langField = baseField;
  } else {
    const capitalizedLang = currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1);
    langField = `${baseField}${capitalizedLang}`;
  }
  
  const currentValue = storeSettings?.[langField];
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }
  
  return storeSettings?.[baseField] || '';
};

interface HeaderProps {
  onResetView?: () => void;
}

export default function Header({ onResetView }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { items, toggleCart } = useCartStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useCommonTranslation();
  const { currentLanguage } = useLanguage();
  const { storeSettings } = useVPSStoreSettings(); // Use optimized hook
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { isInstalled, installApp } = usePWA();
  
  // CRITICAL: Memoize all expensive computations to prevent re-renders
  const deviceInfo = useMemo(() => {
    if (typeof window === 'undefined') return { isMobile: false, isTablet: false, isDesktop: false };
    
    return {
      isMobile: window.matchMedia('(max-width: 767px)').matches,
      isTablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches,
      isDesktop: window.matchMedia('(min-width: 1024px)').matches
    };
  }, []);

  const cartItemsCount = useMemo(() => items.length, [items.length]);
  
  const storeName = useMemo(() => {
    return getMultilingualValue(storeSettings, 'storeName', currentLanguage as SupportedLanguage) || "eDAHouse";
  }, [storeSettings, currentLanguage]);

  // Memoize click handlers to prevent re-renders
  const handleResetView = useCallback(() => {
    onResetView?.();
  }, [onResetView]);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
    setIsMobileMenuOpen(false);
  }, [logoutMutation]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1023px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Title */}
          <div className="flex items-center min-w-0 flex-1">
            <Link href="/" onClick={handleResetView}>
              <div className="flex items-center cursor-pointer">
                {storeSettings?.logoUrl ? (
                  <img 
                    src={storeSettings.logoUrl} 
                    alt={storeName} 
                    className="h-8 md:h-10 w-auto mr-2 md:mr-3 rtl:mr-0 rtl:ml-2 md:rtl:ml-3 flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/@assets/Edahouse_sign__source_1750184330403.png";
                    }}
                  />
                ) : (
                  <img 
                    src="/@assets/Edahouse_sign__source_1750184330403.png" 
                    alt="eDAHouse" 
                    className="h-8 md:h-10 w-auto mr-2 md:mr-3 rtl:mr-0 rtl:ml-2 md:rtl:ml-3 flex-shrink-0"
                  />
                )}
                <h1 className="text-lg md:text-2xl font-poppins font-bold text-primary truncate">
                  {storeName}
                </h1>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex ml-8 rtl:ml-0 rtl:mr-8 space-x-8 rtl:space-x-reverse">
              <Link href="/" onClick={handleResetView} className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                {t('menu')}
              </Link>
              {(user?.role === 'admin' || user?.role === 'worker') && (
                <Link href="/admin" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  {t('admin')}
                </Link>
              )}
            </nav>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1 md:gap-4 rtl:space-x-reverse flex-shrink-0">
            {/* Language Switcher - Desktop only, multiple languages only */}
            {storeSettings?.enabledLanguages && storeSettings.enabledLanguages.length > 1 && (
              <div className="hidden md:block">
                <LanguageSwitcher variant="compact" />
              </div>
            )}
            
            {/* Cart Button - Always visible */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleCart}
              className={`relative p-2 transition-all duration-200 ${
                cartItemsCount > 0 
                  ? "text-primary hover:text-primary-hover" 
                  : "text-gray-600 hover:text-primary"
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge 
                  className="cart-badge absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 flex items-center justify-center text-xs p-0 bg-primary hover:bg-primary-hover text-white border-2 border-white animate-pulse font-bold"
                >
                  {cartItemsCount}
                </Badge>
              )}
            </Button>

            {/* Desktop User Menu */}
            {user && (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || undefined} alt={user.firstName || user.username} />
                        <AvatarFallback className="bg-primary text-white">
                          {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72" align="end" forceMount>
                    <div className="flex items-center justify-start gap-3 p-4">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={user.avatar || undefined} alt={user.firstName || user.username} />
                        <AvatarFallback className="bg-primary text-white text-lg">
                          {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        {user.firstName && user.lastName ? (
                          <p className="text-sm font-medium leading-none truncate">
                            {user.firstName} {user.lastName}
                          </p>
                        ) : (
                          <p className="text-sm font-medium leading-none truncate">
                            {user.username}
                          </p>
                        )}
                        {user.email && (
                          <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                            {user.email}
                          </p>
                        )}
                        <Badge variant="secondary" className="w-fit text-xs">
                          {user?.role === 'admin' ? t('userRole.admin') : 
                           user?.role === 'worker' ? t('userRole.worker') : t('userRole.customer')}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        <span>{t('navigation.profile')}</span>
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                          <span>{t('adminPanel')}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                      <span>{t('logout')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Desktop Login Button */}
            {!user && (
              <div className="hidden md:block">
                <Button 
                  className="bg-primary hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/50 text-white transition-shadow duration-200"
                  onClick={() => window.location.href = '/auth'}
                >
                  {t('login')}
                </Button>
              </div>
            )}
                
            {/* Mobile Menu Button */}
            <div className="block md:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-gray-600 hover:text-primary"
                onClick={handleMobileMenuToggle}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden border-t border-gray-200 py-4 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex flex-col space-y-3">
              {/* Navigation Links */}
              {!user ? (
                <div className="flex flex-col space-y-3 px-4">
                  <Link href="/" onClick={() => { handleResetView(); handleCloseMobileMenu(); }}>
                    <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                      <Utensils className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="font-semibold">{t('menu')}</span>
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 px-4">
                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <Link href="/" onClick={() => { handleResetView(); handleCloseMobileMenu(); }} className="flex-1">
                      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                        <Utensils className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        <span className="font-semibold text-sm">{t('menu')}</span>
                      </div>
                    </Link>
                    <Link href="/profile" onClick={handleCloseMobileMenu} className="flex-1">
                      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer">
                        <User className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        <span className="font-semibold text-sm">{t('profile.title')}</span>
                      </div>
                    </Link>
                  </div>
                  
                  {(user?.role === 'admin' || user?.role === 'worker') && (
                    <Link href="/admin" onClick={handleCloseMobileMenu}>
                      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors cursor-pointer">
                        <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        <span className="font-semibold text-sm">{t('admin')}</span>
                      </div>
                    </Link>
                  )}
                </div>
              )}
              
              {/* Logout Button for Mobile */}
              {user && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div 
                    className="flex items-center justify-center px-4 py-3 mx-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                    <span className="font-medium">{t('logout')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
EOF

echo "✅ VPS-optimized header created with:"
echo "   • Module-level caching for store settings"
echo "   • Memoized callbacks to prevent re-renders"
echo "   • Disabled unnecessary React Query refetches"
echo "   • Aggressive 15-minute cache duration"
echo ""
echo "📋 VPS Update Commands:"
echo "1. cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"
echo "2. cp client/src/components/layout/header.tsx client/src/components/layout/header.tsx.backup"
echo "3. wget -O /tmp/header-vps-fix.tsx [github-raw-url]"
echo "4. cp /tmp/header-vps-fix.tsx client/src/components/layout/header.tsx"
echo "5. npm run build && pm2 restart edahouse"
echo ""
echo "This will eliminate menu flickering by preventing excessive re-renders and API calls."