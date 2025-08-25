--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-0+deb12u1)
-- Dumped by pg_dump version 15.13 (Debian 15.13-0+deb12u1)

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
-- Name: categories; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.categories OWNER TO edahouse_usr;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO edahouse_usr;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: marketing_notifications; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.marketing_notifications OWNER TO edahouse_usr;

--
-- Name: marketing_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.marketing_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.marketing_notifications_id_seq OWNER TO edahouse_usr;

--
-- Name: marketing_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.marketing_notifications_id_seq OWNED BY public.marketing_notifications.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.order_items OWNER TO edahouse_usr;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_items_id_seq OWNER TO edahouse_usr;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.orders OWNER TO edahouse_usr;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_id_seq OWNER TO edahouse_usr;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: edahouse_usr
--

CREATE TABLE public.product_categories (
    id integer NOT NULL,
    product_id integer NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_categories OWNER TO edahouse_usr;

--
-- Name: product_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.product_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_categories_id_seq OWNER TO edahouse_usr;

--
-- Name: product_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.product_categories_id_seq OWNED BY public.product_categories.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: edahouse_usr
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
    ingredients text,
    ingredients_en text,
    ingredients_he text,
    ingredients_ar text,
    slider_image text,
    slider_image_en text,
    slider_image_he text,
    slider_image_ar text,
    CONSTRAINT products_availability_status_check CHECK (((availability_status)::text = ANY (ARRAY[('available'::character varying)::text, ('out_of_stock_today'::character varying)::text, ('completely_unavailable'::character varying)::text])))
);


ALTER TABLE public.products OWNER TO edahouse_usr;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO edahouse_usr;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.push_subscriptions OWNER TO edahouse_usr;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.push_subscriptions_id_seq OWNER TO edahouse_usr;

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: edahouse_usr
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO edahouse_usr;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: edahouse_usr
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO edahouse_usr;

--
-- Name: store_settings; Type: TABLE; Schema: public; Owner: edahouse_usr
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
    barcode_weight_unit character varying DEFAULT 'grams'::character varying,
    enable_admin_order_creation boolean DEFAULT true,
    slider_autoplay boolean DEFAULT true,
    slider_speed integer DEFAULT 5000,
    slider_effect character varying(20) DEFAULT 'fade'::character varying,
    slide1_image character varying(500),
    slide1_title character varying(255),
    slide1_subtitle text,
    slide1_button_text character varying(100),
    slide1_button_link character varying(500),
    slide1_text_position character varying(20) DEFAULT 'left-center'::character varying,
    slide2_image character varying(500),
    slide2_title character varying(255),
    slide2_subtitle text,
    slide2_button_text character varying(100),
    slide2_button_link character varying(500),
    slide2_text_position character varying(20) DEFAULT 'left-center'::character varying,
    slide3_image character varying(500),
    slide3_title character varying(255),
    slide3_subtitle text,
    slide3_button_text character varying(100),
    slide3_button_link character varying(500),
    slide3_text_position character varying(20) DEFAULT 'left-center'::character varying,
    slide4_image character varying(500),
    slide4_title character varying(255),
    slide4_subtitle text,
    slide4_button_text character varying(100),
    slide4_button_link character varying(500),
    slide4_text_position character varying(20) DEFAULT 'left'::character varying,
    slide5_image character varying(500),
    slide5_title character varying(255),
    slide5_subtitle text,
    slide5_button_text character varying(100),
    slide5_button_link character varying(500),
    slide5_text_position character varying(20) DEFAULT 'left'::character varying,
    CONSTRAINT store_settings_info_blocks_position_check CHECK (((info_blocks_position)::text = ANY (ARRAY[('top'::character varying)::text, ('bottom'::character varying)::text])))
);


ALTER TABLE public.store_settings OWNER TO edahouse_usr;

--
-- Name: store_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.store_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.store_settings_id_seq OWNER TO edahouse_usr;

--
-- Name: store_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.store_settings_id_seq OWNED BY public.store_settings.id;


--
-- Name: themes; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.themes OWNER TO edahouse_usr;

--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.user_addresses OWNER TO edahouse_usr;

--
-- Name: user_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: edahouse_usr
--

CREATE SEQUENCE public.user_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_addresses_id_seq OWNER TO edahouse_usr;

--
-- Name: user_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: edahouse_usr
--

ALTER SEQUENCE public.user_addresses_id_seq OWNED BY public.user_addresses.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: edahouse_usr
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


ALTER TABLE public.users OWNER TO edahouse_usr;

