import {
  users,
  userAddresses,
  categories,
  products,
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
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithItems,
  type CategoryWithProducts,
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
  getCategories(): Promise<CategoryWithProducts[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Product operations
  getProducts(categoryId?: number): Promise<ProductWithCategory[]>;
  getProductsPaginated(params: PaginationParams): Promise<PaginatedResult<ProductWithCategory>>;
  getProductById(id: number): Promise<ProductWithCategory | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  updateProductAvailability(id: number, availabilityStatus: "available" | "out_of_stock_today" | "completely_unavailable"): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  searchProducts(query: string): Promise<ProductWithCategory[]>;

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
  updateStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings>;

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
  async getCategories(): Promise<CategoryWithProducts[]> {
    return await db.query.categories.findMany({
      with: {
        products: {
          where: eq(products.isActive, true),
          orderBy: [products.sortOrder, products.name],
        },
      },
      where: eq(categories.isActive, true),
      orderBy: [categories.sortOrder, categories.name],
    });
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

  // Product operations
  async getProducts(categoryId?: number): Promise<ProductWithCategory[]> {
    const whereClause = categoryId 
      ? and(
          eq(products.isActive, true), 
          eq(products.categoryId, categoryId),
          ne(products.stockStatus, 'out_of_stock')
        )
      : and(
          eq(products.isActive, true),
          ne(products.stockStatus, 'out_of_stock')
        );

    return await db.query.products.findMany({
      with: {
        category: true,
      },
      where: whereClause,
      orderBy: [products.sortOrder, products.name],
    });
  }

  async getProductsPaginated(params: PaginationParams): Promise<PaginatedResult<ProductWithCategory>> {
    const { page, limit, search, categoryId, status, sortField, sortDirection } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }
    
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
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
    const data = await db.query.products.findMany({
      with: {
        category: true,
      },
      where: whereClause,
      orderBy,
      limit,
      offset,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: number): Promise<ProductWithCategory | undefined> {
    return await db.query.products.findFirst({
      with: {
        category: true,
      },
      where: eq(products.id, id),
    });
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
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
    await db.delete(products).where(eq(products.id, id));
  }

  async searchProducts(query: string): Promise<ProductWithCategory[]> {
    return await db.query.products.findMany({
      with: {
        category: true,
      },
      where: and(
        eq(products.isActive, true),
        ne(products.stockStatus, 'out_of_stock'),
        like(products.name, `%${query}%`)
      ),
      orderBy: [products.name],
    });
  }

  // Order operations
  async getOrders(userId?: string): Promise<OrderWithItems[]> {
    const whereClause = userId ? eq(orders.userId, userId) : undefined;

    return await db.query.orders.findMany({
      with: {
        items: {
          with: {
            product: true,
          },
        },
        user: true,
      },
      where: whereClause,
      orderBy: [desc(orders.createdAt)],
    }) as OrderWithItems[];
  }

  async getOrdersPaginated(params: PaginationParams): Promise<PaginatedResult<OrderWithItems>> {
    const { page, limit, search, status, sortField, sortDirection } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(orders.customerPhone, `%${search}%`),
          like(orders.deliveryAddress, `%${search}%`)
        )
      );
    }
    
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

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(whereClause);
    
    const total = totalResult?.count || 0;

    // Get paginated data
    const data = await db.query.orders.findMany({
      with: {
        items: {
          with: {
            product: true,
          },
        },
        user: true,
      },
      where: whereClause,
      orderBy,
      limit,
      offset,
    });

    return {
      data: data as OrderWithItems[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderById(id: number): Promise<OrderWithItems | undefined> {
    return await db.query.orders.findFirst({
      with: {
        items: {
          with: {
            product: true,
          },
        },
        user: true,
      },
      where: eq(orders.id, id),
    }) as OrderWithItems | undefined;
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

  async updateStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings> {
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
        .values(settings)
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
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
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
    const [newTheme] = await db
      .insert(themes)
      .values({
        ...theme,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
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
