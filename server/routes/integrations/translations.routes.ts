import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth-guard";
import { excelUpload } from "../../middleware/upload";
import { clearCachePattern } from "../../middleware/cache";

const router = Router();

router.get("/translations/export", isAuthenticated, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { exportTranslations, generateExcelFile } = await import('../../translation-manager');
    const translations = await exportTranslations();
    const excelBuffer = generateExcelFile(translations);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=translations.xlsx');
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting translations:', error);
    res.status(500).json({ message: 'Failed to export translations' });
  }
});

router.post("/translations/import", isAuthenticated, excelUpload.single('file'), async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { parseExcelFile, importTranslations } = await import('../../translation-manager');
    const translations = parseExcelFile(req.file.buffer);

    await importTranslations(translations);

    clearCachePattern('settings');
    clearCachePattern('themes');
    clearCachePattern('products');
    clearCachePattern('categories');

    res.json({ success: true, message: 'Translations imported successfully', importedRows: translations.length });
  } catch (error) {
    console.error('Error importing translations:', error);
    res.status(500).json({ message: 'Failed to import translations' });
  }
});

export default router;
