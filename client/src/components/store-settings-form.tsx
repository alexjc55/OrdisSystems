import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStoreSettingsSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { 
  Store, 
  Phone, 
  Truck, 
  CreditCard, 
  Upload, 
  Clock,
  ChevronUp,
  ChevronDown,
  Save
} from "lucide-react";

// Use the imported store settings schema with extended validation
const storeSettingsSchema = insertStoreSettingsSchema.extend({
  contactEmail: z.string().email("Неверный формат email").optional().or(z.literal("")),
  bottomBanner1Link: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  bottomBanner2Link: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  cancellationReasons: z.array(z.string()).optional(),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
});

interface StoreSettingsFormProps {
  storeSettings: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export function StoreSettingsForm({ storeSettings, onSubmit, isLoading }: StoreSettingsFormProps) {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    contact: false,
    appearance: false,
    delivery: false,
    banners: false,
    tracking: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const form = useForm({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: storeSettings?.storeName || "eDAHouse",
      welcomeTitle: storeSettings?.welcomeTitle || "",
      storeDescription: storeSettings?.storeDescription || "",
      logoUrl: storeSettings?.logoUrl || "",
      bannerImage: storeSettings?.bannerImage || "",
      contactPhone: storeSettings?.contactPhone || "",
      contactEmail: storeSettings?.contactEmail || "",
      address: storeSettings?.address || "",
      workingHours: {
        monday: storeSettings?.workingHours?.monday || "",
        tuesday: storeSettings?.workingHours?.tuesday || "",
        wednesday: storeSettings?.workingHours?.wednesday || "",
        thursday: storeSettings?.workingHours?.thursday || "",
        friday: storeSettings?.workingHours?.friday || "",
        saturday: storeSettings?.workingHours?.saturday || "",
        sunday: storeSettings?.workingHours?.sunday || "",
      },
      deliveryInfo: storeSettings?.deliveryInfo || "",
      paymentInfo: storeSettings?.paymentInfo || "",
      aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
      deliveryFee: storeSettings?.deliveryFee || "15.00",
      minOrderAmount: storeSettings?.minOrderAmount || "50.00",
      discountBadgeText: storeSettings?.discountBadgeText || "Скидка",
      showBannerImage: storeSettings?.showBannerImage !== false,
      showTitleDescription: storeSettings?.showTitleDescription !== false,
      showInfoBlocks: storeSettings?.showInfoBlocks !== false,
      showSpecialOffers: storeSettings?.showSpecialOffers !== false,
      showCategoryMenu: storeSettings?.showCategoryMenu !== false,
      weekStartDay: storeSettings?.weekStartDay || "monday",
      bottomBanner1Url: storeSettings?.bottomBanner1Url || "",
      bottomBanner1Link: storeSettings?.bottomBanner1Link || "",
      bottomBanner2Url: storeSettings?.bottomBanner2Url || "",
      bottomBanner2Link: storeSettings?.bottomBanner2Link || "",
      showBottomBanners: storeSettings?.showBottomBanners !== false,
      defaultItemsPerPage: storeSettings?.defaultItemsPerPage || 10,
      headerHtml: storeSettings?.headerHtml || "",
      footerHtml: storeSettings?.footerHtml || "",
    } as any,
  });

  // Reset form when storeSettings changes
  useEffect(() => {
    if (storeSettings) {
      form.reset({
        storeName: storeSettings?.storeName || "eDAHouse",
        welcomeTitle: storeSettings?.welcomeTitle || "",
        storeDescription: storeSettings?.storeDescription || "",
        logoUrl: storeSettings?.logoUrl || "",
        bannerImage: storeSettings?.bannerImage || "",
        contactPhone: storeSettings?.contactPhone || "",
        contactEmail: storeSettings?.contactEmail || "",
        address: storeSettings?.address || "",
        workingHours: {
          monday: storeSettings?.workingHours?.monday || "",
          tuesday: storeSettings?.workingHours?.tuesday || "",
          wednesday: storeSettings?.workingHours?.wednesday || "",
          thursday: storeSettings?.workingHours?.thursday || "",
          friday: storeSettings?.workingHours?.friday || "",
          saturday: storeSettings?.workingHours?.saturday || "",
          sunday: storeSettings?.workingHours?.sunday || "",
        },
        deliveryInfo: storeSettings?.deliveryInfo || "",
        paymentInfo: storeSettings?.paymentInfo || "",
        aboutUsPhotos: storeSettings?.aboutUsPhotos || [],
        deliveryFee: storeSettings?.deliveryFee || "15.00",
        minOrderAmount: storeSettings?.minOrderAmount || "50.00",
        discountBadgeText: storeSettings?.discountBadgeText || "Скидка",
        showBannerImage: storeSettings?.showBannerImage !== false,
        showTitleDescription: storeSettings?.showTitleDescription !== false,
        showInfoBlocks: storeSettings?.showInfoBlocks !== false,
        showSpecialOffers: storeSettings?.showSpecialOffers !== false,
        showCategoryMenu: storeSettings?.showCategoryMenu !== false,
        weekStartDay: storeSettings?.weekStartDay || "monday",
        bottomBanner1Url: storeSettings?.bottomBanner1Url || "",
        bottomBanner1Link: storeSettings?.bottomBanner1Link || "",
        bottomBanner2Url: storeSettings?.bottomBanner2Url || "",
        bottomBanner2Link: storeSettings?.bottomBanner2Link || "",
        showBottomBanners: storeSettings?.showBottomBanners !== false,
        defaultItemsPerPage: storeSettings?.defaultItemsPerPage || 10,
        headerHtml: storeSettings?.headerHtml || "",
        footerHtml: storeSettings?.footerHtml || "",
      } as any);
    }
  }, [storeSettings, form]);

