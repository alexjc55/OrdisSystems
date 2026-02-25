import { Router } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../middleware/auth-guard";
import { getDB } from "../../db";
import { sql } from "drizzle-orm";
import { insertThemeSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get('/themes/active', async (req, res) => {
  try {
    const activeTheme = await storage.getActiveTheme();
    res.json(activeTheme || null);
  } catch (error) {
    console.error("Error fetching active theme:", error);
    res.status(500).json({ message: "Failed to fetch active theme" });
  }
});

router.get('/admin/themes', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const themes = await storage.getThemes();
    res.json(themes);
  } catch (error) {
    console.error("Error fetching themes:", error);
    res.status(500).json({ message: "Failed to fetch themes" });
  }
});

router.post('/admin/themes', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const bodyWithDefaults = {
      ...req.body,
      whatsappPhone: req.body.whatsappPhone || "",
      whatsappMessage: req.body.whatsappMessage || "Здравствуйте! У меня есть вопрос по заказу."
    };
    const themeData = insertThemeSchema.parse(bodyWithDefaults);

    if (!themeData.id) {
      themeData.id = `custom_theme_${Date.now()}`;
    }

    const theme = await storage.createTheme(themeData);
    res.status(201).json(theme);
  } catch (error) {
    console.error("Error creating theme:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create theme" });
  }
});

