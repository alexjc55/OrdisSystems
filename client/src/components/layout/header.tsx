import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/cart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation, useLanguage } from "@/hooks/use-language";
import type { SupportedLanguage } from '@shared/localization';
import { Button } from "@/components/ui/button";

// Import multilingual helper function
function getMultilingualValue(
  storeSettings: any,
  baseField: string,
  currentLanguage: SupportedLanguage,
  defaultLanguage: SupportedLanguage = 'ru'
): string {
  let langField: string;
  
  if (currentLanguage === 'ru') {
    langField = baseField;
  } else {
    const capitalizedLang = currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1);
    langField = `${baseField}${capitalizedLang}`;
  }
  
  return storeSettings?.[langField] || '';
}
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Utensils, ShoppingCart, Menu, Settings, LogOut, User, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { User as UserType } from "@shared/schema";

interface HeaderProps {
  onResetView?: () => void;
}

export default function Header({ onResetView }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { items, toggleCart } = useCartStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useCommonTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { storeSettings } = useStoreSettings();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const cartItemsCount = items.length; // Count unique products, not total quantity

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
            <Link href="/" onClick={() => onResetView?.()}>
              <div className="flex items-center cursor-pointer">
                {storeSettings?.logoUrl ? (
                  <img 
                    src={storeSettings.logoUrl} 
                    alt={storeSettings.storeName || "eDAHouse"} 
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
                  {storeSettings?.storeName || "eDAHouse"}
                </h1>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex ml-8 rtl:ml-0 rtl:mr-8 space-x-8 rtl:space-x-reverse">
              <Link href="/" onClick={() => onResetView?.()} className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
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
                  {Math.round(cartItemsCount)}
                </Badge>
              )}
            </Button>

            {/* Desktop User Menu */}
            {user && (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || ""} />
                        <AvatarFallback>
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {user?.firstName && (
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                        )}
                        {user?.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
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
                      onClick={() => logoutMutation.mutate()}
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
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
              {/* Navigation Links - First Row */}
              {!user ? (
                /* Not logged in - single Menu button full width */
                <Link href="/" onClick={() => { onResetView?.(); setIsMobileMenuOpen(false); }}>
                  <div className="flex items-center justify-center px-4 py-3 mx-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                    <Utensils className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                    <span className="font-semibold">{t('menu')}</span>
                  </div>
                </Link>
              ) : (
                /* All users - Menu and Profile buttons, plus Admin for admin/worker */
                <div className="flex flex-col space-y-3 px-4">
                  {/* First row - Menu and Profile for everyone */}
                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <Link href="/" onClick={() => { onResetView?.(); setIsMobileMenuOpen(false); }} className="flex-1">
                      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                        <Utensils className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        <span className="font-semibold text-sm">{t('menu')}</span>
                      </div>
                    </Link>
                    <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex-1">
                      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer">
                        <User className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        <span className="font-semibold text-sm">{t('profile.title')}</span>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Second row - Admin button only for admin/worker */}
                  {(user?.role === 'admin' || user?.role === 'worker') && (
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors cursor-pointer">
                        <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        <span className="font-semibold text-sm">{t('admin')}</span>
                      </div>
                    </Link>
                  )}
                </div>
              )}
              
              {/* Language Switcher */}
              {(() => {
                const languages: Array<{ code: 'ru' | 'en' | 'he' | 'ar', flag: string, name: string }> = [
                  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
                  { code: 'en', flag: '🇺🇸', name: 'English' },
                  { code: 'he', flag: '🇮🇱', name: 'עברית' },
                  { code: 'ar', flag: '🇸🇦', name: 'العربية' }
                ];
                
                // Don't show language switcher if only 1 language
                if (languages.length <= 1) return null;
                
                // Layout logic: 
                // 1 language = hidden (not shown)
                // 2 languages = flex row
                // 3 languages = flex row  
                // 4+ languages = flex wrap (will wrap to new lines automatically)
                
                return (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="px-4">
                      <span className="text-sm font-medium text-gray-700 block mb-3">{t('language')}</span>
                      <div className={`flex ${languages.length >= 4 ? 'flex-wrap' : 'flex-nowrap'} gap-2 w-full`}>
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              changeLanguage(lang.code);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center justify-center px-2 py-2 rounded-lg transition-colors text-xs flex-1 ${
                              currentLanguage === lang.code 
                                ? 'bg-blue-50 text-blue-600 font-medium' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-xs whitespace-nowrap">{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Login Button for non-logged in users */}
              {!user && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center px-4 py-3 mx-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer">
                      <User className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="font-medium">{t('login')}</span>
                    </div>
                  </Link>
                </div>
              )}
              
              {/* Logout Button - Only for logged in users */}
              {user && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div 
                    className="flex items-center justify-center px-4 py-3 mx-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                    onClick={() => {
                      logoutMutation.mutate();
                      setIsMobileMenuOpen(false);
                    }}
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