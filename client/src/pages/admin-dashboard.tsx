/**
 * ВАЖНО: НЕ ИЗМЕНЯТЬ ДИЗАЙН АДМИН-ПАНЕЛИ БЕЗ ЯВНОГО ЗАПРОСА!
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAdminTranslation } from "@/hooks/use-language";
import { LANGUAGES } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CustomSelect, CustomSelectItem } from "@/components/ui/custom-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, getUnitLabel, formatDeliveryTimeRange, type ProductUnit } from "@/lib/currency";
import { insertStoreSettingsSchema, type StoreSettings } from "@shared/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import ThemeManager from "@/components/admin/theme-manager";
import { 
  Package, 
  Plus, 
  Edit2, 
  Edit,
  Trash2, 
  Users, 
  ShoppingCart, 
  Settings, 
  Eye, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  ChevronDown,
  ChevronUp,
  Store,
  Palette,
  Calendar,
  Truck,
  CreditCard,
  MoreHorizontal,
  Save,
  Upload,
  X
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useAdminTranslation();
  const queryClient = useQueryClient();

  // State for collapsible sections
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  const [isWorkingHoursOpen, setIsWorkingHoursOpen] = useState(false);

  // Dummy component with working CustomSelect example
  function OrderStatusSelect() {
    const [status, setStatus] = useState("pending");
    
    return (
      <CustomSelect
        value={status}
        onValueChange={(value: string) => setStatus(value)}
        className="w-32"
      >
        <CustomSelectItem value="pending">Ожидает</CustomSelectItem>
        <CustomSelectItem value="confirmed">Подтвержден</CustomSelectItem>
        <CustomSelectItem value="preparing">Готовится</CustomSelectItem>
        <CustomSelectItem value="ready">Готов</CustomSelectItem>
        <CustomSelectItem value="delivered">Доставлен</CustomSelectItem>
        <CustomSelectItem value="cancelled">Отменен</CustomSelectItem>
      </CustomSelect>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Админ-панель</h1>
            <p className="text-gray-600">Управление магазином</p>
          </div>
          <LanguageSwitcher />
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
            <TabsTrigger value="themes">Темы</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Управление заказами</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span>Пример выпадающего списка:</span>
                    <OrderStatusSelect />
                  </div>
                  <p className="text-gray-600">
                    Админ-панель временно упрощена для демонстрации работающих CustomSelect компонентов.
                    Полная функциональность будет восстановлена после исправления всех Select компонентов.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Управление товарами</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Раздел товаров (будет восстановлен)</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Раздел пользователей (будет восстановлен)</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Настройки магазина</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Настройки магазина (будут восстановлены)</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes">
            <Card>
              <CardHeader>
                <CardTitle>Управление темами</CardTitle>
              </CardHeader>
              <CardContent>
                <ThemeManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}