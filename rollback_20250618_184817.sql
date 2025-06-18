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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO neondb_owner;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO neondb_owner;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.order_items OWNER TO neondb_owner;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO neondb_owner;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.orders OWNER TO neondb_owner;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO neondb_owner;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category_id integer NOT NULL,
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
    discount_value numeric(10,2)
);


ALTER TABLE public.products OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: store_settings; Type: TABLE; Schema: public; Owner: neondb_owner
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
    min_order_amount numeric(10,2) DEFAULT 50.00,
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
    footer_html text
);


ALTER TABLE public.store_settings OWNER TO neondb_owner;

--
-- Name: store_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.store_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.store_settings_id_seq OWNER TO neondb_owner;

--
-- Name: store_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.store_settings_id_seq OWNED BY public.store_settings.id;


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public.user_addresses OWNER TO neondb_owner;

--
-- Name: user_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_addresses_id_seq OWNER TO neondb_owner;

--
-- Name: user_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_addresses_id_seq OWNED BY public.user_addresses.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
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
    default_address text
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: store_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_settings ALTER COLUMN id SET DEFAULT nextval('public.store_settings_id_seq'::regclass);


--
-- Name: user_addresses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_addresses ALTER COLUMN id SET DEFAULT nextval('public.user_addresses_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.categories (id, name, description, icon, is_active, sort_order, created_at, updated_at) FROM stdin;
47	Салаты	Свежие салаты и закуски	🥗	t	1	2025-06-17 18:46:47.834072	2025-06-17 18:46:47.834072
48	Горячие блюда	Основные блюда на развес	🍖	t	2	2025-06-17 18:46:47.834072	2025-06-17 18:46:47.834072
49	Гарниры	Каши, картофель, овощи	🍚	t	3	2025-06-17 18:46:47.834072	2025-06-17 18:46:47.834072
50	Супы	Первые блюда	🍲	t	4	2025-06-17 18:46:47.834072	2025-06-17 18:46:47.834072
51	Выпечка и десерты	Блинчики, сырники, корндоги	🥞	t	5	2025-06-17 18:46:47.834072	2025-06-17 18:46:47.834072
52	Пирожки	Свежие пирожки с разными начинками	🥟	t	6	2025-06-17 18:46:47.834072	2025-06-17 18:46:47.834072
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
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
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.orders (id, user_id, status, total_amount, delivery_fee, customer_notes, delivery_address, payment_method, created_at, updated_at, customer_phone, requested_delivery_time, delivery_date, delivery_time, cancellation_reason) FROM stdin;
1	43948959	confirmed	92.72	15.00	\n[DISCOUNTS:{"orderDiscount":{"type":"percentage","value":5,"reason":""},"itemDiscounts":null}]		cash	2025-06-17 19:00:50.571966	2025-06-18 13:42:33.842		\N			\N
2	43948959	pending	136.76	15.00	\n[DISCOUNTS:{"orderDiscount":{"type":"percentage","value":10,"reason":""},"itemDiscounts":{"1":{"type":"percentage","value":5,"reason":""},"2":{"type":"amount","value":20,"reason":""}}}]	Haifa, Saadia Gaon 6	cash	2025-06-18 13:09:54.933499	2025-06-18 14:30:33.039	+972528496528	\N	2025-06-19	18:00-20:00	\N
3	43948959	pending	144.90	15.00	\N	Saadia Gaon 6/2, Haifa	cash	2025-06-18 15:46:57.762544	2025-06-18 15:46:57.762544	+972528496528	\N	\N	\N	\N
4	43948959	pending	151.50	15.00	\N	Saadia Gaon 6/2, Haifa	cash	2025-06-18 16:03:52.340736	2025-06-18 16:03:52.340736	+972528496528	\N	2025-06-19	12:00-14:00	\N
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, name, description, category_id, price_per_kg, image_url, is_active, stock_status, sort_order, created_at, updated_at, is_available, price, unit, is_special_offer, discount_type, discount_value) FROM stdin;
377	Оливье	Классический салат с мясом, картофелем, морковью, яйцами и горошком	47	42.00	/assets/1_1750184360776.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	42.00	100g	f	\N	\N
378	Винегрет	Традиционный русский салат со свеклой, морковью и квашеной капустой	47	35.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	35.50	100g	f	\N	\N
379	Мимоза	Нежный слоеный салат с рыбой, яйцами и сыром	47	48.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	48.90	100g	f	\N	\N
384	Салат из капусты	Свежая капуста с морковью и зеленью	47	25.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	25.90	100g	f	\N	\N
385	Салат свежий с редиской	Хрустящий салат из огурцов, редиски и зелени	47	32.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	32.50	100g	f	\N	\N
386	Салат из свеклы	Вареная свекла с чесноком и майонезом	47	28.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	28.90	100g	f	\N	\N
387	Салат из моркови	Корейская морковка с пряными специями	47	35.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	35.80	100g	f	\N	\N
382	Баклажаны по-азиатски	Маринованные баклажаны с чесноком и кориандром	47	58.80		t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 23:59:08.024	t	58.80	100g	t	percentage	15.00
383	Грибы по-азиатски	Маринованные грибы с корейскими специями	47	62.50		t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 23:59:22.574	t	62.50	100g	t	percentage	15.00
381	Аджика	Острая закуска из помидоров, перца и специй	47	52.90		t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 23:58:58.75	t	52.90	100g	t	percentage	15.00
380	Абжерка	Острый грузинский салат с овощами и зеленью	47	45.01		t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 23:29:06.452	t	45.01	100g	t	percentage	10.00
388	Салат Цезарь	Классический салат с курицей, пармезаном и соусом цезарь	47	65.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	65.90	100g	f	\N	\N
389	Котлеты	Домашние мясные котлеты из говядины и свинины	48	72.50	/@assets/3_1750184360777.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	72.50	100g	f	\N	\N
390	Паргит	Куриное филе в панировке, жаренное до золотистой корочки	48	68.90	/@assets/1_1750184360776.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	68.90	100g	f	\N	\N
391	Крылышки	Сочные куриные крылышки в медово-горчичном соусе	48	65.80	/@assets/2_1750184360777.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	65.80	100g	f	\N	\N
392	Окорочка	Запеченные куриные окорочка с травами и специями	48	58.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	58.50	100g	f	\N	\N
393	Тефтели	Нежные мясные шарики в томатном соусе	48	69.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	69.90	100g	f	\N	\N
394	Гуляш	Тушеное мясо с овощами в пряном соусе	48	78.50	/assets/3_1750184360777.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	78.50	100g	f	\N	\N
395	Плов	Классический узбекский плов с мясом и морковью	48	52.90	/assets/3_1750184360777.jpg	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	52.90	100g	f	\N	\N
396	Плов зеленый	Плов с зеленью, изюмом и специальными специями	48	56.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	56.80	100g	f	\N	\N
397	Перцы фаршированные	Болгарский перец, фаршированный мясом и рисом	48	62.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	62.50	100g	f	\N	\N
398	Голубцы	Капустные листья с мясной начинкой в томатном соусе	48	58.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	58.90	100g	f	\N	\N
399	Запеченные овощи	Ассорти из сезонных овощей, запеченных с травами	48	38.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	38.50	100g	f	\N	\N
407	Душпара	Маленькие пельмени в ароматном бульоне	48	48.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	48.50	100g	f	\N	\N
400	Отбивные	Свиные отбивные в золотистой панировке	48	82.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	82.90	100g	f	\N	\N
401	Шницель	Куриный шницель в хрустящей панировке	48	75.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	75.80	100g	f	\N	\N
402	Фасоль тушеная	Белая фасоль тушеная с овощами и томатами	48	35.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	35.50	100g	f	\N	\N
403	Жаркое	Мясо тушеное с картофелем и овощами по-домашнему	48	68.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	68.90	100g	f	\N	\N
404	Капуста тушеная	Белокочанная капуста тушеная с морковью и луком	48	28.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	28.50	100g	f	\N	\N
405	Курица по-китайски	Кусочки курицы в кисло-сладком соусе с овощами	48	72.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	72.80	100g	f	\N	\N
406	Чебуреки	Хрустящие чебуреки с сочной мясной начинкой	48	58.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	58.90	100g	f	\N	\N
408	Равиоли	Итальянские равиоли с сырной начинкой	48	65.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	65.90	100g	f	\N	\N
409	Картошка жареная	Золотистая жареная картошка с луком и зеленью	49	32.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	32.50	100g	f	\N	\N
410	Рис отварной	Рассыпчатый белый рис с маслом	49	25.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	25.80	100g	f	\N	\N
411	Гречка	Рассыпчатая гречневая каша с маслом	49	28.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	28.90	100g	f	\N	\N
412	Картофель отварной	Молодой картофель отварной с укропом	49	26.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	26.50	100g	f	\N	\N
413	Макароны	Отварные макароны с маслом и сыром	49	22.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	22.90	100g	f	\N	\N
414	Пюре картофельное	Нежное картофельное пюре на молоке с маслом	49	35.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	35.80	100g	f	\N	\N
416	Солянка мясная	Сытная солянка с копченостями и оливками	50	48.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	48.90	100g	f	\N	\N
417	Щи	Кислые щи из квашеной капусты с мясом	50	35.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	35.80	100g	f	\N	\N
418	Суп гороховый	Наваристый гороховый суп с копченостями	50	32.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	32.50	100g	f	\N	\N
419	Харчо	Острый грузинский суп с мясом и рисом	50	42.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	42.90	100g	f	\N	\N
420	Лагман	Узбекский суп с лапшой и мясом	50	45.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	45.80	100g	f	\N	\N
421	Блинчики с Куриной Грудкой и Сыром	Сочная начинка из нежной куриной грудки, плавленого сыра, завернутая в тонкие и румяные блинчики. Прекрасный перекус и полноценное второе блюдо во время обеда.	51	62.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	62.90	100g	f	\N	\N
422	Блинчики с Мясом	Традиционное русское лакомство – тонкие и румяные блинчики. Блинчики с богатой мясной начинкой станут прекрасным перекусом или полноценным вторым блюдом на завтрак или обед.	51	58.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	58.90	100g	f	\N	\N
423	Сырники	Нежные творожные сырники со сметаной	51	52.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	52.90	100g	f	\N	\N
424	Чебуреки с Мясом Жареные	Хрустящие чебуреки с сочной мясной начинкой, обжаренные до золотистой корочки	51	65.50	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	65.50	100g	f	\N	\N
425	Пирожок с Мясом	Сытный пирожок с ароматной мясной начинкой, выпеченный по домашнему рецепту	52	45.80	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	45.80	100g	f	\N	\N
427	Пирожок с Картофелем	Домашний пирожок с нежной картофельной начинкой и зеленью	52	35.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	35.90	100g	f	\N	\N
428	Пирожок с Яблоком	Сладкий пирожок с ароматной яблочной начинкой и корицей	52	42.90	\N	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 18:46:47.892589	t	42.90	100g	f	\N	\N
415	Борщ	Традиционный украинский борщ со сметаной	50	38.50	/uploads/images/image-1750192273390-458955015.webp	t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-17 20:36:16.722	t	38.50	piece	f	\N	\N
426	Пирожок с Зеленым Луком и Яйцом	Традиционный пирожок с начинкой из свежего зеленого лука и вареных яиц	52	38.50		t	in_stock	0	2025-06-17 18:46:47.892589	2025-06-18 14:43:39.892	t	38.50	piece	f	\N	\N
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
4-4zDqU7vlF5fBt1XXTSojomM7Pa-sCo	{"cookie": {"path": "/", "secure": true, "expires": "2025-06-25T18:41:03.202Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "491046aa-9b11-42b7-94fd-d84f70bd4f20", "exp": 1750275662, "iat": 1750272062, "iss": "https://replit.com/oidc", "sub": "43948959", "email": "alexjc55@gmail.com", "at_hash": "HWhvtkI1eAPIBBIvqQIS7Q", "username": "alexjc55", "auth_time": 1750272062, "last_name": "Suzdaltsev", "first_name": "Alexey"}, "expires_at": 1750275662, "access_token": "w89EM5vwjxseqZ_BwbWZLfwawDJP8sEHby88Xk4dePT", "refresh_token": "LsQ0V9XZRsO-VXTPe50K0HgFlKi8bcwo4FL2a386CQ7"}}}	2025-06-25 18:46:27
\.


--
-- Data for Name: store_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.store_settings (id, store_name, store_description, contact_phone, contact_email, address, working_hours, delivery_fee, min_order_amount, payment_methods, is_delivery_enabled, is_pickup_enabled, updated_at, min_delivery_time_hours, max_delivery_time_days, logo_url, delivery_info, payment_info, about_us_photos, welcome_title, banner_image, discount_badge_text, show_banner_image, show_title_description, show_info_blocks, show_special_offers, show_category_menu, week_start_day, bottom_banner1_url, bottom_banner1_link, bottom_banner2_url, bottom_banner2_link, show_bottom_banners, default_items_per_page, cancellation_reasons, header_html, footer_html) FROM stdin;
1	eDAHouse	Заказывай свежие блюда на развес — от повседневных обедов до праздничных угощений. Быстро, удобно и по-домашнему вкусно. Попробуй!	+972-50-123-4567	info@edahouse.com		{"friday": "09:00-15:00", "monday": "09:00-21:00", "sunday": "10:00-20:00", "tuesday": "09:00-21:00", "saturday": "Выходной", "thursday": "09:00-21:00", "wednesday": "09:00-21:00"}	15.00	50.00	\N	t	t	2025-06-18 10:32:47.079	2	4	/uploads/images/image-1750199110972-863936929.png	Доставка по Израилю. Минимальный заказ 50₪. Бесплатная доставка от 100₪.	Принимаем наличные при доставке, банковские карты, PayPal, Bit.	[]	О нашей еде 	/uploads/images/image-1750201280286-954389557.jpg	Скидка	t	t	t	t	f	sunday	/uploads/images/image-1750240271778-505639419.jpg		/uploads/images/image-1750240274222-125809639.jpg		t	25	\N	\N	\N
\.


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_addresses (id, user_id, label, address, is_default, created_at, updated_at) FROM stdin;
1	43948959	Дом 	Saadia Gaon 6/2, Haifa	t	2025-06-18 15:16:48.202661	2025-06-18 15:16:48.202661
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, profile_image_url, role, created_at, updated_at, phone, default_address) FROM stdin;
admin	admin@restaurant.com	Администратор	Системы	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face	admin	2025-06-17 18:18:43.509353	2025-06-17 18:18:43.509353	\N	\N
worker	worker@restaurant.com	Работник	Кухни	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face	worker	2025-06-17 18:18:43.509353	2025-06-17 18:18:43.509353	\N	\N
customer	customer@example.com	Клиент	Тестовый	https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face	customer	2025-06-17 18:18:43.509353	2025-06-17 18:18:43.509353	\N	\N
43948959	alexjc55@gmail.com	Alexey	Suzdaltsev	\N	admin	2025-06-17 17:26:49.237417	2025-06-18 18:41:02.889	+972528496528	\N
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.categories_id_seq', 53, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.order_items_id_seq', 50, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.orders_id_seq', 4, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.products_id_seq', 428, true);


--
-- Name: store_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.store_settings_id_seq', 1, true);


--
-- Name: user_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_addresses_id_seq', 1, true);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: store_settings store_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: user_addresses user_addresses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

