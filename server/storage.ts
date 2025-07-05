import {
  users,
  userAddresses,
  categories,
  products,
  productCategories,
  orders,
  orderItems,
  storeSettings,
  themes,
  type User,
  type UpsertUser,
  type UserAddress,
  type InsertUserAddress,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type ProductWithCategory,
  type ProductWithCategories,
  type ProductCategory,
  type InsertProductCategory,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithItems,
  type CategoryWithProducts,
  type CategoryWithCount,
  type StoreSettings,
  type InsertStoreSettings,
  type Theme,
  type InsertTheme,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, sql, not, ne, count, asc, or, isNotNull } from "drizzle-orm";
import { inArray } from "drizzle-orm";

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  categoryId?: number;
  status?: string;
  sortField?: string;
  sortDirection?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Interface for storage operations
export interface IStorage {
  // User operations (independent auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User>;
  
  // Password management
  updatePassword(userId: string, hashedPassword: string): Promise<User>;
  createPasswordResetToken(email: string): Promise<{ token: string; userId: string }>;
  validatePasswordResetToken(token: string): Promise<{ userId: string; isValid: boolean }>;
  clearPasswordResetToken(userId: string): Promise<void>;
  
  // Admin user management
  createUser(user: Omit<UpsertUser, 'id'> & { password?: string }): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUserRole(id: string, role: "admin" | "worker" | "customer"): Promise<User>;

  // User address operations
  getUserAddresses(userId: string): Promise<UserAddress[]>;
  createUserAddress(address: InsertUserAddress): Promise<UserAddress>;
  updateUserAddress(id: number, address: Partial<InsertUserAddress>): Promise<UserAddress>;
  deleteUserAddress(id: number): Promise<void>;
  setDefaultAddress(userId: string, addressId: number): Promise<void>;

  // Category operations
  getCategories(includeInactive?: boolean): Promise<CategoryWithCount[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  updateCategoryOrders(categoryOrders: { id: number; sortOrder: number }[]): Promise<void>;

  // Product operations
  getProducts(categoryId?: number): Promise<ProductWithCategories[]>;
  getProductsPaginated(params: PaginationParams): Promise<PaginatedResult<ProductWithCategories>>;
  getProductById(id: number): Promise<ProductWithCategories | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  updateProductAvailability(id: number, availabilityStatus: "available" | "out_of_stock_today" | "completely_unavailable"): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  searchProducts(query: string): Promise<ProductWithCategories[]>;

  // Order operations
  getOrders(userId?: string): Promise<OrderWithItems[]>;
  getOrdersPaginated(params: PaginationParams): Promise<PaginatedResult<OrderWithItems>>;
  getOrderById(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order>;
  updateOrderStatus(id: number, status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"): Promise<Order>;
  updateOrderItems(orderId: number, items: any[]): Promise<void>;

  // User operations with pagination
  getUsersPaginated(params: PaginationParams): Promise<PaginatedResult<User>>;

  // Store settings
  getStoreSettings(): Promise<StoreSettings | undefined>;
  updateStoreSettings(settings: Partial<InsertStoreSettings>): Promise<StoreSettings>;

  // Theme management
  getThemes(): Promise<Theme[]>;
  getActiveTheme(): Promise<Theme | undefined>;
  getThemeById(id: string): Promise<Theme | undefined>;
  createTheme(theme: InsertTheme): Promise<Theme>;
  updateTheme(id: string, theme: Partial<InsertTheme>): Promise<Theme>;
  deleteTheme(id: string): Promise<void>;
  activateTheme(id: string): Promise<Theme>;

  // Theme management
  getThemes(): Promise<Theme[]>;
  getActiveTheme(): Promise<Theme | undefined>;
  getThemeById(id: string): Promise<Theme | undefined>;
  createTheme(theme: InsertTheme): Promise<Theme>;
  updateTheme(id: string, theme: Partial<InsertTheme>): Promise<Theme>;
  deleteTheme(id: string): Promise<void>;
  activateTheme(id: string): Promise<Theme>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // User address operations
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    return await db.select().from(userAddresses).where(eq(userAddresses.userId, userId)).orderBy(desc(userAddresses.isDefault), userAddresses.label);
  }

  async createUserAddress(address: InsertUserAddress): Promise<UserAddress> {
    // If this is set as default, unset all other defaults for this user
    if (address.isDefault) {
      await db
        .update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.userId, address.userId));
    }

    const [newAddress] = await db
      .insert(userAddresses)
      .values(address)
      .returning();
    return newAddress;
  }

