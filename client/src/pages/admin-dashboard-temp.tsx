import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Package2, 
  Users2, 
  ShoppingCart, 
  Plus, 
  Edit, 
  Edit2, 
  Trash2, 
  Users, 
  ShoppingCart as Cart,
  Utensils,
  Save,
  Search,
  Filter,
  Menu,
  ChevronUp,
  ChevronDown,
  Store,
  Upload,
  Clock,
  CreditCard,
  Truck,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Columns,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Eye,
  X,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import type { 
  Product, 
  Category, 
  Order, 
  User,
  OrderWithItems 
} from "@shared/schema";

// Basic component structure with StoreSettingsForm
function StoreSettingsForm({ storeSettings, onSubmit, isLoading }: {
  storeSettings: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  // State for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({
    basicInfo: false,
    description: false,
    visual: false,
    schedule: false,
    delivery: false,
    display: false,
    tracking: false,
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-8">
      {/* Basic Info Section */}
      <div className="space-y-6 border rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('basicInfo')}
          className="flex items-center justify-between w-full pb-2 border-b hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Основная информация</h3>
          </div>
          {collapsedSections.basicInfo ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {!collapsedSections.basicInfo && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Настройки основной информации о магазине
            </p>
          </div>
        )}
      </div>

      {/* Description Section */}
      <div className="space-y-6 border rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('description')}
          className="flex items-center justify-between w-full pb-2 border-b hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Описание и контакты</h3>
          </div>
          {collapsedSections.description ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {!collapsedSections.description && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Описание магазина и контактная информация
            </p>
          </div>
        )}
      </div>

      {/* Visual Section */}
      <div className="space-y-6 border rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('visual')}
          className="flex items-center justify-between w-full pb-2 border-b hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Визуальное оформление</h3>
          </div>
          {collapsedSections.visual ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {!collapsedSections.visual && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Настройки логотипа и визуального оформления
            </p>
          </div>
        )}
      </div>

      {/* Schedule Section */}
      <div className="space-y-6 border rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('schedule')}
          className="flex items-center justify-between w-full pb-2 border-b hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Часы работы</h3>
          </div>
          {collapsedSections.schedule ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {!collapsedSections.schedule && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Настройки рабочего времени магазина
            </p>
          </div>
        )}
      </div>

      {/* Delivery Section */}
      <div className="space-y-6 border rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('delivery')}
          className="flex items-center justify-between w-full pb-2 border-b hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Доставка и оплата</h3>
          </div>
          {collapsedSections.delivery ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {!collapsedSections.delivery && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Настройки доставки и способов оплаты
            </p>
          </div>
        )}
      </div>

      {/* Display Section */}
      <div className="space-y-6 border rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('display')}
          className="flex items-center justify-between w-full pb-2 border-b hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Настройки отображения</h3>
          </div>
          {collapsedSections.display ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {!collapsedSections.display && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Настройки отображения элементов в админ панели
            </p>
          </div>
        )}
      </div>

      {/* Tracking Section */}
      <div className="space-y-6 border rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('tracking')}
          className="flex items-center justify-between w-full pb-2 border-b hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">HTML/JS код отслеживания</h3>
          </div>
          {collapsedSections.tracking ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {!collapsedSections.tracking && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Код для Facebook Pixel, Google Analytics и других счетчиков
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Админ панель</h1>
      <StoreSettingsForm 
        storeSettings={{}}
        onSubmit={() => {}}
        isLoading={false}
      />
    </div>
  );
}