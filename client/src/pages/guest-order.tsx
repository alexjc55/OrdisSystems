import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField } from "@shared/localization";
import { useSEO, generateKeywords } from "@/hooks/useSEO";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatQuantity, getUnitShortLabel, formatDeliveryTimeRange, type ProductUnit } from "@/lib/currency";
import { Package, Clock, MapPin, Phone, CreditCard, FileText, ArrowLeft, CheckCircle, AlertCircle, ShoppingBag, Truck } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { OrderWithItems } from "@shared/schema";

export default function GuestOrderPage() {
  const [match, params] = useRoute("/guest-order/:token");
  const token = params?.token;
  
  const { t } = useCommonTranslation();
  const { t: tShop } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  const { storeSettings } = useStoreSettings();
  
  // Fetch order data using the token
  const { data: order, isLoading, error } = useQuery<OrderWithItems>({
    queryKey: ["/api/orders/guest", token],
    queryFn: async () => {
      const response = await fetch(`/api/orders/guest/${token}`);
      if (!response.ok) {
        throw new Error("Order not found or token expired");
      }
      return response.json();
    },
    enabled: !!token,
  });

  // SEO for guest order page
  const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
  const title = order 
    ? `${t('order.order')} #${order.id} - ${storeName || 'eDAHouse'}` 
    : `${t('order.viewOrder')} - ${storeName || 'eDAHouse'}`;
  const description = order 
    ? `${t('order.orderDetails')} #${order.id} - ${order.status}` 
    : `${t('order.viewOrderDetails')} ${storeName || 'eDAHouse'}`;
  
  useSEO({
    title,
    description,
    keywords: generateKeywords(title, description),
    ogTitle: title,
    ogDescription: description,
    canonical: `/guest-order/${token}`
  });

  const isRTL = ['he', 'ar'].includes(currentLanguage);

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 
          icon: <Clock className="w-4 h-4" />,
          text: t('order.statusPending')
        };
      case 'confirmed':
        return { 
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 
          icon: <CheckCircle className="w-4 h-4" />,
          text: t('order.statusConfirmed')
        };
      case 'preparing':
        return { 
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', 
          icon: <Package className="w-4 h-4" />,
          text: t('order.statusPreparing')
        };
      case 'ready':
        return { 
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
          icon: <CheckCircle className="w-4 h-4" />,
          text: t('order.statusReady')
        };
      case 'delivered':
        return { 
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', 
          icon: <Truck className="w-4 h-4" />,
          text: t('order.statusDelivered')
        };
      case 'cancelled':
        return { 
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', 
          icon: <AlertCircle className="w-4 h-4" />,
          text: t('order.statusCancelled')
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', 
          icon: <Clock className="w-4 h-4" />,
          text: status
        };
    }
  };

  if (!match) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-900", isRTL && "rtl")}>
        <Header />
        <div className="container max-w-4xl mx-auto px-4 py-8 pt-20">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600 dark:text-gray-300">{t('loading.order')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-900", isRTL && "rtl")}>
        <Header />
        <div className="container max-w-4xl mx-auto px-4 py-8 pt-20">
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <CardTitle className="text-2xl mb-4 text-red-700 dark:text-red-400">
                {t('orderNotFound')}
              </CardTitle>
              <CardDescription className="text-lg mb-6">
                {t('orderNotFoundDesc')}
              </CardDescription>
              <Link href="/">
                <Button size="lg">
                  <ArrowLeft className={cn("w-5 h-5", isRTL ? "ml-2 rotate-180" : "mr-2")} />
                  {t('backHome')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);

  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-900", isRTL && "rtl")}>
      <Header />
      
      <div className="container max-w-4xl mx-auto px-4 py-8 pt-20">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className={cn("w-4 h-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
              {t('backHome')}
            </Button>
          </Link>
        </div>

        {/* Order Header */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {t('order.order')} #{order.id}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {order.createdAt && new Date(order.createdAt).toLocaleDateString(
                    currentLanguage === 'en' ? 'en-US' : 'ru-RU', 
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("flex items-center gap-1 text-sm px-3 py-1", statusInfo.color)}>
                  {statusInfo.icon}
                  {statusInfo.text}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {t('order.items')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item) => {
                  const productName = getLocalizedField(item.product, 'name', currentLanguage) || item.product.name;
                  const productImageUrl = getLocalizedField(item.product, 'imageUrl', currentLanguage) || item.product.imageUrl;

                  return (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      {productImageUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={productImageUrl} 
                            alt={productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {productName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {formatQuantity(item.quantity, item.product.unit as ProductUnit)} × {formatCurrency(item.pricePerKg)}
                        </p>
                      </div>
                      <div className={cn(isRTL ? "text-left" : "text-right")}>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {t('order.customerInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {order.guestName || `${order.user?.firstName} ${order.user?.lastName}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.guestEmail || order.user?.email}
                    </p>
                  </div>
                </div>
                
                {(order.guestPhone || order.user?.phone) && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {order.guestPhone || order.user?.phone}
                    </span>
                  </div>
                )}

                {order.deliveryAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {order.deliveryAddress}
                    </span>
                  </div>
                )}

                {(order.deliveryDate || order.deliveryTime) && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {order.deliveryDate && new Date(order.deliveryDate).toLocaleDateString(
                        currentLanguage === 'en' ? 'en-US' : 'ru-RU', 
                        {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }
                      )}
                      {order.deliveryTime && ` ${formatDeliveryTimeRange(order.deliveryTime)}`}
                    </span>
                  </div>
                )}

                {order.paymentMethod && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {order.paymentMethod}
                    </span>
                  </div>
                )}

                {order.customerNotes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {t('order.notes')}:
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        {order.customerNotes}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t('order.summary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>{t('order.total')}</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}