import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, BarChart3, TrendingUp, ShoppingBag, Target, DollarSign, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCommonTranslation, useAdminTranslation } from "@/hooks/use-language";
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfYear, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

// Types
interface AnalyticsSummary {
  ordersByStatus: Record<string, number>;
  totalOrders: number;
  completedOrders: number;
  revenue: number;
  conversionRate: number;
  averageOrderValue: number;
}

interface TimeseriesData {
  bucketStart: string;
  orders: number;
  completedOrders: number;
  revenue: number;
}

// Period presets
const PERIOD_PRESETS = [
  { key: 'today', label: 'analytics.periods.today' },
  { key: 'yesterday', label: 'analytics.periods.yesterday' },
  { key: '7days', label: 'analytics.periods.last7Days' },
  { key: 'thisMonth', label: 'analytics.periods.thisMonth' },
  { key: 'thisYear', label: 'analytics.periods.thisYear' },
  { key: 'max', label: 'analytics.periods.allTime' },
  { key: 'custom', label: 'analytics.periods.custom' }
] as const;

export default function AdminAnalytics() {
  const { t } = useCommonTranslation();
  const adminT = useAdminTranslation();
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>();
  const [customToDate, setCustomToDate] = useState<Date | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Update date range based on selected period
  useEffect(() => {
    const today = new Date();
    let from: Date, to: Date;

    switch (selectedPeriod) {
      case 'today':
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        from = startOfDay(yesterday);
        to = endOfDay(yesterday);
        break;
      case '7days':
        from = startOfDay(subDays(today, 6));
        to = endOfDay(today);
        break;
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfDay(today);
        break;
      case 'thisYear':
        from = startOfYear(today);
        to = endOfDay(today);
        break;
      case 'max':
        from = new Date('2020-01-01');
        to = endOfDay(today);
        break;
      case 'custom':
        if (customFromDate && customToDate) {
          from = startOfDay(customFromDate);
          to = endOfDay(customToDate);
        } else {
          return; // Don't update if custom dates not set
        }
        break;
      default:
        from = startOfDay(today);
        to = endOfDay(today);
    }

    setDateRange({ from, to });
  }, [selectedPeriod, customFromDate, customToDate]);

  // Format dates for API
  const formatDateForAPI = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  // Analytics summary query
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery<AnalyticsSummary>({
    queryKey: [
      '/api/admin/analytics/summary',
      {
        from: formatDateForAPI(dateRange.from),
        to: formatDateForAPI(dateRange.to),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    ],
    queryFn: () => apiRequest("GET", `/api/admin/analytics/summary?from=${formatDateForAPI(dateRange.from)}&to=${formatDateForAPI(dateRange.to)}&tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`),
    enabled: Boolean(dateRange.from && dateRange.to)
  });

  // Timeseries data query
  const { data: timeseriesData, isLoading: timeseriesLoading } = useQuery<TimeseriesData[]>({
    queryKey: [
      '/api/admin/analytics/timeseries',
      {
        from: formatDateForAPI(dateRange.from),
        to: formatDateForAPI(dateRange.to),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        granularity: 'day'
      }
    ],
    queryFn: () => apiRequest("GET", `/api/admin/analytics/timeseries?from=${formatDateForAPI(dateRange.from)}&to=${formatDateForAPI(dateRange.to)}&tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}&granularity=day`),
    enabled: Boolean(dateRange.from && dateRange.to)
  });

  // Custom date picker handlers
  const handleCustomFromDate = (date: Date | undefined) => {
    setCustomFromDate(date);
    if (date && customToDate) {
      setSelectedPeriod('custom');
    }
  };

  const handleCustomToDate = (date: Date | undefined) => {
    setCustomToDate(date);
    if (date && customFromDate) {
      setSelectedPeriod('custom');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Format chart data for display
  const chartData = timeseriesData?.map(item => ({
    date: format(parseISO(item.bucketStart), 'dd/MM'),
    orders: item.orders,
    completedOrders: item.completedOrders,
    revenue: item.revenue
  })) || [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">{adminT('analytics.title')}</h2>
          <p className="text-muted-foreground">
            {adminT('analytics.description')}
          </p>
        </div>
        <BarChart3 className="h-8 w-8 text-primary" />
      </div>

      {/* Period Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {adminT('analytics.filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Period Presets */}
            <div className="flex flex-wrap gap-2">
              {PERIOD_PRESETS.map(preset => (
                <Button
                  key={preset.key}
                  variant={selectedPeriod === preset.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedPeriod(preset.key);
                    if (preset.key === 'custom') {
                      setShowCustomPicker(true);
                    }
                  }}
                  data-testid={`period-${preset.key}`}
                >
                  {adminT(preset.label)}
                </Button>
              ))}
            </div>

            {/* Custom Date Range */}
            {(selectedPeriod === 'custom' || showCustomPicker) && (
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[200px] justify-start text-left font-normal", 
                        !customFromDate && "text-muted-foreground")}
                      data-testid="date-from-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFromDate ? format(customFromDate, "PPP") : adminT('analytics.filters.selectFromDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customFromDate}
                      onSelect={handleCustomFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">—</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[200px] justify-start text-left font-normal",
                        !customToDate && "text-muted-foreground")}
                      data-testid="date-to-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customToDate ? format(customToDate, "PPP") : adminT('analytics.filters.selectToDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customToDate}
                      onSelect={handleCustomToDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Selected Period Display */}
          <div className="mt-3 text-sm text-muted-foreground">
            {adminT('analytics.filters.selectedPeriod')}: {format(dateRange.from, 'PPP')} — {format(dateRange.to, 'PPP')}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {summaryLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-24 animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded w-32 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {summaryError && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              {t('status.error')}: {(summaryError as any)?.message || adminT('analytics.error.failedToLoad')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {summaryData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Orders */}
            <Card data-testid="kpi-total-orders">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{adminT('analytics.kpis.totalOrders')}</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.totalOrders.toLocaleString()}</div>
                <div className="space-y-1 mt-2">
                  {Object.entries(summaryData.ordersByStatus)
                    .sort(([statusA], [statusB]) => {
                      if (statusA === 'completed') return -1;
                      if (statusB === 'completed') return 1;
                      return statusA.localeCompare(statusB);
                    })
                    .map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-xs">
                        <Badge className={cn("text-xs", getStatusColor(status))}>
                          {adminT(`orders.status.${status}` as any)}
                        </Badge>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card data-testid="kpi-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{adminT('analytics.kpis.revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.revenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {adminT('analytics.kpis.revenueDescription')}
                </p>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card data-testid="kpi-conversion-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{adminT('analytics.kpis.conversionRate')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {summaryData.completedOrders} {adminT('analytics.kpis.of')} {summaryData.totalOrders} {adminT('analytics.kpis.ordersCompleted')}
                </p>
              </CardContent>
            </Card>

            {/* Average Order Value */}
            <Card data-testid="kpi-average-order-value">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{adminT('analytics.kpis.averageOrderValue')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryData.averageOrderValue)}</div>
                <p className="text-xs text-muted-foreground">
                  {adminT('analytics.kpis.averageOrderDescription')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart */}
          <Card data-testid="sales-chart">
            <CardHeader>
              <CardTitle>{adminT('analytics.chart.title')}</CardTitle>
              <CardDescription>
                {adminT('analytics.chart.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {timeseriesLoading ? (
                <div className="h-80 bg-muted rounded animate-pulse" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#ccc' }}
                    />
                    <YAxis 
                      yAxisId="orders"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#ccc' }}
                    />
                    <YAxis 
                      yAxisId="revenue"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#ccc' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => adminT('analytics.chart.date') + ': ' + value}
                      formatter={(value, name) => {
                        if (name === 'revenue') {
                          return [formatCurrency(value as number), adminT('analytics.chart.revenue')];
                        }
                        return [value, name === 'orders' ? adminT('analytics.chart.totalOrders') : adminT('analytics.chart.completedOrders')];
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="orders"
                      dataKey="orders" 
                      fill="#3b82f6" 
                      name={adminT('analytics.chart.totalOrders')}
                      opacity={0.8}
                    />
                    <Bar 
                      yAxisId="orders"
                      dataKey="completedOrders" 
                      fill="#22c55e" 
                      name={adminT('analytics.chart.completedOrders')}
                    />
                    <Line 
                      yAxisId="revenue"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      name={adminT('analytics.chart.revenue')}
                      dot={{ fill: '#f59e0b', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  {adminT('analytics.chart.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}