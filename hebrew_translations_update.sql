-- SQL запрос для добавления переводов на иврит для товаров
-- Замените [НАЗВАНИЕ_НА_ИВРИТЕ], [ОПИСАНИЕ_НА_ИВРИТЕ], [ИНГРЕДИЕНТЫ_НА_ИВРИТЕ] на правильные переводы

-- 377 - Оливье
UPDATE products SET 
    name_he = '[אוליבייה]',
    description_he = '[סלט קלאסי עם בשר, תפוחי אדמה, גזר, ביצים ואפונה]'
WHERE id = 377;

-- 378 - Винегрет  
UPDATE products SET 
    name_he = '[וינגרט]',
    description_he = '[סלט רוסי מסורתי עם סלק, גזר וכרוב כבוש]'
WHERE id = 378;

-- 379 - Мимоза
UPDATE products SET 
    name_he = '[מימוזה]', 
    description_he = '[סלט שכבות עדין עם דגים, ביצים וגבינה]'
WHERE id = 379;

-- 381 - Аджика
UPDATE products SET 
    name_he = '[אדז׳יקה]',
    description_he = '[מזון חריף מעגבניות, פלפל ותבלינים]'
WHERE id = 381;

-- 382 - Баклажаны по-азиатски
UPDATE products SET 
    name_he = '[חצילים באסלוב אסייתי]',
    description_he = '[חצילים כבושים עם שום וכוסברה]'
WHERE id = 382;

-- 383 - Грибы по-азиатски
UPDATE products SET 
    name_he = '[פטריות באסלוב אסייתי]',
    description_he = '[פטריות כבושות עם תבלינים קוריאניים]'
WHERE id = 383;

-- 384 - Салат из капусты
UPDATE products SET 
    name_he = '[סלט כרוב]',
    description_he = '[כרוב טרי עם גזר וירוקים]'
WHERE id = 384;

-- 385 - Салат свежий с редиской
UPDATE products SET 
    name_he = '[סלט טרי עם צנונית]',
    description_he = '[סלט פריך ממלפפונים, צנוניות וירוקים]'
WHERE id = 385;

-- 386 - Салат из свеклы
UPDATE products SET 
    name_he = '[סלט סלק]',
    description_he = '[סלק מבושל עם שום ומיונז]'
WHERE id = 386;

-- 387 - Салат из моркови
UPDATE products SET 
    name_he = '[סלט גזר]',
    description_he = '[גזר קוריאני עם תבלינים ריחניים]'
WHERE id = 387;

-- 388 - Салат Цезарь
UPDATE products SET 
    name_he = '[סלט קיסר]',
    description_he = '[סלט קלאסי עם עוף, פרמזן ורוטב קיסר]'
WHERE id = 388;

-- 389 - Котлеты
UPDATE products SET 
    name_he = '[קציצות]',
    description_he = '[קציצות בשר ביתיות מבקר וחזיר]'
WHERE id = 389;

-- 390 - Паргит
UPDATE products SET 
    name_he = '[פרגית]',
    description_he = '[פילה עוף בציפוי, מטוגן עד לצבע זהוב]'
WHERE id = 390;

-- 391 - Крылышки
UPDATE products SET 
    name_he = '[כנפיים]',
    description_he = '[כנפי עוף עסיסיות ברוטב דבש-חרדל]'
WHERE id = 391;

-- 392 - Окорочка
UPDATE products SET 
    name_he = '[עופות]',
    description_he = '[עופות אפויים עם עשבי תיבול ותבלינים]'
WHERE id = 392;

-- 393 - Тефтели
UPDATE products SET 
    name_he = '[קציצות בשר]',
    description_he = '[כדורי בשר עדינים ברוטב עגבניות]'
WHERE id = 393;

-- 394 - Гуляш
UPDATE products SET 
    name_he = '[גולאש]',
    description_he = '[בשר מבושל עם ירקות ברוטב ריחני]'
WHERE id = 394;

-- 395 - Плов
UPDATE products SET 
    name_he = '[פלאו]',
    description_he = '[פלאו אוזבקי קלאסי עם בשר וגזר]'