  async updateUserAddress(id: number, address: Partial<InsertUserAddress>): Promise<UserAddress> {
    // If this is being set as default, unset all other defaults for this user
    if (address.isDefault) {
      const existingAddress = await db.select().from(userAddresses).where(eq(userAddresses.id, id)).limit(1);
      if (existingAddress.length > 0) {
        await db
          .update(userAddresses)
          .set({ isDefault: false })
          .where(eq(userAddresses.userId, existingAddress[0].userId));
      }
    }

    const [updatedAddress] = await db
      .update(userAddresses)
      .set({ ...address, updatedAt: new Date() })
      .where(eq(userAddresses.id, id))
      .returning();
    return updatedAddress;
  }

  async deleteUserAddress(id: number): Promise<void> {
    await db.delete(userAddresses).where(eq(userAddresses.id, id));
  }

  async setDefaultAddress(userId: string, addressId: number): Promise<void> {
    // Unset all defaults for this user
    await db
      .update(userAddresses)
      .set({ isDefault: false })
      .where(eq(userAddresses.userId, userId));

    // Set the specified address as default
    await db
      .update(userAddresses)
      .set({ isDefault: true })
      .where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));
  }

  // Category operations
  async getCategories(includeInactive = false): Promise<CategoryWithCount[]> {
    const categoriesData = await db
      .select()
      .from(categories)
      .where(includeInactive ? undefined : eq(categories.isActive, true))
      .orderBy(categories.sortOrder, categories.name);

    // Add product count for each category
    const categoriesWithCount = [];
    for (const category of categoriesData) {
      const [productCount] = await db
        .select({ count: count() })
        .from(productCategories)
        .innerJoin(products, eq(productCategories.productId, products.id))
        .where(and(
          eq(productCategories.categoryId, category.id),
          eq(products.isActive, true),
          eq(products.isAvailable, true)
        ));

      categoriesWithCount.push({
        ...category,
        productCount: productCount?.count || 0
      });
    }

    return categoriesWithCount;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async updateCategoryOrders(categoryOrders: { id: number; sortOrder: number }[]): Promise<void> {
    for (const { id, sortOrder } of categoryOrders) {
      await db
        .update(categories)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(categories.id, id));
    }
  }

  // Product operations
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
          categoryNameEn: categories.name_en,
          categoryNameHe: categories.name_he,
          categoryNameAr: categories.name_ar,
          categoryDescription: categories.description,
          categoryDescriptionEn: categories.description_en,
          categoryDescriptionHe: categories.description_he,
          categoryDescriptionAr: categories.description_ar,
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
            name_en: row.categoryNameEn || null,
            name_he: row.categoryNameHe || null,
            name_ar: row.categoryNameAr || null,
            description: row.categoryDescription,
            description_en: row.categoryDescriptionEn || null,
            description_he: row.categoryDescriptionHe || null,
            description_ar: row.categoryDescriptionAr || null,
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
          categoryNameEn: categories.name_en,
          categoryNameHe: categories.name_he,
          categoryNameAr: categories.name_ar,
          categoryDescription: categories.description,
          categoryDescriptionEn: categories.description_en,
          categoryDescriptionHe: categories.description_he,
          categoryDescriptionAr: categories.description_ar,
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
            name_en: row.categoryNameEn || null,
            name_he: row.categoryNameHe || null,
            name_ar: row.categoryNameAr || null,
            description: row.categoryDescription,
            description_en: row.categoryDescriptionEn || null,
            description_he: row.categoryDescriptionHe || null,
            description_ar: row.categoryDescriptionAr || null,
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

  async getProductsPaginated(params: PaginationParams): Promise<PaginatedResult<ProductWithCategories>> {
    const { page, limit, search, categoryId, status, sortField, sortDirection } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(or(
        sql`${products.name} ILIKE ${'%' + search + '%'}`,
        sql`${products.name_en} ILIKE ${'%' + search + '%'}`,
        sql`${products.name_he} ILIKE ${'%' + search + '%'}`,
        sql`${products.name_ar} ILIKE ${'%' + search + '%'}`,
        sql`${products.description} ILIKE ${'%' + search + '%'}`,
        sql`${products.description_en} ILIKE ${'%' + search + '%'}`,
        sql`${products.description_he} ILIKE ${'%' + search + '%'}`,
        sql`${products.description_ar} ILIKE ${'%' + search + '%'}`
      ));
    }
    
    if (status && status !== 'all') {
      if (status === 'available') {
        conditions.push(eq(products.isAvailable, true));
      } else if (status === 'unavailable') {
        conditions.push(eq(products.isAvailable, false));
      } else if (status === 'with_discount') {
        conditions.push(eq(products.isSpecialOffer, true));
      }
    }

    // If filtering by category, get product IDs first
    let productIdsForCategory: number[] = [];
    if (categoryId) {
      const categoryProducts = await db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, categoryId));
      productIdsForCategory = categoryProducts.map(p => p.productId);
      
      if (productIdsForCategory.length > 0) {
        conditions.push(inArray(products.id, productIdsForCategory));
      } else {
        // No products in this category
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    let orderBy;
    if (sortField === 'name') {
      orderBy = sortDirection === 'desc' ? desc(products.name) : asc(products.name);
    } else if (sortField === 'price') {
      orderBy = sortDirection === 'desc' ? desc(products.price) : asc(products.price);
    } else {
      orderBy = asc(products.name);
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(whereClause);
    
    const total = totalResult?.count || 0;

    // Get paginated data
    const productsData = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get all categories for all products in one query
    const productIds = productsData.map(p => p.id);
    const productCategoriesData = productIds.length > 0 ? await db
      .select({
        productId: productCategories.productId,
        id: categories.id,
        name: categories.name,
        name_en: categories.name_en,
        name_he: categories.name_he,
        name_ar: categories.name_ar,
        description: categories.description,
        description_en: categories.description_en,
        description_he: categories.description_he,
        description_ar: categories.description_ar,
        icon: categories.icon,
        isActive: categories.isActive,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .innerJoin(productCategories, eq(categories.id, productCategories.categoryId))
      .where(inArray(productCategories.productId, productIds)) : [];

    // Group categories by product ID
    const categoriesByProduct = new Map();
    productCategoriesData.forEach(cat => {
      if (!categoriesByProduct.has(cat.productId)) {
        categoriesByProduct.set(cat.productId, []);
      }
      const { productId, ...categoryData } = cat;
      categoriesByProduct.get(cat.productId).push(categoryData);
    });

    // Combine products with their categories
    const data: ProductWithCategories[] = productsData.map(product => ({
      ...product,
      categories: categoriesByProduct.get(product.id) || []
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: number): Promise<ProductWithCategories | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (!product) return undefined;

    // Get categories for this product
    const productCats = await db
      .select()
      .from(categories)
      .innerJoin(productCategories, eq(categories.id, productCategories.categoryId))
      .where(eq(productCategories.productId, product.id));

    return {
      ...product,
      categories: productCats.map(pc => pc.categories)
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const { categoryIds, ...productData } = product;
    
    // Create product without categories first
    const [newProduct] = await db
      .insert(products)
      .values(productData)
      .returning();

    // Add category relationships if provided
    if (categoryIds && categoryIds.length > 0) {
      const categoryRelations = categoryIds.map(categoryId => ({
        productId: newProduct.id,
        categoryId
      }));
      
      await db.insert(productCategories).values(categoryRelations);
    }

    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const { categoryIds, ...productData } = product;
    
    // Update product data
    const [updatedProduct] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    // Handle category relationships if provided
    if (categoryIds !== undefined) {
      // Remove existing category relationships
      await db.delete(productCategories).where(eq(productCategories.productId, id));
      
      // Add new category relationships
      if (categoryIds.length > 0) {
        const categoryRelations = categoryIds.map(categoryId => ({
          productId: id,
          categoryId
        }));
        
        await db.insert(productCategories).values(categoryRelations);
      }
    }

    return updatedProduct;
  }

  async updateProductAvailability(id: number, availabilityStatus: "available" | "out_of_stock_today" | "completely_unavailable"): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ 
        availabilityStatus,
        isActive: availabilityStatus !== "completely_unavailable",
        updatedAt: new Date() 
      })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    // Delete category relationships first (they should cascade automatically, but being explicit)
    await db.delete(productCategories).where(eq(productCategories.productId, id));
    // Delete the product
    await db.delete(products).where(eq(products.id, id));
  }

  async searchProducts(query: string): Promise<ProductWithCategories[]> {
    const productsData = await db
      .select()
      .from(products)
      .where(and(
        eq(products.isActive, true),
        eq(products.isAvailable, true),
        or(
          sql`${products.name} ILIKE ${'%' + query + '%'}`,
          sql`${products.name_en} ILIKE ${'%' + query + '%'}`,
          sql`${products.name_he} ILIKE ${'%' + query + '%'}`,
          sql`${products.name_ar} ILIKE ${'%' + query + '%'}`,
          sql`${products.description} ILIKE ${'%' + query + '%'}`,
          sql`${products.description_en} ILIKE ${'%' + query + '%'}`,
          sql`${products.description_he} ILIKE ${'%' + query + '%'}`,
          sql`${products.description_ar} ILIKE ${'%' + query + '%'}`
        )
      ))
      .orderBy(products.name);

    // Get categories for each product
    const result: ProductWithCategories[] = [];
    for (const product of productsData) {
      const productCats = await db
        .select()
        .from(categories)
        .innerJoin(productCategories, eq(categories.id, productCategories.categoryId))
        .where(eq(productCategories.productId, product.id));
      
      result.push({
        ...product,
        categories: productCats.map(pc => pc.categories)
      });
    }
    
    return result;
  }

  // Order operations
  async getOrders(userId?: string): Promise<OrderWithItems[]> {
    const whereClause = userId ? eq(orders.userId, userId) : undefined;

    const ordersData = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt));

    const result: OrderWithItems[] = [];
    for (const order of ordersData) {
      // Get order items with products
      const itemsData = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          pricePerKg: orderItems.pricePerKg,
          totalPrice: orderItems.totalPrice,
          createdAt: orderItems.createdAt,
          productName: products.name,
          productName_en: products.name_en,
          productName_he: products.name_he,
          productName_ar: products.name_ar,
          productDescription: products.description,
          productDescription_en: products.description_en,
          productDescription_he: products.description_he,
          productDescription_ar: products.description_ar,
          productPrice: products.price,
          productUnit: products.unit,
          productPricePerKg: products.pricePerKg,
          productImageUrl: products.imageUrl,
          productImageUrl_en: products.imageUrl_en,
          productImageUrl_he: products.imageUrl_he,
          productImageUrl_ar: products.imageUrl_ar,
          productIsActive: products.isActive,
          productIsAvailable: products.isAvailable,
          productStockStatus: products.stockStatus,
          productAvailabilityStatus: products.availabilityStatus,
          productIsSpecialOffer: products.isSpecialOffer,
          productDiscountType: products.discountType,
          productDiscountValue: products.discountValue,
          productSortOrder: products.sortOrder,
          productCreatedAt: products.createdAt,
          productUpdatedAt: products.updatedAt,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      // Get user data
      const [userData] = await db
        .select()
        .from(users)
        .where(eq(users.id, order.userId || ''));

      result.push({
        ...order,
        items: itemsData.map(item => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          pricePerKg: item.pricePerKg,
          totalPrice: item.totalPrice,
          createdAt: item.createdAt,
          product: {
            id: item.productId,
            name: item.productName,
            name_en: item.productName_en,
            name_he: item.productName_he,
            name_ar: item.productName_ar,
            description: item.productDescription,
            description_en: item.productDescription_en,
            description_he: item.productDescription_he,
            description_ar: item.productDescription_ar,
            price: item.productPrice,
            unit: item.productUnit,
            pricePerKg: item.productPricePerKg,
            imageUrl: item.productImageUrl,
            imageUrl_en: item.productImageUrl_en,
            imageUrl_he: item.productImageUrl_he,
            imageUrl_ar: item.productImageUrl_ar,
            isActive: item.productIsActive,
            isAvailable: item.productIsAvailable,
            stockStatus: item.productStockStatus,
            availabilityStatus: item.productAvailabilityStatus,
            isSpecialOffer: item.productIsSpecialOffer,
            discountType: item.productDiscountType,
            discountValue: item.productDiscountValue,
            sortOrder: item.productSortOrder,
            createdAt: item.productCreatedAt,
            updatedAt: item.productUpdatedAt,
          }
        })),
        user: userData || null
      });
    }

    return result;
  }

  async getOrdersPaginated(params: PaginationParams): Promise<PaginatedResult<OrderWithItems>> {
    const { page, limit, search, status, sortField, sortDirection } = params;
    const offset = (page - 1) * limit;

    // Build where conditions for database query (only non-user fields)
    const conditions = [];
    
    // Note: Don't add search conditions here - we'll handle user search client-side
    
    if (status && status !== 'all') {
      // Handle multiple statuses separated by comma (for active filter)
      if (status.includes(',')) {
        const statusList = status.split(',');
        conditions.push(inArray(orders.status, statusList as any));
      } else {
        conditions.push(eq(orders.status, status as any));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    let orderBy;
    if (sortField === 'totalAmount') {
      orderBy = sortDirection === 'desc' ? desc(orders.totalAmount) : asc(orders.totalAmount);
    } else if (sortField === 'status') {
      orderBy = sortDirection === 'desc' ? desc(orders.status) : asc(orders.status);
    } else {
      orderBy = desc(orders.createdAt);
    }

    // Get paginated orders first
    const ordersQuery = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(search ? 1000 : limit)
      .offset(search ? 0 : offset);

    // Build full order data with items and users
    let ordersData: any[] = [];
    for (const order of ordersQuery) {
      // Get order items with multilingual product fields
      const itemsData = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          pricePerKg: orderItems.pricePerKg,
          totalPrice: orderItems.totalPrice,
          createdAt: orderItems.createdAt,
          productName: products.name,
          productName_en: products.name_en,
          productName_he: products.name_he,
          productName_ar: products.name_ar,
          productDescription: products.description,
          productDescription_en: products.description_en,
          productDescription_he: products.description_he,
          productDescription_ar: products.description_ar,
          productPrice: products.price,
          productUnit: products.unit,
          productPricePerKg: products.pricePerKg,
          productImageUrl: products.imageUrl,
          productImageUrl_en: products.imageUrl_en,
          productImageUrl_he: products.imageUrl_he,
          productImageUrl_ar: products.imageUrl_ar,
          productIsActive: products.isActive,
          productIsAvailable: products.isAvailable,
          productStockStatus: products.stockStatus,
          productAvailabilityStatus: products.availabilityStatus,
          productIsSpecialOffer: products.isSpecialOffer,
          productDiscountType: products.discountType,
          productDiscountValue: products.discountValue,
          productSortOrder: products.sortOrder,
          productCreatedAt: products.createdAt,
          productUpdatedAt: products.updatedAt,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      // Get user data
      const [userData] = await db
        .select()
        .from(users)
        .where(eq(users.id, order.userId || ''));

      ordersData.push({
        ...order,
        items: itemsData.map(item => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          pricePerKg: item.pricePerKg,
          totalPrice: item.totalPrice,
          createdAt: item.createdAt,
          product: {
            id: item.productId,
            name: item.productName,
            name_en: item.productName_en,
            name_he: item.productName_he,
            name_ar: item.productName_ar,
            description: item.productDescription,
            description_en: item.productDescription_en,
            description_he: item.productDescription_he,
            description_ar: item.productDescription_ar,
            price: item.productPrice,
            unit: item.productUnit,
            pricePerKg: item.productPricePerKg,
            imageUrl: item.productImageUrl,
            imageUrl_en: item.productImageUrl_en,
            imageUrl_he: item.productImageUrl_he,
            imageUrl_ar: item.productImageUrl_ar,
            isActive: item.productIsActive,
            isAvailable: item.productIsAvailable,
            stockStatus: item.productStockStatus,
            availabilityStatus: item.productAvailabilityStatus,
            isSpecialOffer: item.productIsSpecialOffer,
            discountType: item.productDiscountType,
            discountValue: item.productDiscountValue,
            sortOrder: item.productSortOrder,
            createdAt: item.productCreatedAt,
            updatedAt: item.productUpdatedAt,
          }
        })),
        user: userData || null,
      });
    }

    let totalFiltered = ordersData.length;

    // Client-side filtering for search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      ordersData = ordersData.filter(order => {
        // Search in order fields
        const phoneMatch = order.customerPhone?.toLowerCase().includes(searchLower);
        const addressMatch = order.deliveryAddress?.toLowerCase().includes(searchLower);
        
        // Search in user fields
        const usernameMatch = order.user?.username?.toLowerCase().includes(searchLower);
        const firstNameMatch = order.user?.firstName?.toLowerCase().includes(searchLower);
        const lastNameMatch = order.user?.lastName?.toLowerCase().includes(searchLower);
        
        return phoneMatch || addressMatch || usernameMatch || firstNameMatch || lastNameMatch;
      });
      
      totalFiltered = ordersData.length;
      
      // Apply pagination after filtering
      const startIndex = (page - 1) * limit;
      ordersData = ordersData.slice(startIndex, startIndex + limit);
    } else {
      // Get total count for non-search queries
      const [totalResult] = await db
        .select({ count: count() })
        .from(orders)
        .where(whereClause);
      
      totalFiltered = totalResult?.count || 0;
    }

    return {
      data: ordersData as OrderWithItems[],
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit),
    };
  }

  async getOrderById(id: number): Promise<OrderWithItems | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));

    if (!order) return undefined;

    // Get order items with multilingual product fields
    const itemsData = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        pricePerKg: orderItems.pricePerKg,
        totalPrice: orderItems.totalPrice,
        createdAt: orderItems.createdAt,
        productName: products.name,
        productName_en: products.name_en,
        productName_he: products.name_he,
        productName_ar: products.name_ar,
        productDescription: products.description,
        productDescription_en: products.description_en,
        productDescription_he: products.description_he,
        productDescription_ar: products.description_ar,
        productPrice: products.price,
        productUnit: products.unit,
        productPricePerKg: products.pricePerKg,
        productImageUrl: products.imageUrl,
        productImageUrl_en: products.imageUrl_en,
        productImageUrl_he: products.imageUrl_he,
        productImageUrl_ar: products.imageUrl_ar,
        productIsActive: products.isActive,
        productIsAvailable: products.isAvailable,
        productStockStatus: products.stockStatus,
        productAvailabilityStatus: products.availabilityStatus,
        productIsSpecialOffer: products.isSpecialOffer,
        productDiscountType: products.discountType,
        productDiscountValue: products.discountValue,
        productSortOrder: products.sortOrder,
        productCreatedAt: products.createdAt,
        productUpdatedAt: products.updatedAt,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    // Get user data
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, order.userId || ''));

    return {
      ...order,
      items: itemsData.map(item => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        pricePerKg: item.pricePerKg,
        totalPrice: item.totalPrice,
        createdAt: item.createdAt,
        product: {
          id: item.productId,
          name: item.productName,
          name_en: item.productName_en,
          name_he: item.productName_he,
          name_ar: item.productName_ar,
          description: item.productDescription,
          description_en: item.productDescription_en,
          description_he: item.productDescription_he,
          description_ar: item.productDescription_ar,
          price: item.productPrice,
          unit: item.productUnit,
          pricePerKg: item.productPricePerKg,
          imageUrl: item.productImageUrl,
          imageUrl_en: item.productImageUrl_en,
          imageUrl_he: item.productImageUrl_he,
          imageUrl_ar: item.productImageUrl_ar,
          isActive: item.productIsActive,
          isAvailable: item.productIsAvailable,
          stockStatus: item.productStockStatus,
          availabilityStatus: item.productAvailabilityStatus,
          isSpecialOffer: item.productIsSpecialOffer,
          discountType: item.productDiscountType,
          discountValue: item.productDiscountValue,
          sortOrder: item.productSortOrder,
          createdAt: item.productCreatedAt,
          updatedAt: item.productUpdatedAt,
        }
      })),
      user: userData || null,
    } as OrderWithItems;
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    return await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values(order)
        .returning();

      const itemsWithOrderId = items.map(item => ({
        ...item,
        orderId: newOrder.id,
      }));

      await tx.insert(orderItems).values(itemsWithOrderId);

      return newOrder;
    });
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...orderData, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderStatus(id: number, status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderItems(orderId: number, items: any[]): Promise<void> {
    return await db.transaction(async (tx) => {
      // Delete existing order items
      await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
      
      // Insert new order items
      if (items.length > 0) {
        const orderItemsData = items.map(item => ({
          orderId,
          productId: item.product?.id || item.productId,
          quantity: item.quantity.toString(),
          pricePerKg: (item.pricePerUnit || item.pricePerKg || item.price || 0).toString(),
          totalPrice: (item.totalPrice || 0).toString()
        }));
        
        await tx.insert(orderItems).values(orderItemsData);
      }
    });
  }

  // Store settings
  async getStoreSettings(): Promise<StoreSettings | undefined> {
    const [settings] = await db.select().from(storeSettings).limit(1);
    return settings;
  }

  async updateStoreSettings(settings: Partial<InsertStoreSettings>): Promise<StoreSettings> {
    const existingSettings = await this.getStoreSettings();
    
    if (existingSettings) {
      const [updatedSettings] = await db
        .update(storeSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(storeSettings.id, existingSettings.id))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(storeSettings)
        .values([{
          storeName: settings.storeName || 'eDAHouse',
          defaultItemsPerPage: settings.defaultItemsPerPage || 10,
          ...settings
        }])
        .returning();
      return newSettings;
    }
  }

  // User operations with pagination
  async getUsersPaginated(params: PaginationParams): Promise<PaginatedResult<User & { orderCount: number; totalOrderAmount: number }>> {
    const { page, limit, search, status, sortField, sortDirection } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          sql`${users.username} ILIKE ${'%' + search + '%'}`,
          sql`${users.email} ILIKE ${'%' + search + '%'}`,
          sql`${users.firstName} ILIKE ${'%' + search + '%'}`,
          sql`${users.lastName} ILIKE ${'%' + search + '%'}`,
          sql`${users.phone} ILIKE ${'%' + search + '%'}`
        )
      );
    }
    
    // Filter by role
    if (status && status !== 'all') {
      conditions.push(sql`${users.role} = ${status}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    let orderBy;
    if (sortField === 'email') {
      orderBy = sortDirection === 'desc' ? desc(users.email) : asc(users.email);
    } else if (sortField === 'createdAt') {
      orderBy = sortDirection === 'desc' ? desc(users.createdAt) : asc(users.createdAt);
    } else {
      orderBy = desc(users.createdAt);
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);
    
    const total = totalResult?.count || 0;

    // Get paginated data with order statistics
    const data = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        phone: users.phone,
        defaultAddress: users.defaultAddress,
        password: users.password,
        passwordResetToken: users.passwordResetToken,
        passwordResetExpires: users.passwordResetExpires,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        orderCount: sql<number>`COALESCE(COUNT(${orders.id}), 0)`,
        totalOrderAmount: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .where(whereClause)
      .groupBy(users.id, users.username, users.email, users.firstName, users.lastName, users.profileImageUrl, users.phone, users.defaultAddress, users.password, users.passwordResetToken, users.passwordResetExpires, users.role, users.createdAt, users.updatedAt)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Admin user management methods
  async createUser(userData: Omit<UpsertUser, 'id'> & { password?: string }): Promise<User> {
    // Generate a unique ID for manual user creation
    const userId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserRole(id: string, role: "admin" | "worker" | "customer"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // Password management methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        updatedAt: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; userId: string }> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return { token, userId: user.id };
  }

  async validatePasswordResetToken(token: string): Promise<{ userId: string; isValid: boolean }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));

    if (!user) {
      return { userId: "", isValid: false };
    }

    const isExpired = user.passwordResetExpires && user.passwordResetExpires < new Date();
    if (isExpired) {
      await this.clearPasswordResetToken(user.id);
      return { userId: user.id, isValid: false };
    }

    return { userId: user.id, isValid: true };
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Theme management methods
  async getThemes(): Promise<Theme[]> {
    return await db.select().from(themes).orderBy(themes.createdAt);
  }

  async getActiveTheme(): Promise<Theme | undefined> {
    const [activeTheme] = await db
      .select()
      .from(themes)
      .where(eq(themes.isActive, true))
      .limit(1);
    return activeTheme;
  }

  async getThemeById(id: string): Promise<Theme | undefined> {
    const [theme] = await db
      .select()
      .from(themes)
      .where(eq(themes.id, id))
      .limit(1);
    return theme;
  }

  async createTheme(theme: InsertTheme): Promise<Theme> {
    const themeWithId = {
      ...theme,
      id: theme.id || crypto.randomUUID()
    };
    
    const [newTheme] = await db
      .insert(themes)
      .values([themeWithId])
      .returning();
    return newTheme;
  }

  async updateTheme(id: string, theme: Partial<InsertTheme>): Promise<Theme> {
    const [updatedTheme] = await db
      .update(themes)
      .set({
        ...theme,
        updatedAt: new Date(),
      })
      .where(eq(themes.id, id))
      .returning();
    return updatedTheme;
  }

  async deleteTheme(id: string): Promise<void> {
    await db.delete(themes).where(eq(themes.id, id));
  }

  async activateTheme(id: string): Promise<Theme> {
    return await db.transaction(async (tx) => {
      // Deactivate all themes
      await tx
        .update(themes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(themes.isActive, true));

      // Activate the selected theme
      const [activatedTheme] = await tx
        .update(themes)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(themes.id, id))
        .returning();

      return activatedTheme;
    });
  }
}

export const storage = new DatabaseStorage();