--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: marketing_notifications id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.marketing_notifications ALTER COLUMN id SET DEFAULT nextval('public.marketing_notifications_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: product_categories id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.product_categories ALTER COLUMN id SET DEFAULT nextval('public.product_categories_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: store_settings id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.store_settings ALTER COLUMN id SET DEFAULT nextval('public.store_settings_id_seq'::regclass);


--
-- Name: user_addresses id; Type: DEFAULT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.user_addresses ALTER COLUMN id SET DEFAULT nextval('public.user_addresses_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.categories (id, name, description, icon, is_active, sort_order, created_at, updated_at, name_en, name_he, name_ar, description_en, description_he, description_ar) FROM stdin;
47	Салаты	Свежие салаты и закуски	🥗	t	1	2025-06-17 18:46:47.834072	2025-07-06 16:28:16.765		סלטים			סלטים טריים ומנות פתיחה	
48	Горячие блюда	Основные блюда на развес	🍖	t	2	2025-06-17 18:46:47.834072	2025-07-04 19:52:46.021	\N	מנות חמות	\N	\N	מנות עיקריות במשקל	\N
49	Гарниры	Каши, картофель, овощи	🍚	t	3	2025-06-17 18:46:47.834072	2025-07-04 19:52:46.066	\N	תוספות	\N	\N	דגנים, תפוחי אדמה, ירקות	\N
50	Супы	Первые блюда	🍲	t	4	2025-06-17 18:46:47.834072	2025-07-04 19:52:46.111	\N	מרקים	\N	\N	מנות ראשונות	\N
51	Десерты	Блинчики, сырники, корндоги, торты	🥞	t	5	2025-06-17 18:46:47.834072	2025-08-06 19:46:12.695		קינוחים			בלינצ'ס, לביבות גבינה, קורן דוגס, עוגות	
52	Выпечка	Свежие пирожки с разными начинками	🥟	t	6	2025-06-17 18:46:47.834072	2025-08-06 19:46:33.986		מאפים			פירושקי טריים עם מילויים שונים	
\.


--
-- Data for Name: marketing_notifications; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.marketing_notifications (id, title, message, title_en, message_en, title_he, message_he, title_ar, message_ar, sent_count, created_by, sent_at, created_at) FROM stdin;
1	Привет	Тест	\N	\N	\N	\N	\N	\N	0	admin	2025-07-02 00:13:10.549	2025-07-02 00:13:10.567794
2	Все привет	У нас акция -30%	\N	\N	\N	\N	\N	\N	0	admin	2025-07-02 00:39:47.022	2025-07-02 00:39:47.040835
3	тест	уведомления от еда	\N	\N	\N	\N	\N	\N	4	admin	2025-07-02 00:41:04.046	2025-07-02 00:41:04.063921
4	Привет Мир	Скидка на рога и копыта 300%	\N	\N	\N	\N	\N	\N	4	admin	2025-07-02 01:12:55.819	2025-07-02 01:12:55.837683
5	тестовое	Вот такая скидка!	\N	\N	\N	\N	\N	\N	4	admin	2025-07-02 01:17:15.527	2025-07-02 01:17:15.545798
6	еще одно	Леша или спать	\N	\N	\N	\N	\N	\N	1	admin	2025-07-02 01:20:54.133	2025-07-02 01:20:54.151947
7	еще одна проверка	отправляем рекламное сообщение	\N	\N	\N	\N	\N	\N	1	admin	2025-07-02 01:22:47.851	2025-07-02 01:22:47.868641
8	еще	одно	\N	\N	\N	\N	\N	\N	1	admin	2025-07-02 01:23:03.239	2025-07-02 01:23:03.256465
9	Test	Test message	\N	\N	\N	\N	\N	\N	2	test	2025-07-02 01:33:43.853	2025-07-02 01:33:44.836203
10	Акция	Все салаты -15%	\N	\N	\N	\N	\N	\N	2	admin	2025-07-02 01:34:57.56	2025-07-02 01:34:57.578623
11	Тест модального окна	Проверка отображения уведомления в модальном окне	\N	\N	\N	\N	\N	\N	2	test	2025-07-02 01:39:46.673	2025-07-02 01:39:46.691075
12	тест	тут будет информация	\N	\N	\N	\N	\N	\N	2	admin	2025-07-02 01:41:23.689	2025-07-02 01:41:23.707226
13	Тест модального окна	Проверка логирования и отображения модального окна	\N	\N	\N	\N	\N	\N	2	test	2025-07-02 01:42:18.707	2025-07-02 01:42:18.727513
14	тест	окно	\N	\N	\N	\N	\N	\N	2	admin	2025-07-02 01:47:03.187	2025-07-02 01:47:03.205572
15	Тест алерта	Проверка получения сообщений от Service Worker	\N	\N	\N	\N	\N	\N	2	test	2025-07-02 01:49:12.542	2025-07-02 01:49:15.580385
16	Финальный тест	Проверяем работу модального окна	\N	\N	\N	\N	\N	\N	2	test	2025-07-02 01:49:37.894	2025-07-02 01:49:37.911852
17	Лютый тест	Проверяем	\N	\N	\N	\N	\N	\N	2	admin	2025-07-03 20:18:57.96	2025-07-03 20:18:57.978109
18	тест	тест	test	test	\N	\N	\N	\N	1	admin	2025-07-03 20:19:45.84	2025-07-03 20:19:45.858097
19	тест	тест	test	test	\N	\N	\N	\N	1	admin	2025-07-03 20:20:16.867	2025-07-03 20:20:16.883837
20	еше обно сообщение	Давай проверим	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 20:23:23.21	2025-07-03 20:23:23.229466
21	тест	тест	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 20:28:00.579	2025-07-03 20:28:00.597769
22	тест	тест	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:01:30.624	2025-07-03 21:01:30.643201
23	теск	порп олрплорпл	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:02:56.719	2025-07-03 21:02:56.737118
24	ыыыыы	ыыыыы	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:07:51.714	2025-07-03 21:07:51.733267
25	ыыыыы	ыыыыыыыыыыы	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:10:18.922	2025-07-03 21:10:18.941837
26	гнорапрп	рпп рпрол од	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:12:26.749	2025-07-03 21:12:26.767716
27	олрпорар	ерпплородлб	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:12:57.547	2025-07-03 21:12:57.564907
28	ggxf	Dftyyu	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:14:42.538	2025-07-03 21:14:42.556104
29	Пока не понятно	Пока не понятно как это все будет работать и сможет ли пользователь во всем этом разобраться	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:15:26.877	2025-07-03 21:15:26.896051
30	еще 	еще один тест	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:15:56.253	2025-07-03 21:15:56.271122
31	тетст	вои авлоавылдаыв	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:16:16.763	2025-07-03 21:16:16.7819
32	еще тест	тест еще	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:21:22.195	2025-07-03 21:21:22.214716
33	тест	тест	\N	\N	\N	\N	\N	\N	1	admin	2025-07-03 21:22:20.401	2025-07-03 21:22:20.417763
34	тест	тест	\N	\N	\N	\N	\N	\N	0	admin	2025-07-03 21:40:17.843	2025-07-03 21:40:17.862732
35	тест	тест	\N	\N	\N	\N	\N	\N	0	admin	2025-07-03 21:44:18.693	2025-07-03 21:44:18.711939
36	нпо	рпарп	\N	\N	\N	\N	\N	\N	0	admin	2025-07-06 00:01:45.119	2025-07-06 00:01:45.12107
37	ввв	ввв	\N	\N	\N	\N	\N	\N	0	admin	2025-07-06 00:07:39.357	2025-07-06 00:07:39.357882
38	Акция	Все по 100!	\N	\N	\N	\N	\N	\N	1	admin	2025-07-06 17:55:15.313	2025-07-06 17:55:15.315492
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.order_items (id, order_id, product_id, quantity, price_per_kg, total_price, created_at) FROM stdin;
33	1	382	2.000	58.80	97.60	2025-06-18 13:42:33.672122
43	2	382	1.000	58.80	58.80	2025-06-18 14:30:32.850749
44	2	381	1.000	52.90	50.25	2025-06-18 14:30:32.850749
45	2	421	1.000	62.90	42.90	2025-06-18 14:30:32.850749
46	3	381	100.000	52.90	52.90	2025-06-18 15:46:57.762544
47	3	426	2.000	38.50	77.00	2025-06-18 15:46:57.762544
48	4	380	100.000	45.01	45.10	2025-06-18 16:03:52.340736
49	4	381	100.000	52.90	52.90	2025-06-18 16:03:52.340736
50	4	426	1.000	38.50	38.50	2025-06-18 16:03:52.340736
54	5	381	100.000	52.90	52.90	2025-06-18 22:55:36.794173
55	5	406	200.000	58.90	117.80	2025-06-18 22:55:36.794173
56	6	382	100.000	58.80	58.80	2025-06-18 23:51:11.741996
57	7	426	2.000	38.50	77.00	2025-06-19 00:16:26.722272
58	8	381	100.000	52.90	52.90	2025-06-19 00:39:48.609281
60	9	382	100.000	58.80	58.80	2025-06-19 00:55:13.31813
61	10	380	100.000	45.01	45.10	2025-06-19 05:30:31.161009
62	11	378	100.000	35.50	35.50	2025-06-19 11:35:44.640522
63	11	382	300.000	58.80	176.40	2025-06-19 11:35:44.640522
64	12	382	100.000	58.80	58.80	2025-06-19 12:00:43.867789
65	13	382	100.000	58.80	58.80	2025-06-19 12:04:49.649031
66	13	381	100.000	52.90	52.90	2025-06-19 12:04:49.649031
67	13	380	100.000	45.01	45.10	2025-06-19 12:04:49.649031
68	14	382	100.000	58.80	58.80	2025-06-19 12:10:31.229895
69	14	381	100.000	52.90	52.90	2025-06-19 12:10:31.229895
70	14	380	100.000	45.01	45.10	2025-06-19 12:10:31.229895
73	16	381	300.000	52.90	158.70	2025-06-19 16:06:08.614807
80	17	380	200.000	45.01	90.10	2025-06-23 22:36:17.324406
81	17	426	5.000	38.50	182.88	2025-06-23 22:36:17.324406
84	18	380	100.000	45.01	45.10	2025-07-01 19:33:01.843666
85	18	381	100.000	52.90	52.90	2025-07-01 19:33:01.843666
86	19	394	100.000	78.50	78.50	2025-07-06 09:04:58.057933
87	19	380	100.000	45.01	45.10	2025-07-06 09:04:58.057933
97	22	386	300.000	28.90	86.70	2025-07-09 05:02:37.380196
98	22	388	100.000	65.90	65.90	2025-07-09 05:02:37.380196
99	22	426	3.000	38.50	115.50	2025-07-09 05:02:37.380196
100	22	401	200.000	89.00	178.00	2025-07-09 05:02:37.380196
101	22	380	100.000	7.90	7.90	2025-07-09 05:02:37.380196
102	23	382	100.000	58.80	58.80	2025-07-09 07:57:33.491313
103	23	381	100.000	52.90	52.90	2025-07-09 07:57:33.491313
104	23	415	1.000	14.90	14.90	2025-07-09 07:57:33.491313
110	25	382	100.000	6.50	6.50	2025-07-31 21:29:34.42488
111	25	381	1.000	25.00	25.00	2025-07-31 21:29:34.42488
112	24	381	1.000	25.00	25.00	2025-07-31 21:29:48.819843
113	26	381	1.000	25.00	25.00	2025-07-31 21:30:09.578393
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.orders (id, user_id, status, total_amount, customer_notes, delivery_address, payment_method, created_at, updated_at, customer_phone, requested_delivery_time, delivery_date, delivery_time, cancellation_reason) FROM stdin;
5	\N	cancelled	170.70		врврпарпа	cash	2025-06-18 20:20:38.960862	2025-07-11 06:54:53.087	543645645654	\N			Другое
1	43948959	cancelled	92.72	\n[DISCOUNTS:{"orderDiscount":{"type":"percentage","value":5,"reason":""},"itemDiscounts":null}]		cash	2025-06-17 19:00:50.571966	2025-07-11 06:40:08.849		\N			Другое
17	admin	cancelled	115.00	\n[ORDER_DATA:{"orderDiscount":{"type":"percentage","value":10,"reason":"так"},"itemDiscounts":{"1":{"type":"percentage","value":5,"reason":""}},"manualPriceOverride":{"enabled":true,"value":100}}]	Stadia Gaon 6, Haifa	Картой по телефону или в магазине	2025-06-20 13:31:40.324299	2025-07-11 06:40:18.876	0528496528	\N	2025-06-20	09:00 - 11:00	Другое
4	43948959	cancelled	151.50	\N	Saadia Gaon 6/2, Haifa	cash	2025-06-18 16:03:52.340736	2025-07-11 06:54:59.105	+972528496528	\N	2025-06-19	12:00-14:00	Другое
16	admin	cancelled	173.70	\N	Stadia Gaon 6, Haifa	Картой по телефону или в магазине	2025-06-19 16:06:08.614807	2025-07-11 06:53:59.937	0528496528	\N	2025-06-24	19:00 - 21:00	Другое
14	\N	cancelled	156.80	\N	Adress 123	Картой по телефону или в магазине	2025-06-19 12:10:31.229895	2025-07-11 06:54:08.82	1234567896543	\N	2025-06-19	19:00 - 21:00	Другое
13	\N	cancelled	156.80	\N	Asdfghjjbg 56	Картой по телефону или в магазине	2025-06-19 12:04:49.649031	2025-07-11 06:54:12.91	12345678887	\N	2025-06-19	17:00 - 19:00	Другое
12	\N	cancelled	58.80	\N	Stadia Gaon 6, Haifa	Картой по телефону или в магазине	2025-06-19 12:00:43.867789	2025-07-11 06:54:16.981	0528496528	\N	2025-06-19	19:00 - 21:00	Другое
22	admin	delivered	474.00	\N	Ваппромапооь		2025-07-09 05:02:37.380196	2025-07-11 06:40:39.428	0528496528	\N	2025-07-10		\N
23	admin	cancelled	146.60	\N	Stadia Gaon 6, Haifa	Банковская карта по телефону	2025-07-09 07:57:33.491313	2025-07-11 06:53:31.91	0528496528	\N	2025-07-10		Другое
19	admin	cancelled	123.60	\N	Stadia Gaon 6, Haifa	Банковская карта по телефону	2025-07-06 09:04:58.057933	2025-07-11 06:53:46.406	0528496528	\N	2025-07-07	15:00 - 17:00	Другое
18	admin	cancelled	155.00	\n[ORDER_DATA:{"orderDiscount":{"type":"percentage","value":10,"reason":""},"itemDiscounts":null,"manualPriceOverride":{"enabled":true,"value":155}}]	Stadia Gaon 6, Haifa	Картой по телефону или в магазине	2025-06-30 08:24:30.370992	2025-07-11 06:53:55.694	0528496528	\N	2025-07-01	13:00 - 15:00	Другое
11	\N	cancelled	211.90	\N	Dostavka 5	Картой по телефону или в магазине	2025-06-19 11:35:44.640522	2025-07-11 06:54:24.527	\N	\N	2025-06-19	17:00 - 19:00	Другое
10	\N	cancelled	45.10	\N	Haifa, S Gaon 6	Картой по телефону или в магазине	2025-06-19 05:30:31.161009	2025-07-11 06:54:29.871	+9733396528	\N	2025-06-19	13:00 - 15:00	Другое
9	43948959	cancelled	58.80		Saadia Gaon 6/2, Haifa	Картой по телефону или в магазине	2025-06-19 00:54:00.374156	2025-07-11 06:54:34.755	+972528496528	\N	2025-06-25	11:00 - 13:00	Другое
8	43948959	cancelled	52.90	\N	Saadia Gaon 6/2, Haifa	\N	2025-06-19 00:39:48.609281	2025-07-11 06:54:42.485	+972528496528	\N	2025-06-25	17:00	Другое
7	43948959	cancelled	77.00	\N	Saadia Gaon 6/2, Haifa	\N	2025-06-19 00:16:26.722272	2025-07-11 06:54:46.495	+972528496528	\N	2025-07-04	13:00	Другое
6	43948959	cancelled	58.80	\N	Saadia Gaon 6/2, Haifa	\N	2025-06-18 23:51:11.741996	2025-07-11 06:54:49.666	\N	\N	\N	\N	Другое
3	43948959	cancelled	144.90	\N	Saadia Gaon 6/2, Haifa	cash	2025-06-18 15:46:57.762544	2025-07-11 06:55:02.487	+972528496528	\N	\N	\N	Другое
2	43948959	cancelled	136.76	\n[DISCOUNTS:{"orderDiscount":{"type":"percentage","value":10,"reason":""},"itemDiscounts":{"1":{"type":"percentage","value":5,"reason":""},"2":{"type":"amount","value":20,"reason":""}}}]	Haifa, Saadia Gaon 6	cash	2025-06-18 13:09:54.933499	2025-07-11 06:55:11.714	+972528496528	\N	2025-06-19	18:00-20:00	Другое
25	admin	cancelled	51.50		Stadia Gaon 6, Haifa	Банковская карта по телефону	2025-07-31 21:25:15.047897	2025-07-31 21:29:34.43	0528496528	\N	2025-08-31	15:00 - 17:00	\N
24	admin	cancelled	45.00		Stadia Gaon 6, Haifa	Банковская карта по телефону	2025-07-31 21:19:44.452804	2025-07-31 21:29:48.822	0528496528	\N	2025-08-03	13:00 - 15:00	\N
26	admin	cancelled	45.00	\N	Stadia Gaon 6, Haifa	Банковская карта по телефону	2025-07-31 21:30:09.578393	2025-08-24 06:13:41.024	0528496528	\N	2025-08-24	13:00 - 15:00	Другое
\.


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.product_categories (id, product_id, category_id, created_at) FROM stdin;
148	388	51	2025-07-12 21:02:58.753037
254	465	48	2025-07-30 21:08:21.579045
150	390	51	2025-07-12 21:09:59.96574
151	400	51	2025-07-12 21:12:44.033553
157	430	51	2025-07-13 19:25:15.392971
165	432	51	2025-07-15 17:15:34.774708
261	387	47	2025-08-04 19:43:33.646232
263	383	47	2025-08-05 07:55:44.654898
264	381	47	2025-08-05 07:55:50.410762
265	431	49	2025-08-05 10:04:16.255371
266	418	51	2025-08-05 10:04:57.196996
267	408	48	2025-08-05 10:05:22.481437
268	384	47	2025-08-05 10:05:50.694038
269	402	51	2025-08-05 15:07:59.610211
271	428	51	2025-08-05 15:08:26.478879
272	392	48	2025-08-05 16:24:45.238451
273	422	52	2025-08-06 19:47:01.299887
178	442	51	2025-07-15 20:06:53.215951
179	434	51	2025-07-15 20:16:35.593344
180	435	47	2025-07-15 20:27:02.062745
181	436	48	2025-07-15 20:31:18.184427
274	456	52	2025-08-06 19:47:25.677971
182	437	47	2025-07-15 20:37:57.453094
183	438	48	2025-07-15 20:47:40.650363
184	439	48	2025-07-15 20:51:35.085153
277	425	52	2025-08-06 19:49:31.238712
185	440	48	2025-07-15 20:56:35.381306
278	427	52	2025-08-06 19:49:54.951808
281	406	52	2025-08-06 19:51:38.260058
284	424	52	2025-08-19 12:28:42.369165
194	443	47	2025-07-22 17:54:01.599151
195	405	48	2025-07-22 17:57:33.666983
92	401	48	2025-07-08 18:34:56.483152
93	377	47	2025-07-08 18:39:34.604184
286	382	47	2025-08-19 13:04:08.769657
95	394	48	2025-07-08 18:54:56.142556
287	396	48	2025-08-24 21:14:18.799005
289	467	50	2025-08-24 21:21:47.175345
196	444	48	2025-07-22 18:13:53.766362
197	445	48	2025-07-22 18:23:10.692025
101	379	47	2025-07-08 19:10:02.30118
198	446	48	2025-07-22 18:28:39.422853
199	447	48	2025-07-22 19:00:44.812312
200	448	48	2025-07-22 19:05:02.820797
201	413	49	2025-07-22 19:09:49.722621
291	468	50	2025-08-24 21:25:59.352811
292	419	50	2025-08-25 14:03:58.938953
113	407	48	2025-07-08 19:42:47.463273
293	426	50	2025-08-25 14:04:09.346383
115	380	47	2025-07-09 05:00:54.251685
116	415	50	2025-07-09 07:56:46.896002
117	403	48	2025-07-09 20:37:36.962479
118	399	48	2025-07-09 20:40:01.139355
294	463	50	2025-08-25 14:04:35.638377
120	412	49	2025-07-09 20:44:00.985547
121	409	49	2025-07-09 20:47:13.946561
122	389	48	2025-07-09 20:51:01.705242
123	391	48	2025-07-09 20:52:21.375651
295	416	50	2025-08-25 14:04:53.409509
128	423	51	2025-07-12 16:10:17.513694
129	393	48	2025-07-12 16:15:26.991553
145	420	51	2025-07-12 20:54:18.753536
146	417	51	2025-07-12 20:58:32.970441
209	397	48	2025-07-24 21:00:39.363865
210	398	48	2025-07-24 21:01:25.251472
211	451	48	2025-07-24 21:06:58.69034
212	452	48	2025-07-24 21:12:58.375505
214	414	49	2025-07-24 21:18:23.751835
215	411	49	2025-07-24 21:19:17.689442
216	410	49	2025-07-24 21:19:51.05544
217	454	48	2025-07-24 21:24:58.841215
218	455	48	2025-07-24 21:30:29.692367
220	378	47	2025-07-24 21:40:02.740633
221	433	47	2025-07-24 21:41:18.070071
222	386	47	2025-07-24 21:42:24.332625
223	404	48	2025-07-24 21:46:20.595546
224	421	47	2025-07-24 21:46:53.846591
227	449	47	2025-07-27 17:57:28.545822
228	395	48	2025-07-27 17:59:39.629233
229	385	47	2025-07-27 18:01:26.351018
230	453	48	2025-07-27 18:05:21.275356
231	450	48	2025-07-27 18:08:48.737102
232	441	48	2025-07-27 18:14:43.969476
243	460	48	2025-07-27 18:20:39.446139
245	457	47	2025-07-27 18:26:36.865997
247	466	47	2025-07-27 18:43:38.726079
248	458	47	2025-07-27 18:49:44.669132
249	459	48	2025-07-27 18:56:38.792436
250	461	48	2025-07-27 19:11:39.627468
251	462	48	2025-07-27 19:15:24.634616
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.products (id, name, description, price_per_kg, image_url, is_active, stock_status, sort_order, created_at, updated_at, is_available, price, unit, is_special_offer, discount_type, discount_value, availability_status, name_en, name_he, name_ar, description_en, description_he, description_ar, image_url_en, image_url_he, image_url_ar, barcode, ingredients, ingredients_en, ingredients_he, ingredients_ar, slider_image, slider_image_en, slider_image_he, slider_image_ar) FROM stdin;
382	Баклажаны по-азиатски	Маринованные баклажаны с чесноком и кориандром	6.50	/uploads/images/image-1752003411150-508537313.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-19 13:04:08.763	t	6.50	100g	f	percentage	\N	available	\N	חצילים באסלוב אסיאתי	\N	\N	חצילים כבושים בשום וכוסברה	\N	\N	\N	\N	\N	**Баклажаны** 100г\nАзиаты 50г\nХорошее настроение 30г		**חצילים** 100ג\nאסיאתיים 50ג\nמצב רוח טוב 30ג					
401	Шницель	Куриный шницель в хрустящей панировке	8.90	/uploads/images/image-1751999510104-477974230.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-08 18:34:56.477	t	8.90	100g	f	\N	\N	available	\N	שניצל	\N	\N	שניצל עוף בפירורי לחם פריכים	\N	\N	\N	\N	\N								
407	Пельмени	Маленькие пельмени 	8.90	/uploads/images/image-1752003764787-579713013.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-08 19:42:47.458	t	8.90	100g	f	\N	\N	available	\N	פלמני	\N	\N	פלמני קטנים	\N	\N	\N	\N	\N								
423	Сырники	Нежные творожные сырники со сметаной	7.90	/uploads/images/image-1752336613349-108533269.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-12 16:10:17.503	t	7.90	100g	f	\N	\N	available	\N	סירניקי	\N	\N	סירניקי גבינה רכים עם שמנת חמוצה	\N	\N	\N	\N	\N								
390	Мусс красный бархат	Этот десерт имеет легкую, нежную текстуру, получается воздушным и пористым	29.00	/uploads/images/image-1752354594006-874058417.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-12 21:09:59.961	t	29.00	piece	f	\N	\N	available	\N	מוס קטיפה אדומה	\N	\N	הקינוח הזה בעל מרקם קל ורך, יוצא אוורירי ונקבובי	\N	\N	\N	\N	\N								
415	Борщ	Традиционный украинский борщ 	14.90	/uploads/images/image-1752001388698-585404987.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 07:56:46.888	t	14.90	portion	f	\N	\N	available	\N	בורש	\N	\N	בורש אוקראיני מסורתי	\N	\N	\N	\N	\N								
409	Картошка жареная	Золотистая жареная картошка с луком и зеленью	4.90	/uploads/images/image-1752094031528-213054001.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 20:47:13.94	t	4.90	100g	f	\N	\N	available	\N	תפוחי אדמה מטוגנים	\N	\N	תפוחי אדמה מטוגנים זהובים עם בצל וירוקים	\N	\N	\N	\N	\N								
396	Плов зеленый	Плов с зеленью, изюмом и специальными специями	9.90	/uploads/images/image-1752339100459-33708083.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-24 21:14:18.79	t	9.90	100g	f	\N	\N	available	\N	פלאף ירוק	\N	\N	פלאף עם ירוקים, צימוקים ותבלינים מיוחדים	\N	\N	\N	\N	\N								
419	Грибной	Ароматный грибной суп с гречкой.	14.90	/uploads/optimized/image-1754334944912-167020969.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-25 14:03:58.932	t	14.90	portion	f	\N	\N	available	\N	מרק פטריות	\N	\N	מרק פטריות ארומטי עם כוסמת	\N	\N	\N	\N	\N								
426	Зеленый Борщ 	Зелёный борщ с яйцом и щавелем	14.90	/uploads/images/image-1752002339984-978968278.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-25 14:04:09.341	t	14.90	portion	f	\N	\N	available	\N	בורש ירוק	\N	\N	בורש ירוק עם ביצה וחמציץ	\N	\N	\N	\N	\N								
416	Солянка сборная мясная	Сытная солянка с копченостями и оливками	19.90	/uploads/images/image-1752002328259-307232028.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-25 14:04:53.403	t	19.90	portion	f	\N	\N	available	\N	סולנקה מעורבת בשר	\N	\N	סולנקה משביעה עם בשר מעושן וזיתים	\N	\N	\N	\N	\N								
420	Мусс Дубай	Этот десерт имеет легкую, нежную текстуру, получается воздушным и пористым	29.00	/uploads/images/image-1752353616664-139683764.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-12 20:54:18.747	t	29.00	piece	f	\N	\N	available	\N	מוס דובאי	\N	\N	הקינוח הזה בעל מרקם קל ורך, יוצא אוורירי ונקבובי	\N	\N	\N	\N	\N								
417	Мусс	Этот десерт имеет легкую, нежную текстуру, получается воздушным и пористым	29.00	/uploads/images/image-1752353909678-520030851.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-12 20:58:32.965	t	29.00	piece	f	\N	\N	available	\N	מוס	\N	\N	הקינוח הזה בעל מרקם קל ורך, יוצא אוורירי ונקבובי	\N	\N	\N	\N	\N								
402	Торт Медовик	Тончайшие ароматные медовые коржи чередуются с нежнейшим сливочным кремом, а ванильная нотка прекрасно дополняет и гармонично вписывается своим послевкусием.	59.00	/uploads/images/image-1752355404058-857294341.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 15:07:59.603	t	59.00	piece	f	\N	\N	available	\N	עוגת דבש	\N	\N	שכבות דבש ארומטיות דקות מתחלפות עם קרם חמאה עדין ביותר, ונגיעת וניל משלימה באופן מושלם ונכנסת בהרמוניה עם הטעם שלאחר	\N	\N	\N	\N	\N								
424	Чебуреки с Мясом Жареные (12 см)	Хрустящие чебуреки с сочной мясной начинкой, обжаренные до золотистой корочки (12 см)	9.90	/uploads/optimized/image-1755606519395-335309670.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-19 12:28:42.357	t	9.90	piece	f	\N	\N	available	\N	צ'בורקי עם בשר מטוגן (12 ס"מ)	\N	\N	צ'בורקי פריכים במילוי בשר עסיסי, מטוגנים עד קראסט זהוב (12 ס"מ)	\N	\N	\N	\N	\N								
408	Равиоли	Итальянские равиоли с сырной начинкой	6.90	/uploads/images/image-1752337110069-44070795.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 10:05:22.473	t	6.90	100g	f	\N	\N	available	\N	רביולי	\N	\N	רביולי איטלקי במילוי גבינה	\N	\N	\N	\N	\N								
403	Жаркое	Мясо тушеное с картофелем и овощами по-домашнему	8.90	/uploads/images/image-1752093455397-297336310.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 20:37:36.954	t	8.90	100g	f	\N	\N	available	\N	רגו	\N	\N	בשר מבושל עם תפוחי אדמה וירקות בסגנון ביתי	\N	\N	\N	\N	\N								
430	Эклер лесные ягоды	Эклеры, начиненные кремом пирожные из заварного теста, пользуются всеобщей любовью.	59.00	/uploads/images/image-1752434711702-349387135.jpeg	t	in_stock	0	2025-07-13 19:24:14.125296	2025-07-13 19:25:15.379	t	59.00	piece	f	\N	\N	available	\N	אקלר ברי יער	\N	\N	אקלרים, מאפים ממולאים בקרם מבצק פרווה, זוכים לאהבה כללית	\N	\N	\N	\N	\N								
427	Пирожок с Картофелем	Домашний пирожок с нежной картофельной начинкой 	8.90	/uploads/images/image-1752434978492-451006371.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-06 19:49:54.944	t	8.90	piece	f	\N	\N	available	\N	פירושקי עם תפוחי אדמה	\N	\N	פירושקי ביתי במילוי תפוחי אדמה רך	\N	\N	\N	\N	\N								
418	Торт красный бархат	Сочные, бархатные коржи в сочетании с нежным кремом — это очень вкусно.	59.00	/uploads/images/image-1752355755642-555807751.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 10:04:57.19	t	59.00	piece	f	\N	\N	available	\N	עוגת קטיפה אדומה	\N	\N	שכבות עסיסיות וקטיפתיות בשילוב עם קרם עדין - זה מאוד טעים	\N	\N	\N	\N	\N								
414	Пюре картофельное	Нежное картофельное пюре на молоке с маслом	5.50	/uploads/images/image-1752000233974-413418398.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:18:23.746	t	5.50	100g	f	\N	\N	available	\N	פירה תפוחי אדמה	\N	\N	פירה תפוחי אדמה עדין בחלב עם חמאה	\N	\N	\N	\N	\N								
467	Харчо	Ароматный наваристый суп харчо хорош для сытного обеда. Популярное грузинское блюдо, нечто среднее между мясным супом и рагу, давно прижилось в русской кухне. Перед ним трудно устоять, 	14.90	/uploads/optimized/image-1756070502226-485252767.jpg	t	in_stock	0	2025-08-24 21:17:15.302029	2025-08-24 21:21:47.169	t	14.90	portion	f	\N	\N	available	\N	חרצ'ו	\N	\N	מרק חרצ'ו ארומטי ומשביע מעולה לארוחת צהריים שובעת. מנה גיאורגית פופולרית, משהו בין מרק בשר לרגו, מזמן השתרש במטבח הרוסי. קשה לעמוד מולו.	\N	\N	\N	\N			\N	\N	\N	\N	\N	\N	\N
432	Торт Лотус	Торт "Лотус" - это изысканный десерт, который порадует любителей печенья Lotus Biscoff и тех, кто ценит вкусные и красивые торты	59.00	/uploads/optimized/image-1752599730859-918280533.jpg	t	in_stock	0	2025-07-15 17:13:23.98163	2025-07-15 17:15:34.763	t	59.00	piece	f	\N	\N	available	\N	עוגת לוטוס	\N	\N	עוגת "לוטוס" - זהו קינוח יוקרתי שישמח אוהבי עוגיות לוטוס ביסקוף ואלה המעריכים עוגות טעימות ויפות	\N	\N	\N	\N	\N								
468	Куриный с вермишелью	Куриный суп с вермишелью — очень сытный и вкусный суп. Лёгкий бульон, немного куриного мяса, морковка, лук, картофель и чуть вермишели — отличное сочетание, которое придётся по вкусу практически всем. Этот суп понравится и взрослым, и детям.	14.90	/uploads/optimized/image-1756070664735-660940564.jpg	t	in_stock	0	2025-08-24 21:24:28.891949	2025-08-24 21:25:59.347	t	14.90	portion	f	\N	\N	available	\N	מרק עוף עם ורמיצ'לי	\N	\N	מרק עוף עם ורמיצ'לי - מרק מאוד משביע וטעים. מרק קל, מעט בשר עוף, גזר, בצל, תפוחי אדמה וקצת ורמיצ'לי - שילוב מצוין שיתאים לכמעט כולם. המרק הזה יאהב גם מבוגרים וגם ילדים.	\N	\N	\N	\N			\N	\N	\N	\N	\N	\N	\N
377	Салат оливье	Классический салат с мясом, картофелем, морковью, яйцами и горошком	8.90	/uploads/images/image-1751999973437-608990217.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-08 18:39:34.598	t	8.90	100g	f	\N	\N	available	\N	סלט אוליבייה	\N	\N	סלט קלאסי עם בשר, תפוחי אדמה, גזר, ביצים ואפונה	\N	\N	\N	\N	\N								
394	Гуляш из говядины	Тушеное мясо с овощами в пряном соусе	11.90	/uploads/images/image-1752000860025-470290561.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-08 18:54:56.136	t	11.90	100g	f	\N	\N	available	\N	גולאש בקר	\N	\N	בשר מבושל עם ירקות ברוטב מתובל	\N	\N	\N	\N	\N								
410	Рис отварной	Рассыпчатый белый рис с маслом	4.50	/uploads/images/image-1752002576688-837429954.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:19:51.048	t	4.50	100g	f	\N	\N	available	\N	אורז מבושל	\N	\N	אורז לבן פירורי עם חמאה	\N	\N	\N	\N	\N								
404	Капуста тушеная	Белокочанная капуста тушеная с морковью и луком	6.90	/uploads/images/image-1752093705816-256225853.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:46:20.588	t	6.90	100g	f	\N	\N	available	\N	כרוב מבושל	\N	\N	כרוב לבן מבושל עם גזר ובצל	\N	\N	\N	\N	\N								
379	Мимоза	Нежный слоеный салат с рыбой, яйцами и сыром	8.90	/uploads/images/image-1752001789990-443236164.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-08 19:10:02.294	t	8.90	100g	f	\N	\N	available	\N	מימוזה	\N	\N	סלט רך שכבתי עם דג, ביצים וגבינה	\N	\N	\N	\N	\N								
378	Винегрет	Традиционный русский салат со свеклой, морковью и квашеной капустой	6.50	/uploads/images/image-1752001363842-846193024.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:40:02.732	t	6.50	100g	f	\N	\N	available	\N	וינגרט	\N	\N	סלט רוסי מסורתי עם סלק, גזר וכרוב כבוש	\N	\N	\N	\N	\N								
387	Салат из моркови	Корейская морковка с пряными специями	15.00	/uploads/images/image-1752337924624-798716694.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-04 19:43:33.639	t	15.00	piece	f	\N	\N	available	\N	סלט גזר	\N	\N	גזר קוריאני עם תבלינים חריפים	\N	\N	\N	\N	\N								
455	Рыбные котлеты в духовке	Нежные рыбные котлеты, приготовлены в духовке.	7.90	/uploads/optimized/image-1753392610534-777066714.jpg	t	in_stock	0	2025-07-24 21:00:22.734748	2025-07-24 21:30:29.684	t	7.90	100g	f	\N	\N	available	\N	קציצות דג בתנור	\N	\N	קציצות דג רכות, מוכנות בתנור	\N	\N	\N	\N	\N								
380	Салат Обжёрка	Слоёный салат с курицей и грибами	7.90	/uploads/images/image-1752001634206-768195026.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 05:00:54.244	t	7.90	100g	f	percentage	\N	available	\N	אבזרקה	\N	\N	סלט גיאורגי חריף עם ירקות ועשבי תיבול	\N	\N		\N	\N								
399	Запеченные овощи	Ассорти из сезонных овощей, запеченных с травами	4.50	/uploads/images/image-1752093598892-170713835.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 20:40:01.134	t	4.50	100g	f	\N	\N	available	\N	ירקות אפויים	\N	\N	מבחר ירקות עונתיים אפויים עם עשבי תיבול	\N	\N	\N	\N	\N								
386	Салат из свеклы	Вареная свекла с чесноком, грецким орехом, черносливом и майонезом	5.50	/uploads/images/image-1752005470973-321738880.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:42:24.326	t	5.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
421	Салат крабовый	Салат из крабовых палочек 	7.50	/uploads/images/image-1752001118325-856048638.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:46:53.841	t	7.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
422	Блинчики с Мясом	Традиционное русское лакомство – тонкие и румяные блинчики. Блинчики с богатой мясной начинкой станут прекрасным перекусом или полноценным вторым блюдом на завтрак или обед.	7.90	/uploads/images/image-1752003496773-34745424.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-06 19:47:01.291	t	7.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
425	Беляши с мясом	Сытный пирожок с ароматной мясной начинкой, выпеченный по домашнему рецепту	12.00	/uploads/images/image-1752435158641-895914705.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-06 19:49:31.231	t	12.00	piece	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
450	Овощное рагу с мясом	Рагу овощное с мясом знакомо всем. Летом делают нежное овощное рагу с мясом и кабачками. 	8.90	/uploads/optimized/image-1753639584158-461190529.jpg	t	in_stock	0	2025-07-22 17:46:45.46208	2025-07-27 18:08:48.731	t	8.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
442	Блинчики с творогом	Блины с творогом — одно из самых «уютных», по-настоящему домашних блюд.	7.50	/uploads/optimized/image-1752609829721-728589232.jpg	t	in_stock	0	2025-07-15 19:46:15.084968	2025-07-15 20:06:53.208	t	7.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
434	Блины с вишней	Аппетитные домашние блинчики с вишней. Идеально подходят для лёгкого завтрака. Нежные и умеренно сладкие, они так же могут стать замечательным десертом. Блины станут ещё вкуснее разогретыми: как будто только со сковородки!	7.90	/uploads/optimized/image-1752610590906-105496133.jpg	t	in_stock	0	2025-07-15 19:44:28.907827	2025-07-15 20:16:35.586	t	7.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
435	Долма	Долма — красивое блюдо из завернутой в листья начинки из риса и мясного фарша, по технике приготовления похожее на голубцы.	7.90	/uploads/optimized/image-1752611217313-67734927.jpg	t	in_stock	0	2025-07-15 19:44:44.627853	2025-07-15 20:27:02.057	t	7.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
436	Шея куриная фаршированная 	Куриные шеи традиционно фаршируются и в татарской и в еврейской кухне. Вариантов фаршировки множество. Самым традиционным для еврейского «Хельзля» является начинка из манки, лука и птичьего жира.	7.50	/uploads/optimized/image-1752611471705-44662572.jpg	t	in_stock	0	2025-07-15 19:44:58.306787	2025-07-15 20:31:18.179	t	7.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
437	Паштет из куриной печени	Куриный паштет – это классика, неизбежная классика, знакомая многим с детства. Нежный, воздушный,	8.50	/uploads/optimized/image-1752611874036-886329152.jpg	t	in_stock	0	2025-07-15 19:45:11.970606	2025-07-15 20:37:57.447	t	8.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
438	Котлеты по Киевски	Котлета по-киевски — блюдо русской и украинской кухонь, представляющее собой панированное отбивное куриное филе, в которое завёрнут кусочек сливочного масла.	8.90	/uploads/optimized/image-1752612456539-488091051.jpg	t	in_stock	0	2025-07-15 19:45:22.190866	2025-07-15 20:47:40.644	t	8.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
462	Креветки в сливочном соусе	Нежнейшие морепродукты в бархатистом соусе из сливок. Что может быть вкуснее?	14.90	/uploads/optimized/image-1753643721412-792353192.jpg	t	in_stock	0	2025-07-27 18:18:13.358812	2025-07-27 19:15:24.629	t	14.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
428	Торт Наполеон	Многослойный торт из слоёного теста с нежнейшим заварным кремом.	59.00	/uploads/images/image-1752355016121-818677958.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 15:08:26.472	t	59.00	piece	f	\N	\N	available	\N	עוגת נפוליאון	\N	\N	עוגה רב-שכבתית מבצק עלים עם קרם רך ביותר	\N	\N	\N	\N	\N								
439	Лазанья с мясом	Лазанья – традиционное блюдо итальянской кухни, которое состоит из слоев теста, мясного соуса Болоньез и соуса Бешамель. Лазанья быстро приобрела популярность в мире, ведь она очень сытная, сочная и вкусная.	8.90	/uploads/optimized/image-1752612690806-699809481.jpg	t	in_stock	0	2025-07-15 19:45:34.533775	2025-07-15 20:51:35.077	t	8.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
440	Рыба в кляре	Рыба в кляре – это одна из технологий, которая предназначена для сохранения сочности мяса, его вкуса и аромата. 	9.50	/uploads/optimized/image-1752612818387-237295152.jpg	t	in_stock	0	2025-07-15 19:45:47.093492	2025-07-15 20:56:35.365	t	9.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
443	Салат из помидоров черри 	Салат из помидоров черри с ароматной заправкой, зеленью и чесноком	5.90	/uploads/optimized/image-1753206836994-876635115.jpg	t	in_stock	0	2025-07-22 17:45:03.227048	2025-07-22 17:54:01.592	t	5.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
444	Язык говяжий	Нежный говяжий язык нарезанный слайсами.	8.90	/uploads/optimized/image-1753208028788-618441620.jpg	t	in_stock	0	2025-07-22 17:45:15.297425	2025-07-22 18:13:53.758	t	8.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
445	Котлеты куриные	Котлеты куриные. Обжарены во фритюре без панировки.	8.50	/uploads/optimized/image-1753208587548-506377182.jpg	t	in_stock	0	2025-07-22 17:45:35.426087	2025-07-22 18:23:10.684	t	8.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
446	Зразы картофельные с мясом	Зразы картофельные с мясом. Очень нежные и сытные. 	8.90	/uploads/optimized/image-1753208894074-811777519.jpg	t	in_stock	0	2025-07-22 17:45:52.438025	2025-07-22 18:28:39.417	t	8.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
447	Шашлык паргит	Шашлык паргит. Очень нежное мясо с ароматным дымком. 	13.90	/uploads/optimized/image-1753210841438-341044032.jpg	t	in_stock	0	2025-07-22 17:46:06.386689	2025-07-22 19:00:44.805	t	13.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
448	Язык говяжий в грибном соусе.	Нежный язык в грибном соусе. Очень приятное дополнение к гарниру. 	12.90	/uploads/optimized/image-1753211081610-474432188.jpg	t	in_stock	0	2025-07-22 17:46:22.171953	2025-07-22 19:05:02.816	t	12.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
451	Бефстроганов из говядины	Бефстроганов – традиционное блюдо русской кухни. Обжаренные мясные кусочки тушатся в сметанно-томатном соусе и получаются очень нежными и ароматными. 	11.90	/uploads/optimized/image-1753391199846-351498244.jpg	t	in_stock	0	2025-07-24 20:59:27.92648	2025-07-24 21:06:58.685	t	11.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
454	Вареники с картошкой	Вареники с картошкой и жареным луком. Украсят ваш вечер.	6.90	/uploads/optimized/image-1753392280126-608961165.jpg	t	in_stock	0	2025-07-24 21:00:10.214822	2025-07-24 21:24:58.833	t	6.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
449	Салат селедка «под шубой»	Сельдь под шубой - слоёный закусочный салат из филе солёной сельди с отварными корнеплодами и яйцом под майонезом в русской кухне.	7.50	/uploads/optimized/image-1753638820066-223855247.jpg	t	in_stock	0	2025-07-22 17:46:33.157272	2025-07-27 17:57:28.537	t	7.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
452	Печень куриная в вине	Куриная печень прекрасный продукт. Несколько маленьких добавок в виде белого вина и душистых трав превращают это блюдо в кулинарный шедевр.	6.50	/uploads/optimized/image-1753391558526-506245707.jpg	t	in_stock	0	2025-07-24 20:59:43.956949	2025-07-24 21:12:58.37	t	6.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
433	Салат из моркови с чесноком	Салат из моркови с чесноком – это один из самых простых и полезных овощных салатов, который только можно себе представить	4.50	/uploads/optimized/image-1752609225334-590250528.jpg	t	in_stock	0	2025-07-15 19:44:11.416168	2025-07-24 21:41:18.065	t	4.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
453	Говядина в вине	Вино, используемое в процессе приготовления мяса, делает его ароматным и мягким.	14.90	/uploads/optimized/image-1753639517523-293281000.jpg	t	in_stock	0	2025-07-24 20:59:55.40439	2025-07-27 18:05:21.269	t	14.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
441	Курица в сливочном соусе	Очень вкусное куриное филе, тушенное в сливочном соусе	9.90	/uploads/optimized/image-1753640080398-498945977.jpg	t	in_stock	0	2025-07-15 19:46:00.703364	2025-07-27 18:14:43.963	t	9.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
460	Котлеты из говядины	Ароматные и сочные котлеты из говядины никого не оставят равнодушными.	11.90	/uploads/optimized/image-1753640314666-387462938.jpg	t	in_stock	0	2025-07-27 18:17:38.246443	2025-07-27 18:20:39.44	t	11.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
457	Овощное рагу	Овощное рагу с баклажанами и кабачками – великолепное блюдо на каждый день.	5.90	/uploads/optimized/image-1753640698935-749450638.jpg	t	in_stock	0	2025-07-27 18:16:59.177505	2025-07-27 18:26:36.86	t	5.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
392	Окорочёк запечёный	Запеченные куриные окорочка с травами и специями	9.90	/uploads/images/image-1752353303789-696865109.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 16:24:45.229	t	9.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
466	Салат табуле	Восточный салат, закуска. Основными ингредиентами являются булгур и мелко порубленная зелень петрушки.	5.50	/uploads/optimized/image-1753641054940-195118911.jpg	t	in_stock	0	2025-07-27 18:19:06.261361	2025-07-27 18:43:38.72	t	5.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
458	Холодец куриный	Отличная идея лёгкой закуски на новогодний стол, диетический холодец из курицы	6.50	/uploads/optimized/image-1753642045152-233329438.jpg	t	in_stock	0	2025-07-27 18:17:12.474304	2025-07-27 18:49:44.663	t	6.50	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
459	Фахитас с курицей	Фахитос — знаменитое мексиканское блюдо. Его готовят из мяса и овощей — чаще всего с курицей	9.90	/uploads/optimized/image-1753642349407-746346962.jpg	t	in_stock	0	2025-07-27 18:17:26.45122	2025-07-27 18:56:38.786	t	9.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
461	Дюшбара	У дюшбары нежный мясной вкус с легкой кислинкой, которую придает приправа или соус. Тесто мягкое, упругое.	8.90	/uploads/optimized/image-1753643496232-691393883.jpg	t	in_stock	0	2025-07-27 18:18:00.812391	2025-07-27 19:11:39.621	t	8.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
456	Фило с грибами	Хрустящее тесло фило с грибами и сыром. Очень приятное дополнение к кофе.	6.90	/uploads/optimized/image-1753392935468-997998979.jpg	t	in_stock	0	2025-07-24 21:00:36.136347	2025-08-06 19:47:25.665	t	6.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
465	Феле саламона	Очень нежный Саламон с травами, украсит ваш стол.	16.90	/uploads/optimized/image-1753909540233-634155982.jpg	t	in_stock	0	2025-07-27 18:18:53.613681	2025-07-30 21:08:21.573	t	16.90	100g	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
381	Острый соус к мясу	Острая закуска из помидоров, перца и специй	25.00	/uploads/images/image-1752254917025-674757614.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 07:55:50.404	t	25.00	piece	f	percentage	\N	available	\N	אג׳יקה	\N	\N	רוטב ספייסי עגבניות	\N	\N	/uploads/images/image-1752254917025-674757614.jpeg	\N									
463	Рассольник	Ароматный рассольник с соленым огурцом украсит ваш день.	14.90	/uploads/optimized/image-1754335084289-381407303.jpg	t	in_stock	0	2025-07-27 18:18:23.299204	2025-08-25 14:04:35.633	t	14.90	portion	f	\N	\N	available	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N								
383	Грибы по-азиатски	Маринованные грибы с корейскими специями	6.90	/uploads/images/image-1752003599009-568700615.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 07:55:44.647	t	6.90	100g	f	percentage	\N	available	\N	פטריות באסלוב אסיאתי	\N	\N	פטריות כבושות עם תבלינים קוריאניים	\N	\N	\N	\N	\N								
412	Картофель отварной	Молодой картофель отварной с укропом	4.90	/uploads/images/image-1752093838716-447653541.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 20:44:00.979	t	4.90	100g	f	\N	\N	available	\N	תפוחי אדמה מבושלים	\N	\N	תפוחי אדמה צעירים מבושלים עם שמיר	\N	\N	\N	\N	\N								
389	Котлеты	Домашние мясные котлеты из говядины и курицы	9.90	/uploads/images/image-1752094257830-244908156.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 20:51:01.695	t	9.90	100g	f	\N	\N	available	\N	קציצות	\N	\N	קציצות בשר ביתיות מבקר ועוף	\N	\N	\N	\N	\N								
391	Крылышки	Сочные куриные крылышки в медово-горчичном соусе	5.90	/uploads/images/image-1752094339759-332540524.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-09 20:52:21.369	t	5.90	100g	f	\N	\N	available	\N	כנפיים	\N	\N	כנפי עוף עסיסיות ברוטב דבש-חרדל	\N	\N	\N	\N	\N								
406	Чебуреки (20 см)	Хрустящие чебуреки с сочной мясной начинкой (20 см)	15.00	/uploads/images/image-1752435512090-325399408.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-06 19:51:38.252	t	15.00	piece	f	\N	\N	available	\N	צ'בורקי (20 ס"מ)	\N	\N	צ'בורקי פריכים במילוי בשר עסיסי (20 ס"מ)	\N	\N	\N	\N	\N								
393	Тефтели	Нежные мясные шарики в томатном соусе	9.90	/uploads/images/image-1752336921461-295726318.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-12 16:15:26.983	t	9.90	100g	f	\N	\N	available	\N	קציצות	\N	\N	כדורי בשר רכים ברוטב עגבניות	\N	\N	\N	\N	\N								
384	Салат из свежей капусты	Свежая капуста с морковью и зеленью	3.90	/uploads/images/image-1752256543697-382615674.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-08-05 10:05:50.688	t	3.90	100g	f	\N	\N	available	\N	סלט כרוב טרי	\N	\N	כרוב טרי עם גזר וירוקים	\N	\N	\N	\N	\N								
398	Голубцы	Капустные листья с мясной начинкой в томатном соусе	9.90	/uploads/images/image-1752001233127-398800076.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:01:25.246	t	9.90	100g	f	\N	\N	available	\N	גולבצ'י	\N	\N	עלי כרוב במילוי בשר ברוטב עגבניות	\N	\N	\N	\N	\N								
395	Плов	Классический узбекский плов с мясом и морковью	9.90	/uploads/images/image-1752338837025-645369029.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-27 17:59:39.623	t	9.90	100g	f	\N	\N	available	\N	פלאף	\N	\N	פלאף אוזבקי קלאסי עם בשר וגזר	\N	\N	\N	\N	\N								
413	Макароны по флотски	Отварные макароны с фаршем, луком, приправами и томатом.	5.90	/uploads/images/image-1752353145883-824975888.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-22 19:09:49.717	t	5.90	100g	f	\N	\N	available	\N	מקרוני בסגנון צי	\N	\N	מקרוני מבושלים עם בשר טחון, בצל, תבלינים ועגבניות	\N	\N	\N	\N	\N								
397	Перцы фаршированные	Болгарский перец, фаршированный мясом и рисом	9.90	/uploads/images/image-1752338629061-831395571.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:00:39.359	t	9.90	100g	f	\N	\N	available	\N	פלפלים ממולאים	\N	\N	פלפל בולגרי ממולא בשר ואורז	\N	\N	\N	\N	\N								
400	Мусс лесные ягоды	Этот десерт имеет легкую, нежную текстуру, получается воздушным и пористым	29.00	/uploads/images/image-1752354759169-717183337.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-12 21:12:44.028	t	29.00	piece	f	\N	\N	available	\N	מוס ברי יער	\N	\N	הקינוח הזה בעל מרקם קל ורך, יוצא אוורירי ונקבובי	\N	\N	\N	\N	\N								
388	Мусс шоколадный	Этот десерт имеет легкую, нежную текстуру, получается воздушным и пористым	29.00	/uploads/images/image-1752354099484-594008623.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-12 21:02:58.746	t	29.00	piece	f	\N	\N	available	\N	מוס שוקולד	\N	\N	הקינוח הזה בעל מרקם קל ורך, יוצא אוורירי ונקבובי	\N	\N	\N	\N	\N								
405	Курица по-китайски	Кусочки курицы в кисло-сладком соусе с овощами	8.90	/uploads/images/image-1752352968445-689449910.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-22 17:57:33.66	t	8.90	100g	f	\N	\N	available	\N	עוף בסגנון סיני	\N	\N	חתיכות עוף ברוטב חמוץ-מתוק עם ירקות	\N	\N	\N	\N	\N								
431	Драники картофельные	Драники из картофеля – это настоящая классика белорусской кухни.\n	6.50	/uploads/optimized/image-1752600135012-824001720.jpg	t	in_stock	0	2025-07-14 19:54:03.800841	2025-08-05 10:04:16.247	t	6.50	100g	f	\N	\N	available	\N	דרניקי תפוחי אדמה	\N	\N	דרניקי מתפוחי אדמה - זה קלאסיקה אמיתית של המטבח הבלארוסי	\N	\N	\N	\N	\N								
411	Гречка отварная	Рассыпчатая гречневая каша 	4.50	/uploads/images/image-1752002804038-295955854.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-24 21:19:17.683	t	4.50	100g	f	\N	\N	available	\N	כוסמת מבושלת	\N	\N	דייסת כוסמת פירורית	\N	\N	\N	\N	\N								
385	Салат свежий с редиской	Хрустящий салат из огурцов, редиски и зелени	4.90	/uploads/images/image-1752337765131-294020316.jpeg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-07-27 18:01:26.345	t	4.90	100g	f	\N	\N	available	\N	סלט טרי עם צנונית	\N	\N	סלט פריך מגורקינים, צנוניות וירוקים	\N	\N	\N	\N	\N								
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.session (sid, sess, expire) FROM stdin;
CHwg9THzEju53sZ81nanC_SDA7QzErqR	{"cookie":{"originalMaxAge":86399999,"expires":"2025-08-26T20:26:35.871Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}	2025-08-26 20:48:55
BV1TRYj0Ed7NdHRdtw5ubsm62KoS4aga	{"cookie":{"originalMaxAge":86400000,"expires":"2025-08-26T14:02:11.991Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}	2025-08-26 19:44:27
pzYmLzbWa4jl6WZWcLee5xVmg4HdB6Ea	{"cookie":{"originalMaxAge":86400000,"expires":"2025-08-26T19:46:27.487Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}	2025-08-26 20:25:04
flpnoLr3zV6sT_DEGTbGlm0d_3rP84yS	{"cookie":{"originalMaxAge":86400000,"expires":"2025-08-25T14:56:13.512Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}	2025-08-26 14:13:22
fDNpqLuPI8Rd0C7RQfhp3yNCA1RGeGb3	{"cookie":{"originalMaxAge":86400000,"expires":"2025-08-25T21:10:45.558Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":"admin"}}	2025-08-25 21:27:30
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.sessions (sid, sess, expire) FROM stdin;
4-siSvCtmp8AU5P-jRRt96KCTvFXQPff	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-26T05:17:50.281Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "491046aa-9b11-42b7-94fd-d84f70bd4f20", "exp": 1750313869, "iat": 1750310269, "iss": "https://replit.com/oidc", "sub": "43948959", "email": "alexjc55@gmail.com", "at_hash": "_i_nTXmq5nQ__8aFbUUhuA", "username": "alexjc55", "auth_time": 1750310269, "last_name": "Suzdaltsev", "first_name": "Alexey"}, "expires_at": 1750313869, "access_token": "4PQ__7O-4mNFlOYDCzDVSQJ6qwSzNjOvram66vouTbE", "refresh_token": "cpS_jF7Ze8dd6PGNOHvTWyJZ78iIkfBGKfsdcr1NEIs"}}}	2025-06-26 05:51:07
VY7KN86OYX_PEP7ro_qQOZbB8WRChQWl	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-26T06:24:24.957Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "491046aa-9b11-42b7-94fd-d84f70bd4f20", "exp": 1750317864, "iat": 1750314264, "iss": "https://replit.com/oidc", "sub": "43948959", "email": "alexjc55@gmail.com", "at_hash": "qmn8c3mjy1MA2UcGOa2voQ", "username": "alexjc55", "auth_time": 1750289942, "last_name": "Suzdaltsev", "first_name": "Alexey"}, "expires_at": 1750317864, "access_token": "P2bI1irg1Wb-lwrA_lk5EKASWrhHHIGyqqF_ranPcTO", "refresh_token": "5-FOy5QbJg06Dx_Rlsdy87tCwvQXyi02Vv_CfXWDK7g"}}}	2025-06-26 06:30:12
nsbTrhb7JHzFJPYPFE7Y3QPb4ciXGqzd	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-25T20:28:03.790Z", "httpOnly": true, "originalMaxAge": 604800000}}	2025-06-25 20:43:33
3yWS7K4eKtnyc2UzDoEZNvOmddd8fupE	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-25T20:17:09.575Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "itXE_jVaaleNw0ij0zgvDdYhkscPD53BdS7yvDP2lLk"}}	2025-06-25 20:17:10
So7IMzBJAHL8kLB_8yIc3fp5AsKVC57u	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-25T20:17:23.034Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "_h8Vqy-jfsFEXN85F7xwhgPfAJwWoPkreG3cF3UiYis"}}	2025-06-25 20:17:24
Tl8X2JHr0npnf81FmjjNTGxANuQFAJY2	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-26T05:31:17.303Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "R8xwrlvEdOWfFEkQF2bQ2HqXHe8FQCHmSoh9NeBtldU"}}	2025-06-26 05:31:18
\.