WHERE id = 395;

-- 396 - Плов зеленый
UPDATE products SET 
    name_he = '[פלאו ירוק]',
    description_he = '[פלאו עם ירוקים, צימוקים ותבלינים מיוחדים]'
WHERE id = 396;

-- 397 - Перцы фаршированные
UPDATE products SET 
    name_he = '[פלפלים ממולאים]',
    description_he = '[פלפל בולגרי ממולא בבשר ואורז]'
WHERE id = 397;

-- 398 - Голубцы
UPDATE products SET 
    name_he = '[גולובצי]',
    description_he = '[עלי כרוב עם מילוי בשר ברוטב עגבניות]'
WHERE id = 398;

-- 399 - Запеченные овощи
UPDATE products SET 
    name_he = '[ירקות אפויים]',
    description_he = '[מגוון ירקות עונתיים אפויים עם עשבי תיבול]'
WHERE id = 399;

-- 400 - Отбивные
UPDATE products SET 
    name_he = '[קציצות דקות]',
    description_he = '[קציצות חזיר בציפוי זהוב]'
WHERE id = 400;

-- 401 - Шницель
UPDATE products SET 
    name_he = '[שניצל]',
    description_he = '[שניצל עוף בציפוי פריך]'
WHERE id = 401;

-- 402 - Фасоль тушеная
UPDATE products SET 
    name_he = '[שעועית מבושלת]',
    description_he = '[שעועית לבנה מבושלת עם ירקות ועגבניות]'
WHERE id = 402;

-- 403 - Жаркое
UPDATE products SET 
    name_he = '[צלי]',
    description_he = '[בשר מבושל עם תפוחי אדמה וירקות בסגנון ביתי]'
WHERE id = 403;

-- 404 - Капуста тушеная
UPDATE products SET 
    name_he = '[כרוב מבושל]',
    description_he = '[כרוב לבן מבושל עם גזר ובצל]'
WHERE id = 404;

-- 405 - Курица по-китайски
UPDATE products SET 
    name_he = '[עוף בסגנון סיני]',
    description_he = '[חתיכות עוף ברוטב חמוץ-מתוק עם ירקות]'
WHERE id = 405;

-- 406 - Чебуреки
UPDATE products SET 
    name_he = '[צ׳בורקי]',
    description_he = '[צ׳בורקי פריכים עם מילוי בשר עסיסי]'
WHERE id = 406;

-- 407 - Душпара
UPDATE products SET 
    name_he = '[דושפרה]',
    description_he = '[כיסוני בצק קטנים במרק ריחני]'
WHERE id = 407;

-- 408 - Равиоли
UPDATE products SET 
    name_he = '[רביולי]',
    description_he = '[רביולי איטלקי עם מילוי גבינה]'
WHERE id = 408;

-- 409 - Картошка жареная
UPDATE products SET 
    name_he = '[תפוחי אדמה מטוגנים]',
    description_he = '[תפוחי אדמה זהובים מטוגנים עם בצל וירוקים]'
WHERE id = 409;

-- 410 - Рис отварной
UPDATE products SET 
    name_he = '[אורז מבושל]',
    description_he = '[אורז לבן פרי עם חמאה]'
WHERE id = 410;

-- 411 - Гречка
UPDATE products SET 
    name_he = '[כוסמת]',
    description_he = '[דייסת כוסמת פרויה עם חמאה]'
WHERE id = 411;

-- 412 - Картофель отварной
UPDATE products SET 
    name_he = '[תפוחי אדמה מבושלים]',
    description_he = '[תפוחי אדמה צעירים מבושלים עם שמיר]'
WHERE id = 412;

-- 413 - Макароны
UPDATE products SET 
    name_he = '[מקרוני]',
    description_he = '[מקרוני מבושלים עם חמאה וגבינה]'
WHERE id = 413;

-- 414 - Пюре картофельное
UPDATE products SET 
    name_he = '[פיורה תפוחי אדמה]',
    description_he = '[פיורה תפוחי אדמה עדינה עם חלב וחמאה]'
