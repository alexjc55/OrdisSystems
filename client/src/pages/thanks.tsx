import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ShoppingCart, Eye, ArrowLeft, Package, Clock } from "lucide-react";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { getLocalizedField } from "@shared/localization";
import { useSEO, generateKeywords } from "@/hooks/useSEO";
import Header from "@/components/layout/header";
import { cn } from "@/lib/utils";

export default function ThanksPage() {
  const [location] = useLocation();
  const { t } = useCommonTranslation();
  const { currentLanguage } = useLanguage();
  const { storeSettings } = useStoreSettings();
  const [orderData, setOrderData] = useState<{
    orderId?: number;
    guestAccessToken?: string;
    orderLanguage?: string;
    isGuest?: boolean;
  }>({});

  // Extract order data from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setOrderData({
      orderId: urlParams.get("orderId") ? parseInt(urlParams.get("orderId")!) : undefined,
      guestAccessToken: urlParams.get("token") || undefined,
      orderLanguage: urlParams.get("lang") || currentLanguage,
      isGuest: urlParams.get("guest") === "true"
    });
  }, [location, currentLanguage]);

  // SEO for thanks page
  const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
  const title = `${t('thanks.title')} - ${storeName || 'eDAHouse'}`;
  const description = `${t('thanks.orderConfirmed')} ${storeName || 'eDAHouse'}`;
  
  useSEO({
    title,
    description,
    keywords: generateKeywords(title, description),
    ogTitle: title,
    ogDescription: description,
    canonical: '/thanks'
  });

  const isRTL = ['he', 'ar'].includes(currentLanguage);

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-green-50 to-emerald-50", isRTL && "rtl")}>
      <Header />
      
      <div className="container max-w-2xl mx-auto px-4 py-8 mt-4">
        {/* Success Animation & Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            {t('thanks.title')}
          </h1>
          
          <p className="text-lg text-green-700 mb-4">
            {t('thanks.orderConfirmed')}
          </p>
          
          {orderData.orderId && (
            <Badge variant="secondary" className="text-base px-4 py-2">
              {t('thanks.orderNumber')}: #{orderData.orderId}
            </Badge>
          )}
        </div>

        {/* Order Status Card */}
        <Card className="mb-8">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Package className="w-6 h-6 text-green-600" />
              {t('thanks.orderReceived')}
            </CardTitle>
            <CardDescription>
              {orderData.isGuest 
                ? t('thanks.guestOrderMessage')
                : t('thanks.userOrderMessage')
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Order Processing Timeline */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">
                  {t('thanks.nextSteps')}
                </h3>
              </div>
              
              {/* Phone confirmation message */}
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium">
                  📞 {t('thanks.phoneConfirmation')}
                </p>
              </div>
              
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {t('thanks.step1')} ✓
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  {t('thanks.step2')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  {t('thanks.step3')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  {t('thanks.step4')}
                </div>
              </div>
            </div>

            {/* Guest Order Info */}
            {orderData.isGuest && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  {t('thanks.guestOrderTitle')}
                </h3>
                <p className="text-sm text-yellow-700 mb-3">
                  {t('thanks.guestOrderDescription')}
                </p>
                <div className="text-xs text-yellow-600">
                  {t('thanks.emailSent')}
                </div>
              </div>
            )}

            {/* Registration Encouragement for Guests */}
            {orderData.isGuest && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-2">
                  {t('thanks.registerTitle')}
                </h3>
                <p className="text-sm text-purple-700 mb-3">
                  {t('thanks.registerDescription')}
                </p>
                <Link href="/auth">
                  <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                    {t('thanks.createAccount')}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* View Order (for guests with token or authenticated users) */}
          {(orderData.guestAccessToken || !orderData.isGuest) && orderData.orderId && (
            <Link 
              href={orderData.guestAccessToken 
                ? `/guest-order/${orderData.guestAccessToken}` 
                : `/profile?tab=orders&highlight=${orderData.orderId}`
              }
            >
              <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                <Eye className="w-5 h-5 mr-2" />
                {t('thanks.viewOrder')}
              </Button>
            </Link>
          )}

          {/* Continue Shopping / Back to Home */}
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-green-600 text-green-700 hover:bg-green-50">
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('thanks.backHome')}
            </Button>
          </Link>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-12 text-gray-500">
          <p className="text-sm">
            {t('thanks.footerMessage').replace('{{storeName}}', storeName || 'eDAHouse')}
          </p>
        </div>
      </div>
    </div>
  );
}