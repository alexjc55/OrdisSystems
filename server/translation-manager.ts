import { db } from "./db";
import { products, categories, storeSettings, themes } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as XLSX from 'xlsx';

export interface TranslationRow {
  type: 'product' | 'category' | 'store_setting' | 'theme';
  id: string | number;
  field: string;
  original_field: string;
  ru: string;
  en: string;
  he: string;
  ar: string;
  description?: string;
}

// Define which fields are translatable for each type
const TRANSLATABLE_FIELDS = {
  product: [
    { field: 'name', description: 'Product Name' },
    { field: 'description', description: 'Product Description' },
    { field: 'ingredients', description: 'Product Ingredients' },
    { field: 'imageUrl', description: 'Product Image URL' }
  ],
  category: [
    { field: 'name', description: 'Category Name' },
    { field: 'description', description: 'Category Description' }
  ],
  store_setting: [
    { field: 'storeName', description: 'Store Name' },
    { field: 'welcomeTitle', description: 'Welcome Title' },
    { field: 'storeDescription', description: 'Store Description' },
    { field: 'deliveryInfo', description: 'Delivery Information' },
    { field: 'paymentInfo', description: 'Payment Information' },
    { field: 'aboutText', description: 'About Text' },
    { field: 'bannerButtonText', description: 'Banner Button Text' },
    { field: 'discountBadgeText', description: 'Discount Badge Text' },
    { field: 'whatsappDefaultMessage', description: 'WhatsApp Default Message' },
    { field: 'cartBannerText', description: 'Cart Banner Text' },
    { field: 'contactPhone', description: 'Contact Phone' },
    { field: 'contactEmail', description: 'Contact Email' },
    { field: 'address', description: 'Address' },
    { field: 'slide1Title', description: 'Slide 1 Title' },
    { field: 'slide1Subtitle', description: 'Slide 1 Subtitle' },
    { field: 'slide1ButtonText', description: 'Slide 1 Button Text' },
    { field: 'slide2Title', description: 'Slide 2 Title' },
    { field: 'slide2Subtitle', description: 'Slide 2 Subtitle' },
    { field: 'slide2ButtonText', description: 'Slide 2 Button Text' },
    { field: 'slide3Title', description: 'Slide 3 Title' },
    { field: 'slide3Subtitle', description: 'Slide 3 Subtitle' },
    { field: 'slide3ButtonText', description: 'Slide 3 Button Text' },
    { field: 'slide4Title', description: 'Slide 4 Title' },
    { field: 'slide4Subtitle', description: 'Slide 4 Subtitle' },
    { field: 'slide4ButtonText', description: 'Slide 4 Button Text' },
    { field: 'slide5Title', description: 'Slide 5 Title' },
    { field: 'slide5Subtitle', description: 'Slide 5 Subtitle' },
    { field: 'slide5ButtonText', description: 'Slide 5 Button Text' },
    { field: 'modernBlock1Text', description: 'Modern Block 1 Text' },
    { field: 'modernBlock2Text', description: 'Modern Block 2 Text' },
    { field: 'modernBlock3Text', description: 'Modern Block 3 Text' },
    { field: 'pwaName', description: 'PWA App Name' },
    { field: 'pwaDescription', description: 'PWA App Description' }
  ],
  theme: [
    { field: 'name', description: 'Theme Name' },
    { field: 'description', description: 'Theme Description' },
    { field: 'bannerButtonText', description: 'Banner Button Text' },
    { field: 'logoUrl', description: 'Logo URL' },
    { field: 'bannerImageUrl', description: 'Banner Image URL' }
  ]
};

// Function to get field name with language suffix
function getFieldName(baseField: string, language: string): string {
  if (language === 'ru') {
    // For Russian, some fields have 'Ru' suffix, others don't
    const fieldsWithRuSuffix = ['aboutText', 'bannerButtonText'];
    if (fieldsWithRuSuffix.includes(baseField)) {
      return `${baseField}Ru`;
    }
    return baseField; // Base field is Russian
  }
  
  // For other languages, capitalize first letter and add suffix
  const suffix = language.charAt(0).toUpperCase() + language.slice(1);
  return `${baseField}${suffix}`;
}

// Function to get database field name (snake_case for some tables)
function getDbFieldName(baseField: string, language: string, type: string): string {
  if (type === 'product' || type === 'category') {
    // Products and categories use snake_case with language suffix
    if (language === 'ru') {
      return baseField; // Base field is Russian
    }
    return `${baseField}_${language}`;
  }
  
  // Store settings and themes use camelCase
  return getFieldName(baseField, language);
}

