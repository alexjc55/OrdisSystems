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

// User storage table (independent authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  defaultAddress: text("default_address"),
  password: varchar("password").notNull(), // For local authentication
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  role: varchar("role", { enum: ["admin", "worker", "customer"] }).default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User addresses table for multiple addresses
export const userAddresses = pgTable("user_addresses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  label: varchar("label", { length: 100 }).notNull(), // "Дом", "Работа", etc.
  address: text("address").notNull(),
  isDefault: boolean("is_default").default(false),
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
  userId: varchar("user_id").references(() => users.id),
  status: varchar("status", { enum: ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"] }).default("pending").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  customerNotes: text("customer_notes"),
  deliveryAddress: text("delivery_address"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  deliveryDate: varchar("delivery_date", { length: 20 }), // Format: YYYY-MM-DD
  deliveryTime: varchar("delivery_time", { length: 50 }), // Format: HH:MM - HH:MM
  requestedDeliveryTime: timestamp("requested_delivery_time"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  cancellationReason: text("cancellation_reason"),
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
  freeDeliveryFrom: decimal("free_delivery_from", { precision: 10, scale: 2 }).default("50.00"),
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
  weekStartDay: varchar("week_start_day", { length: 10 }).default("monday"), // "monday" or "sunday"
  bottomBanner1Url: varchar("bottom_banner1_url", { length: 500 }),
  bottomBanner1Link: varchar("bottom_banner1_link", { length: 500 }),
  bottomBanner2Url: varchar("bottom_banner2_url", { length: 500 }),
  bottomBanner2Link: varchar("bottom_banner2_link", { length: 500 }),
  showBottomBanners: boolean("show_bottom_banners").default(false),
  defaultItemsPerPage: integer("default_items_per_page").default(10), // Default pagination size
  headerHtml: text("header_html"), // Custom HTML/JS code for header
  footerHtml: text("footer_html"), // Custom HTML/JS code for footer
  cancellationReasons: jsonb("cancellation_reasons"), // Array of cancellation reason strings
  showWhatsAppChat: boolean("show_whatsapp_chat").default(false), // Enable/disable WhatsApp chat widget
  whatsappPhoneNumber: varchar("whatsapp_phone_number", { length: 20 }), // WhatsApp phone number
  whatsappDefaultMessage: text("whatsapp_default_message"), // Default WhatsApp message
  authPageTitle: varchar("auth_page_title", { length: 255 }).default("Добро пожаловать в eDAHouse"),
  authPageSubtitle: text("auth_page_subtitle").default("Готовые блюда высокого качества с доставкой на дом"),
  authPageFeature1: varchar("auth_page_feature1", { length: 255 }).default("Свежие готовые блюда каждый день"),
  authPageFeature2: varchar("auth_page_feature2", { length: 255 }).default("Быстрая доставка в удобное время"),
  authPageFeature3: varchar("auth_page_feature3", { length: 255 }).default("Широкий выбор блюд на любой вкус"),
  showCartBanner: boolean("show_cart_banner").default(false), // Enable/disable cart banner
  cartBannerType: varchar("cart_banner_type", { enum: ["image", "text"] }).default("text"), // Banner type
  cartBannerImage: varchar("cart_banner_image", { length: 500 }), // Banner image URL
  cartBannerText: text("cart_banner_text"), // Banner text content
  cartBannerBgColor: varchar("cart_banner_bg_color", { length: 7 }).default("#f97316"), // Background color for text banner
  cartBannerTextColor: varchar("cart_banner_text_color", { length: 7 }).default("#ffffff"), // Text color for text banner
  workerPermissions: jsonb("worker_permissions").default({
    canManageProducts: true,
    canManageCategories: true,
    canManageOrders: true,
    canViewUsers: false,
    canManageUsers: false,
    canViewSettings: false,
    canManageSettings: false
  }),
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

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  addresses: many(userAddresses),
}));

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
  }),
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
}).extend({
  defaultItemsPerPage: z.number().int().min(1).max(1000).default(10),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
});

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
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
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;
export type UserAddress = typeof userAddresses.$inferSelect;

// Extended types with relations
export type ProductWithCategory = Product & {
  category: Category;
};

export type OrderWithItems = Order & {
  items: Array<OrderItem & { product: Product }>;
  user: User | null;
};

export type CategoryWithProducts = Category & {
  products: Product[];
};
