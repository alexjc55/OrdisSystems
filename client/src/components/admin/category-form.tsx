import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAdminTranslation, useCommonTranslation } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { X, Save } from "lucide-react";

interface CategoryFormProps {
  onClose: () => void;
}

export default function CategoryForm({ onClose }: CategoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t: adminT } = useAdminTranslation();
  const { t: commonT } = useCommonTranslation();
  const [categoryImage, setCategoryImage] = useState('');

  const { data: storeSettings } = useQuery({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000,
  });
  const defaultLang = (storeSettings as any)?.defaultLanguage || 'ru';
  const nameField = defaultLang === 'ru' ? 'name' : `name_${defaultLang}`;

  const categorySchema = z.object({
    name: z.string().min(1, adminT('categories.categoryNameRequired')).max(255, adminT('categories.categoryNameTooLong')),
    description: z.string().optional(),
    icon: z.string().optional(),
    sortOrder: z.number().default(0),
  });

  type CategoryFormData = z.infer<typeof categorySchema>;

  const commonIcons = [
    { emoji: "🐟", name: "Рыба" },
    { emoji: "🥩", name: "Мясо" },
    { emoji: "🥕", name: "Овощи" },
    { emoji: "🍎", name: "Фрукты" },
    { emoji: "🍞", name: "Хлебобулочные" },
    { emoji: "🥛", name: "Молочные" },
    { emoji: "🍽️", name: "Готовые блюда" },
    { emoji: "🥗", name: "Салаты" },
    { emoji: "🧀", name: "Сыры" },
    { emoji: "🍖", name: "Деликатесы" },
    { emoji: "🥜", name: "Орехи" },
    { emoji: "🍯", name: "Мед" },
  ];

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      sortOrder: 0,
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const categoryData: any = {
        ...data,
        image: categoryImage || null,
        isActive: true,
      };
      if (defaultLang !== 'ru') {
        categoryData[nameField] = data.name;
        delete categoryData.name;
      }
      await apiRequest("POST", "/api/categories", categoryData);
    },
    onSuccess: () => {
      toast({
        title: adminT('categories.categoryCreated'),
        description: adminT('categories.categoryCreatedDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: commonT('auth.unauthorizedMessage'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: commonT('errors.general'),
        description: adminT('categories.createCategoryError'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Добавить Категорию
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Добавьте новую категорию товаров в каталог магазина
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Название категории{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({defaultLang.toUpperCase()}) *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Рыба" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание (необязательно)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Краткое описание категории..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Иконка (необязательно)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Выберите эмодзи или введите символ"
                      {...field}
                    />
                  </FormControl>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Популярные иконки:</p>
                    <div className="grid grid-cols-6 gap-2">
                      {commonIcons.map((icon) => (
                        <Button
                          key={icon.emoji}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 text-lg"
                          onClick={() => field.onChange(icon.emoji)}
                          title={icon.name}
                        >
                          {icon.emoji}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category photo for photo_grid display mode */}
            <div className="space-y-2">
              <FormLabel>Фото категории (для режима «карточки с фото»)</FormLabel>
              <ImageUpload
                value={categoryImage}
                onChange={(url: string) => setCategoryImage(url)}
              />
              <p className="text-xs text-gray-500">
                Рекомендуемый размер: 400×300 пикселей (соотношение 4:3). Макс. 5 МБ.
              </p>
            </div>

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Порядок сортировки</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2 pt-4">
              <Button
                type="submit"
                disabled={createCategoryMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {createCategoryMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Создание...
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Создать Категорию
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
