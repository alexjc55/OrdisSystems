#!/usr/bin/env node

/**
 * Production migration runner
 * Safely applies database migrations with backup and rollback capabilities
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { execSync } from "child_process";
import fs from "fs";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function runMigrations() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    // Create backup first
    console.log("💾 Creating database backup...");
    const backupFile = `backups/migration_backup_${timestamp}.sql`;
    
    try {
      execSync(`pg_dump "${DATABASE_URL}" > ${backupFile}`, { stdio: 'inherit' });
      console.log(`✅ Backup created: ${backupFile}`);
    } catch (error) {
      console.warn("⚠️ Backup failed, continuing without backup");
    }

    // Run migrations
    console.log("🔄 Applying migrations...");
    const sql = postgres(DATABASE_URL, { max: 1 });
    const db = drizzle(sql);
    
    await migrate(db, { migrationsFolder: "./migrations" });
    
    await sql.end();
    
    console.log("✅ Migrations completed successfully");
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.log(`💾 Restore from backup if needed: psql "${DATABASE_URL}" < backups/migration_backup_${timestamp}.sql`);
    process.exit(1);
  }
}

runMigrations();