  // Component for collapsible section
  const CollapsibleSection = ({ 
    title, 
    isExpanded, 
    onToggle, 
    children, 
    icon 
  }: { 
    title: string; 
    isExpanded: boolean; 
    onToggle: () => void; 
    children: React.ReactNode; 
    icon: React.ReactNode;
  }) => (
    <div className="border rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t bg-gray-50/30">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Основная информация */}
        <CollapsibleSection
          title="Основная информация"
          isExpanded={expandedSections.basic}
          onToggle={() => toggleSection('basic')}
          icon={<Store className="h-5 w-5 text-orange-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Название магазина</FormLabel>
                  <FormControl>
                    <Input placeholder="eDAHouse" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="welcomeTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Заголовок на главной странице</FormLabel>
                  <FormControl>
                    <Input placeholder="Добро пожаловать в наш магазин" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="storeDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Описание магазина</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Краткое описание вашего магазина" 
                    className="resize-none text-sm" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Логотип</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bannerImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Баннер на главной</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        {/* Контактная информация */}
        <CollapsibleSection
          title="Контактная информация"
          isExpanded={expandedSections.contact}
          onToggle={() => toggleSection('contact')}
          icon={<Phone className="h-5 w-5 text-blue-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Телефон</FormLabel>
                  <FormControl>
                    <Input placeholder="+972-XX-XXX-XXXX" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="info@edahouse.com" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Адрес</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Полный адрес магазина" 
                    className="resize-none text-sm" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </CollapsibleSection>

        {/* Доставка и оплата */}
        <CollapsibleSection
          title="Доставка и оплата"
          isExpanded={expandedSections.delivery}
          onToggle={() => toggleSection('delivery')}
          icon={<Truck className="h-5 w-5 text-green-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deliveryFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Стоимость доставки (₪)</FormLabel>
                  <FormControl>
                    <Input placeholder="15.00" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minOrderAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Минимальная сумма заказа (₪)</FormLabel>
                  <FormControl>
                    <Input placeholder="50.00" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="deliveryInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Информация о доставке</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Условия и время доставки" 
                    className="resize-none text-sm" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Способы оплаты</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Доступные способы оплаты" 
                    className="resize-none text-sm" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </CollapsibleSection>

        {/* Код отслеживания */}
        <CollapsibleSection
          title="Код отслеживания"
          isExpanded={expandedSections.tracking}
          onToggle={() => toggleSection('tracking')}
          icon={<Upload className="h-5 w-5 text-purple-500" />}
        >
          <div className="text-sm text-gray-600 mb-4">
            Добавьте Facebook Pixel, Google Analytics и другие счетчики
          </div>

          <FormField
            control={form.control}
            name="headerHtml"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">HTML/JS код для &lt;head&gt;</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={`<!-- Вставьте код для <head> здесь -->
<!-- Например, Facebook Pixel, Google Analytics, и другие скрипты отслеживания -->
<script>
  // Ваш код здесь
</script>`}
                    {...field}
                    className="text-sm font-mono min-h-[120px] resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-500">
                  Этот код будет добавлен в секцию &lt;head&gt; всех страниц сайта. 
                  Используйте для Facebook Pixel, Google Analytics, и других счетчиков.
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="footerHtml"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">HTML/JS код для футера</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={`<!-- Вставьте код для футера здесь -->
<!-- Например, чаты поддержки, дополнительные скрипты -->
<script>
  // Ваш код здесь
</script>`}
                    {...field}
                    className="text-sm font-mono min-h-[120px] resize-y"
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-500">
                  Этот код будет добавлен в конец страницы перед закрывающим тегом &lt;/body&gt;. 
                  Используйте для чатов поддержки и других скрипты.
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </CollapsibleSection>

        <div className="flex justify-end pt-6 border-t">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-orange-500 text-white hover:bg-orange-500 hover:shadow-lg hover:shadow-black/30 transition-shadow duration-200"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </div>
      </form>
    </Form>
  );
}