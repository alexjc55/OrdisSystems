import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw, Filter, X, AlertCircle, Globe } from "lucide-react";

type ProductTranslation = {
  id: number;
  categoryId: number | null;
  name: string | null;
  name_en: string | null;
  name_he: string | null;
  name_ar: string | null;
  description: string | null;
  description_en: string | null;
  description_he: string | null;
  description_ar: string | null;
  ingredients: string | null;
  ingredients_en: string | null;
  ingredients_he: string | null;
  ingredients_ar: string | null;
};

type Category = { id: number; name: string; name_en?: string | null; name_he?: string | null; name_ar?: string | null };

const LANG_SUFFIX: Record<string, string> = { ru: "", en: "_en", he: "_he", ar: "_ar" };
const LANG_FLAGS: Record<string, string> = { ru: "🇷🇺", en: "🇬🇧", he: "🇮🇱", ar: "🇸🇦" };
const LANG_LABELS: Record<string, string> = { ru: "Русский", en: "English", he: "עברית", ar: "العربية" };
const FIELD_LABELS: Record<string, Record<string, string>> = {
  name:        { ru: "Название",  en: "Name",        he: "שם",       ar: "اسم"    },
  description: { ru: "Описание",  en: "Description", he: "תיאור",    ar: "وصف"    },
  ingredients: { ru: "Состав",    en: "Ingredients", he: "מרכיבים",  ar: "مكونات" },
};

function fieldKey(base: string, lang: string): keyof ProductTranslation {
  return (base + LANG_SUFFIX[lang]) as keyof ProductTranslation;
}

function catName(cat: Category, lang: string): string {
  if (lang === "en" && cat.name_en) return cat.name_en;
  if (lang === "he" && cat.name_he) return cat.name_he;
  if (lang === "ar" && cat.name_ar) return cat.name_ar;
  return cat.name;
}

