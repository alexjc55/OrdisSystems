import { randomUUID } from "node:crypto";
import { hashPassword } from "./password-hash";

export class BootstrapError extends Error {}

// pg and Neon expose different ancillary client types; use only the shared API.
export interface BootstrapPool {
  connect(): Promise<{
    query(text: string, values?: string[]): Promise<{ rows: unknown[] }>;
    release(): void;
  }>;
}

export function validateBootstrapCredentials(username?: string, password?: string) {
  if (!username || !password) {
    throw new BootstrapError("Задайте логин и пароль через команду bootstrap:admin. Значений по умолчанию нет.");
  }
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(normalizedUsername)) {
    throw new BootstrapError("Логин: 3–50 символов, латинские буквы, цифры, точка, дефис или подчёркивание; первый символ — буква или цифра.");
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9\s]/]
    .filter(pattern => pattern.test(password)).length;
  if (password.length < 16 || password.length > 256 || password.trim() !== password || classes < 3) {
    throw new BootstrapError("Пароль: 16–256 символов, минимум 3 типа символов (строчные, заглавные, цифры, специальные), без пробелов по краям.");
  }
  return { username: normalizedUsername, password };
}

// Never imported by server startup. Only an explicit owner command may call this.
export async function bootstrapAdmin(pool: BootstrapPool, username?: string, password?: string) {
  const credentials = validateBootstrapCredentials(username, password);
  const hashedPassword = await hashPassword(credentials.password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    // Also blocks registration inserts, not just other bootstrap commands.
    await client.query("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE");
    const existing = await client.query("SELECT id FROM users LIMIT 1");
    if (existing.rows.length > 0) {
      throw new BootstrapError("В БД уже есть пользователи. Администратор не создан; существующие учётные записи не изменены.");
    }
    await client.query(
      "INSERT INTO users (id, username, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6)",
      [randomUUID(), credentials.username, hashedPassword, "Admin", "", "admin"],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
