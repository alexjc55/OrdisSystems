import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/cart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation, useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Utensils, ShoppingCart, Menu, Settings, LogOut, User } from "lucide-react";
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

  const cartItemsCount = items.length; // Count unique products, not total quantity

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
                  ? "text-orange-600 hover:text-orange-700" 
                  : "text-gray-600 hover:text-primary"
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 flex items-center justify-center text-xs p-0 bg-orange-500 hover:bg-orange-600 text-white border-2 border-white animate-pulse"
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
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
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
                  className="bg-orange-500 hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-500/50 text-white transition-shadow duration-200"
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
          <div className="md:hidden border-t border-gray-200 py-4 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex flex-col space-y-3">
              {/* Navigation Links */}
              <Link href="/" onClick={() => { onResetView?.(); setIsMobileMenuOpen(false); }}>
                <div className="flex items-center px-4 py-3 mx-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer">
                  <Utensils className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                  <span className="text-base font-semibold">{t('menu')}</span>
                </div>
              </Link>
              {(user?.role === 'admin' || user?.role === 'worker') && (
                <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="flex items-center px-4 py-3 mx-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer">
                    <Settings className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                    <span className="text-base font-semibold">{t('admin')}</span>
                  </div>
                </Link>
              )}
              
              {/* Language Switcher */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="px-4">
                  <span className="text-sm font-medium text-gray-700 block mb-3">{t('language')}</span>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => {
                        changeLanguage('ru');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                        currentLanguage === 'ru' 
                          ? 'bg-blue-50 text-blue-600 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg mr-3 rtl:ml-3 rtl:mr-0">🇷🇺</span>
                      <span>Русский</span>
                    </button>
                    <button
                      onClick={() => {
                        changeLanguage('en');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                        currentLanguage === 'en' 
                          ? 'bg-blue-50 text-blue-600 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg mr-3 rtl:ml-3 rtl:mr-0">🇺🇸</span>
                      <span>English</span>
                    </button>
                    <button
                      onClick={() => {
                        changeLanguage('he');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                        currentLanguage === 'he' 
                          ? 'bg-blue-50 text-blue-600 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg mr-3 rtl:ml-3 rtl:mr-0">🇮🇱</span>
                      <span>עברית</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Login Button for non-logged in users */}
              {!user && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center px-4 py-3 mx-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                      <User className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="font-medium">{t('login')}</span>
                    </div>
                  </Link>
                </div>
              )}
              
              {/* User Profile Link - Only for logged in users */}
              {user && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center px-4 py-3 mx-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer">
                      <User className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="font-medium">{t('navigation.profile')}</span>
                    </div>
                  </Link>
                  
                  <div 
                    className="flex items-center px-4 py-3 mx-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
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