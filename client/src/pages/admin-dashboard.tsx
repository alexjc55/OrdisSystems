import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  Utensils, 
  Search, 
  Eye,
  Grid3X3,
  Columns
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

// Custom Switch component
function CustomSwitch({ checked, onChange, bgColor = "bg-blue-500" }: { checked: boolean; onChange: (checked: boolean) => void; bgColor?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? bgColor : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function AdminDashboard() {
  const { currentLanguage } = useLanguage();
  const adminT = (key: string, fallback?: string) => fallback || key;
  const isRTL = currentLanguage === 'he';

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [ordersViewMode, setOrdersViewMode] = useState<"table" | "kanban">("table");

  // Load data
  const { data: products = { data: [] }, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/admin/products", { search: searchQuery, category: selectedCategoryFilter }],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: ordersResponse = { data: [], total: 0 }, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/admin/orders", { search: searchQuery }],
  });

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "border-yellow-300 bg-yellow-50",
      confirmed: "border-blue-300 bg-blue-50", 
      preparing: "border-orange-300 bg-orange-50",
      ready: "border-green-300 bg-green-50",
      delivered: "border-gray-300 bg-gray-50",
      cancelled: "border-red-300 bg-red-50"
    };
    return colors[status as keyof typeof colors] || "border-gray-300 bg-gray-50";
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'font-hebrew' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {adminT('dashboard.title') || 'לוח בקרה'}
          </h1>
          <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {adminT('dashboard.description') || 'ניהול המסעדה שלך'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TabsTrigger value="overview">{adminT('tabs.overview') || 'סקירה'}</TabsTrigger>
            <TabsTrigger value="products">{adminT('tabs.products') || 'מוצרים'}</TabsTrigger>
            <TabsTrigger value="orders">{adminT('tabs.orders') || 'הזמנות'}</TabsTrigger>
            <TabsTrigger value="categories">{adminT('tabs.categories') || 'קטגוריות'}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className="text-sm font-medium">{adminT('overview.totalProducts') || 'סה״כ מוצרים'}</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(products as any)?.data?.length || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className="text-sm font-medium">{adminT('overview.totalOrders') || 'סה״כ הזמנות'}</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(ordersResponse as any)?.total || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className="text-sm font-medium">{adminT('overview.totalCategories') || 'סה״כ קטגוריות'}</CardTitle>
                  <Utensils className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Array.isArray(categories) ? categories.length : 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CardTitle className="text-sm font-medium">{adminT('overview.activeOrders') || 'הזמנות פעילות'}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(ordersResponse as any)?.data?.filter((order: any) => !['delivered', 'cancelled'].includes(order.status)).length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab with RTL support */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  {adminT('products.title') || 'ניהול מוצרים'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  <div className="relative flex-1">
                    <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                      placeholder={adminT('products.searchPlaceholder') || 'חפש מוצרים...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
                    />
                  </div>
                  <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={adminT('products.allCategories') || 'כל הקטגוריות'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{adminT('products.allCategories') || 'כל הקטגוריות'}</SelectItem>
                      {Array.isArray(categories) && categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (products as any)?.data?.length > 0 ? (
                  <div className="border rounded-lg bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isRTL ? (
                            <>
                              {/* RTL: Status first, then Price, Category, Product Name */}
                              <TableHead className="text-right">{adminT('products.status') || 'סטטוס'}</TableHead>
                              <TableHead className="text-right">{adminT('products.price') || 'מחיר'}</TableHead>
                              <TableHead className="text-right">{adminT('products.category') || 'קטגוריה'}</TableHead>
                              <TableHead className="text-right">{adminT('products.name') || 'שם המוצר'}</TableHead>
                            </>
                          ) : (
                            <>
                              {/* LTR: Product Name first, then Category, Price, Status */}
                              <TableHead className="text-left">{adminT('products.name') || 'שם המוצר'}</TableHead>
                              <TableHead className="text-left">{adminT('products.category') || 'קטגוריה'}</TableHead>
                              <TableHead className="text-left">{adminT('products.price') || 'מחיר'}</TableHead>
                              <TableHead className="text-left">{adminT('products.status') || 'סטטוס'}</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(products as any).data.map((product: any) => (
                          <TableRow key={product.id}>
                            {isRTL ? (
                              <>
                                {/* RTL order: Status, Price, Category, Name */}
                                <TableCell className="text-right">
                                  <CustomSwitch
                                    checked={product.isAvailable}
                                    onChange={() => {}}
                                    bgColor="bg-green-500"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(product.price || product.pricePerKg)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline">{product.category?.name}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {product.name}
                                </TableCell>
                              </>
                            ) : (
                              <>
                                {/* LTR order: Name, Category, Price, Status */}
                                <TableCell className="text-left font-medium">
                                  {product.name}
                                </TableCell>
                                <TableCell className="text-left">
                                  <Badge variant="outline">{product.category?.name}</Badge>
                                </TableCell>
                                <TableCell className="text-left">
                                  {formatCurrency(product.price || product.pricePerKg)}
                                </TableCell>
                                <TableCell className="text-left">
                                  <CustomSwitch
                                    checked={product.isAvailable}
                                    onChange={() => {}}
                                    bgColor="bg-green-500"
                                  />
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {adminT('products.noProducts') || 'אין מוצרים'}
                    </h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab with RTL support */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  {adminT('orders.title') || 'ניהול הזמנות'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex flex-col sm:flex-row gap-4 mb-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <Button
                      variant={ordersViewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setOrdersViewMode("table")}
                      className="text-xs px-3 py-1 h-8"
                    >
                      <Grid3X3 className="h-3 w-3 mr-1" />
                      {adminT('orders.tableView') || 'תצוגת טבלה'}
                    </Button>
                    <Button
                      variant={ordersViewMode === "kanban" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setOrdersViewMode("kanban")}
                      className="text-xs px-3 py-1 h-8"
                    >
                      <Columns className="h-3 w-3 mr-1" />
                      {adminT('orders.kanbanView') || 'תצוגת קנבן'}
                    </Button>
                  </div>
                  
                  <div className="relative flex-1">
                    <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                      placeholder={adminT('orders.searchPlaceholder') || 'חפש הזמנות...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
                    />
                  </div>
                </div>

                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (ordersResponse as any)?.data?.length > 0 ? (
                  <div className="border rounded-lg bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isRTL ? (
                            <>
                              {/* RTL: Actions, Date, Total, Status, Customer, Order# */}
                              <TableHead className="text-right w-12">{adminT('orders.actions') || 'פעולות'}</TableHead>
                              <TableHead className="text-right hidden md:table-cell w-32">{adminT('orders.date') || 'תאריך'}</TableHead>
                              <TableHead className="text-right w-20">{adminT('orders.total') || 'סכום'}</TableHead>
                              <TableHead className="text-right hidden sm:table-cell w-24">{adminT('orders.status') || 'סטטוס'}</TableHead>
                              <TableHead className="text-right">{adminT('orders.customer') || 'לקוח'}</TableHead>
                              <TableHead className="text-right w-12">№</TableHead>
                            </>
                          ) : (
                            <>
                              {/* LTR: Order#, Customer, Status, Total, Date, Actions */}
                              <TableHead className="text-left w-12">№</TableHead>
                              <TableHead className="text-left">{adminT('orders.customer') || 'לקוח'}</TableHead>
                              <TableHead className="text-left hidden sm:table-cell w-24">{adminT('orders.status') || 'סטטוס'}</TableHead>
                              <TableHead className="text-left w-20">{adminT('orders.total') || 'סכום'}</TableHead>
                              <TableHead className="text-left hidden md:table-cell w-32">{adminT('orders.date') || 'תאריך'}</TableHead>
                              <TableHead className="text-left w-12">{adminT('orders.actions') || 'פעולות'}</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(ordersResponse as any).data.map((order: any) => (
                          <TableRow key={order.id} className="hover:bg-gray-50">
                            {isRTL ? (
                              <>
                                {/* RTL order: Actions, Date, Total, Status, Customer, Order# */}
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm" className="h-8 px-2">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                                <TableCell className="text-right hidden md:table-cell">
                                  <div className="text-xs">
                                    {new Date(order.createdAt).toLocaleDateString('he-IL')}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(order.totalAmount)}
                                </TableCell>
                                <TableCell className="text-right hidden sm:table-cell">
                                  <Badge className={getStatusColor(order.status)}>
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="font-medium">
                                    {order.user?.firstName && order.user?.lastName 
                                      ? `${order.user.firstName} ${order.user.lastName}`
                                      : order.user?.email || "—"
                                    }
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-orange-600">
                                  #{order.id}
                                </TableCell>
                              </>
                            ) : (
                              <>
                                {/* LTR order: Order#, Customer, Status, Total, Date, Actions */}
                                <TableCell className="text-left font-bold text-orange-600">
                                  #{order.id}
                                </TableCell>
                                <TableCell className="text-left">
                                  <div className="font-medium">
                                    {order.user?.firstName && order.user?.lastName 
                                      ? `${order.user.firstName} ${order.user.lastName}`
                                      : order.user?.email || "—"
                                    }
                                  </div>
                                </TableCell>
                                <TableCell className="text-left hidden sm:table-cell">
                                  <Badge className={getStatusColor(order.status)}>
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-left">
                                  {formatCurrency(order.totalAmount)}
                                </TableCell>
                                <TableCell className="text-left hidden md:table-cell">
                                  <div className="text-xs">
                                    {new Date(order.createdAt).toLocaleDateString('he-IL')}
                                  </div>
                                </TableCell>
                                <TableCell className="text-left">
                                  <Button variant="outline" size="sm" className="h-8 px-2">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {adminT('orders.noOrders') || 'אין הזמנות'}
                    </h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  {adminT('categories.title') || 'ניהול קטגוריות'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(categories) && categories.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category: any) => (
                      <Card key={category.id}>
                        <CardContent className="p-4">
                          <h3 className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                            {category.name}
                          </h3>
                          <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {category.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {adminT('categories.noCategories') || 'אין קטגוריות'}
                    </h3>
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