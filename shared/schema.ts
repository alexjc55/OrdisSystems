import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "worker", "customer"] }).default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("100g").notNull(), // "100g", "100ml", "piece", "kg"
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }).notNull(), // For backward compatibility
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  stockStatus: varchar("stock_status", { enum: ["in_stock", "low_stock", "out_of_stock"] }).default("in_stock").notNull(),
  isSpecialOffer: boolean("is_special_offer").default(false).notNull(),
  discountType: varchar("discount_type", { enum: ["percentage", "fixed"] }),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  status: varchar("status", { enum: ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"] }).default("pending").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  customerNotes: text("customer_notes"),
  deliveryAddress: text("delivery_address"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  deliveryDate: varchar("delivery_date", { length: 20 }), // Format: YYYY-MM-DD
  deliveryTime: varchar("delivery_time", { length: 20 }), // Format: HH:MM
  requestedDeliveryTime: timestamp("requested_delivery_time"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // weight in kg
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Store settings table
export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  storeName: varchar("store_name", { length: 255 }).notNull(),
  welcomeTitle: varchar("welcome_title", { length: 255 }),
  storeDescription: text("store_description"),
  logoUrl: varchar("logo_url", { length: 500 }),
  bannerImage: varchar("banner_image", { length: 500 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  address: text("address"),
  workingHours: jsonb("working_hours"), // Store as JSON object
  deliveryInfo: text("delivery_info"),
  paymentInfo: text("payment_info"),
  aboutUsPhotos: jsonb("about_us_photos"), // Array of photo URLs
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("15.00"),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("50.00"),
  minDeliveryTimeHours: integer("min_delivery_time_hours").default(2), // Minimum hours for delivery
  maxDeliveryTimeDays: integer("max_delivery_time_days").default(4), // Maximum days for delivery
  paymentMethods: jsonb("payment_methods"), // Array of payment methods
  isDeliveryEnabled: boolean("is_delivery_enabled").default(true),
  isPickupEnabled: boolean("is_pickup_enabled").default(true),
  discountBadgeText: varchar("discount_badge_text", { length: 50 }).default("Скидка"),
  showBannerImage: boolean("show_banner_image").default(true),
  showTitleDescription: boolean("show_title_description").default(true),
  showInfoBlocks: boolean("show_info_blocks").default(true),
  showSpecialOffers: boolean("show_special_offers").default(true),
  showCategoryMenu: boolean("show_category_menu").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Schemas for validation
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unit: z.enum(["100g", "100ml", "piece", "kg"]).default("100g"),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.string().nullable().optional(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type StoreSettings = typeof storeSettings.$inferSelect;

// Extended types with relations
export type ProductWithCategory = Product & {
  category: Category;
};

export type OrderWithItems = Order & {
  items: Array<OrderItem & { product: Product }>;
  user: User;
};

export type CategoryWithProducts = Category & {
  products: Product[];
};
