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
  type CategoryWithCount,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithItems,
  type StoreSettings,
  type InsertStoreSettings,
  type Theme,
  type InsertTheme,
} from "@shared/schema";
import { getDB } from "./db";
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
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const db = await getDB();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await getDB();
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = await getDB();
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const db = await getDB();
    const lowerUsername = userData.username ? userData.username.toLowerCase() : '';
    const lowerEmail = userData.email ? userData.email.toLowerCase() : '';
    
    const userToInsert = {
      ...userData,
      username: lowerUsername,
      email: lowerEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [user] = await db.insert(users).values(userToInsert).onConflictDoUpdate({
      target: users.id,
      set: {
        username: lowerUsername,
        email: lowerEmail,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role,
        updatedAt: new Date()
      }
    }).returning();
    
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const db = await getDB();
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    if (updates.username) {
      updateData.username = updates.username.toLowerCase();
    }
    if (updates.email) {
      updateData.email = updates.email.toLowerCase();
    }
    
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  // User address operations
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    const db = await getDB();
    return await db.select().from(userAddresses).where(eq(userAddresses.userId, userId)).orderBy(desc(userAddresses.isDefault), userAddresses.label);
  }

  async createUserAddress(address: InsertUserAddress): Promise<UserAddress> {
    const db = await getDB();
    // If this is set as default, unset all other defaults for this user
    if (address.isDefault) {
      await db.update(userAddresses).set({ isDefault: false }).where(eq(userAddresses.userId, address.userId));
    }
    
    const [newAddress] = await db.insert(userAddresses).values(address).returning();
    return newAddress;
  }

  async updateUserAddress(id: number, address: Partial<InsertUserAddress>): Promise<UserAddress> {
    const db = await getDB();
    // If this is being set as default, unset all other defaults for this user
    if (address.isDefault) {
      const existingAddress = await db.select().from(userAddresses).where(eq(userAddresses.id, id)).limit(1);
      if (existingAddress.length > 0) {
        await db.update(userAddresses).set({ isDefault: false }).where(eq(userAddresses.userId, existingAddress[0].userId));
      }
    }
    
    const [updatedAddress] = await db.update(userAddresses).set(address).where(eq(userAddresses.id, id)).returning();
    return updatedAddress;
  }

  async deleteUserAddress(id: number): Promise<void> {
    const db = await getDB();
    await db.delete(userAddresses).where(eq(userAddresses.id, id));
  }

  async setDefaultAddress(userId: string, addressId: number): Promise<void> {
    const db = await getDB();
    // First, unset all defaults for this user
    await db.update(userAddresses).set({ isDefault: false }).where(eq(userAddresses.userId, userId));
    
    // Then set the specified address as default
    await db.update(userAddresses).set({ isDefault: true }).where(and(eq(userAddresses.id, addressId), eq(userAddresses.userId, userId)));
  }

  // Category operations
  async getCategories(includeInactive = false): Promise<CategoryWithCount[]> {
    const db = await getDB();
    const query = db
      .select({
        id: categories.id,
        name: categories.name,
        name_en: categories.name_en,
        name_he: categories.name_he,
        name_ar: categories.name_ar,
        image: categories.image,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        productCount: count(products.id)
      })
      .from(categories)
      .leftJoin(productCategories, eq(categories.id, productCategories.categoryId))
      .leftJoin(products, and(eq(productCategories.productId, products.id), eq(products.isActive, true)))
      .groupBy(categories.id, categories.name, categories.name_en, categories.name_he, categories.name_ar, categories.image, categories.sortOrder, categories.isActive)
      .orderBy(categories.sortOrder, categories.name);

    if (!includeInactive) {
      query.where(eq(categories.isActive, true));
    }

    return await query;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const db = await getDB();
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const db = await getDB();
    const [newCategory] = await db.insert(categories).values({
      ...category,
      sortOrder: category.sortOrder || 0
    }).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const db = await getDB();
    const [updatedCategory] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    const db = await getDB();
    // First delete any product-category relationships
    await db.delete(productCategories).where(eq(productCategories.categoryId, id));
    // Then delete the category
    await db.delete(categories).where(eq(categories.id, id));
  }

  async updateCategoryOrders(categoryOrders: { id: number; sortOrder: number }[]): Promise<void> {
    const db = await getDB();
    for (const { id, sortOrder } of categoryOrders) {
      await db.update(categories).set({ sortOrder }).where(eq(categories.id, id));
    }
  }

  // Product operations
  async getProducts(categoryId?: number): Promise<ProductWithCategories[]> {
    const db = await getDB();
    let query = db
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
        image: products.image,
        unit: products.unit,
        weight: products.weight,
        isActive: products.isActive,
        availabilityStatus: products.availabilityStatus,
        categoryIds: sql<number[]>`array_agg(${productCategories.categoryId})`.as('categoryIds'),
        categories: sql<CategoryWithCount[]>`
          array_agg(
            json_build_object(
              'id', ${categories.id},
              'name', ${categories.name},
              'name_en', ${categories.name_en},
              'name_he', ${categories.name_he},
              'name_ar', ${categories.name_ar},
              'image', ${categories.image},
              'sortOrder', ${categories.sortOrder},
              'isActive', ${categories.isActive}
            )
          )
        `.as('categories')
      })
      .from(products)
      .leftJoin(productCategories, eq(products.id, productCategories.productId))
      .leftJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(products.isActive, true))
      .groupBy(products.id);

    if (categoryId) {
      query = query.having(sql`${productCategories.categoryId} = ${categoryId}`);
    }

    const result = await query;
    
    return result.map((p: any) => ({
      ...p,
      categoryIds: p.categoryIds.filter((id: number) => id !== null),
      categories: p.categories.filter((cat: any) => cat.id !== null)
    }));
  }

  async getProductsPaginated(params: PaginationParams): Promise<PaginatedResult<ProductWithCategories>> {
    const db = await getDB();
    const { page, limit, search, categoryId, sortField = 'name', sortDirection = 'asc' } = params;
    const offset = (page - 1) * limit;

    let baseQuery = db
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
        image: products.image,
        unit: products.unit,
        weight: products.weight,
        isActive: products.isActive,
        availabilityStatus: products.availabilityStatus,
        categoryIds: sql<number[]>`array_agg(${productCategories.categoryId})`.as('categoryIds'),
        categories: sql<CategoryWithCount[]>`
          array_agg(
            json_build_object(
              'id', ${categories.id},
              'name', ${categories.name},
              'name_en', ${categories.name_en},
              'name_he', ${categories.name_he},
              'name_ar', ${categories.name_ar},
              'image', ${categories.image},
              'sortOrder', ${categories.sortOrder},
              'isActive', ${categories.isActive}
            )
          )
        `.as('categories')
      })
      .from(products)
      .leftJoin(productCategories, eq(products.id, productCategories.productId))
      .leftJoin(categories, eq(productCategories.categoryId, categories.id));

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.name_en, `%${search}%`),
          like(products.name_he, `%${search}%`),
          like(products.name_ar, `%${search}%`),
          like(products.description, `%${search}%`),
          like(products.description_en, `%${search}%`),
          like(products.description_he, `%${search}%`),
          like(products.description_ar, `%${search}%`)
        )
      );
    }

    if (categoryId) {
      conditions.push(eq(productCategories.categoryId, categoryId));
    }

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    baseQuery = baseQuery.groupBy(products.id);

    // Get total count
    const countQuery = db
      .select({ count: count() })
      .from(products)
      .leftJoin(productCategories, eq(products.id, productCategories.productId));

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    // Apply sorting and pagination
    const sortColumn = sortField === 'price' ? products.price : products.name;
    const sortOrder = sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn);
    
    const result = await baseQuery
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const data = result.map((p: any) => ({
      ...p,
      categoryIds: p.categoryIds.filter((id: number) => id !== null),
      categories: p.categories.filter((cat: any) => cat.id !== null)
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getProductById(id: number): Promise<ProductWithCategories | undefined> {
    const db = await getDB();
    const result = await db
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
        image: products.image,
        unit: products.unit,
        weight: products.weight,
        isActive: products.isActive,
        availabilityStatus: products.availabilityStatus,
        categoryIds: sql<number[]>`array_agg(${productCategories.categoryId})`.as('categoryIds'),
        categories: sql<CategoryWithCount[]>`
          array_agg(
            json_build_object(
              'id', ${categories.id},
              'name', ${categories.name},
              'name_en', ${categories.name_en},
              'name_he', ${categories.name_he},
              'name_ar', ${categories.name_ar},
              'image', ${categories.image},
              'sortOrder', ${categories.sortOrder},
              'isActive', ${categories.isActive}
            )
          )
        `.as('categories')
      })
      .from(products)
      .leftJoin(productCategories, eq(products.id, productCategories.productId))
      .leftJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(products.id, id))
      .groupBy(products.id);

    if (result.length === 0) return undefined;

    const product = result[0];
    return {
      ...product,
      categoryIds: product.categoryIds.filter((id: number) => id !== null),
      categories: product.categories.filter((cat: any) => cat.id !== null)
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const db = await getDB();
    const [newProduct] = await db.insert(products).values(product).returning();
    
    // If categoryIds are provided, create the relationships
    if (product.categoryIds && product.categoryIds.length > 0) {
      const categoryRelations = product.categoryIds.map(categoryId => ({
        productId: newProduct.id,
        categoryId
      }));
      await db.insert(productCategories).values(categoryRelations);
    }
    
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const db = await getDB();
    const [updatedProduct] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    
    // If categoryIds are provided, update the relationships
    if (product.categoryIds !== undefined) {
      // Delete existing relationships
      await db.delete(productCategories).where(eq(productCategories.productId, id));
      
      // Create new relationships if any
      if (product.categoryIds.length > 0) {
        const categoryRelations = product.categoryIds.map(categoryId => ({
          productId: id,
          categoryId
        }));
        await db.insert(productCategories).values(categoryRelations);
      }
    }
    
    return updatedProduct;
  }

  async updateProductAvailability(id: number, availabilityStatus: "available" | "out_of_stock_today" | "completely_unavailable"): Promise<Product> {
    const db = await getDB();
    const [updatedProduct] = await db.update(products).set({ availabilityStatus }).where(eq(products.id, id)).returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    const db = await getDB();
    // First delete any product-category relationships
    await db.delete(productCategories).where(eq(productCategories.productId, id));
    // Then delete the product
    await db.delete(products).where(eq(products.id, id));
  }

  async searchProducts(query: string): Promise<ProductWithCategories[]> {
    const db = await getDB();
    const result = await db
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
        image: products.image,
        unit: products.unit,
        weight: products.weight,
        isActive: products.isActive,
        availabilityStatus: products.availabilityStatus,
        categoryIds: sql<number[]>`array_agg(${productCategories.categoryId})`.as('categoryIds'),
        categories: sql<CategoryWithCount[]>`
          array_agg(
            json_build_object(
              'id', ${categories.id},
              'name', ${categories.name},
              'name_en', ${categories.name_en},
              'name_he', ${categories.name_he},
              'name_ar', ${categories.name_ar},
              'image', ${categories.image},
              'sortOrder', ${categories.sortOrder},
              'isActive', ${categories.isActive}
            )
          )
        `.as('categories')
      })
      .from(products)
      .leftJoin(productCategories, eq(products.id, productCategories.productId))
      .leftJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(
        and(
          eq(products.isActive, true),
          or(
            like(products.name, `%${query}%`),
            like(products.name_en, `%${query}%`),
            like(products.name_he, `%${query}%`),
            like(products.name_ar, `%${query}%`),
            like(products.description, `%${query}%`),
            like(products.description_en, `%${query}%`),
            like(products.description_he, `%${query}%`),
            like(products.description_ar, `%${query}%`)
          )
        )
      )
      .groupBy(products.id);

    return result.map((p: any) => ({
      ...p,
      categoryIds: p.categoryIds.filter((id: number) => id !== null),
      categories: p.categories.filter((cat: any) => cat.id !== null)
    }));
  }

  // Order operations
  async getOrders(userId?: string): Promise<OrderWithItems[]> {
    const db = await getDB();
    let query = db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryFee: orders.deliveryFee,
        paymentMethod: orders.paymentMethod,
        deliveryDate: orders.deliveryDate,
        deliveryTime: orders.deliveryTime,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        deliveryAddress: orders.deliveryAddress,
        notes: orders.notes,
        cancellationReason: orders.cancellationReason,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        items: sql<OrderItem[]>`
          array_agg(
            json_build_object(
              'id', ${orderItems.id},
              'orderId', ${orderItems.orderId},
              'productId', ${orderItems.productId},
              'productName', ${orderItems.productName},
              'productPrice', ${orderItems.productPrice},
              'quantity', ${orderItems.quantity},
              'unit', ${orderItems.unit},
              'totalPrice', ${orderItems.totalPrice},
              'discountAmount', ${orderItems.discountAmount}
            )
          )
        `.as('items')
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId));

    if (userId) {
      query = query.where(eq(orders.userId, userId));
    }

    const result = await query
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt));

    return result.map((order: any) => ({
      ...order,
      items: order.items.filter((item: any) => item.id !== null)
    }));
  }

  async getOrdersPaginated(params: PaginationParams): Promise<PaginatedResult<OrderWithItems>> {
    const db = await getDB();
    const { page, limit, search, status, sortField = 'createdAt', sortDirection = 'desc' } = params;
    const offset = (page - 1) * limit;

    let baseQuery = db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryFee: orders.deliveryFee,
        paymentMethod: orders.paymentMethod,
        deliveryDate: orders.deliveryDate,
        deliveryTime: orders.deliveryTime,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        deliveryAddress: orders.deliveryAddress,
        notes: orders.notes,
        cancellationReason: orders.cancellationReason,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        items: sql<OrderItem[]>`
          array_agg(
            json_build_object(
              'id', ${orderItems.id},
              'orderId', ${orderItems.orderId},
              'productId', ${orderItems.productId},
              'productName', ${orderItems.productName},
              'productPrice', ${orderItems.productPrice},
              'quantity', ${orderItems.quantity},
              'unit', ${orderItems.unit},
              'totalPrice', ${orderItems.totalPrice},
              'discountAmount', ${orderItems.discountAmount}
            )
          )
        `.as('items')
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId));

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(orders.customerName, `%${search}%`),
          like(orders.customerEmail, `%${search}%`),
          like(orders.customerPhone, `%${search}%`),
          sql`${orders.id}::text LIKE ${`%${search}%`}`
        )
      );
    }

    if (status) {
      conditions.push(eq(orders.status, status as any));
    }

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    baseQuery = baseQuery.groupBy(orders.id);

    // Get total count
    const countQuery = db.select({ count: count() }).from(orders);
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    // Apply sorting and pagination
    const sortColumn = sortField === 'totalAmount' ? orders.totalAmount : orders.createdAt;
    const sortOrder = sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn);
    
    const result = await baseQuery
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    const data = result.map((order: any) => ({
      ...order,
      items: order.items.filter((item: any) => item.id !== null)
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getOrderById(id: number): Promise<OrderWithItems | undefined> {
    const db = await getDB();
    const result = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryFee: orders.deliveryFee,
        paymentMethod: orders.paymentMethod,
        deliveryDate: orders.deliveryDate,
        deliveryTime: orders.deliveryTime,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        deliveryAddress: orders.deliveryAddress,
        notes: orders.notes,
        cancellationReason: orders.cancellationReason,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        items: sql<OrderItem[]>`
          array_agg(
            json_build_object(
              'id', ${orderItems.id},
              'orderId', ${orderItems.orderId},
              'productId', ${orderItems.productId},
              'productName', ${orderItems.productName},
              'productPrice', ${orderItems.productPrice},
              'quantity', ${orderItems.quantity},
              'unit', ${orderItems.unit},
              'totalPrice', ${orderItems.totalPrice},
              'discountAmount', ${orderItems.discountAmount}
            )
          )
        `.as('items')
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(eq(orders.id, id))
      .groupBy(orders.id);

    if (result.length === 0) return undefined;

    const order = result[0];
    return {
      ...order,
      items: order.items.filter((item: any) => item.id !== null)
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const db = await getDB();
    return await db.transaction(async (tx) => {
      const [newOrder] = await tx.insert(orders).values(order).returning();
      
      const orderItemsWithOrderId = items.map(item => ({
        ...item,
        orderId: newOrder.id
      }));
      
      await tx.insert(orderItems).values(orderItemsWithOrderId);
      
      return newOrder;
    });
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order> {
    const db = await getDB();
    const [updatedOrder] = await db.update(orders).set({
      ...orderData,
      updatedAt: new Date()
    }).where(eq(orders.id, id)).returning();
    return updatedOrder;
  }

  async updateOrderStatus(id: number, status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"): Promise<Order> {
    const db = await getDB();
    const [updatedOrder] = await db.update(orders).set({
      status,
      updatedAt: new Date()
    }).where(eq(orders.id, id)).returning();
    return updatedOrder;
  }

  async updateOrderItems(orderId: number, items: any[]): Promise<void> {
    const db = await getDB();
    await db.transaction(async (tx) => {
      // Delete existing items
      await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
      
      // Insert new items
      if (items.length > 0) {
        const itemsWithOrderId = items.map(item => ({
          ...item,
          orderId
        }));
        await tx.insert(orderItems).values(itemsWithOrderId);
      }
    });
  }

  // Store settings
  async getStoreSettings(): Promise<StoreSettings | undefined> {
    const db = await getDB();
    const [settings] = await db.select().from(storeSettings).limit(1);
    return settings;
  }

  async updateStoreSettings(settings: Partial<InsertStoreSettings>): Promise<StoreSettings> {
    const db = await getDB();
    const existingSettings = await this.getStoreSettings();
    
    if (existingSettings) {
      const [updatedSettings] = await db.update(storeSettings).set(settings).where(eq(storeSettings.id, existingSettings.id)).returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db.insert(storeSettings).values({
        id: 1,
        ...settings
      } as InsertStoreSettings).returning();
      return newSettings;
    }
  }

  // User management (admin)
  async getUsersPaginated(params: PaginationParams): Promise<PaginatedResult<User & { orderCount: number; totalOrderAmount: number }>> {
    const db = await getDB();
    const { page, limit, search, sortField = 'createdAt', sortDirection = 'desc' } = params;
    const offset = (page - 1) * limit;

    let baseQuery = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        orderCount: count(orders.id),
        totalOrderAmount: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`.as('totalOrderAmount')
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId));

    // Apply search filter
    if (search) {
      baseQuery = baseQuery.where(
        or(
          like(users.username, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      );
    }

    baseQuery = baseQuery.groupBy(users.id);

    // Get total count
    const countQuery = db.select({ count: count() }).from(users);
    if (search) {
      countQuery.where(
        or(
          like(users.username, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      );
    }
    const [{ count: total }] = await countQuery;

    // Apply sorting and pagination
    const sortColumn = sortField === 'username' ? users.username : 
                      sortField === 'email' ? users.email :
                      sortField === 'firstName' ? users.firstName :
                      sortField === 'lastName' ? users.lastName :
                      sortField === 'role' ? users.role :
                      users.createdAt;
    const sortOrder = sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn);
    
    const data = await baseQuery
      .orderBy(sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async createUser(userData: Omit<UpsertUser, 'id'> & { password?: string }): Promise<User> {
    const db = await getDB();
    const userToInsert = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: userData.username?.toLowerCase() || '',
      email: userData.email?.toLowerCase() || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phone: userData.phone || '',
      role: userData.role || 'customer' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [user] = await db.insert(users).values(userToInsert).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const db = await getDB();
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    if (updates.username) {
      updateData.username = updates.username.toLowerCase();
    }
    if (updates.email) {
      updateData.email = updates.email.toLowerCase();
    }
    
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserRole(id: string, role: "admin" | "worker" | "customer"): Promise<User> {
    const db = await getDB();
    const [user] = await db.update(users).set({ 
      role,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return user;
  }

  // Password management
  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    const db = await getDB();
    const [user] = await db.update(users).set({
      passwordHash: hashedPassword,
      updatedAt: new Date()
    }).where(eq(users.id, userId)).returning();
    return user;
  }

  async createPasswordResetToken(email: string): Promise<{ token: string; userId: string }> {
    const db = await getDB();
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user) {
      throw new Error('User not found');
    }
    
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    await db.update(users).set({
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
      updatedAt: new Date()
    }).where(eq(users.id, user.id));
    
    return { token, userId: user.id };
  }

  async validatePasswordResetToken(token: string): Promise<{ userId: string; isValid: boolean }> {
    const db = await getDB();
    const [user] = await db.select().from(users).where(
      and(
        eq(users.passwordResetToken, token),
        sql`${users.passwordResetExpires} > NOW()`
      )
    );
    
    return {
      userId: user?.id || '',
      isValid: !!user
    };
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    const db = await getDB();
    await db.update(users).set({
      passwordResetToken: null,
      passwordResetExpires: null,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  // Theme management
  async getThemes(): Promise<Theme[]> {
    const db = await getDB();
    return await db.select().from(themes).orderBy(themes.createdAt);
  }

  async getActiveTheme(): Promise<Theme | undefined> {
    const db = await getDB();
    const [theme] = await db.select().from(themes).where(eq(themes.isActive, true));
    return theme;
  }

  async getThemeById(id: string): Promise<Theme | undefined> {
    const db = await getDB();
    const [theme] = await db.select().from(themes).where(eq(themes.id, id));
    return theme;
  }

  async createTheme(theme: InsertTheme): Promise<Theme> {
    const db = await getDB();
    const [newTheme] = await db.insert(themes).values({
      ...theme,
      id: theme.id || `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newTheme;
  }

  async updateTheme(id: string, theme: Partial<InsertTheme>): Promise<Theme> {
    const db = await getDB();
    const [updatedTheme] = await db.update(themes).set({
      ...theme,
      updatedAt: new Date()
    }).where(eq(themes.id, id)).returning();
    return updatedTheme;
  }

  async deleteTheme(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(themes).where(eq(themes.id, id));
  }

  async activateTheme(id: string): Promise<Theme> {
    const db = await getDB();
    return await db.transaction(async (tx) => {
      // Deactivate all themes
      await tx.update(themes).set({ isActive: false });
      
      // Activate the selected theme
      const [activatedTheme] = await tx.update(themes).set({ 
        isActive: true,
        updatedAt: new Date()
      }).where(eq(themes.id, id)).returning();
      
      return activatedTheme;
    });
  }
}

export const storage = new DatabaseStorage();