import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Определяем тип окружения
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech');
const isFastPanel = process.env.NODE_ENV === 'production' && (
  process.env.FASTPANEL || 
  process.cwd().includes('/var/www/') ||
  process.env.DATABASE_URL.includes('localhost')
);
const isReplit = !isNeonDatabase && !isFastPanel;

let db: any;
let pool: any;

console.log(`🔗 Database connection type: ${isNeonDatabase ? 'Neon' : isFastPanel ? 'FastPanel PostgreSQL' : 'Standard PostgreSQL'}`);

if (isNeonDatabase) {
  // Для Neon (Replit)
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = await import('ws');
  
  neonConfig.webSocketConstructor = ws.default;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Для обычного PostgreSQL (VPS/FastPanel/Local)
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  
  // Специальная конфигурация для FastPanel
  const poolConfig = isFastPanel ? {
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  } : {
    connectionString: process.env.DATABASE_URL
  };
  
  pool = new Pool(poolConfig);
  db = drizzle({ client: pool, schema });
}

export { db, pool };