import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { memo, useCallback } from "react";
import type { CategoryWithProducts } from "@shared/schema";

interface CategoryNavProps {
  categories: CategoryWithProducts[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
}

function getIconForCategory(category: CategoryWithProducts): string {
  return category.icon || '📦';
}

export default memo(function CategoryNav({
  categories,
  selectedCategoryId,
  onCategorySelect
}: CategoryNavProps) {
  const handleAllCategoriesClick = useCallback(() => {
    onCategorySelect(null);
  }, [onCategorySelect]);

  const handleCategoryClick = useCallback((categoryId: number) => {
    onCategorySelect(categoryId);
  }, [onCategorySelect]);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategoryId === null ? "default" : "secondary"}
          size="sm"
          onClick={handleAllCategoriesClick}
          className={cn(
            "flex-shrink-0 text-sm font-medium px-3 py-1.5 h-8 transition-shadow",
            selectedCategoryId === null
              ? "bg-primary text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/50"
              : "bg-gray-100 text-gray-700 hover:bg-gray-100 hover:shadow-lg hover:shadow-gray-300"
          )}
        >
          <span className="mr-2">🛍️</span>
          Все
        </Button>
        
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? "default" : "secondary"}
            size="sm"
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              "flex-shrink-0 text-sm font-medium px-3 py-1.5 h-8 transition-shadow",
              selectedCategoryId === category.id
                ? "bg-primary text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/50"
                : "bg-gray-100 text-gray-700 hover:bg-gray-100 hover:shadow-lg hover:shadow-gray-300"
            )}
          >
            <span className="mr-2">{category.icon || '📦'}</span>
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
});
