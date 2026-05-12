import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAdminTranslation } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
  const { t: adminT } = useAdminTranslation();
  
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

  // Watch enabled state to conditionally show/hide settings fields
  const isEnabled = barcodeForm.watch('enabled');

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
        title: adminT('barcode.configUpdated'),
        description: adminT('barcode.configUpdateSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/barcode/config'] });
    },
    onError: (error: any) => {
      toast({
        title: adminT('barcode.updateError'),
        description: error.message || adminT('barcode.configUpdateError'),
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
        <span className="ml-2">{adminT('actions.loading')}</span>
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 gap-6">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <FormLabel className="text-base">{adminT('barcode.enabled')}</FormLabel>
                      <FormDescription>
                        {adminT('barcode.description')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="default"
                        disabled={updateBarcodeConfigMutation.isPending}
                        onClick={() => {
                          const newValue = !field.value;
                          field.onChange(newValue);
                          // Auto-save immediately when toggling
                          const current = barcodeForm.getValues();
                          updateBarcodeConfigMutation.mutate({ ...current, enabled: newValue });
                        }}
                        className={`h-12 w-12 p-0 rounded-lg transition-all duration-200 flex-shrink-0 ${
                          field.value 
                            ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-2 border-emerald-300 shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-2 border-gray-300 shadow-sm'
                        }`}
                        title={field.value ? adminT('barcode.disable') : adminT('barcode.enable')}
                      >
                        {updateBarcodeConfigMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : field.value ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
                      </Button>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Settings fields - only shown when enabled */}
            {isEnabled && (
              <>
                {/* Product Code Range */}
                <FormField
                  control={barcodeForm.control}
                  name="productCodeStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{adminT('barcode.productCodeStart')}</FormLabel>
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
                      <FormLabel>{adminT('barcode.productCodeEnd')}</FormLabel>
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
                      <FormLabel>{adminT('barcode.weightStart')}</FormLabel>
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
                      <FormLabel>{adminT('barcode.weightEnd')}</FormLabel>
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
                      <FormLabel>{adminT('barcode.weightUnit')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={adminT('barcode.weightUnit')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="g">{adminT('settings.grams')} (g)</SelectItem>
                          <SelectItem value="kg">{adminT('settings.kilograms')} (kg)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          {/* Save button only shown when fields are visible */}
          {isEnabled && (
            <Button
              type="submit"
              disabled={updateBarcodeConfigMutation.isPending}
              className="w-full md:w-auto"
            >
              {updateBarcodeConfigMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {adminT('actions.saving')}
                </>
              ) : (
                adminT('actions.save')
              )}
            </Button>
          )}
        </form>
      </Form>

      {/* Test Section */}
      {barcodeConfig?.enabled && (
        <div className="border-t pt-6">
          <h4 className="text-lg font-medium mb-4">{adminT('barcode.testBarcode')}</h4>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={adminT('barcode.testBarcodeDescription')}
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
                  adminT('barcode.testBarcodeButton')
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

      {/* Configuration Preview and Help — only shown when enabled */}
      {isEnabled && (
        <>
          {/* Configuration Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{adminT('settings.currentConfiguration')}:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>{adminT('barcode.status')}: {barcodeConfig?.enabled ? `✅ ${adminT('settings.enabled')}` : `❌ ${adminT('settings.disabled')}`}</div>
              <div>{adminT('barcode.productCodePos')} {barcodeConfig?.productCodeStart}-{barcodeConfig?.productCodeEnd}</div>
              <div>{adminT('barcode.weightPos')} {barcodeConfig?.weightStart}-{barcodeConfig?.weightEnd} ({barcodeConfig?.weightUnit})</div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium mb-2 text-blue-800">📝 {adminT('barcode.sampleBarcode')}:</h4>
            <div className="text-sm text-blue-700 space-y-2">
              <div><strong>{adminT('settings.barcodeFormat')}:</strong> {adminT('settings.positionsStartFrom')}</div>
              <div><strong>{adminT('settings.barcodeExample')}</strong></div>
              <ul className="ml-4 list-disc space-y-1">
                <li>{adminT('settings.productCodePositions')}</li>
                <li>{adminT('settings.weightPositions')}</li>
              </ul>
              <div className="bg-blue-100 p-2 rounded border border-blue-300 mt-2">
                <strong>{adminT('barcode.sampleBarcodeDescription')}</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}