--
-- Data for Name: store_settings; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.store_settings (id, store_name, store_description, contact_phone, contact_email, address, working_hours, delivery_fee, free_delivery_from, payment_methods, is_delivery_enabled, is_pickup_enabled, updated_at, min_delivery_time_hours, max_delivery_time_days, logo_url, delivery_info, payment_info, about_us_photos, welcome_title, banner_image, discount_badge_text, show_banner_image, show_title_description, show_info_blocks, show_special_offers, show_category_menu, week_start_day, bottom_banner1_url, bottom_banner1_link, bottom_banner2_url, bottom_banner2_link, show_bottom_banners, default_items_per_page, cancellation_reasons, header_html, footer_html, show_whatsapp_chat, whatsapp_phone_number, whatsapp_default_message, show_cart_banner, cart_banner_type, cart_banner_image, cart_banner_text, cart_banner_bg_color, cart_banner_text_color, auth_page_title, auth_page_subtitle, auth_page_feature1, auth_page_feature2, auth_page_feature3, worker_permissions, default_language, enabled_languages, info_blocks_position, header_style, banner_button_text, banner_button_link, modern_block1_icon, modern_block1_text, modern_block2_icon, modern_block2_text, modern_block3_icon, modern_block3_text, banner_image_url, store_name_ar, store_description_ar, welcome_title_ar, welcome_subtitle_ar, delivery_info_ar, store_name_he, welcome_title_he, store_description_he, delivery_info_he, store_name_en, welcome_title_en, store_description_en, delivery_info_en, about_text_ru, about_text_en, about_text_he, about_text_ar, banner_button_text_ru, banner_button_text_en, banner_button_text_he, banner_button_text_ar, discount_badge_text_en, discount_badge_text_he, discount_badge_text_ar, whatsapp_default_message_en, whatsapp_default_message_he, whatsapp_default_message_ar, cart_banner_text_en, cart_banner_text_he, cart_banner_text_ar, payment_info_en, payment_info_he, payment_info_ar, contact_phone_en, contact_phone_he, contact_phone_ar, contact_email_en, contact_email_he, contact_email_ar, address_en, address_he, address_ar, pwa_icon, pwa_name, pwa_description, pwa_name_en, pwa_description_en, pwa_name_he, pwa_description_he, pwa_name_ar, pwa_description_ar, logo_url_en, logo_url_he, logo_url_ar, banner_image_url_en, banner_image_url_he, banner_image_url_ar, cart_banner_image_en, cart_banner_image_he, cart_banner_image_ar, pwa_icon_en, pwa_icon_he, pwa_icon_ar, barcode_system_enabled, barcode_product_code_start, barcode_product_code_end, barcode_weight_start, barcode_weight_end, barcode_weight_unit, enable_admin_order_creation, slider_autoplay, slider_speed, slider_effect, slide1_image, slide1_title, slide1_subtitle, slide1_button_text, slide1_button_link, slide1_text_position, slide2_image, slide2_title, slide2_subtitle, slide2_button_text, slide2_button_link, slide2_text_position, slide3_image, slide3_title, slide3_subtitle, slide3_button_text, slide3_button_link, slide3_text_position, slide4_image, slide4_title, slide4_subtitle, slide4_button_text, slide4_button_link, slide4_text_position, slide5_image, slide5_title, slide5_subtitle, slide5_button_text, slide5_button_link, slide5_text_position) FROM stdin;
1	eDAHouse	Заказывай свежие блюда на развес — от повседневных обедов до праздничных угощений. Быстро, удобно и по-домашнему вкусно. Попробуй!	0586995066 WhatsApp		Хайфа Кикар маиргоф 5 (район Кирьят элиэзера)	{"friday": "08:30-15:00", "monday": "08:30-20:00", "sunday": "08:30-20:00", "tuesday": "08:30-20:00", "saturday": "", "thursday": "08:30-20:00", "wednesday": "08:30-20:00"}	20.00	200.00	[{"fee": 0, "name": "Наличными при получении", "enabled": true, "name_ar": "", "name_en": "Cash in Shop", "name_he": ""}, {"fee": 0, "name": "Банковская карта по телефону", "enabled": true, "name_ar": "", "name_en": "Cash in Shop", "name_he": ""}]	t	t	2025-08-04 19:15:51.053	2	4	/uploads/images/image-1751756014164-624617605.png	Доставка осуществляется ежедневно с 10:00 до 18:00. Минимальная сумма заказа для бесплатой доставки - 200 шекелей	Принимаем наличные, банковские карты. Комиссия за обслуживание не взимается.	[]	О нашей еде	/uploads/images/image-1750201280286-954389557.jpg	Скидка	t	t	t	t	f	sunday					t	25	\N	<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '1211785016960429');\nfbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=1211785016960429&ev=PageView&noscript=1"\n/></noscript>\n<!-- End Meta Pixel Code -->		t	972586995066	Здравствуйте! Интересует ваша продукция.	t	text	/uploads/images/image-1751759884506-176581516.jpg	Доставка от 200 шек. бесплатно	#f97316	#ffffff	Добро пожаловать в eDAHouse	Готовые блюда высокого качества с доставкой на дом	Свежие готовые блюда каждый день	Быстрая доставка в удобное время	Широкий выбор блюд на любой вкус	{"canViewUsers": false, "canManageUsers": false, "canCreateOrders": false, "canManageOrders": true, "canManageThemes": false, "canViewSettings": false, "canManageProducts": true, "canManageSettings": false, "canManageCategories": true}	ru	["ru", "he"]	bottom	slider	Заказать сейчас	#categories	Phone	0586995066 WhatsApp	Truck	Бесплатная достака от 200₪	ChefHat	Домашняя еда	/uploads/optimized/image-1754459903576-706749295.jpg				\N		eDAHouse	ברוכים הבאים ל-eDAHouse	הזמינו מנות טריות במשקל - מארוחות צהריים יומיומיות ועד פינוקים חגיגיים. מהיר, נוח וטעים כמו בבית. נסו!	משלוח מבוצע מדי יום מ-10:00 עד 18:00. סכום הזמנה מינימלי למשלוח חינם - 200 שקל					\N		על האוכל שלנו		\N		הזמן עכשיו			הנחה			שלום! מתעניין במוצרים שלכם.			משלוח חינם מ-200 שקל			מקבלים מזומן, כרטיסי אשראי. לא גובים עמלת שירות.			0586995066 WhatsApp						חיפה כיכר המעוף 5 (אזור קרית אליעזר)		/uploads/images/image-1751759909936-81894592.png	eDAHouse	Готовая еда с доставкой	\N	\N	eDAHouse	אוכל מוכן עם משלוח	\N	\N													t	2	7	8	12	g	t	t	5000	slideScale	/uploads/optimized/image-1754520520920-273671436.jpg	Суп дня	Вкусный борщ как у мамы			left-bottom	/uploads/optimized/image-1754520525923-476233927.jpg	Любимый плов	Всегда актуально, всегда вкусно!			right-top	/uploads/optimized/image-1754520530610-58990296.jpg	Куринные котлеты	Дополнят любое блюдо			left-top	/uploads/optimized/image-1754520534929-963180362.jpg	Оливье	Праздник каждый день!			center-top	/uploads/optimized/image-1754520538852-281866455.jpg	Сырники	Выбор для идеального завтрака			right-top
\.


