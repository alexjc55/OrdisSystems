// Explicit operator repair for the documented VPS PostgreSQL configuration.
// Read-only unless --apply AND an exact --database confirmation are provided.
import "dotenv/config";
import { Client } from "pg";
import { readFile } from "node:fs/promises";

const expectedColumns = [
  "id", "order_id", "audience", "recipient", "status", "attempts",
  "available_at", "created_at", "sent_at", "last_error", "checkout_snapshot",
];

function argumentsFor(args) {
  let apply = false;
  let database;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--apply") apply = true;
    else if (args[index] === "--database" && args[index + 1] && !args[index + 1].startsWith("--")) {
      database = args[++index];
    } else throw new Error("Допустимы только --apply и --database ИМЯ_БД.");
  }
  if (apply && !database) throw new Error("Для изменения БД обязательно --database с именем из проверки.");
  return { apply, database };
}

async function inspect(client) {
  const target = (await client.query(`
    SELECT current_database() AS database, current_schema() AS schema,
           to_regclass('public.orders') IS NOT NULL AS orders_exist,
           to_regclass('public.payment_email_outbox') IS NOT NULL AS queue_exists
  `)).rows[0];
  const columns = (await client.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_email_outbox'
    ORDER BY ordinal_position
  `)).rows;
  return {
    ...target,
    missing_columns: expectedColumns.filter(name => !columns.some(column => column.column_name === name)),
    snapshot_is_jsonb: columns.some(column => column.column_name === "checkout_snapshot" && column.data_type === "jsonb"),
  };
}

async function main() {
  const options = argumentsFor(process.argv.slice(2));
  if (process.env.USE_NEON === "true") {
    throw new Error("Эта команда предназначена для VPS с USE_NEON=false, не для Neon/Replit.");
  }
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) {
    throw new Error("В .env магазина должны быть заданы PGHOST, PGUSER и PGDATABASE.");
  }
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    connectionTimeoutMillis: 10000,
    application_name: "ordis-order-email-queue-repair",
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const before = await inspect(client);
    await client.query("COMMIT");
    console.log(JSON.stringify(before, null, 2));
    if (!options.apply) {
      console.log("Проверка завершена. БД не изменялась.");
      return;
    }
    if (before.database !== options.database || before.schema !== "public" || !before.orders_exist) {
      throw new Error("Не совпадает целевая БД, схема не public или нет таблицы orders. Изменения отменены.");
    }
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path = public");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    for (const name of ["0008_payment_email_outbox.sql", "0010_checkout_email_snapshot.sql"]) {
      const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
      if (!sql.trim()) throw new Error("Файл миграции пуст. Изменения отменены.");
      await client.query(sql);
    }
    const after = await inspect(client);
    if (after.missing_columns.length || !after.snapshot_is_jsonb) {
      throw new Error("Структура очереди не соответствует ожидаемой. Изменения отменены.");
    }
    await client.query("COMMIT");
    console.log("Миграции 0008 и 0010 применены. Старые заказы не изменялись, рассылка старых писем не создавалась.");
    console.log(JSON.stringify(after, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch(error => {
  // Do not dump connection objects or environment values to operator logs.
  console.error(error.code ? `Ошибка PostgreSQL (${error.code}).` : error.message);
  process.exitCode = 1;
});
