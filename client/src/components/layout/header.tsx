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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <Link href="/" onClick={() => onResetView?.()}>
              <div className="flex items-center cursor-pointer">
                {storeSettings?.logoUrl ? (
                  <img 
                    src={storeSettings.logoUrl} 
                    alt={storeSettings.storeName || "eDAHouse"} 
                    className="h-10 w-auto mr-3 rtl:mr-0 rtl:ml-3"
                    onError={(e) => {
                      e.currentTarget.src = "/@assets/Edahouse_sign__source_1750184330403.png";
                    }}
                  />
                ) : (
                  <img 
                    src="/@assets/Edahouse_sign__source_1750184330403.png" 
                    alt="eDAHouse" 
                    className="h-10 w-auto mr-3 rtl:mr-0 rtl:ml-3"
                  />
                )}
                <h1 className="text-2xl font-poppins font-bold text-primary">
                  {storeSettings?.storeName || "eDAHouse"}
                </h1>
              </div>
            </Link>
            <nav className="hidden md:flex space-x-8 rtl:space-x-reverse">
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

          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />
            
            {/* Cart Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleCart}
              className={`relative p-2 transition-all duration-200 ${
                cartItemsCount > 0 
                  ? "text-orange-600 hover:text-orange-700 scale-105" 
                  : "text-gray-600 hover:text-primary"
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center text-xs p-0 bg-orange-500 hover:bg-orange-600 text-white border-2 border-white animate-pulse"
                >
                  {Math.round(cartItemsCount)}
                </Badge>
              )}
            </Button>

            {/* User Menu or Login Button */}
            {user ? (
              <div className="hidden md:flex items-center space-x-3">
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
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>{t('profile')}</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <div className="flex items-center">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>{t('adminPanel')}</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('logout')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link href="/auth">
                <Button 
                  className="bg-orange-500 hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-300/50 text-white hidden md:flex transition-all duration-200"
                >
                  {t('login')}
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 text-gray-600 hover:text-primary"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              <Link href="/">
                <a className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium block text-start">
                  {t('menu')}
                </a>
              </Link>
              {(user?.role === 'admin' || user?.role === 'worker') && (
                <Link href="/admin">
                  <a className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium block text-start">
                    {t('admin')}
                  </a>
                </Link>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                {user ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start px-3 py-2 text-sm"
                      onClick={() => logoutMutation.mutate()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </Button>
                  </>
                ) : (
                  <Link href="/auth">
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-white mx-3 my-2"
                    >
                      {t('login')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
