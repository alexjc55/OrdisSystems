import { Router } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../middleware/auth-guard";

const router = Router();

router.get('/barcode/config', async (req: any, res) => {
  try {
    const storeSettings = await storage.getStoreSettings();

    if (!storeSettings) {
      return res.status(404).json({ message: 'Store settings not found' });
    }

    const barcodeConfig = {
      enabled: storeSettings.barcodeSystemEnabled || false,
      productCodeStart: storeSettings.barcodeProductCodeStart || 1,
      productCodeEnd: storeSettings.barcodeProductCodeEnd || 5,
      weightStart: storeSettings.barcodeWeightStart || 6,
      weightEnd: storeSettings.barcodeWeightEnd || 10,
      weightUnit: storeSettings.barcodeWeightUnit || 'g'
    };

    res.json(barcodeConfig);
  } catch (error) {
    console.error('Error fetching barcode configuration:', error);
    res.status(500).json({ message: 'Failed to fetch barcode configuration' });
  }
});

router.put('/admin/barcode/config', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const {
      enabled,
      productCodeStart,
      productCodeEnd,
      weightStart,
      weightEnd,
      weightUnit
    } = req.body;

    if (productCodeStart >= productCodeEnd || weightStart >= weightEnd) {
      return res.status(400).json({
        message: 'Invalid barcode configuration: start positions must be less than end positions'
      });
    }

    const updatedSettings = await storage.updateStoreSettings({
      barcodeSystemEnabled: enabled,
      barcodeProductCodeStart: productCodeStart,
      barcodeProductCodeEnd: productCodeEnd,
      barcodeWeightStart: weightStart,
      barcodeWeightEnd: weightEnd,
      barcodeWeightUnit: weightUnit
    });

    res.json({
      message: 'Barcode configuration updated successfully',
      config: {
        enabled: updatedSettings.barcodeSystemEnabled,
        productCodeStart: updatedSettings.barcodeProductCodeStart,
        productCodeEnd: updatedSettings.barcodeProductCodeEnd,
        weightStart: updatedSettings.barcodeWeightStart,
        weightEnd: updatedSettings.barcodeWeightEnd,
        weightUnit: updatedSettings.barcodeWeightUnit
      }
    });
  } catch (error) {
    console.error('Error updating barcode configuration:', error);
    res.status(500).json({ message: 'Failed to update barcode configuration' });
  }
});

router.post('/barcode/parse', isAuthenticated, async (req: any, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ message: 'Valid barcode string is required' });
    }

    const storeSettings = await storage.getStoreSettings();

    if (!storeSettings?.barcodeSystemEnabled) {
      return res.status(400).json({ message: 'Barcode system is disabled' });
    }

    const config = {
      productCodeStart: storeSettings.barcodeProductCodeStart || 1,
      productCodeEnd: storeSettings.barcodeProductCodeEnd || 5,
      weightStart: storeSettings.barcodeWeightStart || 6,
      weightEnd: storeSettings.barcodeWeightEnd || 10,
      weightUnit: storeSettings.barcodeWeightUnit || 'g'
    };

    if (barcode.length < Math.max(config.productCodeEnd, config.weightEnd)) {
      return res.status(400).json({
        message: `Barcode too short. Expected at least ${Math.max(config.productCodeEnd, config.weightEnd)} digits`
      });
    }

    const productCode = barcode.substring(config.productCodeStart - 1, config.productCodeEnd);
    const weightStr = barcode.substring(config.weightStart - 1, config.weightEnd);
    const weight = parseInt(weightStr, 10);

    if (isNaN(weight)) {
      return res.status(400).json({ message: 'Invalid weight in barcode' });
    }

    const products = await storage.searchProducts(productCode);
    let product = products.find(p => p.barcode === productCode);

    if (!product) {
      const paddedCode = productCode.padStart(6, '0');
      const paddedProducts = await storage.searchProducts(paddedCode);
      product = paddedProducts.find(p => p.barcode === paddedCode);
    }

    if (!product) {
      const allProducts = await storage.searchProducts('');
      product = allProducts.find(p => p.barcode && p.barcode.replace(/^0+/, '') === productCode.replace(/^0+/, ''));
    }

    if (!product) {
      return res.status(404).json({
        message: 'Product not found for barcode',
        productCode,
        weight,
        weightUnit: config.weightUnit
      });
    }

    let calculatedWeight = weight;
    let displayWeight = weight;
    let displayUnit = config.weightUnit;
    let totalPrice = 0;

    const unitLower = product.unit.toLowerCase();

    if (unitLower === 'кг' || unitLower === 'kg') {
      const pricePerKg = Number(product.pricePerKg || product.price);
      if (config.weightUnit === 'g') {
        calculatedWeight = weight / 1000;
        displayWeight = calculatedWeight;
        displayUnit = product.unit;
      }
      totalPrice = Math.round(pricePerKg * calculatedWeight * 100) / 100;
    } else if (unitLower === 'г' || unitLower === 'g') {
      const pricePerGram = Number(product.price);
      if (config.weightUnit === 'g') {
        calculatedWeight = weight;
      }
      totalPrice = Math.round(pricePerGram * calculatedWeight * 100) / 100;
    } else if (unitLower === '100г' || unitLower === '100g' || unitLower === '100 г' || unitLower === '100 g') {
      const pricePer100g = Number(product.price);
      if (config.weightUnit === 'g') {
        calculatedWeight = weight / 100;
        displayWeight = weight;
        displayUnit = 'г';
      }
      totalPrice = Math.round(pricePer100g * calculatedWeight * 100) / 100;
    } else if (unitLower.includes('порция') || unitLower.includes('portion') || unitLower.includes('pc') || unitLower.includes('шт')) {
      totalPrice = Math.round(Number(product.price) * 100) / 100;
      calculatedWeight = 1;
      displayWeight = weight;
      displayUnit = config.weightUnit;
    } else {
      totalPrice = Math.round(Number(product.price) * calculatedWeight * 100) / 100;
    }

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        unit: product.unit,
        price: product.price,
        pricePerKg: product.pricePerKg
      },
      barcode: {
        raw: barcode,
        productCode,
        weight: displayWeight,
        weightUnit: displayUnit,
        totalPrice
      }
    });
  } catch (error) {
    console.error('Error parsing barcode:', error);
    res.status(500).json({ message: 'Failed to parse barcode' });
  }
});

export default router;
