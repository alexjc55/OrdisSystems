import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchInput from "@/components/SearchInput";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { CategoryDropdown, buildCategoryOptions } from "@/components/ui/category-dropdown";

interface StickyFiltersProps {
  showBackButton: boolean;
  onBack: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: any[];
  discountFilter: string;
  onDiscountFilterChange: (value: string) => void;
  showFilters: boolean;
  showSearch: boolean;
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

  const categoryOptions = buildCategoryOptions(
    categories,
    currentLanguage,
    storeSettingsData,
    tShop('allCategories', 'Все категории')
  );

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
                    options={categoryOptions}
                    currentLanguage={currentLanguage}
                    data-testid="select-category"
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
