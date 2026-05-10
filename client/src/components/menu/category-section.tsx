import { memo } from 'react';
import { useShopTranslation, useLanguage } from '@/hooks/use-language';
import { getLocalizedField, type SupportedLanguage } from '@shared/localization';
import type { CategoryWithCount } from '@shared/schema';
import { UTMLink } from '@/components/UTMLink';
import { useQuery } from '@tanstack/react-query';

interface CategorySectionProps {
  categories: CategoryWithCount[];
  selectedCategoryId: number | null;
  onCategorySelect: (id: number | null) => void;
  displayStyle: string;
}

export default memo(function CategorySection({
  categories,
  selectedCategoryId,
  onCategorySelect,
  displayStyle,
}: CategorySectionProps) {
  const { t } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  const { data: storeSettings } = useQuery<any>({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000,
  });

  if (displayStyle === 'default' || !displayStyle) return null;

  if (displayStyle === 'carousel') {
    return (
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div
          className="flex items-start gap-3 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* "All" button */}
          <button
            onClick={() => onCategorySelect(null)}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl border transition-all duration-200 ${
              selectedCategoryId === null
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
            }`}
          >
            <span className="text-2xl">🛍️</span>
            <span className="text-xs font-medium whitespace-nowrap leading-tight">
              {t('allCategories')}
            </span>
          </button>

          {categories.map((cat) => {
            const name = getLocalizedField(cat, 'name', currentLanguage as SupportedLanguage, storeSettings);
            const isActive = selectedCategoryId === cat.id;
            return (
              <UTMLink key={cat.id} href={`/category/${cat.id}`}>
                <button
                  onClick={() => onCategorySelect(cat.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                  }`}
                >
                  <span className="text-2xl">{cat.icon || '📦'}</span>
                  <span className="text-xs font-medium whitespace-nowrap leading-tight">{name}</span>
                </button>
              </UTMLink>
            );
          })}
        </div>
      </div>
    );
  }

  // photo_grid mode
  const photoCats = categories.filter((cat) => (cat as any).image);
  if (photoCats.length === 0) return null;

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-6">
      <div className="grid grid-cols-2 gap-3">
        {photoCats.map((cat) => {
          const name = getLocalizedField(cat, 'name', currentLanguage as SupportedLanguage, storeSettings);
          const isActive = selectedCategoryId === cat.id;
          return (
            <UTMLink key={cat.id} href={`/category/${cat.id}`}>
              <div
                onClick={() => onCategorySelect(cat.id)}
                className={`relative overflow-hidden rounded-xl cursor-pointer group ${
                  isActive ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={{ aspectRatio: '4/3' }}
              >
                <img
                  src={(cat as any).image}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-semibold text-sm leading-tight drop-shadow">{name}</p>
                </div>
              </div>
            </UTMLink>
          );
        })}
      </div>
    </div>
  );
});
