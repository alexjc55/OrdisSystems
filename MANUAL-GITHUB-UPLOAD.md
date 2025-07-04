# Инструкция по ручной загрузке проекта в GitHub

## Способ 1: Через командную строку в Replit Shell

```bash
# Разблокируй Git (если заблокирован)
rm -f .git/index.lock

# Проверь статус
git status

# Добавь все файлы
git add .

# Создай коммит
git commit -m "Complete project sync from Replit - all 52 products and VPS tools

- Full database with 52 products
- VPS deployment and update scripts  
- Complete multilingual support (RU/EN/HE/AR)
- PWA functionality with push notifications
- Radix UI scroll-lock disabled
- Theme management system
- Admin dashboard with permissions"

# Загрузи в GitHub
git push origin main
```

## Способ 2: Если Git не работает - создай новый репозиторий

### Шаг 1: Создай репозиторий на GitHub
1. Иди на https://github.com
2. Нажми "New repository"
3. Назови: `edahouse-ordis`
4. Создай репозиторий

### Шаг 2: Скачай архив проекта
```bash
# Создай архив всего проекта
tar -czf edahouse-project.tar.gz \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.replit' \
  --exclude='replit.nix' \
  .

# Покажи размер архива
ls -lh edahouse-project.tar.gz
```

### Шаг 3: Вручную загрузи файлы
1. Скачай архив из Replit
2. Распакуй на компьютере  
3. Загрузи через GitHub web interface или:

```bash
# На локальном компьютере
git init
git remote add origin https://github.com/ТВОЙ_USERNAME/edahouse-ordis.git
git add .
git commit -m "Initial commit - complete edahouse project"
git push -u origin main
```

## Способ 3: Только важные файлы

Если нужно загрузить только ключевые файлы:

```bash
# Создай список важных файлов
cat > important_files.txt << 'EOF'
client/
server/
shared/
database-exports/
scripts/
package.json
package-lock.json
tsconfig.json
vite.config.ts
tailwind.config.ts
drizzle.config.ts
components.json
postcss.config.js
.env.example
.gitignore
README.md
replit.md
VPS-UPDATE-GUIDE.md
EOF

# Создай архив только важных файлов
tar -czf edahouse-essential.tar.gz -T important_files.txt
```

## Проверка того, что должно быть в GitHub:

✅ **Код приложения:**
- `client/` - фронтенд React
- `server/` - бэкенд Express  
- `shared/` - общие типы

✅ **База данных:**
- `database-exports/full_vps_export.sql` - все 52 продукта
- `database-exports/VPS_DEPLOYMENT_INSTRUCTIONS.md`

✅ **VPS инструменты:**
- `scripts/safe-vps-update.sh` - безопасное обновление
- `scripts/check-vps-differences.sh` - проверка
- `VPS-UPDATE-GUIDE.md` - руководство

✅ **Конфигурация:**
- `package.json` - зависимости
- `tsconfig.json`, `vite.config.ts` - настройки
- `.env.example` - пример переменных

❌ **НЕ загружать:**
- `.env` - секретные ключи
- `node_modules/` - устанавливается автоматически
- `uploads/` - загруженные файлы (специфичны для каждого сервера)

## После загрузки на VPS выполни:

```bash
git clone https://github.com/ТВОЙ_USERNAME/edahouse-ordis.git
cd edahouse-ordis
bash scripts/safe-vps-update.sh
```