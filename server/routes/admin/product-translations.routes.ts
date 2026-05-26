import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth-guard";
import { getDB } from "../../db";
import { products, productCategories, storeSettings } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const translationUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.number(),
    name: z.string().optional(),
    name_en: z.string().optional(),
    name_he: z.string().optional(),
    name_ar: z.string().optional(),
    description: z.string().optional(),
    description_en: z.string().optional(),
    description_he: z.string().optional(),
    description_ar: z.string().optional(),
    ingredients: z.string().optional(),
    ingredients_en: z.string().optional(),
    ingredients_he: z.string().optional(),
    ingredients_ar: z.string().optional(),
  }))
});

async function checkAccess(req: any, res: any): Promise<boolean> {
  const user = req.user;
  if (!user) { res.status(401).json({ message: "Unauthorized" }); return false; }
  if (user.role === "admin") return true;
  if (user.role === "worker") {
    const db = await getDB();
    const [settings] = await db.select({ workerPermissions: storeSettings.workerPermissions })
      .from(storeSettings).limit(1);
    const perms = (settings?.workerPermissions as any) || {};
    if (perms.canManageTranslations === true) return true;
  }
  res.status(403).json({ message: "Access denied" });
  return false;
}

router.get("/admin/translations/products", isAuthenticated, async (req: any, res) => {
  try {
    if (!await checkAccess(req, res)) return;
    const db = await getDB();

    // Fetch all products (select * to avoid Drizzle column resolution issues)
    // then pick only the translation-relevant fields
    const allProducts = await db.select().from(products).orderBy(products.id);
    const rows = allProducts.map((p: any) => ({
      id: p.id,
      name: p.name ?? "",
      name_en: p.name_en ?? "",
      name_he: p.name_he ?? "",
      name_ar: p.name_ar ?? "",
      description: p.description ?? "",
      description_en: p.description_en ?? "",
      description_he: p.description_he ?? "",
      description_ar: p.description_ar ?? "",
      ingredients: p.ingredients ?? "",
      ingredients_en: p.ingredients_en ?? "",
      ingredients_he: p.ingredients_he ?? "",
      ingredients_ar: p.ingredients_ar ?? "",
    }));

    // Fetch first category per product via junction table
    const productIds = rows.map(r => r.id);
    const catLinks = productIds.length > 0
      ? await db.select({
          productId: productCategories.productId,
          categoryId: productCategories.categoryId,
        }).from(productCategories)
          .where(inArray(productCategories.productId, productIds))
      : [];

    // Map productId → first categoryId
    const catMap = new Map<number, number>();
    for (const link of catLinks) {
      if (!catMap.has(link.productId)) catMap.set(link.productId, link.categoryId);
    }

    const result = rows.map(r => ({ ...r, categoryId: catMap.get(r.id) ?? null }));
    res.json(result);
  } catch (error) {
    console.error("Error fetching product translations:", error);
    res.status(500).json({ message: "Failed to fetch product translations" });
  }
});

router.put("/admin/translations/products", isAuthenticated, async (req: any, res) => {
  try {
    if (!await checkAccess(req, res)) return;

    const parsed = translationUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    }

    const db = await getDB();
    const { updates } = parsed.data;

    await db.transaction(async (tx) => {
      for (const item of updates) {
        const { id, ...fields } = item;
        await tx.update(products).set(fields).where(eq(products.id, id));
      }
    });

    res.json({ message: "Translations updated successfully", count: updates.length });
  } catch (error) {
    console.error("Error updating product translations:", error);
    res.status(500).json({ message: "Failed to update translations" });
  }
});

export default router;
