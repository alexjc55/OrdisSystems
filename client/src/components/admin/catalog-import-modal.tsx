import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Store, Package, Sparkles, Link2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ImportCategory {
  id: string;
  name: string;
  itemCount: number;
  imageUrl?: string;
}

interface ImportItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
}

interface MenuData {
  platform: 'wolt' | '10bis';
  restaurantName: string;
  categories: ImportCategory[];
  items: ImportItem[];
  existingExternalIds: string[];
  existingCategoryExternalIds: string[];
}

interface CatalogCategory {
  id: number;
  name: string | null;
  name_en: string | null;
  name_he: string | null;
  name_ar: string | null;
}

type Step = 'url' | 'categories' | 'items' | 'done';

interface Props {
  open: boolean;
  onClose: () => void;
  currentLanguage: string;
  isRTL: boolean;
}

const UNIT_OPTIONS = [
  { value: 'piece',   ru: 'штука',  en: 'piece',   he: 'יחידה', ar: 'قطعة' },
  { value: 'portion', ru: 'порция', en: 'portion', he: 'מנה',   ar: 'حصة'  },
  { value: 'kg',      ru: 'кг',     en: 'kg',      he: 'ק"ג',  ar: 'كغ'   },
  { value: '100g',    ru: '100г',   en: '100g',    he: '100גר', ar: '100غ' },
  { value: '100ml',   ru: '100мл',  en: '100ml',   he: '100מל', ar: '100مل'},
];

const LANG_OPTIONS = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית'   },
  { value: 'ar', label: 'العربية' },
];

