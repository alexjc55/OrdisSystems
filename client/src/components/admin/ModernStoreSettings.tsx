import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Store, 
  Palette, 
  MessageCircle, 
  Image, 
  Code, 
  Users, 
  ShoppingCart, 
  Phone, 
  Type, 
  Upload, 
  Layers,
  Globe,
  Settings,
  Eye,
  Layout,
  Mail,
  Clock,
  Truck,
  CreditCard,
  Star,
  Save,
  RefreshCw
} from 'lucide-react';
import { useAdminTranslation, useCommonTranslation } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';

const storeSettingsSchema = z.object({
  // Basic Store Information
  storeName: z.string().min(1, 'Store name is required'),
  storeDescription: z.string().optional(),
  storeAddress: z.string().optional(),
  storePhone: z.string().optional(),
  storeEmail: z.string().email().optional().or(z.literal('')),
  
  // Welcome Content
  welcomeTitle: z.string().optional(),
  welcomeDescription: z.string().optional(),
  
  // Display Settings
  showBannerImage: z.boolean().default(true),
  showTitleDescription: z.boolean().default(true),
  showInfoBlocks: z.boolean().default(true),
  infoBlocksPosition: z.enum(['top', 'bottom']).default('top'),
  showSpecialOffers: z.boolean().default(true),
  showCategoryMenu: z.boolean().default(true),
  
  // WhatsApp Integration
  showWhatsAppChat: z.boolean().default(false),
  whatsappPhoneNumber: z.string().optional(),
  whatsappDefaultMessage: z.string().optional(),
  
  // Cart Banner
  showCartBanner: z.boolean().default(false),
  cartBannerType: z.enum(['text', 'image']).default('text'),
  cartBannerText: z.string().optional(),
  cartBannerBgColor: z.string().default('#f97316'),
  cartBannerTextColor: z.string().default('#ffffff'),
  cartBannerImage: z.string().optional(),
  
  // Bottom Banners
  showBottomBanners: z.boolean().default(false),
  bottomBanner1Url: z.string().optional(),
  bottomBanner1Link: z.string().optional(),
  bottomBanner2Url: z.string().optional(),
  bottomBanner2Link: z.string().optional(),
  
  // HTML/Tracking Code
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
  
  // Auth Page Settings
  authPageTitle: z.string().optional(),
  authPageDescription: z.string().optional(),
  authPageFeature1: z.string().optional(),
  authPageFeature2: z.string().optional(),
  authPageFeature3: z.string().optional(),
  
  // Business Settings
  deliveryFee: z.number().min(0).default(0),
  minOrderAmount: z.number().min(0).default(0),
  maxOrderAmount: z.number().optional(),
  workingHours: z.string().optional(),
  deliveryTime: z.string().optional(),
  
  // Payment Settings
  acceptCash: z.boolean().default(true),
  acceptCard: z.boolean().default(false),
  acceptBankTransfer: z.boolean().default(false),
  
  // Discount Settings
  discountBadgeText: z.string().optional(),
  
  // Other Settings
  cancellationReasons: z.array(z.string()).default([]),
  orderStatuses: z.array(z.string()).default([]),
});

type StoreSettingsFormData = z.infer<typeof storeSettingsSchema>;

interface ModernStoreSettingsProps {
  storeSettings: any;
  onSubmit: (data: StoreSettingsFormData) => void;
  isLoading: boolean;
}

