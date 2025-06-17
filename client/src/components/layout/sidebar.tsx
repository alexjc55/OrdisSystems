import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CategoryWithProducts } from "@shared/schema";

interface SidebarProps {
  categories: CategoryWithProducts[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
  isLoading?: boolean;
}

function getIconForCategory(category: CategoryWithProducts): string {
  return category.icon || '📦';
}

export default function Sidebar({
  categories,
  selectedCategoryId,
  onCategorySelect,
  isLoading = false
}: SidebarProps) {
  if (isLoading) {
    return (
      <aside className="hidden lg:block w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-poppins font-semibold text-gray-900 mb-4">
            Категории
          </h2>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center px-3 py-2 bg-gray-100 rounded-md">
                  <div className="w-4 h-4 bg-gray-200 rounded mr-3"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                  <div className="w-8 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <h2 className="text-lg font-poppins font-semibold text-gray-900 mb-4">
          Категории
        </h2>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <nav className="space-y-2">
            <Button
              variant="ghost"
              onClick={() => onCategorySelect(null)}
              className={cn(
                "w-full justify-start px-3 py-1.5 text-sm font-medium rounded-md h-9",
                selectedCategoryId === null
                  ? "text-primary bg-primary/10 border-r-2 border-primary"
                  : "text-gray-700 hover:bg-gray-50 hover:text-primary"
              )}
            >
              <span className="mr-3">🛍️</span>
              Все товары
              <Badge variant="secondary" className="ml-auto text-xs bg-gray-200 text-gray-700">
                {categories.reduce((acc, cat) => acc + cat.products.length, 0)}
              </Badge>
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                onClick={() => onCategorySelect(category.id)}
                className={cn(
                  "w-full justify-start px-3 py-1.5 text-sm font-medium rounded-md h-9",
                  selectedCategoryId === category.id
                    ? "text-primary bg-primary/10 border-r-2 border-primary"
                    : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                )}
              >
                <span className="mr-3">{category.icon || '📦'}</span>
                {category.name}
                <Badge variant="secondary" className="ml-auto text-xs bg-gray-200 text-gray-700">
                  {category.products.filter(p => p.isAvailable).length}
                </Badge>
              </Button>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
