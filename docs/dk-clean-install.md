# Чистая установка Ordis для dk.ordis.co.il

## Назначение комплекта

Это новая установка на внешнем PostgreSQL, не восстановление eDAHouse.
`ordis-empty.sql` создаёт всю актуальную структуру из `shared/schema.ts`,
служебную таблицу `session` для входа и ограничения очереди писем.
В нём нет товаров, категорий, заказов, пользователей, SMTP или платёжных
реквизитов. Все таблицы изначально пустые.

SQL выполняется одной транзакцией и отказывается работать в непустой БД.
Ничего не удаляет и не обновляет в других магазинах. После импорта не нужны
`migration_full.sql`, старые миграции и `db:push`.

Комплект проверен на одноразовом PostgreSQL 16 с UTF-8: импорт полной схемы,
пустота всех таблиц, отказ повторного импорта, создание первого администратора,
отказ повторной инициализации администратора, вход через настоящий API и
сохранение сессии. Проверены пустой каталог при `SEED_DEMO_CATALOG=false` и
сохранение прежнего демонстрационного наполнения без этой переменной.
Рабочие БД Replit и внешних магазинов при подготовке не использовались.

## Подтверждённые параметры сервера

- Домен: `https://dk.ordis.co.il`.
- Пользователь ОС: `edahouse_ordis`.
- Папка: `/var/www/edahouse_ordis/data/www/dk.ordis.co.il`.
- Отдельная БД: `dk_ordis` (владелец сообщил, что она пустая; проверить перед импортом).
- Порт приложения: `5002`.
- Имя процесса PM2: `dk-ordis`.

Пользователь ОС общий с eDAHouse, но БД, `.env`, папка и процесс разные.
Не используйте `pm2 restart all`, `pm2 kill`, дамп eDAHouse или его секреты.
Нельзя выводить `.env`, пароли или `pm2 env` в чат.

## 1. Код и сборка

Убедитесь, что согласованные изменения уже синхронизированы с GitHub.
Под пользователем `edahouse_ordis`, в пустой папке нового сайта:

```bash
cd /var/www/edahouse_ordis/data/www/dk.ordis.co.il || exit 1
git clone https://github.com/alexjc55/OrdisSystems.git .
```

Если Git сообщает о непустой папке, остановитесь: не удаляйте файлы вслепую.
До дальнейших команд проверьте поддержку нового параметра:

```bash
grep -n 'SEED_DEMO_CATALOG' server/lib/demo-catalog.ts
test -f server/initial-store-settings.ts
npm ci --include=dev
npm run build
mkdir -p uploads/images uploads/optimized uploads/thumbnails
```

Если файла или настройки нет, это старая версия. Не запускайте приложение:
сначала синхронизируйте изменения в GitHub и обновите код.

## 2. Отдельный .env

Создайте `.env` в папке нового сайта с правами `600`. Заполните параметры
его собственного подключения к PostgreSQL. Имя роли PostgreSQL нельзя
определять по имени пользователя ОС: используйте роль, которой принадлежит
новая БД. Пароль заполняется только на сервере, не в чате.

Обязательные параметры (значения в угловых скобках нужно заменить):

```dotenv
USE_NEON=false
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=dk_ordis
PGUSER=<роль PostgreSQL новой БД>
PGPASSWORD=<пароль роли>
PORT=5002
NODE_ENV=production
SEED_DEMO_CATALOG=false
SESSION_SECRET=<новый случайный секрет не короче 32 символов>
REPLIT_APP_URL=https://dk.ordis.co.il
ALLOWED_ORIGINS=https://dk.ordis.co.il
```

Значения с пробелами или `#` в `.env` необходимо корректно заключать в кавычки.
Не копируйте `.env` другого магазина. Новому магазину не нужны чужие
`SUPER_ADMIN_*`, SMTP, SendGrid, платёжные и VAPID-ключи. Настраивайте их отдельно.
`SEED_DEMO_CATALOG=false` обязателен и при будущих перезапусках: пока каталог
пуст, отсутствие настройки разрешит стандартные демотовары.
Не запускайте сайт, пока не импортирована схема и не создан администратор.

## 3. Импорт полной пустой схемы

Загрузите комплект вне публичной папки сайта, например в
`/var/www/edahouse_ordis/data/dk-install`, распакуйте и проверьте:

```bash
cd ~/dk-install
sha256sum -c SHA256SUMS
```

В командах ниже замените `DB_ROLE` на имя роли PostgreSQL из `PGUSER`
нового магазина. `-W` запрашивает пароль скрыто в терминале.

```bash
psql -X -W -h 127.0.0.1 -U DB_ROLE -d dk_ordis \
  -v ON_ERROR_STOP=1 -f ordis-empty.sql
```

SQL сам проверит отсутствие пользовательских таблиц, последовательностей
и представлений, прежде чем создавать структуру. При ошибке не продолжайте
запуск и не повторяйте импорт вслепую.

## 4. Первый администратор

Под пользователем магазина, до публичного запуска:

```bash
cd ~/www/dk.ordis.co.il
npm run bootstrap:admin
```

Введите новый логин и пароль в интерактивном терминале. Пароль вводится скрыто:
16–256 символов, не менее трёх типов символов. Значений по умолчанию нет.
Команда откажет при наличии любого пользователя: она не назначает администратора
существующим клиентам и не меняет чужие учётные записи.

## 5. Nginx и PM2

В конфигурации ТОЛЬКО `dk.ordis.co.il` проксируйте на `127.0.0.1:5002`.
Проверьте синтаксис через `nginx -t` перед перезагрузкой конфигурации.
HTTPS, заголовок `X-Forwarded-Proto` и `Host` должны передаваться корректно:
в production cookie входа требует HTTPS.

