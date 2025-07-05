const fs = require('fs');
const path = require('path');

// Read the storage file
const storagePath = path.join(__dirname, '..', 'server', 'storage.ts');
let content = fs.readFileSync(storagePath, 'utf8');

// Replace all occurrences of "await db." with "const db = await getDB(); await db."
// But only within method bodies, not in interface definitions
content = content.replace(
  /(\s+)(await db\.)/g,
  '$1const db = await getDB();\n$1await db.'
);

// Also replace standalone "db." calls
content = content.replace(
  /(\s+)(db\.)/g,
  '$1const db = await getDB();\n$1db.'
);

// Write back to file
fs.writeFileSync(storagePath, content);
console.log('Updated database calls in storage.ts');