import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStoreSettingsSchema, type StoreSettings } from "@shared/schema";
import { 
  Save,
  Store,
  Settings,
  Palette,
  Clock,
  Code,
  ChevronDown,
  Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const storeSettingsSchema = insertStoreSettingsSchema.extend({
  contactEmail: z.string().email("Неверный формат email").optional().or(z.literal("")),
  bottomBanner1Link: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  bottomBanner2Link: z.string().url("Неверный формат URL").optional().or(z.literal("")),
  cancellationReasons: z.array(z.string()).optional(),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
});

interface OrganizedStoreSettingsProps {
  storeSettings: StoreSettings;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export default function OrganizedStoreSettings({ storeSettings, onSubmit, isLoading }: OrganizedStoreSettingsProps) {
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
    },
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
      });
    }
  }, [storeSettings, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Basic Store Information */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Основная информация о магазине</h3>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название магазина</FormLabel>
                        <FormControl>
                          <Input placeholder="eDAHouse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="welcomeTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Заголовок на главной странице</FormLabel>
                        <FormControl>
                          <Input placeholder="Добро пожаловать в наш магазин" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Телефон</FormLabel>
                        <FormControl>
                          <Input placeholder="+972-XX-XXX-XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="info@edahouse.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="mt-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="storeDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание магазина</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Расскажите о вашем магазине готовой еды..."
                            className="resize-none min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Адрес</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Введите полный адрес магазина"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Design & Branding */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Дизайн и брендинг</h3>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Логотип магазина
                        </FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value || ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="bannerImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          Баннер на главной странице
                        </FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value || ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="discountBadgeText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Текст значка скидки</FormLabel>
                        <FormControl>
                          <Input placeholder="Скидка" {...field} />
                        </FormControl>
                        <FormDescription>
                          Текст, который отображается на значке скидки у товаров
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Working Hours */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Часы работы</h3>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="workingHours.monday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Понедельник</FormLabel>
                        <FormControl>
                          <Input placeholder="09:00-21:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workingHours.tuesday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Вторник</FormLabel>
                        <FormControl>
                          <Input placeholder="09:00-21:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workingHours.wednesday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Среда</FormLabel>
                        <FormControl>
                          <Input placeholder="09:00-21:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workingHours.thursday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Четверг</FormLabel>
                        <FormControl>
                          <Input placeholder="09:00-21:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workingHours.friday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пятница</FormLabel>
                        <FormControl>
                          <Input placeholder="09:00-21:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workingHours.saturday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Суббота</FormLabel>
                        <FormControl>
                          <Input placeholder="09:00-21:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="workingHours.sunday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Воскресенье</FormLabel>
                        <FormControl>
                          <Input placeholder="Выходной" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* HTML/JS Code Integration */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Code className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">HTML/JS код для аналитики</h3>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="headerHtml"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML/JS код в хедере сайта</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={`<!-- Пример: Пиксель Facebook -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>`}
                            className="resize-none min-h-[150px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Код будет добавлен в &lt;head&gt; раздел всех страниц сайта. Используйте для добавления пикселей Facebook, Google Analytics, счетчиков и т.д.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="footerHtml"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML/JS код в футере сайта</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={`<!-- Пример: Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>`}
                            className="resize-none min-h-[150px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Код будет добавлен перед закрывающим &lt;/body&gt; тегом на всех страницах сайта. Используйте для скриптов аналитики, чатов и т.д.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* System Settings */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Системные настройки</h3>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="deliveryFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Стоимость доставки (₪)</FormLabel>
                        <FormControl>
                          <Input placeholder="15.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="minOrderAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Минимальная сумма заказа (₪)</FormLabel>
                        <FormControl>
                          <Input placeholder="50.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="defaultItemsPerPage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Элементов на странице по умолчанию</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString() || "10"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите количество" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="10">10 элементов</SelectItem>
                            <SelectItem value="15">15 элементов</SelectItem>
                            <SelectItem value="25">25 элементов</SelectItem>
                            <SelectItem value="50">50 элементов</SelectItem>
                            <SelectItem value="100">100 элементов</SelectItem>
                            <SelectItem value="1000">Все элементы</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Количество товаров, заказов и пользователей отображаемых на одной странице в админ панели
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Display Settings */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Настройки отображения</h3>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="showBannerImage"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Показывать баннер</FormLabel>
                          <FormDescription>
                            Отображать баннер на главной странице
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="showCategoryMenu"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Показывать меню категорий</FormLabel>
                          <FormDescription>
                            Отображать навигацию по категориям
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="showSpecialOffers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Показывать спецпредложения</FormLabel>
                          <FormDescription>
                            Отображать товары со скидками
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="showInfoBlocks"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Показывать информационные блоки</FormLabel>
                          <FormDescription>
                            Отображать блоки с информацией о доставке и оплате
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </div>
      </form>
    </Form>
  );
}