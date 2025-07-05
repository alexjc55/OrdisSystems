import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

let db: any;

// Debug logging for environment variables
console.log("🔍 Environment check - USE_NEON:", process.env.USE_NEON);
console.log("🔍 Environment check - DATABASE_URL exists:", !!process.env.DATABASE_URL);

if (process.env.USE_NEON === 'true') {
  // Neon Database (Replit environment)
  console.log("🔄 Initializing Neon Database connection...");
  
  const initNeonDB = async () => {
    try {
      const { Pool, neonConfig } = await import('@neondatabase/serverless');
      
      // Configure WebSocket for Neon
      try {
        const ws = await import("ws");
        neonConfig.webSocketConstructor = ws.default;
        console.log("✅ WebSocket configured for Neon Database");
      } catch (wsError) {
        console.warn("⚠️  WebSocket module not available");
      }
      
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL 
      });
      
      db = drizzle(pool, { schema });
      console.log("✅ Neon Database initialized");
      
    } catch (error) {
      console.error("❌ Failed to initialize Neon Database:", error);
      throw error;
    }
  };
  
  // Initialize asynchronously
  initNeonDB();
  
} else {
  // Standard PostgreSQL (VPS environment)
  console.log("🔄 Initializing PostgreSQL connection...");
  
  const initPostgresDB = async () => {
    try {
      const { Pool } = await import('pg');
      
      const pool = new Pool({
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      });
      
      db = drizzlePg(pool, { schema });
      console.log("✅ PostgreSQL Database initialized");
      
    } catch (error) {
      console.error("❌ Failed to initialize PostgreSQL:", error);
      throw error;
    }
  };
  
  // Initialize asynchronously
  initPostgresDB();
}

// Export a promise that resolves when db is ready
export const getDB = async () => {
  // Wait for db to be initialized
  while (!db) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return db;
};

// For backward compatibility - will be available after initialization
export { db };