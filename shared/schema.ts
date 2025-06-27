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
  unique,
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

// Products table (removed categoryId - now using many-to-many relation)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("100g").notNull(), // "100g", "100ml", "piece", "kg"
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }).notNull(), // For backward compatibility
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  stockStatus: varchar("stock_status", { enum: ["in_stock", "low_stock", "out_of_stock"] }).default("in_stock").notNull(),
  availabilityStatus: varchar("availability_status", { enum: ["available", "out_of_stock_today", "completely_unavailable"] }).default("available").notNull(),
  isSpecialOffer: boolean("is_special_offer").default(false).notNull(),
  discountType: varchar("discount_type", { enum: ["percentage", "fixed"] }),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product categories junction table (many-to-many)
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure unique product-category combinations
  uniq: unique().on(table.productId, table.categoryId),
}));

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
  infoBlocksPosition: varchar("info_blocks_position", { enum: ["top", "bottom"] }).default("top"), // top = above offers, bottom = below banners
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
  headerStyle: varchar("header_style", { enum: ["classic", "modern", "minimal"] }).default("classic"), // Header design style
  bannerButtonText: varchar("banner_button_text", { length: 100 }).default("Смотреть каталог"), // Banner button text
  bannerButtonLink: varchar("banner_button_link", { length: 500 }).default("#categories"), // Banner button link
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
  defaultLanguage: varchar("default_language", { length: 5 }).default("ru"), // Default site language
  enabledLanguages: jsonb("enabled_languages").default(["ru", "en", "he"]), // Array of enabled language codes
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Themes table for theme management
export const themes = pgTable("themes", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(false),
  
  // Color configuration
  primaryColor: varchar("primary_color", { length: 20 }).notNull().default("hsl(24.6, 95%, 53.1%)"),
  primaryTextColor: varchar("primary_text_color", { length: 20 }).notNull().default("hsl(0, 0%, 100%)"),
  primaryDarkColor: varchar("primary_dark_color", { length: 20 }).notNull().default("hsl(20.5, 90%, 48%)"),
  primaryLightColor: varchar("primary_light_color", { length: 20 }).notNull().default("hsl(24.6, 95%, 96%)"),
  secondaryColor: varchar("secondary_color", { length: 20 }).notNull().default("hsl(210, 40%, 98%)"),
  accentColor: varchar("accent_color", { length: 20 }).notNull().default("hsl(210, 40%, 85%)"),
  
  // Status colors
  successColor: varchar("success_color", { length: 20 }).notNull().default("hsl(142, 76%, 36%)"),
  successLightColor: varchar("success_light_color", { length: 20 }).notNull().default("hsl(142, 76%, 96%)"),
  warningColor: varchar("warning_color", { length: 20 }).notNull().default("hsl(38, 92%, 50%)"),
  warningLightColor: varchar("warning_light_color", { length: 20 }).notNull().default("hsl(38, 92%, 96%)"),
  errorColor: varchar("error_color", { length: 20 }).notNull().default("hsl(0, 84%, 60%)"),
  errorLightColor: varchar("error_light_color", { length: 20 }).notNull().default("hsl(0, 84%, 96%)"),
  infoColor: varchar("info_color", { length: 20 }).notNull().default("hsl(221, 83%, 53%)"),
  infoLightColor: varchar("info_light_color", { length: 20 }).notNull().default("hsl(221, 83%, 96%)"),
  
  // Tomorrow button and out of stock colors
  tomorrowColor: varchar("tomorrow_color", { length: 20 }).notNull().default("hsl(262, 83%, 58%)"),
  tomorrowDarkColor: varchar("tomorrow_dark_color", { length: 20 }).notNull().default("hsl(262, 83%, 48%)"),
  tomorrowLightColor: varchar("tomorrow_light_color", { length: 20 }).notNull().default("hsl(262, 83%, 96%)"),
  outOfStockColor: varchar("out_of_stock_color", { length: 20 }).notNull().default("hsl(0, 84%, 60%)"),
  
  // Info block icon colors
  workingHoursIconColor: varchar("working_hours_icon_color", { length: 20 }).default("hsl(220, 91%, 54%)"),
  contactsIconColor: varchar("contacts_icon_color", { length: 20 }).default("hsl(142, 76%, 36%)"),
  paymentDeliveryIconColor: varchar("payment_delivery_icon_color", { length: 20 }).default("hsl(262, 83%, 58%)"),
  
  // Header layout style
  headerStyle: varchar("header_style", { length: 20 }).default("classic"), // "classic", "modern", "minimal"
  
  
  // Neutral colors
  whiteColor: varchar("white_color", { length: 20 }).notNull().default("hsl(0, 0%, 100%)"),
  gray50Color: varchar("gray50_color", { length: 20 }).notNull().default("hsl(210, 40%, 98%)"),
  gray100Color: varchar("gray100_color", { length: 20 }).notNull().default("hsl(210, 40%, 96%)"),
  gray200Color: varchar("gray200_color", { length: 20 }).notNull().default("hsl(214, 32%, 91%)"),
  gray300Color: varchar("gray300_color", { length: 20 }).notNull().default("hsl(213, 27%, 84%)"),
  gray400Color: varchar("gray400_color", { length: 20 }).notNull().default("hsl(215, 20%, 65%)"),
  gray500Color: varchar("gray500_color", { length: 20 }).notNull().default("hsl(215, 16%, 47%)"),
  gray600Color: varchar("gray600_color", { length: 20 }).notNull().default("hsl(215, 19%, 35%)"),
  gray700Color: varchar("gray700_color", { length: 20 }).notNull().default("hsl(215, 25%, 27%)"),
  gray800Color: varchar("gray800_color", { length: 20 }).notNull().default("hsl(217, 33%, 17%)"),
  gray900Color: varchar("gray900_color", { length: 20 }).notNull().default("hsl(222, 47%, 11%)"),
  
  // Typography
  fontFamilyPrimary: varchar("font_family_primary", { length: 100 }).notNull().default("Poppins, sans-serif"),
  fontFamilySecondary: varchar("font_family_secondary", { length: 100 }).notNull().default("Inter, sans-serif"),
  
  // Shadows for hover effects
  primaryShadow: varchar("primary_shadow", { length: 100 }).notNull().default("0 4px 14px 0 rgba(255, 102, 0, 0.3)"),
  successShadow: varchar("success_shadow", { length: 100 }).notNull().default("0 4px 14px 0 rgba(34, 197, 94, 0.3)"),
  warningShadow: varchar("warning_shadow", { length: 100 }).notNull().default("0 4px 14px 0 rgba(245, 158, 11, 0.3)"),
  errorShadow: varchar("error_shadow", { length: 100 }).notNull().default("0 4px 14px 0 rgba(239, 68, 68, 0.3)"),
  infoShadow: varchar("info_shadow", { length: 100 }).notNull().default("0 4px 14px 0 rgba(59, 130, 246, 0.3)"),
  tomorrowShadow: varchar("tomorrow_shadow", { length: 100 }).notNull().default("0 4px 14px 0 rgba(147, 51, 234, 0.3)"),
  grayShadow: varchar("gray_shadow", { length: 100 }).notNull().default("0 4px 14px 0 rgba(107, 114, 128, 0.3)"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multilingual translations table for database content
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type").notNull(), // "category", "product", "store_settings"
  entityId: varchar("entity_id").notNull(), // ID of the entity being translated
  field: varchar("field").notNull(), // "name", "description", etc.
  language: varchar("language", { length: 2 }).notNull(), // "ru", "en", "he"
  value: text("value").notNull(), // The translated text
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations - Simplified to avoid Drizzle ORM issues
export const productsRelations = relations(products, ({ many }) => ({
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
  discountType: z.enum(["percentage", "fixed"]).nullable().optional(),
  discountValue: z.string().nullable().optional(),
  categoryIds: z.array(z.number()).optional(), // Array of category IDs for many-to-many
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
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
  defaultLanguage: z.string().optional(),
  enabledLanguages: z.array(z.string()).optional(),
});

export const updateStoreSettingsSchema = insertStoreSettingsSchema.partial();

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Base schema without transform for updateThemeSchema
const baseThemeSchema = createInsertSchema(themes).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertThemeSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  primaryColor: z.string().nullable().transform(val => val || "hsl(24.6, 95%, 53.1%)"),
  primaryTextColor: z.string().nullable().transform(val => val || "hsl(0, 0%, 100%)"),
  primaryDarkColor: z.string().nullable().transform(val => val || "hsl(20.5, 90%, 48%)"),
  primaryLightColor: z.string().nullable().transform(val => val || "hsl(24.6, 95%, 96%)"),
  secondaryColor: z.string().nullable().transform(val => val || "hsl(210, 40%, 98%)"),
  accentColor: z.string().nullable().transform(val => val || "hsl(210, 40%, 85%)"),
  successColor: z.string().nullable().transform(val => val || "hsl(142, 76%, 36%)"),
  successLightColor: z.string().nullable().transform(val => val || "hsl(142, 76%, 96%)"),
  warningColor: z.string().nullable().transform(val => val || "hsl(38, 92%, 50%)"),
  warningLightColor: z.string().nullable().transform(val => val || "hsl(38, 92%, 96%)"),
  errorColor: z.string().nullable().transform(val => val || "hsl(0, 84%, 60%)"),
  errorLightColor: z.string().nullable().transform(val => val || "hsl(0, 84%, 96%)"),
  infoColor: z.string().nullable().transform(val => val || "hsl(221, 83%, 53%)"),
  infoLightColor: z.string().nullable().transform(val => val || "hsl(221, 83%, 96%)"),
  tomorrowColor: z.string().nullable().transform(val => val || "hsl(262, 83%, 58%)"),
  tomorrowDarkColor: z.string().nullable().transform(val => val || "hsl(262, 83%, 48%)"),
  tomorrowLightColor: z.string().nullable().transform(val => val || "hsl(262, 83%, 96%)"),
  outOfStockColor: z.string().nullable().transform(val => val || "hsl(0, 84%, 60%)"),
  workingHoursIconColor: z.string().nullable().transform(val => val || "hsl(220, 91%, 54%)"),
  contactsIconColor: z.string().nullable().transform(val => val || "hsl(142, 76%, 36%)"),
  paymentDeliveryIconColor: z.string().nullable().transform(val => val || "hsl(262, 83%, 58%)"),
  headerStyle: z.string().nullable().transform(val => val || "classic"),
  whiteColor: z.string().nullable().transform(val => val || "hsl(0, 0%, 100%)"),
  gray50Color: z.string().nullable().transform(val => val || "hsl(210, 40%, 98%)"),
  gray100Color: z.string().nullable().transform(val => val || "hsl(210, 40%, 96%)"),
  gray200Color: z.string().nullable().transform(val => val || "hsl(214, 32%, 91%)"),
  gray300Color: z.string().nullable().transform(val => val || "hsl(213, 27%, 84%)"),
  gray400Color: z.string().nullable().transform(val => val || "hsl(215, 20%, 65%)"),
  gray500Color: z.string().nullable().transform(val => val || "hsl(215, 16%, 47%)"),
  gray600Color: z.string().nullable().transform(val => val || "hsl(215, 19%, 35%)"),
  gray700Color: z.string().nullable().transform(val => val || "hsl(215, 25%, 27%)"),
  gray800Color: z.string().nullable().transform(val => val || "hsl(217, 33%, 17%)"),
  gray900Color: z.string().nullable().transform(val => val || "hsl(222, 47%, 11%)"),
  fontFamilyPrimary: z.string().nullable().transform(val => val || "Poppins, sans-serif"),
  fontFamilySecondary: z.string().nullable().transform(val => val || "Inter, sans-serif"),
  primaryShadow: z.string().nullable().transform(val => val || "0 4px 14px 0 rgba(255, 102, 0, 0.3)"),
  successShadow: z.string().nullable().transform(val => val || "0 4px 14px 0 rgba(34, 197, 94, 0.3)"),
  warningShadow: z.string().nullable().transform(val => val || "0 4px 14px 0 rgba(245, 158, 11, 0.3)"),
  errorShadow: z.string().nullable().transform(val => val || "0 4px 14px 0 rgba(239, 68, 68, 0.3)"),
  infoShadow: z.string().nullable().transform(val => val || "0 4px 14px 0 rgba(59, 130, 246, 0.3)"),
  tomorrowShadow: z.string().nullable().transform(val => val || "0 4px 14px 0 rgba(147, 51, 234, 0.3)"),
  grayShadow: z.string().nullable().transform(val => val || "0 4px 14px 0 rgba(107, 114, 128, 0.3)")
});

export const updateThemeSchema = baseThemeSchema.partial().omit({
  id: true,
  isActive: true,
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
export type InsertTheme = z.infer<typeof insertThemeSchema>;
export type Theme = typeof themes.$inferSelect;

// Extended types with relations
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;
export type ProductWithCategories = Product & {
  categories: Category[];
};
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

export type CategoryWithCount = Category & {
  productCount: number;
};
