import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import type { CategoryWithCount } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { UTMLink } from "@/components/UTMLink";

interface SidebarProps {
  categories: CategoryWithCount[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
  isLoading?: boolean;
}

function getIconForCategory(category: CategoryWithCount): string {
  return category.icon || '📦';
}

export default function Sidebar({
  categories,
  selectedCategoryId,
  onCategorySelect,
  isLoading = false
}: SidebarProps) {
  const { t } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  
  // Load store settings for default language
  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  if (isLoading) {
    return (
      <aside className="hidden lg:block w-64 shadow-sm border-r border-gray-200" style={{ backgroundColor: 'var(--color-card)' }}>
        <div className="p-6">
          <h2 className="text-lg font-poppins font-semibold text-gray-900 mb-4">
{t('categoriesText')}
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
    <aside className="hidden lg:block w-64 shadow-sm border-r border-gray-200" style={{ backgroundColor: 'var(--color-card)' }}>
      <div className="p-6">
        <h2 className="text-lg font-poppins font-semibold text-gray-900 mb-4">
{t('categoriesText')}
        </h2>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="space-y-1">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left h-auto px-3 py-2 font-normal",
                  selectedCategoryId === category.id
                    ? "text-primary bg-primary/10 border-r-2 border-primary"
                    : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                )}
                asChild
              >
                <UTMLink
                  href={`/category/${category.id}`}
                >
                  <span className="mr-3 rtl:mr-0 rtl:ml-3">{category.icon || '📦'}</span>
                  {getLocalizedField(category, 'name', currentLanguage as SupportedLanguage, storeSettings as any)}
                  <Badge variant="secondary" className="ml-auto text-xs bg-gray-200 text-gray-700">
                    {category.productCount}
                  </Badge>
                </UTMLink>
              </Button>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}