Проверьте, что порт свободен и процесс `dk-ordis` ещё не создан.
Если заняты — сначала разберитесь с владельцем, ничего не завершайте вслепую.
Под `edahouse_ordis`, из папки нового сайта:

```bash
NODE_ENV=production PORT=5002 SEED_DEMO_CATALOG=false \
  pm2 start dist/index.js --name dk-ordis --cwd "$PWD" --time
pm2 logs dk-ordis --lines 40 --nostream
```

Приложение сейчас слушает `0.0.0.0`; адрес `127.0.0.1` в Nginx не делает
порт приложения локальным. Прямой доступ извне к `5002` должен быть закрыт
правилами сервера. Публичный доступ — через Nginx с HTTPS.

После успешной проверки:

```bash
pm2 save
systemctl is-enabled pm2-edahouse_ordis
```

Служба автозапуска этого пользователя уже настраивалась для eDAHouse:
не создавайте второй автозапуск от root. `pm2 save` сохранит оба процесса.
Дальнейший перезапуск только нового магазина: `pm2 restart dk-ordis`.
Реальную перезагрузку сервера для проверки без согласования не делайте.

## Контроль

- Главная открывается по HTTPS без 502.
- `/api/products` и `/api/categories` возвращают `[]`.
- Вход нового администратора работает, сессия сохраняется.
- Нет заказов и очереди исторических писем.
- Сразу после первого входа откройте настройки магазина и сохраните имя,
  дизайн, доставку, почту и способы оплаты. При первом запуске приложение
  само создаёт только отсутствующую запись `store_settings`. Начальное имя —
  домен из `REPLIT_APP_URL` или `Ordis`; онлайн-провайдер не выбран.
  Товары, категории и пользователи при этом не создаются. Существующая
  запись настроек не изменяется, даже если отдельные поля в ней пустые.
  Повторный импорт схемы для этого не нужен.
- Тестовый заказ будет настоящим и может отправить письма.

## Исправление админки после уже выполненного импорта

Если схема импортирована и администратор создан, не импортируйте SQL повторно,
не запускайте `bootstrap:admin` заново и не меняйте `.env`.
Сначала отправьте исправленный код в GitHub. Затем под пользователем
`edahouse_ordis` выполните:

```bash
(
  set -eu
  cd ~/www/dk.ordis.co.il/
  git pull --ff-only
  test -f server/initial-store-settings.ts
  npm run build
  NODE_ENV=production PORT=5002 SEED_DEMO_CATALOG=false \
    pm2 restart dk-ordis --update-env
  pm2 save
)
```

Зависимости этим исправлением не менялись, поэтому повторный `npm ci` не нужен.
Приложение создаст запись настроек только при её отсутствии. Существующий
администратор и все сохранённые настройки останутся прежними.
Перезапускается только `dk-ordis`; eDAHouse трогать не нужно.
После обновления перезагрузите страницу админки без старого кэша (`Ctrl+F5`).

## Исправление сохранения новых тем на уже установленном DK

Для этой ошибки недостаточно только обновить файлы: старое поле основного
цвета ограничено 20 символами, а стандартное значение занимает 21.
Миграция `0013_theme_primary_color.sql` расширяет это поле до 64
символов и добавляет отсутствующие поля переведённых изображений магазина,
которые уже использует форма. Она не удаляет темы,
не меняет сохранённые цвета и не сужает уже более широкие поля.
Те же изменения включены в `migration_full.sql`.

После синхронизации кода с GitHub, под пользователем `edahouse_ordis`:

```bash
(
  set -eu
  cd ~/www/dk.ordis.co.il/
  git pull --ff-only
  npm run build
  node --input-type=module <<'NODE'
import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
const client = new pg.Client(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL } : {});
try {
  if (process.env.USE_NEON === 'true') throw new Error('Wrong database mode');
  await client.connect();
  const { rows } = await client.query('SELECT current_database() AS name');
  if (rows[0].name !== 'dk_ordis') throw new Error('Wrong database');
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query(await readFile('migrations/0013_theme_primary_color.sql', 'utf8'));
  const check = await client.query(`SELECT data_type, character_maximum_length AS size
    FROM information_schema.columns WHERE table_schema='public'
    AND table_name='themes' AND column_name='primary_color'`);
  const column = check.rows[0];
  if (!column || !(column.data_type === 'text' ||
      (column.data_type === 'character varying' &&
       (column.size === null || column.size >= 64)))) throw new Error('Unexpected column');
  await client.query('COMMIT');
  console.log('Готово: миграция тем в dk_ordis выполнена. Существующие данные сохранены.');
} catch {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Миграция не выполнена. Проверьте подключение к dk_ordis, права и структуру themes.');
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
NODE
  NODE_ENV=production PORT=5002 SEED_DEMO_CATALOG=false \
    pm2 restart dk-ordis --update-env
  pm2 save
)
```

При ошибке сборки или миграции блок остановится, не перезапуская приложение.
Полный SQL-дамп повторно не импортировать, администратора заново не создавать.
После успешного обновления нажмите `Ctrl+F5`, создайте тему и сохраните её.
Форма теперь сохраняет поля всех вкладок, включая те, которые не открывались.

## Повторная подготовка комплекта

В среде разработки с PostgreSQL и установленными зависимостями:

```bash
npm run build
node scripts/prepare-clean-install.mjs --prepare
```

Команда использует только временный PostgreSQL на Unix-сокете с отключённым
TCP и проверяет фактическое поведение с собранным приложением. Настройки
рабочих подключений не наследуются. Результаты — в игнорируемой папке
`generated-artifacts/ordis-clean-install`.
