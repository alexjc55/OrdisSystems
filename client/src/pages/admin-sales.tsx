/**
 * Admin Sales Analytics Dashboard
 * Mobile-first responsive design with large visual metric cards,
 * color indicators (green=good, red=problem), and intuitive icons
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAdminTranslation } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  AlertTriangle,
  Package,
  CreditCard,
  Globe,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Smartphone,
  RefreshCw
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ru, enUS, he, ar } from "date-fns/locale";

const dateLocales = { ru, en: enUS, he, ar };

export default function AdminSalesPage() {
  const { user } = useAuth();
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useTranslation();
  
  // Check admin permission
  if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">{adminT('common.accessDenied') || 'Access Denied'}</h2>
              <p className="text-gray-600">{adminT('sales.accessRequired') || 'You need admin access to view sales analytics'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Date range state (default: last 30 days)
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  // API queries
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['/api/admin/sales/overview', dateRange.from, dateRange.to],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sales/overview?from=${dateRange.from}&to=${dateRange.to}`);
      if (!response.ok) throw new Error('Failed to fetch overview');
      return response.json();
    }
  });

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/admin/sales/channels', dateRange.from, dateRange.to],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sales/channels?from=${dateRange.from}&to=${dateRange.to}`);
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    }
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/admin/sales/products', dateRange.from, dateRange.to],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sales/products?from=${dateRange.from}&to=${dateRange.to}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['/api/admin/sales/issues', dateRange.from, dateRange.to],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sales/issues?from=${dateRange.from}&to=${dateRange.to}`);
      if (!response.ok) throw new Error('Failed to fetch issues');
      return response.json();
    }
  });

  const isRTL = i18n.language === 'ar' || i18n.language === 'he';
  const locale = dateLocales[i18n.language as keyof typeof dateLocales] || ru;

  // Helper functions
  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const MetricCard = ({ title, value, trend, icon, className = "", isLoading = false, testId }: {
    title: string;
    value: string | number;
    trend?: number;
    icon: React.ReactNode;
    className?: string;
    isLoading?: boolean;
    testId?: string;
  }) => (
    <Card className={`${className} transition-all duration-200 hover:shadow-lg`} data-testid={testId}>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">{icon}</div>
              {trend !== undefined && (
                <div className={`flex items-center gap-1 ${getTrendColor(trend)}`}>
                  {getTrendIcon(trend)}
                  <span className="text-sm font-medium">
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (overviewError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">{adminT('sales.errorLoading') || 'Error Loading Analytics'}</h2>
              <p className="text-gray-600">{adminT('sales.refreshPrompt') || 'Please try refreshing the page'}</p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.reload()}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {adminT('actions.refresh') || 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <BarChart3 className={`h-8 w-8 text-primary ${isRTL ? 'ml-3' : 'mr-3'}`} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
                {adminT('sales.title') || 'Sales Analytics'}
              </h1>
              <p className="text-gray-600">
                {format(new Date(dateRange.from), 'MMM d', { locale })} - {format(new Date(dateRange.to), 'MMM d, yyyy', { locale })}
              </p>
            </div>
          </div>
          
          {/* Date Range Picker */}
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border">
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="border-0 bg-transparent text-sm"
              data-testid="input-date-from"
            />
            <span className="text-gray-400">→</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="border-0 bg-transparent text-sm"
              data-testid="input-date-to"
            />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 lg:inline-grid">
            <TabsTrigger value="overview" className="text-xs sm:text-sm" data-testid="tab-overview">
              <BarChart3 className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {adminT('sales.tabs.overview') || 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="channels" className="text-xs sm:text-sm" data-testid="tab-channels">
              <Globe className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {adminT('sales.tabs.channels') || 'Channels'}
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm" data-testid="tab-products">
              <Package className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {adminT('sales.tabs.products') || 'Products'}
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-xs sm:text-sm" data-testid="tab-issues">
              <AlertTriangle className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {adminT('sales.tabs.issues') || 'Issues'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title={adminT('sales.metrics.totalRevenue') || 'Total Revenue'}
                value={overview ? formatCurrency(overview.revenue) : '—'}
                trend={overview?.revenueTrend}
                icon={<DollarSign className="text-green-600" />}
                isLoading={overviewLoading}
                testId="card-revenue"
              />
              <MetricCard
                title={adminT('sales.metrics.totalOrders') || 'Total Orders'}
                value={overview ? overview.orders.toLocaleString() : '—'}
                trend={overview?.ordersTrend}
                icon={<ShoppingCart className="text-blue-600" />}
                isLoading={overviewLoading}
                testId="card-orders"
              />
              <MetricCard
                title={adminT('sales.metrics.uniqueBuyers') || 'Unique Buyers'}
                value={overview ? overview.uniqueBuyers.toLocaleString() : '—'}
                trend={overview?.buyersTrend}
                icon={<Users className="text-purple-600" />}
                isLoading={overviewLoading}
                testId="card-buyers"
              />
              <MetricCard
                title={adminT('sales.metrics.cancellationRate') || 'Cancellation Rate'}
                value={overview ? `${overview.cancellationRate.toFixed(1)}%` : '—'}
                trend={overview?.cancellationTrend}
                icon={<AlertTriangle className={overview && overview.cancellationRate > 5 ? "text-red-600" : "text-yellow-600"} />}
                isLoading={overviewLoading}
                testId="card-cancellation"
              />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                title={adminT('sales.metrics.averageOrderValue') || 'Average Order Value'}
                value={overview ? formatCurrency(overview.averageOrderValue) : '—'}
                trend={overview?.aovTrend}
                icon={<CreditCard className="text-orange-600" />}
                isLoading={overviewLoading}
                testId="card-aov"
              />
              <MetricCard
                title={adminT('sales.metrics.ordersPerDay') || 'Orders per Day'}
                value={overview ? overview.ordersPerDay.toFixed(1) : '—'}
                icon={<Calendar className="text-indigo-600" />}
                isLoading={overviewLoading}
                testId="card-orders-per-day"
              />
              <MetricCard
                title={adminT('sales.metrics.revenuePerDay') || 'Revenue per Day'}
                value={overview ? formatCurrency(overview.revenuePerDay) : '—'}
                icon={<TrendingUp className="text-emerald-600" />}
                isLoading={overviewLoading}
                testId="card-revenue-per-day"
              />
            </div>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Languages */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <Globe className="h-5 w-5" />
                    {adminT('sales.channels.salesByLanguage') || 'Sales by Language'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {channelsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {channels?.languages?.map((lang: any) => (
                        <div key={lang.language} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: lang.color }}
                            />
                            <span className="font-medium">{lang.languageName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(lang.revenue)}</div>
                            <div className="text-sm text-gray-600">{lang.orders} {adminT('sales.channels.orders') || 'orders'} ({lang.percentage}%)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <CreditCard className="h-5 w-5" />
                    {adminT('sales.channels.paymentMethods') || 'Payment Methods'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {channelsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {channels?.paymentMethods?.map((method: any) => (
                        <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: method.color }}
                            />
                            <span className="font-medium">{method.methodName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(method.revenue)}</div>
                            <div className="text-sm text-gray-600">{method.orders} {adminT('sales.channels.orders') || 'orders'} ({method.percentage}%)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {adminT('sales.channels.registeredVsGuest') || 'Registered vs Guest Users'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {channelsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {adminT('sales.channels.registeredUsers') || 'Registered Users'}
                      </h4>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(channels?.userTypes?.registered?.revenue || 0)}
                        </div>
                        <div className="text-sm text-green-600">
                          {channels?.userTypes?.registered?.orders || 0} {adminT('sales.channels.orders') || 'orders'} ({channels?.userTypes?.registered?.percentage || 0}%)
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {adminT('sales.channels.average') || 'Avg'}: {formatCurrency(channels?.userTypes?.registered?.averageOrderValue || 0)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-600" />
                        {adminT('sales.channels.guestUsers') || 'Guest Users'}
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">
                          {formatCurrency(channels?.userTypes?.guest?.revenue || 0)}
                        </div>
                        <div className="text-sm text-blue-600">
                          {channels?.userTypes?.guest?.orders || 0} {adminT('sales.channels.orders') || 'orders'} ({channels?.userTypes?.guest?.percentage || 0}%)
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {adminT('sales.channels.average') || 'Avg'}: {formatCurrency(channels?.userTypes?.guest?.averageOrderValue || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <Package className="h-5 w-5" />
                    {adminT('sales.products.topProducts') || 'Top Products'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products?.topProducts?.slice(0, 10).map((product: any, index: number) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.isSpecialOffer && (
                                <Badge variant="secondary" className="text-xs mt-1">{adminT('sales.products.specialOffer') || 'Special Offer'}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                            <div className="text-sm text-gray-600">{product.quantity} {adminT('sales.products.sold') || 'sold'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Low Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    {adminT('sales.products.lowPerformers') || 'Low Performers'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products?.lowPerformers?.slice(0, 10).map((product: any) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-600">
                              {product.lastOrderDate ? 
                                `${adminT('sales.products.lastOrder') || 'Last order'}: ${format(new Date(product.lastOrderDate), 'MMM d', { locale })}` : 
                                adminT('sales.products.noOrders') || 'No orders in period'
                              }
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-yellow-700">
                              {formatCurrency(product.revenue)}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {adminT(`sales.stockStatus.${product.stockStatus}`) || product.stockStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Special Offers vs Regular */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  {adminT('sales.products.specialVsRegular') || 'Special Offers vs Regular Products'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-orange-600">{adminT('sales.products.specialOffers') || 'Special Offers'}</h4>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-700">
                          {formatCurrency(products?.specialOffers?.revenue || 0)}
                        </div>
                        <div className="text-sm text-orange-600">
                          {products?.specialOffers?.orders || 0} {adminT('sales.channels.orders') || 'orders'} ({products?.specialOffers?.percentage || 0}%)
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {adminT('sales.channels.average') || 'Avg'}: {formatCurrency(products?.specialOffers?.averageOrderValue || 0)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-600">{adminT('sales.products.regularProducts') || 'Regular Products'}</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-gray-700">
                          {formatCurrency(products?.regular?.revenue || 0)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {products?.regular?.orders || 0} {adminT('sales.channels.orders') || 'orders'} ({products?.regular?.percentage || 0}%)
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {adminT('sales.channels.average') || 'Avg'}: {formatCurrency(products?.regular?.averageOrderValue || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cancellations */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    {adminT('sales.issues.orderCancellations') || 'Order Cancellations'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {issuesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-700" data-testid="text-cancellation-rate">
                          {issues?.cancellations?.rate || 0}%
                        </div>
                        <div className="text-sm text-red-600">
                          {issues?.cancellations?.total || 0} {adminT('sales.issues.cancelledOrders') || 'cancelled orders'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">{adminT('sales.issues.topCancellationReasons') || 'Top Cancellation Reasons'}</h4>
                        {issues?.cancellations?.topReasons?.map((reason: any) => (
                          <div key={reason.reason} className="flex justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{reason.reason}</span>
                            <span className="text-sm font-medium">{reason.count} ({reason.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inventory Issues */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <Package className="h-5 w-5 text-orange-600" />
                    {adminT('sales.issues.inventoryIssues') || 'Inventory Issues'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {issuesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-600">{adminT('sales.issues.outOfStock') || 'Out of Stock'}</h4>
                        {issues?.inventory?.outOfStock?.length > 0 ? (
                          issues.inventory.outOfStock.slice(0, 5).map((item: any) => (
                            <div key={item.id} className="p-2 bg-red-50 rounded border border-red-200">
                              <div className="font-medium text-red-800">{item.name}</div>
                              <div className="text-xs text-red-600">
                                {adminT('sales.issues.status') || 'Status'}: {adminT(`sales.stockStatus.${item.stockStatus}`) || item.stockStatus} | {adminT(`sales.availabilityStatus.${item.availabilityStatus}`) || item.availabilityStatus}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600">{adminT('sales.issues.noOutOfStock') || 'No out of stock items'}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-yellow-600">{adminT('sales.issues.lowStock') || 'Low Stock'}</h4>
                        {issues?.inventory?.lowStock?.length > 0 ? (
                          issues.inventory.lowStock.slice(0, 5).map((item: any) => (
                            <div key={item.id} className="p-2 bg-yellow-50 rounded border border-yellow-200">
                              <div className="font-medium text-yellow-800">{item.name}</div>
                              <div className="text-xs text-yellow-600">
                                {item.lastOrderDate && 
                                  `${adminT('sales.products.lastOrder') || 'Last order'}: ${format(new Date(item.lastOrderDate), 'MMM d', { locale })}`
                                }
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-600">{adminT('sales.issues.noLowStock') || 'No low stock items'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders Monitor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {adminT('sales.issues.recentOrdersMonitor') || 'Recent Orders Monitor'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {issues?.recentOrders?.slice(0, 10).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-sm">#{order.id}</div>
                          <Badge 
                            variant={order.status === 'cancelled' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {order.isGuest ? (adminT('sales.issues.guest') || 'Guest') : (adminT('sales.issues.registered') || 'Registered')} • {order.orderLanguage}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(order.totalAmount)}</div>
                          <div className="text-xs text-gray-600">
                            {format(new Date(order.createdAt), 'MMM d, HH:mm', { locale })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}