import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ShoppingCart, Eye, ArrowLeft, Package, Clock, Mail, Send } from "lucide-react";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { getLocalizedField } from "@shared/localization";
import { useSEO, generateKeywords } from "@/hooks/useSEO";
import Header from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function ThanksPage() {
  const [location] = useLocation();
  const { t } = useCommonTranslation();
  const { currentLanguage } = useLanguage();
  const { storeSettings } = useStoreSettings();
  const { sendPurchase, sendGoal } = useAnalytics();
  const [orderData, setOrderData] = useState<{
    orderId?: number;
    guestAccessToken?: string;
    claimToken?: string;
    orderLanguage?: string;
    isGuest?: boolean;
    hasEmail?: boolean;
  }>({});
  
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  // Extract order data from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setOrderData({
      orderId: urlParams.get("orderId") ? parseInt(urlParams.get("orderId")!) : undefined,
      guestAccessToken: urlParams.get("guestAccessToken") || urlParams.get("token") || undefined,
      claimToken: urlParams.get("claimToken") || undefined,
      orderLanguage: urlParams.get("lang") || currentLanguage,
      isGuest: urlParams.get("guest") === "true",
      hasEmail: urlParams.get("hasEmail") !== "false" // Default to true, false only if explicitly set
    });
  }, [location, currentLanguage]);

  // Fetch full order details for analytics
  const { data: fullOrderData } = useQuery({
    queryKey: [
      orderData.isGuest ? "/api/orders/guest" : "/api/orders", 
      orderData.isGuest ? orderData.guestAccessToken : orderData.orderId
    ],
    queryFn: async () => {
      if (!orderData.orderId) return null;
      
      // Use guest endpoint for guest orders, regular endpoint for user orders
      if (orderData.isGuest && orderData.guestAccessToken) {
        try {
          return await apiRequest("GET", `/api/orders/guest/${orderData.guestAccessToken}`);
        } catch (error) {
          console.warn('[Analytics] Failed to fetch guest order details:', error);
          return null;
        }
      } else if (!orderData.isGuest && orderData.orderId) {
        try {
          return await apiRequest("GET", `/api/orders/${orderData.orderId}`);
        } catch (error) {
          console.warn('[Analytics] Failed to fetch order details:', error);
          return null;
        }
      }
      return null;
    },
    enabled: Boolean(orderData.orderId && (orderData.isGuest ? orderData.guestAccessToken : true)),
    retry: 1,
    staleTime: 0 // Always refetch order data
  });

  // Send analytics events when order data is available
  useEffect(() => {
    // Wait for both URL parameters and order details to be loaded
    if (!orderData.orderId || !fullOrderData) return;
    
    try {
      // Prepare analytics data
      const analyticsData = {
        orderId: orderData.orderId,
        value: parseFloat(fullOrderData.totalAmount) || 0,
        currency: 'ILS', // Default currency for Israel
        items: fullOrderData.orderItems?.map((item: any) => ({
          name: item.product?.name || `Product ${item.productId}`,
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.totalPrice) || 0
        })) || []
      };

      // Send purchase conversion event
      sendPurchase(analyticsData);
      
      // Send additional goals for better tracking
      sendGoal('order_completed', {
        order_id: orderData.orderId,
        order_value: analyticsData.value,
        is_guest: orderData.isGuest,
        currency: 'ILS'
      });

      // Send specific goal for thank you page visit
      sendGoal('thank_you_page_visited', {
        order_id: orderData.orderId,
        referrer: document.referrer
      });

      console.log('[Analytics] Purchase conversion events sent for order:', orderData.orderId);
      
    } catch (error) {
      console.error('[Analytics] Error sending purchase events:', error);
    }
  }, [orderData.orderId, fullOrderData, orderData.isGuest, sendPurchase, sendGoal]);

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

  // Prevent caching of thanks page
  useEffect(() => {
    // Add no-cache meta tags
    const metaTags = [
      { name: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
      { name: 'Pragma', content: 'no-cache' },
      { name: 'Expires', content: '0' },
      { httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
      { httpEquiv: 'Pragma', content: 'no-cache' },
      { httpEquiv: 'Expires', content: '0' }
    ];

    const addedTags: HTMLMetaElement[] = [];

    metaTags.forEach(tagProps => {
      const existingTag = document.querySelector(
        tagProps.name 
          ? `meta[name="${tagProps.name}"]` 
          : `meta[http-equiv="${tagProps.httpEquiv}"]`
      );
      
      if (!existingTag) {
        const meta = document.createElement('meta');
        if (tagProps.name) {
          meta.setAttribute('name', tagProps.name);
        } else if (tagProps.httpEquiv) {
          meta.setAttribute('http-equiv', tagProps.httpEquiv);
        }
        meta.setAttribute('content', tagProps.content);
        document.head.appendChild(meta);
        addedTags.push(meta);
      }
    });

    // Force page reload on back button (prevents cached view)
    const handlePopState = () => {
      window.location.reload();
    };

    window.addEventListener('popstate', handlePopState);

    // Cleanup function
    return () => {
      // Remove added meta tags
      addedTags.forEach(tag => {
        if (tag.parentNode) {
          tag.parentNode.removeChild(tag);
        }
      });
      
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Mutation for sending email with order details
  const sendEmailMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      if (!orderData.guestAccessToken) {
        throw new Error("No guest access token available");
      }
      
      return await apiRequest("POST", `/api/orders/guest/${orderData.guestAccessToken}/send-email`, {
        email: emailAddress.trim()
      });
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: t('thanks.emailSentTitle'),
        description: t('thanks.emailSentDescription'),
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('thanks.emailErrorTitle'),
        description: error.message || t('thanks.emailErrorDescription'),
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    if (!email || !email.trim()) {
      toast({
        title: t('thanks.emailRequiredTitle'),
        description: t('thanks.emailRequiredDescription'),
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: t('thanks.emailInvalidTitle'),
        description: t('thanks.emailInvalidDescription'),
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate(email);
  };

  const isRTL = ['he', 'ar'].includes(currentLanguage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50" data-page="thanks">
      <Header />
      
      <div className="container max-w-2xl mx-auto px-4 py-8 pt-20">
        {/* Success Animation & Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-green-800 mb-2 text-center">
            {t('thanks.title')}
          </h1>
          
          <p className="text-lg text-green-700 mb-4 text-center">
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
              <>
                {/* Email was provided during checkout */}
                {orderData.hasEmail && (
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

                {/* Email was NOT provided during checkout */}
                {!orderData.hasEmail && !emailSent && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Mail className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-orange-800 mb-2">
                          {t('thanks.noEmailTitle')}
                        </h3>
                        <p className="text-sm text-orange-700 mb-4">
                          {t('thanks.noEmailDescription')}
                        </p>
                        
                        {/* Email input form */}
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="email" className="text-sm font-medium text-orange-800">
                              {t('thanks.emailLabel')}
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                id="email"
                                type="email"
                                placeholder={t('thanks.emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                                className="flex-1"
                                disabled={sendEmailMutation.isPending}
                                data-testid="input-guest-email"
                              />
                              <Button 
                                onClick={handleSendEmail}
                                disabled={sendEmailMutation.isPending || !email.trim()}
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700"
                                data-testid="button-send-email"
                              >
                                {sendEmailMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-orange-600">
                            {t('thanks.emailPrivacyNote')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email successfully sent */}
                {!orderData.hasEmail && emailSent && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-800">
                        {t('thanks.emailSentSuccessTitle')}
                      </h3>
                    </div>
                    <p className="text-sm text-green-700">
                      {t('thanks.emailSentSuccessDescription')}
                    </p>
                  </div>
                )}
              </>
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
                <Link href={orderData.claimToken 
                  ? `/auth?claimToken=${orderData.claimToken}&returnTo=/profile?tab=orders` 
                  : "/auth"
                }>
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
          {orderData.orderId && (orderData.guestAccessToken || !orderData.isGuest) && (
            <Link 
              href={orderData.guestAccessToken 
                ? `/guest-order/${orderData.guestAccessToken}` 
                : `/profile?tab=orders&highlight=${orderData.orderId}`
              }
            >
              <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                <Eye className={cn("w-5 h-5", isRTL ? "ml-2" : "mr-2")} />
                {t('thanks.viewOrder')}
              </Button>
            </Link>
          )}

          {/* Continue Shopping / Back to Home */}
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-green-600 text-green-700 hover:bg-green-50">
              <ArrowLeft className={cn("w-5 h-5", isRTL ? "ml-2 rotate-180" : "mr-2")} />
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