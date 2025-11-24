import type { Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Vite plugin to automatically update Service Worker BUILD_TIMESTAMP
 * This ensures each build gets a unique version, forcing cache updates
 */
export function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version-updater',
    
    // Run before build starts
    buildStart() {
      const swPath = join(process.cwd(), 'client', 'public', 'sw.js');
      
      // Generate timestamp
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `${year}${month}${day}-${hours}${minutes}`;
      
      console.log(`\n🔄 [SW Version Plugin] Updating BUILD_TIMESTAMP to: ${timestamp}`);
      
      try {
        // Read sw.js
        let swContent = readFileSync(swPath, 'utf-8');
        
        // Get old timestamp for logging
        const oldTimestamp = swContent.match(/const BUILD_TIMESTAMP = '([^']+)'/)?.[1];
        
        // Replace BUILD_TIMESTAMP
        swContent = swContent.replace(
          /const BUILD_TIMESTAMP = '[^']+'/,
          `const BUILD_TIMESTAMP = '${timestamp}'`
        );
        
        // Write back
        writeFileSync(swPath, swContent, 'utf-8');
        
        console.log(`✅ [SW Version Plugin] Updated: ${oldTimestamp} → ${timestamp}\n`);
      } catch (error) {
        console.error('❌ [SW Version Plugin] Failed to update Service Worker version:', error);
      }
    }
  };
}
