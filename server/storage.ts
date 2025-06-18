import {
  users,
  categories,
  products,
  orders,
  orderItems,
  storeSettings,
  type User,
  type UpsertUser,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, sql, not, ne, count, asc, or, isNotNull } from "drizzle-orm";

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
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
  deleteProduct(id: number): Promise<void>;
  searchProducts(query: string): Promise<ProductWithCategory[]>;

  // Order operations
  getOrders(userId?: string): Promise<OrderWithItems[]>;
  getOrdersPaginated(params: PaginationParams): Promise<PaginatedResult<OrderWithItems>>;
  getOrderById(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: number, status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"): Promise<Order>;

  // User operations with pagination
  getUsersPaginated(params: PaginationParams): Promise<PaginatedResult<User>>;

  // Store settings
  getStoreSettings(): Promise<StoreSettings | undefined>;
  updateStoreSettings(settings: InsertStoreSettings): Promise<StoreSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
        conditions.push(
          or(
            eq(products.isSpecialOffer, true),
            and(
              isNotNull(products.discountValue),
              ne(products.discountValue, "0"),
              ne(products.discountValue, "")
            )
          )
        );
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
    });
  }

  async getOrdersPaginated(params: PaginationParams): Promise<PaginatedResult<OrderWithItems>> {
    const { page, limit, search, status, sortField, sortDirection } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(like(orders.customerPhone, `%${search}%`));
    }
    
    if (status && status !== 'all') {
      conditions.push(eq(orders.status, status as any));
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
      data,
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
    });
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

  async updateOrderStatus(id: number, status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled"): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
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
  async getUsersPaginated(params: PaginationParams): Promise<PaginatedResult<User>> {
    const { page, limit, search, sortField, sortDirection } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        like(users.email, `%${search}%`)
      );
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

    // Get paginated data
    const data = await db
      .select()
      .from(users)
      .where(whereClause)
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
}

export const storage = new DatabaseStorage();
