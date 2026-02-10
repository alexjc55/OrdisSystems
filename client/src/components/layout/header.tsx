import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/cart";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation, useLanguage, useAdminTranslation } from "@/hooks/use-language";
import type { SupportedLanguage } from '@shared/localization';
import { getLocalizedImageField } from '@shared/multilingual-helpers';
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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
  
  const currentValue = storeSettings?.[langField];
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }
  
  return storeSettings?.[baseField] || '';
}
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Utensils, ShoppingCart, Menu, Settings, LogOut, User, X, Download, BarChart3, Bell, CheckCheck, Package, Megaphone, Info } from "lucide-react";
import { getNotifications, getUnreadCount, markAllAsRead, type StoredNotification } from "@/lib/notification-storage";
import { useLocation } from "wouter";
import { UTMLink as Link } from "@/components/UTMLink";
import type { User as UserType } from "@shared/schema";

interface HeaderProps {
  onResetView?: () => void;
}

export default function Header({ onResetView }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { items, toggleCart } = useCartStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const { t } = useCommonTranslation();
  const { t: adminT } = useAdminTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { storeSettings } = useStoreSettings();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const { isInstalled, installApp, isStandalone } = usePWA();
  const { isSubscribed, permission: pushPermission, isSupported: pushSupported } = usePushNotifications();
  
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  const isTablet = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const cartItemsCount = items.length;

  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const needsPush = pushSupported && pushPermission === 'default' && !isSubscribed;
  const needsInstall = !isInstalled && !isStandalone && isMobile;
  const actionCount = (needsPush ? 1 : 0) + (needsInstall ? 1 : 0);
  const bellCount = actionCount + unreadCount;

  useEffect(() => {
    const refreshNotifications = () => {
      setNotifications(getNotifications());
      setUnreadCount(getUnreadCount());
    };
    refreshNotifications();
    window.addEventListener('notifications-updated', refreshNotifications);
    return () => window.removeEventListener('notifications-updated', refreshNotifications);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (!isMobileMenuOpen) return;
      if (mobileMenuRef.current?.contains(event.target as Node)) return;
      if (toggleBtnRef.current?.contains(event.target as Node)) return;
      setIsMobileMenuOpen(false);
    };

    if (isMobileMenuOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      return () => {
        document.removeEventListener('pointerdown', handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isBellOpen) return;
    const handleClickOutside = (event: PointerEvent) => {
      if (bellRef.current?.contains(event.target as Node)) return;
      if (bellBtnRef.current?.contains(event.target as Node)) return;
      setIsBellOpen(false);
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isBellOpen]);

  const handlePushEnable = () => {
    setIsBellOpen(false);
    setTimeout(() => {
      if ('Notification' in window) {
        if ((window as any).showPushRequest) {
          (window as any).showPushRequest();
        } else {
          window.dispatchEvent(new CustomEvent('trigger-push-request', { detail: { action: 'bell-click' } }));
        }
      }
    }, 100);
  };

  const handleInstallApp = () => {
    setIsBellOpen(false);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
    }, 100);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4 text-white" />;
      case 'marketing': return <Megaphone className="w-4 h-4 text-white" />;
      default: return <Info className="w-4 h-4 text-white" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'order': return 'bg-orange-500';
      case 'marketing': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return t('bell.justNow');
    if (minutes < 60) return (t as any)('bell.minutesAgo', { count: minutes });
    if (hours < 24) return (t as any)('bell.hoursAgo', { count: hours });
    return (t as any)('bell.daysAgo', { count: days });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1023px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center min-w-0 flex-1">
            <Link href="/" onClick={() => onResetView?.()}>
              <div className="flex items-center cursor-pointer">
                {(() => {
                  const logoUrl = getLocalizedImageField(storeSettings, 'logoUrl', currentLanguage as SupportedLanguage);
                  const validLogoUrl = logoUrl && logoUrl.trim() !== '' ? logoUrl : null;
                  
                  return validLogoUrl ? (
                    <img 
                      src={validLogoUrl} 
                      alt={getMultilingualValue(storeSettings, 'storeName', currentLanguage as SupportedLanguage) || "eDAHouse"} 
                      className="h-8 md:h-10 w-auto mr-2 md:mr-3 rtl:mr-0 rtl:ml-2 md:rtl:ml-3 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-8 md:h-10 w-auto mr-2 md:mr-3 rtl:mr-0 rtl:ml-2 md:rtl:ml-3 flex-shrink-0 flex items-center">
                      <span className="text-lg md:text-xl font-bold text-primary">📋</span>
                    </div>
                  );
                })()}
                <h1 className="text-lg md:text-2xl font-poppins font-bold text-primary truncate">
                  {getMultilingualValue(storeSettings, 'storeName', currentLanguage as SupportedLanguage) || "eDAHouse"}
                </h1>
              </div>
            </Link>
            
            <nav className="hidden md:flex ml-8 rtl:ml-0 rtl:mr-8 space-x-8 rtl:space-x-reverse">
              <Link href="/" onClick={() => onResetView?.()} className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                {t('menu')}
              </Link>
              {(user?.role === 'admin' || user?.role === 'worker') && (
                <Link href="/admin" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  {t('admin')}
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link href="/admin/analytics" className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  {adminT('analytics.title')}
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-1 md:gap-4 rtl:space-x-reverse flex-shrink-0">
            {storeSettings?.enabledLanguages && storeSettings.enabledLanguages.length > 1 && (
              <div className="hidden md:block">
                <LanguageSwitcher variant="compact" />
              </div>
            )}
            
            {/* Cart Button - Desktop only */}
            <div className="hidden md:block">
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
            </div>

            {/* Bell Button - Mobile only, always visible */}
            {isMobile && (
              <div className="relative md:hidden">
                <Button
                  ref={bellBtnRef}
                  variant="ghost"
                  size="sm"
                  className="relative p-2 text-gray-600 hover:text-primary outline-none"
                  onClick={() => setIsBellOpen(prev => !prev)}
                >
                  <Bell className="h-5 w-5" />
                  {bellCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                      {bellCount}
                    </span>
                  )}
                </Button>

                {isBellOpen && (
                  <div
                    ref={bellRef}
                    className="absolute top-full right-0 rtl:right-auto rtl:left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-[59]"
                  >
                    {(needsPush || needsInstall) && (
                      <div className="p-3 space-y-2 border-b border-gray-100">
                        {needsPush && (
                          <div
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                            onClick={handlePushEnable}
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <Bell className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{t('bell.enableNotifications')}</p>
                              <p className="text-xs text-gray-500">{t('bell.enableNotificationsDesc')}</p>
                            </div>
                          </div>
                        )}
                        {needsInstall && (
                          <div
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
                            onClick={handleInstallApp}
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Download className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{t('bell.installApp')}</p>
                              <p className="text-xs text-gray-500">{t('bell.installAppDesc')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length > 0 ? (
                        <>
                          {unreadCount > 0 && (
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                              <span className="text-xs font-medium text-gray-500">{t('bell.notifications')}</span>
                              <button
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                                onClick={handleMarkAllRead}
                              >
                                <CheckCheck className="w-3 h-3" />
                                {t('bell.markAllRead')}
                              </button>
                            </div>
                          )}
                          <div className="divide-y divide-gray-50">
                            {notifications.slice(0, 20).map(n => (
                              <div
                                key={n.id}
                                className={`flex items-start gap-3 p-3 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                              >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${getNotificationBg(n.type)}`}>
                                  {getNotificationIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                                  {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                                  <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(n.timestamp)}</p>
                                </div>
                                {!n.read && (
                                  <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-6 px-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Bell className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">{t('bell.noNotifications')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isInstalled && isTablet && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex lg:hidden p-2 text-gray-600 hover:text-primary"
                onClick={() => installApp()}
                title={t('pwa.installApp')}
              >
                <Download className="h-5 w-5" />
              </Button>
            )}

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
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Settings className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            <span>{t('adminPanel')}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/analytics">
                            <BarChart3 className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            <span>{adminT('analytics.title')}</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
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
                
            {/* Mobile Menu Button - REMOVED, now in bottom nav */}
          </div>
        </div>
      </div>
    </header>
  );
}
