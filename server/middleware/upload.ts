import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
const optimizedDir = path.join(process.cwd(), 'uploads', 'optimized');
const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');

[uploadsDir, optimizedDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function optimizeImage(inputPath: string, outputPath: string, quality: number = 80, maxWidth: number = 800): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(maxWidth, null, { withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality, progressive: true })
      .toFile(outputPath);
  } catch (error) {
    console.error('Image optimization failed:', error);
    fs.copyFileSync(inputPath, outputPath);
  }
}

async function generateThumbnail(inputPath: string, outputPath: string, size: number = 200): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 70, progressive: true })
      .toFile(outputPath);
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    fs.copyFileSync(inputPath, outputPath);
  }
}

const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
    }
  }
});

export async function processUploadedImage(req: any, res: any, next: any) {
  if (!req.file) return next();
  try {
    const originalPath = req.file.path;
    const filename = req.file.filename;
    const nameWithoutExt = path.parse(filename).name;
    const optimizedPath = path.join(optimizedDir, `${nameWithoutExt}.jpg`);
    const thumbnailPath = path.join(thumbnailsDir, `${nameWithoutExt}.jpg`);

    await optimizeImage(originalPath, optimizedPath, 80, 800);
    await generateThumbnail(originalPath, thumbnailPath, 200);

    const originalSize = fs.statSync(originalPath).size;
    const optimizedSize = fs.statSync(optimizedPath).size;
    const thumbnailSize = fs.statSync(thumbnailPath).size;

    console.log(`📸 Image optimized: ${filename}`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)}KB (${((1 - optimizedSize / originalSize) * 100).toFixed(1)}% smaller)`);
    console.log(`   Thumbnail: ${(thumbnailSize / 1024).toFixed(1)}KB`);

    req.file.optimizedPath = `/uploads/optimized/${nameWithoutExt}.jpg`;
    req.file.thumbnailPath = `/uploads/thumbnails/${nameWithoutExt}.jpg`;
    req.file.originalPath = req.file.path;
    next();
  } catch (error) {
    console.error('Image processing failed:', error);
    next();
  }
}

export { optimizeImage, generateThumbnail, uploadsDir, optimizedDir, thumbnailsDir };