--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.themes (id, name, description, is_active, primary_color, primary_dark_color, primary_light_color, secondary_color, accent_color, success_color, success_light_color, warning_color, warning_light_color, error_color, error_light_color, info_color, info_light_color, white_color, gray50_color, gray100_color, gray200_color, gray300_color, gray400_color, gray500_color, gray600_color, gray700_color, gray800_color, gray900_color, font_family_primary, font_family_secondary, primary_shadow, success_shadow, warning_shadow, error_shadow, info_shadow, gray_shadow, created_at, updated_at, primary_text_color, tomorrow_shadow, tomorrow_color, tomorrow_light_color, out_of_stock_color, tomorrow_dark_color, working_hours_icon_color, contacts_icon_color, payment_delivery_icon_color, header_style, banner_button_text, banner_button_link, modern_block1_icon, modern_block1_text, modern_block2_icon, modern_block2_text, modern_block3_icon, modern_block3_text, show_banner_image, show_title_description, show_info_blocks, info_blocks_position, show_prices, show_product_images, show_cart, show_special_offers, show_category_menu, show_whatsapp_chat, whatsapp_phone, whatsapp_message, logo_url, banner_image_url, show_cart_banner, cart_banner_type, cart_banner_image, cart_banner_text, cart_banner_bg_color, cart_banner_text_color, show_bottom_banners, bottom_banner1_url, bottom_banner1_link, bottom_banner2_url, bottom_banner2_link, name_en, name_he, name_ar, description_en, description_he, description_ar, banner_button_text_en, banner_button_text_he, banner_button_text_ar, logourl_en, logourl_he, logourl_ar, bannerimageurl_en, bannerimageurl_he, bannerimageurl_ar, cartbannerimage_en, cartbannerimage_he, cartbannerimage_ar, bottombanner1url_en, bottombanner1url_he, bottombanner1url_ar, bottombanner2url_en, bottombanner2url_he, bottombanner2url_ar, logo_url_en, logo_url_he, logo_url_ar, banner_image_url_en, banner_image_url_he, banner_image_url_ar, cart_banner_image_en, cart_banner_image_he, cart_banner_image_ar, bottom_banner1_url_en, bottom_banner1_url_he, bottom_banner1_url_ar, bottom_banner2_url_en, bottom_banner2_url_he, bottom_banner2_url_ar) FROM stdin;
default_theme_1750432574.178085	Стандартная тема	Базовая оранжевая тема сайта	t	hsl(24.6, 95%, 53.1%)	hsl(20.5, 90%, 48%)	hsl(24.6, 95%, 96%)	hsl(210, 40%, 98%)	hsl(210, 40%, 85%)	hsl(142, 76%, 36%)	hsl(142, 76%, 96%)	hsl(38, 92%, 50%)	hsl(38, 92%, 96%)	hsl(0, 84%, 60%)	hsl(0, 84%, 96%)	hsl(221, 83%, 53%)	hsl(221, 83%, 96%)	hsl(0, 0%, 100%)	hsl(210, 40%, 98%)	hsl(210, 40%, 96%)	hsl(214, 32%, 91%)	hsl(213, 27%, 84%)	hsl(215, 20%, 65%)	hsl(215, 16%, 47%)	hsl(215, 19%, 35%)	hsl(215, 25%, 27%)	hsl(217, 33%, 17%)	hsl(222, 84%, 5%)	Poppins, sans-serif	Inter, sans-serif	0 4px 14px 0 rgba(255, 102, 0, 0.3)	0 4px 14px 0 rgba(34, 197, 94, 0.3)	0 4px 14px 0 rgba(245, 158, 11, 0.3)	0 4px 14px 0 rgba(239, 68, 68, 0.3)	0 4px 14px 0 rgba(59, 130, 246, 0.3)	0 4px 14px 0 rgba(107, 114, 128, 0.3)	2025-06-20 15:16:14.178085	2025-08-25 20:27:19.81	hsl(0, 0%, 100%)	0 4px 14px 0 rgba(147, 51, 234, 0.3)	hsl(262, 83%, 58%)	hsl(262, 83%, 96%)	hsl(0, 84%, 60%)	hsl(262, 83%, 48%)	hsl(220, 91%, 54%)	hsl(142, 76%, 36%)	hsl(262, 83%, 58%)	slider	Заказать сейчас	#categories	Phone	0586995066 WhatsApp	Truck	Бесплатная достака от 200₪	ChefHat	Домашняя еда	t	t	t	bottom	t	t	t	t	f	t	972586995066	Здравствуйте! Интересует ваша продукция.	/uploads/images/image-1751756014164-624617605.png	/uploads/optimized/image-1754459903576-706749295.jpg	t	text	/uploads/images/image-1751759884506-176581516.jpg	Доставка от 200 шек. бесплатно	#f97316	#ffffff	t					\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N															
\.


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.user_addresses (id, user_id, label, address, is_default, created_at, updated_at) FROM stdin;
1	43948959	Дом 	Saadia Gaon 6/2, Haifa	t	2025-06-18 15:16:48.202661	2025-06-18 15:16:48.202661
2	admin	Dom	Stadia Gaon 6, Haifa	f	2025-06-19 11:57:15.22828	2025-06-19 11:57:15.22828
3	admin	Dom	Stadia Gaon 6, Haifa	t	2025-06-19 11:57:15.993345	2025-06-19 11:57:15.993345
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: edahouse_usr
--

