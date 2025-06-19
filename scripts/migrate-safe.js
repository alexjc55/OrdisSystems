#!/usr/bin/env node

/**
 * Safe migration script for production deployments
 * This script ensures data safety during automatic updates
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Starting safe migration process...');

// Function to run command and handle errors
function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ Error during ${description}:`, error.message);
    process.exit(1);
  }
}

// Function to backup database
function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup_${timestamp}.sql`;
  
  if (process.env.DATABASE_URL) {
    try {
      console.log('💾 Creating database backup...');
      execSync(`pg_dump "${process.env.DATABASE_URL}" > backups/${backupFile}`, { stdio: 'inherit' });
      console.log(`✅ Database backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      console.warn('⚠️ Could not create database backup:', error.message);
      return null;
    }
  }
  return null;
}

// Main migration process
async function migrate() {
  try {
    // Ensure backups directory exists
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups', { recursive: true });
    }

    // Create database backup
    const backupFile = backupDatabase();

    // Generate new migrations if any schema changes exist
    runCommand('npm run db:generate', 'Generating new migrations');

    // Run migrations (safe - only adds new changes)
    runCommand('npm run db:migrate', 'Applying database migrations');

    console.log('🎉 Migration completed successfully!');
    
    if (backupFile) {
      console.log(`💾 Backup available at: backups/${backupFile}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrate();