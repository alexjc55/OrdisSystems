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
  RefreshCw,
  Lightbulb,
  Target,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
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

  // Generate actionable insights based on data
  const generateInsights = () => {
    const insights = [];
    
    // Revenue trend insights (check overview data)
    if (overview && overview.revenueTrend < 0) {
      insights.push({
        type: 'warning',
        title: adminT('sales.insights.revenueDown.title') || 'Revenue Declining',
        description: adminT('sales.insights.revenueDown.desc') || 'Consider marketing campaigns or promotional offers',
        action: adminT('sales.insights.revenueDown.action') || 'Review pricing strategy',
        icon: 'TrendingDown'
      });
    }

    // High cancellation rate (check overview data)
    if (overview && overview.cancellationRate > 15) {
      insights.push({
        type: 'critical',
        title: adminT('sales.insights.highCancellation.title') || 'High Cancellation Rate',
        description: adminT('sales.insights.highCancellation.desc') || `${overview.cancellationRate.toFixed(1)}% of orders are being cancelled`,
        action: adminT('sales.insights.highCancellation.action') || 'Investigate checkout process issues',
        icon: 'AlertTriangle'
      });
    }

    // Language opportunity (check channels data with proper sorting)
    if (channels && channels.languages && channels.languages.length > 0) {
      const sortedLanguages = [...channels.languages].sort((a, b) => b.percentage - a.percentage);
      const topLanguage = sortedLanguages[0];
      if (topLanguage && topLanguage.percentage < 60) {
        insights.push({
          type: 'opportunity',
          title: adminT('sales.insights.languageOpportunity.title') || 'Market Diversification Opportunity',
          description: adminT('sales.insights.languageOpportunity.desc') || `No single language dominates. Consider expanding in ${topLanguage.languageName}`,
          action: adminT('sales.insights.languageOpportunity.action') || 'Invest in localized marketing',
          icon: 'Globe'
        });
      }
    }

    // Low performing products (check products data)
    if (products && products.lowPerformers && products.lowPerformers.length > 0) {
      insights.push({
        type: 'warning',
        title: adminT('sales.insights.lowPerformers.title') || 'Products Need Attention',
        description: adminT('sales.insights.lowPerformers.desc') || `${products.lowPerformers.length} products have low sales`,
        action: adminT('sales.insights.lowPerformers.action') || 'Review product descriptions and pricing',
        icon: 'Package'
      });
    }

    // Payment method diversity (check channels data)
    if (channels && channels.paymentMethods) {
      const paymentMethods = channels.paymentMethods.length;
      if (paymentMethods < 3) {
        insights.push({
          type: 'opportunity',
          title: adminT('sales.insights.paymentMethods.title') || 'Add More Payment Options',
          description: adminT('sales.insights.paymentMethods.desc') || 'More payment methods can increase conversion rates',
          action: adminT('sales.insights.paymentMethods.action') || 'Consider adding digital wallets',
          icon: 'CreditCard'
        });
      }
    }

    // High cancellation issues (check issues data)
    if (issues && issues.cancellationReasons && issues.cancellationReasons.length > 0) {
      const totalCancellations = issues.cancellationReasons.reduce((sum: number, reason: any) => sum + reason.count, 0);
      // Find the top reason by count (properly sorted)
      const topReason = issues.cancellationReasons.reduce((prev: any, current: any) => 
        (current.count > prev.count) ? current : prev
      );
      if (topReason && totalCancellations > 0 && (topReason.count / totalCancellations) > 0.3) {
        insights.push({
          type: 'critical',
          title: adminT('sales.insights.cancellationPattern.title') || 'Cancellation Pattern Detected',
          description: adminT('sales.insights.cancellationPattern.desc') || `${topReason.reason} accounts for ${((topReason.count / totalCancellations) * 100).toFixed(1)}% of cancellations`,
          action: adminT('sales.insights.cancellationPattern.action') || `Address ${topReason.reason} issues immediately`,
          icon: 'AlertTriangle'
        });
      }
    }

    // Conversion optimization (calculate from overview data with fallbacks)
    if (overview) {
      const orders = overview.totalOrders ?? overview.orders ?? 0;
      const views = overview.totalViews ?? overview.views ?? 0;
      let calculatedConversionRate = 0;
      
      if (orders > 0 && views > 0) {
        calculatedConversionRate = (orders / views) * 100;
      } else if (overview.conversionRate !== undefined) {
        calculatedConversionRate = overview.conversionRate;
      }
      
      if (calculatedConversionRate > 0 && calculatedConversionRate < 3) {
        insights.push({
          type: 'opportunity',
          title: adminT('sales.insights.lowConversion.title') || 'Conversion Rate Optimization',
          description: adminT('sales.insights.lowConversion.desc') || `${calculatedConversionRate.toFixed(1)}% conversion rate has room for improvement`,
          action: adminT('sales.insights.lowConversion.action') || 'A/B test checkout flow and product pages',
          icon: 'Target'
        });
      }
    }

    return insights.slice(0, 6); // Limit to 6 insights
  };

  const insights = generateInsights();
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

  // Custom tooltip for charts with multilingual support
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.dataKey === 'revenue' || entry.dataKey === 'value' ? 
                formatCurrency(entry.value) : 
                entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Simple pie chart component
  const SimpleLanguagePieChart = ({ data }: { data: any[] }) => (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="revenue"
            nameKey="languageName"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ 
              fontSize: '12px',
              direction: isRTL ? 'rtl' : 'ltr' 
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );

  // Simple bar chart for top products
  const SimpleProductsBarChart = ({ data }: { data: any[] }) => (
    <div className="h-64 w-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data.slice(0, 8)}>
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10 }}
            angle={isRTL ? 45 : -45}
            textAnchor={isRTL ? 'start' : 'end'}
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="revenue" 
            fill="#3B82F6"
            name={adminT('sales.metrics.revenue') || 'Revenue'}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );

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

  // Insight Card component for actionable recommendations
  const InsightCard = ({ insight }: { insight: any }) => {
    const getInsightTypeColor = (type: string) => {
      switch (type) {
        case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-950';
        case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
        case 'opportunity': return 'border-green-500 bg-green-50 dark:bg-green-950';
        default: return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      }
    };

    const getInsightIcon = (iconName: string) => {
      const iconMap = {
        'TrendingDown': <TrendingDown className="h-5 w-5" />,
        'AlertTriangle': <AlertTriangle className="h-5 w-5" />,
        'Globe': <Globe className="h-5 w-5" />,
        'Package': <Package className="h-5 w-5" />,
        'CreditCard': <CreditCard className="h-5 w-5" />,
        'Target': <Target className="h-5 w-5" />,
        'Lightbulb': <Lightbulb className="h-5 w-5" />
      };
      return iconMap[iconName as keyof typeof iconMap] || <Info className="h-5 w-5" />;
    };

    const getInsightIconColor = (type: string) => {
      switch (type) {
        case 'critical': return 'text-red-600';
        case 'warning': return 'text-yellow-600';
        case 'opportunity': return 'text-green-600';
        default: return 'text-blue-600';
      }
    };

    return (
      <Card className={`border-l-4 ${getInsightTypeColor(insight.type)} transition-all duration-200 hover:shadow-lg`}>
        <CardContent className="p-4">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-3`}>
            <div className={`mt-1 ${getInsightIconColor(insight.type)}`}>
              {getInsightIcon(insight.icon)}
            </div>
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {insight.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {insight.description}
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                💡 {insight.action}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5 lg:inline-grid">
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
            <TabsTrigger value="insights" className="text-xs sm:text-sm" data-testid="tab-insights">
              <Lightbulb className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {adminT('sales.tabs.insights') || 'Insights'}
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

              {/* Language Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <PieChart className="h-5 w-5" />
                    {adminT('sales.charts.languageDistribution') || 'Language Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {channelsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : channels?.languages && channels.languages.length > 0 ? (
                    <SimpleLanguagePieChart data={channels.languages} />
                  ) : (
                    <div className="flex justify-center py-8 text-gray-500">
                      <p>{adminT('sales.charts.noData') || 'No data available'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Top Products Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <BarChart3 className="h-5 w-5" />
                    {adminT('sales.charts.topProductsChart') || 'Top Products Chart'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : products?.topProducts && products.topProducts.length > 0 ? (
                    <SimpleProductsBarChart data={products.topProducts} />
                  ) : (
                    <div className="flex justify-center py-8 text-gray-500">
                      <p>{adminT('sales.charts.noData') || 'No data available'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {adminT('sales.insights.title') || 'Actionable Insights'}
                </h2>
                <p className="text-gray-600">
                  {adminT('sales.insights.subtitle') || 'Data-driven recommendations to improve your sales performance'}
                </p>
              </div>

              {(overviewLoading || channelsLoading || productsLoading || issuesLoading) ? (
                <Card data-testid="insights-loading">
                  <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {adminT('sales.insights.analyzing') || 'Analyzing Sales Data...'}
                    </h3>
                    <p className="text-gray-600">
                      {adminT('sales.insights.generatingRecommendations') || 'Generating personalized recommendations for your business'}
                    </p>
                  </CardContent>
                </Card>
              ) : insights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight, index) => (
                    <InsightCard key={index} insight={insight} />
                  ))}
                </div>
              ) : (
                <Card data-testid="insights-empty">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {adminT('sales.insights.allGood') || 'Everything Looks Great!'}
                    </h3>
                    <p className="text-gray-600">
                      {adminT('sales.insights.noIssues') || 'No major issues detected. Your sales performance is on track.'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Performance Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center ${isRTL ? 'gap-2 flex-row-reverse' : 'gap-2'}`}>
                    <Target className="h-5 w-5" />
                    {adminT('sales.insights.performanceTips') || 'Performance Tips'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        {adminT('sales.insights.tip1.title') || 'Optimize Conversion Rate'}
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {adminT('sales.insights.tip1.desc') || 'A/B test your checkout flow and product pages to increase conversions.'}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        {adminT('sales.insights.tip2.title') || 'Expand Payment Options'}
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {adminT('sales.insights.tip2.desc') || 'Adding more payment methods can reduce cart abandonment.'}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        {adminT('sales.insights.tip3.title') || 'Localize Marketing'}
                      </h4>
                      <p className="text-sm text-purple-800 dark:text-purple-200">
                        {adminT('sales.insights.tip3.desc') || 'Target campaigns in languages with high engagement rates.'}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                        {adminT('sales.insights.tip4.title') || 'Monitor Cancellations'}
                      </h4>
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        {adminT('sales.insights.tip4.desc') || 'Investigate high cancellation rates to identify checkout issues.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}