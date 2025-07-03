import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/cart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
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
  const { isInstalled, installApp, isStandalone } = usePWA();
  
  // Get store name
  const getLocalizedStoreField = (field: string) => {
    if (!storeSettings) return '';
    
    const currentLang = currentLanguage as SupportedLanguage;
    
    if (currentLang === 'ru') {
      return storeSettings[field] || '';
    }
    
    const langSuffix = currentLang.charAt(0).toUpperCase() + currentLang.slice(1);
    const localizedField = `${field}${langSuffix}`;
    
    return storeSettings[localizedField] || storeSettings[field] || '';
  };

  const storeName = getLocalizedStoreField('storeName') || "eDAHouse";

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
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="bg-primary text-primary-foreground rounded-full p-2">
                  <Utensils className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {storeName}
                </h1>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 rtl:space-x-reverse">
            <LanguageSwitcher />
            
            {/* Shopping Cart */}
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 text-gray-600 hover:text-primary"
              onClick={toggleCart}
            >
              <ShoppingCart className="h-5 w-5" />
              {items.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
                  {items.length}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback className="text-xs">
                        {user.firstName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                      {t('profile.title')}
                    </DropdownMenuItem>
                  </Link>
                  {(user.role === 'admin' || user.role === 'worker') && (
                    <>
                      <DropdownMenuSeparator />
                      <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                          {t('admin')}
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button variant="outline" size="sm">
                  {t('login')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile/Tablet Controls */}
          <div className="flex lg:hidden items-center space-x-2 rtl:space-x-reverse">
            <LanguageSwitcher />
            
            {/* Shopping Cart */}
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 text-gray-600 hover:text-primary"
              onClick={toggleCart}
            >
              <ShoppingCart className="h-5 w-5" />
              {items.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
                  {items.length}
                </Badge>
              )}
            </Button>

            {/* Mobile Menu Button */}
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
        <div 
          ref={mobileMenuRef}
          className="lg:hidden bg-white border-t border-gray-200 shadow-lg"
        >
          <div className="max-w-[1023px] mx-auto">
            {/* Close button */}
            <div className="flex justify-end p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Links */}
            <div className="px-4 pb-6 space-y-4">
              {!user ? (
                /* Not logged in - Menu button and Auth link */
                <div className="flex flex-col space-y-3">
                  <Link href="/" onClick={() => { onResetView?.(); setIsMobileMenuOpen(false); }}>
                    <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                      <Utensils className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="font-semibold">{t('menu')}</span>
                    </div>
                  </Link>
                  
                  <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer">
                      <User className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="font-semibold">{t('login')}</span>
                    </div>
                  </Link>
                </div>
              ) : (
                /* Logged in - Menu, Profile, and Admin (if applicable) */
                <div className="flex flex-col space-y-3">
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

              {/* PWA Install Button - Show if not installed */}
              {!isInstalled && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div 
                    className="flex items-center justify-center px-4 py-3 mx-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                    onClick={() => {
                      installApp();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Download className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                    <span className="font-medium">{t('pwa.installMessage')}</span>
                  </div>
                </div>
              )}

              {/* Logout Button - Show only if logged in */}
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
        </div>
      )}
    </header>
  );
}