WHERE id = 414;

-- 415 - Борщ
UPDATE products SET 
    name_he = '[בורש]',
    description_he = '[בורש אוקראיני מסורתי עם שמנת חמוצה]'
WHERE id = 415;

-- 416 - Солянка мясная
UPDATE products SET 
    name_he = '[סוליאנקה בשר]',
    description_he = '[סוליאנקה דשנה עם מעושנים וזיתים]'
WHERE id = 416;

-- 417 - Щи
UPDATE products SET 
    name_he = '[שצ׳י]',
    description_he = '[שצ׳י חמוץ מכרוב כבוש עם בשר]'
WHERE id = 417;

-- 418 - Суп гороховый
UPDATE products SET 
    name_he = '[מרק אפונים]',
    description_he = '[מרק אפונים עשיר עם מעושנים]'
WHERE id = 418;

-- 419 - Харчо
UPDATE products SET 
    name_he = '[חרצ׳ו]',
    description_he = '[מרק גיאורגי חריף עם בשר ואורז]'
WHERE id = 419;

-- 420 - Лагман
UPDATE products SET 
    name_he = '[לגמן]',
    description_he = '[מרק אוזבקי עם אטריות ובשר]'
WHERE id = 420;

-- 421 - Блинчики с Куриной Грудкой и Сыром
UPDATE products SET 
    name_he = '[בלינצ׳יקים עם חזה עוף וגבינה]',
    description_he = '[מילוי עסיסי מחזה עוף עדין, גבינה מותכת, עטוף בבלינצ׳יקים דקים וזהובים. ארוחת ביניים נהדרת ומנה שנייה מלאה בזמן הצהריים.]'
WHERE id = 421;

-- 422 - Блинчики с Мясом
UPDATE products SET 
    name_he = '[בלינצ׳יקים עם בשר]',
    description_he = '[מעדן רוסי מסורתי - בלינצ׳יקים דקים וזהובים. בלינצ׳יקים עם מילוי בשר עשיר יהיו ארוחת ביניים נהדרת או מנה שנייה מלאה לארוחת בוקר או צהריים.]'
WHERE id = 422;

-- 423 - Сырники
UPDATE products SET 
    name_he = '[סירניקי]',
    description_he = '[סירניקי גבינה עדינים עם שמנת חמוצה]'
WHERE id = 423;

-- 424 - Чебуреки с Мясом Жареные
UPDATE products SET 
    name_he = '[צ׳בורקי עם בשר מטוגנים]',
    description_he = '[צ׳בורקי פריכים עם מילוי בשר עסיסי, מטוגנים עד לצבע זהוב]'
WHERE id = 424;

-- 425 - Пирожок с Мясом
UPDATE products SET 
    name_he = '[פירוז׳וק עם בשר]',
    description_he = '[פירוז׳וק דשן עם מילוי בשר ריחני, אפוי לפי מתכון ביתי]'
WHERE id = 425;

-- 426 - Пирожок с Зеленым Луком и Яйцом
UPDATE products SET 
    name_he = '[פירוז׳וק עם בצל ירוק וביצה]',
    description_he = '[פירוז׳וק מסורתי עם מילוי מבצל ירוק טרי וביצים מבושלות]'
WHERE id = 426;

-- 427 - Пирожок с Картофелем
UPDATE products SET 
    name_he = '[פירוז׳וק עם תפוחי אדמה]',
    description_he = '[פירוז׳וק ביתי עם מילוי תפוחי אדמה עדין וירוקים]'
WHERE id = 427;

-- 428 - Пирожок с Яблоком
UPDATE products SET 
    name_he = '[פירוז׳וק עם תפוח]',
    description_he = '[פירוז׳וק מתוק עם מילוי תפוחים ריחני וקינמון]'
WHERE id = 428;

-- Опциональные переводы ингредиентов (если есть данные в поле ingredients)
-- Добавьте ingredients_he = '[ИНГРЕДИЕНТЫ_НА_ИВРИТЕ]' в соответствующие UPDATE запросы выше