import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { memo, useCallback } from "react";
import { useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import type { CategoryWithCount } from "@shared/schema";

interface CategoryNavProps {
  categories: CategoryWithCount[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
}

function getIconForCategory(category: CategoryWithCount): string {
  return category.icon || '📦';
}

export default memo(function CategoryNav({
  categories,
  selectedCategoryId,
  onCategorySelect
}: CategoryNavProps) {
  const { t } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  
  const handleAllCategoriesClick = useCallback(() => {
    onCategorySelect(null);
  }, [onCategorySelect]);

  const handleCategoryClick = useCallback((categoryId: number) => {
    onCategorySelect(categoryId);
  }, [onCategorySelect]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 lg:hidden">
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategoryId === null ? "default" : "secondary"}
          size="sm"
          onClick={handleAllCategoriesClick}
          className="flex-shrink-0"
        >
          <span className="mr-2 rtl:mr-0 rtl:ml-2">🛍️</span>
          {t('allCategories')}
        </Button>
        
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? "default" : "secondary"}
            size="sm"
            onClick={() => handleCategoryClick(category.id)}
            className="flex-shrink-0"
          >
            <span className="mr-2 rtl:mr-0 rtl:ml-2">{category.icon || '📦'}</span>
            {getLocalizedField(category, 'name', currentLanguage as SupportedLanguage, 'ru' as SupportedLanguage)}
          </Button>
        ))}
      </div>
    </div>
  );
});