COPY public.users (id, email, first_name, last_name, profile_image_url, role, created_at, updated_at, phone, default_address, password, password_reset_token, password_reset_expires, username) FROM stdin;
worker	worker@restaurant.com	Работник	Кухни	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face	worker	2025-06-17 18:18:43.509353	2025-06-19 08:54:05.95		\N	e87eeb2e2ac8324488ec38dc38bd5126aa573502c3122807877adac947d796722fc11ee276f82bd97ba26954220679b17123a2bbd289242bd2351e5f67575a17.34c7f64554171a937feee163e194bac9	\N	\N	worker
admin	admin@restaurant.com	Администратор	Системы		admin	2025-06-17 18:18:43.509353	2025-06-19 11:56:27.918	0528496528	\N	57dc1906d8c538edb1bae5f69089c88a2b1ecb4f980fbbe0ef7727a425abca9ff0addbddd31302f386dc53c757c08e1eabee3de795583cdb6743c4215ca35370.6971e6939d9f818b2b502dbd5979bb11	\N	\N	admin
43948959	alexjc55@gmail.com	Alexey	Suzdaltsev	\N	admin	2025-06-17 17:26:49.237417	2025-06-19 05:30:38.958	+972528496528	\N	\N	\N	\N	mainadmin
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.categories_id_seq', 61, true);


