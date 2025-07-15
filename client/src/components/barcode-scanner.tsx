import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminTranslation } from '@/hooks/use-language';
import { Camera, X, Loader2 } from 'lucide-react';

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

  // Parse barcode format: 2025874002804 -> product: 025874, weight: 280g
  const parseBarcode = (barcode: string) => {
    if (barcode.length !== 13) return null;
    
    const prefix = barcode.substring(0, 2); // "20"
    // ИСПРАВЛЕНИЕ: код товара "025874" находится в позициях 1-6 
    const productCode = barcode.substring(1, 7); // "025874" 
    // Вес находится в последних 5 цифрах (позиции 8-12)
    const weightStr = barcode.substring(8, 13); // "02804"
    
    console.log('Barcode parsing CORRECTED:', {
      barcode,
      prefix,
      productCode,
      weightStr,
      positions: 'Product: chars 1-6, Weight: chars 8-12',
      verification: 'For 2025874002804: product="025874", weight="02804"'
    });
    
    // Convert weight: 02804 -> 280.4g -> 280g (делим на 10 и округляем)
    const weight = Math.round(parseInt(weightStr) / 10);
    
    return {
      prefix,
      productCode,
      weight
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
      
      // Создаем новый экземпляр сканера для каждого запуска
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      console.log('Starting mobile barcode scanner...');
      
      // Сначала попробуем получить список устройств
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available video devices:', videoDevices);
        
        if (videoDevices.length === 0) {
          throw new Error('No video devices found');
        }
      } catch (devicesError) {
        console.log('Could not enumerate devices, proceeding with default camera');
      }
      
      // Используем более простые настройки для мобильных устройств
      const constraints = {
        video: {
          facingMode: 'environment', // Принудительно задняя камера
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      };

      console.log('Requesting camera access...');
      let stream;
      
      try {
        // Попробуем получить заднюю камеру
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (backCameraError) {
        console.log('Back camera failed, trying any camera:', backCameraError);
        // Если задняя камера не работает, попробуем любую
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      }
      
      console.log('Camera stream obtained successfully');
      
      // Подключаем поток к видео элементу
      videoRef.current.srcObject = stream;
      
      // Ждем загрузки метаданных видео
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video metadata loading timeout'));
        }, 5000);
        
        videoRef.current!.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(true);
        };
      });
      
      await videoRef.current.play();
      console.log('Video playback started');
      
      setIsScanning(true);

      // Начинаем сканирование
      codeReaderRef.current.decodeFromVideoDevice(
        undefined, // Используем уже активный поток
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log('Barcode detected:', result.getText());
            handleBarcodeDetected(result);
          }
          if (error && error.name !== 'NotFoundException') {
            console.log('Scanner error:', error.name, error.message);
          }
        }
      );
      
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      
      let errorMessage = adminT('barcode.scannerErrorDescription');
      let errorTitle = adminT('barcode.scannerError');
      
      if (error.name === 'NotAllowedError') {
        errorMessage = adminT('barcode.cameraPermissionDenied');
      } else if (error.name === 'NotFoundError') {
        errorMessage = adminT('barcode.noCameraFoundDescription');
      } else if (error.name === 'NotReadableError') {
        errorMessage = adminT('barcode.cameraInUse');
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Камера не поддерживает требуемые настройки. Попробуйте другое устройство';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Браузер не поддерживает доступ к камере через HTTPS';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Время ожидания загрузки камеры истекло. Попробуйте еще раз';
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
    // Останавливаем сканер
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    // Останавливаем видео поток
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      videoRef.current.srcObject = null;
    }
    
    // Сбрасываем состояние дебаунсинга
    setLastScannedBarcode('');
    setLastScanTime(0);
    
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && !isScanning && !isInitializing) {
      // Small delay to ensure video element is ready
      setTimeout(() => {
        startScanning();
      }, 100);
    }
    
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  // Add video event listeners for better debugging
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoLoad = () => {
      console.log('Video loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
    };

    const handleVideoError = (error: Event) => {
      console.error('Video error:', error);
    };

    const handleVideoPlay = () => {
      console.log('Video playing');
    };

    video.addEventListener('loadedmetadata', handleVideoLoad);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('play', handleVideoPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleVideoLoad);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('play', handleVideoPlay);
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
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
                controls={false}
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
            
            <div className="flex justify-end gap-2">
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