export function TranslationManager() {
  const { t: adminT, i18n } = useTranslation("admin");
  const currentLang = i18n.language || "ru";
  const { toast } = useToast();
  const isRTL = currentLang === "he" || currentLang === "ar";

  const { data: storeSettings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const langOrder: string[] = ((storeSettings?.languageOrder || ["ru", "en", "he", "ar"]) as string[]).filter(
    (l) => ((storeSettings?.enabledLanguages || ["ru", "en", "he", "ar"]) as string[]).includes(l)
  );
  const defaultLang: string = storeSettings?.defaultLanguage || "ru";

  const { data: serverProducts = [], isLoading } = useQuery<ProductTranslation[]>({
    queryKey: ["/api/admin/translations/products"],
  });

  const [local, setLocal] = useState<ProductTranslation[]>([]);

  useEffect(() => {
    if (serverProducts.length > 0) {
      setLocal(serverProducts.map(p => ({ ...p })));
    }
  }, [serverProducts]);

  // Filters
  const [filterCat, setFilterCat] = useState("all");
  const [filterMissing, setFilterMissing] = useState("all");

  const saveMutation = useMutation({
    mutationFn: (updates: ProductTranslation[]) =>
      apiRequest("PUT", "/api/admin/translations/products", { updates }),
    onSuccess: () => {
      toast({ title: adminT("translations.saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/translations/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({ title: adminT("translations.saveError"), variant: "destructive" });
    },
  });

  const handleCell = useCallback(
    (id: number, key: keyof ProductTranslation, val: string) => {
      setLocal(prev => prev.map(p => p.id === id ? { ...p, [key]: val } : p));
    },
    []
  );

  const handleSave = () => {
    const nameKey = fieldKey("name", defaultLang);
    const invalid = local.find(p => !(p[nameKey] || "").trim());
    if (invalid) {
      toast({
        title: adminT("translations.validationError"),
        description: adminT("translations.nameRequired"),
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(local);
  };

  // "Missing" means name or description is empty for that lang (ingredients are optional)
  function isMissingLang(p: ProductTranslation, lang: string): boolean {
    return !(p[fieldKey("name", lang)] || "").trim() || !(p[fieldKey("description", lang)] || "").trim();
  }
  function hasAnyMissing(p: ProductTranslation): boolean {
    return langOrder.some(l => isMissingLang(p, l));
  }

  const filtered = local.filter(p => {
    if (filterCat !== "all" && String(p.categoryId) !== filterCat) return false;
    if (filterMissing === "any_missing") return hasAnyMissing(p);
    if (filterMissing.startsWith("lang_")) return isMissingLang(p, filterMissing.slice(5));
    return true;
  });

  const missingCount = local.filter(hasAnyMissing).length;

  const fl = (base: string) => FIELD_LABELS[base]?.[currentLang] ?? FIELD_LABELS[base]?.["ru"] ?? base;
  const ll = (lang: string) => LANG_LABELS[lang] ?? lang.toUpperCase();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        {adminT("actions.loading")}
      </div>
    );
  }

  const SaveBtn = ({ className = "" }: { className?: string }) => (
    <Button
      onClick={handleSave}
      disabled={saveMutation.isPending}
      size="sm"
      className={`bg-primary text-white hover:bg-primary/90 ${className}`}
    >
      {saveMutation.isPending
        ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />{adminT("actions.saving")}</>
        : <><Save className="h-4 w-4 mr-1" />{adminT("translations.saveAll")}</>}
    </Button>
  );

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>

      {/* Header */}
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${isRTL ? "sm:flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : "text-left"}>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {adminT("tabs.translations")}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{adminT("translations.description")}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          {missingCount > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 gap-1">
              <AlertCircle className="h-3 w-3" />
              {adminT("translations.missingCount", { count: missingCount })}
            </Badge>
          )}
          <SaveBtn />
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 items-center p-3 bg-gray-50 rounded-lg border ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
          <Filter className="h-4 w-4 text-gray-400" />
          {adminT("actions.filter")}:
        </div>

        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-8 text-xs w-44 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{adminT("translations.allCategories")}</SelectItem>
            {(categories as Category[]).map(cat => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {catName(cat, currentLang)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMissing} onValueChange={setFilterMissing}>
          <SelectTrigger className="h-8 text-xs w-60 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{adminT("translations.showAll")}</SelectItem>
            <SelectItem value="any_missing">{adminT("translations.anyMissing")}</SelectItem>
            {langOrder.map(lang => (
              <SelectItem key={lang} value={`lang_${lang}`}>
                {adminT("translations.missingForLang")}: {ll(lang)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterCat !== "all" || filterMissing !== "all") && (
          <Button
            variant="ghost" size="sm"
            className="h-8 text-xs text-gray-400 hover:text-gray-700"
            onClick={() => { setFilterCat("all"); setFilterMissing("all"); }}
          >
            <X className="h-3 w-3 mr-1" />{adminT("actions.reset")}
          </Button>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} / {local.length}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm border rounded-lg">
          {adminT("translations.noProducts")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-xs border-collapse" style={{ direction: "ltr" }}>
            <thead>
              {/* Language header row */}
              <tr className="bg-gray-100 border-b border-gray-200">
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-20 border-r border-gray-200 min-w-[160px] align-middle"
                >
                  {adminT("translations.product")}
                </th>
                {langOrder.map(lang => (
                  <th
                    key={lang}
                    colSpan={3}
                    className="px-2 py-2 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span>{LANG_FLAGS[lang]}</span>
                      {ll(lang)}
                    </span>
                  </th>
                ))}
              </tr>
              {/* Field sub-header row */}
              <tr className="bg-gray-50 border-b border-gray-200">
                {langOrder.map(lang =>
                  (["name", "description", "ingredients"] as const).map(field => (
                    <th
                      key={`${lang}_${field}`}
                      className="px-2 py-1.5 text-center text-gray-500 font-normal border-r border-gray-200 last:border-r-0 min-w-[130px]"
                    >
                      {fl(field)}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, idx) => {
                const cat = (categories as Category[]).find(c => c.id === product.categoryId);
                const displayName = (product[fieldKey("name", defaultLang)] || product.name || `#${product.id}`) as string;
                const catLabel = cat ? catName(cat, currentLang) : "—";

                return (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    {/* Product info */}
                    <td className="px-3 py-1.5 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                      <div className="font-medium text-gray-800 truncate max-w-[150px]" title={displayName}>
                        {displayName}
                      </div>
                      <div className="text-gray-400 truncate max-w-[150px]">{catLabel}</div>
                    </td>

                    {/* Editable cells */}
                    {langOrder.map(lang => {
                      const nk = fieldKey("name", lang);
                      const dk = fieldKey("description", lang);
                      const ik = fieldKey("ingredients", lang);
                      const nv = (product[nk] || "") as string;
                      const dv = (product[dk] || "") as string;
                      const iv = (product[ik] || "") as string;
                      const rtlCell = lang === "he" || lang === "ar";
                      const missingName = !nv.trim();
                      const missingDesc = !dv.trim();

                      return (
                        <>
                          {/* Name cell */}
                          <td
                            key={`${product.id}_${lang}_name`}
                            className={`px-1 py-1 border-r border-gray-100 ${missingName ? "bg-red-50" : ""}`}
                          >
                            <Input
                              value={nv}
                              onChange={e => handleCell(product.id, nk, e.target.value)}
                              className="h-7 text-xs border border-transparent focus:border-primary/40 rounded px-1.5 bg-transparent w-full"
                              placeholder="—"
                              dir={rtlCell ? "rtl" : "ltr"}
                            />
                          </td>
                          {/* Description cell */}
                          <td
                            key={`${product.id}_${lang}_desc`}
                            className={`px-1 py-1 border-r border-gray-100 ${missingDesc ? "bg-yellow-50" : ""}`}
                          >
                            <Textarea
                              value={dv}
                              onChange={e => handleCell(product.id, dk, e.target.value)}
                              className="min-h-[28px] h-7 text-xs border border-transparent focus:border-primary/40 rounded px-1.5 bg-transparent resize-none w-full leading-tight"
                              placeholder="—"
                              dir={rtlCell ? "rtl" : "ltr"}
                              rows={1}
                              onFocus={e => {
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                              }}
                              onBlur={e => { e.target.style.height = "28px"; }}
                            />
                          </td>
                          {/* Ingredients cell */}
                          <td key={`${product.id}_${lang}_ing`} className="px-1 py-1 border-r border-gray-100 last:border-r-0">
                            <Textarea
                              value={iv}
                              onChange={e => handleCell(product.id, ik, e.target.value)}
                              className="min-h-[28px] h-7 text-xs border border-transparent focus:border-primary/40 rounded px-1.5 bg-transparent resize-none w-full leading-tight"
                              placeholder="—"
                              dir={rtlCell ? "rtl" : "ltr"}
                              rows={1}
                              onFocus={e => {
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                              }}
                              onBlur={e => { e.target.style.height = "28px"; }}
                            />
                          </td>
                        </>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom save for long tables */}
      {filtered.length > 5 && (
        <div className={`flex pt-2 ${isRTL ? "justify-start" : "justify-end"}`}>
          <SaveBtn />
        </div>
      )}
    </div>
  );
}
