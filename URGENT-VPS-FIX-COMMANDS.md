# СРОЧНОЕ ИСПРАВЛЕНИЕ VPS - ОШИБКА СЛАЙДЕРА

## ПРОБЛЕМА ПОДТВЕРЖДЕНА:
На VPS в админке при выборе типа баннера "Слайдер" и нажатии "Сохранить" появляется ошибка:
**"Failed to execute 'text' on 'Response': body stream already read"**

Это происходит потому что на VPS отсутствуют 32 колонки слайдера из 33.

## СРОЧНЫЕ КОМАНДЫ ДЛЯ VPS:

### 1. Остановить все процессы:
```bash
pm2 delete all
```

### 2. Применить миграцию (добавить все недостающие колонки):
```bash
psql -h localhost -U edahouse_usr -d edahouse << 'EOF'
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_speed INTEGER DEFAULT 5000;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slider_effect VARCHAR(10) DEFAULT 'fade';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide1_text_position VARCHAR(20) DEFAULT 'left';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide2_text_position VARCHAR(20) DEFAULT 'left';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide3_text_position VARCHAR(20) DEFAULT 'left';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide4_text_position VARCHAR(20) DEFAULT 'left';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_image VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_title VARCHAR(255);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_subtitle TEXT;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_button_text VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_button_link VARCHAR(500);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS slide5_text_position VARCHAR(20) DEFAULT 'left';
UPDATE store_settings SET slider_autoplay = true, slider_speed = 5000, slider_effect = 'fade' WHERE id = 1;
EOF
```

### 3. Проверить результат (должно показать 33):
```bash
psql -h localhost -U edahouse_usr -d edahouse -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'store_settings' AND (column_name LIKE '%slider%' OR column_name LIKE '%slide%');"
```

### 4. Запустить приложение:
```bash
pm2 start dist/index.js --name edahouse --env NODE_ENV=production
```

### 5. Проверить что работает:
```bash
pm2 logs edahouse --lines 5
```

## РЕЗУЛЬТАТ:
После применения миграции ошибка исчезнет и можно будет:
- ✅ Выбрать тип баннера "Слайдер" 
- ✅ Сохранить настройки без ошибок
- ✅ Добавлять изображения и текст для слайдов

**Это критическое исправление - без него функция слайдера полностью не работает на VPS.**