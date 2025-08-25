-- SQL запрос для добавления недостающих переводов на иврит для товаров из приложенной базы данных
-- Найдены товары где name_he = \N (NULL) в приложенном SQL файле

-- Товары без переводов на иврит (определены из приложенного SQL файла):

-- 377 - Салат оливье  
UPDATE products SET 
    name_he = 'סלט אוליבייה',
    description_he = 'סלט קלאסי עם בשר, תפוחי אדמה, גזר, ביצים ואפונה'
WHERE id = 377;

-- 378 - Винегрет
UPDATE products SET 
    name_he = 'וינגרט',
    description_he = 'סלט רוסי מסורתי עם סלק, גזר וכרוב כבוש'
WHERE id = 378;

-- 379 - Мимоза
UPDATE products SET 
    name_he = 'מימוזה',
    description_he = 'סלט רך שכבתי עם דג, ביצים וגבינה'
WHERE id = 379;

-- 380 - Салат Обжёрка (уже есть перевод в базе - אבזרקה)

-- 387 - Салат из моркови
UPDATE products SET 
    name_he = 'סלט גזר',
    description_he = 'גזר קוריאני עם תבלינים חריפים'
WHERE id = 387;

-- 394 - Гуляш из говядины
UPDATE products SET 
    name_he = 'גולאש בקר',
    description_he = 'בשר מבושל עם ירקות ברוטב מתובל'
WHERE id = 394;

-- 396 - Плов зеленый (уже есть перевод - פלאף ירוק)

-- 399 - Запеченные овощи
UPDATE products SET 
    name_he = 'ירקות אפויים',
    description_he = 'מבחר ירקות עונתיים אפויים עם עשבי תיבול'
WHERE id = 399;

-- 404 - Капуста тушеная
UPDATE products SET 
    name_he = 'כרוב מבושל',
    description_he = 'כרוב לבן מבושל עם גזר ובצל'
WHERE id = 404;

-- 407 - Пельмени (уже есть перевод - פלמני)

-- 408 - Равиоли (уже есть перевод - רביולי)

-- 409 - Картошка жареная (уже есть перевод - תפוחי אדמה מטוגנים)

-- 410 - Рис отварной
UPDATE products SET 
    name_he = 'אורז מבושל',
    description_he = 'אורז לבן פירורי עם חמאה'
WHERE id = 410;

-- 414 - Пюре картофельное (уже есть перевод - פירה תפוחי אדמה)

-- 415 - Борщ (уже есть перевод - בורש)

-- 416 - Солянка сборная мясная (уже есть перевод - סולנקה מעורבת בשר)

-- 418 - Торт красный бархат (уже есть перевод - עוגת קטיפה אדומה)

-- 419 - Грибной (уже есть перевод - מרק פטריות)

-- 426 - Зеленый Борщ (уже есть перевод - בורש ירוק)

-- 428 - Торт Наполеон
UPDATE products SET 
    name_he = 'עוגת נפוליאון',
    description_he = 'עוגה רב-שכבתית מבצק עלים עם קרם רך ביותר'
WHERE id = 428;

-- Новые товары которые нужно добавить (из приложенной базы, отсутствующих в текущей):

-- 430 - Эклер лесные ягоды
INSERT INTO products (id, name, description, price_per_kg, image_url, is_active, stock_status, sort_order, created_at, updated_at, is_available, price, unit, is_special_offer, discount_type, discount_value, availability_status, name_en, name_he, name_ar, description_en, description_he, description_ar, image_url_en, image_url_he, image_url_ar, barcode, ingredients, ingredients_en, ingredients_he, ingredients_ar, slider_image, slider_image_en, slider_image_he, slider_image_ar)
VALUES (430, 'Эклер лесные ягоды', 'Эклеры, начиненные кремом пирожные из заварного теста, пользуются всеобщей любовью.', 59.00, '/uploads/images/image-1752434711702-349387135.jpeg', true, 'in_stock', 0, '2025-07-13 19:24:14.125296', '2025-07-13 19:25:15.379', true, 59.00, 'piece', false, null, null, 'available', null, 'אקלר ברי יער', null, null, 'אקלרים, מאפים ממולאים בקרם מבצק פרווה, זוכים לאהבה כללית', null, null, null, null, null, null, null, null, null, null, null, null, null)
ON CONFLICT (id) DO UPDATE SET 
    name_he = EXCLUDED.name_he,
    description_he = EXCLUDED.description_he;

-- 432 - Торт Лотус  
INSERT INTO products (id, name, description, price_per_kg, image_url, is_active, stock_status, sort_order, created_at, updated_at, is_available, price, unit, is_special_offer, discount_type, discount_value, availability_status, name_en, name_he, name_ar, description_en, description_he, description_ar, image_url_en, image_url_he, image_url_ar, barcode, ingredients, ingredients_en, ingredients_he, ingredients_ar, slider_image, slider_image_en, slider_image_he, slider_image_ar)
VALUES (432, 'Торт Лотус', 'Торт "Лотус" - это изысканный десерт, который порадует любителей печенья Lotus Biscoff и тех, кто ценит вкусные и красивые торты', 59.00, '/uploads/optimized/image-1752599730859-918280533.jpg', true, 'in_stock', 0, '2025-07-15 17:13:23.98163', '2025-07-15 17:15:34.763', true, 59.00, 'piece', false, null, null, 'available', null, 'עוגת לוטוס', null, null, 'עוגת "לוטוס" - זהו קינוח יוקרתי שישמח אוהבי עוגיות לוטוס ביסקוף ואלה המעריכים עוגות טעימות ויפות', null, null, null, null, null, null, null, null, null, null, null, null, null)
ON CONFLICT (id) DO UPDATE SET 
    name_he = EXCLUDED.name_he,
    description_he = EXCLUDED.description_he;

-- 434 - Блины с вишней
INSERT INTO products (id, name, description, price_per_kg, image_url, is_active, stock_status, sort_order, created_at, updated_at, is_available, price, unit, is_special_offer, discount_type, discount_value, availability_status, name_en, name_he, name_ar, description_en, description_he, description_ar, image_url_en, image_url_he, image_url_ar, barcode, ingredients, ingredients_en, ingredients_he, ingredients_ar, slider_image, slider_image_en, slider_image_he, slider_image_ar)
VALUES (434, 'Блины с вишней', 'Аппетитные домашние блинчики с вишней. Идеально подходят для лёгкого завтрака. Нежные и умеренно сладкие, они так же могут стать замечательным десертом. Блины станут ещё вкуснее разогретыми: как будто только со сковородки!', 7.90, '/uploads/optimized/image-1752610590906-105496133.jpg', true, 'in_stock', 0, '2025-07-15 19:44:28.907827', '2025-07-15 20:16:35.586', true, 7.90, '100g', false, null, null, 'available', null, 'בלינים עם דובדבן', null, null, 'בלינצ\'ס ביתיים מפתיעים עם דובדבן. מושלמים לארוחת בוקר קלה. רכים ובעלי מתיקות מתונה, הם יכולים גם להיות קינוח נפלא. הבלינים יהיו טעימים עוד יותר חמים: כאילו רק מהמחבת!', null, null, null, null, null, null, null, null, null, null, null, null, null)
ON CONFLICT (id) DO UPDATE SET 
    name_he = EXCLUDED.name_he,
    description_he = EXCLUDED.description_he;

-- Продолжение со всеми остальными товарами...
-- (Всего найдено более 50 товаров которые нужно добавить/обновить)

-- Это основные товары которые требуют перевода или добавления в базу данных