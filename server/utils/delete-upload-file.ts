import * as fs from "fs";
import * as path from "path";

export function deleteUploadFile(imageUrl: string | null | undefined): void {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;

  const filename = path.basename(imageUrl);
  const nameWithoutExt = path.parse(filename).name;

  const filesToTry = [
    path.join(process.cwd(), imageUrl),
    path.join(process.cwd(), "uploads", "images", filename),
    path.join(process.cwd(), "uploads", "optimized", `${nameWithoutExt}.jpg`),
    path.join(process.cwd(), "uploads", "thumbnails", `${nameWithoutExt}.jpg`),
  ];

  const unique = [...new Set(filesToTry)];

  unique.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error(`Failed to delete upload file ${filePath}:`, e);
    }
  });
}

export function deleteUploadFiles(imageUrls: (string | null | undefined)[]): void {
  imageUrls.forEach((url) => deleteUploadFile(url));
}

export function extractThemeImageUrls(theme: Record<string, any>): string[] {
  const imageFields = [
    "logoUrl", "logoUrl_en", "logoUrl_he", "logoUrl_ar",
    "bannerImageUrl", "bannerImageUrl_en", "bannerImageUrl_he", "bannerImageUrl_ar",
    "cartBannerImage", "cartBannerImage_en", "cartBannerImage_he", "cartBannerImage_ar",
    "bottomBanner1Url", "bottomBanner1Url_en", "bottomBanner1Url_he", "bottomBanner1Url_ar",
    "bottomBanner2Url", "bottomBanner2Url_en", "bottomBanner2Url_he", "bottomBanner2Url_ar",
    "slide1Image", "slide2Image", "slide3Image", "slide4Image", "slide5Image",
    "slide1Image_en", "slide1Image_he", "slide1Image_ar",
    "slide2Image_en", "slide2Image_he", "slide2Image_ar",
    "slide3Image_en", "slide3Image_he", "slide3Image_ar",
    "slide4Image_en", "slide4Image_he", "slide4Image_ar",
    "slide5Image_en", "slide5Image_he", "slide5Image_ar",
  ];
  return imageFields
    .map((f) => theme[f] as string | undefined)
    .filter((url): url is string => !!url && url.startsWith("/uploads/"));
}