export function CatalogImportModal({ open, onClose, currentLanguage, isRTL }: Props) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [targetLanguage, setTargetLanguage] = useState(currentLanguage || 'ru');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [existingCategoryIds, setExistingCategoryIds] = useState<Set<string>>(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [itemUnits, setItemUnits] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ categoriesCreated: number; categoriesMatched: number; categoriesLinked: number; itemsCreated: number } | null>(null);
  const [itemFilter, setItemFilter] = useState<'all' | 'new'>('new');
  const [showManualPanel, setShowManualPanel] = useState(false);
  const [manualJson, setManualJson] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    fetch('/api/categories?includeInactive=true', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCatalogCategories(data); })
      .catch(() => {});
  }, [open]);

  const t = (ru: string, en: string, he: string, ar: string) => {
    if (currentLanguage === 'en') return en;
    if (currentLanguage === 'he') return he;
    if (currentLanguage === 'ar') return ar;
    return ru;
  };

  const unitLabel = (val: string) => {
    const opt = UNIT_OPTIONS.find(u => u.value === val);
    if (!opt) return val;
    if (currentLanguage === 'en') return opt.en;
    if (currentLanguage === 'he') return opt.he;
    if (currentLanguage === 'ar') return opt.ar;
    return opt.ru;
  };

  const locUnit = (u: typeof UNIT_OPTIONS[0]) => {
    if (currentLanguage === 'en') return u.en;
    if (currentLanguage === 'he') return u.he;
    if (currentLanguage === 'ar') return u.ar;
    return u.ru;
  };

  const isNew = (itemId: string) => !existingIds.has(itemId);

  const getCatalogCategoryName = (cat: CatalogCategory) => {
    if (currentLanguage === 'en' && cat.name_en) return cat.name_en;
    if (currentLanguage === 'he' && cat.name_he) return cat.name_he;
    if (currentLanguage === 'ar' && cat.name_ar) return cat.name_ar;
    return cat.name || cat.name_en || cat.name_he || cat.name_ar || `#${cat.id}`;
  };

  const resetModal = () => {
    setStep('url');
    setUrl('');
    setError('');
    setMenuData(null);
    setExistingIds(new Set());
    setExistingCategoryIds(new Set());
    setSelectedCategoryIds(new Set());
    setSelectedItemIds(new Set());
    setItemPrices({});
    setItemUnits({});
    setImportResult(null);
    setItemFilter('new');
    setShowManualPanel(false);
    setManualJson('');
    setManualError('');
    setCategoryMappings({});
  };

  const getDirectApiUrl = (restaurantUrl: string) => {
    const match = restaurantUrl.match(/\/restaurants\/menu\/(?:delivery|pickup)\/(\d+)/);
    if (match) return `https://www.10bis.co.il/NextApi/GetRestaurantMenu?restaurantId=${match[1]}&deliveryMethod=delivery`;
    const match2 = restaurantUrl.match(/[?&]restaurantId=(\d+)/);
    if (match2) return `https://www.10bis.co.il/NextApi/GetRestaurantMenu?restaurantId=${match2[1]}&deliveryMethod=delivery`;
    return null;
  };

  const applyMenuData = (data: MenuData & { existingExternalIds: string[]; existingCategoryExternalIds: string[] }) => {
    const existing = new Set<string>(data.existingExternalIds || []);
    const existingCats = new Set<string>(data.existingCategoryExternalIds || []);
    setExistingIds(existing);
    setExistingCategoryIds(existingCats);
    setMenuData(data);
    setSelectedCategoryIds(new Set(data.categories.map((c: ImportCategory) => c.id)));
    const newItemIds = new Set<string>(
      data.items.filter((i: ImportItem) => !existing.has(i.id)).map((i: ImportItem) => i.id)
    );
    setSelectedItemIds(newItemIds);
    const prices: Record<string, string> = {};
    const units: Record<string, string> = {};
    data.items.forEach((item: ImportItem) => {
      prices[item.id] = String(item.price);
      units[item.id] = 'piece';
    });
    setItemPrices(prices);
    setItemUnits(units);
    setItemFilter(existing.size > 0 ? 'new' : 'all');
    setStep('categories');
  };

  const isCategoryExisting = (catId: string) => existingCategoryIds.has(catId);

  const handleManualParse = async () => {
    if (!manualJson.trim()) return;
    setManualLoading(true);
    setManualError('');
    try {
      const resp = await fetch('/api/admin/catalog-import/parse-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rawJson: manualJson.trim(), url: url.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setManualError(data.message || t('Ошибка разбора JSON', 'JSON parse error', 'שגיאה בניתוח JSON', 'خطأ في تحليل JSON'));
        return;
      }
      applyMenuData(data);
    } catch {
      setManualError(t('Ошибка соединения.', 'Connection error.', 'שגיאת חיבור.', 'خطأ في الاتصال.'));
    } finally {
      setManualLoading(false);
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setShowManualPanel(false);
    try {
      const resp = await fetch('/api/admin/catalog-import/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.message || t('Не удалось получить меню', 'Failed to fetch menu', 'לא ניתן לקבל תפריט', 'تعذر الحصول على القائمة'));
        return;
      }
      applyMenuData(data);
    } catch {
      setError(t('Ошибка соединения.', 'Connection error.', 'שגיאת חיבור.', 'خطأ في الاتصال.'));
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectedItemIds(ip => {
          const in2 = new Set(ip);
          menuData?.items.filter(i => i.categoryId === id).forEach(i => in2.delete(i.id));
          return in2;
        });
      } else {
        next.add(id);
        setSelectedItemIds(ip => {
          const in2 = new Set(ip);
          // When enabling a category, only auto-select new items
          menuData?.items.filter(i => i.categoryId === id && isNew(i.id)).forEach(i => in2.add(i.id));
          return in2;
        });
      }
      return next;
    });
  };

  const toggleAllCategories = () => {
    if (!menuData) return;
    if (selectedCategoryIds.size === menuData.categories.length) {
      setSelectedCategoryIds(new Set());
      setSelectedItemIds(new Set());
    } else {
      setSelectedCategoryIds(new Set(menuData.categories.map(c => c.id)));
      // Only auto-select new items
      setSelectedItemIds(new Set(menuData.items.filter(i => isNew(i.id)).map(i => i.id)));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCategoryItems = (categoryId: string) => {
    if (!menuData) return;
    const catItems = menuData.items.filter(i => i.categoryId === categoryId);
    const allSel = catItems.every(i => selectedItemIds.has(i.id));
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      catItems.forEach(i => allSel ? next.delete(i.id) : next.add(i.id));
      return next;
    });
  };

  const applyUnitToAll = (unitValue: string) => {
    if (!menuData) return;
    setItemUnits(prev => {
      const next = { ...prev };
      menuData.items.forEach(i => { next[i.id] = unitValue; });
      return next;
    });
  };

  const applyUnitToCategory = (categoryId: string, unitValue: string) => {
    if (!menuData) return;
    setItemUnits(prev => {
      const next = { ...prev };
      menuData.items.filter(i => i.categoryId === categoryId).forEach(i => { next[i.id] = unitValue; });
      return next;
    });
  };

  const handleImport = async () => {
    if (!menuData) return;
    setLoading(true);
    setError('');
    try {
      const categoriesToImport = menuData.categories
        .filter(c => selectedCategoryIds.has(c.id))
        .map(c => ({
          externalId: c.id,
          name: c.name,
          existingCategoryId: categoryMappings[c.id] ?? undefined,
        }));

      const itemsToImport = menuData.items
        .filter(i => selectedItemIds.has(i.id) && selectedCategoryIds.has(i.categoryId))
        .map(i => ({
          name: i.name,
          description: i.description,
          price: parseFloat(itemPrices[i.id] ?? String(i.price)) || i.price,
          unit: itemUnits[i.id] ?? 'piece',
          imageUrl: i.imageUrl,
          categoryExternalId: i.categoryId,
          externalId: i.id,
        }));

      const resp = await fetch('/api/admin/catalog-import/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          categories: categoriesToImport,
          items: itemsToImport,
          targetLanguage,
          platform: menuData.platform
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.message || t('Ошибка импорта', 'Import error', 'שגיאת ייבוא', 'خطأ في الاستيراد'));
        return;
      }
      setImportResult(data);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    } catch {
      setError(t('Ошибка при импорте.', 'Import failed.', 'הייבוא נכשל.', 'فشل الاستيراد.'));
    } finally {
      setLoading(false);
    }
  };

  const selectedVisibleItems = menuData?.items.filter(
    i => selectedCategoryIds.has(i.categoryId) && selectedItemIds.has(i.id)
  ).length ?? 0;

  const totalNewItems = menuData?.items.filter(i => isNew(i.id)).length ?? 0;
  const totalExistingItems = menuData ? menuData.items.length - totalNewItems : 0;
  const isDiffMode = totalExistingItems > 0;

  const platformBadge = menuData?.platform === 'wolt'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Wolt</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">10bis</span>;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
            {t('Импорт каталога', 'Import catalog', 'ייבוא קטלוג', 'استيراد الكتالوج')}
            {menuData && <span className={isRTL ? 'mr-2' : 'ml-2'}>{platformBadge}</span>}
          </DialogTitle>
          {step === 'url' && (
            <DialogDescription>
              {t(
                'Вставьте ссылку на ваш ресторан в Wolt или 10bis, чтобы импортировать категории и товары.',
                'Paste the link to your restaurant on Wolt or 10bis to import categories and products.',
                'הדבק קישור למסעדה שלך ב-Wolt או 10bis לייבוא קטגוריות ומוצרים.',
                'الصق رابط مطعمك على Wolt أو 10bis لاستيراد الفئات والمنتجات.'
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">

          {/* ── STEP 1: URL ── */}
          {step === 'url' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 space-y-1">
                <p className="font-semibold">{t('Поддерживаемые платформы:', 'Supported platforms:', 'פלטפורמות נתמכות:', 'المنصات المدعومة:')}</p>
                <p>• <b>Wolt</b> — <code className="text-xs bg-blue-100 px-1 rounded">wolt.com/.../restaurant/имя-ресторана</code></p>
                <p>• <b>10bis</b> — <code className="text-xs bg-blue-100 px-1 rounded">10bis.co.il/.../delivery/12345/...</code></p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Ссылка на ресторан', 'Restaurant link', 'קישור למסעדה', 'رابط المطعم')}</label>
                <Input
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(''); }}
                  placeholder="https://wolt.com/... или https://www.10bis.co.il/..."
                  onKeyDown={e => { if (e.key === 'Enter') handleFetch(); }}
                  className={isRTL ? 'text-right' : ''}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Язык импорта', 'Import language', 'שפת הייבוא', 'لغة الاستيراد')}</label>
                <p className="text-xs text-gray-500">
                  {t(
                    'Укажите язык меню. Названия и описания будут записаны в соответствующее языковое поле.',
                    'Specify the menu language. Names and descriptions will be saved to the corresponding language field.',
                    'ציין את שפת התפריט. שמות ותיאורים יישמרו בשדה השפה המתאים.',
                    'حدد لغة القائمة. سيتم حفظ الأسماء والأوصاف في حقل اللغة المقابل.'
                  )}
                </p>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANG_OPTIONS.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div>{error}</div>
                      {url.includes('10bis') && (
                        <div>
                          <button
                            onClick={() => { setShowManualPanel(v => !v); setManualError(''); }}
                            className="underline font-medium hover:no-underline cursor-pointer"
                          >
                            {t('Попробовать вручную →', 'Try manually →', 'נסה ידנית →', 'جرب يدويًا →')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {showManualPanel && url.includes('10bis') && (() => {
                    const apiUrl = getDirectApiUrl(url);
                    return (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3 text-sm">
                        <p className="font-semibold text-orange-800">
                          {t('Ручной импорт 10bis', 'Manual 10bis import', 'ייבוא ידני מ-10bis', 'استيراد يدوي من 10bis')}
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-orange-700">
                          <li>
                            {t('Откройте эту ссылку в браузере: ', 'Open this link in your browser: ', 'פתח קישור זה בדפדפן: ', 'افتح هذا الرابط في المتصفح: ')}
                            {apiUrl
                              ? <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium break-all">{apiUrl}</a>
                              : <span className="text-red-600">{t('Не удалось определить ID ресторана', 'Could not determine restaurant ID', 'לא ניתן לקבוע מזהה מסעדה', 'تعذر تحديد معرف المطعم')}</span>
                            }
                          </li>
                          <li>{t('Нажмите Ctrl+A (выделить всё), затем Ctrl+C (скопировать)', 'Press Ctrl+A to select all, then Ctrl+C to copy', 'לחץ Ctrl+A לבחירת הכל, ואז Ctrl+C להעתקה', 'اضغط Ctrl+A لتحديد الكل، ثم Ctrl+C للنسخ')}</li>
                          <li>{t('Вставьте сюда (Ctrl+V):', 'Paste here (Ctrl+V):', 'הדבק כאן (Ctrl+V):', 'الصق هنا (Ctrl+V):')}</li>
                        </ol>
                        <textarea
                          value={manualJson}
                          onChange={e => { setManualJson(e.target.value); setManualError(''); }}
                          placeholder={t('Вставьте JSON сюда...', 'Paste JSON here...', 'הדבק JSON כאן...', 'الصق JSON هנا...')}
                          className="w-full h-28 rounded border border-orange-300 bg-white p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                        {manualError && (
                          <p className="text-red-600 text-xs">{manualError}</p>
                        )}
                        <Button
                          size="sm"
                          onClick={handleManualParse}
                          disabled={!manualJson.trim() || manualLoading}
                          className="w-full"
                        >
                          {manualLoading
                            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('Обработка...', 'Processing...', 'מעבד...', 'جارٍ المعالجة...')}</>
                            : t('Загрузить меню', 'Load menu', 'טען תפריט', 'تحميل القائمة')
                          }
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: CATEGORIES ── */}
          {step === 'categories' && menuData && (
            <div className="space-y-3">
              {/* Diff summary banner */}
              {isDiffMode && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                  <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700">
                    {t(
                      `Найдено ${totalNewItems} новых позиций из ${menuData.items.length}`,
                      `Found ${totalNewItems} new items out of ${menuData.items.length}`,
                      `נמצאו ${totalNewItems} פריטים חדשים מתוך ${menuData.items.length}`,
                      `تم العثور على ${totalNewItems} منتج جديد من ${menuData.items.length}`
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {t('Выберите категории для импорта', 'Select categories to import', 'בחר קטגוריות לייבוא', 'اختر الفئات للاستيراد')}
                  {' · '}{menuData.categories.length}
                </p>
                <button onClick={toggleAllCategories} className="text-xs text-blue-600 hover:underline">
                  {selectedCategoryIds.size === menuData.categories.length
                    ? t('Снять все', 'Deselect all', 'בטל הכל', 'إلغاء الكل')
                    : t('Выбрать все', 'Select all', 'בחר הכל', 'اختر الكل')}
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {menuData.categories.map(cat => {
                  const catItems = menuData.items.filter(i => i.categoryId === cat.id);
                  const newCount = catItems.filter(i => isNew(i.id)).length;
                  const catExists = isCategoryExisting(cat.id);
                  const mappedCatId = categoryMappings[cat.id];
                  const mappedCat = mappedCatId ? catalogCategories.find(c => c.id === mappedCatId) : null;
                  return (
                    <div key={cat.id} className="rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <label className="flex items-center gap-3 p-3 cursor-pointer">
                        <Checkbox checked={selectedCategoryIds.has(cat.id)} onCheckedChange={() => toggleCategory(cat.id)} />
                        <span className="flex-1 font-medium text-sm">{cat.name}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {catExists && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">
                              {t('в каталоге', 'in catalog', 'בקטלוג', 'في الكتالوج')}
                            </span>
                          )}
                          {isDiffMode && newCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                              +{newCount} {t('новых', 'new', 'חדשים', 'جديد')}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{cat.itemCount} {t('всего', 'total', 'סה"כ', 'المجموع')}</span>
                        </div>
                      </label>
                      {/* Manual mapping — only for categories not already auto-matched */}
                      {!catExists && catalogCategories.length > 0 && (
                        <div className="px-3 pb-3 flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {mappedCat ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 font-medium">
                                → {getCatalogCategoryName(mappedCat)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCategoryMappings(prev => { const n = { ...prev }; delete n[cat.id]; return n; })}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Select
                              value=""
                              onValueChange={val => {
                                if (val) setCategoryMappings(prev => ({ ...prev, [cat.id]: Number(val) }));
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs flex-1 text-gray-400 border-dashed">
                                <SelectValue placeholder={t('Привязать к существующей...', 'Link to existing...', 'קשר לקיים...', 'ربط بموجود...')} />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogCategories.map(c => (
                                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                                    {getCatalogCategoryName(c)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: ITEMS ── */}
          {step === 'items' && menuData && (
            <div className="space-y-3">

              {/* Top bar: global unit apply + filter toggle */}
              <div className="flex items-center gap-2 flex-wrap rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                  {t('Применить ко всем:', 'Apply to all:', 'החל על הכל:', 'تطبيق على الكل:')}
                </span>
                <div className="flex gap-1 flex-wrap flex-1">
                  {UNIT_OPTIONS.map(u => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => applyUnitToAll(u.value)}
                      className="px-2.5 py-1 rounded text-xs font-medium border border-gray-300 bg-white hover:border-orange-400 hover:text-orange-600 transition-colors"
                    >
                      {locUnit(u)}
                    </button>
                  ))}
                </div>

                {/* New/All filter toggle — only show when there are existing items */}
                {isDiffMode && (
                  <div className="flex rounded-md border border-gray-300 overflow-hidden flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setItemFilter('new')}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors ${itemFilter === 'new' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      ✦ {t('Только новые', 'New only', 'חדשים בלבד', 'الجديدة فقط')} ({totalNewItems})
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemFilter('all')}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-300 ${itemFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {t('Все', 'All', 'הכל', 'الكل')} ({menuData.items.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 max-h-[44vh] overflow-y-auto pr-1">
                {menuData.categories
                  .filter(c => selectedCategoryIds.has(c.id))
                  .map(cat => {
                    const allCatItems = menuData.items.filter(i => i.categoryId === cat.id);
                    const visibleItems = itemFilter === 'new'
                      ? allCatItems.filter(i => isNew(i.id))
                      : allCatItems;
                    if (visibleItems.length === 0) return null;

                    const allCatSel = visibleItems.every(i => selectedItemIds.has(i.id));
                    const newInCat = allCatItems.filter(i => isNew(i.id)).length;

                    return (
                      <div key={cat.id} className="space-y-1.5">
                        {/* Category header */}
                        <div className="flex items-center gap-2 sticky top-0 bg-white py-1.5 z-10 border-b">
                          <Checkbox checked={allCatSel} onCheckedChange={() => toggleCategoryItems(cat.id)} />
                          <span className="font-semibold text-sm text-gray-800 flex-1 min-w-0 truncate">{cat.name}</span>
                          {isDiffMode && newInCat > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 flex-shrink-0">
                              +{newInCat}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            ({visibleItems.filter(i => selectedItemIds.has(i.id)).length}/{visibleItems.length})
                          </span>
                          {/* Category unit apply */}
                          <Select value="" onValueChange={v => applyUnitToCategory(cat.id, v)}>
                            <SelectTrigger className="w-28 h-7 text-xs px-2 border-dashed flex-shrink-0">
                              <span className="text-gray-400 text-xs truncate">
                                {t('Ед. категории', 'Cat. unit', 'יחידת קטג׳', 'وحدة الفئة')}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map(u => (
                                <SelectItem key={u.value} value={u.value}>{locUnit(u)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Items */}
                        <div className="space-y-1.5 pl-6">
                          {visibleItems.map(item => {
                            const itemIsNew = isNew(item.id);
                            const isSelected = selectedItemIds.has(item.id);
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                  !itemIsNew
                                    ? 'border-gray-100 bg-gray-50 opacity-50'
                                    : isSelected
                                      ? 'border-gray-200 bg-white'
                                      : 'border-gray-100 bg-gray-50 opacity-60'
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleItem(item.id)}
                                  className="flex-shrink-0"
                                  disabled={!itemIsNew}
                                />
                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-medium truncate">{item.name}</p>
                                    {!itemIsNew && (
                                      <span className="px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-500 whitespace-nowrap flex-shrink-0">
                                        {t('уже есть', 'exists', 'קיים', 'موجود')}
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-gray-400 truncate">{item.description}</p>
                                  )}
                                </div>
                                {/* Price input — only for new items */}
                                {itemIsNew && (
                                  <>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={itemPrices[item.id] ?? String(item.price)}
                                        onChange={e => setItemPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        className="w-20 h-8 text-sm text-center px-1"
                                        disabled={!isSelected}
                                      />
                                      <span className="text-xs text-gray-500">₪</span>
                                    </div>
                                    <Select
                                      value={itemUnits[item.id] ?? 'piece'}
                                      onValueChange={v => setItemUnits(prev => ({ ...prev, [item.id]: v }))}
                                      disabled={!isSelected}
                                    >
                                      <SelectTrigger className="w-24 h-8 text-xs px-2">
                                        <SelectValue>{unitLabel(itemUnits[item.id] ?? 'piece')}</SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {UNIT_OPTIONS.map(u => (
                                          <SelectItem key={u.value} value={u.value}>{locUnit(u)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                                {/* Existing item — just show price */}
                                {!itemIsNew && (
                                  <span className="text-sm text-gray-400 flex-shrink-0">
                                    {item.price} ₪
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: DONE ── */}
          {step === 'done' && importResult && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('Импорт завершён!', 'Import complete!', 'הייבוא הושלם!', 'اكتمل الاستيراد!')}
                </h3>
                <div className="text-gray-600 mt-2 space-y-1">
                  {importResult.categoriesCreated > 0 && (
                    <p>
                      {t('Создано', 'Created', 'נוצרו', 'تم إنشاء')}{' '}
                      <b>{importResult.categoriesCreated}</b>{' '}
                      {t('новых категорий', 'new categories', 'קטגוריות חדשות', 'فئات جديدة')}
                    </p>
                  )}
                  {importResult.categoriesLinked > 0 && (
                    <p>
                      <b>{importResult.categoriesLinked}</b>{' '}
                      {t('категорий привязано к существующим', 'categories linked to existing', 'קטגוריות קושרו לקיימות', 'فئات مرتبطة بالموجودة')}
                    </p>
                  )}
                  {importResult.categoriesMatched > 0 && (
                    <p>
                      <b>{importResult.categoriesMatched}</b>{' '}
                      {t('категорий уже были в каталоге', 'categories already in catalog', 'קטגוריות כבר היו בקטלוג', 'فئات كانت موجودة بالفعل')}
                    </p>
                  )}
                  <p>
                    {t('Добавлено', 'Added', 'נוספו', 'تمت إضافة')}{' '}
                    <b>{importResult.itemsCreated}</b>{' '}
                    {t('товаров', 'products', 'מוצרים', 'منتجات')}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div className={`flex items-center justify-between pt-4 border-t mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>

          {step === 'url' && (
            <>
              <Button variant="outline" onClick={handleClose}>{t('Отмена', 'Cancel', 'ביטול', 'إلغاء')}</Button>
              <Button onClick={handleFetch} disabled={loading || !url.trim()} style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('Загружаю...', 'Loading...', 'טוען...', 'جار التحميل...')}</>
                  : <>{t('Загрузить меню', 'Load menu', 'טען תפריט', 'تحميل القائمة')}<ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} /></>
                }
              </Button>
            </>
          )}

          {step === 'categories' && (
            <>
              <Button variant="outline" onClick={() => { setStep('url'); setError(''); }}>
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-1 rotate-180' : 'mr-1'}`} />
                {t('Назад', 'Back', 'חזרה', 'رجوع')}
              </Button>
              <span className="text-sm text-gray-500">{selectedCategoryIds.size}/{menuData?.categories.length}</span>
              <Button onClick={() => setStep('items')} disabled={selectedCategoryIds.size === 0} style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                {t('Далее', 'Next', 'הבא', 'التالي')}<ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Button>
            </>
          )}

          {step === 'items' && (
            <>
              <Button variant="outline" onClick={() => { setStep('categories'); setError(''); }}>
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-1 rotate-180' : 'mr-1'}`} />
                {t('Назад', 'Back', 'חזרה', 'رجוע')}
              </Button>
              <span className="text-sm text-gray-500">{selectedVisibleItems} {t('к добавлению', 'to add', 'להוספה', 'للإضافة')}</span>
              <Button onClick={handleImport} disabled={loading || selectedVisibleItems === 0} style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('Импорт...', 'Importing...', 'מייבא...', 'استيراد...')}</>
                  : <><Package className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />{t('Добавить в каталог', 'Add to catalog', 'הוסף לקטלוג', 'إضافة للكتالوج')}</>
                }
              </Button>
            </>
          )}

          {step === 'done' && (
            <div className="w-full flex justify-center">
              <Button onClick={handleClose} style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                {t('Закрыть', 'Close', 'סגור', 'إغلاق')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
