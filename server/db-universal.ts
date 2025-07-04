// Универсальное подключение к базе данных для Replit (Neon) и VPS (PostgreSQL)
import * as schema from "@shared/schema";

let db: any;
let pool: any;

// Определяем тип базы данных по URL
const isDevelopment = process.env.NODE_ENV === 'development';
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech');

if (isNeonDatabase) {
  // Для Neon (Replit)
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = await import('ws');
  
  neonConfig.webSocketConstructor = ws.default;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  // Для обычного PostgreSQL (VPS)
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  
  pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export { db, pool };