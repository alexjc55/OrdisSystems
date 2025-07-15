import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';
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
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');

  // Query for barcode configuration
  const { data: barcodeConfig } = useQuery({
    queryKey: ['/api/barcode/config'],
    queryFn: () => apiRequest('GET', '/api/barcode/config'),
  });

  // Debug logging function for mobile devices
  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages(prev => [...prev.slice(-4), `${timestamp}: ${message}`]);
    console.log(message);
  };

  // Parse barcode using dynamic configuration
  const parseBarcode = (barcode: string) => {
    if (!barcodeConfig || !barcodeConfig.enabled) return null;
    
    // Validate barcode length
    const minLength = Math.max(barcodeConfig.productCodeEnd, barcodeConfig.weightEnd);
    if (barcode.length < minLength) return null;
    
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
    
    console.log('Barcode parsing with CONFIG:', {
      barcode,
      config: {
        productCodeStart: barcodeConfig.productCodeStart,
        productCodeEnd: barcodeConfig.productCodeEnd,
        weightStart: barcodeConfig.weightStart,
        weightEnd: barcodeConfig.weightEnd,
        weightUnit: barcodeConfig.weightUnit
      },
      productCode,
      weightStr,
      explanation: 'User sees 1-based positions, system uses 0-based'
    });
    
    // Convert weight to grams (divide by 10 for Israeli barcode format)
    const rawWeight = parseInt(weightStr);
    if (isNaN(rawWeight)) return null;
    
    // Israeli barcode format: weight is stored * 10, so divide by 10
    const weight = Math.round(rawWeight / 10);
    
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
    const barcodeText = result.getText();
    const currentTime = Date.now();
    
    // Увеличиваем дебаунсинг до 5 секунд для предотвращения дубликатов
    if (barcodeText === lastScannedBarcode && currentTime - lastScanTime < 5000) {
      console.log('Barcode debounced - ignoring duplicate scan:', barcodeText);
      return;
    }
    
    setLastScannedBarcode(barcodeText);
    setLastScanTime(currentTime);
    
    // Останавливаем сканирование немедленно после обнаружения штрих-кода
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
    
    console.log('Processing barcode:', barcodeText);
    
    const parsed = parseBarcode(barcodeText);
    if (!parsed) {
      // Закрываем сканер и показываем ошибку
      onClose();
      toast({
        variant: "destructive",
        title: adminT('barcode.invalidFormat'),
        description: adminT('barcode.invalidFormatDescription')
      });
      return;
    }

    const { productCode, weight } = parsed;
    console.log('Parsed product code:', productCode, 'weight:', weight);
    
    // Check if product exists in current order
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
      // Update existing item weight - закрываем сканер и обновляем
      onUpdateItem(orderItem.productId, weight);
      onClose();
      toast({
        title: adminT('barcode.weightUpdated'),
        description: `${orderItem.product.name}: ${weight}${adminT('units.g')}`
      });
      return;
    }

    // Check if product exists in store
    const product = findProductByBarcode(productCode);
    console.log('Product found:', product ? product.name : 'NOT FOUND');
    console.log('All products barcodes:', allProducts.map(p => ({ name: p.name, barcode: p.barcode })));
    
    if (!product) {
      // Закрываем сканер и показываем ошибку
      onClose();
      toast({
        variant: "destructive",
        title: adminT('barcode.productNotFound'),
        description: `${adminT('barcode.productNotFoundDescription')} (${productCode})`
      });
      return;
    }

    // Product exists but not in order - закрываем сканер и показываем диалог добавления
    onClose();
    setConfirmDialog({
      isOpen: true,
      product,
      weight
    });
  };

  const handleAddToOrder = () => {
    if (confirmDialog.product && confirmDialog.weight > 0) {
      onAddItem(confirmDialog.product, confirmDialog.weight);
      toast({
        title: adminT('barcode.productAdded'),
        description: `${confirmDialog.product.name}: ${confirmDialog.weight}${adminT('units.g')}`
      });
      setConfirmDialog({ isOpen: false, product: null, weight: 0 });
    }
  };

  const handleCancelAddToOrder = () => {
    setConfirmDialog({ isOpen: false, product: null, weight: 0 });
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setIsInitializing(true);
      setDebugMessages([]);
      setCameraStatus('idle');
      addDebugMessage('🔍 Инициализация сканера...');
      
      // Создаем новый экземпляр сканера для каждого запуска
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Проверяем доступность камеры
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      
      addDebugMessage('📱 Запрос доступа к камере...');
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
        addDebugMessage('✅ Задняя камера получена');
      } catch (backCameraError) {
        addDebugMessage('⚠️ Задняя камера не работает, пробуем любую...');
        // Если не работает, пробуем любую камеру
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        addDebugMessage('✅ Передняя камера получена');
      }
      
      setCameraStatus('granted');
      
      // Подключаем поток к видео элементу
      videoRef.current.srcObject = stream;
      addDebugMessage('🎥 Поток подключен к видео элементу');
      
      // Ждем загрузки видео с таймаутом
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout (5 seconds)'));
        }, 5000);
        
        const handleMetadata = () => {
          clearTimeout(timeout);
          const dimensions = `${videoRef.current?.videoWidth} x ${videoRef.current?.videoHeight}`;
          addDebugMessage(`📐 Метаданные видео: ${dimensions}`);
          resolve(true);
        };
        
        const handleError = (error: Event) => {
          clearTimeout(timeout);
          addDebugMessage('❌ Ошибка видео элемента');
          reject(error);
        };
        
        videoRef.current!.addEventListener('loadedmetadata', handleMetadata, { once: true });
        videoRef.current!.addEventListener('error', handleError, { once: true });
      });
      
      // Запускаем воспроизведение видео
      try {
        await videoRef.current.play();
        addDebugMessage('▶️ Воспроизведение видео запущено');
      } catch (playError) {
        addDebugMessage('⚠️ Ошибка воспроизведения, повторная попытка...');
        // Попробуем еще раз через небольшую задержку
        await new Promise(resolve => setTimeout(resolve, 100));
        await videoRef.current.play();
        addDebugMessage('▶️ Воспроизведение запущено со второй попытки');
      }
      
      setIsScanning(true);

      // Начинаем сканирование штрих-кодов
      addDebugMessage('🔍 Запуск детектора штрих-кодов...');
      
      // Пытаемся использовать видео поток для сканирования
      try {
        codeReaderRef.current.decodeFromVideoDevice(
          undefined, // Используем уже активный поток
          videoRef.current,
          (result, error) => {
            if (result) {
              addDebugMessage(`✅ Штрих-код обнаружен: ${result.getText()}`);
              handleBarcodeDetected(result);
            }
            if (error && error.name !== 'NotFoundException') {
              addDebugMessage(`⚠️ Ошибка сканера: ${error.name}`);
            }
          }
        );
        
        addDebugMessage('🎯 Сканер полностью инициализирован');
      } catch (scannerError) {
        addDebugMessage('⚠️ Ошибка инициализации сканера');
        
        // Fallback: используем более простое сканирование
        addDebugMessage('🔄 Попытка альтернативного метода...');
        
        const scanLoop = () => {
          if (!isScanning || !videoRef.current) return;
          
          try {
            codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, error) => {
              if (result) {
                addDebugMessage(`✅ Штрих-код (альтернативный метод): ${result.getText()}`);
                handleBarcodeDetected(result);
              }
            });
          } catch (alternativeError) {
            addDebugMessage('⚠️ Ошибка альтернативного сканирования');
          }
          
          // Повторяем сканирование каждые 500ms
          setTimeout(scanLoop, 500);
        };
        
        // Начинаем альтернативный цикл сканирования
        scanLoop();
        addDebugMessage('🎯 Альтернативный сканер инициализирован');
      }
      
    } catch (error) {
      setCameraStatus('error');
      addDebugMessage(`❌ Ошибка сканера: ${error.message}`);
      
      let errorMessage = 'Не удалось запустить сканер штрих-кодов';
      let errorTitle = 'Ошибка сканера';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Доступ к камере запрещен. Разрешите доступ к камере и попробуйте снова';
        setCameraStatus('denied');
        addDebugMessage('🚫 Доступ к камере запрещен');
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Камера не найдена на этом устройстве';
        addDebugMessage('📵 Камера не найдена');
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Камера занята другим приложением';
        addDebugMessage('🔒 Камера занята');
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Камера не поддерживает требуемые настройки';
        addDebugMessage('⚙️ Настройки камеры не поддерживаются');
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Время ожидания загрузки камеры истекло. Попробуйте еще раз';
        addDebugMessage('⏱️ Таймаут загрузки камеры');
      } else if (error.message && error.message.includes('getUserMedia')) {
        errorMessage = 'Браузер не поддерживает доступ к камере или требуется HTTPS';
        addDebugMessage('🌐 Проблема с браузером/HTTPS');
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
    addDebugMessage('🛑 Остановка сканера...');
    
    // Останавливаем сканер
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
        addDebugMessage('✅ Сканер сброшен');
      } catch (error) {
        addDebugMessage('⚠️ Ошибка сброса сканера');
      }
      codeReaderRef.current = null;
    }
    
    // Останавливаем видео поток
    if (videoRef.current) {
      try {
        // Останавливаем воспроизведение
        videoRef.current.pause();
        
        // Останавливаем все треки
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            track.stop();
            addDebugMessage(`🎥 Трек камеры остановлен: ${track.kind}`);
          });
          videoRef.current.srcObject = null;
        }
        
        // Очищаем атрибуты видео
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
        
        addDebugMessage('✅ Видео очищено');
      } catch (error) {
        addDebugMessage('⚠️ Ошибка остановки видео');
      }
    }
    
    // Сбрасываем состояние дебаунсинга
    setLastScannedBarcode('');
    setLastScanTime(0);
    
    setIsScanning(false);
    setIsInitializing(false);
    setCameraStatus('idle');
    
    addDebugMessage('✅ Сканер полностью остановлен');
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isOpen && !isScanning && !isInitializing) {
      // Small delay to ensure video element is ready
      timeoutId = setTimeout(() => {
        startScanning();
      }, 100);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      stopScanning();
    };
  }, [isOpen]);

  // Add video event listeners for better debugging
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleVideoError = (event: Event) => {
      console.error('Video error:', event);
      const video = event.target as HTMLVideoElement;
      if (video.error) {
        console.error('Video error details:', {
          code: video.error.code,
          message: video.error.message,
          MEDIA_ERR_ABORTED: video.error.MEDIA_ERR_ABORTED,
          MEDIA_ERR_NETWORK: video.error.MEDIA_ERR_NETWORK,
          MEDIA_ERR_DECODE: video.error.MEDIA_ERR_DECODE,
          MEDIA_ERR_SRC_NOT_SUPPORTED: video.error.MEDIA_ERR_SRC_NOT_SUPPORTED
        });
      }
    };

    const handleVideoLoadStart = () => {
      console.log('Video load started');
    };

    const handleVideoLoadedMetadata = () => {
      console.log('Video metadata loaded');
    };

    const handleVideoCanPlay = () => {
      console.log('Video can play');
    };

    const handleVideoPlay = () => {
      console.log('Video play started');
    };

    const handleVideoPause = () => {
      console.log('Video paused');
    };

    video.addEventListener('error', handleVideoError);
    video.addEventListener('loadstart', handleVideoLoadStart);
    video.addEventListener('loadedmetadata', handleVideoLoadedMetadata);
    video.addEventListener('canplay', handleVideoCanPlay);
    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);

    return () => {
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('loadstart', handleVideoLoadStart);
      video.removeEventListener('loadedmetadata', handleVideoLoadedMetadata);
      video.removeEventListener('canplay', handleVideoCanPlay);
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
    };
  }, [isOpen]);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {adminT('barcode.scanTitle')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', minHeight: '300px' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
                controls={false}
                onError={(e) => console.error('Video element error:', e)}
                onLoadStart={() => console.log('Video load start')}
                onCanPlay={() => console.log('Video can play')}
                onPlaying={() => console.log('Video is playing')}
                webkit-playsinline="true"
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
            </div>
            
            <div className="text-center text-sm text-gray-600">
              {adminT('barcode.scanInstructions')}
            </div>
            
            {/* Панель отладки для мобильных устройств */}
            {debugMessages.length > 0 && (
              <div className="bg-gray-50 border rounded-lg p-3 text-xs max-h-32 overflow-y-auto">
                <div className="font-medium mb-2 text-gray-700">Диагностика:</div>
                {debugMessages.map((message, index) => (
                  <div key={index} className="text-gray-600 mb-1">
                    {message}
                  </div>
                ))}
              </div>
            )}
            
            {/* Индикатор статуса камеры */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                cameraStatus === 'idle' ? 'bg-gray-400' :
                cameraStatus === 'requesting' ? 'bg-yellow-400' :
                cameraStatus === 'granted' ? 'bg-green-400' :
                cameraStatus === 'denied' ? 'bg-red-400' :
                'bg-red-400'
              }`}></div>
              <span>
                {cameraStatus === 'idle' ? 'Ожидание' :
                 cameraStatus === 'requesting' ? 'Запрос доступа к камере...' :
                 cameraStatus === 'granted' ? 'Камера активна' :
                 cameraStatus === 'denied' ? 'Доступ запрещен' :
                 'Ошибка камеры'}
              </span>
            </div>
            
            <div className="flex justify-end gap-2">
              {(cameraStatus === 'error' || cameraStatus === 'denied') && (
                <Button variant="outline" onClick={startScanning}>
                  <Camera className="h-4 w-4 mr-2" />
                  Повторить
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

      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => 
        setConfirmDialog(prev => ({ ...prev, isOpen: open }))
      }>
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