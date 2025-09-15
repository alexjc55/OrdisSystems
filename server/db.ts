import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

let db: any;
let pool: any;
let isInitializing = false;

// Debug logging for environment variables
console.log("🔍 Environment check - USE_NEON:", process.env.USE_NEON);
console.log("🔍 Environment check - DATABASE_URL exists:", !!process.env.DATABASE_URL);

const initializeDatabase = async () => {
  if (isInitializing) {
    console.log("🔄 Database initialization already in progress...");
    return;
  }
  
  isInitializing = true;
  
  try {
    if (process.env.USE_NEON === 'true') {
      // Neon Database (Replit environment)
      console.log("🔄 Initializing Neon Database connection...");
      
      const { Pool, neonConfig } = await import('@neondatabase/serverless');
      
      // Configure WebSocket for Neon
      try {
        const ws = await import("ws");
        neonConfig.webSocketConstructor = ws.default;
        console.log("✅ WebSocket configured for Neon Database");
      } catch (wsError) {
        console.warn("⚠️  WebSocket module not available");
      }
      
      // Enhanced pool configuration for Neon serverless
      pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        max: 10, // Maximum number of clients in the pool
        maxUses: Infinity, // Number of times a client can be used before being discarded
        allowExitOnIdle: false, // Keep pool alive
        idleTimeoutMillis: 10000, // 10 seconds idle timeout
      });
      
      // Add error handling for pool connections
      pool.on('error', (err: any) => {
        console.error('🚨 Neon pool error:', err);
        // Reset database connection to trigger reconnection
        db = null;
        isInitializing = false;
      });
      
      pool.on('connect', () => {
        console.log('🔗 New Neon client connected');
      });
      
      pool.on('remove', () => {
        console.log('🔌 Neon client removed from pool');
      });
      
      db = drizzle(pool, { schema });
      console.log("✅ Neon Database initialized with enhanced configuration");
      
    } else {
      // Standard PostgreSQL (VPS environment)
      console.log("🔄 Initializing PostgreSQL connection...");
      
      const { Pool } = await import('pg');
      
      pool = new Pool({
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      
      // Add error handling for pool connections
      pool.on('error', (err: any) => {
        console.error('🚨 PostgreSQL pool error:', err);
        // Reset database connection to trigger reconnection
        db = null;
        isInitializing = false;
      });
      
      db = drizzlePg(pool, { schema });
      console.log("✅ PostgreSQL Database initialized");
    }
    
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    isInitializing = false;
    throw error;
  } finally {
    isInitializing = false;
  }
};

// Initialize database on startup
initializeDatabase().catch(console.error);

// Export a promise that resolves when db is ready with retry logic
export const getDB = async (retries = 3) => {
  let attempts = 0;
  
  while (attempts < retries) {
    // If db is not initialized or connection was lost, try to reinitialize
    if (!db) {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error(`❌ Database initialization attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts >= retries) {
          throw new Error(`Failed to initialize database after ${retries} attempts`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        continue;
      }
    }
    
    // Test the connection
    try {
      if (db && pool) {
        // Simple connection test
        await pool.query('SELECT 1');
        return db;
      }
    } catch (error) {
      console.error('🔥 Database connection test failed:', error);
      // Reset connection to trigger reinitialization
      db = null;
      isInitializing = false;
      attempts++;
      
      if (attempts >= retries) {
        throw new Error(`Database connection failed after ${retries} attempts`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      continue;
    }
    
    // Wait a bit if db is still initializing
    if (!db) {
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      return db;
    }
  }
  
  throw new Error('Database initialization failed');
};

// For backward compatibility - will be available after initialization
export { db };

// Export pool for auth compatibility with retry logic
export const getPool = async () => {
  await getDB(); // Ensure db is initialized
  return pool;
};

// Backward compatibility export
export { pool };