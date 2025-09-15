import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchInput from "@/components/SearchInput";
import { ChevronLeft } from "lucide-react";
import { useCommonTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedStoreField } from '@shared/multilingual-helpers';
import type { SupportedLanguage } from '@shared/localization';

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
  const { currentLanguage } = useLanguage();

  // Don't render if nothing to show
  if (!showBackButton && !showSearch && !showFilters) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1023px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col gap-3">
          {/* Back Button Row */}
          {showBackButton && (
            <div className="flex">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-primary p-2 h-auto"
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">{t('buttons.back', 'Назад')}</span>
              </Button>
            </div>
          )}

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            {showSearch && (
              <div className="flex-1 min-w-0">
                <SearchInput
                  value={searchQuery}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder || t('searchPlaceholder')}
                  data-testid="input-search"
                />
              </div>
            )}

            {/* Filter Controls */}
            {showFilters && (
              <div className="flex gap-2 sm:gap-3 sm:flex-shrink-0">
                <div className="flex-1 sm:min-w-[180px]">
                  <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
                    <SelectTrigger className="text-sm h-10" data-testid="select-category">
                      <SelectValue placeholder={t('filterByCategory', 'Фильтр по категории')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allCategories')}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {getLocalizedStoreField(category, 'name', currentLanguage as SupportedLanguage, 'ru')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 sm:min-w-[160px]">
                  <Select value={discountFilter} onValueChange={onDiscountFilterChange}>
                    <SelectTrigger className="text-sm h-10" data-testid="select-discount">
                      <SelectValue placeholder={t('filterByDiscount')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allProducts')}</SelectItem>
                      <SelectItem value="discount">{t('onlyDiscounted')}</SelectItem>
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