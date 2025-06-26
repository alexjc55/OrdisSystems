/**
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 * 
 * Правила для разработчика:
 * - НЕ изменять существующий дизайн и компоновку интерфейса
 * - НЕ заменять на "более удобные" решения без запроса
 * - НЕ менять стили, цвета, расположение элементов
 * - ТОЛЬКО добавлять новый функционал или исправлять то, что конкретно просят
 * - Сохранять все существующие UI паттерны и структуру
 */

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminTranslation, useCommonTranslation } from "@/lib/i18n-admin";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Icons
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  Store, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Phone, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  ShieldCheck,
  Palette,
  FileText,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react";

export default function AdminDashboard() {
  const { t: adminT } = useAdminTranslation();
  const { i18n } = useCommonTranslation();
  const isRTL = i18n.language === 'he';
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Mock data queries
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => Promise.resolve([])
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => Promise.resolve([])
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => Promise.resolve([])
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => Promise.resolve([])
  });

  const { data: storeSettings = {} } = useQuery({
    queryKey: ['/api/store-settings'],
    queryFn: () => Promise.resolve({})
  });

  // Helper function to check permissions
  const hasPermission = (permission: string) => {
    return true; // Simplified for now
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">
            {adminT('dashboard.title', 'Admin Dashboard')}
          </h1>
        </div>
        
        <nav className="mt-6">
          <div className="px-3">
            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === "products" 
                  ? "bg-orange-100 text-orange-900" 
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Package className="mr-3 h-5 w-5" />
              {adminT('navigation.products', 'Products')}
            </button>
            
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mt-1 ${
                activeTab === "orders" 
                  ? "bg-orange-100 text-orange-900" 
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              {adminT('navigation.orders', 'Orders')}
            </button>
            
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mt-1 ${
                activeTab === "users" 
                  ? "bg-orange-100 text-orange-900" 
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Users className="mr-3 h-5 w-5" />
              {adminT('navigation.users', 'Users')}
            </button>
            
            {hasPermission("canManageSettings") && (
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md mt-1 ${
                  activeTab === "settings" 
                    ? "bg-orange-100 text-orange-900" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Settings className="mr-3 h-5 w-5" />
                {adminT('navigation.settings', 'Settings')}
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTab === "products" && adminT('products.title', 'Products')}
              {activeTab === "orders" && adminT('orders.title', 'Orders')}
              {activeTab === "users" && adminT('users.title', 'Users')}
              {activeTab === "settings" && adminT('settings.title', 'Settings')}
            </h2>
            
            {activeTab === "products" && (
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductFormOpen(true);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                {adminT('products.addProduct', 'Add Product')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {adminT('products.empty.title', 'No products yet')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {adminT('products.empty.description', 'Start by adding your first product')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {adminT('orders.empty.title', 'No orders yet')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {adminT('orders.empty.description', 'Orders will appear here when customers place them')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {adminT('users.empty.title', 'No users yet')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {adminT('users.empty.description', 'User accounts will appear here')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && hasPermission("canManageSettings") && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    {adminT('settings.title', 'Store Settings')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('settings.description', 'Manage your store configuration')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
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
            </div>
          )}
        </div>
      </div>

      {/* Product Form Dialog */}
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
    </div>
  );
}