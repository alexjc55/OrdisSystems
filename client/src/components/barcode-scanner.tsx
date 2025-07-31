import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminTranslation } from '@/hooks/use-language';
import { Camera, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: any[];
  onUpdateItem: (productId: number, newWeight: number) => void;
  onAddItem: (product: any, weight: number) => void;
  allProducts: any[];
}

export function BarcodeScanner({ 
  isOpen, 
  onClose, 
  orderItems, 
  onUpdateItem, 
  onAddItem,
  allProducts 
}: BarcodeScannerProps) {
  const { t: adminT } = useAdminTranslation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    product: any;
    weight: number;
  }>({ isOpen: false, product: null, weight: 0 });
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
  const shouldStopScanningRef = useRef<boolean>(false);
  const scanningSessionIdRef = useRef<string>('');
  const lastToastMessageRef = useRef<string>('');

  // Query for barcode configuration
  const { data: barcodeConfig } = useQuery({
    queryKey: ['/api/barcode/config'],
    queryFn: () => apiRequest('GET', '/api/barcode/config'),
  });



  // Parse barcode using dynamic configuration
  const parseBarcode = (barcode: string) => {
    if (!barcodeConfig) {
      return null;
    }
    
    if (!barcodeConfig.enabled) {
      return null;
    }
    
    // Validate barcode length
    const minLength = Math.max(barcodeConfig.productCodeEnd, barcodeConfig.weightEnd);
    
    if (barcode.length < minLength) {
      return null;
    }
    
    // Extract product code using config (пользователь видит позиции 1-based, система использует 0-based)
    const productCode = barcode.substring(
      barcodeConfig.productCodeStart - 1, 
      barcodeConfig.productCodeEnd
    );
    
    // Extract weight using config
    const weightStr = barcode.substring(
      barcodeConfig.weightStart - 1, 
      barcodeConfig.weightEnd
    );
    

    
    // Convert weight to number (Israeli barcode format: direct weight in grams)
    const rawWeight = parseInt(weightStr);
    if (isNaN(rawWeight)) return null;
    
    // Israeli barcode format: weight is stored as-is in grams
    const weight = rawWeight;
    
    // Apply weight unit conversion
    const finalWeight = barcodeConfig.weightUnit === 'kg' ? weight * 1000 : weight;
    
    return {
      productCode,
      weight: finalWeight
    };
  };

  const findProductByBarcode = (productCode: string) => {
    // Нормализуем код продукта (убираем ведущие нули)
    const normalizedCode = productCode.replace(/^0+/, '');
    
    return allProducts.find(product => {
      if (!product.barcode) return false;
      
      // Нормализуем штрих-код продукта
      const normalizedProductBarcode = product.barcode.replace(/^0+/, '');
      
      // Проверяем различные варианты совпадения
      return product.barcode === productCode ||
             product.barcode === `0${productCode}` ||
             product.barcode === normalizedCode ||
             normalizedProductBarcode === productCode ||
             normalizedProductBarcode === normalizedCode;
    });
  };

  const handleBarcodeDetected = (result: Result) => {
    // КРИТИЧЕСКАЯ ПРОВЕРКА: Если уже обрабатываем штрих-код, игнорируем
    if (shouldStopScanningRef.current) {
      return;
    }
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: Проверяем актуальность сессии сканирования
    const currentSessionId = scanningSessionIdRef.current;
    if (!currentSessionId) {
      return;
    }
    
    const barcodeText = result.getText();
    const currentTime = Date.now();
    
    // Проверяем конфигурацию
    if (!barcodeConfig || !barcodeConfig.enabled) {
      return;
    }
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Мгновенная блокировка повторных вызовов
    shouldStopScanningRef.current = true;
    setIsScanning(false);
    
    // Обнуляем сканер для предотвращения повторных вызовов
    if (codeReaderRef.current) {
      codeReaderRef.current = null;
    }
    
    // Усиленная защита от дублирования - увеличена до 3 секунд
    if (barcodeText === lastScannedBarcode && currentTime - lastScanTime < 3000) {
      return;
    }
    
    setLastScannedBarcode(barcodeText);
    setLastScanTime(currentTime);
    
    const parsed = parseBarcode(barcodeText);
    
    if (!parsed) {
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полная остановка сканирования и камеры
      stopScanning();
      onClose();
      setTimeout(() => {
        toast({
          variant: "destructive",
          title: adminT('barcode.invalidFormat'),
          description: adminT('barcode.invalidFormatDescription')
        });
      }, 100);
      return;
    }
    
    const { productCode, weight } = parsed;
    
    // Проверяем есть ли товар в текущем заказе
    const orderItem = orderItems.find(item => {
      const itemBarcode = item.product?.barcode;
      if (!itemBarcode) return false;
      
      // Проверяем различные варианты кода
      return itemBarcode === productCode ||
             itemBarcode === `0${productCode}` ||
             itemBarcode === productCode.replace(/^0+/, '') ||
             itemBarcode.replace(/^0+/, '') === productCode.replace(/^0+/, '');
    });

    if (orderItem) {
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полная остановка сканирования и камеры
      stopScanning();
      onUpdateItem(orderItem.productId, weight);
      onClose();
      
      // Задержка toast для предотвращения дублирования
      setTimeout(() => {
        toast({
          title: adminT('barcode.weightUpdated'),
          description: `${orderItem.product.name}: ${weight}${adminT('units.g')}`
        });
      }, 100);
      return;
    }
    
    // Ищем товар в базе данных
    const product = findProductByBarcode(productCode);
    
    if (!product) {
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полная остановка сканирования и камеры
      stopScanning();
      onClose();
      
      // КРИТИЧЕСКАЯ ЗАЩИТА: Проверяем дублирование toast сообщений
      const toastKey = `productNotFound_${productCode}`;
      if (lastToastMessageRef.current !== toastKey) {
        lastToastMessageRef.current = toastKey;
        
        // Показываем уведомление об ошибке только один раз
        setTimeout(() => {
          toast({
            variant: "destructive",
            title: adminT('barcode.productNotFound'),
            description: `${adminT('barcode.productNotFoundDescription')} (${productCode})`
          });
        }, 100);
      }
      return;
    }

    // Товар найден, но не в заказе - показываем диалог добавления
    stopScanning();
    onClose();
    
    // ИСПРАВЛЕНИЕ: Задержка для корректного показа диалога
    setTimeout(() => {
      setConfirmDialog({
        isOpen: true,
        product,
        weight
      });
    }, 150);
  };

  const handleAddToOrder = () => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сначала закрываем диалог, потом добавляем товар
    setConfirmDialog({ isOpen: false, product: null, weight: 0 });
    
    if (confirmDialog.product && confirmDialog.weight > 0) {
      onAddItem(confirmDialog.product, confirmDialog.weight);
      
      // Задержка toast для предотвращения конфликтов состояния
      setTimeout(() => {
        toast({
          title: adminT('barcode.productAdded'),
          description: `${confirmDialog.product.name}: ${confirmDialog.weight}${adminT('units.g')}`
        });
      }, 100);
    }
    
    // Дополнительная защита через тройное закрытие
    setTimeout(() => {
      setConfirmDialog({ isOpen: false, product: null, weight: 0 });
    }, 50);
    
    setTimeout(() => {
      setConfirmDialog({ isOpen: false, product: null, weight: 0 });
    }, 200);
  };

  const handleCancelAddToOrder = () => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Тройное закрытие диалога с разными интервалами
    setConfirmDialog({ isOpen: false, product: null, weight: 0 });
    
    setTimeout(() => {
      setConfirmDialog({ isOpen: false, product: null, weight: 0 });
    }, 50);
    
    setTimeout(() => {
      setConfirmDialog({ isOpen: false, product: null, weight: 0 });
    }, 150);
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полная очистка всех состояний при запуске
      shouldStopScanningRef.current = false;
      scanningSessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      lastToastMessageRef.current = '';
      setLastScannedBarcode('');
      setLastScanTime(0);
      setConfirmDialog({ isOpen: false, product: null, weight: 0 });
      setIsInitializing(true);
      setCameraStatus('idle');
      
      // Создаем новый экземпляр сканера
      if (codeReaderRef.current) {
        try {
          // Просто обнуляем сканер вместо reset
          codeReaderRef.current = null;
        } catch (resetError) {
          // Игнорируем ошибку сброса
        }
      }
      
      // Проверяем доступность ZXing
      if (!BrowserMultiFormatReader) {
        throw new Error('ZXing library not available');
      }
      
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Проверяем доступность камеры
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      
      setCameraStatus('requesting');
      
      // Используем простые настройки для максимальной совместимости
      const constraints = {
        video: {
          facingMode: 'environment', // Задняя камера
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let stream;
      
      try {
        // Сначала пробуем заднюю камеру
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (backCameraError) {
        // Если не работает, пробуем любую камеру
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      setCameraStatus('granted');
      
      // Подключаем поток к видео элементу
      videoRef.current.srcObject = stream;
      
      // Ждем загрузки видео с таймаутом
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout (5 seconds)'));
        }, 5000);
        
        const handleMetadata = () => {
          clearTimeout(timeout);
          const width = videoRef.current?.videoWidth || 0;
          const height = videoRef.current?.videoHeight || 0;
          
          // Дополнительная проверка валидности размеров
          if (width === 0 || height === 0) {
            reject(new Error('Invalid video dimensions'));
            return;
          }
          
          resolve(true);
        };
        
        const handleError = (error: Event) => {
          clearTimeout(timeout);
          reject(error);
        };
        
        // Проверим, не загружены ли уже метаданные
        if (videoRef.current!.readyState >= 1) {
          handleMetadata();
          return;
        }
        
        videoRef.current!.addEventListener('loadedmetadata', handleMetadata, { once: true });
        videoRef.current!.addEventListener('error', handleError, { once: true });
      });
      
      // Запускаем воспроизведение видео
      try {
        await videoRef.current.play();
      } catch (playError) {
        // Попробуем еще раз через небольшую задержку
        await new Promise(resolve => setTimeout(resolve, 200));
        try {
          await videoRef.current.play();
        } catch (secondError) {
          throw secondError;
        }
      }
      
      setIsScanning(true);

      // Начинаем сканирование штрих-кодов
      // Проверяем, что видео действительно воспроизводится
      if (videoRef.current.paused || videoRef.current.readyState < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Основной метод сканирования через stream
      const videoStream = videoRef.current.srcObject as MediaStream;
      const videoTrack = videoStream.getVideoTracks()[0];
      
      if (!videoTrack) {
        throw new Error('No video track found');
      }
      
      // Используем агрессивное сканирование с локальным управлением
      let scanTimeoutId: NodeJS.Timeout;
      let shouldContinueScanning = true;
      
      const aggressiveScanLoop = () => {
        // КРИТИЧЕСКАЯ ПРОВЕРКА: Если нужно остановить сканирование глобально
        if (shouldStopScanningRef.current) {
          shouldContinueScanning = false;
          if (scanTimeoutId) clearTimeout(scanTimeoutId);
          return;
        }
        
        // Проверяем актуальное состояние без замыкания
        if (!shouldContinueScanning || !videoRef.current || !codeReaderRef.current) {
          if (scanTimeoutId) clearTimeout(scanTimeoutId);
          return;
        }
        
        try {
          // Проверяем готовность видео и наличие сканера
          if (videoRef.current && 
              videoRef.current.readyState >= 2 && 
              videoRef.current.videoWidth > 0 && 
              codeReaderRef.current) {
            
            // Основной метод сканирования с callback
            try {
              const currentSessionId = scanningSessionIdRef.current;
              const callback = (result: any, error: any) => {
                // КРИТИЧЕСКАЯ ПРОВЕРКА: Проверяем актуальность сессии
                if (scanningSessionIdRef.current !== currentSessionId || shouldStopScanningRef.current) {
                  return;
                }
                
                // Проверяем правильно ли result содержит данные
                if (result && !error) {
                  try {
                    const barcodeText = result.getText();
                    if (barcodeText && barcodeText.length > 0) {
                      shouldContinueScanning = false; // Останавливаем цикл
                      
                      // Прямой вызов функции обработки
                      try {
                        handleBarcodeDetected(result);
                      } catch (handlerError) {
                        console.error('Handler error:', handlerError);
                      }
                    }
                  } catch (textError) {
                    console.error('Error getting barcode text:', textError);
                  }
                }
              };
                
              codeReaderRef.current.decodeFromVideoElement(videoRef.current, callback);
            } catch (scanError) {
              // Игнорируем ошибки сканирования
            }
          }
        } catch (error) {
          // Игнорируем ошибки сканирования
        }
        
        // Более частое сканирование - каждые 50ms для лучшей отзывчивости
        scanTimeoutId = setTimeout(aggressiveScanLoop, 50);
      };
      
      // Запускаем агрессивный цикл сканирования
      aggressiveScanLoop();
      
      setCameraStatus('granted');
      
    } catch (error: any) {
      setCameraStatus('error');
      
      let errorMessage = 'Не удалось запустить сканер штрих-кодов';
      let errorTitle = 'Ошибка сканера';
      
      if (error?.name === 'NotAllowedError') {
        errorMessage = 'Доступ к камере запрещен. Разрешите доступ к камере и попробуйте снова';
        setCameraStatus('denied');
      } else if (error?.name === 'NotFoundError') {
        errorMessage = 'Камера не найдена на этом устройстве';
      } else if (error?.name === 'NotReadableError') {
        errorMessage = 'Камера занята другим приложением';
      } else if (error?.name === 'OverconstrainedError') {
        errorMessage = 'Камера не поддерживает требуемые настройки';
      } else if (error?.message && error.message.includes('timeout')) {
        errorMessage = 'Время ожидания загрузки камеры истекло. Попробуйте еще раз';
      } else if (error?.message && error.message.includes('getUserMedia')) {
        errorMessage = 'Браузер не поддерживает доступ к камере или требуется HTTPS';
      }
      
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanning = () => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Глобальная остановка всех процессов сканирования
    shouldStopScanningRef.current = true;
    scanningSessionIdRef.current = '';
    setIsScanning(false);
    
    // Останавливаем сканер
    if (codeReaderRef.current) {
      try {
        // Просто обнуляем ссылку на сканер
        codeReaderRef.current = null;
      } catch (error) {
        // Игнорируем ошибки остановки сканера
      }
    }
    
    // Агрессивно очищаем видео поток
    if (videoRef.current) {
      try {
        // Останавливаем воспроизведение
        videoRef.current.pause();
        
        // Останавливаем все треки
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
            }
          });
          videoRef.current.srcObject = null;
        }
        
        // Принудительно очищаем все атрибуты видео
        videoRef.current.removeAttribute('src');
        videoRef.current.currentTime = 0;
        videoRef.current.load();
        
        // Убираем все стили, которые могут вызывать темный экран
        videoRef.current.style.opacity = '1';
        videoRef.current.style.filter = 'none';
        videoRef.current.style.transform = 'none';
        
      } catch (error) {
        // Игнорируем ошибки остановки видео
      }
    }
    
    // Сбрасываем состояние дебаунсинга
    setLastScannedBarcode('');
    setLastScanTime(0);
    
    setIsScanning(false);
    setIsInitializing(false);
    setCameraStatus('idle');
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isOpen && !isScanning && !isInitializing) {
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Очистка всех состояний при открытии
      shouldStopScanningRef.current = false;
      scanningSessionIdRef.current = '';
      lastToastMessageRef.current = '';
      setLastScannedBarcode('');
      setLastScanTime(0);
      setConfirmDialog({ isOpen: false, product: null, weight: 0 });
      
      // Small delay to ensure video element is ready
      timeoutId = setTimeout(() => {
        startScanning();
      }, 100);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Только останавливаем сканирование, не очищаем полностью
      if (isOpen === false) {
        stopScanning();
      }
    };
  }, [isOpen]);
  
  // Дополнительный принудительный запуск сканирования
  useEffect(() => {
    if (isOpen && !isScanning && !isInitializing && cameraStatus === 'granted') {
      const forceStartTimer = setTimeout(() => {
        startScanning();
      }, 500);
      
      return () => clearTimeout(forceStartTimer);
    }
  }, [isOpen, cameraStatus]);

  // Add video event listeners for better debugging
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleVideoError = (event: Event) => {
      const video = event.target as HTMLVideoElement;
      if (video.error) {
        setCameraStatus('error');
      }
    };

    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('error', handleVideoError);
    };
  }, [isOpen]);

  const handleClose = () => {
    stopScanning();
    
    // Дополнительная очистка при закрытии
    setTimeout(() => {
      setCameraStatus('idle');
      onClose();
    }, 100);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4" />
              {adminT('barcode.scanTitle')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', minHeight: '300px' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
                controls={false}

                webkit-playsinline="true"
              />
              
              <canvas
                ref={canvasRef}
                className="hidden"
                style={{ display: 'none' }}
              />
              
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>{adminT('barcode.initializingCamera')}</p>
                  </div>
                </div>
              )}
              
              {isScanning && !isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white w-48 h-24 rounded-lg opacity-50"></div>
                </div>
              )}
              
              {/* Инструкция по использованию */}
              {cameraStatus === 'granted' && isScanning && !isInitializing && (
                <div className="absolute bottom-2 left-2 right-2 text-xs bg-black bg-opacity-70 text-white px-2 py-1 rounded text-center">
                  {adminT('barcode.pointCameraInstruction')}
                </div>
              )}
            </div>
            
            <div className="text-center text-sm text-gray-600">
              {adminT('barcode.scanInstructions')}
            </div>
            

            

            
            <div className="flex justify-end gap-2">
              {(cameraStatus === 'error' || cameraStatus === 'denied') && (
                <Button variant="outline" onClick={startScanning}>
                  <Camera className="h-4 w-4 mr-2" />
                  {adminT('barcode.retry')}
                </Button>
              )}

              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                {adminT('actions.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // ИСПРАВЛЕНИЕ: принудительно закрываем диалог при любом изменении на false (ESC, клик по фону)
            setConfirmDialog({ isOpen: false, product: null, weight: 0 });
            
            // Дополнительная защита для сложных случаев
            setTimeout(() => {
              setConfirmDialog({ isOpen: false, product: null, weight: 0 });
            }, 100);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{adminT('barcode.productNotInOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {adminT('barcode.productFoundInStore')}: <strong>{confirmDialog.product?.name}</strong>
              <br />
              {adminT('barcode.weight')}: <strong>{confirmDialog.weight}{adminT('units.g')}</strong>
              <br />
              {adminT('barcode.addToOrderQuestion')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAddToOrder}>
              {adminT('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAddToOrder}>
              {adminT('barcode.addToOrder')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}