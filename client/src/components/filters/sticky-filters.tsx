import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchInput from "@/components/SearchInput";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface StickyFiltersProps {
  // Back button
  showBackButton: boolean;
  onBack: () => void;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  
  // Category filter
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: any[];
  
  // Discount filter
  discountFilter: string;
  onDiscountFilterChange: (value: string) => void;
  
  // Show conditions
  showFilters: boolean;
  showSearch: boolean;
}

function CategoryDropdown({
  value,
  onChange,
  categories,
  placeholder,
  allCategoriesLabel,
  currentLanguage,
  storeSettingsData,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: any[];
  placeholder: string;
  allCategoriesLabel: string;
  currentLanguage: string;
  storeSettingsData: any;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const allOptions = [
    { id: "all", label: allCategoriesLabel },
    ...categories.map((cat) => ({
      id: cat.id.toString(),
      label:
        getLocalizedField(cat, "name", currentLanguage as SupportedLanguage, storeSettingsData) ||
        cat.name ||
        `Category ${cat.id}`,
    })),
  ];

  const selected = allOptions.find((o) => o.id === value);
  const displayLabel = selected ? selected.label : placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid="select-category"
      >
        <span className="truncate text-start">{displayLabel}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ms-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border bg-popover text-popover-foreground shadow-md">
          <div
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: "15rem", touchAction: "pan-y", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            <div className="p-1">
              {allOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center justify-start text-start rounded-sm py-1.5 ps-8 pe-2 text-sm outline-none",
                    value === opt.id
                      ? "bg-primary text-white"
                      : "hover:bg-primary hover:text-white"
                  )}
                >
                  {value === opt.id && (
                    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  <span className="text-start">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StickyFilters({
  showBackButton,
  onBack,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  discountFilter,
  onDiscountFilterChange,
  showFilters,
  showSearch
}: StickyFiltersProps) {
  const { t } = useCommonTranslation();
  const { t: tShop } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  const { data: storeSettingsData } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000,
  });

  if (!showBackButton && !showSearch && !showFilters) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gray-100 border-b border-gray-300 shadow-sm">
      <div className="max-w-[1023px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 sm:gap-4 items-center flex-wrap">
            {/* Back Button */}
            {showBackButton && (
              <div className="flex-shrink-0">
                <Button
                  onClick={onBack}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-primary p-2 h-9 inline-flex items-center"
                  data-testid="button-back"
                >
                  {(currentLanguage === 'he' || currentLanguage === 'ar')
                    ? <ChevronRight className="h-4 w-4" />
                    : <ChevronLeft className="h-4 w-4" />
                  }
                  <span className="ml-1 rtl:ml-0 rtl:mr-1 sm:inline">{t('buttons.back', 'Назад')}</span>
                </Button>
              </div>
            )}

            {/* Search */}
            {showSearch && (
              <div className="flex-1 min-w-[200px]">
                <SearchInput
                  value={searchQuery}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder || tShop('searchPlaceholder')}
                  data-testid="input-search"
                />
              </div>
            )}

            {/* Filter Controls */}
            {showFilters && (
              <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                <div className="flex-1 sm:min-w-[160px]">
                  <CategoryDropdown
                    value={categoryFilter}
                    onChange={onCategoryFilterChange}
                    categories={categories}
                    placeholder={tShop('filterByCategory', 'Фильтр по категории')}
                    allCategoriesLabel={tShop('allCategories', 'Все категории')}
                    currentLanguage={currentLanguage}
                    storeSettingsData={storeSettingsData}
                  />
                </div>

                <div className="flex-1 sm:min-w-[140px]">
                  <Select value={discountFilter} onValueChange={onDiscountFilterChange}>
                    <SelectTrigger className="text-sm h-9" data-testid="select-discount">
                      <SelectValue placeholder={tShop('filterByDiscount')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tShop('allProducts', 'Все товары')}</SelectItem>
                      <SelectItem value="discount">{tShop('onlyDiscounted', 'Товары со скидкой')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
