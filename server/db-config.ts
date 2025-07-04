// Универсальная конфигурация базы данных для всех сред
import * as schema from "@shared/schema";

export interface DatabaseConfig {
  type: 'neon' | 'postgresql';
  environment: 'replit' | 'fastpanel' | 'vps' | 'local';
}

export function detectEnvironment(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }

  // Определяем тип базы данных
  const isNeon = databaseUrl.includes('neon.tech');
  
  // Определяем окружение
  let environment: DatabaseConfig['environment'] = 'local';
  
  if (process.cwd().includes('/var/www/')) {
    environment = 'fastpanel';
  } else if (process.env.REPLIT_DB_URL || process.env.REPL_ID) {
    environment = 'replit';
  } else if (process.env.NODE_ENV === 'production') {
    environment = 'vps';
  }

  return {
    type: isNeon ? 'neon' : 'postgresql',
    environment
  };
}

export async function createDatabaseConnection() {
  const config = detectEnvironment();
  
  console.log(`🔗 Connecting to ${config.type} database in ${config.environment} environment`);

  if (config.type === 'neon') {
    // Подключение к Neon
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = await import('ws');
    
    neonConfig.webSocketConstructor = ws.default;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    return { db, pool };
  } else {
    // Подключение к PostgreSQL
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    
    // Оптимизированные настройки для FastPanel
    const poolConfig = config.environment === 'fastpanel' ? {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      allowExitOnIdle: true
    } : {
      connectionString: process.env.DATABASE_URL
    };
    
    const pool = new Pool(poolConfig);
    const db = drizzle({ client: pool, schema });
    
    return { db, pool };
  }
}