router.put('/admin/themes/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const body = req.body;
    const themeData: any = {};

    const urlFields = [
      'logoUrl', 'logoUrl_en', 'logoUrl_he', 'logoUrl_ar',
      'bannerImageUrl', 'bannerImageUrl_en', 'bannerImageUrl_he', 'bannerImageUrl_ar',
      'cartBannerImage', 'cartBannerImage_en', 'cartBannerImage_he', 'cartBannerImage_ar',
      'bottomBanner1Url', 'bottomBanner1Url_en', 'bottomBanner1Url_he', 'bottomBanner1Url_ar',
      'bottomBanner2Url', 'bottomBanner2Url_en', 'bottomBanner2Url_he', 'bottomBanner2Url_ar',
      'slide1Image', 'slide2Image', 'slide3Image', 'slide4Image', 'slide5Image'
    ];

    Object.keys(body).forEach(key => {
      if (body[key] !== null && body[key] !== undefined) {
        if (urlFields.includes(key) || body[key] !== '' || key.startsWith('slider') || key.startsWith('slide')) {
          themeData[key] = body[key];
        }
      }
    });

    const theme = await storage.updateTheme(id, themeData);

    if (theme.isActive) {
      const updateFields = [];

      if (themeData.headerStyle) updateFields.push(`header_style = '${themeData.headerStyle}'`);
      if (themeData.bannerButtonText !== undefined) updateFields.push(`banner_button_text = '${(themeData.bannerButtonText || 'Смотреть каталог').replace(/'/g, "''")}'`);
      if (themeData.bannerButtonLink !== undefined) updateFields.push(`banner_button_link = '${(themeData.bannerButtonLink || '#categories').replace(/'/g, "''")}'`);

      if (themeData.headerStyle === 'modern' || theme.headerStyle === 'modern') {
        if (themeData.modernBlock1Icon !== undefined) updateFields.push(`modern_block1_icon = '${(themeData.modernBlock1Icon || '').replace(/'/g, "''")}'`);
        if (themeData.modernBlock1Text !== undefined) updateFields.push(`modern_block1_text = '${(themeData.modernBlock1Text || '').replace(/'/g, "''")}'`);
        if (themeData.modernBlock2Icon !== undefined) updateFields.push(`modern_block2_icon = '${(themeData.modernBlock2Icon || '').replace(/'/g, "''")}'`);
        if (themeData.modernBlock2Text !== undefined) updateFields.push(`modern_block2_text = '${(themeData.modernBlock2Text || '').replace(/'/g, "''")}'`);
        if (themeData.modernBlock3Icon !== undefined) updateFields.push(`modern_block3_icon = '${(themeData.modernBlock3Icon || '').replace(/'/g, "''")}'`);
        if (themeData.modernBlock3Text !== undefined) updateFields.push(`modern_block3_text = '${(themeData.modernBlock3Text || '').replace(/'/g, "''")}'`);
      }

      if (themeData.logoUrl !== undefined) updateFields.push(`logo_url = '${themeData.logoUrl || ''}'`);
      if (themeData.bannerImageUrl !== undefined) updateFields.push(`banner_image_url = '${themeData.bannerImageUrl || ''}'`);
      if ((themeData as any).logoUrl_en !== undefined) updateFields.push(`logo_url_en = '${(themeData as any).logoUrl_en || ''}'`);
      if ((themeData as any).logoUrl_he !== undefined) updateFields.push(`logo_url_he = '${(themeData as any).logoUrl_he || ''}'`);
      if ((themeData as any).logoUrl_ar !== undefined) updateFields.push(`logo_url_ar = '${(themeData as any).logoUrl_ar || ''}'`);
      if ((themeData as any).bannerImageUrl_en !== undefined) updateFields.push(`banner_image_url_en = '${(themeData as any).bannerImageUrl_en || ''}'`);
      if ((themeData as any).bannerImageUrl_he !== undefined) updateFields.push(`banner_image_url_he = '${(themeData as any).bannerImageUrl_he || ''}'`);
      if ((themeData as any).bannerImageUrl_ar !== undefined) updateFields.push(`banner_image_url_ar = '${(themeData as any).bannerImageUrl_ar || ''}'`);

      if (themeData.showCartBanner !== undefined) updateFields.push(`show_cart_banner = ${themeData.showCartBanner}`);
      if (themeData.cartBannerType !== undefined) updateFields.push(`cart_banner_type = '${themeData.cartBannerType || 'text'}'`);
      if (themeData.cartBannerImage !== undefined) updateFields.push(`cart_banner_image = '${(themeData.cartBannerImage || '').replace(/'/g, "''")}'`);
      if (themeData.cartBannerText !== undefined) updateFields.push(`cart_banner_text = '${(themeData.cartBannerText || '').replace(/'/g, "''")}'`);
      if (themeData.cartBannerTextEn !== undefined) updateFields.push(`cart_banner_text_en = '${(themeData.cartBannerTextEn || '').replace(/'/g, "''")}'`);
      if (themeData.cartBannerTextHe !== undefined) updateFields.push(`cart_banner_text_he = '${(themeData.cartBannerTextHe || '').replace(/'/g, "''")}'`);
      if (themeData.cartBannerTextAr !== undefined) updateFields.push(`cart_banner_text_ar = '${(themeData.cartBannerTextAr || '').replace(/'/g, "''")}'`);
      if (themeData.cartBannerBgColor !== undefined) updateFields.push(`cart_banner_bg_color = '${themeData.cartBannerBgColor || '#f97316'}'`);
      if (themeData.cartBannerTextColor !== undefined) updateFields.push(`cart_banner_text_color = '${themeData.cartBannerTextColor || '#ffffff'}'`);

      if (themeData.showBottomBanners !== undefined) updateFields.push(`show_bottom_banners = ${themeData.showBottomBanners}`);
      if (themeData.bottomBanner1Url !== undefined) updateFields.push(`bottom_banner1_url = '${themeData.bottomBanner1Url || ''}'`);
      if (themeData.bottomBanner1Link !== undefined) updateFields.push(`bottom_banner1_link = '${themeData.bottomBanner1Link || ''}'`);
      if (themeData.bottomBanner2Url !== undefined) updateFields.push(`bottom_banner2_url = '${themeData.bottomBanner2Url || ''}'`);
      if (themeData.bottomBanner2Link !== undefined) updateFields.push(`bottom_banner2_link = '${themeData.bottomBanner2Link || ''}'`);

      if (themeData.showBannerImage !== undefined) updateFields.push(`show_banner_image = ${themeData.showBannerImage}`);
      if (themeData.showTitleDescription !== undefined) updateFields.push(`show_title_description = ${themeData.showTitleDescription}`);
      if (themeData.showInfoBlocks !== undefined) updateFields.push(`show_info_blocks = ${themeData.showInfoBlocks}`);
      if (themeData.infoBlocksPosition !== undefined) updateFields.push(`info_blocks_position = '${themeData.infoBlocksPosition || 'top'}'`);
      if (themeData.showSpecialOffers !== undefined) updateFields.push(`show_special_offers = ${themeData.showSpecialOffers}`);
      if (themeData.showCategoryMenu !== undefined) updateFields.push(`show_category_menu = ${themeData.showCategoryMenu}`);
      if (themeData.showWhatsAppChat !== undefined) updateFields.push(`show_whatsapp_chat = ${themeData.showWhatsAppChat}`);
      if (themeData.whatsappPhone !== undefined) updateFields.push(`whatsapp_phone_number = '${(themeData.whatsappPhone || '').replace(/'/g, "''")}'`);
      if (themeData.whatsappMessage !== undefined) updateFields.push(`whatsapp_default_message = '${(themeData.whatsappMessage || 'Здравствуйте! У меня есть вопрос по заказу.').replace(/'/g, "''")}'`);
      if (themeData.whatsappMessageEn !== undefined) updateFields.push(`whatsapp_default_message_en = '${(themeData.whatsappMessageEn || '').replace(/'/g, "''")}'`);
      if (themeData.whatsappMessageHe !== undefined) updateFields.push(`whatsapp_default_message_he = '${(themeData.whatsappMessageHe || '').replace(/'/g, "''")}'`);
      if (themeData.whatsappMessageAr !== undefined) updateFields.push(`whatsapp_default_message_ar = '${(themeData.whatsappMessageAr || '').replace(/'/g, "''")}'`);

      const hasSliderContent = () => {
        for (let i = 1; i <= 5; i++) {
          if (themeData[`slide${i}Image`] && themeData[`slide${i}Image`].trim() !== '') return true;
          if (themeData[`slide${i}Title`] && themeData[`slide${i}Title`].trim() !== '') return true;
          if (themeData[`slide${i}Subtitle`] && themeData[`slide${i}Subtitle`].trim() !== '') return true;
        }
        if (themeData.sliderAutoplay !== undefined && themeData.sliderAutoplay !== false) return true;
        if (themeData.sliderSpeed !== undefined && themeData.sliderSpeed !== 5000) return true;
        if (themeData.sliderEffect !== undefined && themeData.sliderEffect !== 'fade') return true;
        return false;
      };

      if (hasSliderContent()) {
        if (themeData.sliderAutoplay !== undefined) updateFields.push(`slider_autoplay = ${themeData.sliderAutoplay}`);
        if (themeData.sliderSpeed !== undefined) updateFields.push(`slider_speed = ${themeData.sliderSpeed}`);
        if (themeData.sliderEffect !== undefined) updateFields.push(`slider_effect = '${themeData.sliderEffect || 'fade'}'`);

        for (let i = 1; i <= 5; i++) {
          if (themeData[`slide${i}Image`] !== undefined) updateFields.push(`slide${i}_image = '${(themeData[`slide${i}Image`] || '').replace(/'/g, "''")}'`);
          if (themeData[`slide${i}Title`] !== undefined) updateFields.push(`slide${i}_title = '${(themeData[`slide${i}Title`] || '').replace(/'/g, "''")}'`);
          if (themeData[`slide${i}Subtitle`] !== undefined) updateFields.push(`slide${i}_subtitle = '${(themeData[`slide${i}Subtitle`] || '').replace(/'/g, "''")}'`);
          if (themeData[`slide${i}ButtonText`] !== undefined) updateFields.push(`slide${i}_button_text = '${(themeData[`slide${i}ButtonText`] || '').replace(/'/g, "''")}'`);
          if (themeData[`slide${i}ButtonLink`] !== undefined) updateFields.push(`slide${i}_button_link = '${(themeData[`slide${i}ButtonLink`] || '').replace(/'/g, "''")}'`);
          if (themeData[`slide${i}TextPosition`] !== undefined) updateFields.push(`slide${i}_text_position = '${themeData[`slide${i}TextPosition`] || 'left'}'`);
        }
      }

      if (updateFields.length > 0) {
        const db = await getDB();
        const sqlQuery = `UPDATE store_settings SET ${updateFields.join(', ')} WHERE id = 1`;
        await db.execute(sql.raw(sqlQuery));
        res.set('X-Settings-Updated', 'true');
      }
    }

    res.json(theme);
  } catch (error) {
    console.error("Error updating theme:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update theme" });
  }
});

