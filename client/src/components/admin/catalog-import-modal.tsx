import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Store, Package } from "lucide-react";
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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [itemUnits, setItemUnits] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ categoriesCreated: number; itemsCreated: number } | null>(null);

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

  const resetModal = () => {
    setStep('url');
    setUrl('');
    setError('');
    setMenuData(null);
    setSelectedCategoryIds(new Set());
    setSelectedItemIds(new Set());
    setItemPrices({});
    setItemUnits({});
    setImportResult(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
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
      setMenuData(data);
      setSelectedCategoryIds(new Set(data.categories.map((c: ImportCategory) => c.id)));
      setSelectedItemIds(new Set(data.items.map((i: ImportItem) => i.id)));
      const prices: Record<string, string> = {};
      const units: Record<string, string> = {};
      data.items.forEach((item: ImportItem) => {
        prices[item.id] = String(item.price);
        units[item.id] = 'piece';
      });
      setItemPrices(prices);
      setItemUnits(units);
      setStep('categories');
    } catch {
      setError(t('Ошибка соединения. Попробуйте позже.', 'Connection error. Please try again.', 'שגיאת חיבור. נסה שוב.', 'خطأ في الاتصال.'));
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
          menuData?.items.filter(i => i.categoryId === id).forEach(i => in2.add(i.id));
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
      setSelectedItemIds(new Set(menuData.items.map(i => i.id)));
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
        .map(c => ({ externalId: c.id, name: c.name }));

      const itemsToImport = menuData.items
        .filter(i => selectedItemIds.has(i.id) && selectedCategoryIds.has(i.categoryId))
        .map(i => ({
          name: i.name,
          description: i.description,
          price: parseFloat(itemPrices[i.id] ?? String(i.price)) || i.price,
          unit: itemUnits[i.id] ?? 'piece',
          imageUrl: i.imageUrl,
          categoryExternalId: i.categoryId
        }));

      const resp = await fetch('/api/admin/catalog-import/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categories: categoriesToImport, items: itemsToImport, targetLanguage })
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
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: CATEGORIES ── */}
          {step === 'categories' && menuData && (
            <div className="space-y-3">
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
                {menuData.categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Checkbox checked={selectedCategoryIds.has(cat.id)} onCheckedChange={() => toggleCategory(cat.id)} />
                    <span className="flex-1 font-medium text-sm">{cat.name}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{cat.itemCount} {t('товаров', 'items', 'פריטים', 'منتجات')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: ITEMS ── */}
          {step === 'items' && menuData && (
            <div className="space-y-3">

              {/* Global unit quick-apply bar */}
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
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {selectedVisibleItems} {t('выбрано', 'selected', 'נבחרו', 'محدد')}
                </span>
              </div>

              <div className="space-y-4 max-h-[46vh] overflow-y-auto pr-1">
                {menuData.categories
                  .filter(c => selectedCategoryIds.has(c.id))
                  .map(cat => {
                    const catItems = menuData.items.filter(i => i.categoryId === cat.id);
                    if (catItems.length === 0) return null;
                    const allCatSel = catItems.every(i => selectedItemIds.has(i.id));
                    return (
                      <div key={cat.id} className="space-y-1.5">
                        {/* Category header with per-category unit selector */}
                        <div className="flex items-center gap-2 sticky top-0 bg-white py-1.5 z-10 border-b">
                          <Checkbox checked={allCatSel} onCheckedChange={() => toggleCategoryItems(cat.id)} />
                          <span className="font-semibold text-sm text-gray-800 flex-1 min-w-0 truncate">{cat.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            ({catItems.filter(i => selectedItemIds.has(i.id)).length}/{catItems.length})
                          </span>
                          {/* Category-level unit apply */}
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

                        {/* Items list */}
                        <div className="space-y-1.5 pl-6">
                          {catItems.map(item => {
                            const isSelected = selectedItemIds.has(item.id);
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${isSelected ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleItem(item.id)}
                                  className="flex-shrink-0"
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
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                  {item.description && (
                                    <p className="text-xs text-gray-400 truncate">{item.description}</p>
                                  )}
                                </div>
                                {/* Editable price */}
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
                                {/* Per-item unit selector */}
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
                <p className="text-gray-600 mt-2">
                  {t('Создано', 'Created', 'נוצרו', 'تم إنشاء')}{' '}
                  <b>{importResult.categoriesCreated}</b>{' '}
                  {t('категорий', 'categories', 'קטגוריות', 'فئات')}{' '}
                  {t('и', 'and', 'ו-', 'و')}{' '}
                  <b>{importResult.itemsCreated}</b>{' '}
                  {t('товаров', 'products', 'מוצרים', 'منتجات')}
                </p>
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
                {t('Назад', 'Back', 'חזרה', 'رجوع')}
              </Button>
              <span className="text-sm text-gray-500">{selectedVisibleItems} {t('товаров', 'items', 'פריטים', 'منتجات')}</span>
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
