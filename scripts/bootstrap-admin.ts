import dotenv from "dotenv";
import type { Pool } from "pg";
import type { Pool as NeonPool } from "@neondatabase/serverless";
import { bootstrapAdmin, BootstrapError, validateBootstrapCredentials } from "../server/bootstrap-admin";

dotenv.config({ quiet: true });

let pool: Pool | NeonPool | undefined;
const handlePoolError = () => {
  console.error("Ошибка соединения с БД. Данные подключения не выводятся.");
  process.exitCode = 1;
};
try {
  // Validate before opening the DB; do not print inputs or raw DB errors.
  const { username, password } = validateBootstrapCredentials(
    process.env.BOOTSTRAP_ADMIN_USERNAME, process.env.BOOTSTRAP_ADMIN_PASSWORD,
  );
  // Keep this one-off connection separate from the server's verbose retry logger:
  // database errors may contain sensitive connection information.
  if (process.env.USE_NEON === "true") {
    if (!process.env.DATABASE_URL) throw new BootstrapError("Не задана конфигурация БД для Neon.");
    const { Pool: NeonPool, neonConfig } = await import("@neondatabase/serverless");
    const { default: ws } = await import("ws");
    neonConfig.webSocketConstructor = ws;
    const neonPool = new NeonPool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    neonPool.on("error", handlePoolError);
    pool = neonPool;
  } else {
    if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) {
      throw new BootstrapError("Не заданы PGHOST, PGUSER или PGDATABASE для целевой БД.");
    }
    const { Pool: PgPool } = await import("pg");
    const pgPool = new PgPool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      connectionTimeoutMillis: 5000,
    });
    pgPool.on("error", handlePoolError);
    pool = pgPool;
  }
  await bootstrapAdmin(pool, username, password);
  console.log("Первый администратор создан. Пароль не выводится и не сохраняется в настройках запуска.");
} catch (error) {
  console.error(error instanceof BootstrapError
    ? error.message
    : "Не удалось создать администратора. Проверьте подключение, схему БД и отсутствие конкурирующих операций. Данные подключения и пароль не выводятся.");
  process.exitCode = 1;
} finally {
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  delete process.env.BOOTSTRAP_ADMIN_USERNAME;
  if (pool) await pool.end();
}
