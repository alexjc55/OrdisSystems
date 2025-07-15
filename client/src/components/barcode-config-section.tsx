import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Barcode Configuration Section Component
export function BarcodeConfigSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for current barcode configuration
  const { data: barcodeConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/barcode/config'],
    queryFn: () => apiRequest('GET', '/api/barcode/config'),
  });

  // Form for barcode configuration
  const barcodeForm = useForm({
    resolver: zodResolver(z.object({
      enabled: z.boolean(),
      productCodeStart: z.number().min(1).max(20),
      productCodeEnd: z.number().min(1).max(20),
      weightStart: z.number().min(1).max(20),
      weightEnd: z.number().min(1).max(20),
      weightUnit: z.enum(['g', 'kg'])
    })),
    defaultValues: {
      enabled: false,
      productCodeStart: 1,
      productCodeEnd: 5,
      weightStart: 6,
      weightEnd: 10,
      weightUnit: 'g' as const
    }
  });

  // Update form when config loads
  React.useEffect(() => {
    if (barcodeConfig) {
      barcodeForm.reset({
        enabled: barcodeConfig.enabled || false,
        productCodeStart: barcodeConfig.productCodeStart || 1,
        productCodeEnd: barcodeConfig.productCodeEnd || 5,
        weightStart: barcodeConfig.weightStart || 6,
        weightEnd: barcodeConfig.weightEnd || 10,
        weightUnit: barcodeConfig.weightUnit || 'g'
      });
    }
  }, [barcodeConfig, barcodeForm]);

  // Mutation to update barcode configuration
  const updateBarcodeConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', '/api/admin/barcode/config', data),
    onSuccess: () => {
      toast({
        title: "Конфигурация штрих-кодов обновлена",
        description: "Настройки системы штрих-кодов успешно сохранены",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/barcode/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить конфигурацию штрих-кодов",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmitBarcodeConfig = (data: any) => {
    // Validate that start positions are less than end positions
    if (data.productCodeStart >= data.productCodeEnd) {
      toast({
        title: "Ошибка валидации",
        description: "Начальная позиция кода товара должна быть меньше конечной",
        variant: "destructive",
      });
      return;
    }
    
    if (data.weightStart >= data.weightEnd) {
      toast({
        title: "Ошибка валидации", 
        description: "Начальная позиция веса должна быть меньше конечной",
        variant: "destructive",
      });
      return;
    }

    updateBarcodeConfigMutation.mutate(data);
  };

  // Test barcode parsing
  const [testBarcode, setTestBarcode] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  
  const testBarcodeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      try {
        const response = await fetch('/api/barcode/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ barcode }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Ошибка парсинга штрих-кода');
        }
        
        return result;
      } catch (error: any) {
        throw new Error(error.message || 'Ошибка парсинга штрих-кода');
      }
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error: any) => {
      setTestResult({ error: error.message || 'Ошибка парсинга штрих-кода' });
    }
  });

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Загрузка конфигурации...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <Form {...barcodeForm}>
        <form onSubmit={barcodeForm.handleSubmit(onSubmitBarcodeConfig)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Enable/Disable Toggle */}
            <div className="md:col-span-2">
              <FormField
                control={barcodeForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Включить систему штрих-кодов</FormLabel>
                      <FormDescription>
                        Активировать сканирование штрих-кодов израильских весов
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Product Code Range */}
            <FormField
              control={barcodeForm.control}
              name="productCodeStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Начало кода товара</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      min={1}
                      max={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={barcodeForm.control}
              name="productCodeEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Конец кода товара</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      min={1}
                      max={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Weight Range */}
            <FormField
              control={barcodeForm.control}
              name="weightStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Начало веса</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      min={1}
                      max={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={barcodeForm.control}
              name="weightEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Конец веса</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      min={1}
                      max={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Weight Unit */}
            <FormField
              control={barcodeForm.control}
              name="weightUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Единица веса</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите единицу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="g">Граммы (g)</SelectItem>
                      <SelectItem value="kg">Килограммы (kg)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={updateBarcodeConfigMutation.isPending}
            className="w-full md:w-auto"
          >
            {updateBarcodeConfigMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Сохранение...
              </>
            ) : (
              'Сохранить конфигурацию'
            )}
          </Button>
        </form>
      </Form>

      {/* Test Section */}
      {barcodeConfig?.enabled && (
        <div className="border-t pt-6">
          <h4 className="text-lg font-medium mb-4">Тестирование штрих-кода</h4>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Введите штрих-код для тестирования"
                value={testBarcode}
                onChange={(e) => setTestBarcode(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => testBarcodeMutation.mutate(testBarcode)}
                disabled={!testBarcode || testBarcodeMutation.isPending}
              >
                {testBarcodeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Тест'
                )}
              </Button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              }`}>
                {testResult.error ? (
                  <div className="text-red-800 space-y-2">
                    <div><strong>Ошибка:</strong> {testResult.error}</div>
                    {testResult.error.includes('too short') && (
                      <div className="text-sm bg-red-100 p-3 rounded border border-red-300">
                        <strong>Что делать:</strong>
                        <ul className="mt-1 ml-4 list-disc">
                          <li>Проверьте длину штрих-кода - он должен содержать минимум {barcodeConfig?.productCodeEnd} символов</li>
                          <li>Убедитесь что штрих-код содержит код товара в позициях {barcodeConfig?.productCodeStart}-{barcodeConfig?.productCodeEnd}</li>
                          <li>Пример правильного формата: для кода "25874" нужен штрих-код минимум из {barcodeConfig?.productCodeEnd} символов</li>
                        </ul>
                      </div>
                    )}
                    {testResult.error.includes('Product not found') && (
                      <div className="text-sm bg-red-100 p-3 rounded border border-red-300">
                        <strong>Что делать:</strong>
                        <ul className="mt-1 ml-4 list-disc">
                          <li>Убедитесь что товар с таким штрих-кодом существует в системе</li>
                          <li>Проверьте поле "Штрих-код" в карточке товара</li>
                          <li>Код товара должен совпадать с кодом в штрих-коде в позициях {barcodeConfig?.productCodeStart}-{barcodeConfig?.productCodeEnd}</li>
                        </ul>
                      </div>
                    )}
                    {testResult.error.includes('disabled') && (
                      <div className="text-sm bg-red-100 p-3 rounded border border-red-300">
                        <strong>Что делать:</strong>
                        <ul className="mt-1 ml-4 list-disc">
                          <li>Включите систему штрих-кодов в настройках выше</li>
                          <li>Убедитесь что переключатель "Включить систему штрих-кодов" активен</li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-green-800 space-y-2">
                    <div><strong>✅ Штрих-код успешно распознан!</strong></div>
                    <div><strong>Товар:</strong> {testResult.product?.name}</div>
                    <div><strong>Код товара:</strong> {testResult.barcode?.productCode}</div>
                    <div><strong>Вес:</strong> {testResult.barcode?.weight} {testResult.barcode?.weightUnit}</div>
                    <div><strong>Итоговая цена:</strong> ₪{testResult.barcode?.totalPrice}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Preview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Текущая конфигурация:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Статус: {barcodeConfig?.enabled ? '✅ Включено' : '❌ Отключено'}</div>
          <div>Код товара: позиции {barcodeConfig?.productCodeStart}-{barcodeConfig?.productCodeEnd}</div>
          <div>Вес: позиции {barcodeConfig?.weightStart}-{barcodeConfig?.weightEnd} ({barcodeConfig?.weightUnit})</div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium mb-2 text-blue-800">📝 Как работает система штрих-кодов:</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <div><strong>Формат штрих-кода:</strong> Позиции символов начинаются с 1</div>
          <div><strong>Пример:</strong> Для штрих-кода "0258741234" с настройками:</div>
          <ul className="ml-4 list-disc space-y-1">
            <li>Код товара (позиции 2-6): "25874"</li>
            <li>Вес (позиции 7-10): "1234" = 1234г</li>
          </ul>
          <div className="bg-blue-100 p-2 rounded border border-blue-300 mt-2">
            <strong>Важно:</strong> Убедитесь что в карточке товара поле "Штрих-код" содержит тот же код, что и в штрих-коде от весов (в данном примере "25874")
          </div>
        </div>
      </div>
    </div>
  );
}