--
-- Name: marketing_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.marketing_notifications_id_seq', 38, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.order_items_id_seq', 113, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.orders_id_seq', 26, true);


--
-- Name: product_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.product_categories_id_seq', 295, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.products_id_seq', 468, true);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.push_subscriptions_id_seq', 6, true);


--
-- Name: store_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.store_settings_id_seq', 1, true);


--
-- Name: user_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: edahouse_usr
--

SELECT pg_catalog.setval('public.user_addresses_id_seq', 7, true);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: marketing_notifications marketing_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.marketing_notifications
    ADD CONSTRAINT marketing_notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_product_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_category_id_key UNIQUE (product_id, category_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: store_settings store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);


--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: edahouse_usr
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_marketing_notifications_created_at; Type: INDEX; Schema: public; Owner: edahouse_usr
--

CREATE INDEX idx_marketing_notifications_created_at ON public.marketing_notifications USING btree (created_at);


--
-- Name: idx_products_ingredients; Type: INDEX; Schema: public; Owner: edahouse_usr
--

CREATE INDEX idx_products_ingredients ON public.products USING gin (to_tsvector('russian'::regconfig, ingredients));


--
-- Name: idx_products_ingredients_en; Type: INDEX; Schema: public; Owner: edahouse_usr
--

CREATE INDEX idx_products_ingredients_en ON public.products USING gin (to_tsvector('english'::regconfig, ingredients_en));


--
-- Name: idx_push_subscriptions_user_endpoint; Type: INDEX; Schema: public; Owner: edahouse_usr
--

CREATE UNIQUE INDEX idx_push_subscriptions_user_endpoint ON public.push_subscriptions USING btree (user_id, endpoint);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: product_categories product_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: edahouse_usr
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO edahouse_grp;


--
-- PostgreSQL database dump complete
--

