import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/cart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation } from "@/hooks/use-language";
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
              
              {/* Language Switcher on Mobile - Only show if multiple languages enabled */}
              {storeSettings?.enabledLanguages && storeSettings.enabledLanguages.length > 1 && (
                <div className="px-4 py-3 mx-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
                  <p className="text-base font-semibold text-white mb-3 flex items-center">
                    <svg className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd" />
                    </svg>
                    {t('language')}
                  </p>
                  <LanguageSwitcher variant="compact" />
                </div>
              )}
              
              {/* Login Button for non-logged in users */}
              {!user && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center px-4 py-3 mx-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer">
                      <User className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="text-base font-semibold">{t('login')}</span>
                    </div>
                  </Link>
                </div>
              )}
              
              {/* User Profile Link - Only for logged in users */}
              {user && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center px-4 py-3 mx-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer">
                      <User className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                      <span className="text-base font-semibold">{t('navigation.profile')}</span>
                    </div>
                  </Link>
                  
                  <div 
                    className="flex items-center px-4 py-3 mx-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform hover:scale-105 transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      logoutMutation.mutate();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-3 h-5 w-5 rtl:ml-3 rtl:mr-0" />
                    <span className="text-base font-semibold">{t('logout')}</span>
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