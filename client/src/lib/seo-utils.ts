import { StoreSettings, Category } from '@shared/schema';

// Get localized store field with fallback logic
export function getLocalizedStoreField(
  storeSettings: StoreSettings | null | undefined,
  field: string,
  language: string
): string {
  if (!storeSettings) return '';
  
  const langSuffix = language === 'ru' ? '' : `_${language}`;
  const localizedField = `${field}${langSuffix}` as keyof StoreSettings;
  const defaultField = field as keyof StoreSettings;
  
  const localizedValue = storeSettings[localizedField] as string;
  const defaultValue = storeSettings[defaultField] as string;
  
  return localizedValue || defaultValue || '';
}

// Get localized category field with fallback logic
export function getLocalizedCategoryField(
  category: Category | null | undefined,
  field: string,
  language: string
): string {
  if (!category) return '';
  
  const langSuffix = language === 'ru' ? '' : `_${language}`;
  const localizedField = `${field}${langSuffix}` as keyof Category;
  const defaultField = field as keyof Category;
  
  const localizedValue = category[localizedField] as string;
  const defaultValue = category[defaultField] as string;
  
  return localizedValue || defaultValue || '';
}

// Generate SEO data for home page
export function generateHomeSEO(storeSettings: StoreSettings | null, language: string) {
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);
  const welcomeTitle = getLocalizedStoreField(storeSettings, 'welcomeTitle', language);
  const welcomeSubtitle = getLocalizedStoreField(storeSettings, 'welcomeSubtitle', language);
  
  const title = welcomeTitle 
    ? `${storeName} - ${welcomeTitle}`
    : storeName || 'eDAHouse';
    
  const description = welcomeSubtitle || 
    getLocalizedStoreField(storeSettings, 'description', language) ||
    'Система доставки готовой еды с многоязычной поддержкой';
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? '/' : `/${language}/`
  };
}

// Generate SEO data for category page
export function generateCategorySEO(
  category: Category | null, 
  storeSettings: StoreSettings | null, 
  language: string
) {
  const categoryName = getLocalizedCategoryField(category, 'name', language);
  const categoryDescription = getLocalizedCategoryField(category, 'description', language);
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);
  
  const title = categoryName 
    ? `${categoryName} - ${storeName || 'eDAHouse'}`
    : storeName || 'eDAHouse';
    
  const description = categoryDescription || 
    `Просмотр товаров в категории ${categoryName} в магазине ${storeName}`;
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? `/category/${category?.id}` : `/${language}/category/${category?.id}`
  };
}

// Generate SEO data for auth page
export function generateAuthSEO(storeSettings: StoreSettings | null, language: string) {
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);
  
  const title = `Вход в аккаунт - ${storeName || 'eDAHouse'}`;
  const description = `Войдите в свой аккаунт в ${storeName || 'eDAHouse'} для оформления заказов`;
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? '/auth' : `/${language}/auth`
  };
}

// Generate SEO data for profile page
export function generateProfileSEO(storeSettings: StoreSettings | null, language: string) {
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);
  
  const title = `Личный кабинет - ${storeName || 'eDAHouse'}`;
  const description = `Управление профилем, заказами и адресами доставки в ${storeName || 'eDAHouse'}`;
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? '/profile' : `/${language}/profile`
  };
}

// Generate SEO data for checkout page
export function generateCheckoutSEO(storeSettings: StoreSettings | null, language: string) {
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);
  
  const title = `Оформление заказа - ${storeName || 'eDAHouse'}`;
  const description = `Оформите заказ готовой еды с доставкой в ${storeName || 'eDAHouse'}`;
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? '/checkout' : `/${language}/checkout`
  };
}