export async function exportTranslations(): Promise<TranslationRow[]> {
  const translations: TranslationRow[] = [];

  try {
    // Export products
    const productList = await db.select().from(products);
    for (const product of productList) {
      for (const fieldInfo of TRANSLATABLE_FIELDS.product) {
        const row: TranslationRow = {
          type: 'product',
          id: product.id,
          field: fieldInfo.field,
          original_field: `Product ${product.id} - ${fieldInfo.description}`,
          ru: product[getDbFieldName(fieldInfo.field, 'ru', 'product') as keyof typeof product] as string || '',
          en: product[getDbFieldName(fieldInfo.field, 'en', 'product') as keyof typeof product] as string || '',
          he: product[getDbFieldName(fieldInfo.field, 'he', 'product') as keyof typeof product] as string || '',
          ar: product[getDbFieldName(fieldInfo.field, 'ar', 'product') as keyof typeof product] as string || '',
          description: fieldInfo.description
        };
        translations.push(row);
      }
    }

    // Export categories
    const categoryList = await db.select().from(categories);
    for (const category of categoryList) {
      for (const fieldInfo of TRANSLATABLE_FIELDS.category) {
        const row: TranslationRow = {
          type: 'category',
          id: category.id,
          field: fieldInfo.field,
          original_field: `Category ${category.id} - ${fieldInfo.description}`,
          ru: category[getDbFieldName(fieldInfo.field, 'ru', 'category') as keyof typeof category] as string || '',
          en: category[getDbFieldName(fieldInfo.field, 'en', 'category') as keyof typeof category] as string || '',
          he: category[getDbFieldName(fieldInfo.field, 'he', 'category') as keyof typeof category] as string || '',
          ar: category[getDbFieldName(fieldInfo.field, 'ar', 'category') as keyof typeof category] as string || '',
          description: fieldInfo.description
        };
        translations.push(row);
      }
    }

    // Export store settings
    const [storeSettingsList] = await db.select().from(storeSettings).limit(1);
    if (storeSettingsList) {
      for (const fieldInfo of TRANSLATABLE_FIELDS.store_setting) {
        const row: TranslationRow = {
          type: 'store_setting',
          id: storeSettingsList.id,
          field: fieldInfo.field,
          original_field: `Store Settings - ${fieldInfo.description}`,
          ru: storeSettingsList[getDbFieldName(fieldInfo.field, 'ru', 'store_setting') as keyof typeof storeSettingsList] as string || '',
          en: storeSettingsList[getDbFieldName(fieldInfo.field, 'en', 'store_setting') as keyof typeof storeSettingsList] as string || '',
          he: storeSettingsList[getDbFieldName(fieldInfo.field, 'he', 'store_setting') as keyof typeof storeSettingsList] as string || '',
          ar: storeSettingsList[getDbFieldName(fieldInfo.field, 'ar', 'store_setting') as keyof typeof storeSettingsList] as string || '',
          description: fieldInfo.description
        };
        translations.push(row);
      }
    }

    // Export themes
    const themeList = await db.select().from(themes);
    for (const theme of themeList) {
      for (const fieldInfo of TRANSLATABLE_FIELDS.theme) {
        const row: TranslationRow = {
          type: 'theme',
          id: theme.id,
          field: fieldInfo.field,
          original_field: `Theme ${theme.id} - ${fieldInfo.description}`,
          ru: theme[getDbFieldName(fieldInfo.field, 'ru', 'theme') as keyof typeof theme] as string || '',
          en: theme[getDbFieldName(fieldInfo.field, 'en', 'theme') as keyof typeof theme] as string || '',
          he: theme[getDbFieldName(fieldInfo.field, 'he', 'theme') as keyof typeof theme] as string || '',
          ar: theme[getDbFieldName(fieldInfo.field, 'ar', 'theme') as keyof typeof theme] as string || '',
          description: fieldInfo.description
        };
        translations.push(row);
      }
    }

    return translations;
  } catch (error) {
    console.error('Error exporting translations:', error);
    throw new Error('Failed to export translations');
  }
}

export function generateExcelFile(translations: TranslationRow[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(translations.map(row => ({
    'Type': row.type,
    'ID': row.id,
    'Field': row.field,
    'Description': row.original_field,
    'Russian (RU)': row.ru,
    'English (EN)': row.en,
    'Hebrew (HE)': row.he,
    'Arabic (AR)': row.ar
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Translations');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function importTranslations(translations: TranslationRow[]): Promise<void> {
  try {
    // Group translations by type and id
    const groupedTranslations = translations.reduce((acc, row) => {
      const key = `${row.type}_${row.id}`;
      if (!acc[key]) {
        acc[key] = {
          type: row.type,
          id: row.id,
          updates: {}
        };
      }
      
      // Add translations for each language
      const languages = ['ru', 'en', 'he', 'ar'] as const;
      for (const lang of languages) {
        const value = row[lang];
        if (value !== undefined && value !== null) {
          const fieldName = getDbFieldName(row.field, lang, row.type);
          acc[key].updates[fieldName] = value;
        }
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Apply updates to database
    for (const [key, group] of Object.entries(groupedTranslations)) {
      if (Object.keys(group.updates).length === 0) continue;

      switch (group.type) {
        case 'product':
          await db.update(products)
            .set(group.updates)
            .where(eq(products.id, Number(group.id)));
          break;
          
        case 'category':
          await db.update(categories)
            .set(group.updates)
            .where(eq(categories.id, Number(group.id)));
          break;
          
        case 'store_setting':
          await db.update(storeSettings)
            .set(group.updates)
            .where(eq(storeSettings.id, Number(group.id)));
          break;
          
        case 'theme':
          await db.update(themes)
            .set(group.updates)
            .where(eq(themes.id, group.id as string));
          break;
      }
    }
  } catch (error) {
    console.error('Error importing translations:', error);
    throw new Error('Failed to import translations');
  }
}

export function parseExcelFile(buffer: Buffer): TranslationRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  return jsonData.map((row: any) => ({
    type: row['Type'],
    id: row['ID'],
    field: row['Field'],
    original_field: row['Description'],
    ru: row['Russian (RU)'] || '',
    en: row['English (EN)'] || '',
    he: row['Hebrew (HE)'] || '',
    ar: row['Arabic (AR)'] || ''
  }));
}