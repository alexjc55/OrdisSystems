#!/bin/bash

# Fix VPS Session Table Issue
echo "🔧 Исправление проблемы с таблицей сессий на VPS..."

cat > /tmp/fix-session-table.sql << 'EOF'
-- Создание таблицы session для connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

-- Добавление первичного ключа если не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'session_pkey' 
        AND table_name = 'session'
    ) THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;

-- Создание индекса для оптимизации очистки истекших сессий
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Показать результат
SELECT 'Session table created successfully' as result;
\dt session;
EOF

echo "📋 SQL скрипт создан. Выполните на VPS:"
echo ""
echo "# Подключитесь к серверу и выполните:"
echo "cd /var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"
echo ""
echo "# Создайте таблицу session:"
echo "sudo -u postgres psql -d edahouse_ord < /tmp/fix-session-table.sql"
echo ""
echo "# Или через пользователя edahouse_ord:"
echo "PGPASSWORD=33V0R1N5qi81paiA psql -h localhost -U edahouse_ord -d edahouse_ord < /tmp/fix-session-table.sql"
echo ""
echo "# После создания таблицы перезапустите приложение:"
echo "pm2 restart edahouse"
echo "pm2 logs edahouse --lines 20"
echo ""
echo "✅ Это должно устранить ошибку 'relation \"session\" does not exist'"