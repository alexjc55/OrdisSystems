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
    : storeName;
    
  const description = welcomeSubtitle || 
    getLocalizedStoreField(storeSettings, 'description', language) ||
    '';
  
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
    ? `${categoryName} - ${storeName}`
    : storeName;

  const description = categoryDescription || categoryName || '';
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? `/category/${category?.id}` : `/${language}/category/${category?.id}`
  };
}

// Multilingual SEO data for auth page
export function generateAuthSEO(storeSettings: StoreSettings | null, language: string) {
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);

  const titles: Record<string, string> = {
    ru: 'Вход в аккаунт',
    en: 'Sign In',
    he: 'כניסה לחשבון',
    ar: 'تسجيل الدخول',
  };
  const descriptions: Record<string, string> = {
    ru: `Войдите в свой аккаунт${storeName ? ` в ${storeName}` : ''} для оформления заказов`,
    en: `Sign in to your${storeName ? ` ${storeName}` : ''} account to place orders`,
    he: `היכנס לחשבונך${storeName ? ` ב-${storeName}` : ''} לביצוע הזמנות`,
    ar: `سجل الدخول لحسابك${storeName ? ` في ${storeName}` : ''} لتقديم الطلبات`,
  };

  const titleText = titles[language] || titles.ru;
  const title = storeName ? `${titleText} - ${storeName}` : titleText;
  const description = descriptions[language] || descriptions.ru;
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? '/auth' : `/${language}/auth`
  };
}

// Multilingual SEO data for profile page
export function generateProfileSEO(storeSettings: StoreSettings | null, language: string) {
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);

  const titles: Record<string, string> = {
    ru: 'Личный кабинет',
    en: 'My Account',
    he: 'החשבון שלי',
    ar: 'حسابي',
  };
  const descriptions: Record<string, string> = {
    ru: `Управление профилем, заказами и адресами доставки${storeName ? ` в ${storeName}` : ''}`,
    en: `Manage your profile, orders and delivery addresses${storeName ? ` at ${storeName}` : ''}`,
    he: `ניהול פרופיל, הזמנות וכתובות משלוח${storeName ? ` ב-${storeName}` : ''}`,
    ar: `إدارة ملفك الشخصي والطلبات وعناوين التوصيل${storeName ? ` في ${storeName}` : ''}`,
  };

  const titleText = titles[language] || titles.ru;
  const title = storeName ? `${titleText} - ${storeName}` : titleText;
  const description = descriptions[language] || descriptions.ru;
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? '/profile' : `/${language}/profile`
  };
}

// Multilingual SEO data for checkout page
export function generateCheckoutSEO(storeSettings: StoreSettings | null, language: string) {
  const storeName = getLocalizedStoreField(storeSettings, 'storeName', language);

  const titles: Record<string, string> = {
    ru: 'Оформление заказа',
    en: 'Checkout',
    he: 'ביצוע הזמנה',
    ar: 'إتمام الطلب',
  };
  const descriptions: Record<string, string> = {
    ru: `Оформите заказ с доставкой${storeName ? ` в ${storeName}` : ''}`,
    en: `Place your delivery order${storeName ? ` at ${storeName}` : ''}`,
    he: `בצע הזמנה עם משלוח${storeName ? ` ב-${storeName}` : ''}`,
    ar: `قدم طلبك مع التوصيل${storeName ? ` في ${storeName}` : ''}`,
  };

  const titleText = titles[language] || titles.ru;
  const title = storeName ? `${titleText} - ${storeName}` : titleText;
  const description = descriptions[language] || descriptions.ru;
  
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    canonical: language === 'ru' ? '/checkout' : `/${language}/checkout`
  };
}
