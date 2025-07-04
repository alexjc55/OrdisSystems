// Universal database connection for Replit (Neon) and VPS (PostgreSQL)
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let db: any;
let pool: any;

// Determine database type by URL
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech');

if (isNeonDatabase) {
  // For Neon (Replit)
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = await import('ws');
  
  neonConfig.webSocketConstructor = ws.default;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  // For regular PostgreSQL (VPS)
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db, pool };