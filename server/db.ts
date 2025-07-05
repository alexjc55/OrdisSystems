import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Configure WebSocket for Neon Database only when needed
if (process.env.USE_NEON === "true") {
  // Import WebSocket module for Neon Database
  import("ws").then((ws) => {
    neonConfig.webSocketConstructor = ws.default;
    console.log("✅ WebSocket configured for Neon Database");
  }).catch((error) => {
    console.warn("⚠️  WebSocket module not available:", error.message);
  });
} else {
  console.log("🚫 WebSocket disabled (USE_NEON=false)");
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });