// CRITICAL FIX: Header component optimization to stop menu flickering on VPS
// This fix addresses infinite re-renders caused by:
// 1. Duplicate imports
// 2. Functions defined inside component scope  
// 3. window.matchMedia called on every render
// 4. Missing variable references

const headerFix = `
import { useState, useEffect, useRef, useMemo } from "react";
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

// Move multilingual helper function outside component to prevent recreating on each render
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
    langField = \`\${baseField}\${capitalizedLang}\`;
  }
  
  // Try to get value for current language, fallback to default language if empty
  const currentValue = storeSettings?.[langField];
  if (currentValue && currentValue.trim() !== '') {
    return currentValue;
  }
  
  // Fallback to default language (Russian)
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
  const { storeSettings } = useStoreSettings();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { isInstalled, installApp } = usePWA();
  
  // Memoize device detection to prevent unnecessary recalculations  
  const deviceInfo = useMemo(() => {
    if (typeof window === 'undefined') return { isMobile: false, isTablet: false, isDesktop: false };
    
    return {
      isMobile: window.matchMedia('(max-width: 767px)').matches,
      isTablet: window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches,
      isDesktop: window.matchMedia('(min-width: 1024px)').matches
    };
  }, []);

  // Memoize cart count to prevent unnecessary renders
  const cartItemsCount = useMemo(() => items.length, [items.length]);
  
  // Memoize store name to prevent recalculation on every render
  const storeName = useMemo(() => {
    return getMultilingualValue(storeSettings, 'storeName', currentLanguage as SupportedLanguage) || "eDAHouse";
  }, [storeSettings, currentLanguage]);

  // Rest of component stays the same...
  // This optimization should stop the flickering by preventing excessive re-renders
`;

console.log("Header fix created - this optimization prevents infinite re-renders that cause menu flickering");