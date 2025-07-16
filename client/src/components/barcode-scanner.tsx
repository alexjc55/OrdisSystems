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
    addDebugMessage(`🔧 parseBarcode: получен ${barcode}`);
    
    if (!barcodeConfig) {
      addDebugMessage(`❌ parseBarcode: нет конфигурации`);
      return null;
    }
    
    if (!barcodeConfig.enabled) {
      addDebugMessage(`❌ parseBarcode: конфигурация отключена`);
      return null;
    }
    
    // Validate barcode length
    const minLength = Math.max(barcodeConfig.productCodeEnd, barcodeConfig.weightEnd);
    addDebugMessage(`🔧 parseBarcode: длина ${barcode.length}, минимум ${minLength}`);
    
    if (barcode.length < minLength) {
      addDebugMessage(`❌ parseBarcode: штрих-код слишком короткий`);
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
    console.log('=== handleBarcodeDetected START ===');
    const barcodeText = result.getText();
    const currentTime = Date.now();
    
    addDebugMessage(`🎯 НАЧАЛО: handleBarcodeDetected(${barcodeText})`);
    addDebugMessage(`🔧 Конфигурация: ${barcodeConfig ? 'загружена' : 'НЕ загружена'}`);
    
    // Проверяем конфигурацию
    if (!barcodeConfig) {
      addDebugMessage(`❌ Конфигурация штрих-кода не загружена`);
      return;
    }
    
    addDebugMessage(`🔧 Включен: ${barcodeConfig.enabled}`);
    
    // Увеличиваем дебаунсинг до 5 секунд для предотвращения дубликатов
    if (barcodeText === lastScannedBarcode && currentTime - lastScanTime < 5000) {
      addDebugMessage(`⏳ Дебаунсинг: игнорируем дубликат ${barcodeText}`);
      console.log('Barcode debounced - ignoring duplicate scan:', barcodeText);
      return;
    }
    
    setLastScannedBarcode(barcodeText);
    setLastScanTime(currentTime);
    
    // Останавливаем сканирование немедленно после обнаружения штрих-кода
    setIsScanning(false);
    
    console.log('Processing barcode:', barcodeText);
    addDebugMessage(`🔧 Вызов parseBarcode для: ${barcodeText}`);
    
    const parsed = parseBarcode(barcodeText);
    addDebugMessage(`🔧 Результат parseBarcode: ${parsed ? JSON.stringify(parsed) : 'null'}`);
    
    if (!parsed) {
      addDebugMessage(`❌ Неверный формат штрих-кода: ${barcodeText}`);
      // Закрываем сканер и показываем ошибку
      onClose();
      toast({
        variant: "destructive",
        title: adminT('barcode.invalidFormat'),
        description: adminT('barcode.invalidFormatDescription')
      });
      return;
    }
    
    addDebugMessage(`✅ Штрих-код распознан: код=${parsed.productCode}, вес=${parsed.weight}г`);

    const { productCode, weight } = parsed;
    console.log('Parsed product code:', productCode, 'weight:', weight);
    
    // Check if product exists in current order
    addDebugMessage(`🔍 Проверка в заказе: код=${productCode}, товаров=${orderItems.length}`);
    
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
      addDebugMessage(`✅ Товар найден в заказе: ${orderItem.product.name}`);
      addDebugMessage(`🔧 Вызов onUpdateItem(${orderItem.productId}, ${weight})`);
      // Update existing item weight - закрываем сканер и обновляем
      onUpdateItem(orderItem.productId, weight);
      addDebugMessage(`🔧 Вызов onClose()`);
      onClose();
      addDebugMessage(`🔧 Показ toast для обновления веса`);
      toast({
        title: adminT('barcode.weightUpdated'),
        description: `${orderItem.product.name}: ${weight}${adminT('units.g')}`
      });
      return;
    }
    
    addDebugMessage(`ℹ️ Товар не найден в заказе, ищем в базе...`);

    // Check if product exists in store
    addDebugMessage(`🔍 Ищем продукт с кодом: ${productCode}`);
    addDebugMessage(`📝 Всего продуктов в базе: ${allProducts.length}`);
    
    const product = findProductByBarcode(productCode);
    console.log('Product found:', product ? product.name : 'NOT FOUND');
    console.log('All products barcodes:', allProducts.map(p => ({ name: p.name, barcode: p.barcode })));
    
    if (!product) {
      addDebugMessage(`❌ Продукт не найден: код=${productCode}`);
      addDebugMessage(`🔧 Вызов onClose() для ошибки`);
      // Закрываем сканер и показываем ошибку
      onClose();
      addDebugMessage(`🔧 Показ toast для ошибки`);
      toast({
        variant: "destructive",
        title: adminT('barcode.productNotFound'),
        description: `${adminT('barcode.productNotFoundDescription')} (${productCode})`
      });
      return;
    }
    
    addDebugMessage(`✅ Продукт найден: ${product.name}`);

    // Product exists but not in order - закрываем сканер и показываем диалог добавления
    addDebugMessage(`🎯 Показ диалога добавления: ${product.name}, ${weight}г`);
    addDebugMessage(`🔧 Вызов onClose()`);
    onClose();
    addDebugMessage(`🔧 Открытие диалога подтверждения`);
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
      
      // Добавляем информацию о браузере и устройстве
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      const isChrome = /Chrome/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !isChrome;
      
      addDebugMessage(`📱 Устройство: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`);
      addDebugMessage(`🌐 Браузер: ${isChrome ? 'Chrome' : isSafari ? 'Safari' : 'Other'}`);
      addDebugMessage(`🔒 HTTPS: ${window.location.protocol === 'https:' ? 'Да' : 'Нет'}`);
      
      // Создаем новый экземпляр сканера для каждого запуска
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (resetError) {
          addDebugMessage('⚠️ Ошибка сброса предыдущего сканера');
        }
      }
      
      // Проверяем доступность ZXing
      if (!BrowserMultiFormatReader) {
        addDebugMessage('❌ ZXing библиотека не загружена');
        throw new Error('ZXing library not available');
      }
      
      try {
        codeReaderRef.current = new BrowserMultiFormatReader();
        addDebugMessage('✅ ZXing сканер создан');
        
        // Проверяем наличие необходимых методов
        if (!codeReaderRef.current.decodeFromVideoElement) {
          throw new Error('decodeFromVideoElement method not available');
        }
        addDebugMessage('✅ Методы сканера проверены');
      } catch (readerError) {
        addDebugMessage(`❌ Ошибка создания сканера: ${readerError.message}`);
        throw readerError;
      }
      
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
          addDebugMessage('⏱️ Таймаут загрузки видео (5 секунд)');
          reject(new Error('Video loading timeout (5 seconds)'));
        }, 5000);
        
        const handleMetadata = () => {
          clearTimeout(timeout);
          const width = videoRef.current?.videoWidth || 0;
          const height = videoRef.current?.videoHeight || 0;
          addDebugMessage(`📐 Метаданные видео: ${width} x ${height}`);
          
          // Дополнительная проверка валидности размеров
          if (width === 0 || height === 0) {
            addDebugMessage('⚠️ Недействительные размеры видео');
            reject(new Error('Invalid video dimensions'));
            return;
          }
          
          resolve(true);
        };
        
        const handleError = (error: Event) => {
          clearTimeout(timeout);
          addDebugMessage('❌ Ошибка видео элемента при загрузке');
          reject(error);
        };
        
        // Проверим, не загружены ли уже метаданные
        if (videoRef.current!.readyState >= 1) {
          addDebugMessage('📊 Метаданные уже загружены');
          handleMetadata();
          return;
        }
        
        videoRef.current!.addEventListener('loadedmetadata', handleMetadata, { once: true });
        videoRef.current!.addEventListener('error', handleError, { once: true });
      });
      
      // Запускаем воспроизведение видео
      try {
        await videoRef.current.play();
        addDebugMessage('▶️ Воспроизведение видео запущено');
        
        // Проверяем состояние видео после запуска
        const videoState = {
          paused: videoRef.current.paused,
          readyState: videoRef.current.readyState,
          currentTime: videoRef.current.currentTime,
          duration: videoRef.current.duration
        };
        addDebugMessage(`📊 Состояние видео: ${JSON.stringify(videoState)}`);
        
      } catch (playError) {
        addDebugMessage(`⚠️ Ошибка воспроизведения: ${playError.message}`);
        // Попробуем еще раз через небольшую задержку
        await new Promise(resolve => setTimeout(resolve, 200));
        try {
          await videoRef.current.play();
          addDebugMessage('▶️ Воспроизведение запущено со второй попытки');
        } catch (secondError) {
          addDebugMessage(`❌ Повторная ошибка воспроизведения: ${secondError.message}`);
          throw secondError;
        }
      }
      
      setIsScanning(true);

      // Начинаем сканирование штрих-кодов
      addDebugMessage('🔍 Запуск детектора штрих-кодов...');
      
      // Пытаемся использовать видео поток для сканирования
      try {
        addDebugMessage('🔍 Инициализация детектора штрих-кодов...');
        
        // Проверяем, что видео действительно воспроизводится
        if (videoRef.current.paused || videoRef.current.readyState < 2) {
          addDebugMessage('⚠️ Видео не готово, ожидаем...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Основной метод сканирования через stream
        const stream = videoRef.current.srcObject as MediaStream;
        const videoTrack = stream.getVideoTracks()[0];
        
        if (!videoTrack) {
          throw new Error('No video track found');
        }
        
        addDebugMessage(`📹 Видео трек: ${videoTrack.label}`);
        
        // Используем агрессивное сканирование с локальным управлением
        let scanTimeoutId: NodeJS.Timeout;
        let scanAttempts = 0;
        let shouldContinueScanning = true;
        
        const aggressiveScanLoop = () => {
          // Проверяем актуальное состояние без замыкания
          if (!shouldContinueScanning || !videoRef.current || !codeReaderRef.current) {
            if (scanTimeoutId) clearTimeout(scanTimeoutId);
            addDebugMessage('🛑 Сканирование остановлено (флаг или нет ресурсов)');
            return;
          }
          
          scanAttempts++;
          
          try {
            // Проверяем готовность видео и наличие сканера
            if (videoRef.current && 
                videoRef.current.readyState >= 2 && 
                videoRef.current.videoWidth > 0 && 
                codeReaderRef.current) {
              
              // Показываем прогресс каждые 20 попыток для лучшей диагностики
              if (scanAttempts % 20 === 0) {
                addDebugMessage(`🔄 Активное сканирование (попытка ${scanAttempts})`);
              }
              
              // Основной метод сканирования с callback
              try {
                // Максимальная диагностика callback
                addDebugMessage(`🔧 Создание callback для ZXing`);
                
                const maxDebugCallback = (result, error) => {
                  addDebugMessage(`🔔 CALLBACK ВЫЗВАН! result: ${!!result}, error: ${!!error}`);
                  
                  if (result) {
                    const barcodeText = result.getText();
                    addDebugMessage(`✅ Штрих-код обнаружен: ${barcodeText}`);
                    addDebugMessage(`🔍 Формат: ${result.getFormat()}`);
                    shouldContinueScanning = false; // Останавливаем цикл
                    
                    // Добавляем дополнительную диагностику
                    addDebugMessage(`🔄 Обработка штрих-кода: ${barcodeText}`);
                    
                    // Прямой вызов функции обработки
                    try {
                      addDebugMessage(`🚀 Запуск handleBarcodeDetected`);
                      handleBarcodeDetected(result);
                    } catch (handlerError) {
                      addDebugMessage(`❌ Ошибка обработки: ${handlerError.message}`);
                      console.error('Handler error:', handlerError);
                    }
                  } else if (error) {
                    // Показываем только значимые ошибки для диагностики
                    if (error.name && 
                        !error.name.includes('NotFoundException') && 
                        !error.name.includes('TypeError') &&
                        !error.message.includes('No MultiFormat Readers') &&
                        !error.message.includes('No code found')) {
                      if (scanAttempts % 100 === 0) {
                        addDebugMessage(`⚠️ Ошибка сканирования: ${error.name} - ${error.message}`);
                      }
                    }
                  }
                };
                
                addDebugMessage(`🔧 Передача callback в ZXing`);
                codeReaderRef.current.decodeFromVideoElement(videoRef.current, maxDebugCallback);
              } catch (scanError) {
                if (scanAttempts % 100 === 0) {
                  addDebugMessage(`⚠️ Критическая ошибка: ${scanError.message}`);
                }
              }
            } else {
              if (scanAttempts % 20 === 0) {
                const readyState = videoRef.current?.readyState || 'no video';
                const width = videoRef.current?.videoWidth || 'no width';
                addDebugMessage(`⚠️ Видео не готово: readyState=${readyState}, width=${width}`);
              }
            }
          } catch (error) {
            if (scanAttempts % 50 === 0) {
              addDebugMessage(`❌ Критическая ошибка сканирования: ${error.message}`);
            }
          }
          
          // Более частое сканирование - каждые 50ms для лучшей отзывчивости
          scanTimeoutId = setTimeout(aggressiveScanLoop, 50);
        };
        
        // Запускаем агрессивный цикл сканирования
        addDebugMessage('🚀 Запуск цикла агрессивного сканирования...');
        aggressiveScanLoop();
        
        addDebugMessage('🎯 Агрессивный сканер активен - наведите камеру на штрих-код!');
      } catch (scannerError) {
        addDebugMessage(`⚠️ Ошибка инициализации сканера: ${scannerError.message}`);
        
        // Fallback: используем более простое сканирование
        addDebugMessage('🔄 Переход на альтернативный метод сканирования...');
        
        let scanTimeoutId: NodeJS.Timeout;
        
        const scanLoop = () => {
          if (!isScanning || !videoRef.current) {
            if (scanTimeoutId) clearTimeout(scanTimeoutId);
            return;
          }
          
          try {
            // Проверяем, что видео элемент готов
            if (videoRef.current.readyState >= 2) {
              // Создаем callback функцию заранее для стабильной привязки
              const fallbackCallback = (result, error) => {
                if (result) {
                  addDebugMessage(`✅ Штрих-код найден: ${result.getText()}`);
                  handleBarcodeDetected(result);
                }
                // Игнорируем обычные ошибки поиска
                if (error && !error.name.includes('NotFoundException') && !error.name.includes('TypeError')) {
                  addDebugMessage(`⚠️ Ошибка: ${error.name}`);
                }
              };
              
              codeReaderRef.current?.decodeFromVideoElement(videoRef.current, fallbackCallback);
            } else {
              addDebugMessage('⚠️ Видео не готово для сканирования');
            }
          } catch (alternativeError) {
            addDebugMessage(`⚠️ Ошибка альтернативного сканирования: ${alternativeError.message}`);
          }
          
          // Повторяем сканирование каждые 1000ms (менее агрессивно)
          scanTimeoutId = setTimeout(scanLoop, 1000);
        };
        
        // Начинаем альтернативный цикл сканирования
        scanLoop();
        addDebugMessage('🎯 Альтернативный сканер активирован');
        
        // Добавляем диагностику видео
        setTimeout(() => {
          if (videoRef.current) {
            addDebugMessage(`📊 Видео статус: ${videoRef.current.readyState}, размер: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
          }
        }, 1000);
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
    
    // Сначала останавливаем состояние сканирования
    setIsScanning(false);
    
    // Останавливаем сканер
    if (codeReaderRef.current) {
      try {
        // Просто обнуляем ссылку на сканер
        codeReaderRef.current = null;
        addDebugMessage('✅ Сканер остановлен');
      } catch (error) {
        addDebugMessage('⚠️ Ошибка остановки сканера');
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
              addDebugMessage(`🎥 Трек камеры остановлен: ${track.kind}`);
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
        
        addDebugMessage('✅ Видео полностью очищено');
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
      addDebugMessage('🔄 Автозапуск сканирования...');
      // Small delay to ensure video element is ready
      timeoutId = setTimeout(() => {
        addDebugMessage('⏰ Запуск сканирования через useEffect');
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
    if (isOpen && !isScanning && !isInitializing && cameraStatus === 'active') {
      const forceStartTimer = setTimeout(() => {
        addDebugMessage('🚀 Принудительный запуск сканирования');
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
        let errorMsg = 'Ошибка видео: ';
        switch (video.error.code) {
          case 1:
            errorMsg += 'Загрузка прервана';
            break;
          case 2:
            errorMsg += 'Ошибка сети';
            break;
          case 3:
            errorMsg += 'Ошибка декодирования';
            break;
          case 4:
            errorMsg += 'Формат не поддерживается';
            break;
          default:
            errorMsg += 'Неизвестная ошибка';
        }
        addDebugMessage(`❌ ${errorMsg}`);
        setCameraStatus('error');
      }
    };

    const handleVideoLoadStart = () => {
      addDebugMessage('📺 Загрузка видео начата');
    };

    const handleVideoLoadedMetadata = () => {
      addDebugMessage('📊 Метаданные видео загружены');
    };

    const handleVideoCanPlay = () => {
      addDebugMessage('▶️ Видео готово к воспроизведению');
    };

    const handleVideoPlay = () => {
      addDebugMessage('▶️ Воспроизведение видео началось');
    };

    const handleVideoPause = () => {
      addDebugMessage('⏸️ Воспроизведение видео приостановлено');
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
    addDebugMessage('🔒 Закрытие сканера...');
    stopScanning();
    
    // Дополнительная очистка при закрытии
    setTimeout(() => {
      setCameraStatus('idle');
      setDebugMessages([]);
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
                onError={(e) => addDebugMessage('❌ Ошибка video элемента')}
                onLoadStart={() => addDebugMessage('📺 Загрузка видео начата')}
                onCanPlay={() => addDebugMessage('▶️ Видео готово к воспроизведению')}
                onPlaying={() => addDebugMessage('▶️ Видео воспроизводится')}
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
              
              {/* Индикатор активности сканирования */}
              {cameraStatus === 'granted' && isScanning && !isInitializing && (
                <div className="absolute top-2 right-2 text-xs bg-green-600 bg-opacity-80 text-white px-2 py-1 rounded animate-pulse">
                  🔍 Активно
                </div>
              )}
              
              {/* Инструкция по использованию */}
              {cameraStatus === 'granted' && isScanning && !isInitializing && (
                <div className="absolute bottom-2 left-2 right-2 text-xs bg-black bg-opacity-70 text-white px-2 py-1 rounded text-center">
                  Наведите камеру на штрих-код
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
            
            {/* Индикатор статуса камеры и сканирования */}
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
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
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isScanning ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                <span>
                  {isScanning ? 'Сканирование...' : 'Не сканирует'}
                </span>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              {(cameraStatus === 'error' || cameraStatus === 'denied') && (
                <Button variant="outline" onClick={startScanning}>
                  <Camera className="h-4 w-4 mr-2" />
                  Повторить
                </Button>
              )}
              <Button variant="outline" onClick={() => {
                try {
                  addDebugMessage('🧪 Тест: имитация штрих-кода 2025874002804');
                  const mockResult = {
                    getText: () => '2025874002804',
                    getFormat: () => 'EAN_13'
                  };
                  handleBarcodeDetected(mockResult as any);
                } catch (error) {
                  addDebugMessage(`❌ Ошибка теста: ${error}`);
                }
              }}>
                🧪 Тест
              </Button>
              
              <Button variant="outline" onClick={() => {
                addDebugMessage('🚀 Принудительный сброс и перезапуск');
                // Принудительно сбрасываем состояние
                setIsScanning(false);
                setIsInitializing(false);
                
                // Перезапускаем после небольшой задержки
                setTimeout(() => {
                  addDebugMessage('🔄 Перезапуск сканирования...');
                  startScanning();
                }, 100);
              }}>
                🔄 Перезапуск
              </Button>
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