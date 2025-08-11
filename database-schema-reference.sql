--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

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
    barcode character varying(50),
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
    logo_url_en character varying(500) DEFAULT ''::character varying,
    logo_url_he character varying(500) DEFAULT ''::character varying,
    logo_url_ar character varying(500) DEFAULT ''::character varying,
    banner_image_url_en character varying(500) DEFAULT ''::character varying,
    banner_image_url_he character varying(500) DEFAULT ''::character varying,
    banner_image_url_ar character varying(500) DEFAULT ''::character varying,
    cart_banner_image_en character varying(500) DEFAULT ''::character varying,
    cart_banner_image_he character varying(500) DEFAULT ''::character varying,
    cart_banner_image_ar character varying(500) DEFAULT ''::character varying,
    pwa_icon_en character varying(500) DEFAULT ''::character varying,
    pwa_icon_he character varying(500) DEFAULT ''::character varying,
    pwa_icon_ar character varying(500) DEFAULT ''::character varying,
    barcode_system_enabled boolean DEFAULT false,
    barcode_product_code_start integer DEFAULT 2,
    barcode_product_code_end integer DEFAULT 5,
    barcode_weight_start integer DEFAULT 6,
    barcode_weight_end integer DEFAULT 10,
    barcode_weight_unit character varying(20) DEFAULT 'grams'::character varying,
    enable_admin_order_creation boolean DEFAULT true,
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