// Image Upload Component
function ImageUpload({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t: adminT } = useAdminTranslation();
  
  return (
    <div className="space-y-4">
      {value && (
        <div className="relative">
          <img src={value} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => onChange('')}
          >
            Remove
          </Button>
        </div>
      )}
      <Input
        type="url"
        placeholder={adminT('common.imageUrl', 'Image URL')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function ModernStoreSettings({ storeSettings, onSubmit, isLoading }: ModernStoreSettingsProps) {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  
  const [activeTab, setActiveTab] = useState('general');
  
  const form = useForm<StoreSettingsFormData>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: storeSettings?.storeName || '',
      storeDescription: storeSettings?.storeDescription || '',
      storeAddress: storeSettings?.storeAddress || '',
      storePhone: storeSettings?.storePhone || '',
      storeEmail: storeSettings?.storeEmail || '',
      welcomeTitle: storeSettings?.welcomeTitle || '',
      welcomeDescription: storeSettings?.welcomeDescription || '',
      showBannerImage: storeSettings?.showBannerImage ?? true,
      showTitleDescription: storeSettings?.showTitleDescription ?? true,
      showInfoBlocks: storeSettings?.showInfoBlocks ?? true,
      infoBlocksPosition: storeSettings?.infoBlocksPosition || 'top',
      showSpecialOffers: storeSettings?.showSpecialOffers ?? true,
      showCategoryMenu: storeSettings?.showCategoryMenu ?? true,
      showWhatsAppChat: storeSettings?.showWhatsAppChat ?? false,
      whatsappPhoneNumber: storeSettings?.whatsappPhoneNumber || '',
      whatsappDefaultMessage: storeSettings?.whatsappDefaultMessage || '',
      showCartBanner: storeSettings?.showCartBanner ?? false,
      cartBannerType: storeSettings?.cartBannerType || 'text',
      cartBannerText: storeSettings?.cartBannerText || '',
      cartBannerBgColor: storeSettings?.cartBannerBgColor || '#f97316',
      cartBannerTextColor: storeSettings?.cartBannerTextColor || '#ffffff',
      cartBannerImage: storeSettings?.cartBannerImage || '',
      showBottomBanners: storeSettings?.showBottomBanners ?? false,
      bottomBanner1Url: storeSettings?.bottomBanner1Url || '',
      bottomBanner1Link: storeSettings?.bottomBanner1Link || '',
      bottomBanner2Url: storeSettings?.bottomBanner2Url || '',
      bottomBanner2Link: storeSettings?.bottomBanner2Link || '',
      headerHtml: storeSettings?.headerHtml || '',
      footerHtml: storeSettings?.footerHtml || '',
      authPageTitle: storeSettings?.authPageTitle || '',
      authPageDescription: storeSettings?.authPageDescription || '',
      authPageFeature1: storeSettings?.authPageFeature1 || '',
      authPageFeature2: storeSettings?.authPageFeature2 || '',
      authPageFeature3: storeSettings?.authPageFeature3 || '',
      deliveryFee: storeSettings?.deliveryFee || 0,
      minOrderAmount: storeSettings?.minOrderAmount || 0,
      maxOrderAmount: storeSettings?.maxOrderAmount || undefined,
      workingHours: storeSettings?.workingHours || '',
      deliveryTime: storeSettings?.deliveryTime || '',
      acceptCash: storeSettings?.acceptCash ?? true,
      acceptCard: storeSettings?.acceptCard ?? false,
      acceptBankTransfer: storeSettings?.acceptBankTransfer ?? false,
      discountBadgeText: storeSettings?.discountBadgeText || '',
      cancellationReasons: storeSettings?.cancellationReasons || [],
      orderStatuses: storeSettings?.orderStatuses || [],
    },
  });
  
  const handleSubmit = (data: StoreSettingsFormData) => {
    onSubmit(data);
    toast({
      title: adminT('common.success', 'Success'),
      description: adminT('storeSettings.savedSuccessfully', 'Settings saved successfully'),
    });
  };
  
  const tabs = [
    {
      id: 'general',
      label: adminT('storeSettings.tabs.general', 'General'),
      icon: Store,
    },
    {
      id: 'display',
      label: adminT('storeSettings.tabs.display', 'Display'),
      icon: Eye,
    },
    {
      id: 'communication',
      label: adminT('storeSettings.tabs.communication', 'Communication'),
      icon: MessageCircle,
    },
    {
      id: 'business',
      label: adminT('storeSettings.tabs.business', 'Business'),
      icon: CreditCard,
    },
    {
      id: 'integration',
      label: adminT('storeSettings.tabs.integration', 'Integration'),
      icon: Code,
    },
  ];
  
  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-orange-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {adminT('storeSettings.title', 'Store Settings')}
          </h2>
          <p className="text-gray-600">
            {adminT('storeSettings.description', 'Configure your store settings and preferences')}
          </p>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    {adminT('storeSettings.basicInfo', 'Basic Information')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.basicInfoDesc', 'Configure basic store information')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('storeSettings.storeName', 'Store Name')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="storePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {adminT('storeSettings.storePhone', 'Phone Number')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+972501234567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="storeDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('storeSettings.storeDescription', 'Description')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="storeAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('storeSettings.storeAddress', 'Address')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="storeEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {adminT('storeSettings.storeEmail', 'Email')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>{adminT('storeSettings.welcomeContent', 'Welcome Content')}</CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.welcomeContentDesc', 'Configure homepage welcome section')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="welcomeTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('storeSettings.welcomeTitle', 'Welcome Title')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="welcomeDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('storeSettings.welcomeDescription', 'Welcome Description')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Display Settings */}
            <TabsContent value="display" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="h-5 w-5" />
                    {adminT('storeSettings.layoutOptions', 'Layout Options')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.layoutOptionsDesc', 'Control what elements are visible on your store')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="showBannerImage"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('storeSettings.showBanner', 'Show Banner')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('storeSettings.showBannerDesc', 'Display banner image on homepage')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="showTitleDescription"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('storeSettings.showTitle', 'Show Title & Description')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('storeSettings.showTitleDesc', 'Display welcome title and description')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                            <FormLabel className="text-base font-medium">
                              {adminT('storeSettings.showInfoBlocks', 'Show Info Blocks')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('storeSettings.showInfoBlocksDesc', 'Display information blocks')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                            <FormLabel className="text-base font-medium">
                              {adminT('storeSettings.showCategoryMenu', 'Show Category Menu')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('storeSettings.showCategoryMenuDesc', 'Display category navigation menu')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {form.watch("showInfoBlocks") && (
                    <FormField
                      control={form.control}
                      name="infoBlocksPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('storeSettings.infoBlocksPosition', 'Info Blocks Position')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="top">{adminT('storeSettings.positionTop', 'Top')}</SelectItem>
                              <SelectItem value="bottom">{adminT('storeSettings.positionBottom', 'Bottom')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
              
              {/* Cart Banner Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    {adminT('storeSettings.cartBanner', 'Cart Banner')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.cartBannerDesc', 'Configure promotional banner in cart')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="showCartBanner"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            {adminT('storeSettings.enableCartBanner', 'Enable Cart Banner')}
                          </FormLabel>
                          <FormDescription>
                            {adminT('storeSettings.enableCartBannerDesc', 'Show promotional banner in shopping cart')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("showCartBanner") && (
                    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                      <FormField
                        control={form.control}
                        name="cartBannerType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('storeSettings.bannerType', 'Banner Type')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="text">{adminT('storeSettings.textBanner', 'Text Banner')}</SelectItem>
                                <SelectItem value="image">{adminT('storeSettings.imageBanner', 'Image Banner')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("cartBannerType") === "text" && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="cartBannerText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{adminT('storeSettings.bannerText', 'Banner Text')}</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="cartBannerBgColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{adminT('storeSettings.backgroundColor', 'Background Color')}</FormLabel>
                                  <FormControl>
                                    <div className="flex gap-2">
                                      <Input type="color" {...field} className="w-16 h-10 p-1" />
                                      <Input {...field} className="flex-1" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="cartBannerTextColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{adminT('storeSettings.textColor', 'Text Color')}</FormLabel>
                                  <FormControl>
                                    <div className="flex gap-2">
                                      <Input type="color" {...field} className="w-16 h-10 p-1" />
                                      <Input {...field} className="flex-1" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                      
                      {form.watch("cartBannerType") === "image" && (
                        <FormField
                          control={form.control}
                          name="cartBannerImage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{adminT('storeSettings.bannerImage', 'Banner Image')}</FormLabel>
                              <FormControl>
                                <ImageUpload value={field.value || ''} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Communication Settings */}
            <TabsContent value="communication" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    {adminT('storeSettings.whatsappIntegration', 'WhatsApp Integration')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.whatsappDesc', 'Configure WhatsApp chat widget')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="showWhatsAppChat"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            {adminT('storeSettings.enableWhatsApp', 'Enable WhatsApp Chat')}
                          </FormLabel>
                          <FormDescription>
                            {adminT('storeSettings.enableWhatsAppDesc', 'Show WhatsApp chat button')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("showWhatsAppChat") && (
                    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                      <FormField
                        control={form.control}
                        name="whatsappPhoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {adminT('storeSettings.whatsappPhone', 'WhatsApp Phone Number')}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+972501234567" />
                            </FormControl>
                            <FormDescription>
                              {adminT('storeSettings.whatsappPhoneDesc', 'Phone number in international format')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="whatsappDefaultMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('storeSettings.defaultMessage', 'Default Message')}</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormDescription>
                              {adminT('storeSettings.defaultMessageDesc', 'Pre-filled message when chat opens')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Auth Page Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {adminT('storeSettings.authPageSettings', 'Authentication Page')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.authPageDesc', 'Customize login/registration page content')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="authPageTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('storeSettings.authPageTitle', 'Page Title')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="authPageDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('storeSettings.authPageDescription', 'Page Description')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">{adminT('storeSettings.features', 'Features List')}</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="authPageFeature1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('storeSettings.feature1', 'Feature 1')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="authPageFeature2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('storeSettings.feature2', 'Feature 2')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="authPageFeature3"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{adminT('storeSettings.feature3', 'Feature 3')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Business Settings */}
            <TabsContent value="business" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    {adminT('storeSettings.deliverySettings', 'Delivery & Orders')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.deliveryDesc', 'Configure delivery and order settings')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('storeSettings.deliveryFee', 'Delivery Fee')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
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
                          <FormLabel>{adminT('storeSettings.minOrderAmount', 'Minimum Order Amount')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workingHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {adminT('storeSettings.workingHours', 'Working Hours')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="09:00 - 22:00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('storeSettings.deliveryTime', 'Delivery Time')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="30-60 minutes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {adminT('storeSettings.paymentMethods', 'Payment Methods')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.paymentMethodsDesc', 'Choose accepted payment methods')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="acceptCash"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('storeSettings.cashPayment', 'Cash Payment')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('storeSettings.cashPaymentDesc', 'Accept cash on delivery')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="acceptCard"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('storeSettings.cardPayment', 'Card Payment')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('storeSettings.cardPaymentDesc', 'Accept credit/debit cards')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="acceptBankTransfer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('storeSettings.bankTransfer', 'Bank Transfer')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('storeSettings.bankTransferDesc', 'Accept bank transfers')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Integration Settings */}
            <TabsContent value="integration" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {adminT('storeSettings.customCode', 'Custom HTML/JS Code')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.customCodeDesc', 'Add tracking codes and custom scripts')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="headerHtml"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{adminT('storeSettings.headerCode', 'Header Code')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={6} 
                            className="font-mono text-sm"
                            placeholder="<!-- Google Analytics, Meta Pixel, etc. -->"
                          />
                        </FormControl>
                        <FormDescription>
                          {adminT('storeSettings.headerCodeDesc', 'Code will be added to the <head> section')}
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
                        <FormLabel>{adminT('storeSettings.footerCode', 'Footer Code')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={6} 
                            className="font-mono text-sm"
                            placeholder="<!-- Chat widgets, social media buttons, etc. -->"
                          />
                        </FormControl>
                        <FormDescription>
                          {adminT('storeSettings.footerCodeDesc', 'Code will be added before closing </body> tag')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    {adminT('storeSettings.additionalBanners', 'Additional Banners')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('storeSettings.additionalBannersDesc', 'Configure additional promotional banners')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="showBottomBanners"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            {adminT('storeSettings.enableBottomBanners', 'Enable Bottom Banners')}
                          </FormLabel>
                          <FormDescription>
                            {adminT('storeSettings.enableBottomBannersDesc', 'Show promotional banners at bottom of pages')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("showBottomBanners") && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium">{adminT('storeSettings.banner1', 'Banner 1')}</h4>
                        
                        <FormField
                          control={form.control}
                          name="bottomBanner1Url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{adminT('storeSettings.bannerImage', 'Banner Image')}</FormLabel>
                              <FormControl>
                                <ImageUpload value={field.value || ''} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bottomBanner1Link"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{adminT('storeSettings.bannerLink', 'Banner Link')}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://example.com" />
                              </FormControl>
                              <FormDescription>
                                {adminT('storeSettings.bannerLinkDesc', 'Optional link when banner is clicked')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium">{adminT('storeSettings.banner2', 'Banner 2')}</h4>
                        
                        <FormField
                          control={form.control}
                          name="bottomBanner2Url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{adminT('storeSettings.bannerImage', 'Banner Image')}</FormLabel>
                              <FormControl>
                                <ImageUpload value={field.value || ''} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bottomBanner2Link"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{adminT('storeSettings.bannerLink', 'Banner Link')}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://example.com" />
                              </FormControl>
                              <FormDescription>
                                {adminT('storeSettings.bannerLinkDesc', 'Optional link when banner is clicked')}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <Separator />
          
          <div className="flex items-center justify-between pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => form.reset()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {adminT('common.reset', 'Reset')}
            </Button>
            
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {adminT('common.save', 'Save Settings')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}