import { Home, User, ShoppingCart, Menu } from "lucide-react";
import { UTMLink } from "@/components/UTMLink";
import { useCommonTranslation } from "@/hooks/use-language";
import { useCartStore } from "@/lib/cart";
import { useLocation } from "wouter";

export function BottomNav() {
  const onMenuToggle = () => window.dispatchEvent(new Event('toggle-mobile-menu'));
  const { t } = useCommonTranslation();
  const { items, toggleCart } = useCartStore();
  const [location] = useLocation();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const hiddenPaths = ["/admin", "/landing"];
  if (hiddenPaths.some(p => location.startsWith(p))) return null;

  const isActive = (path: string) => {
    if (path === "/" && (location === "/" || location.startsWith("/category/") || location === "/all-products")) return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden">
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
            isActive("/profile") ? "text-orange-500" : "text-gray-500"
          }`}
        >
          <User className="h-5 w-5" />
          <span>{t("navigation.profile")}</span>
        </UTMLink>

        <button
          onClick={toggleCart}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs text-gray-500 transition-colors relative`}
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
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs text-gray-500 transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span>{t("navigation.menu")}</span>
        </button>
      </div>
    </nav>
  );
}
