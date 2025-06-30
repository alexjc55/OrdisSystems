// Fixed version of getProducts method with multilingual support
async getProducts(categoryId?: number): Promise<ProductWithCategories[]> {
  if (categoryId) {
    // Get products for specific category via junction table
    const productsWithCategories = await db
      .select({
        id: products.id,
        name: products.name,
        name_en: products.name_en,
        name_he: products.name_he,
        name_ar: products.name_ar,
        description: products.description,
        description_en: products.description_en,
        description_he: products.description_he,
        description_ar: products.description_ar,
        price: products.price,
        pricePerKg: products.pricePerKg,
        unit: products.unit,
        imageUrl: products.imageUrl,
        imageUrl_en: products.imageUrl_en,
        imageUrl_he: products.imageUrl_he,
        imageUrl_ar: products.imageUrl_ar,
        stockStatus: products.stockStatus,
        isAvailable: products.isAvailable,
        availabilityStatus: products.availabilityStatus,
        isActive: products.isActive,
        sortOrder: products.sortOrder,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        isSpecialOffer: products.isSpecialOffer,
        discountType: products.discountType,
        discountValue: products.discountValue,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryDescription: categories.description,
        categoryIcon: categories.icon,
        categoryIsActive: categories.isActive,
        categorySortOrder: categories.sortOrder,
        categoryCreatedAt: categories.createdAt,
        categoryUpdatedAt: categories.updatedAt,
      })
      .from(products)
      .innerJoin(productCategories, eq(products.id, productCategories.productId))
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(and(
        eq(products.isActive, true),
        eq(productCategories.categoryId, categoryId)
      ))
      .orderBy(products.sortOrder, products.name);

    // Group by product and collect categories
    const productMap = new Map<number, ProductWithCategories>();
    for (const row of productsWithCategories) {
      if (!productMap.has(row.id)) {
        productMap.set(row.id, {
          id: row.id,
          name: row.name,
          name_en: row.name_en,
          name_he: row.name_he,
          name_ar: row.name_ar,
          description: row.description,
          description_en: row.description_en,
          description_he: row.description_he,
          description_ar: row.description_ar,
          price: row.price,
          pricePerKg: row.pricePerKg,
          unit: row.unit,
          imageUrl: row.imageUrl,
          imageUrl_en: row.imageUrl_en,
          imageUrl_he: row.imageUrl_he,
          imageUrl_ar: row.imageUrl_ar,
          stockStatus: row.stockStatus,
          availabilityStatus: row.availabilityStatus,
          isActive: row.isActive,
          isAvailable: row.isAvailable,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          isSpecialOffer: row.isSpecialOffer,
          discountType: row.discountType,
          discountValue: row.discountValue,
          categories: []
        });
      }
      
      const product = productMap.get(row.id)!;
      if (!product.categories.some(c => c.id === row.categoryId)) {
        product.categories.push({
          id: row.categoryId,
          name: row.categoryName,
          description: row.categoryDescription,
          icon: row.categoryIcon,
          isActive: row.categoryIsActive,
          sortOrder: row.categorySortOrder,
          createdAt: row.categoryCreatedAt,
          updatedAt: row.categoryUpdatedAt,
        });
      }
    }
    
    return Array.from(productMap.values());
  } else {
    // Get all active products with their categories
    const productsWithCategories = await db
      .select({
        id: products.id,
        name: products.name,
        name_en: products.name_en,
        name_he: products.name_he,
        name_ar: products.name_ar,
        description: products.description,
        description_en: products.description_en,
        description_he: products.description_he,
        description_ar: products.description_ar,
        price: products.price,
        pricePerKg: products.pricePerKg,
        unit: products.unit,
        imageUrl: products.imageUrl,
        imageUrl_en: products.imageUrl_en,
        imageUrl_he: products.imageUrl_he,
        imageUrl_ar: products.imageUrl_ar,
        stockStatus: products.stockStatus,
        isAvailable: products.isAvailable,
        availabilityStatus: products.availabilityStatus,
        isActive: products.isActive,
        sortOrder: products.sortOrder,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        isSpecialOffer: products.isSpecialOffer,
        discountType: products.discountType,
        discountValue: products.discountValue,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryDescription: categories.description,
        categoryIcon: categories.icon,
        categoryIsActive: categories.isActive,
        categorySortOrder: categories.sortOrder,
        categoryCreatedAt: categories.createdAt,
        categoryUpdatedAt: categories.updatedAt,
      })
      .from(products)
      .innerJoin(productCategories, eq(products.id, productCategories.productId))
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(and(
        eq(products.isActive, true),
        ne(products.stockStatus, 'out_of_stock')
      ))
      .orderBy(products.sortOrder, products.name);

    // Group by product and collect categories
    const productMap = new Map<number, ProductWithCategories>();
    for (const row of productsWithCategories) {
      if (!productMap.has(row.id)) {
        productMap.set(row.id, {
          id: row.id,
          name: row.name,
          name_en: row.name_en,
          name_he: row.name_he,
          name_ar: row.name_ar,
          description: row.description,
          description_en: row.description_en,
          description_he: row.description_he,
          description_ar: row.description_ar,
          price: row.price,
          pricePerKg: row.pricePerKg,
          unit: row.unit,
          imageUrl: row.imageUrl,
          imageUrl_en: row.imageUrl_en,
          imageUrl_he: row.imageUrl_he,
          imageUrl_ar: row.imageUrl_ar,
          stockStatus: row.stockStatus,
          availabilityStatus: row.availabilityStatus,
          isActive: row.isActive,
          isAvailable: row.isAvailable,
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          isSpecialOffer: row.isSpecialOffer,
          discountType: row.discountType,
          discountValue: row.discountValue,
          categories: []
        });
      }
      
      const product = productMap.get(row.id)!;
      if (!product.categories.some(c => c.id === row.categoryId)) {
        product.categories.push({
          id: row.categoryId,
          name: row.categoryName,
          description: row.categoryDescription,
          icon: row.categoryIcon,
          isActive: row.categoryIsActive,
          sortOrder: row.categorySortOrder,
          createdAt: row.categoryCreatedAt,
          updatedAt: row.categoryUpdatedAt,
        });
      }
    }
    
    return Array.from(productMap.values());
  }
}