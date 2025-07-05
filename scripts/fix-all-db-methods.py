#!/usr/bin/env python3
import re

# Читаем файл
with open('server/storage.ts', 'r') as f:
    content = f.read()

# Ищем все async методы и добавляем getDB() если его нет
pattern = r'(async\s+\w+\([^)]*\)\s*:\s*[^{]+\{\s*)((?!.*const db = await getDB\(\);)(?=.*await db))'
replacement = r'\1\n    const db = await getDB();\2'

# Применяем замену
fixed_content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

# Записываем обратно
with open('server/storage.ts', 'w') as f:
    f.write(fixed_content)

print("Все методы исправлены!")