router.post('/admin/themes/:id/activate', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const theme = await storage.activateTheme(id);

    const db = await getDB();
    if (theme.headerStyle) {
      await db.execute(sql.raw(`UPDATE store_settings SET header_style = '${theme.headerStyle}' WHERE id = 1`));
    }

    if (theme.bannerButtonText && theme.bannerButtonLink) {
      await db.execute(sql.raw(`UPDATE store_settings SET banner_button_text = '${theme.bannerButtonText}', banner_button_link = '${theme.bannerButtonLink}' WHERE id = 1`));
    }

    if (theme.headerStyle === 'modern') {
      const modernFields = [
        `modern_block1_icon = '${theme.modernBlock1Icon || ''}'`,
        `modern_block1_text = '${theme.modernBlock1Text || ''}'`,
        `modern_block2_icon = '${theme.modernBlock2Icon || ''}'`,
        `modern_block2_text = '${theme.modernBlock2Text || ''}'`,
        `modern_block3_icon = '${theme.modernBlock3Icon || ''}'`,
        `modern_block3_text = '${theme.modernBlock3Text || ''}'`
      ];
      await db.execute(sql.raw(`UPDATE store_settings SET ${modernFields.join(', ')} WHERE id = 1`));
    }

    const imageFields = [
      `logo_url = '${theme.logoUrl || ''}'`,
      `banner_image_url = '${theme.bannerImageUrl || ''}'`,
      `logo_url_en = '${theme.logoUrl_en || ''}'`,
      `logo_url_he = '${theme.logoUrl_he || ''}'`,
      `logo_url_ar = '${theme.logoUrl_ar || ''}'`,
      `banner_image_url_en = '${theme.bannerImageUrl_en || ''}'`,
      `banner_image_url_he = '${theme.bannerImageUrl_he || ''}'`,
      `banner_image_url_ar = '${theme.bannerImageUrl_ar || ''}'`
    ];
    await db.execute(sql.raw(`UPDATE store_settings SET ${imageFields.join(', ')} WHERE id = 1`));

    const cartBannerFields = [
      `show_cart_banner = ${theme.showCartBanner ?? false}`,
      `cart_banner_type = '${theme.cartBannerType || 'text'}'`,
      `cart_banner_image = '${theme.cartBannerImage || ''}'`,
      `cart_banner_text = '${theme.cartBannerText || ''}'`,
      `cart_banner_text_en = '${theme.cartBannerTextEn || ''}'`,
      `cart_banner_text_he = '${theme.cartBannerTextHe || ''}'`,
      `cart_banner_text_ar = '${theme.cartBannerTextAr || ''}'`,
      `cart_banner_bg_color = '${theme.cartBannerBgColor || '#f97316'}'`,
      `cart_banner_text_color = '${theme.cartBannerTextColor || '#ffffff'}'`
    ];
    await db.execute(sql.raw(`UPDATE store_settings SET ${cartBannerFields.join(', ')} WHERE id = 1`));

    const bottomBannerFields = [
      `show_bottom_banners = ${theme.showBottomBanners ?? false}`,
      `bottom_banner1_url = '${theme.bottomBanner1Url || ''}'`,
      `bottom_banner1_link = '${theme.bottomBanner1Link || ''}'`,
      `bottom_banner2_url = '${theme.bottomBanner2Url || ''}'`,
      `bottom_banner2_link = '${theme.bottomBanner2Link || ''}'`
    ];
    await db.execute(sql.raw(`UPDATE store_settings SET ${bottomBannerFields.join(', ')} WHERE id = 1`));

    const visualFields = [
      `show_banner_image = ${theme.showBannerImage ?? true}`,
      `show_title_description = ${theme.showTitleDescription ?? true}`,
      `show_info_blocks = ${theme.showInfoBlocks ?? true}`,
      `info_blocks_position = '${theme.infoBlocksPosition || 'top'}'`,
      `show_special_offers = ${theme.showSpecialOffers ?? true}`,
      `show_category_menu = ${theme.showCategoryMenu ?? true}`,
      `show_whatsapp_chat = ${theme.showWhatsAppChat ?? true}`,
      `whatsapp_phone_number = '${theme.whatsappPhone || ''}'`,
      `whatsapp_default_message = '${theme.whatsappMessage || 'Здравствуйте! У меня есть вопрос по заказу.'}'`,
      `whatsapp_default_message_en = '${theme.whatsappMessageEn || ''}'`,
      `whatsapp_default_message_he = '${theme.whatsappMessageHe || ''}'`,
      `whatsapp_default_message_ar = '${theme.whatsappMessageAr || ''}'`
    ];
    await db.execute(sql.raw(`UPDATE store_settings SET ${visualFields.join(', ')} WHERE id = 1`));

    res.json(theme);
  } catch (error) {
    console.error("Error activating theme:", error);
    res.status(500).json({ message: "Failed to activate theme" });
  }
});

router.delete('/admin/themes/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;

    if (id.startsWith('preset_')) {
      return res.status(403).json({ message: "Предустановленные темы нельзя удалить" });
    }

    const theme = await storage.getThemeById(id);
    if (theme?.isActive) {
      return res.status(400).json({ message: "Cannot delete active theme" });
    }

    if (id.includes('default_theme')) {
      return res.status(400).json({ message: "Cannot delete default theme" });
    }

    await storage.deleteTheme(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting theme:", error);
    res.status(500).json({ message: "Failed to delete theme" });
  }
});

export default router;
