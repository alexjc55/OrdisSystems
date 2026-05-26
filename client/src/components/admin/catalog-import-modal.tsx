import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Link, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Store, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export function CatalogImportModal({ open, onClose, currentLanguage, isRTL }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{ categoriesCreated: number; itemsCreated: number } | null>(null);

  const t = (ru: string, en: string, he: string, ar: string) => {
    if (currentLanguage === 'en') return en;
    if (currentLanguage === 'he') return he;
    if (currentLanguage === 'ar') return ar;
    return ru;
  };

  const resetModal = () => {
    setStep('url');
    setUrl('');
    setError('');
    setMenuData(null);
    setSelectedCategoryIds(new Set());
    setSelectedItemIds(new Set());
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
        setError(data.message || t('Не удалось получить меню', 'Failed to fetch menu', 'לא ניתן לקבל את התפריט', 'تعذر الحصول على القائمة'));
        return;
      }
      setMenuData(data);
      const allCatIds = new Set(data.categories.map((c: ImportCategory) => c.id));
      setSelectedCategoryIds(allCatIds);
      const allItemIds = new Set(data.items.map((i: ImportItem) => i.id));
      setSelectedItemIds(allItemIds);
      setStep('categories');
    } catch {
      setError(t('Ошибка соединения. Попробуйте позже.', 'Connection error. Please try again.', 'שגיאת חיבור. נסה שוב.', 'خطأ في الاتصال. حاول مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectedItemIds(itemPrev => {
          const itemNext = new Set(itemPrev);
          menuData?.items.filter(i => i.categoryId === id).forEach(i => itemNext.delete(i.id));
          return itemNext;
        });
      } else {
        next.add(id);
        setSelectedItemIds(itemPrev => {
          const itemNext = new Set(itemPrev);
          menuData?.items.filter(i => i.categoryId === id).forEach(i => itemNext.add(i.id));
          return itemNext;
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategoryItems = (categoryId: string) => {
    if (!menuData) return;
    const catItems = menuData.items.filter(i => i.categoryId === categoryId);
    const allSelected = catItems.every(i => selectedItemIds.has(i.id));
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      catItems.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
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
          price: i.price,
          imageUrl: i.imageUrl,
          categoryExternalId: i.categoryId
        }));

      const resp = await fetch('/api/admin/catalog-import/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categories: categoriesToImport, items: itemsToImport })
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
      setError(t('Ошибка при импорте. Попробуйте позже.', 'Import failed. Please try again.', 'הייבוא נכשל. נסה שוב.', 'فشل الاستيراد. حاول مرة أخرى.'));
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            {t('Импорт каталога', 'Import catalog', 'ייבוא קטלוג', 'استيراد الكتالوج')}
            {menuData && <span className={isRTL ? 'mr-2' : 'ml-2'}>{platformBadge}</span>}
          </DialogTitle>
          {step === 'url' && (
            <DialogDescription>
              {t(
                'Вставьте ссылку на ваш магазин в Wolt или 10bis, чтобы импортировать категории и товары.',
                'Paste the link to your restaurant on Wolt or 10bis to import categories and products.',
                'הדבק את הקישור למסעדה שלך ב-Wolt או 10bis כדי לייבא קטגוריות ומוצרים.',
                'الصق رابط مطعمك على Wolt أو 10bis لاستيراد الفئات والمنتجات.'
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">

          {/* ── STEP 1: URL ───────────────────────────────────── */}
          {step === 'url' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 space-y-1">
                <p className="font-semibold">{t('Поддерживаемые платформы:', 'Supported platforms:', 'פלטפורמות נתמכות:', 'المنصات المدعومة:')}</p>
                <p>• <b>Wolt</b> — {t('ссылка вида', 'link like', 'קישור כמו', 'رابط مثل')} <code className="text-xs bg-blue-100 px-1 rounded">wolt.com/.../restaurant/имя-ресторана</code></p>
                <p>• <b>10bis</b> — {t('ссылка вида', 'link like', 'קישור כמו', 'رابط مثل')} <code className="text-xs bg-blue-100 px-1 rounded">10bis.co.il/.../delivery/12345/...</code></p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('Ссылка на ресторан', 'Restaurant link', 'קישור למסעדה', 'رابط المطعم')}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(''); }}
                    placeholder={t(
                      'https://wolt.com/... или https://www.10bis.co.il/...',
                      'https://wolt.com/... or https://www.10bis.co.il/...',
                      'https://wolt.com/... או https://www.10bis.co.il/...',
                      'https://wolt.com/... أو https://www.10bis.co.il/...'
                    )}
                    onKeyDown={e => { if (e.key === 'Enter') handleFetch(); }}
                    className={isRTL ? 'text-right' : ''}
                  />
                  <Button onClick={handleFetch} disabled={loading || !url.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        {t('Загрузить', 'Load', 'טען', 'تحميل')}
                        <ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-1 rotate-180' : 'ml-1'}`} />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: CATEGORIES ───────────────────────────── */}
          {step === 'categories' && menuData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {t('Выберите категории для импорта', 'Select categories to import', 'בחר קטגוריות לייבוא', 'اختر الفئات للاستيراد')}
                  {' '}· {t('Найдено', 'Found', 'נמצאו', 'تم العثور')} {menuData.categories.length}
                </p>
                <button
                  onClick={toggleAllCategories}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selectedCategoryIds.size === menuData.categories.length
                    ? t('Снять все', 'Deselect all', 'בטל הכל', 'إلغاء الكل')
                    : t('Выбрать все', 'Select all', 'בחר הכל', 'اختر الكل')}
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {menuData.categories.map(cat => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedCategoryIds.has(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{cat.name}</span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {cat.itemCount} {t('товаров', 'items', 'פריטים', 'منتجات')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: ITEMS ─────────────────────────────────── */}
          {step === 'items' && menuData && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {t('Выберите товары для импорта', 'Select items to import', 'בחר פריטים לייבוא', 'اختر المنتجات للاستيراد')}
                {' '}· {t('Выбрано', 'Selected', 'נבחרו', 'المحدد')} {selectedVisibleItems}
              </p>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {menuData.categories
                  .filter(c => selectedCategoryIds.has(c.id))
                  .map(cat => {
                    const catItems = menuData.items.filter(i => i.categoryId === cat.id);
                    if (catItems.length === 0) return null;
                    const allCatSelected = catItems.every(i => selectedItemIds.has(i.id));
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center gap-2 sticky top-0 bg-white py-1 z-10">
                          <Checkbox
                            checked={allCatSelected}
                            onCheckedChange={() => toggleCategoryItems(cat.id)}
                          />
                          <span className="font-semibold text-sm text-gray-800">{cat.name}</span>
                          <span className="text-xs text-gray-400">({catItems.filter(i => selectedItemIds.has(i.id)).length}/{catItems.length})</span>
                        </div>
                        <div className="space-y-1 pl-7">
                          {catItems.map(item => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={selectedItemIds.has(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
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
                              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                                {item.price.toFixed(2)} ₪
                              </span>
                            </label>
                          ))}
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

          {/* ── STEP 4: DONE ──────────────────────────────────── */}
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

        {/* ── FOOTER BUTTONS ────────────────────────────────── */}
        <div className={`flex items-center justify-between pt-4 border-t mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {step === 'url' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('Отмена', 'Cancel', 'ביטול', 'إلغاء')}
              </Button>
              <Button onClick={handleFetch} disabled={loading || !url.trim()} style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('Загружаю...', 'Loading...', 'טוען...', 'جار التحميل...')}</>
                ) : (
                  <>{t('Загрузить меню', 'Load menu', 'טען תפריט', 'تحميل القائمة')}<ArrowRight className={`h-4 w-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} /></>
                )}
              </Button>
            </>
          )}

          {step === 'categories' && (
            <>
              <Button variant="outline" onClick={() => { setStep('url'); setError(''); }}>
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-1 rotate-180' : 'mr-1'}`} />
                {t('Назад', 'Back', 'חזרה', 'رجوع')}
              </Button>
              <div className="text-sm text-gray-500">
                {t('Выбрано', 'Selected', 'נבחרו', 'المحدد')}: {selectedCategoryIds.size}/{menuData?.categories.length}
              </div>
              <Button
                onClick={() => setStep('items')}
                disabled={selectedCategoryIds.size === 0}
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
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
              <div className="text-sm text-gray-500">
                {t('Выбрано товаров', 'Selected items', 'פריטים נבחרו', 'المنتجات المحددة')}: {selectedVisibleItems}
              </div>
              <Button
                onClick={handleImport}
                disabled={loading || selectedVisibleItems === 0}
                style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('Импорт...', 'Importing...', 'מייבא...', 'استيراد...')}</>
                ) : (
                  <><Package className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />{t('Добавить в каталог', 'Add to catalog', 'הוסף לקטלוג', 'إضافة إلى الكتالوج')}</>
                )}
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
