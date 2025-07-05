import fs from 'fs';

// Read the storage file
let content = fs.readFileSync('server/storage.ts', 'utf8');

// Replace all standalone 'db.' with 'const db = await getDB(); db.'
// But only in method bodies, not in imports or type definitions

// Find all async method definitions and add getDB() at the start
const asyncMethodPattern = /async\s+(\w+)\s*\([^)]*\)\s*:\s*[^{]+\{/g;
const methods = [];
let match;

while ((match = asyncMethodPattern.exec(content)) !== null) {
  methods.push({
    name: match[1],
    start: match.index + match[0].length,
    fullMatch: match[0]
  });
}

// Process each method
for (const method of methods.reverse()) { // Reverse to maintain positions
  const methodStart = method.start;
  const nextMethodStart = methods.find(m => m.start > methodStart)?.start || content.length;
  
  const methodBody = content.substring(methodStart, nextMethodStart);
  
  // Check if method body already has getDB() call
  if (!methodBody.includes('const db = await getDB();')) {
    // Add getDB() call at the start of method body
    const insertPos = methodStart;
    content = content.substring(0, insertPos) + 
             '\n    const db = await getDB();' + 
             content.substring(insertPos);
  }
}

// Write the fixed content
fs.writeFileSync('server/storage.ts', content);
console.log('Added getDB() calls to all async methods');