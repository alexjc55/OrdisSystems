#!/bin/bash

# Очистка экспорта базы данных от Neon-специфичных команд
gunzip -c database-exports/replit_data_export.sql.gz | \
sed '/neon_superuser/d' | \
sed '/OWNER TO/d' | \
sed '/GRANT.*neon/d' | \
sed '/REVOKE.*neon/d' | \
sed '/ALTER.*OWNER/d' > database-exports/clean_data_export.sql

echo "Создан очищенный экспорт: clean_data_export.sql"
