import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StoreSettingsForm } from "@/components/store-settings-form";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Settings, 
  Users, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  Truck, 
  CreditCard, 
  Save, 
  X, 
  Check, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Store
} from "lucide-react";

// Schemas for form validation
const productSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().min(1, "Описание обязательно"),
  price: z.string().min(1, "Цена обязательна"),
  categoryId: z.number().min(1, "Категория обязательна"),
  imageUrl: z.string().optional(),
  unit: z.enum(["100g", "100ml", "piece", "kg"]),
  isAvailable: z.boolean().default(true),
  discountPercentage: z.number().min(0).max(100).optional(),
});

const categorySchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().email("Некорректный email"),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  phone: z.string().optional(),
  role: z.enum(["admin", "worker", "customer"]),
});

const storeSettingsSchema = z.object({
  storeName: z.string().min(1, "Название магазина обязательно"),
  welcomeTitle: z.string().optional(),
  storeDescription: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerImage: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  workingHours: z.object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
  }).optional(),
  deliveryInfo: z.string().optional(),
  paymentInfo: z.string().optional(),
  aboutUsPhotos: z.array(z.string()).optional(),
  deliveryFee: z.string().optional(),
  minOrderAmount: z.string().optional(),
  discountBadgeText: z.string().optional(),
  showBannerImage: z.boolean().optional(),
  showTitleDescription: z.boolean().optional(),
  showInfoBlocks: z.boolean().optional(),
  showSpecialOffers: z.boolean().optional(),
  showCategoryMenu: z.boolean().optional(),
  weekStartDay: z.enum(["monday", "sunday"]).optional(),
  bottomBanner1Url: z.string().optional(),
  bottomBanner1Link: z.string().optional(),
  bottomBanner2Url: z.string().optional(),
  bottomBanner2Link: z.string().optional(),
  showBottomBanners: z.boolean().optional(),
  defaultItemsPerPage: z.number().optional(),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
});

// Image upload component
function ImageUpload({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Input
        type="text"
        placeholder="URL изображения"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm"
      />
      {value && (
        <div className="relative w-full max-w-[200px] h-[80px] border rounded overflow-hidden">
          <img 
            src={value} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { toast } = useToast();

  // Data fetching
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: storeSettings, isLoading: storeSettingsLoading } = useQuery({
    queryKey: ["/api/store-settings"],
  });

  // Store settings mutation
  const updateStoreSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/store-settings", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
      toast({
        title: "Успешно",
        description: "Настройки магазина обновлены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить настройки",
        variant: "destructive",
      });
    },
  });

  const handleStoreSettingsSubmit = (data: any) => {
    updateStoreSettingsMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Панель администратора</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Управление заказами</CardTitle>
              <CardDescription>Просмотр и управление заказами клиентов</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Управление заказами в разработке
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Управление товарами</CardTitle>
              <CardDescription>Добавление, редактирование и удаление товаров</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Управление товарами в разработке
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Управление категориями</CardTitle>
              <CardDescription>Создание и редактирование категорий товаров</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Управление категориями в разработке
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Управление пользователями</CardTitle>
              <CardDescription>Просмотр и управление пользователями системы</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Управление пользователями в разработке
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Настройки магазина</CardTitle>
              <CardDescription>Конфигурация основных настроек магазина</CardDescription>
            </CardHeader>
            <CardContent>
              {storeSettingsLoading ? (
                <div className="text-center py-8">Загрузка...</div>
              ) : (
                <StoreSettingsForm
                  storeSettings={storeSettings}
                  onSubmit={handleStoreSettingsSubmit}
                  isLoading={updateStoreSettingsMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}