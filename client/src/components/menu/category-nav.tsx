import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategoryWithProducts } from "@shared/schema";

interface CategoryNavProps {
  categories: CategoryWithProducts[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
}

const categoryIcons: Record<string, string> = {
  'рыба': '🐟',
  'мясо': '🥩',
  'овощи': '🥕',
  'фрукты': '🍎',
  'хлебобулочные': '🍞',
  'молочные': '🥛',
  'готовые блюда': '🍽️',
  'салаты': '🥗',
  'default': '📦'
};

function getIconForCategory(name: string): string {
  const key = name.toLowerCase();
  return categoryIcons[key] || categoryIcons.default;
}

export default function CategoryNav({
  categories,
  selectedCategoryId,
  onCategorySelect
}: CategoryNavProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategoryId === null ? "default" : "secondary"}
          size="sm"
          onClick={() => onCategorySelect(null)}
          className={cn(
            "flex-shrink-0 text-sm font-medium px-4 py-2 h-9",
            selectedCategoryId === null
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
            onClick={() => onCategorySelect(category.id)}
            className={cn(
              "flex-shrink-0 text-sm font-medium px-4 py-2 h-9",
              selectedCategoryId === category.id
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <span className="mr-2">
              {category.icon || getIconForCategory(category.name)}
            </span>
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
