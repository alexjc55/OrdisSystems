CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"price_per_kg" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"customer_notes" text,
	"delivery_address" text,
	"customer_phone" varchar(20),
	"delivery_date" varchar(20),
	"delivery_time" varchar(50),
	"requested_delivery_time" timestamp,
	"payment_method" varchar(50),
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"unit" varchar(20) DEFAULT '100g' NOT NULL,
	"price_per_kg" numeric(10, 2) NOT NULL,
	"image_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"stock_status" varchar DEFAULT 'in_stock' NOT NULL,
	"is_special_offer" boolean DEFAULT false NOT NULL,
	"discount_type" varchar,
	"discount_value" numeric(10, 2),
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"welcome_title" varchar(255),
	"store_description" text,
	"logo_url" varchar(500),
	"banner_image" varchar(500),
	"contact_phone" varchar(50),
	"contact_email" varchar(255),
	"address" text,
	"working_hours" jsonb,
	"delivery_info" text,
	"payment_info" text,
	"about_us_photos" jsonb,
	"delivery_fee" numeric(10, 2) DEFAULT '15.00',
	"free_delivery_from" numeric(10, 2) DEFAULT '50.00',
	"min_delivery_time_hours" integer DEFAULT 2,
	"max_delivery_time_days" integer DEFAULT 4,
	"payment_methods" jsonb,
	"is_delivery_enabled" boolean DEFAULT true,
	"is_pickup_enabled" boolean DEFAULT true,
	"discount_badge_text" varchar(50) DEFAULT 'Скидка',
	"show_banner_image" boolean DEFAULT true,
	"show_title_description" boolean DEFAULT true,
	"show_info_blocks" boolean DEFAULT true,
	"show_special_offers" boolean DEFAULT true,
	"show_category_menu" boolean DEFAULT true,
	"week_start_day" varchar(10) DEFAULT 'monday',
	"bottom_banner1_url" varchar(500),
	"bottom_banner1_link" varchar(500),
	"bottom_banner2_url" varchar(500),
	"bottom_banner2_link" varchar(500),
	"show_bottom_banners" boolean DEFAULT false,
	"default_items_per_page" integer DEFAULT 10,
	"header_html" text,
	"footer_html" text,
	"cancellation_reasons" jsonb,
	"show_whatsapp_chat" boolean DEFAULT false,
	"whatsapp_phone_number" varchar(20),
	"whatsapp_default_message" text,
	"auth_page_title" varchar(255) DEFAULT 'Добро пожаловать в eDAHouse',
	"auth_page_subtitle" text DEFAULT 'Готовые блюда высокого качества с доставкой на дом',
	"auth_page_feature1" varchar(255) DEFAULT 'Свежие готовые блюда каждый день',
	"auth_page_feature2" varchar(255) DEFAULT 'Быстрая доставка в удобное время',
	"auth_page_feature3" varchar(255) DEFAULT 'Широкий выбор блюд на любой вкус',
	"show_cart_banner" boolean DEFAULT false,
	"cart_banner_type" varchar DEFAULT 'text',
	"cart_banner_image" varchar(500),
	"cart_banner_text" text,
	"cart_banner_bg_color" varchar(7) DEFAULT '#f97316',
	"cart_banner_text_color" varchar(7) DEFAULT '#ffffff',
	"worker_permissions" jsonb DEFAULT '{"canManageProducts":true,"canManageCategories":true,"canManageOrders":true,"canViewUsers":false,"canManageUsers":false,"canViewSettings":false,"canManageSettings":false}'::jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"label" varchar(100) NOT NULL,
	"address" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"phone" varchar,
	"default_address" text,
	"password" varchar NOT NULL,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"role" varchar DEFAULT 'customer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");