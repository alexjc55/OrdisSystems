#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to service worker
const swPath = join(__dirname, '..', 'client', 'public', 'sw.js');

// Generate timestamp in format YYYYMMDD-HHMM
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const timestamp = `${year}${month}${day}-${hours}${minutes}`;

console.log(`🔄 Updating Service Worker BUILD_TIMESTAMP to: ${timestamp}`);

// Read sw.js
let swContent = readFileSync(swPath, 'utf-8');

// Replace BUILD_TIMESTAMP
const oldTimestamp = swContent.match(/const BUILD_TIMESTAMP = '([^']+)'/)?.[1];
swContent = swContent.replace(
  /const BUILD_TIMESTAMP = '[^']+'/,
  `const BUILD_TIMESTAMP = '${timestamp}'`
);

// Write back
writeFileSync(swPath, swContent, 'utf-8');

console.log(`✅ Service Worker updated: ${oldTimestamp} → ${timestamp}`);
console.log('✅ New version will force cache refresh for all users');
