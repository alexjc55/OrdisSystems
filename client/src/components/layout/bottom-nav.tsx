import { Home, User, ShoppingCart, Menu, X, Utensils, Settings, BarChart3, Download, LogOut } from "lucide-react";
import { UTMLink } from "@/components/UTMLink";
import { useCommonTranslation, useAdminTranslation, useLanguage } from "@/hooks/use-language";
import { useCartStore } from "@/lib/cart";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { usePWA } from "@/hooks/usePWA";
import { useState, useEffect, useRef } from "react";

export function BottomNav() {
  const { t } = useCommonTranslation();
  const { t: adminT } = useAdminTranslation();
  const { items, toggleCart } = useCartStore();
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { storeSettings } = useStoreSettings();
  const { isInstalled, installApp } = usePWA();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  const hiddenPaths = ["/admin", "/landing"];
  if (hiddenPaths.some(p => location.startsWith(p))) return null;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [isMenuOpen]);

  const isActive = (path: string) => {
    if (path === "/" && (location === "/" || location.startsWith("/category/") || location === "/all-products")) return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const allLanguages: Array<{ code: 'ru' | 'en' | 'he' | 'ar', name: string }> = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
    { code: 'he', name: 'עברית' },
    { code: 'ar', name: 'العربية' }
  ];
  const enabledLanguageCodes = storeSettings?.enabledLanguages || ['ru'];
  const languages = allLanguages.filter(lang => enabledLanguageCodes.includes(lang.code));

  return (
    <>
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-[55] md:hidden" onClick={() => setIsMenuOpen(false)} />
      )}

      {isMenuOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-[60px] left-0 right-0 z-[56] bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:hidden animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="max-w-[1023px] mx-auto p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">{t("navigation.menu")}</span>
              <button onClick={() => setIsMenuOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex-1 min-w-[45%]">
                <div className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
                  <Utensils className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  <span className="font-medium text-sm">{t('menu')}</span>
                </div>
              </Link>
              {user ? (
                <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="flex-1 min-w-[45%]">
                  <div className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer">
                    <User className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    <span className="font-medium text-sm">{t('profile.title')}</span>
                  </div>
                </Link>
              ) : (
                <Link href="/auth" onClick={() => setIsMenuOpen(false)} className="flex-1 min-w-[45%]">
                  <div className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer">
                    <User className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    <span className="font-medium text-sm">{t('login')}</span>
                  </div>
                </Link>
              )}
            </div>

            {user && (user.role === 'admin' || user.role === 'worker') && (
              <div className="flex flex-wrap gap-2">
                <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex-1 min-w-[45%]">
                  <div className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors cursor-pointer">
                    <Settings className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    <span className="font-medium text-sm">{t('admin')}</span>
                  </div>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/analytics" onClick={() => setIsMenuOpen(false)} className="flex-1 min-w-[45%]">
                    <div className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer">
                      <BarChart3 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      <span className="font-medium text-sm">{adminT('analytics.title')}</span>
                    </div>
                  </Link>
                )}
              </div>
            )}

            {languages.length > 1 && (
              <div className="border-t border-gray-100 pt-3">
                <span className="text-xs font-medium text-gray-500 block mb-2">{t('language')}</span>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors text-xs flex-1 ${
                        currentLanguage === lang.code
                          ? 'bg-blue-50 text-blue-600 font-medium border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isInstalled && isMobile && (
              <div className="border-t border-gray-100 pt-3">
                <div
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                  onClick={() => {
                    installApp();
                    setIsMenuOpen(false);
                  }}
                >
                  <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  <span className="font-medium text-sm">{t('pwa.installApp')}</span>
                </div>
              </div>
            )}

            {user && (
              <div className="border-t border-gray-100 pt-3">
                <div
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                  onClick={() => {
                    logoutMutation.mutate();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  <span className="font-medium text-sm">{t('logout')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-[57] bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden">
        <div className="max-w-[1023px] mx-auto flex items-center justify-around h-[60px]">
          <UTMLink
            href="/"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors ${
              isActive("/") ? "text-orange-500" : "text-gray-500"
            }`}
          >
            <Home className="h-5 w-5" />
            <span>{t("navigation.home")}</span>
          </UTMLink>

          <UTMLink
            href="/profile"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors ${
              isActive("/profile") || isActive("/auth") ? "text-orange-500" : "text-gray-500"
            }`}
          >
            <User className="h-5 w-5" />
            <span>{t("navigation.profile")}</span>
          </UTMLink>

          <button
            onClick={toggleCart}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs text-gray-500 transition-colors relative"
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {totalItems}
                </span>
              )}
            </div>
            <span>{t("navigation.cart")}</span>
          </button>

          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors ${
              isMenuOpen ? "text-orange-500" : "text-gray-500"
            }`}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>{t("navigation.menu")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
