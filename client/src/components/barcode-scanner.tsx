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

  // Parse barcode format: 2025874002804 -> product: 025874, weight: 280g
  const parseBarcode = (barcode: string) => {
    if (barcode.length !== 13) return null;
    
    const prefix = barcode.substring(0, 2); // "20"
    const productCode = barcode.substring(2, 8); // "025874"
    const weightStr = barcode.substring(8, 13); // "02804"
    
    // Convert weight: 02804 -> 280.4g -> 280g (rounded)
    const weight = Math.round(parseInt(weightStr) / 10);
    
    return {
      prefix,
      productCode,
      weight
    };
  };

  const findProductByBarcode = (productCode: string) => {
    return allProducts.find(product => 
      product.barcode === productCode || 
      product.barcode === `0${productCode}` ||
      product.barcode === productCode.replace(/^0+/, '')
    );
  };

  const handleBarcodeDetected = (result: Result) => {
    const barcodeText = result.getText();
    console.log('Barcode detected:', barcodeText);
    
    const parsed = parseBarcode(barcodeText);
    if (!parsed) {
      toast({
        variant: "destructive",
        title: adminT('barcode.invalidFormat'),
        description: adminT('barcode.invalidFormatDescription')
      });
      return;
    }

    const { productCode, weight } = parsed;
    
    // Check if product exists in current order
    const orderItem = orderItems.find(item => 
      item.product?.barcode === productCode ||
      item.product?.barcode === `0${productCode}` ||
      item.product?.barcode === productCode.replace(/^0+/, '')
    );

    if (orderItem) {
      // Update existing item weight
      onUpdateItem(orderItem.productId, weight);
      toast({
        title: adminT('barcode.weightUpdated'),
        description: `${orderItem.product.name}: ${weight}${adminT('units.g')}`
      });
      onClose();
      return;
    }

    // Check if product exists in store
    const product = findProductByBarcode(productCode);
    if (!product) {
      toast({
        variant: "destructive",
        title: adminT('barcode.productNotFound'),
        description: adminT('barcode.productNotFoundDescription')
      });
      return;
    }

    // Product exists but not in order - show confirmation dialog
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
      onClose();
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setIsInitializing(true);
      
      // First, request camera permission explicitly
      console.log('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Prefer back camera
        } 
      });
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log('Camera permission granted');
      
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
      console.log('Available video devices:', videoInputDevices);
      
      if (videoInputDevices.length === 0) {
        toast({
          variant: "destructive",
          title: adminT('barcode.noCameraFound'),
          description: adminT('barcode.noCameraFoundDescription')
        });
        return;
      }

      setIsScanning(true);
      
      // Use back camera if available
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      const selectedDevice = backCamera || videoInputDevices[0];
      console.log('Selected device:', selectedDevice);

      await codeReaderRef.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleBarcodeDetected(result);
          }
          if (error) {
            console.log('Scanning error (normal):', error);
          }
        }
      );
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      
      let errorMessage = adminT('barcode.scannerErrorDescription');
      
      if (error.name === 'NotAllowedError') {
        errorMessage = adminT('barcode.cameraPermissionDenied');
      } else if (error.name === 'NotFoundError') {
        errorMessage = adminT('barcode.noCameraFoundDescription');
      } else if (error.name === 'NotReadableError') {
        errorMessage = adminT('barcode.cameraInUse');
      }
      
      toast({
        variant: "destructive",
        title: adminT('barcode.scannerError'),
        description: errorMessage
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
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
                style={{ transform: 'scaleX(-1)' }}
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
            <AlertDialogCancel onClick={() => 
              setConfirmDialog({ isOpen: false, product: null, weight: 0 })
            }>
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