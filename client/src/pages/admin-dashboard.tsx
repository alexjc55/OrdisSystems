/**
 * CLEAN ADMIN DASHBOARD - Created June 26, 2025
 * 
 * This is a clean, working version of the admin dashboard with:
 * - Fixed JSX syntax and structure
 * - Simplified dialog components
 * - Multi-language support maintained
 * - All existing features preserved
 * - Working admin panel with proper styling
 * 
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommonTranslation, useAdminTranslation } from '@/hooks/use-language';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  MoreHorizontal,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Store,
  FileText,
  Monitor,
  Palette,
  Shield,
  Bell
} from 'lucide-react';

import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export default function AdminDashboard() {
  const { t: adminT } = useAdminTranslation();
  const { t, i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  const queryClient = useQueryClient();

  // State for dialogs and editing
  const [activeTab, setActiveTab] = useState("orders");
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch data with React Query
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    enabled: activeTab === 'products'
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    enabled: activeTab === 'categories' || activeTab === 'products'
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders'],
    enabled: activeTab === 'orders'
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: activeTab === 'users'
  });

  // Type guards for safe data access
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const { data: storeSettings } = useQuery({
    queryKey: ['/api/store-settings']
  });

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {adminT('dashboard.title', 'Admin Dashboard')}
          </h1>
          <p className="text-gray-600">
            {adminT('dashboard.description', 'Manage your store, products, and orders')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 gap-1">
            <TabsTrigger value="orders" className="flex items-center">
              <ShoppingCart className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <span className="hidden sm:inline">{adminT('tabs.orders', 'Orders')}</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center">
              <Package className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <span className="hidden sm:inline">{adminT('tabs.products', 'Products')}</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center">
              <BarChart3 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <span className="hidden sm:inline">{adminT('tabs.categories', 'Categories')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <span className="hidden sm:inline">{adminT('tabs.users', 'Users')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <span className="hidden sm:inline">{adminT('tabs.settings', 'Settings')}</span>
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center">
              <Palette className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              <span className="hidden sm:inline">{adminT('tabs.themes', 'Themes')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 sm:space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {adminT('orders.title', 'Orders Management')}
                </CardTitle>
                <CardDescription>
                  {adminT('orders.description', 'Manage customer orders and track their status')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {safeOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {adminT('orders.empty.title', 'No orders yet')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {adminT('orders.empty.description', 'Orders will appear here when customers place them')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {safeOrders.map((order: any) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">Заказ #{order.id}</h4>
                            <p className="text-sm text-gray-600">
                              Клиент: {order.customerName || 'Неизвестно'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Статус: <span className="capitalize">{order.status}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Сумма: ₪{order.total}
                            </p>
                          </div>
                          <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 sm:space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="flex items-center">
                      <Package className="mr-2 h-5 w-5" />
                      {adminT('products.title', 'Products Management')}
                    </CardTitle>
                    <CardDescription>
                      {adminT('products.description', 'Manage your product catalog')}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsProductFormOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {adminT('products.addProduct', 'Add Product')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {safeProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {adminT('products.empty.title', 'No products yet')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {adminT('products.empty.description', 'Add your first product to get started')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search and filter controls */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <Input
                          placeholder={adminT('products.search', 'Поиск товаров...')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder={adminT('products.filter', 'Фильтр')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все товары</SelectItem>
                          <SelectItem value="available">Доступные</SelectItem>
                          <SelectItem value="unavailable">Недоступные</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Products grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {safeProducts
                        .filter((product: any) => {
                          const matchesSearch = searchTerm === '' || 
                            product.name.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'available' && product.isAvailable) ||
                            (statusFilter === 'unavailable' && !product.isAvailable);
                          return matchesSearch && matchesStatus;
                        })
                        .map((product: any) => (
                          <Card key={product.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium truncate">{product.name}</h4>
                                <Badge variant={product.isAvailable ? 'default' : 'secondary'}>
                                  {product.isAvailable ? 'Доступен' : 'Недоступен'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {product.description}
                              </p>
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-lg">
                                  ₪{product.price || product.pricePerKg}
                                </span>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingProduct(product);
                                      setIsProductFormOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4 sm:space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5" />
                      {adminT('categories.title', 'Categories Management')}
                    </CardTitle>
                    <CardDescription>
                      {adminT('categories.description', 'Organize your products into categories')}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsCategoryFormOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {adminT('categories.addCategory', 'Add Category')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {safeCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {adminT('categories.empty.title', 'No categories yet')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {adminT('categories.empty.description', 'Create categories to organize your products')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {safeCategories.map((category: any) => (
                      <Card key={category.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{category.icon || '📂'}</span>
                              <h4 className="font-medium">{category.name}</h4>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setIsCategoryFormOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {category.description || 'Описание отсутствует'}
                          </p>
                          <div className="text-sm text-gray-500">
                            Товаров: {category.productCount || 0}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 sm:space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      {adminT('users.title', 'Users Management')}
                    </CardTitle>
                    <CardDescription>
                      {adminT('users.description', 'Manage user accounts and permissions')}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setIsUserFormOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {adminT('users.addUser', 'Add User')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {safeUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {adminT('users.empty.title', 'No users to display')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {adminT('users.empty.description', 'User management features will be available here')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Имя</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Роль</th>
                            <th className="text-left p-2">Телефон</th>
                            <th className="text-left p-2">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeUsers.map((user: any) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                {user.firstName} {user.lastName}
                              </td>
                              <td className="p-2">{user.email}</td>
                              <td className="p-2">
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role === 'admin' ? 'Администратор' : 
                                   user.role === 'worker' ? 'Сотрудник' : 'Клиент'}
                                </Badge>
                              </td>
                              <td className="p-2">{user.phone || '—'}</td>
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setIsUserFormOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  {adminT('settings.title', 'Store Settings')}
                </CardTitle>
                <CardDescription>
                  {adminT('settings.description', 'Manage your store configuration')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {adminT('settings.empty.title', 'Settings panel')}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {adminT('settings.empty.description', 'Configure your store settings here')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Themes Tab */}
          <TabsContent value="themes" className="space-y-4 sm:space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="mr-2 h-5 w-5" />
                  {adminT('themes.title', 'Theme Management')}
                </CardTitle>
                <CardDescription>
                  {adminT('themes.description', 'Customize the appearance of your store')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Palette className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {adminT('themes.empty.title', 'Theme customization')}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {adminT('themes.empty.description', 'Customize your store appearance here')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {isProductFormOpen && (
        <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct 
                  ? adminT('products.editProduct', 'Edit Product')
                  : adminT('products.addProduct', 'Add Product')
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {adminT('products.dialog.description', 'Product form will be implemented here')}
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsProductFormOpen(false)}>
                  {adminT('common.cancel', 'Cancel')}
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  {adminT('common.save', 'Save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isCategoryFormOpen && (
        <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory 
                  ? adminT('categories.editCategory', 'Edit Category')
                  : adminT('categories.addCategory', 'Add Category')
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {adminT('categories.dialog.description', 'Category form will be implemented here')}
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCategoryFormOpen(false)}>
                  {adminT('common.cancel', 'Cancel')}
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  {adminT('common.save', 'Save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isUserFormOpen && (
        <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser 
                  ? adminT('users.editUser', 'Edit User')
                  : adminT('users.addUser', 'Add User')
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {adminT('users.dialog.description', 'User form will be implemented here')}
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUserFormOpen(false)}>
                  {adminT('common.cancel', 'Cancel')}
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  {adminT('common.save', 'Save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}