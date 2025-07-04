--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_addresses DROP CONSTRAINT IF EXISTS user_addresses_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_orders_id_fk;
DROP INDEX IF EXISTS public."IDX_session_expire";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.user_addresses DROP CONSTRAINT IF EXISTS user_addresses_pkey;
ALTER TABLE IF EXISTS ONLY public.themes DROP CONSTRAINT IF EXISTS themes_pkey;
ALTER TABLE IF EXISTS ONLY public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE IF EXISTS ONLY public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_product_id_category_id_key;
ALTER TABLE IF EXISTS ONLY public.product_categories DROP CONSTRAINT IF EXISTS product_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.marketing_notifications DROP CONSTRAINT IF EXISTS marketing_notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS public.user_addresses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.store_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.push_subscriptions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.products ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.product_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.marketing_notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.categories ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.user_addresses_id_seq;
DROP TABLE IF EXISTS public.user_addresses;
DROP TABLE IF EXISTS public.themes;
DROP SEQUENCE IF EXISTS public.store_settings_id_seq;
DROP TABLE IF EXISTS public.store_settings;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.session;
DROP SEQUENCE IF EXISTS public.push_subscriptions_id_seq;
DROP TABLE IF EXISTS public.push_subscriptions;
DROP SEQUENCE IF EXISTS public.products_id_seq;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.product_categories_id_seq;
DROP TABLE IF EXISTS public.product_categories;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.order_items_id_seq;
DROP TABLE IF EXISTS public.order_items;
DROP SEQUENCE IF EXISTS public.marketing_notifications_id_seq;
DROP TABLE IF EXISTS public.marketing_notifications;
DROP SEQUENCE IF EXISTS public.categories_id_seq;
DROP TABLE IF EXISTS public.categories;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    name_en character varying(255),
    name_he character varying(255),
    name_ar character varying(255),
    description_en text,
    description_he text,
    description_ar text
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: marketing_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_notifications (
    id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    title_en text,
    message_en text,
    title_he text,
    message_he text,
    title_ar text,
    message_ar text,
    sent_count integer DEFAULT 0,
    created_by text NOT NULL,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: marketing_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_notifications_id_seq OWNED BY public.marketing_notifications.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    price_per_kg numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id character varying,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    delivery_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    customer_notes text,
    delivery_address text,
    payment_method character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    customer_phone character varying(20),
    requested_delivery_time timestamp without time zone,
    delivery_date character varying(20),
    delivery_time character varying(20),
    cancellation_reason text
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id integer NOT NULL,
    product_id integer NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_categories_id_seq OWNED BY public.product_categories.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price_per_kg numeric(10,2) NOT NULL,
    image_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    stock_status character varying DEFAULT 'in_stock'::character varying NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_available boolean DEFAULT true NOT NULL,
    price numeric(10,2) NOT NULL,
    unit character varying(20) DEFAULT '100g'::character varying NOT NULL,
    is_special_offer boolean DEFAULT false NOT NULL,
    discount_type character varying,
    discount_value numeric(10,2),
    availability_status character varying(50) DEFAULT 'available'::character varying NOT NULL,
    name_en character varying(255),
    name_he character varying(255),
    name_ar character varying(255),
    description_en text,
    description_he text,
    description_ar text,
    image_url_en character varying(500),
    image_url_he character varying(500),
    image_url_ar character varying(500),
    CONSTRAINT products_availability_status_check CHECK (((availability_status)::text = ANY ((ARRAY['available'::character varying, 'out_of_stock_today'::character varying, 'completely_unavailable'::character varying])::text[])))
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    user_id text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: store_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_settings (
    id integer NOT NULL,
    store_name character varying(255) NOT NULL,
    store_description text,
    contact_phone character varying(50),
    contact_email character varying(255),
    address text,
    working_hours jsonb,
    delivery_fee numeric(10,2) DEFAULT 15.00,
    free_delivery_from numeric(10,2) DEFAULT 50.00,
    payment_methods jsonb,
    is_delivery_enabled boolean DEFAULT true,
    is_pickup_enabled boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now(),
    min_delivery_time_hours integer DEFAULT 2,
    max_delivery_time_days integer DEFAULT 4,
    logo_url character varying(500),
    delivery_info text,
    payment_info text,
    about_us_photos jsonb,
    welcome_title character varying(255),
    banner_image character varying(500),
    discount_badge_text character varying(50) DEFAULT 'Скидка'::character varying,
    show_banner_image boolean DEFAULT true,
    show_title_description boolean DEFAULT true,
    show_info_blocks boolean DEFAULT true,
    show_special_offers boolean DEFAULT true,
    show_category_menu boolean DEFAULT true,
    week_start_day character varying(10) DEFAULT 'monday'::character varying,
    bottom_banner1_url character varying(500),
    bottom_banner1_link character varying(500),
    bottom_banner2_url character varying(500),
    bottom_banner2_link character varying(500),
    show_bottom_banners boolean DEFAULT false,
    default_items_per_page integer DEFAULT 10,
    cancellation_reasons jsonb,
    header_html text,
    footer_html text,
    show_whatsapp_chat boolean DEFAULT false,
    whatsapp_phone_number character varying(20),
    whatsapp_default_message text,
    show_cart_banner boolean DEFAULT false,
    cart_banner_type character varying DEFAULT 'text'::character varying,
    cart_banner_image character varying(500),
    cart_banner_text text,
    cart_banner_bg_color character varying(7) DEFAULT '#f97316'::character varying,
    cart_banner_text_color character varying(7) DEFAULT '#ffffff'::character varying,
    auth_page_title character varying(255) DEFAULT 'Добро пожаловать в eDAHouse'::character varying,
    auth_page_subtitle text DEFAULT 'Готовые блюда высокого качества с доставкой на дом'::text,
    auth_page_feature1 character varying(255) DEFAULT 'Свежие готовые блюда каждый день'::character varying,
    auth_page_feature2 character varying(255) DEFAULT 'Быстрая доставка в удобное время'::character varying,
    auth_page_feature3 character varying(255) DEFAULT 'Широкий выбор блюд на любой вкус'::character varying,
    worker_permissions jsonb DEFAULT '{"canViewUsers": false, "canManageUsers": false, "canManageOrders": true, "canViewSettings": false, "canManageProducts": true, "canManageSettings": false, "canManageCategories": true}'::jsonb,
    default_language character varying(5) DEFAULT 'ru'::character varying,
    enabled_languages jsonb DEFAULT '["ru", "en", "he"]'::jsonb,
    info_blocks_position character varying(10) DEFAULT 'top'::character varying,
    header_style character varying DEFAULT 'classic'::character varying,
    banner_button_text character varying(100) DEFAULT 'Смотреть каталог'::character varying,
    banner_button_link character varying(500) DEFAULT '#categories'::character varying,
    modern_block1_icon character varying(50),
    modern_block1_text character varying(255),
    modern_block2_icon character varying(50),
    modern_block2_text character varying(255),
    modern_block3_icon character varying(50),
    modern_block3_text character varying(255),
    banner_image_url character varying(500),
    store_name_ar text,
    store_description_ar text,
    welcome_title_ar text,
    welcome_subtitle_ar text,
    delivery_info_ar text,
    store_name_he text,
    welcome_title_he text,
    store_description_he text,
    delivery_info_he text,
    store_name_en text,
    welcome_title_en text,
    store_description_en text,
    delivery_info_en text,
    about_text_ru text,
    about_text_en text,
    about_text_he text,
    about_text_ar text,
    banner_button_text_ru character varying(100),
    banner_button_text_en character varying(100),
    banner_button_text_he character varying(100),
    banner_button_text_ar character varying(100),
    discount_badge_text_en character varying(50),
    discount_badge_text_he character varying(50),
    discount_badge_text_ar character varying(50),
    whatsapp_default_message_en text,
    whatsapp_default_message_he text,
    whatsapp_default_message_ar text,
    cart_banner_text_en text,
    cart_banner_text_he text,
    cart_banner_text_ar text,
    payment_info_en text,
    payment_info_he text,
    payment_info_ar text,
    contact_phone_en character varying(50),
    contact_phone_he character varying(50),
    contact_phone_ar character varying(50),
    contact_email_en character varying(255),
    contact_email_he character varying(255),
    contact_email_ar character varying(255),
    address_en text,
    address_he text,
    address_ar text,
    pwa_icon character varying(500),
    pwa_name character varying(100) DEFAULT 'eDAHouse'::character varying,
    pwa_description text DEFAULT 'Готовые блюда с доставкой'::text,
    pwa_name_en character varying(100),
    pwa_description_en text,
    pwa_name_he character varying(100),
    pwa_description_he text,
    pwa_name_ar character varying(100),
    pwa_description_ar text,
    CONSTRAINT store_settings_header_style_check CHECK (((header_style)::text = ANY ((ARRAY['classic'::character varying, 'modern'::character varying, 'minimal'::character varying])::text[]))),
    CONSTRAINT store_settings_info_blocks_position_check CHECK (((info_blocks_position)::text = ANY ((ARRAY['top'::character varying, 'bottom'::character varying])::text[])))
);


--
-- Name: store_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.store_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: store_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.store_settings_id_seq OWNED BY public.store_settings.id;


--
-- Name: themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.themes (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT false,
    primary_color text NOT NULL,
    primary_dark_color text NOT NULL,
    primary_light_color text NOT NULL,
    secondary_color text NOT NULL,
    accent_color text NOT NULL,
    success_color text NOT NULL,
    success_light_color text NOT NULL,
    warning_color text NOT NULL,
    warning_light_color text NOT NULL,
    error_color text NOT NULL,
    error_light_color text NOT NULL,
    info_color text NOT NULL,
    info_light_color text NOT NULL,
    white_color text NOT NULL,
    gray50_color text NOT NULL,
    gray100_color text NOT NULL,
    gray200_color text NOT NULL,
    gray300_color text NOT NULL,
    gray400_color text NOT NULL,
    gray500_color text NOT NULL,
    gray600_color text NOT NULL,
    gray700_color text NOT NULL,
    gray800_color text NOT NULL,
    gray900_color text NOT NULL,
    font_family_primary text NOT NULL,
    font_family_secondary text NOT NULL,
    primary_shadow text NOT NULL,
    success_shadow text NOT NULL,
    warning_shadow text NOT NULL,
    error_shadow text NOT NULL,
    info_shadow text NOT NULL,
    gray_shadow text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    primary_text_color character varying(20) DEFAULT 'hsl(0, 0%, 100%)'::character varying NOT NULL,
    tomorrow_shadow character varying(100) DEFAULT '0 4px 14px 0 rgba(147, 51, 234, 0.3)'::character varying NOT NULL,
    tomorrow_color character varying(20) DEFAULT 'hsl(262, 83%, 58%)'::character varying NOT NULL,
    tomorrow_light_color character varying(20) DEFAULT 'hsl(262, 83%, 96%)'::character varying NOT NULL,
    out_of_stock_color character varying(20) DEFAULT 'hsl(0, 84%, 60%)'::character varying NOT NULL,
    tomorrow_dark_color character varying(20) DEFAULT 'hsl(262, 83%, 48%)'::character varying NOT NULL,
    working_hours_icon_color character varying(20) DEFAULT 'hsl(220, 91%, 54%)'::character varying,
    contacts_icon_color character varying(20) DEFAULT 'hsl(142, 76%, 36%)'::character varying,
    payment_delivery_icon_color character varying(20) DEFAULT 'hsl(262, 83%, 58%)'::character varying,
    header_style character varying(20) DEFAULT 'classic'::character varying,
    banner_button_text character varying(100) DEFAULT 'Смотреть каталог'::character varying,
    banner_button_link character varying(200) DEFAULT '#categories'::character varying,
    modern_block1_icon character varying(50) DEFAULT ''::character varying,
    modern_block1_text character varying(200) DEFAULT ''::character varying,
    modern_block2_icon character varying(50) DEFAULT ''::character varying,
    modern_block2_text character varying(200) DEFAULT ''::character varying,
    modern_block3_icon character varying(50) DEFAULT ''::character varying,
    modern_block3_text character varying(200) DEFAULT ''::character varying,
    show_banner_image boolean DEFAULT true,
    show_title_description boolean DEFAULT true,
    show_info_blocks boolean DEFAULT true,
    info_blocks_position character varying(10) DEFAULT 'top'::character varying,
    show_prices boolean DEFAULT true,
    show_product_images boolean DEFAULT true,
    show_cart boolean DEFAULT true,
    show_special_offers boolean DEFAULT true,
    show_category_menu boolean DEFAULT true,
    show_whatsapp_chat boolean DEFAULT true,
    whatsapp_phone character varying(20) DEFAULT ''::character varying,
    whatsapp_message text DEFAULT 'Здравствуйте! У меня есть вопрос по заказу.'::text,
    logo_url character varying(500) DEFAULT ''::character varying,
    banner_image_url character varying(500) DEFAULT ''::character varying,
    show_cart_banner boolean DEFAULT false,
    cart_banner_type character varying(10) DEFAULT 'text'::character varying,
    cart_banner_image character varying(500) DEFAULT ''::character varying,
    cart_banner_text text DEFAULT ''::text,
    cart_banner_bg_color character varying(7) DEFAULT '#f97316'::character varying,
    cart_banner_text_color character varying(7) DEFAULT '#ffffff'::character varying,
    show_bottom_banners boolean DEFAULT false,
    bottom_banner1_url character varying(500) DEFAULT ''::character varying,
    bottom_banner1_link character varying(500) DEFAULT ''::character varying,
    bottom_banner2_url character varying(500) DEFAULT ''::character varying,
    bottom_banner2_link character varying(500) DEFAULT ''::character varying,
    name_en character varying(100),
    name_he character varying(100),
    name_ar character varying(100),
    description_en text,
    description_he text,
    description_ar text,
    banner_button_text_en character varying(100),
    banner_button_text_he character varying(100),
    banner_button_text_ar character varying(100),
    logourl_en text,
    logourl_he text,
    logourl_ar text,
    bannerimageurl_en text,
    bannerimageurl_he text,
    bannerimageurl_ar text,
    cartbannerimage_en text,
    cartbannerimage_he text,
    cartbannerimage_ar text,
    bottombanner1url_en text,
    bottombanner1url_he text,
    bottombanner1url_ar text,
    bottombanner2url_en text,
    bottombanner2url_he text,
    bottombanner2url_ar text,
    logo_url_en text DEFAULT ''::text,
    logo_url_he text DEFAULT ''::text,
    logo_url_ar text DEFAULT ''::text,
    banner_image_url_en text DEFAULT ''::text,
    banner_image_url_he text DEFAULT ''::text,
    banner_image_url_ar text DEFAULT ''::text,
    cart_banner_image_en text DEFAULT ''::text,
    cart_banner_image_he text DEFAULT ''::text,
    cart_banner_image_ar text DEFAULT ''::text,
    bottom_banner1_url_en text DEFAULT ''::text,
    bottom_banner1_url_he text DEFAULT ''::text,
    bottom_banner1_url_ar text DEFAULT ''::text,
    bottom_banner2_url_en text DEFAULT ''::text,
    bottom_banner2_url_he text DEFAULT ''::text,
    bottom_banner2_url_ar text DEFAULT ''::text
);


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_addresses (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    label character varying(100) NOT NULL,
    address text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_addresses_id_seq OWNED BY public.user_addresses.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying DEFAULT 'customer'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    phone character varying,
    default_address text,
    password character varying,
    password_reset_token character varying,
    password_reset_expires timestamp without time zone,
    username character varying(50) NOT NULL
);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: marketing_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_notifications ALTER COLUMN id SET DEFAULT nextval('public.marketing_notifications_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: product_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories ALTER COLUMN id SET DEFAULT nextval('public.product_categories_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: store_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings ALTER COLUMN id SET DEFAULT nextval('public.store_settings_id_seq'::regclass);


--
-- Name: user_addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses ALTER COLUMN id SET DEFAULT nextval('public.user_addresses_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories VALUES (48, 'Горячие блюда', 'Основные блюда на развес', '🍖', true, 2, '2025-06-17 18:46:47.834072', '2025-06-22 23:51:26.184', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.categories VALUES (49, 'Гарниры', 'Каши, картофель, овощи', '🍚', true, 3, '2025-06-17 18:46:47.834072', '2025-06-22 23:51:26.226', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.categories VALUES (50, 'Супы', 'Первые блюда', '🍲', true, 4, '2025-06-17 18:46:47.834072', '2025-06-22 23:51:26.269', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.categories VALUES (51, 'Выпечка и десерты', 'Блинчики, сырники, корндоги', '🥞', true, 5, '2025-06-17 18:46:47.834072', '2025-06-22 23:51:26.312', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.categories VALUES (52, 'Пирожки', 'Свежие пирожки с разными начинками', '🥟', true, 6, '2025-06-17 18:46:47.834072', '2025-06-22 23:51:26.354', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.categories VALUES (47, 'Салаты', 'Свежие салаты и закуски', '🥗', true, 1, '2025-06-17 18:46:47.834072', '2025-06-30 10:18:34.261', '', 'סלטים', '', '', 'סלטים טריים ומנות פתיחה', '');


--
-- Data for Name: marketing_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.marketing_notifications VALUES (1, 'Привет', 'Тест', NULL, NULL, NULL, NULL, NULL, NULL, 0, 'admin', '2025-07-02 00:13:10.549', '2025-07-02 00:13:10.567794');
INSERT INTO public.marketing_notifications VALUES (2, 'Все привет', 'У нас акция -30%', NULL, NULL, NULL, NULL, NULL, NULL, 0, 'admin', '2025-07-02 00:39:47.022', '2025-07-02 00:39:47.040835');
INSERT INTO public.marketing_notifications VALUES (3, 'тест', 'уведомления от еда', NULL, NULL, NULL, NULL, NULL, NULL, 4, 'admin', '2025-07-02 00:41:04.046', '2025-07-02 00:41:04.063921');
INSERT INTO public.marketing_notifications VALUES (4, 'Привет Мир', 'Скидка на рога и копыта 300%', NULL, NULL, NULL, NULL, NULL, NULL, 4, 'admin', '2025-07-02 01:12:55.819', '2025-07-02 01:12:55.837683');
INSERT INTO public.marketing_notifications VALUES (5, 'тестовое', 'Вот такая скидка!', NULL, NULL, NULL, NULL, NULL, NULL, 4, 'admin', '2025-07-02 01:17:15.527', '2025-07-02 01:17:15.545798');
INSERT INTO public.marketing_notifications VALUES (6, 'еще одно', 'Леша или спать', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-02 01:20:54.133', '2025-07-02 01:20:54.151947');
INSERT INTO public.marketing_notifications VALUES (7, 'еще одна проверка', 'отправляем рекламное сообщение', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-02 01:22:47.851', '2025-07-02 01:22:47.868641');
INSERT INTO public.marketing_notifications VALUES (8, 'еще', 'одно', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-02 01:23:03.239', '2025-07-02 01:23:03.256465');
INSERT INTO public.marketing_notifications VALUES (9, 'Test', 'Test message', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'test', '2025-07-02 01:33:43.853', '2025-07-02 01:33:44.836203');
INSERT INTO public.marketing_notifications VALUES (10, 'Акция', 'Все салаты -15%', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'admin', '2025-07-02 01:34:57.56', '2025-07-02 01:34:57.578623');
INSERT INTO public.marketing_notifications VALUES (11, 'Тест модального окна', 'Проверка отображения уведомления в модальном окне', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'test', '2025-07-02 01:39:46.673', '2025-07-02 01:39:46.691075');
INSERT INTO public.marketing_notifications VALUES (12, 'тест', 'тут будет информация', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'admin', '2025-07-02 01:41:23.689', '2025-07-02 01:41:23.707226');
INSERT INTO public.marketing_notifications VALUES (13, 'Тест модального окна', 'Проверка логирования и отображения модального окна', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'test', '2025-07-02 01:42:18.707', '2025-07-02 01:42:18.727513');
INSERT INTO public.marketing_notifications VALUES (14, 'тест', 'окно', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'admin', '2025-07-02 01:47:03.187', '2025-07-02 01:47:03.205572');
INSERT INTO public.marketing_notifications VALUES (15, 'Тест алерта', 'Проверка получения сообщений от Service Worker', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'test', '2025-07-02 01:49:12.542', '2025-07-02 01:49:15.580385');
INSERT INTO public.marketing_notifications VALUES (16, 'Финальный тест', 'Проверяем работу модального окна', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'test', '2025-07-02 01:49:37.894', '2025-07-02 01:49:37.911852');
INSERT INTO public.marketing_notifications VALUES (17, 'Лютый тест', 'Проверяем', NULL, NULL, NULL, NULL, NULL, NULL, 2, 'admin', '2025-07-03 20:18:57.96', '2025-07-03 20:18:57.978109');
INSERT INTO public.marketing_notifications VALUES (18, 'тест', 'тест', 'test', 'test', NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 20:19:45.84', '2025-07-03 20:19:45.858097');
INSERT INTO public.marketing_notifications VALUES (19, 'тест', 'тест', 'test', 'test', NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 20:20:16.867', '2025-07-03 20:20:16.883837');
INSERT INTO public.marketing_notifications VALUES (20, 'еше обно сообщение', 'Давай проверим', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 20:23:23.21', '2025-07-03 20:23:23.229466');
INSERT INTO public.marketing_notifications VALUES (21, 'тест', 'тест', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 20:28:00.579', '2025-07-03 20:28:00.597769');
INSERT INTO public.marketing_notifications VALUES (22, 'тест', 'тест', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:01:30.624', '2025-07-03 21:01:30.643201');
INSERT INTO public.marketing_notifications VALUES (23, 'теск', 'порп олрплорпл', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:02:56.719', '2025-07-03 21:02:56.737118');
INSERT INTO public.marketing_notifications VALUES (24, 'ыыыыы', 'ыыыыы', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:07:51.714', '2025-07-03 21:07:51.733267');
INSERT INTO public.marketing_notifications VALUES (25, 'ыыыыы', 'ыыыыыыыыыыы', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:10:18.922', '2025-07-03 21:10:18.941837');
INSERT INTO public.marketing_notifications VALUES (26, 'гнорапрп', 'рпп рпрол од', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:12:26.749', '2025-07-03 21:12:26.767716');
INSERT INTO public.marketing_notifications VALUES (27, 'олрпорар', 'ерпплородлб', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:12:57.547', '2025-07-03 21:12:57.564907');
INSERT INTO public.marketing_notifications VALUES (28, 'ggxf', 'Dftyyu', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:14:42.538', '2025-07-03 21:14:42.556104');
INSERT INTO public.marketing_notifications VALUES (29, 'Пока не понятно', 'Пока не понятно как это все будет работать и сможет ли пользователь во всем этом разобраться', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:15:26.877', '2025-07-03 21:15:26.896051');
INSERT INTO public.marketing_notifications VALUES (30, 'еще ', 'еще один тест', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:15:56.253', '2025-07-03 21:15:56.271122');
INSERT INTO public.marketing_notifications VALUES (31, 'тетст', 'вои авлоавылдаыв', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:16:16.763', '2025-07-03 21:16:16.7819');
INSERT INTO public.marketing_notifications VALUES (32, 'еще тест', 'тест еще', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:21:22.195', '2025-07-03 21:21:22.214716');
INSERT INTO public.marketing_notifications VALUES (33, 'тест', 'тест', NULL, NULL, NULL, NULL, NULL, NULL, 1, 'admin', '2025-07-03 21:22:20.401', '2025-07-03 21:22:20.417763');
INSERT INTO public.marketing_notifications VALUES (34, 'тест', 'тест', NULL, NULL, NULL, NULL, NULL, NULL, 0, 'admin', '2025-07-03 21:40:17.843', '2025-07-03 21:40:17.862732');
INSERT INTO public.marketing_notifications VALUES (35, 'тест', 'тест', NULL, NULL, NULL, NULL, NULL, NULL, 0, 'admin', '2025-07-03 21:44:18.693', '2025-07-03 21:44:18.711939');


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.order_items VALUES (33, 1, 382, 2.000, 58.80, 97.60, '2025-06-18 13:42:33.672122');
INSERT INTO public.order_items VALUES (43, 2, 382, 1.000, 58.80, 58.80, '2025-06-18 14:30:32.850749');
INSERT INTO public.order_items VALUES (44, 2, 381, 1.000, 52.90, 50.25, '2025-06-18 14:30:32.850749');
INSERT INTO public.order_items VALUES (45, 2, 421, 1.000, 62.90, 42.90, '2025-06-18 14:30:32.850749');
INSERT INTO public.order_items VALUES (46, 3, 381, 100.000, 52.90, 52.90, '2025-06-18 15:46:57.762544');
INSERT INTO public.order_items VALUES (47, 3, 426, 2.000, 38.50, 77.00, '2025-06-18 15:46:57.762544');
INSERT INTO public.order_items VALUES (48, 4, 380, 100.000, 45.01, 45.10, '2025-06-18 16:03:52.340736');
INSERT INTO public.order_items VALUES (49, 4, 381, 100.000, 52.90, 52.90, '2025-06-18 16:03:52.340736');
INSERT INTO public.order_items VALUES (50, 4, 426, 1.000, 38.50, 38.50, '2025-06-18 16:03:52.340736');
INSERT INTO public.order_items VALUES (54, 5, 381, 100.000, 52.90, 52.90, '2025-06-18 22:55:36.794173');
INSERT INTO public.order_items VALUES (55, 5, 406, 200.000, 58.90, 117.80, '2025-06-18 22:55:36.794173');
INSERT INTO public.order_items VALUES (56, 6, 382, 100.000, 58.80, 58.80, '2025-06-18 23:51:11.741996');
INSERT INTO public.order_items VALUES (57, 7, 426, 2.000, 38.50, 77.00, '2025-06-19 00:16:26.722272');
INSERT INTO public.order_items VALUES (58, 8, 381, 100.000, 52.90, 52.90, '2025-06-19 00:39:48.609281');
INSERT INTO public.order_items VALUES (60, 9, 382, 100.000, 58.80, 58.80, '2025-06-19 00:55:13.31813');
INSERT INTO public.order_items VALUES (61, 10, 380, 100.000, 45.01, 45.10, '2025-06-19 05:30:31.161009');
INSERT INTO public.order_items VALUES (62, 11, 378, 100.000, 35.50, 35.50, '2025-06-19 11:35:44.640522');
INSERT INTO public.order_items VALUES (63, 11, 382, 300.000, 58.80, 176.40, '2025-06-19 11:35:44.640522');
INSERT INTO public.order_items VALUES (64, 12, 382, 100.000, 58.80, 58.80, '2025-06-19 12:00:43.867789');
INSERT INTO public.order_items VALUES (65, 13, 382, 100.000, 58.80, 58.80, '2025-06-19 12:04:49.649031');
INSERT INTO public.order_items VALUES (66, 13, 381, 100.000, 52.90, 52.90, '2025-06-19 12:04:49.649031');
INSERT INTO public.order_items VALUES (67, 13, 380, 100.000, 45.01, 45.10, '2025-06-19 12:04:49.649031');
INSERT INTO public.order_items VALUES (68, 14, 382, 100.000, 58.80, 58.80, '2025-06-19 12:10:31.229895');
INSERT INTO public.order_items VALUES (69, 14, 381, 100.000, 52.90, 52.90, '2025-06-19 12:10:31.229895');
INSERT INTO public.order_items VALUES (70, 14, 380, 100.000, 45.01, 45.10, '2025-06-19 12:10:31.229895');
INSERT INTO public.order_items VALUES (72, 15, 380, 300.000, 45.01, 115.03, '2025-06-19 14:02:00.007603');
INSERT INTO public.order_items VALUES (73, 16, 381, 300.000, 52.90, 158.70, '2025-06-19 16:06:08.614807');
INSERT INTO public.order_items VALUES (80, 17, 380, 200.000, 45.01, 90.10, '2025-06-23 22:36:17.324406');
INSERT INTO public.order_items VALUES (81, 17, 426, 5.000, 38.50, 182.88, '2025-06-23 22:36:17.324406');
INSERT INTO public.order_items VALUES (84, 18, 380, 100.000, 45.01, 45.10, '2025-07-01 19:33:01.843666');
INSERT INTO public.order_items VALUES (85, 18, 381, 100.000, 52.90, 52.90, '2025-07-01 19:33:01.843666');


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.orders VALUES (17, 'admin', 'ready', 115.00, 15.00, '
[ORDER_DATA:{"orderDiscount":{"type":"percentage","value":10,"reason":"так"},"itemDiscounts":{"1":{"type":"percentage","value":5,"reason":""}},"manualPriceOverride":{"enabled":true,"value":100}}]', 'Stadia Gaon 6, Haifa', 'Картой по телефону или в магазине', '2025-06-20 13:31:40.324299', '2025-06-24 15:39:23.191', '0528496528', NULL, '2025-06-20', '09:00 - 11:00', NULL);
INSERT INTO public.orders VALUES (11, NULL, 'pending', 211.90, 0.00, NULL, 'Dostavka 5', 'Картой по телефону или в магазине', '2025-06-19 11:35:44.640522', '2025-06-19 11:35:44.640522', NULL, NULL, '2025-06-19', '17:00 - 19:00', NULL);
INSERT INTO public.orders VALUES (13, NULL, 'pending', 156.80, 0.00, NULL, 'Asdfghjjbg 56', 'Картой по телефону или в магазине', '2025-06-19 12:04:49.649031', '2025-06-19 12:04:49.649031', '12345678887', NULL, '2025-06-19', '17:00 - 19:00', NULL);
INSERT INTO public.orders VALUES (16, 'admin', 'pending', 173.70, 15.00, NULL, 'Stadia Gaon 6, Haifa', 'Картой по телефону или в магазине', '2025-06-19 16:06:08.614807', '2025-06-24 15:39:37.611', '0528496528', NULL, '2025-06-24', '19:00 - 21:00', NULL);
INSERT INTO public.orders VALUES (18, 'admin', 'pending', 155.00, 0.00, '
[ORDER_DATA:{"orderDiscount":{"type":"percentage","value":10,"reason":""},"itemDiscounts":null,"manualPriceOverride":{"enabled":true,"value":155}}]', 'Stadia Gaon 6, Haifa', 'Картой по телефону или в магазине', '2025-06-30 08:24:30.370992', '2025-07-01 19:33:02.019', '0528496528', NULL, '2025-07-01', '13:00 - 15:00', NULL);
INSERT INTO public.orders VALUES (9, '43948959', 'preparing', 58.80, 0.00, '', 'Saadia Gaon 6/2, Haifa', 'Картой по телефону или в магазине', '2025-06-19 00:54:00.374156', '2025-06-20 11:26:00.399', '+972528496528', NULL, '2025-06-25', '11:00 - 13:00', NULL);
INSERT INTO public.orders VALUES (12, NULL, 'preparing', 58.80, 0.00, NULL, 'Stadia Gaon 6, Haifa', 'Картой по телефону или в магазине', '2025-06-19 12:00:43.867789', '2025-07-01 23:00:18.548', '0528496528', NULL, '2025-06-19', '19:00 - 21:00', NULL);
INSERT INTO public.orders VALUES (1, '43948959', 'delivered', 92.72, 15.00, '
[DISCOUNTS:{"orderDiscount":{"type":"percentage","value":5,"reason":""},"itemDiscounts":null}]', '', 'cash', '2025-06-17 19:00:50.571966', '2025-06-20 11:26:13.419', '', NULL, '', '', NULL);
INSERT INTO public.orders VALUES (14, NULL, 'confirmed', 156.80, 0.00, NULL, 'Adress 123', 'Картой по телефону или в магазине', '2025-06-19 12:10:31.229895', '2025-06-23 11:24:26.544', '1234567896543', NULL, '2025-06-19', '19:00 - 21:00', NULL);
INSERT INTO public.orders VALUES (15, 'manual_1750335401590_mpgm1w61z', 'confirmed', 103.53, 0.00, '
[DISCOUNTS:{"orderDiscount":{"type":"percentage","value":10,"reason":""},"itemDiscounts":{"0":{"type":"amount","value":20,"reason":""}}}]', 'Test address 11', 'Картой по телефону или в магазине', '2025-06-19 12:16:42.559754', '2025-06-23 11:24:32.134', '1234567877788', NULL, '2025-06-19', '19:00 - 21:00', NULL);
INSERT INTO public.orders VALUES (2, '43948959', 'preparing', 136.76, 15.00, '
[DISCOUNTS:{"orderDiscount":{"type":"percentage","value":10,"reason":""},"itemDiscounts":{"1":{"type":"percentage","value":5,"reason":""},"2":{"type":"amount","value":20,"reason":""}}}]', 'Haifa, Saadia Gaon 6', 'cash', '2025-06-18 13:09:54.933499', '2025-06-23 12:22:16.333', '+972528496528', NULL, '2025-06-19', '18:00-20:00', NULL);
INSERT INTO public.orders VALUES (3, '43948959', 'pending', 144.90, 15.00, NULL, 'Saadia Gaon 6/2, Haifa', 'cash', '2025-06-18 15:46:57.762544', '2025-06-18 15:46:57.762544', '+972528496528', NULL, NULL, NULL, NULL);
INSERT INTO public.orders VALUES (4, '43948959', 'pending', 151.50, 15.00, NULL, 'Saadia Gaon 6/2, Haifa', 'cash', '2025-06-18 16:03:52.340736', '2025-06-18 16:03:52.340736', '+972528496528', NULL, '2025-06-19', '12:00-14:00', NULL);
INSERT INTO public.orders VALUES (5, NULL, 'pending', 170.70, 15.00, '', 'врврпарпа', 'cash', '2025-06-18 20:20:38.960862', '2025-06-18 22:55:36.968', '543645645654', NULL, '', '', NULL);
INSERT INTO public.orders VALUES (6, '43948959', 'pending', 58.80, 0.00, NULL, 'Saadia Gaon 6/2, Haifa', NULL, '2025-06-18 23:51:11.741996', '2025-06-18 23:51:11.741996', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.orders VALUES (7, '43948959', 'pending', 77.00, 0.00, NULL, 'Saadia Gaon 6/2, Haifa', NULL, '2025-06-19 00:16:26.722272', '2025-06-19 00:16:26.722272', '+972528496528', NULL, '2025-07-04', '13:00', NULL);
INSERT INTO public.orders VALUES (8, '43948959', 'pending', 52.90, 0.00, NULL, 'Saadia Gaon 6/2, Haifa', NULL, '2025-06-19 00:39:48.609281', '2025-06-19 00:39:48.609281', '+972528496528', NULL, '2025-06-25', '17:00', NULL);
INSERT INTO public.orders VALUES (10, NULL, 'pending', 45.10, 0.00, NULL, 'Haifa, S Gaon 6', 'Картой по телефону или в магазине', '2025-06-19 05:30:31.161009', '2025-06-19 05:30:31.161009', '+9733396528', NULL, '2025-06-19', '13:00 - 15:00', NULL);


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_categories VALUES (1, 377, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (2, 378, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (3, 379, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (4, 384, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (5, 385, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (6, 386, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (7, 387, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (9, 383, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (11, 382, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (12, 388, 47, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (13, 389, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (14, 390, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (15, 391, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (16, 392, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (17, 393, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (18, 394, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (19, 395, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (20, 396, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (21, 397, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (22, 398, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (23, 399, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (24, 407, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (25, 400, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (26, 401, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (27, 402, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (28, 403, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (29, 404, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (30, 405, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (31, 406, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (32, 408, 48, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (33, 409, 49, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (34, 410, 49, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (35, 411, 49, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (36, 412, 49, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (37, 413, 49, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (38, 414, 49, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (39, 416, 50, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (40, 417, 50, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (41, 418, 50, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (42, 419, 50, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (43, 420, 50, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (44, 423, 51, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (45, 424, 51, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (46, 425, 52, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (47, 427, 52, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (48, 428, 52, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (49, 415, 50, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (50, 426, 52, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (51, 421, 51, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (52, 422, 51, '2025-06-22 22:52:35.987281');
INSERT INTO public.product_categories VALUES (85, 381, 47, '2025-06-30 10:23:31.346055');
INSERT INTO public.product_categories VALUES (86, 380, 47, '2025-07-01 19:32:30.057452');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products VALUES (377, 'Оливье', 'Классический салат с мясом, картофелем, морковью, яйцами и горошком', 42.00, '/assets/1_1750184360776.jpg', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 42.00, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (378, 'Винегрет', 'Традиционный русский салат со свеклой, морковью и квашеной капустой', 35.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 35.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (379, 'Мимоза', 'Нежный слоеный салат с рыбой, яйцами и сыром', 48.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 48.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (384, 'Салат из капусты', 'Свежая капуста с морковью и зеленью', 25.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 25.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (385, 'Салат свежий с редиской', 'Хрустящий салат из огурцов, редиски и зелени', 32.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 32.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (386, 'Салат из свеклы', 'Вареная свекла с чесноком и майонезом', 28.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 28.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (387, 'Салат из моркови', 'Корейская морковка с пряными специями', 35.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 35.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (383, 'Грибы по-азиатски', 'Маринованные грибы с корейскими специями', 62.50, '', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 23:59:22.574', true, 62.50, '100g', true, 'percentage', 15.00, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (380, 'Абжерка', 'Острый грузинский салат с овощами и зеленью', 45.01, '', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-07-01 19:32:29.948', true, 45.01, '100g', true, 'percentage', 20.00, 'out_of_stock_today', NULL, 'אבזרקה', NULL, NULL, 'סלט גיאורגי חריף עם ירקות ועשבי תיבול', NULL, NULL, '', NULL);
INSERT INTO public.products VALUES (382, 'Баклажаны по-азиатски', 'Маринованные баклажаны с чесноком и кориандром', 58.80, '', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-07-01 20:50:32.275', true, 58.80, '100g', true, 'percentage', 20.00, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (381, 'Аджика', 'Острая закуска из помидоров, перца и специй', 52.90, '', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-07-01 20:50:34.312', true, 52.90, '100g', true, 'percentage', 20.00, 'available', NULL, '', NULL, NULL, '', NULL, NULL, '', NULL);
INSERT INTO public.products VALUES (388, 'Салат Цезарь', 'Классический салат с курицей, пармезаном и соусом цезарь', 65.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 65.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (389, 'Котлеты', 'Домашние мясные котлеты из говядины и свинины', 72.50, '/@assets/3_1750184360777.jpg', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 72.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (390, 'Паргит', 'Куриное филе в панировке, жаренное до золотистой корочки', 68.90, '/@assets/1_1750184360776.jpg', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 68.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (391, 'Крылышки', 'Сочные куриные крылышки в медово-горчичном соусе', 65.80, '/@assets/2_1750184360777.jpg', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 65.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (392, 'Окорочка', 'Запеченные куриные окорочка с травами и специями', 58.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 58.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (393, 'Тефтели', 'Нежные мясные шарики в томатном соусе', 69.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 69.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (394, 'Гуляш', 'Тушеное мясо с овощами в пряном соусе', 78.50, '/assets/3_1750184360777.jpg', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 78.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (395, 'Плов', 'Классический узбекский плов с мясом и морковью', 52.90, '/assets/3_1750184360777.jpg', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 52.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (396, 'Плов зеленый', 'Плов с зеленью, изюмом и специальными специями', 56.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 56.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (397, 'Перцы фаршированные', 'Болгарский перец, фаршированный мясом и рисом', 62.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 62.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (398, 'Голубцы', 'Капустные листья с мясной начинкой в томатном соусе', 58.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 58.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (399, 'Запеченные овощи', 'Ассорти из сезонных овощей, запеченных с травами', 38.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 38.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (407, 'Душпара', 'Маленькие пельмени в ароматном бульоне', 48.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 48.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (400, 'Отбивные', 'Свиные отбивные в золотистой панировке', 82.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 82.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (401, 'Шницель', 'Куриный шницель в хрустящей панировке', 75.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 75.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (402, 'Фасоль тушеная', 'Белая фасоль тушеная с овощами и томатами', 35.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 35.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (403, 'Жаркое', 'Мясо тушеное с картофелем и овощами по-домашнему', 68.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 68.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (404, 'Капуста тушеная', 'Белокочанная капуста тушеная с морковью и луком', 28.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 28.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (405, 'Курица по-китайски', 'Кусочки курицы в кисло-сладком соусе с овощами', 72.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 72.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (406, 'Чебуреки', 'Хрустящие чебуреки с сочной мясной начинкой', 58.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 58.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (408, 'Равиоли', 'Итальянские равиоли с сырной начинкой', 65.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 65.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (409, 'Картошка жареная', 'Золотистая жареная картошка с луком и зеленью', 32.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 32.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (410, 'Рис отварной', 'Рассыпчатый белый рис с маслом', 25.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 25.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (411, 'Гречка', 'Рассыпчатая гречневая каша с маслом', 28.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 28.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (412, 'Картофель отварной', 'Молодой картофель отварной с укропом', 26.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 26.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (413, 'Макароны', 'Отварные макароны с маслом и сыром', 22.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 22.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (414, 'Пюре картофельное', 'Нежное картофельное пюре на молоке с маслом', 35.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 35.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (416, 'Солянка мясная', 'Сытная солянка с копченостями и оливками', 48.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 48.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (417, 'Щи', 'Кислые щи из квашеной капусты с мясом', 35.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 35.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (418, 'Суп гороховый', 'Наваристый гороховый суп с копченостями', 32.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 32.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (419, 'Харчо', 'Острый грузинский суп с мясом и рисом', 42.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 42.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (420, 'Лагман', 'Узбекский суп с лапшой и мясом', 45.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 45.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (423, 'Сырники', 'Нежные творожные сырники со сметаной', 52.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 52.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (424, 'Чебуреки с Мясом Жареные', 'Хрустящие чебуреки с сочной мясной начинкой, обжаренные до золотистой корочки', 65.50, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 65.50, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (425, 'Пирожок с Мясом', 'Сытный пирожок с ароматной мясной начинкой, выпеченный по домашнему рецепту', 45.80, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 45.80, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (427, 'Пирожок с Картофелем', 'Домашний пирожок с нежной картофельной начинкой и зеленью', 35.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 35.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (428, 'Пирожок с Яблоком', 'Сладкий пирожок с ароматной яблочной начинкой и корицей', 42.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 18:46:47.892589', true, 42.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (415, 'Борщ', 'Традиционный украинский борщ со сметаной', 38.50, '/uploads/images/image-1750192273390-458955015.webp', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-17 20:36:16.722', true, 38.50, 'piece', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (426, 'Пирожок с Зеленым Луком и Яйцом', 'Традиционный пирожок с начинкой из свежего зеленого лука и вареных яиц', 38.50, '', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-18 14:43:39.892', true, 38.50, 'piece', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (421, 'Блинчики с Куриной Грудкой и Сыром', 'Сочная начинка из нежной куриной грудки, плавленого сыра, завернутая в тонкие и румяные блинчики. Прекрасный перекус и полноценное второе блюдо во время обеда.', 62.90, NULL, true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-30 09:56:42.616', true, 62.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.products VALUES (422, 'Блинчики с Мясом', 'Традиционное русское лакомство – тонкие и румяные блинчики. Блинчики с богатой мясной начинкой станут прекрасным перекусом или полноценным вторым блюдом на завтрак или обед.', 58.90, '', true, 'in_stock', 0, '2025-06-17 18:46:47.892589', '2025-06-22 22:49:35.391', true, 58.90, '100g', false, NULL, NULL, 'available', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.push_subscriptions VALUES (5, 'admin', 'https://fcm.googleapis.com/fcm/send/fu7ab4Vyz14:APA91bHYODZ0W2avG6Y9Oy4iHMKdYVVeNCDKjQLOMo8PcQo4N8EP1-CuotuHlugbhBxxh7mvr22YG80jtTUJ3rQ5f3IXUg-TlCDYJKsOe7cKrQJv9cirU2Wkn5o0Mwtu9f0-0AyiNL6t', 'BBu9xy2DaaUY3Q5byfjqoRKxz5r9/+n5CF2dhi1n6dXAirubOXmVX8VTbbs1glwce0vgWTyPPiFyPlwC6D354EY=', '54c0Ge3E2e22mWLdyODOOw==', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', '2025-07-03 21:52:28.041185', '2025-07-03 22:03:20.712');


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.session VALUES ('5FNntfTEtBta1Dsv20qmnRauiUbeHKaO', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-04T21:14:01.334Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 21:21:47');
INSERT INTO public.session VALUES ('SNJCsYzKLSxKBvd9CqNEe8eiFWFJ6kmS', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-04T21:23:12.192Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 21:24:51');
INSERT INTO public.session VALUES ('nRIS2MK4yfXAfwsZ5aTXB6u1xSbq98lt', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-04T21:03:25.719Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 21:10:04');
INSERT INTO public.session VALUES ('78JnhF28Q775v_6nHa-w2dHPHRdylRfh', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-04T20:18:35.017Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 23:04:52');
INSERT INTO public.session VALUES ('wM7Vm7YnSElIeT3kSYUH4WF70rlTgeah', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-03T21:54:09.643Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 21:54:08');
INSERT INTO public.session VALUES ('NavruB2t7KRt3AkhyGsjGaF5gZGCT5Fk', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-04T21:52:03.811Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 21:59:11');
INSERT INTO public.session VALUES ('u06oF_g1wNa-V_myLNc49xUCI2dmEs15', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-04T22:00:08.736Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 22:02:16');
INSERT INTO public.session VALUES ('eZuh-5eVB0v4CFezZdwiUtSEeI14mPLX', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-04T22:03:08.702Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}', '2025-07-04 22:04:40');


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sessions VALUES ('4-siSvCtmp8AU5P-jRRt96KCTvFXQPff', '{"cookie": {"path": "/", "secure": true, "expires": "2025-06-26T05:17:50.281Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "491046aa-9b11-42b7-94fd-d84f70bd4f20", "exp": 1750313869, "iat": 1750310269, "iss": "https://replit.com/oidc", "sub": "43948959", "email": "alexjc55@gmail.com", "at_hash": "_i_nTXmq5nQ__8aFbUUhuA", "username": "alexjc55", "auth_time": 1750310269, "last_name": "Suzdaltsev", "first_name": "Alexey"}, "expires_at": 1750313869, "access_token": "4PQ__7O-4mNFlOYDCzDVSQJ6qwSzNjOvram66vouTbE", "refresh_token": "cpS_jF7Ze8dd6PGNOHvTWyJZ78iIkfBGKfsdcr1NEIs"}}}', '2025-06-26 05:51:07');
INSERT INTO public.sessions VALUES ('VY7KN86OYX_PEP7ro_qQOZbB8WRChQWl', '{"cookie": {"path": "/", "secure": true, "expires": "2025-06-26T06:24:24.957Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "491046aa-9b11-42b7-94fd-d84f70bd4f20", "exp": 1750317864, "iat": 1750314264, "iss": "https://replit.com/oidc", "sub": "43948959", "email": "alexjc55@gmail.com", "at_hash": "qmn8c3mjy1MA2UcGOa2voQ", "username": "alexjc55", "auth_time": 1750289942, "last_name": "Suzdaltsev", "first_name": "Alexey"}, "expires_at": 1750317864, "access_token": "P2bI1irg1Wb-lwrA_lk5EKASWrhHHIGyqqF_ranPcTO", "refresh_token": "5-FOy5QbJg06Dx_Rlsdy87tCwvQXyi02Vv_CfXWDK7g"}}}', '2025-06-26 06:30:12');
INSERT INTO public.sessions VALUES ('nsbTrhb7JHzFJPYPFE7Y3QPb4ciXGqzd', '{"cookie": {"path": "/", "secure": true, "expires": "2025-06-25T20:28:03.790Z", "httpOnly": true, "originalMaxAge": 604800000}}', '2025-06-25 20:43:33');
INSERT INTO public.sessions VALUES ('3yWS7K4eKtnyc2UzDoEZNvOmddd8fupE', '{"cookie": {"path": "/", "secure": true, "expires": "2025-06-25T20:17:09.575Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "itXE_jVaaleNw0ij0zgvDdYhkscPD53BdS7yvDP2lLk"}}', '2025-06-25 20:17:10');
INSERT INTO public.sessions VALUES ('So7IMzBJAHL8kLB_8yIc3fp5AsKVC57u', '{"cookie": {"path": "/", "secure": true, "expires": "2025-06-25T20:17:23.034Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "_h8Vqy-jfsFEXN85F7xwhgPfAJwWoPkreG3cF3UiYis"}}', '2025-06-25 20:17:24');
INSERT INTO public.sessions VALUES ('Tl8X2JHr0npnf81FmjjNTGxANuQFAJY2', '{"cookie": {"path": "/", "secure": true, "expires": "2025-06-26T05:31:17.303Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "R8xwrlvEdOWfFEkQF2bQ2HqXHe8FQCHmSoh9NeBtldU"}}', '2025-06-26 05:31:18');


--
-- Data for Name: store_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.store_settings VALUES (1, 'eDAHouse', 'Заказывай свежие блюда на развес — от повседневных обедов до праздничных угощений. Быстро, удобно и по-домашнему вкусно. Попробуй!', '+972-50-123-4567', 'info@edahouse.com', '', '{"friday": "09:00-15:00", "monday": "09:00-21:00", "sunday": "10:00-20:00", "tuesday": "09:00-21:00", "saturday": "", "thursday": "09:00-21:00", "wednesday": "09:00-21:00"}', 15.00, NULL, '[{"fee": 0, "name": "Наличными в магазине", "enabled": true, "name_ar": "", "name_en": "Cash in Shop", "name_he": ""}, {"fee": 0, "name": "Банковская карта по телефону", "enabled": true, "name_ar": "", "name_en": "Cash in Shop", "name_he": ""}]', true, true, '2025-07-01 22:03:44.847', 2, 4, '/uploads/images/image-1751123008177-666108252.png', 'Доставка осуществляется ежедневно с 9:00 до 21:00. Минимальная сумма заказа для доставки - 500 рублей.', 'Принимаем наличные, банковские карты и онлайн платежи. Комиссия за обслуживание не взимается.', '[]', 'О нашей еде', '/uploads/images/image-1750201280286-954389557.jpg', 'Скидка', true, true, true, true, false, 'sunday', '/uploads/images/image-1751136136616-3600107.jpg', '', '/uploads/images/image-1751136139557-242526755.jpg', '', true, 25, NULL, '<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=''2.0'';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,''script'',
''https://connect.facebook.net/en_US/fbevents.js'');
fbq(''init'', ''1211785016960429'');
fbq(''track'', ''PageView'');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1211785016960429&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->', '', true, '', 'Здравствуйте! Интересует ваша продукция.', true, 'text', '/uploads/images/image-1751136130997-867272757.jpg', '', '#f97316', '#ffffff', 'Добро пожаловать в eDAHouse', 'Готовые блюда высокого качества с доставкой на дом', 'Свежие готовые блюда каждый день', 'Быстрая доставка в удобное время', 'Широкий выбор блюд на любой вкус', '{"canViewUsers": false, "canManageUsers": false, "canManageOrders": true, "canManageThemes": false, "canViewSettings": false, "canManageProducts": true, "canManageSettings": false, "canManageCategories": true}', 'ru', '["ru", "he", "ar", "en"]', 'top', 'minimal', 'Смотреть каталог', '#categories', 'Phone', '050-123-4567', 'Truck', 'Бесплатная достака от 300₪', 'ChefHat', 'Собственное производство', '/uploads/images/image-1751099891385-311138208.jpg', '', '', '', NULL, '', '', '', '', '', '', '', '', '', NULL, '', '', '', NULL, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '/uploads/images/image-1751405575061-196959045.png', 'eDAHouse', 'Готовая еда с доставкой', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.themes VALUES ('default_theme_1750432574.178085', 'Стандартная тема', 'Базовая оранжевая тема сайта', true, 'hsl(24.6, 95%, 53.1%)', 'hsl(20.5, 90%, 48%)', 'hsl(24.6, 95%, 96%)', 'hsl(210, 40%, 98%)', 'hsl(210, 40%, 85%)', 'hsl(142, 76%, 36%)', 'hsl(142, 76%, 96%)', 'hsl(38, 92%, 50%)', 'hsl(38, 92%, 96%)', 'hsl(0, 84%, 60%)', 'hsl(0, 84%, 96%)', 'hsl(221, 83%, 53%)', 'hsl(221, 83%, 96%)', 'hsl(0, 0%, 100%)', 'hsl(210, 40%, 98%)', 'hsl(210, 40%, 96%)', 'hsl(214, 32%, 91%)', 'hsl(213, 27%, 84%)', 'hsl(215, 20%, 65%)', 'hsl(215, 16%, 47%)', 'hsl(215, 19%, 35%)', 'hsl(215, 25%, 27%)', 'hsl(217, 33%, 17%)', 'hsl(222, 84%, 5%)', 'Poppins, sans-serif', 'Inter, sans-serif', '0 4px 14px 0 rgba(255, 102, 0, 0.3)', '0 4px 14px 0 rgba(34, 197, 94, 0.3)', '0 4px 14px 0 rgba(245, 158, 11, 0.3)', '0 4px 14px 0 rgba(239, 68, 68, 0.3)', '0 4px 14px 0 rgba(59, 130, 246, 0.3)', '0 4px 14px 0 rgba(107, 114, 128, 0.3)', '2025-06-20 15:16:14.178085', '2025-07-01 19:30:27.964', 'hsl(0, 0%, 100%)', '0 4px 14px 0 rgba(147, 51, 234, 0.3)', 'hsl(262, 83%, 58%)', 'hsl(262, 83%, 96%)', 'hsl(0, 84%, 60%)', 'hsl(262, 83%, 48%)', 'hsl(220, 91%, 54%)', 'hsl(142, 76%, 36%)', 'hsl(262, 83%, 58%)', 'minimal', 'Смотреть каталог', '#categories', 'Phone', '050-123-4567', 'Truck', 'Бесплатная достака от 300₪', 'ChefHat', 'Собственное производство', true, true, true, 'top', true, true, true, true, false, true, '', 'Здравствуйте! Интересует ваша продукция.', '/uploads/images/image-1751123008177-666108252.png', '/uploads/images/image-1751099891385-311138208.jpg', true, 'text', '/uploads/images/image-1751136130997-867272757.jpg', '', '#f97316', '#ffffff', true, '/uploads/images/image-1751136136616-3600107.jpg', '', '/uploads/images/image-1751136139557-242526755.jpg', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_addresses VALUES (1, '43948959', 'Дом ', 'Saadia Gaon 6/2, Haifa', true, '2025-06-18 15:16:48.202661', '2025-06-18 15:16:48.202661');
INSERT INTO public.user_addresses VALUES (2, 'admin', 'Dom', 'Stadia Gaon 6, Haifa', false, '2025-06-19 11:57:15.22828', '2025-06-19 11:57:15.22828');
INSERT INTO public.user_addresses VALUES (3, 'admin', 'Dom', 'Stadia Gaon 6, Haifa', true, '2025-06-19 11:57:15.993345', '2025-06-19 11:57:15.993345');
INSERT INTO public.user_addresses VALUES (4, 'manual_1750335030269_29c6n9pl8', 'Дом', 'Adress 123', false, '2025-06-19 12:10:30.85375', '2025-06-19 12:10:30.85375');
INSERT INTO public.user_addresses VALUES (5, 'manual_1750335401590_mpgm1w61z', 'Дом', 'Test address 11', false, '2025-06-19 12:16:42.132982', '2025-06-19 12:16:42.132982');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('customer', 'customer@example.com', 'Клиент', 'Тестовый', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', 'customer', '2025-06-17 18:18:43.509353', '2025-06-19 08:43:46.915', '', NULL, 'ef99c17ddf145b2e72dd8fdfba9868ab20dff1fc3208c53b6b0098185f41418ffeb6aa51f74fac827f7a3b738f3302d781b140be09028659ee2699db095d32c2.bd8a4b36aa1ceac142e03240e75f7da8', NULL, NULL, 'customer');
INSERT INTO public.users VALUES ('worker', 'worker@restaurant.com', 'Работник', 'Кухни', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'worker', '2025-06-17 18:18:43.509353', '2025-06-19 08:54:05.95', '', NULL, 'e87eeb2e2ac8324488ec38dc38bd5126aa573502c3122807877adac947d796722fc11ee276f82bd97ba26954220679b17123a2bbd289242bd2351e5f67575a17.34c7f64554171a937feee163e194bac9', NULL, NULL, 'worker');
INSERT INTO public.users VALUES ('admin', 'admin@restaurant.com', 'Администратор', 'Системы', '', 'admin', '2025-06-17 18:18:43.509353', '2025-06-19 11:56:27.918', '0528496528', NULL, '57dc1906d8c538edb1bae5f69089c88a2b1ecb4f980fbbe0ef7727a425abca9ff0addbddd31302f386dc53c757c08e1eabee3de795583cdb6743c4215ca35370.6971e6939d9f818b2b502dbd5979bb11', NULL, NULL, 'admin');
INSERT INTO public.users VALUES ('manual_1750334689091_z1ix5ku2j', 'aaasssddd@gggfff.com', 'Asdfgh', 'Bhhfffgh', NULL, 'customer', '2025-06-19 12:04:49.091', '2025-06-19 12:04:49.091', '12345678887', NULL, 'fd4b5bf667e21d7c82ecc4bbc9a5c7c649ae5e80d6bfd9dafa92fd8db1008fca1fa77e014094465afbfabac9b6a0b8df505ff26a7246a4c19e786b7a8efa3649.b7944b23a417b4321a3de8b49925c635', NULL, NULL, 'aaasssddd@gggfff.com');
INSERT INTO public.users VALUES ('manual_1750335030269_29c6n9pl8', 'aaawwww@gmail.com', 'Asfhjkhgh', 'Tyhkjgf', NULL, 'customer', '2025-06-19 12:10:30.269', '2025-06-19 12:10:30.269', '1234567896543', NULL, '4f04855f71500dab60309b85941272696bdc7801058df84a08252e16f14c2b52cb7faa147d52df4a1abafd09a10b393146ecd21fcda9433b44a41eaf2eb8031d.d9df7a2d12d49e606690cf9d627dadc9', NULL, NULL, 'aaawwww@gmail.com');
INSERT INTO public.users VALUES ('manual_1750335401590_mpgm1w61z', 'test@test.com', 'Test', 'Test', NULL, 'customer', '2025-06-19 12:16:41.59', '2025-06-19 12:16:41.59', '1234567877788', NULL, '2a68fd70bfa6f35882a3158dd61c2d8ac512f5b18138bd44645ef8066b892e4107debbe23d9379858ab5b3adbe8e4e5f02947145cd0738cd81650f71938692f0.cb205412bf65592f9be321e3d4d45d17', NULL, NULL, 'test@test.com');
INSERT INTO public.users VALUES ('43948959', 'alexjc55@gmail.com', 'Alexey', 'Suzdaltsev', NULL, 'admin', '2025-06-17 17:26:49.237417', '2025-06-19 05:30:38.958', '+972528496528', NULL, NULL, NULL, NULL, 'mainadmin');


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 59, true);


--
-- Name: marketing_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.marketing_notifications_id_seq', 35, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 85, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 18, true);


--
-- Name: product_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_categories_id_seq', 86, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 428, true);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.push_subscriptions_id_seq', 5, true);


--
-- Name: store_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.store_settings_id_seq', 1, true);


--
-- Name: user_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_addresses_id_seq', 5, true);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: marketing_notifications marketing_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_notifications
    ADD CONSTRAINT marketing_notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_product_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_category_id_key UNIQUE (product_id, category_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: store_settings store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);


--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: product_categories product_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

